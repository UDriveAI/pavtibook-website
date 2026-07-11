const path = require('path');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./src/config/db');
const app = require('./src/app');
const authService = require('./src/services/auth.service');
const receiptService = require('./src/services/receipt.service');

const PORT = 5555;
const BASE_URL = `http://localhost:${PORT}/api`;

// Helper to make HTTP requests
function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const parsedUrl = new URL(url);
    const options = {
      method: method,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: json
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('Starting Test Server on port', PORT);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log('Server started successfully.');

  try {
    // ----------------------------------------------------
    // TEST 1: Input Validation
    // ----------------------------------------------------
    console.log('\n--- TEST 1: Input Validation Middleware ---');
    const badRegPayload = {
      orgName: 'ab', // too short
      orgType: 'Invalid Mandal Type', // not in enum
      orgMobile: '12345', // invalid mobile
      orgEmail: 'not-an-email', // invalid email
      address: '', // empty
      city: '',
      state: '',
      pincode: '123', // invalid pincode
      upiId: '',
      adminName: 'a', // too short
      adminEmail: 'bad',
      adminMobile: '999',
      password: '123' // too short
    };

    const regRes = await request('POST', '/auth/register-org', badRegPayload);
    console.log('Response Status (should be 400):', regRes.statusCode);
    console.log('Validation Errors received:', JSON.stringify(regRes.body.errors, null, 2));
    if (regRes.statusCode !== 400 || !regRes.body.errors) {
      throw new Error('Test 1 Failed: Validation middleware did not reject invalid payload correctly.');
    }
    console.log('SUCCESS: Input validation rejected malformed registration payload.');

    // ----------------------------------------------------
    // TEST 2: OTP Secure Storage (Hashed not plain text)
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Secure OTP Hashing & Expiry ---');
    // Fetch a user mobile
    const userRes = await db.query('SELECT mobile, name FROM users LIMIT 1');
    if (userRes.rows.length === 0) {
      throw new Error('No users found in database to test OTP.');
    }
    const testMobile = userRes.rows[0].mobile;
    const testName = userRes.rows[0].name;
    console.log(`Sending OTP to user: ${testName} (${testMobile})`);

    const sendOtpRes = await request('POST', '/auth/send-otp', { mobile: testMobile });
    console.log('Send OTP Response Status (should be 200):', sendOtpRes.statusCode);

    // Retrieve the OTP hash directly from DB
    const dbUserRes = await db.query('SELECT otp, otp_expiry FROM users WHERE mobile = $1', [testMobile]);
    const hashedOtp = dbUserRes.rows[0].otp;
    const otpExpiry = dbUserRes.rows[0].otp_expiry;
    console.log('Hashed OTP stored in DB:', hashedOtp);
    console.log('OTP Expiry stored in DB:', otpExpiry);

    if (!hashedOtp || !hashedOtp.startsWith('$2a$') && !hashedOtp.startsWith('$2b$')) {
      throw new Error('Test 2 Failed: OTP is not hashed using bcrypt.');
    }
    // Verify that the hashed OTP is not plain text (e.g. not a 6 digit number)
    if (/^\d{6}$/.test(hashedOtp)) {
      throw new Error('Test 2 Failed: OTP is stored in plain text.');
    }
    console.log('SUCCESS: OTP is safely hashed using bcrypt in the database.');

    // ----------------------------------------------------
    // TEST 3: Rate Limiting
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Rate Limiting on Login/Verify ---');
    // Make 6 consecutive bad login attempts (limit is 5)
    console.log('Making 6 login attempts to trigger rate limiter...');
    let rateLimited = false;
    for (let i = 1; i <= 6; i++) {
      const loginRes = await request('POST', '/auth/login-email', {
        email: 'attacker@pavtibook.in',
        password: 'wrongpassword'
      });
      console.log(`Attempt ${i} response status:`, loginRes.statusCode);
      if (loginRes.statusCode === 429) {
        rateLimited = true;
        console.log('Rate limiter triggered successfully on attempt', i);
        console.log('Message:', loginRes.body.message);
        break;
      }
    }
    if (!rateLimited) {
      throw new Error('Test 3 Failed: Rate limiter was not triggered after 5 attempts.');
    }
    console.log('SUCCESS: Rate limiting protected credentials from brute-forcing.');

    // ----------------------------------------------------
    // TEST 4: JWT Rotation & Revocation
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Refresh Token Rotation & Revocation ---');
    // Find active user with password to login or create a temp organization admin
    // For test simplicity, let's use the register endpoint with a unique email to log in
    const uniqueId = Date.now();
    const testRegPayload = {
      orgName: `Test Org ${uniqueId}`,
      orgType: 'NGO',
      contactPerson: 'Test Contact Person',
      orgMobile: `98765${String(uniqueId).substring(8)}`,
      orgEmail: `org-${uniqueId}@test.com`,
      address: 'Test Address',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      upiId: 'testorg@upi',
      adminName: 'Test Admin',
      adminEmail: `admin-${uniqueId}@test.com`,
      adminMobile: `98766${String(uniqueId).substring(8)}`,
      password: 'SecurePassword123'
    };

    console.log('Registering test organization...');
    const regResult = await request('POST', '/auth/register-org', testRegPayload);
    if (regResult.statusCode !== 201) {
      throw new Error(`Failed to register test organization: ${JSON.stringify(regResult.body)}`);
    }

    const { token, refreshToken, user } = regResult.body;
    console.log('Successfully registered.');
    console.log('Access Token (expires in 15m):', token.substring(0, 30) + '...');
    console.log('Refresh Token (expires in 7d):', refreshToken.substring(0, 30) + '...');

    // Verify refresh token is in database
    const dbTokenBefore = await db.query('SELECT * FROM refresh_tokens WHERE token = $1', [refreshToken]);
    console.log('Refresh Token present in DB before rotation:', dbTokenBefore.rows.length === 1);
    if (dbTokenBefore.rows.length !== 1) {
      throw new Error('Test 4 Failed: Refresh token was not saved to database.');
    }

    // Call token rotation
    console.log('Calling token rotation /auth/refresh...');
    const refreshRes = await request('POST', '/auth/refresh', { refreshToken });
    console.log('Refresh status:', refreshRes.statusCode);
    if (refreshRes.statusCode !== 200) {
      throw new Error(`Test 4 Failed: Token rotation failed with status ${refreshRes.statusCode}: ${JSON.stringify(refreshRes.body)}`);
    }

    const newAccessToken = refreshRes.body.token;
    const newRefreshToken = refreshRes.body.refreshToken;
    console.log('New Access Token:', newAccessToken.substring(0, 30) + '...');
    console.log('New Refresh Token:', newRefreshToken.substring(0, 30) + '...');

    // Old token should be deleted, new token should exist
    const dbOldToken = await db.query('SELECT * FROM refresh_tokens WHERE token = $1', [refreshToken]);
    const dbNewToken = await db.query('SELECT * FROM refresh_tokens WHERE token = $1', [newRefreshToken]);
    console.log('Old Refresh Token exists in DB (should be false):', dbOldToken.rows.length > 0);
    console.log('New Refresh Token exists in DB (should be true):', dbNewToken.rows.length === 1);

    if (dbOldToken.rows.length > 0 || dbNewToken.rows.length !== 1) {
      throw new Error('Test 4 Failed: Token rotation database sync failed.');
    }

    // Revocation on logout
    console.log('Logging out /auth/logout with new refresh token...');
    const logoutRes = await request('POST', '/auth/logout', { refreshToken: newRefreshToken });
    console.log('Logout response status (should be 200):', logoutRes.statusCode);

    const dbNewTokenAfterLogout = await db.query('SELECT * FROM refresh_tokens WHERE token = $1', [newRefreshToken]);
    console.log('New Refresh Token exists in DB after logout (should be false):', dbNewTokenAfterLogout.rows.length > 0);
    if (dbNewTokenAfterLogout.rows.length > 0) {
      throw new Error('Test 4 Failed: Refresh token was not revoked/deleted on logout.');
    }
    console.log('SUCCESS: Refresh token rotation and logout revocation work perfectly.');

    // ----------------------------------------------------
    // TEST 5: Concurrency Receipt Sequence locking
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Concurrency Receipt Sequence Serialisation ---');
    // We will create receipts concurrently for the same organization
    const orgId = user.organization_id;
    const collectorId = user.id;

    // First ensure there is a default template
    const templateRes = await db.query('SELECT id FROM templates WHERE organization_id = $1 LIMIT 1', [orgId]);
    const templateId = templateRes.rows[0].id;

    console.log(`Creating 5 receipts concurrently for Org: ${orgId}, Collector: ${collectorId}`);
    const receiptPromises = [];
    for (let i = 1; i <= 5; i++) {
      receiptPromises.push(
        receiptService.createReceipt(orgId, collectorId, {
          donorName: `Donor Concurrency ${i}`,
          donorMobile: '9999999999',
          amount: 100 * i,
          purpose: 'Concurrent Test',
          paymentMode: 'cash',
          templateId
        })
      );
    }

    const results = await Promise.all(receiptPromises);
    const numbers = results.map(r => r.receipt.receipt_number).sort();
    console.log('Generated Receipt Numbers:', numbers);

    // Verify all numbers are unique
    const uniqueNumbers = new Set(numbers);
    if (uniqueNumbers.size !== numbers.length) {
      throw new Error('Test 5 Failed: Concurrent receipt generation caused receipt number collisions!');
    }
    console.log('SUCCESS: All generated receipt numbers are unique, sequence serialisation lock works!');

  } finally {
    console.log('Closing Test Server...');
    await new Promise((resolve) => server.close(resolve));
    console.log('Server closed.');
  }
}

runTests()
  .then(() => {
    console.log('\nALL INTEGRATION TESTS PASSED SUCCESSFULLY! ✅');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nINTEGRATION TEST CRASHED: ❌', err);
    process.exit(1);
  });
