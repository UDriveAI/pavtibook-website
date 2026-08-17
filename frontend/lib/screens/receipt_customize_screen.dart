import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/models.dart';
import '../models/receipt_template_preset.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../services/universal_receipt_engine.dart';
import '../widgets/traditional_receipt_widget.dart';
import '../config/receipt_typography_config.dart';
import 'settings_subpages.dart';

class ReceiptPreviewData {
  final OrganizationModel org;
  final TemplateModel template;
  final ReceiptModel receipt;
  final String languageCode;

  const ReceiptPreviewData({
    required this.org,
    required this.template,
    required this.receipt,
    required this.languageCode,
  });
}

/// Mobile-First Universal Receipt Design Customizer — Final UX Polish.
class ReceiptCustomizeScreen extends StatefulWidget {
  const ReceiptCustomizeScreen({super.key});

  @override
  State<ReceiptCustomizeScreen> createState() => _ReceiptCustomizeScreenState();
}

class _ReceiptCustomizeScreenState extends State<ReceiptCustomizeScreen> {
  final _formKey = GlobalKey<FormState>();

  // Text Controllers mirroring exact receipt text fields
  late TextEditingController _orgNameController;
  late TextEditingController _topGreetingController;
  late TextEditingController _subtitleController;
  late TextEditingController _donorSectionTitleController;
  late TextEditingController _donationSectionTitleController;
  late TextEditingController _paymentSectionTitleController;
  late TextEditingController _notesSectionTitleController;
  late TextEditingController _thankYouMessageController;
  late TextEditingController _stampLabelController;
  late TextEditingController _signatureLabelController;
  late TextEditingController _customNoteController;

  // Legacy controllers for backwards compatibility
  late TextEditingController _headerEnController;
  late TextEditingController _headerLocalController;
  late TextEditingController _subtitleEnController;
  late TextEditingController _subtitleLocalController;
  late TextEditingController _footerEnController;
  late TextEditingController _footerLocalController;
  late TextEditingController _footerController;

  // Core settings
  String _type = 'default_pavtibook';
  String _languageCode = 'mr';

  // Colors
  String _primaryColor = '#8B1E2D';
  String _secondaryColor = '#FFFFFF';
  String _accentColor = '#D4AF37';
  String _bgColor = '#FFFDD0';
  String _borderColor = '#D84315';
  String _borderStyle = 'double';
  String _selectedThemeId = 'pavtibook_neutral';

  // Typography
  String _fontFamily = 'Poppins';
  double _headingSize = 16.0;
  double _bodySize = 9.5;
  double _amountSize = 18.0;
  String _fontWeight = 'bold';

  double _watermarkOpacity = 0.05;

  // Branding
  bool _logoVisible = true;
  double _logoScale = 1.0;
  double _stampScale = 1.0;

  // Custom Category Text Sizes Map
  Map<String, double> _customTextSizes = {};

  // 16 Field Visibility Toggles
  bool _showDonorName = true;
  bool _showDonorAddress = true;
  bool _showDonorMobile = true;
  bool _showDonorEmail = true;
  bool _showPurpose = true;
  bool _showPaymentMode = true;
  bool _showAmount = true;
  bool _showAmountInWords = true;
  bool _showReceiptNumber = true;
  bool _showDate = true;
  bool _showTime = true;
  bool _showQrCode = true;
  bool _showSignature = true;
  bool _showStamp = true;
  bool _showNotes = true;
  bool _showFooter = true;

  // Expansion state
  bool _customColorsExpanded = false;
  bool _advancedExpanded = true;
  bool _textSizeExpanded = false;
  bool _donorDetailsExpanded = false;
  bool _paymentDetailsExpanded = false;
  bool _receiptDetailsExpanded = false;
  bool _authorizationExpanded = false;
  bool _additionalExpanded = false;

  bool _isSaving = false;
  bool _uploadingLogo = false;
  bool _uploadingStamp = false;
  bool _uploadingPresidentSignature = false;
  bool _uploadingTreasurerSignature = false;
  bool _uploadingSecretarySignature = false;

  double _presidentSigScale = 1.0;
  double _treasurerSigScale = 1.0;
  double _secretarySigScale = 1.0;

  // Palette colors for pickers
  final List<String> _paletteOptions = [
    '#8B1E2D', '#D84315', '#E65100', '#1B5E20', '#0D47A1',
    '#4A148C', '#D4AF37', '#37474F', '#FFFDD0', '#FFFDE7',
    '#F1F8E9', '#EBF3FA', '#FFFFFF',
  ];

  final List<String> _fontFamilies = ['Poppins', 'YatraOne', 'Roboto'];

  final List<Map<String, String>> _readyMadeThemes = [
    {'id': 'pavtibook_neutral', 'name': 'PavtiBook Neutral', 'primary': '#8B1E2D', 'bg': '#FFFDD0', 'border': '#D84315', 'accent': '#D4AF37', 'secondary': '#FFFFFF'},
    {'id': 'maroon_gold', 'name': 'Maroon Gold', 'primary': '#8B1E2D', 'bg': '#FFFDE7', 'border': '#8B1E2D', 'accent': '#D4AF37', 'secondary': '#FFFFFF'},
    {'id': 'emerald', 'name': 'Emerald Green', 'primary': '#1B5E20', 'bg': '#F1F8E9', 'border': '#1B5E20', 'accent': '#66BB6A', 'secondary': '#FFFFFF'},
    {'id': 'royal_blue', 'name': 'Royal Blue', 'primary': '#0D47A1', 'bg': '#EBF3FA', 'border': '#0D47A1', 'accent': '#42A5F5', 'secondary': '#FFFFFF'},
    {'id': 'warm_gold', 'name': 'Warm Gold', 'primary': '#E65100', 'bg': '#FFF3E0', 'border': '#E65100', 'accent': '#FFB74D', 'secondary': '#FFFFFF'},
    {'id': 'purple', 'name': 'Purple Grace', 'primary': '#4A148C', 'bg': '#F3E5F5', 'border': '#4A148C', 'accent': '#AB47BC', 'secondary': '#FFFFFF'},
    {'id': 'slate', 'name': 'Slate Professional', 'primary': '#37474F', 'bg': '#ECEFF1', 'border': '#455A64', 'accent': '#78909C', 'secondary': '#FFFFFF'},
  ];

  @override
  void initState() {
    super.initState();
    _orgNameController = TextEditingController();
    _topGreetingController = TextEditingController();
    _subtitleController = TextEditingController();
    _donorSectionTitleController = TextEditingController();
    _donationSectionTitleController = TextEditingController();
    _paymentSectionTitleController = TextEditingController();
    _notesSectionTitleController = TextEditingController();
    _thankYouMessageController = TextEditingController();
    _stampLabelController = TextEditingController();
    _signatureLabelController = TextEditingController();
    _customNoteController = TextEditingController();

    _headerEnController = TextEditingController();
    _headerLocalController = TextEditingController();
    _subtitleEnController = TextEditingController();
    _subtitleLocalController = TextEditingController();
    _footerEnController = TextEditingController();
    _footerLocalController = TextEditingController();
    _footerController = TextEditingController();

    // Attach real-time live preview rebuild listeners (Isolated updates without full screen rebuild)
    _orgNameController.addListener(_updateLivePreview);
    _topGreetingController.addListener(_updateLivePreview);
    _subtitleController.addListener(_updateLivePreview);
    _donorSectionTitleController.addListener(_updateLivePreview);
    _donationSectionTitleController.addListener(_updateLivePreview);
    _paymentSectionTitleController.addListener(_updateLivePreview);
    _notesSectionTitleController.addListener(_updateLivePreview);
    _thankYouMessageController.addListener(_updateLivePreview);
    _stampLabelController.addListener(_updateLivePreview);
    _signatureLabelController.addListener(_updateLivePreview);
    _customNoteController.addListener(_updateLivePreview);

    WidgetsBinding.instance.addPostFrameCallback((_) => _loadCurrentOrgTemplate());
  }

  final ValueNotifier<ReceiptPreviewData?> _previewNotifier = ValueNotifier<ReceiptPreviewData?>(null);

  @override
  void dispose() {
    _previewNotifier.dispose();
    _orgNameController.dispose();
    _topGreetingController.dispose();
    _subtitleController.dispose();
    _donorSectionTitleController.dispose();
    _donationSectionTitleController.dispose();
    _paymentSectionTitleController.dispose();
    _notesSectionTitleController.dispose();
    _thankYouMessageController.dispose();
    _stampLabelController.dispose();
    _signatureLabelController.dispose();
    _customNoteController.dispose();
    _headerEnController.dispose();
    _headerLocalController.dispose();
    _subtitleEnController.dispose();
    _subtitleLocalController.dispose();
    _footerEnController.dispose();
    _footerLocalController.dispose();
    _footerController.dispose();
    super.dispose();
  }

  void _updateLivePreview() {
    if (!mounted) return;
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final org = auth.organization;
    final currentOrgName = _orgNameController.text.trim().isNotEmpty
        ? _orgNameController.text.trim()
        : (org?.name ?? 'Organization Name');

    final liveOrg = OrganizationModel(
      id: org?.id ?? 'temp_preview_org',
      name: currentOrgName,
      type: org?.type ?? 'trust',
      upiId: org?.upiId ?? 'trust@upi',
      subscriptionPlan: org?.subscriptionPlan ?? 'free',
      isVerified: org?.isVerified ?? true,
      logoUrl: org?.logoUrl,
      customStampUrl: org?.customStampUrl,
      presidentName: org?.presidentName,
      presidentSignatureUrl: org?.presidentSignatureUrl,
      treasurerName: org?.treasurerName,
      treasurerSignatureUrl: org?.treasurerSignatureUrl,
      secretaryName: org?.secretaryName,
      secretarySignatureUrl: org?.secretarySignatureUrl,
      presidentSignatureScale: _presidentSigScale,
      treasurerSignatureScale: _treasurerSigScale,
      secretarySignatureScale: _secretarySigScale,
      address: org?.address,
      city: org?.city,
      pincode: org?.pincode,
      registrationNumber: org?.registrationNumber,
      mobile: org?.mobile,
      email: org?.email,
      receiptThemeId: _selectedThemeId,
    );

    final liveTemplate = TemplateModel(
      id: 'live_preview_template',
      organizationId: org?.id ?? 'temp_preview_org',
      name: 'Live Preview Template',
      type: _type,
      isDefault: false,
      primaryColor: _primaryColor,
      secondaryColor: _secondaryColor,
      accentColor: _accentColor,
      bgColor: _bgColor,
      borderColor: _borderColor,
      borderStyle: _borderStyle,
      fontFamily: _fontFamily,
      fontColor: '#000000',
      headingSize: _headingSize,
      bodySize: _bodySize,
      amountSize: _amountSize,
      fontWeight: _fontWeight,
      godImagePosition: 'center',
      watermarkOpacity: _watermarkOpacity,
      headerTextEn: _topGreetingController.text.trim().isNotEmpty ? _topGreetingController.text.trim() : null,
      headerTextLocal: _topGreetingController.text.trim().isNotEmpty ? _topGreetingController.text.trim() : null,
      customSubtitleLocal: _subtitleController.text.trim().isNotEmpty ? _subtitleController.text.trim() : null,
      customNote: _customNoteController.text.trim().isNotEmpty ? _customNoteController.text.trim() : null,
      customTranslations: {
        'donor_details': _donorSectionTitleController.text.trim(),
        'donation_details': _donationSectionTitleController.text.trim(),
        'payment_method_title': _paymentSectionTitleController.text.trim(),
        'notes_title': _notesSectionTitleController.text.trim(),
        'footer_thankyou': _thankYouMessageController.text.trim(),
      },
      signatureLabel: _signatureLabelController.text.trim(),
      logoVisible: _logoVisible,
      logoScale: _logoScale,
      stampScale: _stampScale,
      showDonorName: _showDonorName,
      showDonorAddress: _showDonorAddress,
      showDonorMobile: _showDonorMobile,
      showDonorEmail: _showDonorEmail,
      showPurpose: _showPurpose,
      showPaymentMode: _showPaymentMode,
      showAmount: _showAmount,
      showAmountInWords: _showAmountInWords,
      showReceiptNumber: _showReceiptNumber,
      showDate: _showDate,
      showTime: _showTime,
      showQrCode: _showQrCode,
      showSignature: _showSignature,
      showStamp: _showStamp,
      showNotes: _showNotes,
      showFooter: _showFooter,
      customTextSizes: Map<String, double>.from(_customTextSizes),
    );

    final sampleReceipt = ReceiptModel(
      id: 'sample_customization_01',
      receiptNumber: 'PB-2026-0001',
      organizationId: org?.id ?? 'temp_preview_org',
      donorId: 'temp_donor_id',
      amount: 5001.0,
      paymentMode: 'upi',
      purpose: 'Trust General Donation / देणगी',
      collectorName: 'Shri. Admin / अध्यक्ष',
      paymentStatus: 'completed',
      qrCodeValue: 'https://pavtibook.online/v/sample_customization_01',
      createdAt: DateTime.now().toIso8601String(),
      donorName: 'Shri. Ramesh Kumar',
      donorAddress: 'Pune, Maharashtra - 411001',
      organizationName: currentOrgName,
    );

    _previewNotifier.value = ReceiptPreviewData(
      org: liveOrg,
      template: liveTemplate,
      receipt: sampleReceipt,
      languageCode: _languageCode,
    );
  }

  Future<void> _loadCurrentOrgTemplate() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final tp = Provider.of<TemplateProvider>(context, listen: false);
    final org = auth.organization;
    if (org == null) return;

    await tp.fetchTemplates(forceRefresh: true);

    TemplateModel? savedTemplate;
    if (tp.templates.isNotEmpty) {
      try {
        savedTemplate = tp.templates.firstWhere(
          (t) => t.organizationId == org.id,
          orElse: () => tp.templates.first,
        );
      } catch (_) {}
    }

    final preset = ReceiptPresetCatalog.getById(savedTemplate?.type ?? org.receiptThemeId);
    final template = savedTemplate ?? PresetFactory.createPristineTemplate(
      organizationId: org.id, preset: preset, org: org,
    );

    final labels = DefaultPavtiBookLabels.getLabels(_languageCode);

    setState(() {
      _type = 'default_pavtibook';
      _primaryColor = template.primaryColor ?? preset.primaryColorHex;
      _secondaryColor = template.secondaryColor ?? '#FFFFFF';
      _accentColor = template.accentColor ?? '#D4AF37';
      _bgColor = template.bgColor;
      _borderColor = template.borderColor;
      _borderStyle = template.borderStyle;
      _fontFamily = template.fontFamily;
      final matchingTheme = _readyMadeThemes.firstWhere(
        (t) => t['primary'] == _primaryColor && t['bg'] == _bgColor,
        orElse: () => _readyMadeThemes.first,
      );
      _selectedThemeId = matchingTheme['id']!;
      _headingSize = template.headingSize;
      _bodySize = template.bodySize;
      _amountSize = template.amountSize;
      _fontWeight = template.fontWeight;
      _logoVisible = template.logoVisible;
      _logoScale = template.logoScale;
      _stampScale = template.stampScale;
      _presidentSigScale = org.presidentSignatureScale != 1.0 ? org.presidentSignatureScale : template.presidentSignatureScale;
      _treasurerSigScale = org.treasurerSignatureScale != 1.0 ? org.treasurerSignatureScale : template.treasurerSignatureScale;
      _secretarySigScale = org.secretarySignatureScale != 1.0 ? org.secretarySignatureScale : template.secretarySignatureScale;
      _customTextSizes = Map<String, double>.from(template.customTextSizes ?? {});
      _watermarkOpacity = template.watermarkOpacity;

      _orgNameController.text = (org.name.isEmpty || org.name == 'गणपती बाप्पा मोरया')
          ? (_languageCode == 'mr' ? 'आपल्या संस्थेचे नाव' : 'Your Organization Name')
          : org.name;
      _topGreetingController.text = template.headerTextLocal ?? labels['greeting']!;
      _subtitleController.text = template.customSubtitleLocal ?? labels['header_subtitle']!;
      _donorSectionTitleController.text = template.customTranslations?['donor_details'] ?? labels['donor_details']!;
      _donationSectionTitleController.text = template.customTranslations?['donation_details'] ?? labels['donation_details']!;
      _paymentSectionTitleController.text = template.customTranslations?['payment_method_title'] ?? labels['payment_method_title']!;
      _notesSectionTitleController.text = template.customTranslations?['notes_title'] ?? labels['notes_title']!;
      _thankYouMessageController.text = template.footerTextLocal ?? template.customTranslations?['footer_thankyou'] ?? labels['footer_thankyou']!;
      _stampLabelController.text = template.customTranslations?['official_stamp'] ?? labels['official_stamp']!;
      _signatureLabelController.text = template.signatureLabel.isNotEmpty ? template.signatureLabel : labels['sig_president']!;
      _customNoteController.text = template.customNote ?? '';

      _showDonorName = template.showDonorName;
      _showDonorAddress = template.showDonorAddress;
      _showDonorMobile = template.showDonorMobile;
      _showDonorEmail = template.showDonorEmail;
      _showPurpose = template.showPurpose;
      _showPaymentMode = template.showPaymentMode;
      _showAmount = template.showAmount;
      _showAmountInWords = template.showAmountInWords;
      _showReceiptNumber = template.showReceiptNumber;
      _showDate = template.showDate;
      _showTime = template.showTime;
      _showQrCode = template.showQrCode;
      _showSignature = template.showSignature;
      _showStamp = template.showStamp;
      _showNotes = template.showNotes;
      _showFooter = template.showFooter;
    });
    _updateLivePreview();
  }

  void _resetToNeutral() {
    final match = _readyMadeThemes.firstWhere(
      (t) => t['id'] == 'pavtibook_neutral',
      orElse: () => _readyMadeThemes.first,
    );
    setState(() {
      _selectedThemeId = 'pavtibook_neutral';
      _primaryColor = match['primary']!;
      _secondaryColor = match['secondary']!;
      _bgColor = match['bg']!;
      _borderColor = match['border']!;
      _accentColor = match['accent']!;
      _logoScale = 1.0;
      _stampScale = 1.0;
      _customTextSizes.clear();
      _watermarkOpacity = 0.05;
      _fontWeight = 'bold';
      _fontFamily = 'Poppins';
    });
  }

  TemplateModel _buildLiveTemplate(OrganizationModel org) {
    Map<String, String> customTrans = {
      'donor_details': _donorSectionTitleController.text,
      'donation_details': _donationSectionTitleController.text,
      'payment_method_title': _paymentSectionTitleController.text,
      'notes_title': _notesSectionTitleController.text,
      'official_stamp': _stampLabelController.text,
      'footer_thankyou': _thankYouMessageController.text,
      'sig_president': _signatureLabelController.text,
    };

    return TemplateModel(
      id: 'custom_editor_live',
      organizationId: org.id,
      name: 'Custom Template',
      type: _type,
      bgColor: _bgColor,
      borderStyle: _borderStyle,
      borderColor: _borderColor,
      fontFamily: _fontFamily,
      fontColor: _primaryColor,
      primaryColor: _primaryColor,
      secondaryColor: _secondaryColor,
      accentColor: _accentColor,
      headingSize: _headingSize,
      bodySize: _bodySize,
      amountSize: _amountSize,
      fontWeight: _fontWeight,
      logoVisible: _logoVisible,
      logoScale: _logoScale,
      stampScale: _stampScale,
      presidentSignatureUrl: org.presidentSignatureUrl,
      treasurerSignatureUrl: org.treasurerSignatureUrl,
      secretarySignatureUrl: org.secretarySignatureUrl,
      presidentSignatureScale: _presidentSigScale,
      treasurerSignatureScale: _treasurerSigScale,
      secretarySignatureScale: _secretarySigScale,
      customTextSizes: Map<String, double>.from(_customTextSizes),
      godImagePosition: 'none',
      watermarkOpacity: _watermarkOpacity,
      headerTextLocal: _topGreetingController.text,
      customSubtitleLocal: _subtitleController.text,
      footerTextLocal: _thankYouMessageController.text,
      customNote: _customNoteController.text.isEmpty ? null : _customNoteController.text,
      signatureLabel: _signatureLabelController.text,
      customTranslations: customTrans,
      isDefault: true,
      showDonorName: _showDonorName,
      showDonorAddress: _showDonorAddress,
      showDonorMobile: _showDonorMobile,
      showDonorEmail: _showDonorEmail,
      showPurpose: _showPurpose,
      showPaymentMode: _showPaymentMode,
      showAmount: _showAmount,
      showAmountInWords: _showAmountInWords,
      showReceiptNumber: _showReceiptNumber,
      showDate: _showDate,
      showTime: _showTime,
      showQrCode: _showQrCode,
      showSignature: _showSignature,
      showStamp: _showStamp,
      showNotes: _showNotes,
      showFooter: _showFooter,
    );
  }

  Future<void> _pickAndUploadBrandingImage(String type) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final org = auth.organization;
    if (org == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No active organization found.')),
      );
      return;
    }

    try {
      final picker = ImagePicker();
      final XFile? pickedFile = await picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 88,
      );

      if (pickedFile == null) return; // User cancelled

      setState(() {
        if (type == 'logo') _uploadingLogo = true;
        if (type == 'stamp') _uploadingStamp = true;
        if (type == 'signature' || type == 'president_signature') _uploadingPresidentSignature = true;
        if (type == 'treasurer_signature') _uploadingTreasurerSignature = true;
        if (type == 'secretary_signature') _uploadingSecretarySignature = true;
      });

      final file = File(pickedFile.path);
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final storageRef = FirebaseStorage.instance
          .ref()
          .child('organizations')
          .child(org.id)
          .child('branding')
          .child('${type}_$timestamp.png');

      final uploadTask = storageRef.putFile(file);
      final snapshot = await uploadTask;
      final downloadUrl = await snapshot.ref.getDownloadURL();

      Map<String, dynamic> updateData = {};
      if (type == 'logo') {
        updateData = {
          'logo_url': downloadUrl,
          'logoUrl': downloadUrl,
        };
      } else if (type == 'stamp') {
        updateData = {
          'custom_stamp_url': downloadUrl,
          'customStampUrl': downloadUrl,
          'stamp_url': downloadUrl,
          'stampUrl': downloadUrl,
        };
      } else if (type == 'signature' || type == 'president_signature') {
        updateData = {
          'president_signature_url': downloadUrl,
          'presidentSignatureUrl': downloadUrl,
          'signature_url': downloadUrl,
          'signatureUrl': downloadUrl,
        };
      } else if (type == 'treasurer_signature') {
        updateData = {
          'treasurer_signature_url': downloadUrl,
          'treasurerSignatureUrl': downloadUrl,
        };
      } else if (type == 'secretary_signature') {
        updateData = {
          'secretary_signature_url': downloadUrl,
          'secretarySignatureUrl': downloadUrl,
        };
      }

      await FirebaseFirestore.instance
          .collection('organizations')
          .doc(org.id)
          .update(updateData);

      await auth.reloadProfile();

      if (mounted) {
        final label = type == 'logo'
            ? 'Organization Logo'
            : (type == 'stamp'
                ? 'Organization Stamp'
                : (type == 'treasurer_signature'
                    ? 'Treasurer Signature'
                    : (type == 'secretary_signature'
                        ? 'Secretary Signature'
                        : 'President Signature')));
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$label uploaded successfully!'),
            backgroundColor: Colors.green.shade700,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      debugPrint('Branding upload error ($type): $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to upload image: $e'),
            backgroundColor: Colors.red.shade700,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          if (type == 'logo') _uploadingLogo = false;
          if (type == 'stamp') _uploadingStamp = false;
          if (type == 'signature' || type == 'president_signature') _uploadingPresidentSignature = false;
          if (type == 'treasurer_signature') _uploadingTreasurerSignature = false;
          if (type == 'secretary_signature') _uploadingSecretarySignature = false;
        });
      }
    }
  }

  Future<void> _removeSignature(String type) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final org = auth.organization;
    if (org == null) return;

    try {
      setState(() {
        if (type == 'president') _uploadingPresidentSignature = true;
        if (type == 'treasurer') _uploadingTreasurerSignature = true;
        if (type == 'secretary') _uploadingSecretarySignature = true;
      });

      Map<String, dynamic> updateData = {};
      if (type == 'president') {
        updateData = {
          'president_signature_url': null,
          'presidentSignatureUrl': null,
          'signature_url': null,
          'signatureUrl': null,
        };
      } else if (type == 'treasurer') {
        updateData = {
          'treasurer_signature_url': null,
          'treasurerSignatureUrl': null,
        };
      } else if (type == 'secretary') {
        updateData = {
          'secretary_signature_url': null,
          'secretarySignatureUrl': null,
        };
      }

      await FirebaseFirestore.instance
          .collection('organizations')
          .doc(org.id)
          .update(updateData);

      await auth.reloadProfile();

      if (mounted) {
        final label = type == 'president'
            ? 'President'
            : (type == 'treasurer' ? 'Treasurer' : 'Secretary');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$label signature removed successfully.'),
            backgroundColor: Colors.orange.shade800,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to remove signature: $e'),
            backgroundColor: Colors.red.shade700,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          if (type == 'president') _uploadingPresidentSignature = false;
          if (type == 'treasurer') _uploadingTreasurerSignature = false;
          if (type == 'secretary') _uploadingSecretarySignature = false;
        });
      }
    }
  }

  Future<void> _saveCustomization() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final tp = Provider.of<TemplateProvider>(context, listen: false);
    final org = auth.organization;
    if (org == null) return;

    final newOrgName = _orgNameController.text.trim();
    try {
      final orgUpdates = <String, dynamic>{
        if (newOrgName.isNotEmpty && newOrgName != org.name) 'name': newOrgName,
        'president_signature_scale': _presidentSigScale,
        'presidentSignatureScale': _presidentSigScale,
        'treasurer_signature_scale': _treasurerSigScale,
        'treasurerSignatureScale': _treasurerSigScale,
        'secretary_signature_scale': _secretarySigScale,
        'secretarySignatureScale': _secretarySigScale,
      };
      await FirebaseFirestore.instance
          .collection('organizations')
          .doc(org.id)
          .update(orgUpdates);
      await auth.reloadProfile();
    } catch (e) {
      debugPrint('Error updating org custom scale fields: $e');
    }

    final liveTemplate = _buildLiveTemplate(org);
    final success = await tp.createTemplate(liveTemplate.toJson());

    if (mounted) {
      setState(() => _isSaving = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Template saved successfully'),
            backgroundColor: Colors.green.shade700,
            behavior: SnackBarBehavior.floating,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to save. Please try again.')),
        );
      }
    }
  }

  // ======================================================================
  // BUILD
  // ======================================================================
  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final org = auth.organization;
    if (org == null) {
      return const Scaffold(body: Center(child: Text('No organization loaded')));
    }

    final currentOrgName = _orgNameController.text.trim().isEmpty ? org.name : _orgNameController.text.trim();
    final liveOrg = OrganizationModel(
      id: org.id,
      name: currentOrgName,
      type: org.type,
      address: org.address,
      city: org.city,
      pincode: org.pincode,
      state: org.state,
      mobile: org.mobile,
      email: org.email,
      logoUrl: org.logoUrl,
      presidentSignatureUrl: org.presidentSignatureUrl,
      customStampUrl: org.customStampUrl,
      leftSideImageUrl: org.leftSideImageUrl,
      rightSideImageUrl: org.rightSideImageUrl,
      receiptThemeId: org.receiptThemeId,
      upiId: org.upiId,
      isVerified: org.isVerified,
      subscriptionPlan: org.subscriptionPlan,
    );

    final liveTemplate = _buildLiveTemplate(org);

    final sampleReceipt = ReceiptModel(
      id: 'sample_customization_01',
      organizationId: org.id,
      donorId: 'donor_sample',
      receiptNumber: 'PB-2026-000888',
      amount: 2500.0,
      purpose: 'Building & Welfare Fund',
      paymentMode: 'upi',
      paymentStatus: 'completed',
      qrCodeValue: 'https://pavtibook.online/v/sample_customization_01',
      createdAt: DateTime.now().toIso8601String(),
      donorName: 'Shri. Ramesh Kumar',
      donorAddress: 'Pune, Maharashtra - 411001',
      organizationName: currentOrgName,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Receipt Customization'),
        actions: [
          TextButton.icon(
            onPressed: _isSaving ? null : _saveCustomization,
            icon: _isSaving
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.check, color: Colors.white),
            label: const Text('Save', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: Column(
          children: [
            // ════════════════════════════════════════════
            // 1. PINNED / STICKY LIVE RECEIPT PREVIEW (STAYS VISIBLE AT TOP)
            // ════════════════════════════════════════════
            Container(
              color: const Color(0xFFF4F6F8),
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Icon(Icons.visibility, size: 14, color: Colors.grey.shade600),
                      const SizedBox(width: 6),
                      Text('Live Preview', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade600)),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: _parseColor(_primaryColor),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text(
                          'DEFAULT PAVTIBOOK',
                          style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ValueListenableBuilder<ReceiptPreviewData?>(
                    valueListenable: _previewNotifier,
                    builder: (context, data, child) {
                      if (data == null) {
                        return TraditionalReceiptWidget(
                          receipt: sampleReceipt,
                          organization: liveOrg,
                          template: liveTemplate,
                          languageCode: _languageCode,
                        );
                      }
                      return TraditionalReceiptWidget(
                        receipt: data.receipt,
                        organization: data.org,
                        template: data.template,
                        languageCode: data.languageCode,
                      );
                    },
                  ),
                ],
              ),
            ),

            // ════════════════════════════════════════════
            // 2. SCROLLABLE CUSTOMIZATION OPTIONS BELOW (ONLY THIS AREA SCROLLS)
            // ════════════════════════════════════════════
            Expanded(
              child: SingleChildScrollView(
                key: const PageStorageKey<String>('receipt_customize_scroll'),
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // 2. TEMPLATE
                    _buildCard(
                      icon: Icons.dashboard_outlined,
                      title: 'Template',
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'DEFAULT PAVTIBOOK',
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: _parseColor(_primaryColor)),
                              ),
                              OutlinedButton(
                                onPressed: _resetToNeutral,
                                style: OutlinedButton.styleFrom(foregroundColor: Colors.grey.shade700),
                                child: const Text('Reset to Neutral'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

            // ════════════════════════════════════════════
            // 3. RECEIPT LANGUAGE
            // ════════════════════════════════════════════
            _buildCard(
              icon: Icons.translate,
              title: 'Receipt Language',
              subtitle: 'Changes only system-generated labels. Your content stays unchanged.',
              child: DropdownButtonFormField<String>(
                value: _languageCode,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
                items: const [
                  DropdownMenuItem(value: 'mr', child: Text('मराठी (Marathi)')),
                  DropdownMenuItem(value: 'hi', child: Text('हिंदी (Hindi)')),
                  DropdownMenuItem(value: 'en', child: Text('English')),
                ],
                onChanged: (val) {
                  if (val != null && val != _languageCode) {
                    final oldLabels = DefaultPavtiBookLabels.getLabels(_languageCode);
                    final newLabels = DefaultPavtiBookLabels.getLabels(val);

                    setState(() {
                      if (_topGreetingController.text == oldLabels['greeting']) {
                        _topGreetingController.text = newLabels['greeting']!;
                      }
                      if (_subtitleController.text == oldLabels['header_subtitle']) {
                        _subtitleController.text = newLabels['header_subtitle']!;
                      }
                      if (_donorSectionTitleController.text == oldLabels['donor_details']) {
                        _donorSectionTitleController.text = newLabels['donor_details']!;
                      }
                      if (_donationSectionTitleController.text == oldLabels['donation_details']) {
                        _donationSectionTitleController.text = newLabels['donation_details']!;
                      }
                      if (_paymentSectionTitleController.text == oldLabels['payment_method_title']) {
                        _paymentSectionTitleController.text = newLabels['payment_method_title']!;
                      }
                      if (_notesSectionTitleController.text == oldLabels['notes_title']) {
                        _notesSectionTitleController.text = newLabels['notes_title']!;
                      }
                      if (_thankYouMessageController.text == oldLabels['footer_thankyou']) {
                        _thankYouMessageController.text = newLabels['footer_thankyou']!;
                      }
                      if (_stampLabelController.text == oldLabels['official_stamp']) {
                        _stampLabelController.text = newLabels['official_stamp']!;
                      }
                      if (_signatureLabelController.text == oldLabels['sig_president']) {
                        _signatureLabelController.text = newLabels['sig_president']!;
                      }

                      _languageCode = val;
                    });
                  }
                },
              ),
            ),

            // ════════════════════════════════════════════
            // 4. BRANDING
            // ════════════════════════════════════════════
            _buildCard(
              icon: Icons.branding_watermark_outlined,
              title: 'Branding',
              child: Column(
                children: [
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Show Organization Logo', style: TextStyle(fontSize: 14)),
                    value: _logoVisible,
                    onChanged: (val) => setState(() => _logoVisible = val),
                  ),
                  const SizedBox(height: 4),
                  _buildUploadRow(
                    label: 'Organization Logo',
                    icon: Icons.image_outlined,
                    type: 'logo',
                    isUploading: _uploadingLogo,
                    currentUrl: org.logoUrl,
                  ),
                  _buildStepperRow(
                    label: 'Organization Logo Size',
                    valueDisplay: '${(_logoScale * 100).round()}%',
                    onDecrement: () => setState(() => _logoScale = (_logoScale - 0.05).clamp(0.6, 1.6)),
                    onIncrement: () => setState(() => _logoScale = (_logoScale + 0.05).clamp(0.6, 1.6)),
                    canDecrement: _logoScale > 0.6,
                    canIncrement: _logoScale < 1.6,
                  ),
                  const SizedBox(height: 8),
                  _buildUploadRow(
                    label: 'Organization Stamp',
                    icon: Icons.verified_outlined,
                    type: 'stamp',
                    isUploading: _uploadingStamp,
                    currentUrl: org.customStampUrl,
                  ),
                  _buildStepperRow(
                    label: 'Organization Stamp Size',
                    valueDisplay: '${(_stampScale * 100).round()}%',
                    onDecrement: () => setState(() => _stampScale = (_stampScale - 0.05).clamp(0.6, 2.0)),
                    onIncrement: () => setState(() => _stampScale = (_stampScale + 0.05).clamp(0.6, 2.0)),
                    canDecrement: _stampScale > 0.6,
                    canIncrement: _stampScale < 2.0,
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF8B1E2D).withValues(alpha: 0.06),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF8B1E2D).withValues(alpha: 0.2)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.verified_user_outlined, color: Color(0xFF8B1E2D), size: 20),
                            SizedBox(width: 8),
                            Text(
                              'Names, Signatures & Sizes',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF8B1E2D)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'President, Treasurer & Secretary names, signatures and signature sizes are managed in Authorized Persons.',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                        ),
                        const SizedBox(height: 10),
                        ElevatedButton.icon(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => AuthorizedSignaturesScreen()),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF8B1E2D),
                            foregroundColor: Colors.white,
                            elevation: 0,
                          ),
                          icon: const Icon(Icons.arrow_forward, size: 16),
                          label: const Text('Manage Authorized Persons'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // ════════════════════════════════════════════
            // 5. THEME
            // ════════════════════════════════════════════
            _buildCard(
              icon: Icons.palette_outlined,
              title: 'Theme',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  DropdownButtonFormField<String>(
                    value: _selectedThemeId,
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                    items: _readyMadeThemes.map((t) {
                      return DropdownMenuItem(
                        value: t['id'],
                        child: Row(
                          children: [
                            Container(
                              width: 16, height: 16,
                              decoration: BoxDecoration(
                                color: _parseColor(t['primary']!),
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.grey.shade400, width: 0.5),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Text(t['name']!),
                          ],
                        ),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        final match = _readyMadeThemes.firstWhere((t) => t['id'] == val);
                        setState(() {
                          _selectedThemeId = val;
                          _primaryColor = match['primary']!;
                          _secondaryColor = match['secondary']!;
                          _bgColor = match['bg']!;
                          _borderColor = match['border']!;
                          _accentColor = match['accent']!;
                        });
                      }
                    },
                  ),
                  const SizedBox(height: 12),
                  // Custom Colors expandable
                  InkWell(
                    onTap: () => setState(() => _customColorsExpanded = !_customColorsExpanded),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          Icon(
                            _customColorsExpanded ? Icons.expand_less : Icons.expand_more,
                            size: 20, color: Colors.grey.shade700,
                          ),
                          const SizedBox(width: 6),
                          Text('Custom Colors', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey.shade700)),
                        ],
                      ),
                    ),
                  ),
                  if (_customColorsExpanded) ...[
                    const SizedBox(height: 8),
                    _buildColorPickerRow('Primary', _primaryColor, (c) => setState(() => _primaryColor = c)),
                    const SizedBox(height: 8),
                    _buildColorPickerRow('Secondary', _secondaryColor, (c) => setState(() => _secondaryColor = c)),
                    const SizedBox(height: 8),
                    _buildColorPickerRow('Accent', _accentColor, (c) => setState(() => _accentColor = c)),
                    const SizedBox(height: 8),
                    _buildColorPickerRow('Background', _bgColor, (c) => setState(() => _bgColor = c)),
                    const SizedBox(height: 8),
                    _buildColorPickerRow('Border', _borderColor, (c) => setState(() => _borderColor = c)),
                  ],
                ],
              ),
            ),

            // ════════════════════════════════════════════
            // 6. WHAT TO SHOW (Grouped 16 Toggles)
            // ════════════════════════════════════════════
            _buildCard(
              icon: Icons.toggle_on_outlined,
              title: 'What to Show',
              child: Column(
                children: [
                  _buildToggleGroup(
                    title: 'Donor Details',
                    expanded: _donorDetailsExpanded,
                    onTap: () => setState(() => _donorDetailsExpanded = !_donorDetailsExpanded),
                    enabledCount: [_showDonorName, _showDonorAddress, _showDonorMobile, _showDonorEmail].where((v) => v).length,
                    totalCount: 4,
                    children: [
                      _buildCompactSwitch('Donor Name', _showDonorName, (v) => setState(() => _showDonorName = v)),
                      _buildCompactSwitch('Address', _showDonorAddress, (v) => setState(() => _showDonorAddress = v)),
                      _buildCompactSwitch('Mobile', _showDonorMobile, (v) => setState(() => _showDonorMobile = v)),
                      _buildCompactSwitch('Email', _showDonorEmail, (v) => setState(() => _showDonorEmail = v)),
                    ],
                  ),
                  const Divider(height: 1),
                  _buildToggleGroup(
                    title: 'Payment Details',
                    expanded: _paymentDetailsExpanded,
                    onTap: () => setState(() => _paymentDetailsExpanded = !_paymentDetailsExpanded),
                    enabledCount: [_showPurpose, _showPaymentMode, _showAmount, _showAmountInWords].where((v) => v).length,
                    totalCount: 4,
                    children: [
                      _buildCompactSwitch('Purpose', _showPurpose, (v) => setState(() => _showPurpose = v)),
                      _buildCompactSwitch('Payment Mode', _showPaymentMode, (v) => setState(() => _showPaymentMode = v)),
                      _buildCompactSwitch('Amount', _showAmount, (v) => setState(() => _showAmount = v)),
                      _buildCompactSwitch('Amount in Words', _showAmountInWords, (v) => setState(() => _showAmountInWords = v)),
                    ],
                  ),
                  const Divider(height: 1),
                  _buildToggleGroup(
                    title: 'Receipt Details',
                    expanded: _receiptDetailsExpanded,
                    onTap: () => setState(() => _receiptDetailsExpanded = !_receiptDetailsExpanded),
                    enabledCount: [_showReceiptNumber, _showDate, _showTime, _showQrCode].where((v) => v).length,
                    totalCount: 4,
                    children: [
                      _buildCompactSwitch('Receipt Number', _showReceiptNumber, (v) => setState(() => _showReceiptNumber = v)),
                      _buildCompactSwitch('Date', _showDate, (v) => setState(() => _showDate = v)),
                      _buildCompactSwitch('Time', _showTime, (v) => setState(() => _showTime = v)),
                      _buildCompactSwitch('Verification QR', _showQrCode, (v) => setState(() => _showQrCode = v)),
                    ],
                  ),
                  const Divider(height: 1),
                  _buildToggleGroup(
                    title: 'Authorization',
                    expanded: _authorizationExpanded,
                    onTap: () => setState(() => _authorizationExpanded = !_authorizationExpanded),
                    enabledCount: [_showSignature, _showStamp].where((v) => v).length,
                    totalCount: 2,
                    children: [
                      _buildCompactSwitch('Signature', _showSignature, (v) => setState(() => _showSignature = v)),
                      _buildCompactSwitch('Stamp', _showStamp, (v) => setState(() => _showStamp = v)),
                    ],
                  ),
                  const Divider(height: 1),
                  _buildToggleGroup(
                    title: 'Additional',
                    expanded: _additionalExpanded,
                    onTap: () => setState(() => _additionalExpanded = !_additionalExpanded),
                    enabledCount: [_showNotes, _showFooter].where((v) => v).length,
                    totalCount: 2,
                    children: [
                      _buildCompactSwitch('Notes', _showNotes, (v) => setState(() => _showNotes = v)),
                      _buildCompactSwitch('Footer', _showFooter, (v) => setState(() => _showFooter = v)),
                    ],
                  ),
                ],
              ),
            ),

            // ════════════════════════════════════════════
            // 7. TEXT & FOOTER
            // ════════════════════════════════════════════
            _buildCard(
              icon: Icons.text_fields,
              title: 'Text & Footer',
              subtitle: 'Customize exact text visible on your receipt.',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildCustomTextEditorField(
                    controller: _topGreetingController,
                    label: 'Top Greeting',
                    helperText: 'Appears at the very top of the receipt canvas',
                    receiptLocationHint: 'Header Top Line',
                    onChanged: () => setState(() {}),
                  ),
                  _buildCustomTextEditorField(
                    controller: _orgNameController,
                    label: 'Organization Name',
                    helperText: 'Appears as the main organization title in the receipt header',
                    receiptLocationHint: 'Header Org Name',
                    onChanged: () => setState(() {}),
                  ),
                  _buildCustomTextEditorField(
                    controller: _subtitleController,
                    label: 'Organization Subtitle',
                    helperText: 'Appears directly below organization title',
                    receiptLocationHint: 'Below Org Name',
                    onChanged: () => setState(() {}),
                  ),
                  _buildCustomTextEditorField(
                    controller: _donorSectionTitleController,
                    label: 'Donor Section Title',
                    helperText: 'Appears on the pill above donor details card',
                    receiptLocationHint: 'Donor Details Pill',
                    onChanged: () => setState(() {}),
                  ),
                  _buildCustomTextEditorField(
                    controller: _donationSectionTitleController,
                    label: 'Donation Section Title',
                    helperText: 'Appears on the pill above donation table card',
                    receiptLocationHint: 'Donation Table Pill',
                    onChanged: () => setState(() {}),
                  ),
                  _buildCustomTextEditorField(
                    controller: _paymentSectionTitleController,
                    label: 'Payment Section Title',
                    helperText: 'Appears on the pill above payment mode chips',
                    receiptLocationHint: 'Payment Methods Pill',
                    onChanged: () => setState(() {}),
                  ),
                  _buildCustomTextEditorField(
                    controller: _notesSectionTitleController,
                    label: 'Notes Section Title',
                    helperText: 'Appears inside the notes/remarks card',
                    receiptLocationHint: 'Notes Section Header',
                    onChanged: () => setState(() {}),
                  ),
                  _buildCustomTextEditorField(
                    controller: _thankYouMessageController,
                    label: 'Thank-You Message',
                    helperText: 'Appears at the bottom gratitude footer bar',
                    receiptLocationHint: 'Footer Gratitude Bar',
                    onChanged: () => setState(() {}),
                  ),
                  _buildCustomTextEditorField(
                    controller: _stampLabelController,
                    label: 'Official Stamp Label',
                    helperText: 'Appears below official organization stamp',
                    receiptLocationHint: 'Below Seal / Stamp',
                    onChanged: () => setState(() {}),
                  ),
                  _buildCustomTextEditorField(
                    controller: _signatureLabelController,
                    label: 'Signature Label',
                    helperText: 'Appears below authority signature line',
                    receiptLocationHint: 'Below Signature Line',
                    onChanged: () => setState(() {}),
                  ),
                  _buildCustomTextEditorField(
                    controller: _customNoteController,
                    label: 'Custom Note / Message',
                    helperText: 'Optional extra note line inside notes box',
                    receiptLocationHint: 'Optional Note Line',
                    onChanged: () => setState(() {}),
                  ),
                ],
              ),
            ),

            // ════════════════════════════════════════════
            // 8. ADVANCED
            // ════════════════════════════════════════════
            _buildCard(
              icon: Icons.tune,
              title: 'Advanced Options',
              collapsed: !_advancedExpanded,
              onHeaderTap: () => setState(() => _advancedExpanded = !_advancedExpanded),
              child: _advancedExpanded
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // 1. Font Family
                        Text('Typography & Text Sizes', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.grey.shade800)),
                        const SizedBox(height: 8),
                        DropdownButtonFormField<String>(
                          value: _fontFamilies.contains(_fontFamily) ? _fontFamily : _fontFamilies.first,
                          decoration: const InputDecoration(
                            labelText: 'Font Family',
                            border: OutlineInputBorder(),
                            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                          items: _fontFamilies.map((f) => DropdownMenuItem(value: f, child: Text(f))).toList(),
                          onChanged: (val) { if (val != null) setState(() => _fontFamily = val); },
                        ),
                        const SizedBox(height: 12),

                        // 2. Heading Size
                        _buildSlider('Heading Size', _headingSize, 12.0, 24.0, (v) => setState(() => _headingSize = v)),

                        // 3. Body Text Size
                        _buildSlider('Body Text Size', _bodySize, 7.0, 14.0, (v) => setState(() => _bodySize = v)),

                        // 4. Amount Text Size
                        _buildSlider('Amount Text Size', _amountSize, 14.0, 32.0, (v) => setState(() => _amountSize = v)),
                        const SizedBox(height: 8),

                        // 5. Font Weight
                        Row(
                          children: [
                            Text('Font Weight:', style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
                            const SizedBox(width: 8),
                            ChoiceChip(
                              label: const Text('Normal'),
                              selected: _fontWeight == 'normal',
                              onSelected: (s) { if (s) setState(() => _fontWeight = 'normal'); },
                            ),
                            const SizedBox(width: 6),
                            ChoiceChip(
                              label: const Text('Medium'),
                              selected: _fontWeight == 'medium',
                              onSelected: (s) { if (s) setState(() => _fontWeight = 'medium'); },
                            ),
                            const SizedBox(width: 6),
                            ChoiceChip(
                              label: const Text('Bold'),
                              selected: _fontWeight == 'bold',
                              onSelected: (s) { if (s) setState(() => _fontWeight = 'bold'); },
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const Divider(),
                        const SizedBox(height: 8),

                        // 6. Watermark Opacity
                        Text('Branding & Opacity', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.grey.shade800)),
                        const SizedBox(height: 8),
                        _buildSlider('Watermark Opacity', _watermarkOpacity * 100, 0, 20,
                            (v) => setState(() => _watermarkOpacity = v / 100), suffix: '%'),
                        const SizedBox(height: 16),
                        const Divider(),
                        const SizedBox(height: 8),

                        // 7. Custom Colors
                        Text('Custom Colors', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.grey.shade800)),
                        const SizedBox(height: 8),
                        _buildColorPickerRow('Primary Color', _primaryColor, (c) => setState(() => _primaryColor = c)),
                        const SizedBox(height: 8),
                        _buildColorPickerRow('Secondary Color', _secondaryColor, (c) => setState(() => _secondaryColor = c)),
                        const SizedBox(height: 8),
                        _buildColorPickerRow('Accent Color', _accentColor, (c) => setState(() => _accentColor = c)),
                        const SizedBox(height: 8),
                        _buildColorPickerRow('Background Color', _bgColor, (c) => setState(() => _bgColor = c)),
                        const SizedBox(height: 8),
                        _buildColorPickerRow('Border Color', _borderColor, (c) => setState(() => _borderColor = c)),
                        const SizedBox(height: 16),
                        const Divider(),
                        const SizedBox(height: 8),

                        // Header & Important Text Sizes (10 Header Steppers)
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Header & Important Text Sizes',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.grey.shade800),
                            ),
                            OutlinedButton.icon(
                              onPressed: () {
                                setState(() {
                                  for (final cat in ReceiptTypographyConfig.headerCategories) {
                                    _customTextSizes[cat.key] = cat.defaultSize;
                                  }
                                });
                              },
                              icon: const Icon(Icons.restart_alt, size: 16),
                              label: const Text('Reset to Default', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                visualDensity: VisualDensity.compact,
                                side: BorderSide(color: Colors.deepOrange.shade600),
                                foregroundColor: Colors.deepOrange.shade700,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ...ReceiptTypographyConfig.headerCategories.map((cat) {
                          final current = ReceiptTypographyConfig.getResolvedFontSize(
                            categoryKey: cat.key,
                            customTextSizes: _customTextSizes,
                            globalHeadingSize: _headingSize,
                            globalBodySize: _bodySize,
                            globalAmountSize: _amountSize,
                          );

                          return _buildStepperRow(
                            label: cat.label,
                            valueDisplay: '${current.round()} px',
                            onDecrement: () {
                              setState(() {
                                double next = (current - 1.0).clamp(cat.minSize, cat.maxSize);
                                _customTextSizes[cat.key] = next;
                              });
                            },
                            onIncrement: () {
                              setState(() {
                                double next = (current + 1.0).clamp(cat.minSize, cat.maxSize);
                                _customTextSizes[cat.key] = next;
                              });
                            },
                            canDecrement: current > cat.minSize,
                            canIncrement: current < cat.maxSize,
                          );
                        }),
                      ],
                    )
                  : null,
            ),

            // ════════════════════════════════════════════
            // 9. SAVE TEMPLATE
            // ════════════════════════════════════════════
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              child: SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: _isSaving ? null : _saveCustomization,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _parseColor(_primaryColor),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 2,
                  ),
                  icon: _isSaving
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.save),
                  label: const Text('SAVE TEMPLATE', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1)),
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  ],
),
),
);
  }

  // ======================================================================
  // HELPER WIDGETS
  // ======================================================================

  /// Standard card wrapper for each section.
  Widget _buildCard({
    required IconData icon,
    required String title,
    String? subtitle,
    Widget? child,
    bool collapsed = false,
    VoidCallback? onHeaderTap,
  }) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 6, 12, 6),
      child: Card(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: BorderSide(color: Colors.grey.shade200),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              InkWell(
                onTap: onHeaderTap,
                child: Row(
                  children: [
                    Icon(icon, size: 18, color: Colors.grey.shade700),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                    ),
                    if (onHeaderTap != null)
                      Icon(collapsed ? Icons.expand_more : Icons.expand_less, size: 20, color: Colors.grey.shade600),
                  ],
                ),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 4),
                Text(subtitle, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
              ],
              if (child != null) ...[
                const SizedBox(height: 12),
                child,
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildUploadRow({
    required String label,
    required IconData icon,
    required String type,
    required bool isUploading,
    required String? currentUrl,
    VoidCallback? onRemove,
  }) {
    final hasUrl = currentUrl != null && currentUrl.trim().isNotEmpty;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: hasUrl ? Colors.green.shade300 : Colors.grey.shade300,
          width: 1,
        ),
      ),
      child: Row(
        children: [
          if (hasUrl) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: Image.network(
                currentUrl,
                width: 34,
                height: 34,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Icon(icon, size: 20, color: Colors.grey),
              ),
            ),
            const SizedBox(width: 10),
          ] else ...[
            Icon(icon, size: 20, color: Colors.black54),
            const SizedBox(width: 10),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.black87),
                ),
                Text(
                  hasUrl ? 'Uploaded & saved' : 'No image uploaded',
                  style: TextStyle(
                    fontSize: 11,
                    color: hasUrl ? Colors.green.shade800 : Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              ElevatedButton(
                onPressed: isUploading ? null : () => _pickAndUploadBrandingImage(type),
                style: ElevatedButton.styleFrom(
                  backgroundColor: hasUrl ? Colors.white : Theme.of(context).primaryColor,
                  foregroundColor: hasUrl ? Colors.black87 : Colors.white,
                  elevation: hasUrl ? 0 : 1,
                  side: hasUrl ? BorderSide(color: Colors.grey.shade300) : BorderSide.none,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                ),
                child: isUploading
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(
                        hasUrl ? 'Change' : 'Upload',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                      ),
              ),
              if (hasUrl && onRemove != null) ...[
                const SizedBox(width: 6),
                OutlinedButton(
                  onPressed: isUploading ? null : onRemove,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red.shade700,
                    side: BorderSide(color: Colors.red.shade300),
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                  ),
                  child: const Text('Remove', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildColorPickerRow(String label, String currentHex, Function(String) onSelect) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        SizedBox(
          width: 72,
          child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
        ),
        Expanded(
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _paletteOptions.map((hex) {
                final isSelected = currentHex == hex;
                return GestureDetector(
                  onTap: () => onSelect(hex),
                  child: Container(
                    margin: const EdgeInsets.only(right: 5),
                    width: 24, height: 24,
                    decoration: BoxDecoration(
                      color: _parseColor(hex),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: isSelected ? Colors.black87 : Colors.grey.shade300,
                        width: isSelected ? 2.5 : 1,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ],
    );
  }

  /// Expandable toggle group for "What to Show".
  Widget _buildToggleGroup({
    required String title,
    required bool expanded,
    required VoidCallback onTap,
    required int enabledCount,
    required int totalCount,
    required List<Widget> children,
  }) {
    return Column(
      children: [
        InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Row(
              children: [
                Expanded(
                  child: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: enabledCount == totalCount ? Colors.green.shade50 : Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$enabledCount of $totalCount',
                    style: TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w600,
                      color: enabledCount == totalCount ? Colors.green.shade800 : Colors.orange.shade800,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Icon(expanded ? Icons.expand_less : Icons.expand_more, size: 20, color: Colors.grey.shade600),
              ],
            ),
          ),
        ),
        if (expanded)
          Padding(
            padding: const EdgeInsets.only(left: 8, bottom: 4),
            child: Column(children: children),
          ),
      ],
    );
  }

  Widget _buildCompactSwitch(String label, bool value, ValueChanged<bool> onChanged) {
    return SwitchListTile(
      contentPadding: EdgeInsets.zero,
      dense: true,
      title: Text(label, style: const TextStyle(fontSize: 13)),
      value: value,
      onChanged: onChanged,
    );
  }

  Widget _buildSlider(String label, double value, double min, double max, ValueChanged<double> onChanged, {String suffix = ''}) {
    return _IsolatedSlider(
      label: label,
      initialValue: value,
      min: min,
      max: max,
      onChanged: onChanged,
      suffix: suffix,
    );
  }

  Widget _buildCustomTextEditorField({
    required TextEditingController controller,
    required String label,
    required String helperText,
    required String receiptLocationHint,
    required VoidCallback onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF37474F),
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: Colors.orange.shade200, width: 0.8),
                ),
                child: Text(
                  receiptLocationHint,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: Colors.deepOrange.shade800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            helperText,
            style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 6),
          TextFormField(
            controller: controller,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              isDense: true,
            ),
            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600),
            onChanged: (_) => onChanged(),
          ),
        ],
      ),
    );
  }

  Widget _buildStepperRow({
    required String label,
    required String valueDisplay,
    required VoidCallback onDecrement,
    required VoidCallback onIncrement,
    bool canDecrement = true,
    bool canIncrement = true,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ),
          Container(
            height: 34,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.shade300),
              borderRadius: BorderRadius.circular(8),
              color: Colors.grey.shade50,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.remove, size: 16),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                  onPressed: canDecrement ? onDecrement : null,
                ),
                Container(
                  constraints: const BoxConstraints(minWidth: 54),
                  alignment: Alignment.center,
                  child: Text(
                    valueDisplay,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.add, size: 16),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                  onPressed: canIncrement ? onIncrement : null,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }



  Color _parseColor(String hex) {
    try {
      final buffer = StringBuffer();
      if (hex.length == 6 || hex.length == 7) buffer.write('ff');
      buffer.write(hex.replaceFirst('#', ''));
      return Color(int.parse(buffer.toString(), radix: 16));
    } catch (_) {
      return Colors.blueGrey;
    }
  }
}

class _IsolatedSlider extends StatefulWidget {
  final String label;
  final double initialValue;
  final double min;
  final double max;
  final ValueChanged<double> onChanged;
  final String suffix;

  const _IsolatedSlider({
    required this.label,
    required this.initialValue,
    required this.min,
    required this.max,
    required this.onChanged,
    this.suffix = '',
  });

  @override
  State<_IsolatedSlider> createState() => _IsolatedSliderState();
}

class _IsolatedSliderState extends State<_IsolatedSlider> {
  late double _val;

  @override
  void initState() {
    super.initState();
    _val = widget.initialValue;
  }

  @override
  void didUpdateWidget(covariant _IsolatedSlider oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialValue != widget.initialValue) {
      _val = widget.initialValue;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 100,
          child: Text(
            '${widget.label} (${_val.toStringAsFixed(widget.suffix == '%' ? 0 : 1)}${widget.suffix})',
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
          ),
        ),
        Expanded(
          child: Slider(
            value: _val.clamp(widget.min, widget.max),
            min: widget.min,
            max: widget.max,
            divisions: ((widget.max - widget.min) * 2).round(),
            onChanged: (v) {
              setState(() => _val = v);
              widget.onChanged(v);
            },
          ),
        ),
      ],
    );
  }
}
