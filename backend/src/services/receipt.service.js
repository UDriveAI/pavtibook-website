const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const receiptRepo = require('../repositories/receipt.repository');
const donorRepo = require('../repositories/donor.repository');
const templateRepo = require('../repositories/template.repository');
const paymentRepo = require('../repositories/payment.repository');
const { generateReceiptPDF } = require('../utils/pdfEngine');
const userRepo = require('../repositories/user.repository');
const notificationQueue = require('../utils/notificationQueue');

class ReceiptService {
  async getReceipts(orgId, filters) {
    return await receiptRepo.findAll(orgId, filters);
  }

  async getReceiptById(id, orgId) {
    const receipt = await receiptRepo.findWithRelations(id, orgId);
    if (!receipt) {
      throw new Error('Receipt not found.');
    }
    return receipt;
  }

  async createReceipt(orgId, collectorId, body) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Lock organization row FOR UPDATE to serialize receipt sequence number generation
      // for this organization tenant and prevent concurrency duplicates.
      await client.query('SELECT id FROM organizations WHERE id = $1 FOR UPDATE', [orgId]);

      // Check if idempotencyKey is provided and a receipt already exists
      if (body.idempotencyKey) {
        const existingReceipt = await receiptRepo.findByIdempotencyKey(client, body.idempotencyKey, orgId);
        if (existingReceipt) {
          await client.query('COMMIT');
          const orgRes = await client.query('SELECT name, upi_id FROM organizations WHERE id = $1 AND deleted_at IS NULL', [orgId]);
          const org = orgRes.rows[0];
          const upiPayload = existingReceipt.payment_mode === 'upi'
            ? `upi://pay?pa=${encodeURIComponent(org.upi_id)}&pn=${encodeURIComponent(org.name)}&am=${existingReceipt.amount}&tn=${encodeURIComponent(existingReceipt.receipt_number)}`
            : null;
          return {
            receipt: existingReceipt,
            upiPayload,
          };
        }
      }

      // 1. Check or Create Donor
      let donorId;
      const existingDonor = await donorRepo.findByMobile(client, body.donorMobile, orgId);
      if (existingDonor) {
        donorId = existingDonor.id;
        const updateQuery = `
          UPDATE donors
          SET name = $1, email = $2, address = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = $4 AND organization_id = $5 AND deleted_at IS NULL
        `;
        await client.query(updateQuery, [
          body.donorName,
          body.donorEmail || null,
          body.donorAddress || null,
          donorId,
          orgId,
        ]);
      } else {
        donorId = uuidv4();
        await donorRepo.create(client, {
          id: donorId,
          organizationId: orgId,
          name: body.donorName,
          mobile: body.donorMobile,
          email: body.donorEmail,
          address: body.donorAddress,
        });
      }

      // 2. Select Template
      let activeTemplateId = body.templateId;
      if (!activeTemplateId) {
        const defaultTemplate = await templateRepo.findDefault(orgId);
        if (defaultTemplate) {
          activeTemplateId = defaultTemplate.id;
        }
      }

      // 3. Sequential Number Generation (Row Lock FOR UPDATE)
      const collectorPrefix = await userRepo.findPrefixByUserId(orgId, collectorId);
      const prefixCode = collectorPrefix ? collectorPrefix.toUpperCase() : 'ADM';
      const prefix = `PB-${prefixCode}-`;

      const seqRes = await receiptRepo.findLatestSequence(client, orgId, prefix);
      
      let nextNumber = 1;
      if (seqRes) {
        const suffixStr = seqRes.receipt_number.replace(prefix, '');
        const parsedSuffix = parseInt(suffixStr);
        if (!isNaN(parsedSuffix)) {
          nextNumber = parsedSuffix + 1;
        }
      }
      const receiptNumber = `${prefix}${nextNumber.toString().padStart(4, '0')}`;

      // 4. Create Receipt
      const paymentStatus = body.paymentMode === 'pending' ? 'pending' : 'paid';
      const qrCodeValue = uuidv4().replace(/-/g, '').substring(0, 16);
      const receiptId = uuidv4();

      let receipt;
      try {
        receipt = await receiptRepo.create(client, {
          id: receiptId,
          organizationId: orgId,
          templateId: activeTemplateId,
          donorId,
          collectorId,
          receiptNumber,
          amount: parseFloat(body.amount),
          purpose: body.purpose,
          paymentMode: body.paymentMode,
          paymentStatus,
          qrCodeValue,
          idempotencyKey: body.idempotencyKey || null,
        });
      } catch (err) {
        // Handle database unique constraint violation on idempotency_key (error code 23505)
        if (err.code === '23505' && body.idempotencyKey) {
          await client.query('ROLLBACK');
          const existing = await receiptRepo.findByIdempotencyKey(null, body.idempotencyKey, orgId);
          if (existing) {
            const orgRes = await db.query('SELECT name, upi_id FROM organizations WHERE id = $1 AND deleted_at IS NULL', [orgId]);
            const org = orgRes.rows[0];
            const upiPayload = existing.payment_mode === 'upi'
              ? `upi://pay?pa=${encodeURIComponent(org.upi_id)}&pn=${encodeURIComponent(org.name)}&am=${existing.amount}&tn=${encodeURIComponent(existing.receipt_number)}`
              : null;
            return {
              receipt: existing,
              upiPayload,
            };
          }
        }
        throw err;
      }

      // 5. Create Payment Log
      const orgRes = await client.query('SELECT name, upi_id FROM organizations WHERE id = $1 AND deleted_at IS NULL', [orgId]);
      const org = orgRes.rows[0];
      const upiPayload = `upi://pay?pa=${encodeURIComponent(org.upi_id)}&pn=${encodeURIComponent(org.name)}&am=${body.amount}&tn=${encodeURIComponent(receiptNumber)}`;

      const payStatus = paymentStatus === 'paid' ? 'completed' : 'pending';
      await paymentRepo.create(client, {
        id: uuidv4(),
        organizationId: orgId,
        receiptId,
        amount: parseFloat(body.amount),
        paymentMode: body.paymentMode,
        status: payStatus,
        qrCodePayload: body.paymentMode === 'upi' ? upiPayload : null,
      });

      await client.query('COMMIT');
      return {
        receipt,
        upiPayload: body.paymentMode === 'upi' ? upiPayload : null,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getReceiptPdf(id, orgId) {
    const fs = require('fs');
    const path = require('path');
    const cacheDir = path.join(__dirname, '../../tmp/pdf-cache');
    const pdfPath = path.join(cacheDir, `receipt_${id}.pdf`);

    // Ensure cache directory exists
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Serve cached PDF if it exists
    if (fs.existsSync(pdfPath)) {
      return fs.readFileSync(pdfPath);
    }

    const receipt = await receiptRepo.findById(id, orgId);
    if (!receipt) {
      throw new Error('Receipt not found.');
    }

    const donor = await donorRepo.findById(receipt.donor_id, orgId);
    
    const orgRes = await db.query('SELECT * FROM organizations WHERE id = $1 AND deleted_at IS NULL', [orgId]);
    const organization = orgRes.rows[0];

    let template = {};
    if (receipt.template_id) {
      const t = await templateRepo.findById(receipt.template_id, orgId);
      if (t) template = t;
    }

    const pdfBuffer = await generateReceiptPDF({
      receipt,
      donor,
      organization,
      template,
    });

    // Write file to cache
    fs.writeFileSync(pdfPath, pdfBuffer);

    return pdfBuffer;
  }

  async deliverReceipt(id, orgId, channel, recipientAddress, sharedBy = null, shareMethod = null, status = 'success') {
    const receipt = await receiptRepo.findById(id, orgId);
    if (!receipt) {
      throw new Error('Receipt not found.');
    }

    const donor = await donorRepo.findById(receipt.donor_id, orgId);
    const orgRes = await db.query('SELECT name FROM organizations WHERE id = $1 AND deleted_at IS NULL', [orgId]);
    const orgName = orgRes.rows[0].name;

    // Enqueue notification asynchronously — does NOT block HTTP response
    // Only simulate if not system/native share
    if (channel !== 'system' && (channel === 'whatsapp' || channel === 'sms')) {
      notificationQueue.enqueue({
        type: channel,
        recipient: recipientAddress,
        payload: {
          recipient: recipientAddress,
          donorName: donor.name,
          orgName,
          amount: receipt.amount,
          receiptNumber: receipt.receipt_number,
          downloadUrl: `https://pavtibook.in/verify/${receipt.qr_code_value}`,
        },
        handler: channel === 'whatsapp'
          ? notificationQueue.handlers.whatsapp
          : notificationQueue.handlers.sms,
      });
    }

    // Save delivery log
    const logId = uuidv4();
    await db.query(
      `INSERT INTO receipt_delivery_logs (id, organization_id, receipt_id, channel, recipient_address, status, shared_by, share_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [logId, orgId, id, channel, recipientAddress, status, sharedBy, shareMethod || channel]
    );

    return true;
  }

  async verifyReceiptByQrCode(qrCodeValue, ip, userAgent) {
    const info = await receiptRepo.verifyByQrCode(qrCodeValue);
    if (!info) {
      console.log(`[VERIFICATION AUDIT] FAILED SCAN ATTEMPT FROM IP: ${ip}`);
      return {
        isValid: false,
        message: 'Invalid receipt. This receipt could not be verified in the PavtiBook registry.',
      };
    }

    const logId = uuidv4();
    await receiptRepo.createVerificationLog(logId, info.receipt_id, ip, userAgent);

    return {
      isValid: true,
      receiptNumber: info.receipt_number,
      amount: parseFloat(info.amount),
      purpose: info.purpose,
      paymentMode: info.payment_mode,
      paymentStatus: info.payment_status,
      date: info.created_at,
      organizationName: info.organization_name,
      organizationType: info.organization_type,
      isOrganizationVerified: info.organization_verified,
      message: 'Verified Receipt. This document is authenticated by PavtiBook.',
    };
  }
}

module.exports = new ReceiptService();

