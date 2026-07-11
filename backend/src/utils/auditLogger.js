/**
 * auditLogger.js
 * Centralized, non-blocking audit event logger.
 *
 * Inserts a row into the `audit_logs` table for every significant action.
 * The insert is fire-and-forget (does NOT block the request/response cycle).
 *
 * Usage:
 *   const auditLogger = require('./auditLogger');
 *   auditLogger.log({
 *     organizationId: req.organization_id,
 *     actorId: req.user.id,
 *     actorRole: req.user.role,
 *     action: 'RECEIPT_CREATED',
 *     resourceType: 'receipts',
 *     resourceId: receipt.id,
 *     ipAddress: req.ip,
 *   });
 */

const db = require('../config/db');

/**
 * Action constants for consistency across the codebase.
 */
const ACTIONS = {
  // Auth
  USER_LOGIN: 'USER_LOGIN',
  USER_OTP_SENT: 'USER_OTP_SENT',
  USER_OTP_VERIFIED: 'USER_OTP_VERIFIED',
  USER_REGISTERED: 'USER_REGISTERED',

  // Organization
  ORG_UPDATED: 'ORG_UPDATED',
  ORG_VERIFIED: 'ORG_VERIFIED',

  // Collectors
  COLLECTOR_CREATED: 'COLLECTOR_CREATED',
  COLLECTOR_DEACTIVATED: 'COLLECTOR_DEACTIVATED',
  COLLECTOR_ACTIVATED: 'COLLECTOR_ACTIVATED',

  // Receipts
  RECEIPT_CREATED: 'RECEIPT_CREATED',
  RECEIPT_DELETED: 'RECEIPT_DELETED',

  // Templates
  TEMPLATE_CREATED: 'TEMPLATE_CREATED',
  TEMPLATE_UPDATED: 'TEMPLATE_UPDATED',
  TEMPLATE_DELETED: 'TEMPLATE_DELETED',

  // Donors
  DONOR_CREATED: 'DONOR_CREATED',
  DONOR_UPDATED: 'DONOR_UPDATED',
  DONOR_DELETED: 'DONOR_DELETED',
};

/**
 * @param {Object} options
 * @param {string|null} options.organizationId
 * @param {string|null} options.actorId
 * @param {string|null} options.actorRole
 * @param {string} options.action - Use ACTIONS constants
 * @param {string|null} options.resourceType - Table name (e.g., 'receipts')
 * @param {string|null} options.resourceId - UUID of affected row
 * @param {Object|null} options.oldValue - Previous state snapshot
 * @param {Object|null} options.newValue - New state snapshot
 * @param {string|null} options.ipAddress
 */
function log(options) {
  const {
    organizationId = null,
    actorId = null,
    actorRole = null,
    action,
    resourceType = null,
    resourceId = null,
    oldValue = null,
    newValue = null,
    ipAddress = null,
  } = options;

  if (!action) {
    console.warn('[AuditLogger] log() called without an action. Skipping.');
    return;
  }

  // Fire-and-forget: do not await, do not block caller
  setImmediate(async () => {
    try {
      await db.query(
        `INSERT INTO audit_logs
          (organization_id, actor_id, actor_role, action, resource_type, resource_id, old_value, new_value, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          organizationId,
          actorId,
          actorRole,
          action,
          resourceType,
          resourceId,
          oldValue ? JSON.stringify(oldValue) : null,
          newValue ? JSON.stringify(newValue) : null,
          ipAddress,
        ]
      );
    } catch (err) {
      // Never let audit failure surface to user — log only
      console.error('[AuditLogger] Failed to write audit log:', err.message);
    }
  });
}

module.exports = { log, ACTIONS };
