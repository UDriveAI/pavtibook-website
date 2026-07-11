/**
 * subscriptionGuard.js
 * SaaS subscription plan enforcement middleware.
 *
 * Enforces per-tenant resource limits based on their subscription plan.
 * Returns HTTP 402 Payment Required if a tenant exceeds their plan limits.
 *
 * Plan Hierarchy (ascending): free < standard < premium < enterprise
 *
 * Usage:
 *   const { checkCollectorLimit, checkTemplateLimit } = require('../middlewares/subscriptionGuard');
 *   router.post('/collectors', authenticateToken, checkCollectorLimit, createCollector);
 */

const db = require('../config/db');

// Plan definitions: feature limits per plan
const PLAN_LIMITS = {
  free: {
    maxCollectors: 3,
    maxTemplates: 2,
    label: 'Free',
  },
  standard: {
    maxCollectors: 10,
    maxTemplates: 5,
    label: 'Standard',
  },
  premium: {
    maxCollectors: Infinity,
    maxTemplates: Infinity,
    label: 'Premium',
  },
  enterprise: {
    maxCollectors: Infinity,
    maxTemplates: Infinity,
    label: 'Enterprise',
  },
};

function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS['free'];
}

function planError(res, limitName, currentCount, maxAllowed, currentPlan) {
  return res.status(402).json({
    success: false,
    message: `Your ${currentPlan} plan allows a maximum of ${maxAllowed} ${limitName}. You currently have ${currentCount}. Please upgrade your subscription to add more.`,
    code: 'PLAN_LIMIT_EXCEEDED',
    currentPlan,
    limit: maxAllowed,
    upgradeRequired: true,
  });
}

/**
 * checkCollectorLimit
 * Ensures org has not exceeded the active collector quota for their plan.
 */
const checkCollectorLimit = async (req, res, next) => {
  try {
    const orgId = req.organization_id;
    const plan = req.user?.subscription_plan || 'free';
    const limits = getPlanLimits(plan);

    if (limits.maxCollectors === Infinity) return next();

    // Count current active collectors for this org
    const result = await db.query(
      `SELECT COUNT(*) as count 
       FROM collectors 
       WHERE organization_id = $1 AND deleted_at IS NULL AND status = 'active'`,
      [orgId]
    );

    const currentCount = parseInt(result.rows[0].count, 10);

    if (currentCount >= limits.maxCollectors) {
      return planError(res, 'active collectors', currentCount, limits.maxCollectors, limits.label);
    }

    next();
  } catch (err) {
    console.error('[SubscriptionGuard] checkCollectorLimit error:', err.message);
    next(); // Fail open — don't block on guard errors
  }
};

/**
 * checkTemplateLimit
 * Ensures org has not exceeded the template quota for their plan.
 */
const checkTemplateLimit = async (req, res, next) => {
  try {
    const orgId = req.organization_id;
    const plan = req.user?.subscription_plan || 'free';
    const limits = getPlanLimits(plan);

    if (limits.maxTemplates === Infinity) return next();

    // Count current active templates for this org
    const result = await db.query(
      `SELECT COUNT(*) as count 
       FROM templates 
       WHERE organization_id = $1 AND deleted_at IS NULL`,
      [orgId]
    );

    const currentCount = parseInt(result.rows[0].count, 10);

    if (currentCount >= limits.maxTemplates) {
      return planError(res, 'receipt templates', currentCount, limits.maxTemplates, limits.label);
    }

    next();
  } catch (err) {
    console.error('[SubscriptionGuard] checkTemplateLimit error:', err.message);
    next(); // Fail open — don't block on guard errors
  }
};

/**
 * requirePlan(minPlan)
 * Generic plan requirement middleware factory.
 * Use when a feature requires at least a certain plan tier.
 *
 * Example: router.get('/advanced-report', requirePlan('premium'), handler)
 */
function requirePlan(minPlan) {
  const hierarchy = ['free', 'standard', 'premium', 'enterprise'];
  const minIndex = hierarchy.indexOf(minPlan);

  return (req, res, next) => {
    const userPlan = req.user?.subscription_plan || 'free';
    const userIndex = hierarchy.indexOf(userPlan);

    if (userIndex < minIndex) {
      const limits = getPlanLimits(userPlan);
      return res.status(402).json({
        success: false,
        message: `This feature requires a ${minPlan} plan or above. Your current plan is ${limits.label}.`,
        code: 'PLAN_UPGRADE_REQUIRED',
        currentPlan: userPlan,
        requiredPlan: minPlan,
        upgradeRequired: true,
      });
    }

    next();
  };
}

module.exports = { checkCollectorLimit, checkTemplateLimit, requirePlan, PLAN_LIMITS };
