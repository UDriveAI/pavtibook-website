// Model classes for PavtiBook App
import 'package:cloud_firestore/cloud_firestore.dart';

class UserModel {
  final String id;
  final String? organizationId;
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

  // Signatures fields
  final String? presidentSignatureUrl;
  final String? treasurerSignatureUrl;
  final String? agentSignatureUrl;

  // Office bearer names & designations
  final String? presidentName;
  final String? treasurerName;
  final String? memberName;
  final String? presidentDesignation;
  final String? treasurerDesignation;
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
    this.agentSignatureUrl,
    this.presidentName,
    this.treasurerName,
    this.memberName,
    this.presidentDesignation,
    this.treasurerDesignation,
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
      agentSignatureUrl:
          json['agent_signature_url'] ?? json['agentSignatureUrl'],
      presidentName: json['president_name'] ?? json['presidentName'],
      treasurerName: json['treasurer_name'] ?? json['treasurerName'],
      memberName: json['member_name'] ??
          json['memberName'] ??
          json['agent_name'] ??
          json['agentName'],
      presidentDesignation:
          json['president_designation'] ?? json['presidentDesignation'],
      treasurerDesignation:
          json['treasurer_designation'] ?? json['treasurerDesignation'],
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
  final bool isDefault;

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
    required this.isDefault,
  });

  factory TemplateModel.fromJson(Map<String, dynamic> json) {
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
          'Authorized Signatory',
      signatureUrl: json['signature_url'] ?? json['signatureUrl'],
      isDefault: json['is_default'] ?? json['isDefault'] ?? false,
    );
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
  final int receiptLimit;
  final int usersUsed;
  final int usersLimit;
  final String renewalDate;
  final String createdAt;
  final String updatedAt;

  SubscriptionModel({
    required this.id,
    required this.organizationId,
    required this.plan,
    required this.receiptsUsed,
    required this.receiptLimit,
    required this.usersUsed,
    required this.usersLimit,
    required this.renewalDate,
    required this.createdAt,
    required this.updatedAt,
  });

  factory SubscriptionModel.fromJson(Map<String, dynamic> json) {
    return SubscriptionModel(
      id: json['id'] ?? '',
      organizationId: json['organizationId'] ?? json['organization_id'] ?? '',
      plan: json['plan'] ?? 'free_trial',
      receiptsUsed: json['receiptsUsed'] ?? json['receipts_used'] ?? 0,
      receiptLimit: json['receiptLimit'] ?? json['receipt_limit'] ?? 10,
      usersUsed: json['usersUsed'] ?? json['users_used'] ?? 1,
      usersLimit: json['usersLimit'] ?? json['users_limit'] ?? 1,
      renewalDate: json['renewalDate'] ?? json['renewal_date'] ?? '',
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
  final String name;
  final String mobile;
  final String role;
  final String otp;
  final String status;
  final String expiresAt;
  final bool isOneTime;
  final bool used;

  InviteModel({
    required this.id,
    required this.organizationId,
    required this.name,
    required this.mobile,
    required this.role,
    required this.otp,
    required this.status,
    required this.expiresAt,
    required this.isOneTime,
    required this.used,
  });

  factory InviteModel.fromJson(Map<String, dynamic> json) {
    return InviteModel(
      id: json['id'] ?? '',
      organizationId: json['organizationId'] ?? json['organization_id'] ?? '',
      name: json['name'] ?? '',
      mobile: json['mobile'] ?? '',
      role: json['role'] ?? '',
      otp: json['otp'] ?? '',
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
