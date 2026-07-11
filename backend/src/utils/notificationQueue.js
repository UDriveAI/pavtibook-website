/**
 * notificationQueue.js
 * Lightweight in-process async notification queue.
 *
 * Decouples notification delivery (WhatsApp, SMS, Email) from the HTTP
 * request/response cycle. Receipt creation returns immediately; notifications
 * are dispatched asynchronously with retry logic.
 *
 * Architecture:
 *   - Uses Node.js setImmediate() for zero-blocking fire-and-forget dispatch
 *   - Implements exponential backoff retry (max 3 attempts)
 *   - Falls back to console logging if all retries fail
 *
 * Production upgrade path:
 *   This module is designed to be a drop-in replacement stub.
 *   To upgrade to Redis + BullMQ: replace the enqueue() internals
 *   while keeping the same calling contract.
 *
 * Usage:
 *   const notificationQueue = require('./notificationQueue');
 *   notificationQueue.enqueue({
 *     type: 'whatsapp',
 *     recipient: '919876543210',
 *     payload: { receiptNumber: 'RK-001', amount: 5000, donorName: 'Ramesh' },
 *     handler: async (payload) => { ... send via API ... },
 *   });
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500; // 500ms, 1000ms, 2000ms

/**
 * Sleep utility for retry backoff.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a job with exponential backoff retries.
 * @param {Object} job
 * @param {string} job.type - Notification type ('whatsapp', 'sms', 'email')
 * @param {string} job.recipient - Phone or email address
 * @param {Object} job.payload - Data to pass to the handler
 * @param {Function} job.handler - async function(payload) => void
 */
async function executeWithRetry(job) {
  const { type, recipient, payload, handler } = job;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await handler(payload);
      console.log(
        `[NotificationQueue] ✓ Sent ${type} to ${recipient} (attempt ${attempt})`
      );
      return; // Success — exit retry loop
    } catch (err) {
      console.warn(
        `[NotificationQueue] ✗ Failed ${type} to ${recipient} ` +
        `(attempt ${attempt}/${MAX_RETRIES}): ${err.message}`
      );

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
      } else {
        // All retries exhausted — log as dead letter
        console.error(
          `[NotificationQueue] DEAD LETTER: ${type} to ${recipient} failed after ${MAX_RETRIES} attempts. ` +
          `Payload: ${JSON.stringify(payload)}`
        );
      }
    }
  }
}

/**
 * Enqueue a notification job.
 * Returns immediately — the job runs asynchronously.
 *
 * @param {Object} job
 * @param {string} job.type - 'whatsapp' | 'sms' | 'email'
 * @param {string} job.recipient - Phone number or email
 * @param {Object} job.payload - Message data
 * @param {Function} job.handler - async (payload) => Promise<void>
 */
function enqueue(job) {
  if (!job || !job.handler) {
    console.warn('[NotificationQueue] enqueue() called without a handler. Skipping.');
    return;
  }

  // Use setImmediate to ensure the current event loop tick completes first
  // (HTTP response is sent), then execute the notification job
  setImmediate(() => {
    executeWithRetry(job).catch((err) => {
      // Should never reach here due to internal try/catch, but safety net
      console.error('[NotificationQueue] Unexpected error in queue runner:', err.message);
    });
  });
}

/**
 * Built-in handler factories for common notification types.
 * Replace these with real API integrations when available.
 */
const handlers = {
  /**
   * WhatsApp notification handler.
   * Replace with Twilio / Meta / Gupshup API call.
   */
  whatsapp: async (payload) => {
    const SIMULATE = process.env.SIMULATE_SMS === 'true';
    if (SIMULATE) {
      console.log(`\n[WhatsApp SIMULATED] To: ${payload.recipient}`);
      console.log(`  Message: Receipt ${payload.receiptNumber} for ₹${payload.amount} issued to ${payload.donorName}.`);
      console.log(`  Download: ${payload.downloadUrl || 'N/A'}\n`);
    } else {
      // TODO: Replace with real WhatsApp Business API integration
      throw new Error('WhatsApp API not configured. Set SIMULATE_SMS=true or integrate an API provider.');
    }
  },

  /**
   * SMS notification handler.
   * Replace with Twilio / Msg91 / AWS SNS call.
   */
  sms: async (payload) => {
    const SIMULATE = process.env.SIMULATE_SMS === 'true';
    if (SIMULATE) {
      console.log(`\n[SMS SIMULATED] To: ${payload.recipient}`);
      console.log(`  Message: PavtiBook - Receipt ${payload.receiptNumber} (₹${payload.amount}) issued. Thank you!\n`);
    } else {
      throw new Error('SMS API not configured. Set SIMULATE_SMS=true or integrate an API provider.');
    }
  },
};

module.exports = { enqueue, handlers };
