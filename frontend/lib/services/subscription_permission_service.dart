class SubscriptionPermissionService {
  /// Checks if the given plan is Premium tier (e.g. `premium_monthly`, `premium_yearly`).
  static bool isPremium(String? plan) {
    if (plan == null) return false;
    final normalized = plan.toLowerCase();
    return normalized.contains('premium');
  }

  /// Checks if the given plan is Professional tier or above (including Premium and free trial).
  static bool isProfessionalOrAbove(String? plan) {
    if (plan == null) return false;
    final normalized = plan.toLowerCase();
    return normalized.contains('professional') ||
        normalized.contains('premium') ||
        normalized == 'monthly' ||
        normalized == 'yearly' ||
        normalized == 'free_trial';
  }
}
