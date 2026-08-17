import 'dart:math';

class CategoryConfig {
  final String key;
  final String label;
  final double defaultSize;
  final double minSize;
  final double maxSize;

  const CategoryConfig({
    required this.key,
    required this.label,
    required this.defaultSize,
    required this.minSize,
    required this.maxSize,
  });
}

class ReceiptTypographyConfig {
  static const List<CategoryConfig> headerCategories = [
    CategoryConfig(key: 'org_name', label: 'Organization Name Size', defaultSize: 90.0, minSize: 0.0, maxSize: 120.0),
    CategoryConfig(key: 'greeting', label: 'Top Greeting Size', defaultSize: 40.0, minSize: 0.0, maxSize: 50.0),
    CategoryConfig(key: 'subtitle', label: 'Organization Subtitle Size', defaultSize: 36.0, minSize: 0.0, maxSize: 46.0),
    CategoryConfig(key: 'donor_title', label: 'Donor Section Title Size', defaultSize: 34.0, minSize: 0.0, maxSize: 44.0),
    CategoryConfig(key: 'donation_title', label: 'Donation Section Title Size', defaultSize: 34.0, minSize: 0.0, maxSize: 44.0),
    CategoryConfig(key: 'payment_title', label: 'Payment Section Title Size', defaultSize: 34.0, minSize: 0.0, maxSize: 42.0),
    CategoryConfig(key: 'notes_title', label: 'Notes Section Title Size', defaultSize: 30.0, minSize: 0.0, maxSize: 40.0),
    CategoryConfig(key: 'thank_you_msg', label: 'Thank-You Message Size', defaultSize: 30.0, minSize: 0.0, maxSize: 48.0),
    CategoryConfig(key: 'stamp_label', label: 'Official Stamp Label Size', defaultSize: 26.0, minSize: 0.0, maxSize: 34.0),
    CategoryConfig(key: 'sig_labels', label: 'Signature Label Size', defaultSize: 26.0, minSize: 0.0, maxSize: 34.0),
  ];

  static const List<CategoryConfig> categories = [
    ...headerCategories,
    CategoryConfig(key: 'donor_labels', label: 'Donor Field Labels', defaultSize: 20.0, minSize: 0.0, maxSize: 28.0),
    CategoryConfig(key: 'donor_values', label: 'Donor Field Values', defaultSize: 20.0, minSize: 0.0, maxSize: 28.0),
    CategoryConfig(key: 'table_headers', label: 'Table Headers', defaultSize: 20.0, minSize: 0.0, maxSize: 28.0),
    CategoryConfig(key: 'table_body', label: 'Table Body', defaultSize: 19.0, minSize: 0.0, maxSize: 26.0),
    CategoryConfig(key: 'amount', label: 'Amount / Total', defaultSize: 44.0, minSize: 0.0, maxSize: 60.0),
    CategoryConfig(key: 'payment_labels', label: 'Payment Method Labels', defaultSize: 17.0, minSize: 0.0, maxSize: 24.0),
    CategoryConfig(key: 'sidebar_headings', label: 'Sidebar Headings', defaultSize: 19.0, minSize: 0.0, maxSize: 26.0),
    CategoryConfig(key: 'sidebar_values', label: 'Sidebar Values', defaultSize: 19.0, minSize: 0.0, maxSize: 26.0),
    CategoryConfig(key: 'footer_text', label: 'Footer Text', defaultSize: 26.0, minSize: 0.0, maxSize: 36.0),
  ];

  /// Mandatory Typography Hierarchy Rule:
  /// Organization Name MUST ALWAYS BE THE LARGEST RECEIPT TEXT.
  /// Every other text category is clamped to `orgNameSize - 2.0`.
  static double getResolvedFontSize({
    required String categoryKey,
    Map<String, double>? customTextSizes,
    double? globalHeadingSize,
    double? globalBodySize,
    double? globalAmountSize,
  }) {
    final cat = categories.firstWhere(
      (c) => c.key == categoryKey,
      orElse: () => CategoryConfig(key: categoryKey, label: categoryKey, defaultSize: 20.0, minSize: 0.0, maxSize: 40.0),
    );

    double baseSize = cat.defaultSize;

    if (customTextSizes != null && customTextSizes.containsKey(categoryKey)) {
      baseSize = customTextSizes[categoryKey]!;
    } else {
      if (globalBodySize != null && globalBodySize > 0 && !categoryKey.contains('org_name') && !categoryKey.contains('greeting')) {
        baseSize = (globalBodySize * 2.0).clamp(cat.minSize, cat.maxSize);
      }
    }

    if (baseSize <= 0.0) {
      return 0.0;
    }

    double clamped = baseSize.clamp(cat.minSize, cat.maxSize);

    // Enforce Hierarchy Rule: Organization Name is ALWAYS LARGEST
    if (categoryKey != 'org_name') {
      double orgNameSize = getResolvedFontSize(
        categoryKey: 'org_name',
        customTextSizes: customTextSizes,
      );
      if (orgNameSize > 0.0) {
        double maxAllowed = max(cat.minSize, orgNameSize - 2.0);
        if (clamped > maxAllowed) {
          clamped = maxAllowed;
        }
      }
    }

    return clamped;
  }
}
