import 'package:flutter/material.dart';
import '../models/models.dart';
import '../models/receipt_template_preset.dart';

/// Resolved rendering parameters produced by the Universal Receipt Engine.
class UniversalReceiptRenderParams {
  final ReceiptModel receipt;
  final OrganizationModel organization;
  final TemplateModel template;
  final ReceiptTemplatePreset preset;
  final String languageCode; // 'mr', 'hi', 'en'
  final Map<String, String> localizedLabels;

  // Visual parameters
  final Color primaryColor;
  final Color secondaryColor;
  final Color accentColor;
  final Color backgroundColor;
  final Color borderColor;
  final Color fontColor;
  final Color bannerColor;
  final Color headerTitleColor;

  // Dynamic system headers/footers/symbols
  final String? headingSymbol;
  final String? greetingText;
  final String? footerQuoteText;

  UniversalReceiptRenderParams({
    required this.receipt,
    required this.organization,
    required this.template,
    required this.preset,
    required this.languageCode,
    required this.localizedLabels,
    required this.primaryColor,
    required this.secondaryColor,
    required this.accentColor,
    required this.backgroundColor,
    required this.borderColor,
    required this.fontColor,
    required this.bannerColor,
    required this.headerTitleColor,
    this.headingSymbol,
    this.greetingText,
    this.footerQuoteText,
  });

  /// Negative isolation validator to ensure zero unintended cross-preset leakage.
  bool validatePresetIsolation() {
    if (preset.isNeutral) {
      // Neutral default / NGO must have ZERO religious symbols or greetings
      if (headingSymbol != null && headingSymbol!.isNotEmpty) return false;
      if (greetingText != null && greetingText!.isNotEmpty) return false;
    }

    if (preset.id == 'mosque_zakat') {
      // Mosque preset MUST NOT contain Hindu/Ganesh/Christian/Buddhist symbols
      if (headingSymbol != null &&
          (headingSymbol!.contains('गणेश') ||
              headingSymbol!.contains('ॐ') ||
              headingSymbol!.contains('GLORY') ||
              headingSymbol!.contains('बुद्धं'))) {
        return false;
      }
    }

    if (preset.id == 'church_donation') {
      // Church preset MUST NOT contain Hindu/Islamic/Buddhist symbols
      if (headingSymbol != null &&
          (headingSymbol!.contains('गणेश') ||
              headingSymbol!.contains('ॐ') ||
              headingSymbol!.contains('الرَّحْمٰنِ') ||
              headingSymbol!.contains('बुद्धं'))) {
        return false;
      }
    }

    if (preset.id == 'buddha_vihar') {
      // Buddha Vihar preset MUST NOT contain Hindu/Islamic/Christian/Sikh symbols
      if (headingSymbol != null &&
          (headingSymbol!.contains('गणेश') ||
              headingSymbol!.contains('ॐ') ||
              headingSymbol!.contains('الرَّحْمٰنِ') ||
              headingSymbol!.contains('GLORY') ||
              headingSymbol!.contains('वाहेगुरु'))) {
        return false;
      }
    }

    return true;
  }
}

/// Core Universal Receipt Rendering Engine.
class UniversalReceiptEngine {
  /// Resolves exact render parameters starting from a clean, unpolluted state.
  static UniversalReceiptRenderParams resolveRenderParams({
    required ReceiptModel receipt,
    required OrganizationModel organization,
    required TemplateModel template,
    String languageCode = 'mr',
    Map<String, String>? customTranslations,
  }) {
    // 1. Resolve preset from template.type
    final preset = ReceiptPresetCatalog.getById(template.type);

    // 2. Parse colors safely from preset & template
    final bgColor = _parseColor(template.bgColor, preset.backgroundColor);
    final borderColor = _parseColor(template.borderColor, preset.borderColor);
    final fontColor = _parseColor(template.fontColor, preset.fontColor);

    // 3. Fallback translation map for localized system labels
    final Map<String, String> labels = DefaultPavtiBookLabels.getLabels(languageCode);

    if (template.customTranslations != null) {
      labels.addAll(template.customTranslations!);
    }
    if (customTranslations != null) {
      labels.addAll(customTranslations);
    }

    final primaryColor = (template.primaryColor != null && template.primaryColor!.isNotEmpty)
        ? _parseColor(template.primaryColor!, preset.primaryColor)
        : preset.primaryColor;
    final secondaryColor = (template.secondaryColor != null && template.secondaryColor!.isNotEmpty)
        ? _parseColor(template.secondaryColor!, preset.secondaryColor)
        : preset.secondaryColor;
    final accentColor = (template.accentColor != null && template.accentColor!.isNotEmpty)
        ? _parseColor(template.accentColor!, preset.accentColor)
        : preset.accentColor;

    final renderParams = UniversalReceiptRenderParams(
      receipt: receipt,
      organization: organization,
      template: template,
      preset: preset,
      languageCode: languageCode,
      localizedLabels: labels,
      primaryColor: primaryColor,
      secondaryColor: secondaryColor,
      accentColor: accentColor,
      backgroundColor: bgColor,
      borderColor: borderColor,
      fontColor: fontColor,
      bannerColor: preset.bannerColor,
      headerTitleColor: preset.headerTitleColor,
      headingSymbol: preset.isNeutral ? null : preset.headingSymbol,
      greetingText: _resolvePresetGreeting(preset, languageCode),
      footerQuoteText: _resolvePresetFooterQuote(preset, languageCode),
    );

    assert(renderParams.validatePresetIsolation(),
        'CRITICAL: Preset Isolation Validation Failed for ${preset.id}');

    return renderParams;
  }

  static String? _resolvePresetGreeting(
      ReceiptTemplatePreset preset, String lang) {
    if (preset.isNeutral) return null;

    if (preset.id == 'ganesh_mandal') {
      return lang == 'mr'
          ? 'आपल्या देणगीबद्दल मनःपूर्वक धन्यवाद!'
          : lang == 'hi'
              ? 'आपके दान के लिए सहृदय धन्यवाद!'
              : 'Heartfelt thanks for your generous contribution!';
    }
    if (preset.id == 'mosque_zakat') {
      return lang == 'mr'
          ? 'अल्लाह आपणास नेकीचे फळ देवो!'
          : lang == 'hi'
              ? 'अल्लाह आपको नेकी का अजर दे!'
              : 'May Allah reward your noble donation!';
    }
    if (preset.id == 'church_donation') {
      return lang == 'mr'
          ? 'देव आपले कल्याण करो!'
          : lang == 'hi'
              ? 'ईश्वर आप पर अपनी कृपा बनाए रखे!'
              : 'May God Bless You Abundantly!';
    }
    if (preset.id == 'buddha_vihar') {
      return lang == 'mr'
          ? 'आपल्या दानाने धर्म कार्यास मदत होते.'
          : lang == 'hi'
              ? 'आपके दान से धर्म कार्य संपन्न होता है.'
              : 'Your contribution supports noble causes.';
    }
    if (preset.id == 'gurudwara_seva') {
      return lang == 'mr'
          ? 'वाहेगुरु जी का खालसा, वाहेगुरु जी की फतेह!'
          : lang == 'hi'
              ? 'वाहेगुरु जी का खालसा, वाहेगुरु जी की फतेह!'
              : 'Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh!';
    }
    if (preset.id == 'jain_mandir') {
      return lang == 'mr'
          ? 'मिच्छाभी दुक्कडम्!'
          : lang == 'hi'
              ? 'मिच्छामि दुक्कडम्!'
              : 'Micchami Dukkadam!';
    }
    if (preset.id == 'ambedkar_jayanti') {
      return lang == 'mr'
          ? 'शिक्षित व्हा, संघटित व्हा, संघर्ष करा!'
          : lang == 'hi'
              ? 'शिक्षित बनो, संगठित रहो, संघर्ष करो!'
              : 'Educate, Agitate, Organize!';
    }
    return null;
  }

  static String? _resolvePresetFooterQuote(
      ReceiptTemplatePreset preset, String lang) {
    if (preset.isNeutral) return null;
    return _resolvePresetGreeting(preset, lang);
  }

  static Color _parseColor(String hex, Color fallback) {
    try {
      final buffer = StringBuffer();
      if (hex.length == 6 || hex.length == 7) buffer.write('ff');
      buffer.write(hex.replaceFirst('#', ''));
      return Color(int.parse(buffer.toString(), radix: 16));
    } catch (_) {
      return fallback;
    }
  }
}

/// Single source of truth for DEFAULT_PAVTIBOOK localized system labels across Marathi, Hindi, and English.
class DefaultPavtiBookLabels {
  static Map<String, String> getLabels(String lang) {
    final code = (lang == 'hi' || lang == 'en') ? lang : 'mr';

    if (code == 'hi') {
      return {
        'greeting': '॥ श्री गणेशाय नमः ॥',
        'header_subtitle': 'धर्म / संस्था / मंडल / NGO / ट्रस्ट',
        'donor_details': 'दाता विवरण',
        'donor_name_label': '👤 नाम :',
        'donor_address_label': '🏠 पता :',
        'donor_mobile_label': '📞 मोबाइल :',
        'donor_email_label': '✉️ ईमेल :',
        'donor_id_label': '🪪 दानदाता आईडी :',
        'donor_autofill_title': 'दानदाता विवरण',
        'donor_autofill_sub': 'स्वचालित रूप से भरा जाएगा',
        'donor_autonum_title': 'स्वचालित क्रमांक',
        'donor_autonum_sub': 'दिनांक और समय आधारित',
        'donation_details': 'दान विवरण',
        'table_sr_no': 'क्र.सं.',
        'table_details': 'विवरण',
        'table_purpose_dept': 'उद्देश्य / विभाग',
        'table_amount': 'राशि (₹)',
        'table_default_purpose': 'सामान्य दान',
        'table_default_dept': 'सामान्य कार्य',
        'edit_details_pill': 'विवरण संपादित करें  •  एकाधिक आइटम जोड़ सकते हैं',
        'subtotal': 'उप-योग :',
        'discount': 'छूट :',
        'total_amount': 'कुल राशि :',
        'amount_in_words_label': 'राशि शब्दों में :',
        'payment_method_title': 'भुगतान पद्धति',
        'pay_cash': 'नकद',
        'pay_upi': 'UPI',
        'pay_gpay': 'Google Pay',
        'pay_phonepe': 'PhonePe',
        'pay_bank': 'बैंक ट्रांसफर',
        'pay_cheque': 'चेक',
        'pay_other': 'अन्य',
        'notes_title': 'टिप्पणी / नोट',
        'notes_write_opt': 'नोट लिखें (वैकल्पिक)',
        'notes_thanks_terms': 'धन्यवाद संदेश / शर्तें / टिप्पणियाँ',
        'sig_president': 'President / अध्यक्ष',
        'sig_treasurer': 'Treasurer / कोषाध्यक्ष',
        'sig_secretary': 'Secretary / सचिव',
        'signature_text': 'हस्ताक्षर',
        'official_stamp': 'अधिकृत मुहर',
        'footer_thankyou': 'आपके अमूल्य दान के लिए हार्दिक धन्यवाद!',
        'receipt_no': 'रसीद क्रमांक',
        'date': 'दिनांक',
        'date_label': 'दिनांक :',
        'time': 'समय',
        'time_label': 'समय :',
        'contact_details': 'संपर्क विवरण',
        'receipt_features_title': 'रसीद विशेषताएँ',
        'feat_receipt_no': 'रसीद क्रमांक',
        'feat_date_time': 'दिनांक और समय',
        'feat_donor_info': 'दानदाता विवरण',
        'feat_mobile_no': 'मोबाइल नंबर',
        'feat_email': 'ईमेल',
        'feat_donation_details': 'दान विवरण',
        'feat_amount_words': 'राशि शब्दों में',
        'feat_payment_method': 'भुगतान पद्धति',
        'feat_qr_code': 'QR कोड',
        'feat_signatures': 'हस्ताक्षर',
        'digital_receipt_title': 'यह रसीद डिजिटल है',
        'digital_receipt_sub': 'QR कोड स्कैन करके रसीद का सत्यापन करें।',
        // Backward compatibility keys
        'receipt_title': 'दान रसीद',
        'name': 'नाम',
        'address': 'पता',
        'mobile': 'मोबाइल',
        'purpose': 'उद्देश्य',
        'payment_mode': 'भुगतान का माध्यम',
        'amount': 'राशि (₹)',
        'amount_in_words': 'राशि शब्दों में',
        'signature': 'हस्ताक्षर',
        'verification': 'सत्यापन',
      };
    } else if (code == 'en') {
      return {
        'greeting': '॥ श्री गणेशाय नमः ॥',
        'header_subtitle': 'Religion / Organization / Mandal / NGO / Trust',
        'donor_details': 'Donor Details',
        'donor_name_label': '👤 Name :',
        'donor_address_label': '🏠 Address :',
        'donor_mobile_label': '📞 Mobile :',
        'donor_email_label': '✉️ Email :',
        'donor_id_label': '🪪 Donor ID :',
        'donor_autofill_title': 'Donor Details',
        'donor_autofill_sub': 'Automatically filled',
        'donor_autonum_title': 'Automatic Number',
        'donor_autonum_sub': 'Date and Time Based',
        'donation_details': 'Donation Details',
        'table_sr_no': 'Sr. No.',
        'table_details': 'Details',
        'table_purpose_dept': 'Purpose / Department',
        'table_amount': 'Amount (₹)',
        'table_default_purpose': 'General Donation',
        'table_default_dept': 'General Purpose',
        'edit_details_pill': 'Edit Details  •  You can add multiple items',
        'subtotal': 'Subtotal :',
        'discount': 'Discount :',
        'total_amount': 'Total Amount :',
        'amount_in_words_label': 'Amount in Words :',
        'payment_method_title': 'Payment Method',
        'pay_cash': 'Cash',
        'pay_upi': 'UPI',
        'pay_gpay': 'Google Pay',
        'pay_phonepe': 'PhonePe',
        'pay_bank': 'Bank Transfer',
        'pay_cheque': 'Cheque',
        'pay_other': 'Etc.',
        'notes_title': 'Notes / Message',
        'notes_write_opt': 'Write a note (optional)',
        'notes_thanks_terms': 'Thank you message / Terms / Notes',
        'sig_president': 'President',
        'sig_treasurer': 'Treasurer',
        'sig_secretary': 'Secretary',
        'signature_text': 'Signature',
        'official_stamp': 'Official Stamp',
        'footer_thankyou': 'Thank you sincerely for your valuable donation!',
        'receipt_no': 'Receipt No.',
        'date': 'Date',
        'date_label': 'Date :',
        'time': 'Time',
        'time_label': 'Time :',
        'contact_details': 'Contact Details',
        'receipt_features_title': 'Receipt Features',
        'feat_receipt_no': 'Receipt Number',
        'feat_date_time': 'Date and Time',
        'feat_donor_info': 'Donor Details',
        'feat_mobile_no': 'Mobile Number',
        'feat_email': 'Email',
        'feat_donation_details': 'Donation Details',
        'feat_amount_words': 'Amount in Words',
        'feat_payment_method': 'Payment Method',
        'feat_qr_code': 'QR Code',
        'feat_signatures': 'Signatures',
        'digital_receipt_title': 'This Receipt is Digital',
        'digital_receipt_sub': 'Scan the QR Code to verify the receipt.',
        // Backward compatibility keys
        'receipt_title': 'Donation Receipt',
        'name': 'Name',
        'address': 'Address',
        'mobile': 'Mobile',
        'purpose': 'Purpose',
        'payment_mode': 'Payment Mode',
        'amount': 'Amount (₹)',
        'amount_in_words': 'Amount in Words',
        'signature': 'Signature',
        'verification': 'Verification',
      };
    } else {
      // Marathi ('mr')
      return {
        'greeting': '॥ श्री गणेशाय नमः ॥',
        'header_subtitle': 'धर्म / संस्था / मंडळ / NGO / ट्रस्ट',
        'donor_details': 'देणगीदार माहिती',
        'donor_name_label': '👤 नाव :',
        'donor_address_label': '🏠 पत्ता :',
        'donor_mobile_label': '📞 मोबाईल :',
        'donor_email_label': '✉️ ईमेल :',
        'donor_id_label': '🪪 देणगीदार आयडी :',
        'donor_autofill_title': 'देणगीदार माहिती',
        'donor_autofill_sub': 'स्वयंचलित भरली जाईल',
        'donor_autonum_title': 'स्वयंचलित क्रमांक',
        'donor_autonum_sub': 'तारीख आणि वेळ आधारित',
        'donation_details': 'देणगी तपशील',
        'table_sr_no': 'अ.क्र.',
        'table_details': 'तपशील',
        'table_purpose_dept': 'उद्देश / विभाग',
        'table_amount': 'रक्कम (₹)',
        'table_default_purpose': 'सामान्य देणगी',
        'table_default_dept': 'सामान्य कार्य',
        'edit_details_pill': 'तपशील संपादित करा  •  अनेक आयटम जोडू शकता',
        'subtotal': 'उपएकूण :',
        'discount': 'सूट :',
        'total_amount': 'एकूण रक्कम :',
        'amount_in_words_label': 'रक्कम शब्दात :',
        'payment_method_title': 'पेमेंट पद्धत',
        'pay_cash': 'रोख',
        'pay_upi': 'UPI',
        'pay_gpay': 'Google Pay',
        'pay_phonepe': 'PhonePe',
        'pay_bank': 'बँक हस्तांतरण',
        'pay_cheque': 'धनादेश',
        'pay_other': 'इतर',
        'notes_title': 'टीप / नोंद',
        'notes_write_opt': 'टीप लिहा (ऐच्छिक)',
        'notes_thanks_terms': 'धन्यवाद संदेश / अटी / नोंदी',
        'sig_president': 'President / अध्यक्ष',
        'sig_treasurer': 'Treasurer / कोषाध्यक्ष',
        'sig_secretary': 'Secretary / सचिव',
        'signature_text': 'स्वाक्षरी',
        'official_stamp': 'अधिकृत शिक्का',
        'footer_thankyou': 'आपल्या अमूल्य देणगीबद्दल मनःपूर्वक धन्यवाद!',
        'receipt_no': 'पावती क्र.',
        'date': 'दिनांक',
        'date_label': 'दिनांक :',
        'time': 'वेळ',
        'time_label': 'वेळ :',
        'contact_details': 'संपर्क तपशील',
        'receipt_features_title': 'पावती वैशिष्ट्ये',
        'feat_receipt_no': 'पावती क्रमांक',
        'feat_date_time': 'दिनांक आणि वेळ',
        'feat_donor_info': 'देणगीदार माहिती',
        'feat_mobile_no': 'मोबाईल नंबर',
        'feat_email': 'ईमेल',
        'feat_donation_details': 'देणगी तपशील',
        'feat_amount_words': 'रक्कम शब्दात',
        'feat_payment_method': 'पेमेंट पद्धत',
        'feat_qr_code': 'QR कोड',
        'feat_signatures': 'स्वाक्षऱ्या',
        'digital_receipt_title': 'ही पावती डिजिटल आहे',
        'digital_receipt_sub': 'QR कोड स्कॅन करून पावतीची पडताळणी करा.',
        // Backward compatibility keys
        'receipt_title': 'देणगी पावती',
        'name': 'नाव',
        'address': 'पत्ता',
        'mobile': 'मोबाईल',
        'purpose': 'उद्देश',
        'payment_mode': 'पेमेंट पद्धत',
        'amount': 'रक्कम (₹)',
        'amount_in_words': 'रकमेचे अक्षरी मूल्य',
        'signature': 'स्वाक्षरी',
        'verification': 'पडताळणी',
      };
    }
  }
}
