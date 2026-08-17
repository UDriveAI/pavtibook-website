// Model classes for PavtiBook App
import 'package:cloud_firestore/cloud_firestore.dart';
import '../config/subscription_config.dart';
export 'default_pavtibook_geometry.dart';

class UserModel {
  final String id;
  final String? organizationId;
  final String? lastSelectedOrgId;
  final String name;
  final String email;
  final String mobile;
  final String role;
  final bool isActive;
  final String? profilePhotoUrl;
  final String? profilePhotoUrl256;
  final String? profilePhotoUrl128;
  final int? profilePhotoVersion;
  final bool isSoftwareOwner;

  UserModel({
    required this.id,
    this.organizationId,
    this.lastSelectedOrgId,
    required this.name,
    required this.email,
    required this.mobile,
    required this.role,
    required this.isActive,
    this.profilePhotoUrl,
    this.profilePhotoUrl256,
    this.profilePhotoUrl128,
    this.profilePhotoVersion,
    this.isSoftwareOwner = false,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      organizationId:
          json['organization_id'] ?? json['organizationId'] ?? json['org_id'],
      lastSelectedOrgId: json['lastSelectedOrgId'] ?? json['organizationId'] ?? json['organization_id'],
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      mobile: json['mobile'] ?? '',
      role: json['role'] ?? '',
      isActive: json['is_active'] ?? json['isActive'] ?? true,
      profilePhotoUrl: json['profilePhotoUrl'] ?? json['profile_photo_url'],
      profilePhotoUrl256: json['profilePhotoUrl256'] ?? json['profile_photo_url_256'],
      profilePhotoUrl128: json['profilePhotoUrl128'] ?? json['profile_photo_url_128'],
      profilePhotoVersion: json['profilePhotoVersion'] ?? json['profile_photo_version'],
      isSoftwareOwner: json['isSoftwareOwner'] ?? json['is_software_owner'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'organizationId': organizationId,
      'name': name,
      'email': email,
      'mobile': mobile,
      'role': role,
      'isActive': isActive,
      'profilePhotoUrl': profilePhotoUrl,
      'profilePhotoUrl256': profilePhotoUrl256,
      'profilePhotoUrl128': profilePhotoUrl128,
      'profilePhotoVersion': profilePhotoVersion,
      'isSoftwareOwner': isSoftwareOwner,
    };
  }
}

class OrganizationModel {
  final String id;
  final String name;
  final String type;
  final String? contactPerson;
  final String? mobile;
  final String? email;
  final String? address;
  final String? city;
  final String? state;
  final String? pincode;
  final String upiId;
  final String? registrationNumber;
  final String? logoUrl;
  final bool isVerified;
  final String subscriptionPlan;

  // Customization fields
  final String? leftSideImageUrl;
  final String? rightSideImageUrl;
  final String? customStampUrl;
  final String? footerText;

  // Signatures fields & scales
  final String? presidentSignatureUrl;
  final String? treasurerSignatureUrl;
  final String? secretarySignatureUrl;
  final String? agentSignatureUrl;
  final double presidentSignatureScale;
  final double treasurerSignatureScale;
  final double secretarySignatureScale;

  // Office bearer names & designations
  final String? presidentName;
  final String? treasurerName;
  final String? secretaryName;
  final String? memberName;
  final String? presidentDesignation;
  final String? treasurerDesignation;
  final String? secretaryDesignation;
  final String? memberDesignation;

  // Payment configuration fields
  final String? upiQrImageUrl;
  final String? upiMerchantName;
  final String? receiptThemeId;

  // WhatsApp notification settings
  final bool whatsappAutoSend;
  final bool pdfAutoSend;
  final bool pendingReminder;

  // Ownership transfer & organization lifecycle fields
  final String? ownerUid;
  final String? ownerName;
  final String? ownerEmail;
  final String? ownerMobile;
  final String? activeTransferId;
  final bool isArchived;
  final String? archivedAt;
  final String? archivedBy;
  final String? archiveReason;
  final int organizationVersion;

  OrganizationModel({
    required this.id,
    required this.name,
    required this.type,
    this.contactPerson,
    this.mobile,
    this.email,
    this.address,
    this.city,
    this.state,
    this.pincode,
    required this.upiId,
    this.registrationNumber,
    this.logoUrl,
    required this.isVerified,
    required this.subscriptionPlan,
    this.leftSideImageUrl,
    this.rightSideImageUrl,
    this.customStampUrl,
    this.footerText,
    this.presidentSignatureUrl,
    this.treasurerSignatureUrl,
    this.secretarySignatureUrl,
    this.agentSignatureUrl,
    this.presidentSignatureScale = 1.0,
    this.treasurerSignatureScale = 1.0,
    this.secretarySignatureScale = 1.0,
    this.presidentName,
    this.treasurerName,
    this.secretaryName,
    this.memberName,
    this.presidentDesignation,
    this.treasurerDesignation,
    this.secretaryDesignation,
    this.memberDesignation,
    this.upiQrImageUrl,
    this.upiMerchantName,
    this.receiptThemeId,
    this.whatsappAutoSend = true,
    this.pdfAutoSend = false,
    this.pendingReminder = true,
    this.ownerUid,
    this.ownerName,
    this.ownerEmail,
    this.ownerMobile,
    this.activeTransferId,
    this.isArchived = false,
    this.archivedAt,
    this.archivedBy,
    this.archiveReason,
    this.organizationVersion = 1,
  });

  factory OrganizationModel.fromJson(Map<String, dynamic> json) {
    return OrganizationModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      type: json['type'] ?? '',
      contactPerson: json['contact_person'] ?? json['contactPerson'],
      mobile: json['mobile'],
      email: json['email'],
      address: json['address'],
      city: json['city'],
      state: json['state'],
      pincode: json['pincode'],
      upiId: json['upi_id'] ?? json['upiId'] ?? '',
      registrationNumber:
          json['registration_number'] ?? json['registrationNumber'],
      logoUrl: json['logo_url'] ?? json['logoUrl'],
      isVerified: json['is_verified'] ?? json['isVerified'] ?? false,
      subscriptionPlan:
          json['subscription_plan'] ?? json['subscriptionPlan'] ?? 'free',
      leftSideImageUrl: json['left_side_image_url'] ?? json['leftSideImageUrl'],
      rightSideImageUrl:
          json['right_side_image_url'] ?? json['rightSideImageUrl'],
      customStampUrl: json['custom_stamp_url'] ?? json['customStampUrl'],
      footerText: json['footer_text'] ?? json['footerText'],
      presidentSignatureUrl:
          json['president_signature_url'] ?? json['presidentSignatureUrl'],
      treasurerSignatureUrl:
          json['treasurer_signature_url'] ?? json['treasurerSignatureUrl'],
      secretarySignatureUrl:
          json['secretary_signature_url'] ?? json['secretarySignatureUrl'],
      agentSignatureUrl:
          json['agent_signature_url'] ?? json['agentSignatureUrl'],
      presidentSignatureScale: (json['president_signature_scale'] is num)
          ? (json['president_signature_scale'] as num).toDouble()
          : (json['presidentSignatureScale'] is num)
              ? (json['presidentSignatureScale'] as num).toDouble()
              : 1.0,
      treasurerSignatureScale: (json['treasurer_signature_scale'] is num)
          ? (json['treasurer_signature_scale'] as num).toDouble()
          : (json['treasurerSignatureScale'] is num)
              ? (json['treasurerSignatureScale'] as num).toDouble()
              : 1.0,
      secretarySignatureScale: (json['secretary_signature_scale'] is num)
          ? (json['secretary_signature_scale'] as num).toDouble()
          : (json['secretarySignatureScale'] is num)
              ? (json['secretarySignatureScale'] as num).toDouble()
              : 1.0,
      presidentName: json['president_name'] ?? json['presidentName'],
      treasurerName: json['treasurer_name'] ?? json['treasurerName'],
      secretaryName: json['secretary_name'] ?? json['secretaryName'],
      memberName: json['member_name'] ??
          json['memberName'] ??
          json['agent_name'] ??
          json['agentName'],
      presidentDesignation:
          json['president_designation'] ?? json['presidentDesignation'],
      treasurerDesignation:
          json['treasurer_designation'] ?? json['treasurerDesignation'],
      secretaryDesignation:
          json['secretary_designation'] ?? json['secretaryDesignation'],
      memberDesignation: json['member_designation'] ??
          json['memberDesignation'] ??
          json['agent_designation'] ??
          json['agentDesignation'],
      upiQrImageUrl: json['upi_qr_image_url'] ?? json['upiQrImageUrl'],
      upiMerchantName: json['upi_merchant_name'] ?? json['upiMerchantName'],
      receiptThemeId: json['receipt_theme_id'] ?? json['receiptThemeId'],
      whatsappAutoSend:
          json['whatsappAutoSend'] ?? json['whatsapp_auto_send'] ?? true,
      pdfAutoSend: json['pdfAutoSend'] ?? json['pdf_auto_send'] ?? false,
      pendingReminder:
          json['pendingReminder'] ?? json['pending_reminder'] ?? true,
      ownerUid: json['ownerUid'] ?? json['owner_uid'],
      ownerName: json['ownerName'] ?? json['owner_name'],
      ownerEmail: json['ownerEmail'] ?? json['owner_email'],
      ownerMobile: json['ownerMobile'] ?? json['owner_mobile'],
      activeTransferId: json['activeTransferId'] ?? json['active_transfer_id'],
      isArchived: json['isArchived'] ?? json['is_archived'] ?? false,
      archivedAt: json['archivedAt'] ?? json['archived_at'],
      archivedBy: json['archivedBy'] ?? json['archived_by'],
      archiveReason: json['archiveReason'] ?? json['archive_reason'],
      organizationVersion: json['organizationVersion'] ?? json['organization_version'] ?? 1,
    );
  }
}

class TemplateModel {
  final String id;
  final String organizationId;
  final String name;
  final String type; // traditional, temple, ganesh_mandal, trust, modern
  final String bgColor;
  final String borderStyle;
  final String borderColor;
  final String fontFamily;
  final String fontColor;
  final bool logoVisible;
  final String? godImageUrl;
  final String godImagePosition;
  final String? watermarkUrl;
  final double watermarkOpacity;
  final String? headerTextEn;
  final String? headerTextLocal;
  final String? footerTextEn;
  final String? footerTextLocal;
  final String signatureLabel;
  final String? signatureUrl;
  final String? stampUrl;
  final bool isDefault;

  // Complete Color Override Fields
  final String? primaryColor;
  final String? secondaryColor;
  final String? accentColor;

  // Complete Typography Parameters
  final double headingSize;
  final double bodySize;
  final double amountSize;
  final String fontWeight;

  // Additional Subtitle & Note Text
  final String? customSubtitleEn;
  final String? customSubtitleLocal;
  final String? customNote;

  // Complete 16 Field Visibility Toggles
  final bool showDonorName;
  final bool showDonorAddress;
  final bool showDonorMobile;
  final bool showDonorEmail;
  final bool showPurpose;
  final bool showPaymentMode;
  final bool showAmount;
  final bool showAmountInWords;
  final bool showReceiptNumber;
  final bool showDate;
  final bool showTime;
  final bool showQrCode;
  final bool showSignature;
  final bool showStamp;
  final bool showNotes;
  final bool showFooter;

  // Custom Translations Map for section labels
  final Map<String, String>? customTranslations;

  // Controlled Branding & Typography Sizing
  final double logoScale;
  final double stampScale;
  final String? presidentSignatureUrl;
  final String? treasurerSignatureUrl;
  final String? secretarySignatureUrl;
  final double presidentSignatureScale;
  final double treasurerSignatureScale;
  final double secretarySignatureScale;
  final Map<String, double>? customTextSizes;

  TemplateModel({
    required this.id,
    required this.organizationId,
    required this.name,
    required this.type,
    required this.bgColor,
    required this.borderStyle,
    required this.borderColor,
    required this.fontFamily,
    required this.fontColor,
    required this.logoVisible,
    this.primaryColor,
    this.secondaryColor,
    this.accentColor,
    this.headingSize = 16.0,
    this.bodySize = 9.5,
    this.amountSize = 18.0,
    this.fontWeight = 'bold',
    this.customSubtitleEn,
    this.customSubtitleLocal,
    this.customNote,
    this.godImageUrl,
    required this.godImagePosition,
    this.watermarkUrl,
    required this.watermarkOpacity,
    this.headerTextEn,
    this.headerTextLocal,
    this.footerTextEn,
    this.footerTextLocal,
    required this.signatureLabel,
    this.signatureUrl,
    this.presidentSignatureUrl,
    this.treasurerSignatureUrl,
    this.secretarySignatureUrl,
    this.presidentSignatureScale = 1.0,
    this.treasurerSignatureScale = 1.0,
    this.secretarySignatureScale = 1.0,
    this.stampUrl,
    required this.isDefault,
    this.customTranslations,
    this.showDonorName = true,
    this.showDonorAddress = true,
    this.showDonorMobile = true,
    this.showDonorEmail = true,
    this.showPurpose = true,
    this.showPaymentMode = true,
    this.showAmount = true,
    this.showAmountInWords = true,
    this.showReceiptNumber = true,
    this.showDate = true,
    this.showTime = true,
    this.showQrCode = true,
    this.showSignature = true,
    this.showStamp = true,
    this.showNotes = true,
    this.showFooter = true,
    this.logoScale = 1.0,
    this.stampScale = 1.0,
    this.customTextSizes,
  });

  factory TemplateModel.fromJson(Map<String, dynamic> json) {
    Map<String, String>? parsedTranslations;
    if (json['custom_translations'] is Map) {
      parsedTranslations = Map<String, String>.from(
          (json['custom_translations'] as Map).map((k, v) => MapEntry(k.toString(), v.toString())));
    } else if (json['customTranslations'] is Map) {
      parsedTranslations = Map<String, String>.from(
          (json['customTranslations'] as Map).map((k, v) => MapEntry(k.toString(), v.toString())));
    }

    Map<String, double>? parsedTextSizes;
    if (json['custom_text_sizes'] is Map) {
      parsedTextSizes = (json['custom_text_sizes'] as Map).map(
        (k, v) => MapEntry(k.toString(), (v is num) ? v.toDouble() : 0.0),
      );
    } else if (json['customTextSizes'] is Map) {
      parsedTextSizes = (json['customTextSizes'] as Map).map(
        (k, v) => MapEntry(k.toString(), (v is num) ? v.toDouble() : 0.0),
      );
    }

    return TemplateModel(
      id: json['id'] ?? '',
      organizationId: json['organization_id'] ?? json['organizationId'] ?? '',
      name: json['name'] ?? '',
      type: json['type'] ?? 'traditional',
      bgColor: json['bg_color'] ?? json['bgColor'] ?? '#FFFDD0',
      borderStyle: json['border_style'] ?? json['borderStyle'] ?? 'double',
      borderColor: json['border_color'] ?? json['borderColor'] ?? '#E65100',
      fontFamily: json['font_family'] ?? json['fontFamily'] ?? 'Poppins',
      fontColor: json['font_color'] ?? json['fontColor'] ?? '#3E2723',
      logoVisible: json['logo_visible'] ?? json['logoVisible'] ?? true,
      primaryColor: json['primary_color'] ?? json['primaryColor'],
      secondaryColor: json['secondary_color'] ?? json['secondaryColor'],
      accentColor: json['accent_color'] ?? json['accentColor'],
      headingSize: (json['heading_size'] is num) ? (json['heading_size'] as num).toDouble() : 16.0,
      bodySize: (json['body_size'] is num) ? (json['body_size'] as num).toDouble() : 9.5,
      amountSize: (json['amount_size'] is num) ? (json['amount_size'] as num).toDouble() : 18.0,
      fontWeight: json['font_weight'] ?? json['fontWeight'] ?? 'bold',
      customSubtitleEn: json['custom_subtitle_en'] ?? json['customSubtitleEn'],
      customSubtitleLocal: json['custom_subtitle_local'] ?? json['customSubtitleLocal'],
      customNote: json['custom_note'] ?? json['customNote'],
      godImageUrl: json['god_image_url'] ?? json['godImageUrl'],
      godImagePosition:
          json['god_image_position'] ?? json['godImagePosition'] ?? 'left',
      watermarkUrl: json['watermark_url'] ?? json['watermarkUrl'],
      watermarkOpacity: (json['watermark_opacity'] is num)
          ? (json['watermark_opacity'] as num).toDouble()
          : (json['watermarkOpacity'] is num)
              ? (json['watermarkOpacity'] as num).toDouble()
              : 0.10,
      headerTextEn: json['header_text_en'] ?? json['headerTextEn'],
      headerTextLocal: json['header_text_local'] ?? json['headerTextLocal'],
      footerTextEn: json['footer_text_en'] ?? json['footerTextEn'],
      footerTextLocal: json['footer_text_local'] ?? json['footerTextLocal'],
      signatureLabel: json['signature_label'] ??
          json['signatureLabel'] ??
          'President / अध्यक्ष',
      signatureUrl: json['signature_url'] ?? json['signatureUrl'],
      presidentSignatureUrl: json['president_signature_url'] ?? json['presidentSignatureUrl'],
      treasurerSignatureUrl: json['treasurer_signature_url'] ?? json['treasurerSignatureUrl'],
      secretarySignatureUrl: json['secretary_signature_url'] ?? json['secretarySignatureUrl'],
      presidentSignatureScale: (json['president_signature_scale'] is num)
          ? (json['president_signature_scale'] as num).toDouble()
          : (json['presidentSignatureScale'] is num)
              ? (json['presidentSignatureScale'] as num).toDouble()
              : 1.0,
      treasurerSignatureScale: (json['treasurer_signature_scale'] is num)
          ? (json['treasurer_signature_scale'] as num).toDouble()
          : (json['treasurerSignatureScale'] is num)
              ? (json['treasurerSignatureScale'] as num).toDouble()
              : 1.0,
      secretarySignatureScale: (json['secretary_signature_scale'] is num)
          ? (json['secretary_signature_scale'] as num).toDouble()
          : (json['secretarySignatureScale'] is num)
              ? (json['secretarySignatureScale'] as num).toDouble()
              : 1.0,
      stampUrl: json['stamp_url'] ?? json['stampUrl'],
      isDefault: json['is_default'] ?? json['isDefault'] ?? false,
      customTranslations: parsedTranslations,
      logoScale: (json['logo_scale'] is num)
          ? (json['logo_scale'] as num).toDouble()
          : (json['logoScale'] is num)
              ? (json['logoScale'] as num).toDouble()
              : 1.0,
      stampScale: (json['stamp_scale'] is num)
          ? (json['stamp_scale'] as num).toDouble()
          : (json['stampScale'] is num)
              ? (json['stampScale'] as num).toDouble()
              : 1.0,
      customTextSizes: parsedTextSizes,
      showDonorName: json['show_donor_name'] ?? json['showDonorName'] ?? true,
      showDonorAddress: json['show_donor_address'] ?? json['showDonorAddress'] ?? true,
      showDonorMobile: json['show_donor_mobile'] ?? json['showDonorMobile'] ?? true,
      showDonorEmail: json['show_donor_email'] ?? json['showDonorEmail'] ?? true,
      showPurpose: json['show_purpose'] ?? json['showPurpose'] ?? true,
      showPaymentMode: json['show_payment_mode'] ?? json['showPaymentMode'] ?? true,
      showAmount: json['show_amount'] ?? json['showAmount'] ?? true,
      showAmountInWords: json['show_amount_in_words'] ?? json['showAmountInWords'] ?? true,
      showReceiptNumber: json['show_receipt_number'] ?? json['showReceiptNumber'] ?? true,
      showDate: json['show_date'] ?? json['showDate'] ?? true,
      showTime: json['show_time'] ?? json['showTime'] ?? true,
      showQrCode: json['show_qr_code'] ?? json['showQrCode'] ?? true,
      showSignature: json['show_signature'] ?? json['showSignature'] ?? true,
      showStamp: json['show_stamp'] ?? json['showStamp'] ?? true,
      showNotes: json['show_notes'] ?? json['showNotes'] ?? true,
      showFooter: json['show_footer'] ?? json['showFooter'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'organization_id': organizationId,
      'name': name,
      'type': type,
      'bg_color': bgColor,
      'border_style': borderStyle,
      'border_color': borderColor,
      'font_family': fontFamily,
      'font_color': fontColor,
      'logo_visible': logoVisible,
      'primary_color': primaryColor,
      'secondary_color': secondaryColor,
      'accent_color': accentColor,
      'heading_size': headingSize,
      'body_size': bodySize,
      'amount_size': amountSize,
      'font_weight': fontWeight,
      'custom_subtitle_en': customSubtitleEn,
      'custom_subtitle_local': customSubtitleLocal,
      'custom_note': customNote,
      'god_image_url': godImageUrl,
      'god_image_position': godImagePosition,
      'watermark_url': watermarkUrl,
      'watermark_opacity': watermarkOpacity,
      'header_text_en': headerTextEn,
      'header_text_local': headerTextLocal,
      'footer_text_en': footerTextEn,
      'footer_text_local': footerTextLocal,
      'signature_label': signatureLabel,
      'signature_url': signatureUrl,
      'stamp_url': stampUrl,
      'is_default': isDefault,
      'custom_translations': customTranslations,
      'logo_scale': logoScale,
      'stamp_scale': stampScale,
      'custom_text_sizes': customTextSizes,
      'show_donor_name': showDonorName,
      'show_donor_address': showDonorAddress,
      'show_donor_mobile': showDonorMobile,
      'show_donor_email': showDonorEmail,
      'show_purpose': showPurpose,
      'show_payment_mode': showPaymentMode,
      'show_amount': showAmount,
      'show_amount_in_words': showAmountInWords,
      'show_receipt_number': showReceiptNumber,
      'show_date': showDate,
      'show_time': showTime,
      'show_qr_code': showQrCode,
      'show_signature': showSignature,
      'show_stamp': showStamp,
      'show_notes': showNotes,
      'show_footer': showFooter,
    };
  }
}

class DonorModel {
  final String id;
  final String name;
  final String mobile;
  final String? email;
  final String? address;
  final double totalDonated;
  final int donationCount;

  DonorModel({
    required this.id,
    required this.name,
    required this.mobile,
    this.email,
    this.address,
    required this.totalDonated,
    required this.donationCount,
  });

  factory DonorModel.fromJson(Map<String, dynamic> json) {
    return DonorModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      mobile: json['mobile'] ?? '',
      email: json['email'],
      address: json['address'],
      totalDonated: (json['total_donated'] is num)
          ? (json['total_donated'] as num).toDouble()
          : (json['totalDonated'] is num)
              ? (json['totalDonated'] as num).toDouble()
              : 0.0,
      donationCount: json['donation_count'] ?? json['donationCount'] ?? 0,
    );
  }
}

class ReceiptModel {
  final String id;
  final String organizationId;
  final String? templateId;
  final String donorId;
  final String? collectorId;
  final String receiptNumber;
  final double amount;
  final String purpose;
  final String paymentMode;
  final String paymentStatus;
  final String qrCodeValue;
  final String createdAt;
  final String? donorName;
  final String? donorMobile;
  final String? collectorName;
  final String? donorAddress;

  // Snapshotted customization fields
  final String? headerLogoUrl;
  final String? leftSideImageUrl;
  final String? rightSideImageUrl;
  final String? customStampUrl;
  final String? footerText;
  final String? signatureUrl;
  final String? collectorRole;
  final String? collectorDesignation;

  // Additional explicit snapshot fields
  final String? organizationName;
  final String? organizationLogoUrl;
  final String? leftImageUrl;
  final String? rightImageUrl;
  final String? stampUrl;
  final String? collectorSignatureUrl;

  // Audit trail fields for Edit Governance
  final String? editedAt;
  final String? editedBy;

  // Confirmation Audit fields
  final String? confirmedByUserId;
  final String? confirmedByName;
  final String? confirmedAt;

  // Reminder Attempt fields
  final String? lastReminderAttemptAt;
  final int? reminderAttemptCount;

  // Theme snapshot field
  final String? receiptThemeId;
  final String? collectorPhotoSnapshot;
  final String? collectorSignatureSnapshot;
  final String? receiptImageUrl;
  final int? receiptVersion;

  // Immutable audit fields — written once at creation, never editable
  final String? createdBy;       // UID of the user who created the receipt
  final String? createdByName;   // Display name of creator at time of creation
  final String? createdByRole;   // Role of creator at time of creation
  final String? createdByMobile; // Mobile of creator at time of creation
  final String? idempotencyKey;  // Client-generated key for deduplication

  ReceiptModel({
    required this.id,
    required this.organizationId,
    this.templateId,
    required this.donorId,
    this.collectorId,
    required this.receiptNumber,
    required this.amount,
    required this.purpose,
    required this.paymentMode,
    required this.paymentStatus,
    required this.qrCodeValue,
    required this.createdAt,
    this.donorName,
    this.donorMobile,
    this.collectorName,
    this.donorAddress,
    this.headerLogoUrl,
    this.leftSideImageUrl,
    this.rightSideImageUrl,
    this.customStampUrl,
    this.footerText,
    this.signatureUrl,
    this.collectorRole,
    this.collectorDesignation,
    this.organizationName,
    this.organizationLogoUrl,
    this.leftImageUrl,
    this.rightImageUrl,
    this.stampUrl,
    this.collectorSignatureUrl,
    this.editedAt,
    this.editedBy,
    this.confirmedByUserId,
    this.confirmedByName,
    this.confirmedAt,
    this.lastReminderAttemptAt,
    this.reminderAttemptCount,
    this.receiptThemeId,
    this.collectorPhotoSnapshot,
    this.collectorSignatureSnapshot,
    this.receiptImageUrl,
    this.receiptVersion,
    this.createdBy,
    this.createdByName,
    this.createdByRole,
    this.createdByMobile,
    this.idempotencyKey,
  });

  factory ReceiptModel.fromJson(Map<String, dynamic> json) {
    return ReceiptModel(
      id: json['id'] ?? '',
      organizationId: json['organization_id'] ?? json['organizationId'] ?? '',
      templateId: json['template_id'] ?? json['templateId'],
      donorId: json['donor_id'] ?? json['donorId'] ?? '',
      collectorId: json['collector_id'] ?? json['collectorId'],
      receiptNumber: json['receipt_number'] ?? json['receiptNumber'] ?? '',
      amount:
          (json['amount'] is num) ? (json['amount'] as num).toDouble() : 0.0,
      purpose: json['purpose'] ?? '',
      paymentMode: (json['payment_mode'] ?? json['paymentMode'] ?? '').toString().toLowerCase(),
      paymentStatus: (json['payment_status'] ?? json['paymentStatus'] ?? '').toString().toLowerCase(),
      qrCodeValue: json['qr_code_value'] ?? json['qrCodeValue'] ?? '',
      createdAt:
          _parseDateTimeString(json['created_at'] ?? json['createdAt']) ?? '',
      donorName: json['donor_name'] ?? json['donorName'],
      donorMobile: json['donor_mobile'] ?? json['donorMobile'],
      collectorName: json['collector_name'] ?? json['collectorName'],
      donorAddress: json['donor_address'] ?? json['donorAddress'],
      headerLogoUrl: json['header_logo_url'] ??
          json['headerLogoUrl'] ??
          json['organizationLogoUrl'] ??
          json['organization_logo_url'],
      leftSideImageUrl: json['left_side_image_url'] ??
          json['leftSideImageUrl'] ??
          json['leftImageUrl'] ??
          json['left_image_url'],
      rightSideImageUrl: json['right_side_image_url'] ??
          json['rightSideImageUrl'] ??
          json['rightImageUrl'] ??
          json['right_image_url'],
      customStampUrl: json['custom_stamp_url'] ??
          json['customStampUrl'] ??
          json['stampUrl'] ??
          json['stamp_url'],
      footerText: json['footer_text'] ?? json['footerText'],
      signatureUrl: json['signature_url'] ??
          json['signatureUrl'] ??
          json['collectorSignatureUrl'] ??
          json['collector_signature_url'],
      collectorRole: json['collector_role'] ?? json['collectorRole'],
      collectorDesignation:
          json['collectorDesignation'] ?? json['collector_designation'],
      organizationName: json['organizationName'] ?? json['organization_name'],
      organizationLogoUrl: json['organizationLogoUrl'] ??
          json['organization_logo_url'] ??
          json['header_logo_url'] ??
          json['headerLogoUrl'],
      leftImageUrl: json['leftImageUrl'] ??
          json['left_image_url'] ??
          json['left_side_image_url'] ??
          json['leftSideImageUrl'],
      rightImageUrl: json['rightImageUrl'] ??
          json['right_image_url'] ??
          json['right_side_image_url'] ??
          json['rightSideImageUrl'],
      stampUrl: json['stampUrl'] ??
          json['stamp_url'] ??
          json['custom_stamp_url'] ??
          json['customStampUrl'],
      collectorSignatureUrl: json['collectorSignatureUrl'] ??
          json['collector_signature_url'] ??
          json['signature_url'] ??
          json['signatureUrl'],
      editedAt: _parseDateTimeString(json['editedAt'] ?? json['edited_at']),
      editedBy: json['editedBy'] ?? json['edited_by'],
      confirmedByUserId:
          json['confirmedByUserId'] ?? json['confirmed_by_user_id'],
      confirmedByName: json['confirmedByName'] ?? json['confirmed_by_name'],
      confirmedAt:
          _parseDateTimeString(json['confirmedAt'] ?? json['confirmed_at']),
      lastReminderAttemptAt: _parseDateTimeString(
          json['lastReminderAttemptAt'] ?? json['last_reminder_attempt_at']),
      reminderAttemptCount:
          json['reminderAttemptCount'] ?? json['reminder_attempt_count'] ?? 0,
      receiptThemeId: json['receiptThemeId'] ?? json['receipt_theme_id'],
      collectorPhotoSnapshot: json['collectorPhotoSnapshot'] ?? json['collector_photo_snapshot'],
      collectorSignatureSnapshot: json['collectorSignatureSnapshot'] ?? json['collector_signature_snapshot'],
      receiptImageUrl: json['receiptImageUrl'] ?? json['receipt_image_url'],
      receiptVersion: json['receiptVersion'] ?? json['receipt_version'],
      createdBy: json['createdBy'] ?? json['created_by'],
      createdByName: json['createdByName'] ?? json['created_by_name'],
      createdByRole: json['createdByRole'] ?? json['created_by_role'],
      createdByMobile: json['createdByMobile'] ?? json['created_by_mobile'] ?? '',
      idempotencyKey: json['idempotencyKey'] ?? json['idempotency_key'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'organizationId': organizationId,
      'templateId': templateId,
      'donorId': donorId,
      'collectorId': collectorId,
      'receiptNumber': receiptNumber,
      'amount': amount,
      'purpose': purpose,
      'paymentMode': paymentMode,
      'paymentStatus': paymentStatus,
      'qrCodeValue': qrCodeValue,
      'createdAt': createdAt,
      'donorName': donorName,
      'donorMobile': donorMobile,
      'collectorName': collectorName,
      'donorAddress': donorAddress,
      'headerLogoUrl': headerLogoUrl,
      'leftSideImageUrl': leftSideImageUrl,
      'rightSideImageUrl': rightSideImageUrl,
      'customStampUrl': customStampUrl,
      'footerText': footerText,
      'signatureUrl': signatureUrl,
      'collectorRole': collectorRole,
      'collectorDesignation': collectorDesignation,
      'organizationName': organizationName,
      'organizationLogoUrl': organizationLogoUrl,
      'leftImageUrl': leftImageUrl,
      'rightImageUrl': rightImageUrl,
      'stampUrl': stampUrl,
      'collectorSignatureUrl': collectorSignatureUrl,
      'editedAt': editedAt,
      'editedBy': editedBy,
      'confirmedByUserId': confirmedByUserId,
      'confirmedByName': confirmedByName,
      'confirmedAt': confirmedAt,
      'lastReminderAttemptAt': lastReminderAttemptAt,
      'reminderAttemptCount': reminderAttemptCount,
      'receiptThemeId': receiptThemeId,
      'collectorPhotoSnapshot': collectorPhotoSnapshot,
      'collectorSignatureSnapshot': collectorSignatureSnapshot,
      'receiptImageUrl': receiptImageUrl,
      'receiptVersion': receiptVersion,
      'createdBy': createdBy,
      'createdByName': createdByName,
      'createdByRole': createdByRole,
      'createdByMobile': createdByMobile,
      'idempotencyKey': idempotencyKey,
    };
  }
}

class DashboardStats {
  final double todayCollection;
  final double monthlyCollection;
  final double yearlyCollection;
  final double totalCollection;
  final int totalReceipts;
  final int totalDonors;
  final double cashCollection;
  final double upiCollection;
  final double pendingCollection;
  final List<dynamic> dailyChart;
  final List<dynamic> monthlyChart;

  // WhatsApp cost tracking stats
  final int totalWhatsappToday;
  final int totalWhatsappMonth;
  final double estimatedWhatsappCost;

  // Digital Receipt Activity counts
  final int todayReceiptsCount;
  final int monthReceiptsCount;
  final int deliveredReceiptsCount;
  final int pendingReceiptsCount;

  DashboardStats({
    required this.todayCollection,
    required this.monthlyCollection,
    required this.yearlyCollection,
    required this.totalCollection,
    required this.totalReceipts,
    required this.totalDonors,
    required this.cashCollection,
    required this.upiCollection,
    required this.pendingCollection,
    required this.dailyChart,
    required this.monthlyChart,
    this.totalWhatsappToday = 0,
    this.totalWhatsappMonth = 0,
    this.estimatedWhatsappCost = 0.0,
    this.todayReceiptsCount = 0,
    this.monthReceiptsCount = 0,
    this.deliveredReceiptsCount = 0,
    this.pendingReceiptsCount = 0,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    final cards = json['cards'] ?? {};
    final breakdown = json['breakdown'] ?? {};
    final charts = json['charts'] ?? {};
    final whatsapp = json['whatsapp'] ?? {};

    return DashboardStats(
      todayCollection: (cards['todayCollection'] is num)
          ? (cards['todayCollection'] as num).toDouble()
          : 0.0,
      monthlyCollection: (cards['monthlyCollection'] is num)
          ? (cards['monthlyCollection'] as num).toDouble()
          : 0.0,
      yearlyCollection: (cards['yearlyCollection'] is num)
          ? (cards['yearlyCollection'] as num).toDouble()
          : 0.0,
      totalCollection: (cards['totalCollection'] is num)
          ? (cards['totalCollection'] as num).toDouble()
          : 0.0,
      totalReceipts: cards['totalReceipts'] ?? 0,
      totalDonors: cards['totalDonors'] ?? 0,
      cashCollection: (breakdown['cashCollection'] is num)
          ? (breakdown['cashCollection'] as num).toDouble()
          : 0.0,
      upiCollection: (breakdown['upiCollection'] is num)
          ? (breakdown['upiCollection'] as num).toDouble()
          : 0.0,
      pendingCollection: (breakdown['pendingCollection'] is num)
          ? (breakdown['pendingCollection'] as num).toDouble()
          : 0.0,
      dailyChart: charts['daily'] ?? [],
      monthlyChart: charts['monthly'] ?? [],
      totalWhatsappToday: whatsapp['todayCount'] ?? 0,
      totalWhatsappMonth: whatsapp['monthCount'] ?? 0,
      estimatedWhatsappCost: (whatsapp['estimatedCost'] is num)
          ? (whatsapp['estimatedCost'] as num).toDouble()
          : 0.0,
      todayReceiptsCount: json['todayReceiptsCount'] ?? 0,
      monthReceiptsCount: json['monthReceiptsCount'] ?? 0,
      deliveredReceiptsCount: json['deliveredReceiptsCount'] ?? 0,
      pendingReceiptsCount: json['pendingReceiptsCount'] ?? 0,
    );
  }
}

String? _parseDateTimeString(dynamic value) {
  if (value == null) return null;
  if (value is String) return value;
  if (value is Timestamp) {
    return value.toDate().toIso8601String();
  }
  return value.toString();
}

class SubscriptionModel {
  final String id;
  final String organizationId;
  final String plan;
  final int receiptsUsed;
  final int usersUsed;
  final String? renewalDate;
  final String? status;
  final String createdAt;
  final String updatedAt;

  SubscriptionModel({
    required this.id,
    required this.organizationId,
    required this.plan,
    required this.receiptsUsed,
    required this.usersUsed,
    this.renewalDate,
    this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  PlanDetails get planDetails => SubscriptionPlanConfig.getPlan(plan);

  bool get isUnlimitedReceipts => planDetails.isUnlimitedReceipts;

  int? get receiptLimit => planDetails.receiptLimit;

  int get usersLimit => planDetails.usersLimit;

  int get autoWhatsAppLimit => planDetails.autoWhatsAppLimit;

  bool get canShareNow => planDetails.canShareNow;

  bool get isReceiptLimitReached =>
      !isUnlimitedReceipts && receiptLimit != null && receiptsUsed >= receiptLimit!;

  bool get isUserLimitReached => usersUsed >= usersLimit;

  factory SubscriptionModel.fromJson(Map<String, dynamic> json) {
    return SubscriptionModel(
      id: json['id'] ?? '',
      organizationId: json['organizationId'] ?? json['organization_id'] ?? '',
      plan: json['plan'] ?? SubscriptionPlanConfig.planFree,
      receiptsUsed: json['receiptsUsed'] ?? json['receipts_used'] ?? 0,
      usersUsed: json['usersUsed'] ?? json['users_used'] ?? 1,
      renewalDate: _parseDateTimeString(json['renewalDate'] ?? json['renewal_date']),
      status: json['status'] ?? json['subscriptionStatus'],
      createdAt:
          _parseDateTimeString(json['createdAt'] ?? json['created_at']) ?? '',
      updatedAt:
          _parseDateTimeString(json['updatedAt'] ?? json['updated_at']) ?? '',
    );
  }
}

class SubscriptionHistoryModel {
  final String id;
  final String organizationId;
  final String plan;
  final double amountPaid;
  final int receiptLimit;
  final int usersLimit;
  final String activatedAt;
  final String expiresAt;

  SubscriptionHistoryModel({
    required this.id,
    required this.organizationId,
    required this.plan,
    required this.amountPaid,
    required this.receiptLimit,
    required this.usersLimit,
    required this.activatedAt,
    required this.expiresAt,
  });

  factory SubscriptionHistoryModel.fromJson(Map<String, dynamic> json) {
    return SubscriptionHistoryModel(
      id: json['id'] ?? '',
      organizationId: json['organizationId'] ?? json['organization_id'] ?? '',
      plan: json['plan'] ?? '',
      amountPaid: (json['amountPaid'] ?? json['amount_paid'] ?? 0.0) is num
          ? (json['amountPaid'] ?? json['amount_paid'] ?? 0.0).toDouble()
          : 0.0,
      receiptLimit: json['receiptLimit'] ?? json['receipt_limit'] ?? 0,
      usersLimit: json['usersLimit'] ?? json['users_limit'] ?? 0,
      activatedAt:
          _parseDateTimeString(json['activatedAt'] ?? json['activated_at']) ??
              '',
      expiresAt:
          _parseDateTimeString(json['expiresAt'] ?? json['expires_at']) ?? '',
    );
  }
}

class MemberModel {
  final String id;
  final String userId;
  final String organizationId;
  final String name;
  final String mobile;
  final String role;
  final String joinedAt;

  MemberModel({
    required this.id,
    required this.userId,
    required this.organizationId,
    required this.name,
    required this.mobile,
    required this.role,
    required this.joinedAt,
  });

  factory MemberModel.fromJson(Map<String, dynamic> json) {
    return MemberModel(
      id: json['id'] ?? '',
      userId: json['userId'] ?? json['user_id'] ?? '',
      organizationId: json['organizationId'] ?? json['organization_id'] ?? '',
      name: json['name'] ?? '',
      mobile: json['mobile'] ?? '',
      role: json['role'] ?? '',
      joinedAt:
          _parseDateTimeString(json['joinedAt'] ?? json['joined_at']) ?? '',
    );
  }
}

class InviteModel {
  final String id;
  final String organizationId;
  final String organizationName;
  final String name;
  final String mobile;
  final String email;
  final String role;
  final String activationCode;
  final String activationToken;
  final String otp;
  final String status;
  final String expiresAt;
  final bool isOneTime;
  final bool used;

  InviteModel({
    required this.id,
    required this.organizationId,
    this.organizationName = '',
    required this.name,
    required this.mobile,
    this.email = '',
    required this.role,
    this.activationCode = '',
    this.activationToken = '',
    String? otp,
    required this.status,
    required this.expiresAt,
    required this.isOneTime,
    required this.used,
  }) : otp = otp ?? activationCode;

  factory InviteModel.fromJson(Map<String, dynamic> json) {
    final code = (json['activationCode'] ?? json['otp'] ?? json['activationToken'] ?? '').toString();
    return InviteModel(
      id: json['id'] ?? '',
      organizationId: json['organizationId'] ?? json['organization_id'] ?? '',
      organizationName: json['organizationName'] ?? json['organization_name'] ?? '',
      name: json['name'] ?? '',
      mobile: json['mobile'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? '',
      activationCode: code,
      activationToken: json['activationToken'] ?? code,
      otp: code,
      status: json['status'] ?? 'pending',
      expiresAt:
          _parseDateTimeString(json['expiresAt'] ?? json['expires_at']) ?? '',
      isOneTime: json['isOneTime'] ?? json['is_one_time'] ?? true,
      used: json['used'] ?? false,
    );
  }
}

class ActivityLogModel {
  final String id;
  final String organizationId;
  final String userId;
  final String userName;
  final String userRole;
  final String action;
  final String details;
  final String timestamp;

  ActivityLogModel({
    required this.id,
    required this.organizationId,
    required this.userId,
    required this.userName,
    required this.userRole,
    required this.action,
    required this.details,
    required this.timestamp,
  });

  factory ActivityLogModel.fromJson(Map<String, dynamic> json) {
    return ActivityLogModel(
      id: json['id'] ?? '',
      organizationId: json['organizationId'] ?? json['organization_id'] ?? '',
      userId: json['userId'] ?? json['user_id'] ?? '',
      userName: json['userName'] ?? json['user_name'] ?? '',
      userRole: json['userRole'] ?? json['user_role'] ?? '',
      action: json['action'] ?? '',
      details: json['details'] ?? '',
      timestamp: _parseDateTimeString(json['timestamp']) ?? '',
    );
  }
}
