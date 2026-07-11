import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:http/http.dart' as http;
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../models/models.dart';
import '../widgets/traditional_receipt_widget.dart';
import '../services/sharing_service.dart';
import '../services/receipt_image_service.dart';
import '../widgets/shimmer_skeleton.dart';
import '../widgets/confetti_painter.dart';
import '../widgets/delayed_loader.dart';

class ReceiptPreviewScreen extends StatefulWidget {
  const ReceiptPreviewScreen({super.key});

  @override
  State<ReceiptPreviewScreen> createState() => _ReceiptPreviewScreenState();
}

class _ReceiptPreviewScreenState extends State<ReceiptPreviewScreen> {
  final GlobalKey _receiptKey = GlobalKey();
  bool _isSending = false;
  ReceiptModel? _currentReceipt;
  ReceiptModel? _originalReceipt;
  bool _isDraft = false;
  bool _showSuccessOverlay = false;
  bool _showConfetti = false;
  int? _celebrationMilestone;
  bool _shareSuccess = false;
  bool _hasCheckedMilestone = false;
  bool _showSharedSuccessfullyOverlay = false;
  bool _isAutoSending = false;
  String _autoSendStep = 'Preparing your receipt...';



  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_currentReceipt == null) {
      final args = ModalRoute.of(context)!.settings.arguments;
      if (args is ReceiptModel) {
        _currentReceipt = args;
        _originalReceipt = args;
      } else if (args is Map<String, dynamic>) {
        _currentReceipt = args['receipt'] as ReceiptModel;
        _originalReceipt = _currentReceipt;
        final action = args['action'] as String?;
        final isNew = args['isNew'] as bool? ?? false;

        if (isNew && !_hasCheckedMilestone) {
          _hasCheckedMilestone = true; // prevent repeated triggers
          final auth = Provider.of<AuthProvider>(context, listen: false);
          final whatsappAutoSend = auth.organization?.whatsappAutoSend ?? true;

          if (whatsappAutoSend) {
            _isAutoSending = true;
            _autoSendStep = 'Preparing receipt...';
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _runAutomaticWhatsAppFlow();
            });
          } else {
            _showSuccessOverlay = true;
            HapticFeedback.heavyImpact();
            Timer(const Duration(milliseconds: 1400), () {
              if (mounted) {
                setState(() {
                  _showSuccessOverlay = false;
                });
                _checkAndCelebrateMilestone();
              }
            });
          }
        }

        if (action != null) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _handleAction(action);
          });
        }
      }
    }
  }

  void _handleAction(String action) {
    if (_currentReceipt == null) return;
    if (action == 'edit') {
      _showEditDialog(context, _currentReceipt!);
    } else if (action == 'share_jpg') {
      _shareJpg(_currentReceipt!);
    } else if (action == 'share_pdf') {
      _sharePdf(_currentReceipt!);
    } else if (action == 'confirm_payment') {
      _confirmPayment(context, _currentReceipt!);
    } else if (action == 'share_request') {
      _sharePaymentRequest(
          _currentReceipt!,
          Provider.of<AuthProvider>(context, listen: false)
                  .organization
                  ?.name ??
              'PavtiBook');
    }
  }

  ReceiptModel copyReceiptWith(
    ReceiptModel receipt, {
    String? donorName,
    String? donorMobile,
    String? donorAddress,
    String? purpose,
  }) {
    return ReceiptModel(
      id: receipt.id,
      organizationId: receipt.organizationId,
      templateId: receipt.templateId,
      donorId: receipt.donorId,
      collectorId: receipt.collectorId,
      receiptNumber: receipt.receiptNumber,
      amount: receipt.amount,
      purpose: purpose ?? receipt.purpose,
      paymentMode: receipt.paymentMode,
      paymentStatus: receipt.paymentStatus,
      qrCodeValue: receipt.qrCodeValue,
      createdAt: receipt.createdAt,
      donorName: donorName ?? receipt.donorName,
      donorMobile: donorMobile ?? receipt.donorMobile,
      collectorName: receipt.collectorName,
      donorAddress: donorAddress ?? receipt.donorAddress,
      headerLogoUrl: receipt.headerLogoUrl,
      leftSideImageUrl: receipt.leftSideImageUrl,
      rightSideImageUrl: receipt.rightSideImageUrl,
      customStampUrl: receipt.customStampUrl,
      footerText: receipt.footerText,
      signatureUrl: receipt.signatureUrl,
      collectorRole: receipt.collectorRole,
      organizationName: receipt.organizationName,
      organizationLogoUrl: receipt.organizationLogoUrl,
      leftImageUrl: receipt.leftImageUrl,
      rightImageUrl: receipt.rightImageUrl,
      stampUrl: receipt.stampUrl,
      collectorSignatureUrl: receipt.collectorSignatureUrl,
      editedAt: receipt.editedAt,
      editedBy: receipt.editedBy,
      confirmedByUserId: receipt.confirmedByUserId,
      confirmedByName: receipt.confirmedByName,
      confirmedAt: receipt.confirmedAt,
      lastReminderAttemptAt: receipt.lastReminderAttemptAt,
      reminderAttemptCount: receipt.reminderAttemptCount,
      receiptThemeId: receipt.receiptThemeId,
    );
  }

  String _buildShareText(ReceiptModel receipt, String orgName) {
    return 'Hello! Here is your digital receipt from $orgName:\n'
        'Receipt No: ${receipt.receiptNumber}\n'
        'Amount: ₹${receipt.amount.toStringAsFixed(0)}\n'
        'Purpose: ${receipt.purpose}\n'
        'Verify receipt here: https://pavtibook.in/verify/${receipt.qrCodeValue}';
  }

  Future<void> _sharePdf(ReceiptModel receipt) async {
    if (_isSending) return;
    setState(() => _isSending = true);
    final fileName = 'receipt_${receipt.receiptNumber}.pdf';
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final tempProvider = Provider.of<TemplateProvider>(context, listen: false);

    TemplateModel activeTemplate;
    if (tempProvider.templates.isNotEmpty) {
      activeTemplate = tempProvider.templates.firstWhere(
        (t) => t.id == receipt.templateId,
        orElse: () => tempProvider.templates.firstWhere(
          (t) => t.isDefault,
          orElse: () => tempProvider.templates.first,
        ),
      );
    } else {
      activeTemplate = TemplateModel(
        id: '',
        organizationId: receipt.organizationId,
        name: 'Fallback Classic',
        type: 'traditional',
        bgColor: '#FFFDD0',
        borderStyle: 'double',
        borderColor: '#E65100',
        fontFamily: 'Poppins',
        fontColor: '#3E2723',
        logoVisible: true,
        godImagePosition: 'left',
        watermarkOpacity: 0.08,
        signatureLabel: 'Treasurer',
        isDefault: true,
      );
    }

    final date = receipt.createdAt.contains('T')
        ? receipt.createdAt.split('T').first
        : receipt.createdAt;

    String dateStr = date;
    try {
      final parsedDate = DateTime.tryParse(receipt.createdAt);
      if (parsedDate != null) {
        dateStr =
            "${parsedDate.day.toString().padLeft(2, '0')}/${parsedDate.month.toString().padLeft(2, '0')}/${parsedDate.year}";
      }
    } catch (_) {}

    final success = await SharingService.sharePdfDirectly(
      templateType: activeTemplate.type,
      receiptId: receipt.id,
      fileName: fileName,
      receiptNumber: receipt.receiptNumber,
      orgName:
          receipt.organizationName ?? auth.organization?.name ?? 'PavtiBook',
      donorName: receipt.donorName ?? 'Guest Donor',
      amount: receipt.amount,
      purpose: receipt.purpose,
      date: dateStr,
      paymentMode: receipt.paymentMode,
      paymentStatus: receipt.paymentStatus,
      qrCodeValue: receipt.qrCodeValue,
      signatureLabel: receipt.collectorRole ?? activeTemplate.signatureLabel,
      headerTextLocal: activeTemplate.headerTextLocal,
      headerTextEn: activeTemplate.headerTextEn,
      headerLogoUrl: receipt.headerLogoUrl ?? receipt.organizationLogoUrl,
      leftSideImageUrl: receipt.leftSideImageUrl ?? receipt.leftImageUrl,
      rightSideImageUrl: receipt.rightSideImageUrl ?? receipt.rightImageUrl,
      customStampUrl: receipt.customStampUrl ?? receipt.stampUrl,
      signatureUrl: receipt.signatureUrl ?? receipt.collectorSignatureUrl,
      footerText: receipt.footerText,
      collectorName: receipt.collectorName,
      text: "🙏 नमस्कार ${receipt.donorName ?? 'देणगीदार'}\n\n"
          "आपली ₹${receipt.amount.toStringAsFixed(0)} वर्गणी यशस्वीरित्या प्राप्त झाली आहे.\n\n"
          "🧾 Receipt No:\n${receipt.receiptNumber}\n\n"
          "🏛 Organization:\n${receipt.organizationName ?? auth.organization?.name ?? 'PavtiBook'}\n\n"
          "धन्यवाद.",
      receiptThemeId:
          receipt.receiptThemeId ?? auth.organization?.receiptThemeId,
      brandPrimaryColorHex: activeTemplate.borderColor,
    );

    if (!mounted) return;
    final rp = Provider.of<ReceiptProvider>(context, listen: false);
    await rp.deliverReceipt(receipt.id, 'system', 'system_share',
        status: success ? 'success' : 'failed', shareMethod: 'share_pdf');

    if (mounted) {
      setState(() => _isSending = false);
    }
  }

  Future<File> _getOrGenerateReceiptJpg(ReceiptModel receipt) async {
    final tempDir = await getTemporaryDirectory();
    final cacheDir = Directory('${tempDir.path}/receipt_cache');
    if (!await cacheDir.exists()) {
      await cacheDir.create(recursive: true);
    }
    final file = File('${cacheDir.path}/${receipt.id}.jpg');

    // 1. Check local cache validation
    if (await file.exists()) {
      return file;
    }

    // 2. Check if receiptImageUrl exists on receipt model
    if (receipt.receiptImageUrl != null && receipt.receiptImageUrl!.isNotEmpty) {
      try {
        final res = await http.get(Uri.parse(receipt.receiptImageUrl!));
        if (res.statusCode == 200) {
          await file.writeAsBytes(res.bodyBytes);
          return file;
        }
      } catch (e) {
        debugPrint("Error downloading existing receiptImageUrl: $e");
      }
    }

    // 3. Try downloading if it already exists in Firebase Storage
    String? downloadUrl;
    try {
      final storageRef = FirebaseStorage.instance
          .ref()
          .child('receipt_images')
          .child('${receipt.id}.jpg');
      downloadUrl = await storageRef.getDownloadURL();
    } catch (_) {}

    if (downloadUrl != null && downloadUrl.isNotEmpty) {
      final res = await http.get(Uri.parse(downloadUrl));
      if (res.statusCode == 200) {
        await file.writeAsBytes(res.bodyBytes);
        return file;
      }
    }

    // Generate/capture using TraditionalReceiptWidget
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final tempProvider = Provider.of<TemplateProvider>(context, listen: false);
    TemplateModel activeTemplate;
    if (tempProvider.templates.isNotEmpty) {
      activeTemplate = tempProvider.templates.firstWhere(
        (t) => t.id == receipt.templateId,
        orElse: () => tempProvider.templates.firstWhere(
          (t) => t.isDefault,
          orElse: () => tempProvider.templates.first,
        ),
      );
    } else {
      activeTemplate = TemplateModel(
        id: '',
        organizationId: receipt.organizationId,
        name: 'Fallback Classic',
        type: 'traditional',
        bgColor: '#FFFDD0',
        borderStyle: 'double',
        borderColor: '#E65100',
        fontFamily: 'Poppins',
        fontColor: '#3E2723',
        logoVisible: true,
        godImagePosition: 'left',
        watermarkOpacity: 0.08,
        signatureLabel: 'Treasurer',
        isDefault: true,
      );
    }

    try {
      // Pre-cache all network images
      await ReceiptImageService.precacheReceiptImages(
        context: context,
        receipt: receipt,
        organization: auth.organization!,
        template: activeTemplate,
      );

      final jpgBytes = await ReceiptImageService.captureReceiptWidget(_receiptKey);
      await file.writeAsBytes(jpgBytes);
      return file;
    } catch (captureError) {
      debugPrint("ReceiptPreviewScreen: Image capture/generation failed: $captureError");
      throw Exception("Unable to generate receipt image. Please try again.");
    }
  }

  Future<void> _shareJpg(ReceiptModel receipt) async {
    if (_isSending) return;
    final orgName =
        Provider.of<AuthProvider>(context, listen: false).organization?.name ??
            'PavtiBook';
    setState(() => _isSending = true);
    try {
      final file = await _getOrGenerateReceiptJpg(receipt);

      final donorName = receipt.donorName ?? "देणगीदार";
      final caption = "🙏 नमस्कार $donorName\n\n"
          "आपली ₹${receipt.amount.toStringAsFixed(0)} वर्गणी यशस्वीरित्या प्राप्त झाली आहे.\n\n"
          "🧾 Receipt No:\n${receipt.receiptNumber}\n\n"
          "🏛 Organization:\n$orgName\n\n"
          "धन्यवाद.";

      await Share.shareXFiles(
        [XFile(file.path, mimeType: 'image/jpeg')],
        text: caption,
      );

      if (mounted) {
        final rp = Provider.of<ReceiptProvider>(context, listen: false);
        await rp.deliverReceipt(receipt.id, 'system', 'system_share',
            status: 'success', shareMethod: 'share_jpg');
        _triggerShareSuccess();
      }
    } catch (e) {
      debugPrint('JPG share error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to share image: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
      }
    }
  }

  Future<void> _saveJpgLocally(ReceiptModel receipt) async {
    if (_isSending) return;
    setState(() => _isSending = true);
    try {
      final localFile = await _getOrGenerateReceiptJpg(receipt);

      final fileName = 'receipt_${receipt.receiptNumber}.jpg';
      Directory? downloadDir;
      if (Platform.isAndroid) {
        final dir = Directory('/storage/emulated/0/Download');
        if (await dir.exists()) {
          downloadDir = dir;
        }
      }
      downloadDir ??= await getExternalStorageDirectory();
      downloadDir ??= await getApplicationDocumentsDirectory();

      final destinationFile = File('${downloadDir.path}/$fileName');
      await destinationFile.writeAsBytes(await localFile.readAsBytes());

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('JPG saved successfully to:\n${destinationFile.path}'),
              duration: const Duration(seconds: 5)),
        );
      }
    } catch (e) {
      debugPrint('Save JPG error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save image: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
      }
    }
  }

  Future<void> _shareReceipt(BuildContext context, ReceiptModel receipt,
      String orgName, String channel, String defaultAddress) async {
    final addressController = TextEditingController(text: defaultAddress);

    final label = channel == 'whatsapp'
        ? 'WhatsApp Number'
        : channel == 'sms'
            ? 'Mobile Number'
            : 'Email Address';

    final keyboard =
        channel == 'email' ? TextInputType.emailAddress : TextInputType.phone;

    showDialog(
      context: context,
      builder: (cxt) => AlertDialog(
        title: Text('Share via ${channel.toUpperCase()}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Confirm donor details to share receipt link:'),
            const SizedBox(height: 12),
            TextField(
              controller: addressController,
              keyboardType: keyboard,
              decoration: InputDecoration(
                labelText: label,
                border: const OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(cxt),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(cxt);
              if (_isSending) return;
              setState(() => _isSending = true);

              final rp = Provider.of<ReceiptProvider>(context, listen: false);
              final messenger = ScaffoldMessenger.of(context);
              final recipient = addressController.text.trim();
              final text = _buildShareText(receipt, orgName);

              bool success = false;
              String method = 'share_sheet';
              String targetChannel = channel;

              if (channel == 'whatsapp') {
                final isWhatsApp = await SharingService.isWhatsAppInstalled();
                if (isWhatsApp) {
                  method = 'whatsapp_native';
                  success = await SharingService.shareViaWhatsAppNative(
                      recipient, text);
                } else {
                  method = 'share_sheet';
                  targetChannel = 'system';
                  await SharingService.shareViaSystemShareSheet(text);
                  success = true;
                }
              } else {
                method = 'share_sheet';
                targetChannel = 'system';
                await SharingService.shareViaSystemShareSheet(text);
                success = true;
              }

              await rp.deliverReceipt(receipt.id, targetChannel,
                  recipient.isEmpty ? 'system_share' : recipient,
                  status: success ? 'success' : 'failed', shareMethod: method);

              if (mounted) {
                setState(() => _isSending = false);
                if (channel == 'whatsapp' &&
                    success &&
                    rp.collectorMode &&
                    rp.collectorAutoNext) {
                  _handleSuccessfulWhatsAppShare();
                } else {
                  messenger.showSnackBar(
                    SnackBar(
                      content: Text(
                        success
                            ? 'Receipt shared successfully!'
                            : 'Failed to share receipt.',
                      ),
                    ),
                  );
                }
              }
            },
            child: const Text('Send'),
          ),
        ],
      ),
    );
  }

  void _handleSuccessfulWhatsAppShare() {
    final rp = Provider.of<ReceiptProvider>(context, listen: false);
    if (rp.collectorMode && rp.collectorAutoNext) {
      setState(() {
        _showSharedSuccessfullyOverlay = true;
      });
      Timer(const Duration(milliseconds: 400), () {
        if (mounted) {
          setState(() {
            _showSharedSuccessfullyOverlay = false;
          });
          Navigator.pushReplacementNamed(context, '/create-receipt');
        }
      });
    }
  }

  Future<void> _runAutomaticWhatsAppFlow() async {
    final receipt = _currentReceipt!;
    try {
      setState(() {
        _autoSendStep = 'Generating receipt image...';
      });

      final localFile = await _getOrGenerateReceiptJpg(receipt);
      final jpgBytes = await localFile.readAsBytes();

      setState(() {
        _autoSendStep = 'Uploading to storage...';
      });

      // Upload to Firebase Storage
      final storageRef = FirebaseStorage.instance
          .ref()
          .child('receipt_images')
          .child('${receipt.id}.jpg');

      await storageRef.putData(
        jpgBytes,
        SettableMetadata(contentType: 'image/jpeg'),
      );

      final downloadUrl = await storageRef.getDownloadURL();
      await FirebaseFirestore.instance
          .collection('receipts')
          .doc(receipt.id)
          .update({
        'receiptImagePath': 'receipt_images/${receipt.id}.jpg',
        'receiptImageUrl': downloadUrl,
        'whatsappMediaStatus': 'processing',
      });

      setState(() {
        _autoSendStep = 'Sending WhatsApp notification...';
      });

      // Trigger WhatsApp Media Send
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) throw Exception("User is not authenticated.");
      final idToken = await user.getIdToken();

      final projectId = Firebase.app().options.projectId;
      final url =
          'https://asia-south1-$projectId.cloudfunctions.net/sendReceiptMediaWhatsapp';
      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $idToken',
        },
        body: '{"data": {"receiptId": "${receipt.id}", "mediaType": "image"}}',
      );

      if (response.statusCode == 200) {
        if (mounted) {
          Navigator.pushReplacementNamed(
            context,
            '/receipt-success',
            arguments: {
              'receipt': receipt,
              'whatsappStatus': true,
            },
          );
        }
      } else {
        throw Exception(
            'WhatsApp delivery failed (Status ${response.statusCode}): ${response.body}');
      }
    } catch (e) {
      debugPrint('Automatic WhatsApp flow failed: $e');
      if (mounted) {
        Navigator.pushReplacementNamed(
          context,
          '/receipt-success',
          arguments: {
            'receipt': receipt,
            'whatsappStatus': false,
            'error': e.toString().replaceAll('Exception: ', ''),
          },
        );
      }
    }
  }



  void _downloadPdfLink(ReceiptModel receipt) async {
    String pdfUrl = '';
    try {
      pdfUrl = await DelayedLoader.run<String>(
        context: context,
        message: "Fetching PDF URL...",
        operation: () async {
          final ref = FirebaseStorage.instance
              .ref()
              .child('receipt_pdfs')
              .child('${receipt.id}.pdf');
          return await ref.getDownloadURL();
        },
      );
    } catch (e) {
      pdfUrl = 'URL not generated yet or offline storage upload delayed.';
    }

    if (mounted) {
      showDialog(
        context: context,
        builder: (cxt) => AlertDialog(
          title: const Text('PDF Receipt Engine'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Download and Print traditional receipt PDF:'),
              const SizedBox(height: 16),
              SelectableText(
                pdfUrl,
                style: const TextStyle(
                    fontSize: 12,
                    color: Colors.blueGrey,
                    fontStyle: FontStyle.italic),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(cxt),
              child: const Text('Close'),
            ),
            ElevatedButton.icon(
              onPressed: () async {
                Navigator.pop(cxt);
                final auth = Provider.of<AuthProvider>(context, listen: false);
                final tempProvider =
                    Provider.of<TemplateProvider>(context, listen: false);
                TemplateModel activeTemplate;
                if (tempProvider.templates.isNotEmpty) {
                  activeTemplate = tempProvider.templates.firstWhere(
                    (t) => t.id == receipt.templateId,
                    orElse: () => tempProvider.templates.firstWhere(
                      (t) => t.isDefault,
                      orElse: () => tempProvider.templates.first,
                    ),
                  );
                } else {
                  activeTemplate = TemplateModel(
                    id: '',
                    organizationId: receipt.organizationId,
                    name: 'Fallback Classic',
                    type: 'traditional',
                    bgColor: '#FFFDD0',
                    borderStyle: 'double',
                    borderColor: '#E65100',
                    fontFamily: 'Poppins',
                    fontColor: '#3E2723',
                    logoVisible: true,
                    godImagePosition: 'left',
                    watermarkOpacity: 0.08,
                    signatureLabel: 'Treasurer',
                    isDefault: true,
                  );
                }

                final date = receipt.createdAt.contains('T')
                    ? receipt.createdAt.split('T').first
                    : receipt.createdAt;

                String dateStr = date;
                try {
                  final parsedDate = DateTime.tryParse(receipt.createdAt);
                  if (parsedDate != null) {
                    dateStr =
                        "${parsedDate.day.toString().padLeft(2, '0')}/${parsedDate.month.toString().padLeft(2, '0')}/${parsedDate.year}";
                  }
                } catch (_) {}

                final savedPath = await SharingService.savePdfLocally(
                  templateType: activeTemplate.type,
                  receiptNumber: receipt.receiptNumber,
                  orgName: receipt.organizationName ??
                      auth.organization?.name ??
                      'PavtiBook',
                  donorName: receipt.donorName ?? 'Guest Donor',
                  amount: receipt.amount,
                  purpose: receipt.purpose,
                  date: dateStr,
                  paymentMode: receipt.paymentMode,
                  paymentStatus: receipt.paymentStatus,
                  qrCodeValue: receipt.qrCodeValue,
                  signatureLabel:
                      receipt.collectorRole ?? activeTemplate.signatureLabel,
                  headerTextLocal: activeTemplate.headerTextLocal,
                  headerTextEn: activeTemplate.headerTextEn,
                  headerLogoUrl:
                      receipt.headerLogoUrl ?? receipt.organizationLogoUrl,
                  leftSideImageUrl:
                      receipt.leftSideImageUrl ?? receipt.leftImageUrl,
                  rightSideImageUrl:
                      receipt.rightSideImageUrl ?? receipt.rightImageUrl,
                  customStampUrl: receipt.customStampUrl ?? receipt.stampUrl,
                  signatureUrl:
                      receipt.signatureUrl ?? receipt.collectorSignatureUrl,
                  footerText: receipt.footerText,
                  collectorName: receipt.collectorName,
                  receiptThemeId: receipt.receiptThemeId ??
                      auth.organization?.receiptThemeId,
                  brandPrimaryColorHex: activeTemplate.borderColor,
                );

                if (mounted) {
                  if (savedPath != null) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('PDF saved successfully to:\n$savedPath'),
                        duration: const Duration(seconds: 5),
                      ),
                    );
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('Failed to save PDF locally.')),
                    );
                  }
                }
              },
              icon: const Icon(Icons.download),
              label: const Text('Download'),
            ),
          ],
        ),
      );
    }
  }

  Future<void> _confirmPayment(
      BuildContext context, ReceiptModel receipt) async {
    final refController = TextEditingController();
    showDialog(
      context: context,
      builder: (cxt) => AlertDialog(
        title: const Text('Confirm donor payment?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Receipt:',
                style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey,
                    fontWeight: FontWeight.w500)),
            Text(receipt.receiptNumber,
                style:
                    const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            const Text('Amount:',
                style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey,
                    fontWeight: FontWeight.w500)),
            Text('₹${receipt.amount.toStringAsFixed(0)}',
                style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.green)),
            const SizedBox(height: 16),
            TextField(
              controller: refController,
              decoration: const InputDecoration(
                labelText: 'Payment Reference (Optional)',
                border: OutlineInputBorder(),
                hintText: 'e.g. UPI ID, bank ref',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(cxt),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(cxt);
              if (_isSending) return;
              setState(() => _isSending = true);

              final rp = Provider.of<ReceiptProvider>(context, listen: false);
              final messenger = ScaffoldMessenger.of(context);
              final ref = refController.text.trim();
              final success = await rp.reconcilePayment(
                  receipt.id, ref.isNotEmpty ? ref : 'MANUAL-RECONCILED');

              if (mounted) {
                if (success) {
                  final updated = rp.receipts.firstWhere(
                      (r) => r.id == receipt.id,
                      orElse: () => receipt);
                  setState(() {
                    _currentReceipt = updated;
                  });
                  messenger.showSnackBar(
                    const SnackBar(
                        content:
                            Text('Receipt confirmed as PAID successfully.')),
                  );
                } else {
                  messenger.showSnackBar(
                    SnackBar(
                        content: Text(
                            rp.errorMessage ?? 'Failed to confirm payment.')),
                  );
                }
                setState(() => _isSending = false);
              }
            },
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
  }

  Future<void> _cancelPayment(
      BuildContext context, ReceiptModel receipt) async {
    showDialog(
      context: context,
      builder: (cxt) => AlertDialog(
        title: const Text('Cancel Receipt'),
        content: const Text(
            'Are you sure you want to cancel this receipt? Once cancelled, it cannot be recovered, shared, or confirmed.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(cxt),
            child: const Text('No'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(cxt);
              if (_isSending) return;
              setState(() => _isSending = true);

              final rp = Provider.of<ReceiptProvider>(context, listen: false);
              final messenger = ScaffoldMessenger.of(context);
              final success = await rp.cancelPayment(receipt.id);

              if (mounted) {
                if (success) {
                  final updated = rp.receipts.firstWhere(
                      (r) => r.id == receipt.id,
                      orElse: () => receipt);
                  setState(() {
                    _currentReceipt = updated;
                  });
                  messenger.showSnackBar(
                    const SnackBar(
                        content:
                            Text('Receipt has been CANCELLED successfully.')),
                  );
                } else {
                  messenger.showSnackBar(
                    SnackBar(
                        content: Text(
                            rp.errorMessage ?? 'Failed to cancel receipt.')),
                  );
                }
                setState(() => _isSending = false);
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Yes, Cancel'),
          ),
        ],
      ),
    );
  }

  Future<void> _sharePaymentRequest(
      ReceiptModel receipt, String orgName) async {
    if (_isSending) return;
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final rp = Provider.of<ReceiptProvider>(context, listen: false);
    setState(() => _isSending = true);

    try {
      final message = 'Namaskar,\n\n'
          'Aapli denagi/vargani baki aahe.\n\n'
          'Receipt No:\n'
          '${receipt.receiptNumber}\n\n'
          'Amount:\n'
          '₹${receipt.amount.toStringAsFixed(0)}\n\n'
          'Krupaya khalil QR code vaprun payment kara.\n\n'
          'Dhanyavad.\n\n'
          '$orgName';

      List<XFile> filesToShare = [];

      // 1. Generate Receipt PDF
      final fileName = 'receipt_${receipt.receiptNumber}.pdf';
      final tempDir = await getTemporaryDirectory();
      final pdfFile = File('${tempDir.path}/$fileName');

      final tempProvider =
          Provider.of<TemplateProvider>(context, listen: false);
      TemplateModel activeTemplate;
      if (tempProvider.templates.isNotEmpty) {
        activeTemplate = tempProvider.templates.firstWhere(
          (t) => t.id == receipt.templateId,
          orElse: () => tempProvider.templates.firstWhere(
            (t) => t.isDefault,
            orElse: () => tempProvider.templates.first,
          ),
        );
      } else {
        activeTemplate = TemplateModel(
          id: '',
          organizationId: receipt.organizationId,
          name: 'Fallback Classic',
          type: 'traditional',
          bgColor: '#FFFDD0',
          borderStyle: 'double',
          borderColor: '#E65100',
          fontFamily: 'Poppins',
          fontColor: '#3E2723',
          logoVisible: true,
          godImagePosition: 'left',
          watermarkOpacity: 0.08,
          signatureLabel: 'Treasurer',
          isDefault: true,
        );
      }

      final date = receipt.createdAt.contains('T')
          ? receipt.createdAt.split('T').first
          : receipt.createdAt;

      String dateStr = date;
      try {
        final parsedDate = DateTime.tryParse(receipt.createdAt);
        if (parsedDate != null) {
          dateStr =
              "${parsedDate.day.toString().padLeft(2, '0')}/${parsedDate.month.toString().padLeft(2, '0')}/${parsedDate.year}";
        }
      } catch (_) {}

      final pdfBytes = await SharingService.generateMinimalPdf(
        templateType: activeTemplate.type,
        receiptNumber: receipt.receiptNumber,
        orgName:
            receipt.organizationName ?? auth.organization?.name ?? 'PavtiBook',
        donorName: receipt.donorName ?? 'Guest Donor',
        amount: receipt.amount,
        purpose: receipt.purpose,
        date: dateStr,
        paymentMode: receipt.paymentMode,
        paymentStatus: receipt.paymentStatus,
        qrCodeValue: receipt.qrCodeValue,
        signatureLabel: receipt.collectorRole ?? activeTemplate.signatureLabel,
        headerTextLocal: activeTemplate.headerTextLocal,
        headerTextEn: activeTemplate.headerTextEn,
        headerLogoUrl: receipt.headerLogoUrl ?? receipt.organizationLogoUrl,
        leftSideImageUrl: receipt.leftSideImageUrl ?? receipt.leftImageUrl,
        rightSideImageUrl: receipt.rightSideImageUrl ?? receipt.rightImageUrl,
        customStampUrl: receipt.customStampUrl ?? receipt.stampUrl,
        signatureUrl: receipt.signatureUrl ?? receipt.collectorSignatureUrl,
        footerText: receipt.footerText,
        collectorName: receipt.collectorName,
        receiptThemeId:
            receipt.receiptThemeId ?? auth.organization?.receiptThemeId,
        brandPrimaryColorHex: activeTemplate.borderColor,
      );

      await pdfFile.writeAsBytes(pdfBytes);
      filesToShare.add(XFile(pdfFile.path, mimeType: 'application/pdf'));

      // 2. Fetch/download Organization QR Image
      final orgQrUrl = auth.organization?.upiQrImageUrl;
      if (orgQrUrl != null && orgQrUrl.isNotEmpty) {
        try {
          final response = await http.get(Uri.parse(orgQrUrl));
          if (response.statusCode == 200) {
            final tempDir = await getTemporaryDirectory();
            final qrFile =
                File('${tempDir.path}/org_qr_${receipt.receiptNumber}.jpg');
            await qrFile.writeAsBytes(response.bodyBytes);
            filesToShare.add(XFile(qrFile.path, mimeType: 'image/jpeg'));
          }
        } catch (e) {
          debugPrint('Failed to download organization QR image: $e');
        }
      }

      // 3. Share natively using Share.shareXFiles
      if (filesToShare.isNotEmpty) {
        await Share.shareXFiles(
          filesToShare,
          text: message,
        );
      } else {
        await Share.share(message);
      }

      // 4. Update reminder metadata in Firestore
      if (mounted) {
        await rp.logReminderAttempt(receipt.id);

        final updated = rp.receipts
            .firstWhere((r) => r.id == receipt.id, orElse: () => receipt);
        setState(() {
          _currentReceipt = updated;
        });
      }
    } catch (e) {
      debugPrint('Share payment request failed: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to share payment request: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
      }
    }
  }

  Future<void> _showEditDialog(
      BuildContext context, ReceiptModel receipt) async {
    final nameController = TextEditingController(text: receipt.donorName);
    final mobileController = TextEditingController(text: receipt.donorMobile);
    final addressController = TextEditingController(text: receipt.donorAddress);
    final purposeController = TextEditingController(text: receipt.purpose);
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (cxt) => AlertDialog(
        title: const Text('Edit Receipt Details'),
        content: SingleChildScrollView(
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: nameController,
                  decoration: const InputDecoration(
                      labelText: 'Donor Name *', border: OutlineInputBorder()),
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: mobileController,
                  decoration: const InputDecoration(
                      labelText: 'Mobile *', border: OutlineInputBorder()),
                  keyboardType: TextInputType.phone,
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: addressController,
                  decoration: const InputDecoration(
                      labelText: 'Address', border: OutlineInputBorder()),
                  maxLines: 2,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: purposeController,
                  decoration: const InputDecoration(
                      labelText: 'Purpose *', border: OutlineInputBorder()),
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Required' : null,
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(cxt),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              if (!formKey.currentState!.validate()) return;
              Navigator.pop(cxt);
              setState(() {
                _currentReceipt = copyReceiptWith(
                  receipt,
                  donorName: nameController.text.trim(),
                  donorMobile: mobileController.text.trim(),
                  donorAddress: addressController.text.trim(),
                  purpose: purposeController.text.trim(),
                );
                _isDraft = true;
              });
            },
            child: const Text('Preview Changes'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_currentReceipt == null) {
      return const Scaffold(
        body: Center(
          child: Padding(
            padding: EdgeInsets.all(24.0),
            child: ShimmerSkeleton(width: double.infinity, height: 400),
          ),
        ),
      );
    }
    var receipt = _currentReceipt!;
    final auth = Provider.of<AuthProvider>(context);
    final tempProvider = Provider.of<TemplateProvider>(context);
    final theme = Theme.of(context);

    final userRole = auth.user?.role ?? '';
    final isOwner = userRole == 'admin' || userRole == 'owner';
    final isTreasurer = userRole == 'treasurer';

    // Look for matching template or fetch active default template
    TemplateModel activeTemplate;
    if (tempProvider.templates.isNotEmpty) {
      activeTemplate = tempProvider.templates.firstWhere(
        (t) => t.id == receipt.templateId,
        orElse: () => tempProvider.templates.firstWhere(
          (t) => t.isDefault,
          orElse: () => tempProvider.templates.first,
        ),
      );
    } else {
      activeTemplate = TemplateModel(
        id: '',
        organizationId: receipt.organizationId,
        name: 'Fallback Classic',
        type: 'traditional',
        bgColor: '#FFFDD0',
        borderStyle: 'double',
        borderColor: '#E65100',
        fontFamily: 'Poppins',
        fontColor: '#3E2723',
        logoVisible: true,
        godImagePosition: 'left',
        watermarkOpacity: 0.08,
        signatureLabel: 'Treasurer',
        isDefault: true,
      );
    }

    return Stack(
      children: [
        Scaffold(
          appBar: AppBar(
            title: Text(receipt.receiptNumber),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () {
                HapticFeedback.lightImpact();
                Navigator.pushNamedAndRemoveUntil(
                    context, '/dashboard', (route) => false);
              },
            ),
            actions: [
              if (receipt.paymentStatus != 'cancelled' && isOwner)
                IconButton(
                  icon: const Icon(Icons.edit),
                  tooltip: 'Edit Receipt',
                  onPressed: () => _showEditDialog(context, receipt),
                ),
            ],
          ),
          backgroundColor: theme.colorScheme.surface,
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_isDraft) ...[
                  Card(
                    color: Colors.amber[50],
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                      side: BorderSide(color: Colors.amber[800]!, width: 1.5),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.warning_amber_rounded,
                                  color: Colors.amber[850], size: 28),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Draft Preview Mode',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                        color: Colors.amber[900],
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'You have made edits to this receipt. Review the changes on the preview below and confirm.',
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: Colors.amber[900],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              OutlinedButton(
                                onPressed: _isSending
                                    ? null
                                    : () {
                                        setState(() {
                                          _currentReceipt = _originalReceipt;
                                          _isDraft = false;
                                        });
                                      },
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Colors.amber[900],
                                  side: BorderSide(color: Colors.amber[900]!),
                                ),
                                child: const Text('Cancel'),
                              ),
                              const SizedBox(width: 12),
                              ElevatedButton(
                                onPressed: _isSending
                                    ? null
                                    : () async {
                                        setState(() => _isSending = true);
                                        final rp = Provider.of<ReceiptProvider>(
                                            context,
                                            listen: false);
                                        final messenger =
                                            ScaffoldMessenger.of(context);
                                        final success = await rp.updateReceipt(
                                          receiptId: _originalReceipt!.id,
                                          donorName:
                                              _currentReceipt!.donorName ?? '',
                                          donorMobile:
                                              _currentReceipt!.donorMobile ??
                                                  '',
                                          donorAddress:
                                              _currentReceipt!.donorAddress ??
                                                  '',
                                          purpose: _currentReceipt!.purpose,
                                        );
                                        if (mounted) {
                                          setState(() => _isSending = false);
                                          if (success) {
                                            final updated = rp.receipts
                                                .firstWhere(
                                                    (r) =>
                                                        r.id ==
                                                        _originalReceipt!.id,
                                                    orElse: () =>
                                                        _currentReceipt!);
                                            setState(() {
                                              _originalReceipt = updated;
                                              _currentReceipt = updated;
                                              _isDraft = false;
                                            });
                                            messenger.showSnackBar(
                                              const SnackBar(
                                                  content: Text(
                                                      'Changes confirmed and saved successfully.')),
                                            );
                                          } else {
                                            messenger.showSnackBar(
                                              SnackBar(
                                                  content: Text(rp
                                                          .errorMessage ??
                                                      'Failed to save changes.')),
                                            );
                                          }
                                        }
                                      },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.green[800],
                                  foregroundColor: Colors.white,
                                ),
                                child: const Text('Confirm Changes'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                // Status Info Banner
                if (receipt.paymentStatus == 'pending') ...[
                  Card(
                    color: Colors.amber[50],
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8)),
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Icon(Icons.info_outline,
                                  color: Colors.amber[800]),
                              const SizedBox(width: 8),
                              Text(
                                'PAYMENT STATUS: PENDING',
                                style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: Colors.amber[800],
                                    fontSize: 16),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              'Amount Due: ₹${receipt.amount.toStringAsFixed(0)}',
                              style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.amber[900],
                                  fontSize: 15),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              if (isOwner || isTreasurer) ...[
                                Expanded(
                                  child: ElevatedButton.icon(
                                    onPressed: _isSending
                                        ? null
                                        : () =>
                                            _confirmPayment(context, receipt),
                                    icon:
                                        const Icon(Icons.check_circle_outline),
                                    label: const Text('Confirm Payment'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.green[700],
                                      foregroundColor: Colors.white,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                              ],
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: _isSending
                                      ? null
                                      : () => _sharePaymentRequest(
                                          receipt,
                                          auth.organization?.name ??
                                              'PavtiBook'),
                                  icon: const Icon(Icons.share_outlined),
                                  label: const Text('Share Payment Request'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor:
                                        const Color(0xFFF47C20), // Orange
                                    foregroundColor: Colors.white,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          OutlinedButton.icon(
                            onPressed: _isSending
                                ? null
                                : () => _cancelPayment(context, receipt),
                            icon: const Icon(Icons.cancel_outlined),
                            label: const Text('Cancel Receipt'),
                            style: OutlinedButton.styleFrom(
                              side: BorderSide(color: Colors.red[700]!),
                              foregroundColor: Colors.red[700],
                              minimumSize: const Size.fromHeight(40),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ] else if (receipt.paymentStatus == 'paid') ...[
                  Card(
                    color: Colors.green[50],
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8)),
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Row(
                        children: [
                          Icon(Icons.check_circle, color: Colors.green[700]),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Payment Status: Paid',
                                  style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF1B5E20)),
                                ),
                                Text(
                                  'Confirmation: Confirmed by Collector',
                                  style: TextStyle(
                                      fontSize: 12, color: Colors.green[800]),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ] else if (receipt.paymentStatus == 'cancelled') ...[
                  Card(
                    color: Colors.grey[100],
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8)),
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Row(
                        children: [
                          Icon(Icons.cancel, color: Colors.grey[700]),
                          const SizedBox(width: 8),
                          const Expanded(
                            child: Text(
                              'Payment Status: CANCELLED. Actions disabled.',
                              style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF424242)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                // The Traditional Receipt Card
                RepaintBoundary(
                  key: _receiptKey,
                  child: TraditionalReceiptWidget(
                    receipt: receipt,
                    organization: auth.organization!,
                    template: activeTemplate,
                  ),
                ),
                if (receipt.editedAt != null && receipt.editedBy != null) ...[
                  const SizedBox(height: 12),
                  Card(
                    color: Colors.grey[50],
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8)),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                      child: Row(
                        children: [
                          const Icon(Icons.history,
                              size: 16, color: Colors.blueGrey),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Audit Trail: Last edited by ${receipt.editedBy} on ${receipt.editedAt!.contains("T") ? receipt.editedAt!.split("T").first : receipt.editedAt}',
                              style: const TextStyle(
                                  fontSize: 11,
                                  color: Colors.blueGrey,
                                  fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                if (receipt.paymentStatus != 'cancelled') ...[
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => _showShareBottomSheet(context, receipt),
                    icon: const Icon(Icons.share, size: 20),
                    label: Text(
                      _shareSuccess ? '✓ Shared Successfully' : 'Share Receipt',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF8B1E2D),
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(56),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(22),
                      ),
                      elevation: 2,
                    ),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () {
                      HapticFeedback.lightImpact();
                      Navigator.pushReplacementNamed(
                          context, '/create-receipt');
                    },
                    icon: const Icon(Icons.add, size: 20),
                    label: const Text(
                      'Create Another Receipt',
                      style:
                          TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF8B1E2D),
                      side: const BorderSide(
                          color: Color(0xFF8B1E2D), width: 1.5),
                      minimumSize: const Size.fromHeight(56),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(22),
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 30),
              ],
            ),
          ),
        ),
        if (_showSuccessOverlay)
          Positioned.fill(
            child: SuccessOverlay(
              receiptNumber: receipt.receiptNumber,
              amount: receipt.amount,
              duration: Provider.of<ReceiptProvider>(context, listen: false)
                      .collectorMode
                  ? const Duration(milliseconds: 400)
                  : const Duration(milliseconds: 1400),
              onFinished: () {
                setState(() {
                  _showSuccessOverlay = false;
                });
                _checkAndCelebrateMilestone();
              },
            ),
          ),
        if (_showSharedSuccessfullyOverlay)
          Positioned.fill(
            child: Container(
              color: Colors.black.withOpacity(0.4),
              child: Center(
                child: Card(
                  color: const Color(0xFF1B5E20),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 24, vertical: 20),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.check_circle,
                            color: Colors.greenAccent, size: 48),
                        const SizedBox(height: 12),
                        Text(
                          '✅ Receipt Shared Successfully',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            fontFamily: activeTemplate.fontFamily,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        if (_showConfetti)
          const Positioned.fill(
            child: ConfettiWidget(),
          ),
        if (_isAutoSending)
          Positioned.fill(
            child: Container(
              color: theme.colorScheme.surface,
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Center(
                        child: CircularProgressIndicator(),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        _autoSendStep,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF2E1C0C),
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'This will take just a moment...',
                        style: TextStyle(
                          fontSize: 12.5,
                          color: Colors.grey,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        if (_celebrationMilestone != null)
          _buildMilestoneCongratsOverlay(_celebrationMilestone!),
      ],
    );
  }

  void _checkAndCelebrateMilestone() {
    final rp = Provider.of<ReceiptProvider>(context, listen: false);
    if (rp.collectorMode) return;
    if (_hasCheckedMilestone) return;
    _hasCheckedMilestone = true;

    final dash = Provider.of<DashboardProvider>(context, listen: false);
    final count = dash.stats?.totalReceipts ?? 0;

    if (count == 1 || count == 100 || count == 500 || count == 1000) {
      HapticFeedback.mediumImpact();
      setState(() {
        _showConfetti = true;
        _celebrationMilestone = count;
      });

      Timer(const Duration(seconds: 4), () {
        if (mounted) {
          setState(() {
            _showConfetti = false;
            _celebrationMilestone = null;
          });
        }
      });
    }
  }

  void _triggerShareSuccess() {
    setState(() {
      _shareSuccess = true;
    });
    Timer(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          _shareSuccess = false;
        });
      }
    });
  }

  void _showShareBottomSheet(BuildContext context, ReceiptModel receipt) {
    HapticFeedback.lightImpact();
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFFFFF6E8),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20.0,
            right: 20.0,
            top: 10.0,
            bottom: 20.0 + MediaQuery.of(context).padding.bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.grey[400],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const Text(
                'Share Receipt',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF2E1C0C)),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const CircleAvatar(
                  backgroundColor: Colors.teal,
                  foregroundColor: Colors.white,
                  child: Icon(Icons.chat),
                ),
                title: const Text('WhatsApp',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: const Text('Instant delivery to donor',
                    style: TextStyle(fontSize: 11, color: Colors.grey)),
                onTap: _isSending
                    ? null
                    : () {
                        Navigator.pop(context);
                        _showChooseFormatBottomSheet(context, receipt);
                      },
              ),
              const Divider(),
              ListTile(
                leading: CircleAvatar(
                  backgroundColor: Colors.blue[600],
                  foregroundColor: Colors.white,
                  child: const Icon(Icons.sms),
                ),
                title: const Text('SMS Text',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: const Text('Send receipt details via SMS',
                    style: TextStyle(fontSize: 11, color: Colors.grey)),
                onTap: _isSending
                    ? null
                    : () {
                        Navigator.pop(context);
                        final orgName =
                            Provider.of<AuthProvider>(context, listen: false)
                                    .organization
                                    ?.name ??
                                'PavtiBook';
                        _shareReceipt(context, receipt, orgName, 'sms',
                            receipt.donorMobile ?? '');
                      },
              ),
              const Divider(),
              ListTile(
                leading: const CircleAvatar(
                  backgroundColor: Colors.redAccent,
                  foregroundColor: Colors.white,
                  child: Icon(Icons.mail),
                ),
                title: const Text('Email Inbox',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: const Text('Send receipt by email',
                    style: TextStyle(fontSize: 11, color: Colors.grey)),
                onTap: _isSending
                    ? null
                    : () {
                        Navigator.pop(context);
                        final orgName =
                            Provider.of<AuthProvider>(context, listen: false)
                                    .organization
                                    ?.name ??
                                'PavtiBook';
                        _shareReceipt(context, receipt, orgName, 'email', '');
                      },
              ),
              const Divider(),
              ListTile(
                leading: CircleAvatar(
                  backgroundColor: Colors.grey[800],
                  foregroundColor: Colors.white,
                  child: const Icon(Icons.more_horiz),
                ),
                title: const Text('More Options',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: const Text('Export or save files locally',
                    style: TextStyle(fontSize: 11, color: Colors.grey)),
                onTap: _isSending
                    ? null
                    : () {
                        Navigator.pop(context);
                        _showMoreOptionsBottomSheet(context, receipt);
                      },
              ),
            ],
          ),
        );
      },
    );
  }



  void _showChooseFormatBottomSheet(
      BuildContext context, ReceiptModel receipt) {
    HapticFeedback.lightImpact();
    String selectedFormat = 'image';

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFFFFF6E8),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20.0,
                right: 20.0,
                top: 10.0,
                bottom: 20.0 + MediaQuery.of(context).padding.bottom,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: Colors.grey[400],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const Text(
                    'Choose Format',
                    style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF2E1C0C)),
                  ),
                  const SizedBox(height: 16),
                  RadioListTile<String>(
                    value: 'image',
                    groupValue: selectedFormat,
                    activeColor: const Color(0xFF8B1E2D),
                    title: const Text('Send as JPG (Recommended)',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 14)),
                    subtitle: const Text(
                        '⭐ Recommended\nBest for WhatsApp Preview',
                        style: TextStyle(fontSize: 11, color: Colors.grey)),
                    onChanged: (val) {
                      setModalState(() => selectedFormat = val!);
                    },
                  ),
                  const Divider(),
                  RadioListTile<String>(
                    value: 'pdf',
                    groupValue: selectedFormat,
                    activeColor: const Color(0xFF8B1E2D),
                    title: const Text('Send as PDF',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 14)),
                    subtitle: const Text(
                        'Best for Printing & Records',
                        style: TextStyle(fontSize: 11, color: Colors.grey)),
                    onChanged: (val) {
                      setModalState(() => setModalState(() => selectedFormat = val!));
                    },
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      HapticFeedback.lightImpact();
                      if (selectedFormat == 'image') {
                        _shareJpg(receipt);
                      } else {
                        _sharePdf(receipt);
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF8B1E2D),
                      minimumSize: const Size.fromHeight(56),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(22),
                      ),
                    ),
                    child: const Text('Send',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: Colors.white)),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showMoreOptionsBottomSheet(BuildContext context, ReceiptModel receipt) {
    HapticFeedback.lightImpact();
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFFFFF6E8),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20.0,
            right: 20.0,
            top: 10.0,
            bottom: 20.0 + MediaQuery.of(context).padding.bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.grey[400],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const Text(
                'More Options',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF2E1C0C)),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading:
                    const Icon(Icons.image_outlined, color: Color(0xFF8B1E2D)),
                title: const Text('Share Image',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: const Text('Export high-resolution receipt image',
                    style: TextStyle(fontSize: 11, color: Colors.grey)),
                onTap: _isSending
                    ? null
                    : () {
                        Navigator.pop(context);
                        _shareJpg(receipt);
                      },
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.picture_as_pdf_outlined,
                    color: Color(0xFF8B1E2D)),
                title: const Text('Share PDF',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: const Text('Export official PDF document',
                    style: TextStyle(fontSize: 11, color: Colors.grey)),
                onTap: _isSending
                    ? null
                    : () {
                        Navigator.pop(context);
                        _sharePdf(receipt);
                      },
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.download_for_offline_outlined,
                    color: Color(0xFFF47C20)),
                title: const Text('Save Image',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: const Text('Save receipt image to your local device',
                    style: TextStyle(fontSize: 11, color: Colors.grey)),
                onTap: _isSending
                    ? null
                    : () {
                        Navigator.pop(context);
                        _saveJpgLocally(receipt);
                      },
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.download_done_outlined,
                    color: Color(0xFFF47C20)),
                title: const Text('Save PDF',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: const Text('Save PDF document to your local device',
                    style: TextStyle(fontSize: 11, color: Colors.grey)),
                onTap: _isSending
                    ? null
                    : () {
                        Navigator.pop(context);
                        _downloadPdfLink(receipt);
                      },
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMilestoneCongratsOverlay(int count) {
    return Positioned(
      bottom: 80,
      left: 24,
      right: 24,
      child: Card(
        elevation: 6,
        color: const Color(0xFF8B1E2D),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFFF2C94C), width: 1.5),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: const BoxDecoration(
                  color: Color(0xFFF2C94C),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.emoji_events,
                    color: Color(0xFF8B1E2D), size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'Congratulations!',
                      style: TextStyle(
                        color: Color(0xFFF2C94C),
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$count Receipts Completed',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class SuccessOverlay extends StatefulWidget {
  final String receiptNumber;
  final double amount;
  final VoidCallback onFinished;
  final Duration? duration;

  const SuccessOverlay({
    super.key,
    required this.receiptNumber,
    required this.amount,
    required this.onFinished,
    this.duration,
  });

  @override
  State<SuccessOverlay> createState() => _SuccessOverlayState();
}

class _SuccessOverlayState extends State<SuccessOverlay>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration ?? const Duration(milliseconds: 1400),
    );

    _scaleAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.6, curve: Curves.elasticOut),
      ),
    );

    _fadeAnimation = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.8, 1.0, curve: Curves.easeIn),
      ),
    );

    _controller.forward().then((_) {
      widget.onFinished();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Opacity(
          opacity: _fadeAnimation.value,
          child: Container(
            color: const Color(0xFFFFF6E8),
            alignment: Alignment.center,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ScaleTransition(
                  scale: _scaleAnimation,
                  child: Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.green[50],
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.green[400]!, width: 2),
                    ),
                    child: const Icon(
                      Icons.check_circle,
                      color: Colors.green,
                      size: 80,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Receipt Generated!',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF2E1C0C),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  widget.receiptNumber,
                  style: const TextStyle(
                    fontSize: 16,
                    color: Colors.grey,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  '₹ ${widget.amount.toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF8B1E2D),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
