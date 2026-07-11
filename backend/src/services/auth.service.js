const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const userRepo = require('../repositories/user.repository');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'pavti_book_super_secret_jwt_key_2026';
const SIMULATE_SMS = process.env.SIMULATE_SMS === 'true';

class AuthService {
  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        organization_id: user.organization_id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
  }

  generateRefreshToken(user) {
    return jwt.sign(
      { id: user.id, jti: uuidv4() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  async storeRefreshToken(userId, token, client = null) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const query = `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `;
    const connection = client || db;
    await connection.query(query, [userId, token, expiresAt]);
  }

  async revokeRefreshToken(token) {
    const query = `
      DELETE FROM refresh_tokens
      WHERE token = $1
    `;
    await db.query(query, [token]);
  }

  async rotateRefreshToken(token) {
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      throw new Error('Invalid or expired refresh token.');
    }

    const tokenRes = await db.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP',
      [token]
    );
    if (tokenRes.rows.length === 0) {
      throw new Error('Refresh token is invalid, expired, or revoked.');
    }
    const tokenRow = tokenRes.rows[0];

    const user = await userRepo.findById(tokenRow.user_id);
    if (!user || !user.is_active) {
      throw new Error('User account is invalid or deactivated.');
    }

    const newAccessToken = this.generateToken(user);
    const newRefreshToken = this.generateRefreshToken(user);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM refresh_tokens WHERE id = $1', [tokenRow.id]);
      await this.storeRefreshToken(user.id, newRefreshToken, client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return {
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        organization_id: user.organization_id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
      organization: user.organization_id ? {
        id: user.organization_id,
        name: user.org_name,
        subscription_plan: user.subscription_plan,
        is_verified: user.is_verified,
      } : null,
    };
  }

  async registerOrg(body) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Check duplicate users
      const exists = await userRepo.checkDuplicate(body.adminEmail, body.adminMobile);
      if (exists) {
        throw new Error('User with this email or mobile already exists.');
      }

      // 2. Create organization
      const orgId = uuidv4();
      const orgQuery = `
        INSERT INTO organizations 
        (id, name, type, contact_person, mobile, email, address, city, state, pincode, upi_id, registration_number, is_verified, subscription_plan)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      const orgRes = await client.query(orgQuery, [
        orgId,
        body.orgName,
        body.orgType,
        body.contactPerson,
        body.orgMobile,
        body.orgEmail,
        body.address,
        body.city,
        body.state,
        body.pincode,
        body.upiId,
        body.registrationNumber || null,
        false,
        'free',
      ]);
      const organization = orgRes.rows[0];

      // 3. Create Admin User
      const userId = uuidv4();
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(body.password, salt);

      const user = await userRepo.create(client, {
        id: userId,
        organizationId: orgId,
        name: body.adminName,
        email: body.adminEmail,
        mobile: body.adminMobile,
        passwordHash,
        role: 'org_admin',
      });

      // 4. Seed Template
      let templateName = 'Default Classic';
      let typePreset = 'traditional';
      let bgColor = '#FFFDD0';
      let borderStyle = 'double';
      let borderColor = '#E65100';
      let fontColor = '#3E2723';
      let headerLocal = `॥ श्री गणेश प्रसन्न ॥ ${body.orgName}`;
      let footerLocal = 'देणगी दिल्याबद्दल धन्यवाद. गणेशोत्सवाच्या हार्दिक शुभेच्छा!';

      if (body.orgType === 'Temple') {
        templateName = 'Temple Gold Preset';
        typePreset = 'temple';
        bgColor = '#FFFDE7';
        borderStyle = 'floral';
        borderColor = '#D84315';
        headerLocal = `॥ देव प्रसन्न ॥ ${body.orgName}`;
        footerLocal = 'देणगी पावती स्वीकृत झाली. मंदिराच्या कार्यास हातभार लावल्याबद्दल धन्यवाद.';
      } else if (body.orgType === 'NGO' || body.orgType === 'Trust') {
        templateName = 'Modern Trust Preset';
        typePreset = 'trust';
        bgColor = '#FFFFFF';
        borderStyle = 'thin';
        borderColor = '#0D47A1';
        fontColor = '#1A237E';
        headerLocal = body.orgName;
        footerLocal = 'Thank you for your donation towards social welfare.';
      }

      const templateQuery = `
        INSERT INTO templates 
        (organization_id, name, type, bg_color, border_style, border_color, font_color, header_text_en, header_text_local, footer_text_en, footer_text_local, is_default)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;
      await client.query(templateQuery, [
        orgId,
        templateName,
        typePreset,
        bgColor,
        borderStyle,
        borderColor,
        fontColor,
        body.orgName.toUpperCase(),
        headerLocal,
        'Thank you for your valuable support.',
        footerLocal,
        true,
      ]);

      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);
      await this.storeRefreshToken(user.id, refreshToken, client);

      await client.query('COMMIT');
      return { token, refreshToken, user, organization };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async loginEmail(email, password) {
    const user = await userRepo.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials.');
    }

    if (!user.is_active) {
      throw new Error('Account is deactivated.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid credentials.');
    }

    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);
    await this.storeRefreshToken(user.id, refreshToken);
    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        organization_id: user.organization_id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
      organization: {
        id: user.organization_id,
        name: user.org_name,
        subscription_plan: user.subscription_plan,
        is_verified: user.is_verified,
      },
    };
  }

  async sendOtp(mobile) {
    const user = await userRepo.findByMobile(mobile);
    if (!user) {
      throw new Error('Mobile number not registered.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await userRepo.updateOtp(user.id, otp, expiry);

    if (SIMULATE_SMS) {
      console.log(`\n========================================`);
      console.log(`[SIMULATING SMS] TO: ${mobile}`);
      console.log(`Hello ${user.name}, your PavtiBook login OTP is: ${otp}`);
      console.log(`Valid for 10 minutes.`);
      console.log(`========================================\n`);
    }

    return true;
  }

  async verifyOtp(mobile, otp) {
    const user = await userRepo.findByMobile(mobile);
    if (!user) {
      throw new Error('Invalid mobile or OTP.');
    }

    if (!user.is_active) {
      throw new Error('Account is deactivated.');
    }

    if (!user.otp) {
      throw new Error('Invalid OTP code.');
    }

    const isOtpValid = await bcrypt.compare(otp, user.otp);
    if (!isOtpValid) {
      throw new Error('Invalid OTP code.');
    }

    const expiryTime = new Date(user.otp_expiry);
    if (expiryTime < new Date()) {
      throw new Error('OTP has expired.');
    }

    await userRepo.clearOtp(user.id);

    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);
    await this.storeRefreshToken(user.id, refreshToken);
    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        organization_id: user.organization_id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
      organization: {
        id: user.organization_id,
        name: user.org_name,
        subscription_plan: user.subscription_plan,
        is_verified: user.is_verified,
      },
    };
  }

  async getMe(userId) {
    const info = await userRepo.findById(userId);
    if (!info) {
      throw new Error('User not found.');
    }
    return {
      user: {
        id: info.id,
        name: info.name,
        email: info.email,
        mobile: info.mobile,
        role: info.role,
        is_active: info.is_active,
      },
      organization: info.organization_id ? {
        id: info.organization_id,
        name: info.org_name,
        type: info.org_type,
        upi_id: info.upi_id,
        is_verified: info.is_verified,
        subscription_plan: info.subscription_plan,
      } : null,
    };
  }
}

module.exports = new AuthService();
