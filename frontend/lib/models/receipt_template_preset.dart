import 'package:flutter/material.dart';
import 'models.dart';

/// Represents a self-contained, isolated visual preset definition.
class ReceiptTemplatePreset {
  final String id;
  final String category; // 'organization' or 'event'
  final String nameKey;
  final String descriptionKey;
  final Color primaryColor;
  final Color secondaryColor;
  final Color accentColor;
  final Color backgroundColor;
  final Color borderColor;
  final Color fontColor;
  final Color bannerColor;
  final Color headerTitleColor;
  final String borderStyle; // 'solid', 'double', 'decorative'
  final bool isNeutral; // True for Default / NGO / Society
  final String? godImageUrl;
  final String godImagePosition; // 'left', 'center', 'none'
  final String? watermarkUrl;
  final double watermarkOpacity;
  final String? headingSymbol; // Decorative or cultural symbol
  final String? greetingKey; // Localized greeting key
  final String? footerQuoteKey; // Localized footer quote key
  final String? headerTextEn;
  final String? headerTextLocal;
  final String? footerTextEn;
  final String? footerTextLocal;

  final String? defaultOrgTitleLocal;
  final String? defaultOrgTitleEn;
  final String? defaultSubtitleLocal;
  final String? defaultSubtitleEn;
  final String? receiptTitleBanner;

  const ReceiptTemplatePreset({
    required this.id,
    required this.category,
    required this.nameKey,
    required this.descriptionKey,
    required this.primaryColor,
    required this.secondaryColor,
    required this.accentColor,
    required this.backgroundColor,
    required this.borderColor,
    required this.fontColor,
    required this.bannerColor,
    required this.headerTitleColor,
    this.borderStyle = 'double',
    this.isNeutral = false,
    this.godImageUrl,
    this.godImagePosition = 'none',
    this.watermarkUrl,
    this.watermarkOpacity = 0.08,
    this.headingSymbol,
    this.greetingKey,
    this.footerQuoteKey,
    this.headerTextEn,
    this.headerTextLocal,
    this.footerTextEn,
    this.footerTextLocal,
    this.defaultOrgTitleLocal,
    this.defaultOrgTitleEn,
    this.defaultSubtitleLocal,
    this.defaultSubtitleEn,
    this.receiptTitleBanner,
  });

  String get borderColorHex =>
      '#${borderColor.value.toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';
  String get backgroundColorHex =>
      '#${backgroundColor.value.toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';
  String get fontColorHex =>
      '#${fontColor.value.toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';
  String get primaryColorHex =>
      '#${primaryColor.value.toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';
}

/// Pristine Catalog containing isolated presets.
class ReceiptPresetCatalog {
  // 1. DEFAULT PAVTIBOOK NEUTRAL PRESET
  static const ReceiptTemplatePreset defaultPavtiBook = ReceiptTemplatePreset(
    id: 'default_pavtibook',
    category: 'organization',
    nameKey: 'preset_default_name',
    descriptionKey: 'preset_default_desc',
    primaryColor: Color(0xFF8B1E2D), // PavtiBook Maroon
    secondaryColor: Color(0xFFFFFFFF),
    accentColor: Color(0xFFD4AF37), // Gold
    backgroundColor: Color(0xFFFFFDD0), // Cream Paper
    borderColor: Color(0xFFD84315), // Warm Saffron/Orange Accent
    fontColor: Color(0xFF2E1C0C), // Dark Charcoal Brown
    bannerColor: Color(0xFF8B1E2D),
    headerTitleColor: Color(0xFFFFEE58),
    borderStyle: 'double',
    isNeutral: true,
    godImageUrl: null,
    godImagePosition: 'none',
    watermarkUrl: null,
    watermarkOpacity: 0.05,
    headingSymbol: null,
    greetingKey: null,
    footerQuoteKey: null,
    defaultOrgTitleLocal: 'आपल्या संस्थेचे नाव',
    defaultOrgTitleEn: 'Your Organization Name',
    defaultSubtitleLocal: 'धर्म / संस्था / मंडळ / NGO / ट्रस्ट',
    defaultSubtitleEn: 'Religious / Trust / NGO / Society',
    receiptTitleBanner: 'देणगी पावती',
  );

  // 2. GANESH MANDAL PRESET
  static const ReceiptTemplatePreset ganeshMandal = ReceiptTemplatePreset(
    id: 'ganesh_mandal',
    category: 'event',
    nameKey: 'preset_ganesh_name',
    descriptionKey: 'preset_ganesh_desc',
    primaryColor: Color(0xFFD84315),
    secondaryColor: Color(0xFFFFFFFF),
    accentColor: Color(0xFFFFB74D),
    backgroundColor: Color(0xFFFFFBEF),
    borderColor: Color(0xFFE65100),
    fontColor: Color(0xFF2E1C0C),
    bannerColor: Color(0xFF8B1E2D),
    headerTitleColor: Color(0xFFFFEE58),
    borderStyle: 'decorative',
    isNeutral: false,
    godImageUrl: null,
    godImagePosition: 'left',
    watermarkUrl: null,
    watermarkOpacity: 0.08,
    headingSymbol: '|| श्री गणेशाय नमः ||',
    greetingKey: 'ganesh_greeting',
    footerQuoteKey: 'ganesh_footer_quote',
    defaultOrgTitleLocal: 'श्री गणेश मित्र मंडळ',
    defaultOrgTitleEn: 'Shri Ganesh Mitra Mandal',
    defaultSubtitleLocal: 'सार्वजनिक गणेशोत्सव मंडळ',
    defaultSubtitleEn: 'Public Ganeshotsav Festival Trust',
    receiptTitleBanner: 'देणगी पावती',
  );

  // 3. MOSQUE / ZAKAT PRESET
  static const ReceiptTemplatePreset mosqueZakat = ReceiptTemplatePreset(
    id: 'mosque_zakat',
    category: 'organization',
    nameKey: 'preset_mosque_name',
    descriptionKey: 'preset_mosque_desc',
    primaryColor: Color(0xFF1B5E20), // Islamic Emerald Green
    secondaryColor: Color(0xFFFFFFFF),
    accentColor: Color(0xFFC0CA33),
    backgroundColor: Color(0xFFF1F8E9),
    borderColor: Color(0xFF2E7D32),
    fontColor: Color(0xFF1B5E20),
    bannerColor: Color(0xFF1B5E20),
    headerTitleColor: Color(0xFFFFFFFF),
    borderStyle: 'solid',
    isNeutral: false,
    godImageUrl: null,
    godImagePosition: 'none',
    watermarkUrl: null,
    watermarkOpacity: 0.06,
    headingSymbol: 'بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ',
    greetingKey: 'mosque_greeting',
    footerQuoteKey: 'mosque_footer_quote',
    defaultOrgTitleLocal: 'अल-नूर मस्जिद कमिटी',
    defaultOrgTitleEn: 'Al-Noor Masjid Committee',
    defaultSubtitleLocal: 'दान / Zakat रसीद',
    defaultSubtitleEn: 'Zakat & Donation Committee',
    receiptTitleBanner: 'दान पावती',
  );

  // 4. CHURCH DONATION PRESET
  static const ReceiptTemplatePreset churchDonation = ReceiptTemplatePreset(
    id: 'church_donation',
    category: 'organization',
    nameKey: 'preset_church_name',
    descriptionKey: 'preset_church_desc',
    primaryColor: Color(0xFF0D47A1), // Royal Navy Blue
    secondaryColor: Color(0xFFFFFFFF),
    accentColor: Color(0xFF42A5F5),
    backgroundColor: Color(0xFFEBF3FA),
    borderColor: Color(0xFF1565C0),
    fontColor: Color(0xFF0D47A1),
    bannerColor: Color(0xFF0D47A1),
    headerTitleColor: Color(0xFFFFFFFF),
    borderStyle: 'solid',
    isNeutral: false,
    godImageUrl: null,
    godImagePosition: 'none',
    watermarkUrl: null,
    watermarkOpacity: 0.05,
    headingSymbol: 'TO GOD BE THE GLORY',
    greetingKey: 'church_greeting',
    footerQuoteKey: 'church_footer_quote',
    defaultOrgTitleLocal: 'सेंट मेरी चर्च',
    defaultOrgTitleEn: 'St. Mary Church',
    defaultSubtitleLocal: 'दान रसीद',
    defaultSubtitleEn: 'Church Donation & Charity',
    receiptTitleBanner: 'DONATION RECEIPT',
  );

  // 5. BUDDHA VIHAR PRESET
  static const ReceiptTemplatePreset buddhaVihar = ReceiptTemplatePreset(
    id: 'buddha_vihar',
    category: 'organization',
    nameKey: 'preset_buddha_name',
    descriptionKey: 'preset_buddha_desc',
    primaryColor: Color(0xFFE65100), // Golden Ochre
    secondaryColor: Color(0xFFFFFFFF),
    accentColor: Color(0xFFFFB300),
    backgroundColor: Color(0xFFFFF8E1),
    borderColor: Color(0xFFF57F17),
    fontColor: Color(0xFF3E2723),
    bannerColor: Color(0xFFE65100),
    headerTitleColor: Color(0xFFFFFFFF),
    borderStyle: 'solid',
    isNeutral: false,
    godImageUrl: null,
    godImagePosition: 'none',
    watermarkUrl: null,
    watermarkOpacity: 0.08,
    headingSymbol: '|| बुद्धं शरणं गच्छामि ||',
    greetingKey: 'buddha_greeting',
    footerQuoteKey: 'buddha_footer_quote',
    defaultOrgTitleLocal: 'बुद्ध विहार संघ',
    defaultOrgTitleEn: 'Buddha Vihar Sangh',
    defaultSubtitleLocal: 'दान पावती',
    defaultSubtitleEn: 'Buddha Vihar Welfare Trust',
    receiptTitleBanner: 'दान पावती',
  );

  // 6. GURUDWARA SEVA PRESET
  static const ReceiptTemplatePreset gurudwaraSeva = ReceiptTemplatePreset(
    id: 'gurudwara_seva',
    category: 'organization',
    nameKey: 'preset_gurudwara_name',
    descriptionKey: 'preset_gurudwara_desc',
    primaryColor: Color(0xFF0277BD), // Royal Blue & Kesar Yellow
    secondaryColor: Color(0xFFFFFFFF),
    accentColor: Color(0xFFFF8F00),
    backgroundColor: Color(0xFFE1F5FE),
    borderColor: Color(0xFF0277BD),
    fontColor: Color(0xFF01579B),
    bannerColor: Color(0xFF0277BD),
    headerTitleColor: Color(0xFFFFFFFF),
    borderStyle: 'solid',
    isNeutral: false,
    godImageUrl: null,
    godImagePosition: 'none',
    watermarkUrl: null,
    watermarkOpacity: 0.06,
    headingSymbol: 'ੴ सतिनाम वाहेगुरु',
    greetingKey: 'gurudwara_greeting',
    footerQuoteKey: 'gurudwara_footer_quote',
    defaultOrgTitleLocal: 'गुरु नानक गुरुद्वारा',
    defaultOrgTitleEn: 'Guru Nanak Gurudwara',
    defaultSubtitleLocal: 'सेवा रसीद',
    defaultSubtitleEn: 'Gurudwara Seva Trust',
    receiptTitleBanner: 'सेवा पावती',
  );

  // 7. JAIN MANDIR PRESET
  static const ReceiptTemplatePreset jainMandir = ReceiptTemplatePreset(
    id: 'jain_mandir',
    category: 'organization',
    nameKey: 'preset_jain_name',
    descriptionKey: 'preset_jain_desc',
    primaryColor: Color(0xFFBF360C), // Terracotta & Gold
    secondaryColor: Color(0xFFFFFFFF),
    accentColor: Color(0xFFFFB300),
    backgroundColor: Color(0xFFFFF3E0),
    borderColor: Color(0xFFD84315),
    fontColor: Color(0xFF3E2723),
    bannerColor: Color(0xFFBF360C),
    headerTitleColor: Color(0xFFFFFFFF),
    borderStyle: 'solid',
    isNeutral: false,
    godImageUrl: null,
    godImagePosition: 'none',
    watermarkUrl: null,
    watermarkOpacity: 0.08,
    headingSymbol: '|| अहिंसा परमो धर्मः ||',
    greetingKey: 'jain_greeting',
    footerQuoteKey: 'jain_footer_quote',
    defaultOrgTitleLocal: 'श्री पार्श्वनाथ जैन मंदिर',
    defaultOrgTitleEn: 'Shri Parshvanath Jain Mandir',
    defaultSubtitleLocal: 'दान पावती',
    defaultSubtitleEn: 'Jain Mandir Trust',
    receiptTitleBanner: 'दान पावती',
  );

  // 8. NGO FOUNDATION PRESET
  static const ReceiptTemplatePreset ngoFoundation = ReceiptTemplatePreset(
    id: 'ngo_foundation',
    category: 'organization',
    nameKey: 'preset_ngo_name',
    descriptionKey: 'preset_ngo_desc',
    primaryColor: Color(0xFF2E7D32), // Forest Green & Clean White
    secondaryColor: Color(0xFFFFFFFF),
    accentColor: Color(0xFF66BB6A),
    backgroundColor: Color(0xFFF1F8E9),
    borderColor: Color(0xFF388E3C),
    fontColor: Color(0xFF1B5E20),
    bannerColor: Color(0xFF2E7D32),
    headerTitleColor: Color(0xFFFFFFFF),
    borderStyle: 'solid',
    isNeutral: true,
    godImageUrl: null,
    godImagePosition: 'none',
    watermarkUrl: null,
    watermarkOpacity: 0.05,
    headingSymbol: null,
    greetingKey: null,
    footerQuoteKey: null,
    defaultOrgTitleLocal: 'Helping Hands Foundation',
    defaultOrgTitleEn: 'Helping Hands Foundation',
    defaultSubtitleLocal: 'NGO Reg. No. MH/12345/2020',
    defaultSubtitleEn: 'NGO Reg. No. MH/12345/2020',
    receiptTitleBanner: 'Donation Receipt',
  );

  // 9. AMBEDKAR JAYANTI PRESET
  static const ReceiptTemplatePreset ambedkarJayanti = ReceiptTemplatePreset(
    id: 'ambedkar_jayanti',
    category: 'event',
    nameKey: 'preset_ambedkar_name',
    descriptionKey: 'preset_ambedkar_desc',
    primaryColor: Color(0xFF1565C0), // Royal Blue
    secondaryColor: Color(0xFFFFFFFF),
    accentColor: Color(0xFF42A5F5),
    backgroundColor: Color(0xFFE3F2FD),
    borderColor: Color(0xFF1E88E5),
    fontColor: Color(0xFF0D47A1),
    bannerColor: Color(0xFF1565C0),
    headerTitleColor: Color(0xFFFFFFFF),
    borderStyle: 'solid',
    isNeutral: false,
    godImageUrl: null,
    godImagePosition: 'none',
    watermarkUrl: null,
    watermarkOpacity: 0.06,
    headingSymbol: '|| जय भीम ||',
    greetingKey: 'ambedkar_greeting',
    footerQuoteKey: 'ambedkar_footer_quote',
    defaultOrgTitleLocal: 'डॉ. बाबासाहेब आंबेडकर जयंती समिती',
    defaultOrgTitleEn: 'Dr. B. R. Ambedkar Jayanti Samiti',
    defaultSubtitleLocal: 'सार्वजनिक उत्सव समिती',
    defaultSubtitleEn: 'Public Festival Committee',
    receiptTitleBanner: 'वर्गणी पावती',
  );

  // 10. SOCIETY MAINTENANCE PRESET
  static const ReceiptTemplatePreset societyMaintenance = ReceiptTemplatePreset(
    id: 'society_maintenance',
    category: 'organization',
    nameKey: 'preset_society_name',
    descriptionKey: 'preset_society_desc',
    primaryColor: Color(0xFF37474F), // Slate Grey & Steel
    secondaryColor: Color(0xFFFFFFFF),
    accentColor: Color(0xFF78909C),
    backgroundColor: Color(0xFFECEFF1),
    borderColor: Color(0xFF455A64),
    fontColor: Color(0xFF263238),
    bannerColor: Color(0xFF37474F),
    headerTitleColor: Color(0xFFFFFFFF),
    borderStyle: 'solid',
    isNeutral: true,
    godImageUrl: null,
    godImagePosition: 'none',
    watermarkUrl: null,
    watermarkOpacity: 0.05,
    headingSymbol: null,
    greetingKey: null,
    footerQuoteKey: null,
    defaultOrgTitleLocal: 'रॉयल पाम्स गृहनिर्माण संस्था',
    defaultOrgTitleEn: 'Royal Palms Co-Op Housing Society',
    defaultSubtitleLocal: 'नोंदणी क्र. MUM/MH/2018',
    defaultSubtitleEn: 'Reg. No. MUM/MH/2018',
    receiptTitleBanner: 'पावती / Receipt',
  );

  static List<ReceiptTemplatePreset> get allPresets => [
        defaultPavtiBook,
        ganeshMandal,
        mosqueZakat,
        churchDonation,
        buddhaVihar,
        gurudwaraSeva,
        jainMandir,
        ngoFoundation,
        ambedkarJayanti,
        societyMaintenance,
      ];

  static ReceiptTemplatePreset getById(String? id) {
    if (id == null || id.isEmpty) return defaultPavtiBook;
    return allPresets.firstWhere(
      (p) => p.id == id,
      orElse: () => defaultPavtiBook,
    );
  }
}

/// Factory that builds pristine TemplateModels starting from a CLEAN NEUTRAL BASE.
class PresetFactory {
  /// Builds a fresh TemplateModel from a clean neutral base.
  /// Guarantees ZERO state leakage from previous presets.
  static TemplateModel createPristineTemplate({
    required String organizationId,
    required ReceiptTemplatePreset preset,
    required OrganizationModel org,
  }) {
    return TemplateModel(
      id: 'template_${preset.id}_${DateTime.now().millisecondsSinceEpoch}',
      organizationId: organizationId,
      name: preset.nameKey,
      type: preset.id,
      bgColor: preset.backgroundColorHex,
      borderStyle: preset.borderStyle,
      borderColor: preset.borderColorHex,
      fontFamily: 'Poppins',
      fontColor: preset.fontColorHex,
      logoVisible: true,
      godImageUrl: preset.godImageUrl, // Explicit preset asset ONLY
      godImagePosition: preset.godImagePosition,
      watermarkUrl: preset.watermarkUrl,
      watermarkOpacity: preset.watermarkOpacity,
      headerTextEn: preset.headerTextEn,
      headerTextLocal: preset.headerTextLocal,
      footerTextEn: preset.footerTextEn,
      footerTextLocal: preset.footerTextLocal,
      signatureLabel: 'President / अध्यक्ष',
      signatureUrl: org.presidentSignatureUrl,
      isDefault: preset.id == 'default_pavtibook',
    );
  }
}
