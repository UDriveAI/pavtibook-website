import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import 'package:firebase_storage/firebase_storage.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../services/receipt_image_service.dart';
import '../widgets/traditional_receipt_widget.dart';

class ReceiptSuccessScreen extends StatefulWidget {
  const ReceiptSuccessScreen({super.key});

  @override
  State<ReceiptSuccessScreen> createState() => _ReceiptSuccessScreenState();
}

class _ReceiptSuccessScreenState extends State<ReceiptSuccessScreen> {
  final GlobalKey _receiptKey = GlobalKey();
  bool _isAutoSending = false;
  String _autoSendStep = 'Preparing your receipt...';
  bool _whatsappStatus = false;
  String? _error;
  bool _imageUploaded = false;
  bool _initialized = false;
  StreamSubscription<DocumentSnapshot>? _receiptSubscription;
  String _deliveryStatus = 'unknown';
  final Stopwatch _flowStopwatch = Stopwatch();

  @override
  void dispose() {
    _receiptSubscription?.cancel();
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _initialized = true;
      try {
        final args = ModalRoute.of(context)?.settings.arguments;
        if (args is Map<String, dynamic>) {
          final isNew = args['isNew'] as bool? ?? false;
          final receipt = args['receipt'] as ReceiptModel?;
          
          if (receipt != null) {
            _listenToDeliveryStatus(receipt.id);
          }

          if (isNew) {
            _isAutoSending = true;
            _autoSendStep = 'Preparing receipt...';
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _runAutomaticWhatsAppFlow(isRetry: false);
            });
          } else {
            _whatsappStatus = args['whatsappStatus'] as bool? ?? false;
            _error = args['error'] as String?;
          }
        }
      } catch (e) {
        debugPrint('Error in didChangeDependencies: $e');
        _error = 'Failed to load receipt arguments safely.';
      }
    }
  }

  void _listenToDeliveryStatus(String receiptId) {
    _receiptSubscription?.cancel();
    final completer = Completer<void>();

    _receiptSubscription = FirebaseFirestore.instance
        .collection('receipts')
        .doc(receiptId)
        .snapshots()
        .listen((snapshot) {
      if (!snapshot.exists || !mounted) return;
      final data = snapshot.data();
      if (data == null) return;

      final dStatus = data['deliveryStatus'] as String? ?? 'unknown';
      debugPrint('[WA Webhook Stream] Current deliveryStatus: $dStatus');

      // PERFORMANCE LOGS for Webhook & Firestore Update
      final elapsedWebhook = _flowStopwatch.elapsedMilliseconds;
      debugPrint('[PERFORMANCE LOG] $elapsedWebhook ms - Webhook Received (deliveryStatus: $dStatus)');
      debugPrint('[PERFORMANCE LOG] $elapsedWebhook ms - Firestore Updated');

      setState(() {
        _deliveryStatus = dStatus;
        if (dStatus == 'sent' || dStatus == 'delivered' || dStatus == 'read') {
          _isAutoSending = false;
          _whatsappStatus = true;
          _error = null;
        } else if (dStatus == 'failed') {
          _isAutoSending = false;
          _whatsappStatus = false;
          _error = data['whatsappErrorMessage'] as String? ?? 'WhatsApp Delivery Failed';
        } else {
          // accepted, processing, unknown
          _isAutoSending = true;
          _whatsappStatus = false;
          _error = null;
        }
      });

      // PERFORMANCE LOG for UI Update
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final elapsedUI = _flowStopwatch.elapsedMilliseconds;
        debugPrint('[PERFORMANCE LOG] $elapsedUI ms - UI Updated');
        if (dStatus == 'sent' || dStatus == 'delivered' || dStatus == 'read' || dStatus == 'failed') {
          debugPrint('[PERFORMANCE LOG] $elapsedUI ms - Total Time');
        }
      });

      if (dStatus == 'sent' || dStatus == 'delivered' || dStatus == 'read') {
        if (!completer.isCompleted) completer.complete();
      } else if (dStatus == 'failed') {
        final errMsg = data['whatsappErrorMessage'] as String? ?? 'WhatsApp Delivery Failed';
        if (!completer.isCompleted) completer.completeError(Exception(errMsg));
      }
    }, onError: (err) {
      _receiptSubscription?.cancel();
      if (mounted) {
        setState(() {
          _isAutoSending = false;
          _whatsappStatus = false;
          _error = err.toString();
        });
      }
      if (!completer.isCompleted) completer.completeError(Exception(err.toString()));
    });

    completer.future.timeout(const Duration(seconds: 30), onTimeout: () {
      if (mounted && _isAutoSending) {
        setState(() {
          _isAutoSending = false;
          _error = null;
        });
      }
    });
  }

  // Appends activity log events to collection 'activity_logs'
  Future<void> _logActivity(String action, String details, ReceiptModel receipt) async {
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final orgId = auth.organization?.id ?? receipt.organizationId;
      final userId = FirebaseAuth.instance.currentUser?.uid ?? '';
      final userName = auth.user?.name ?? receipt.collectorName ?? 'System';
      final userRole = auth.user?.role ?? receipt.collectorRole ?? 'Collector';

      await FirebaseFirestore.instance.collection('activity_logs').add({
        'organizationId': orgId,
        'userId': userId,
        'userName': userName,
        'userRole': userRole,
        'action': action,
        'details': details,
        'timestamp': DateTime.now().toIso8601String(),
      });
    } catch (e) {
      debugPrint('Failed to add activity log: $e');
    }
  }

  Future<bool> _verifyImageIntegrity(String url) async {
    try {
      final res = await http.get(Uri.parse(url));
      if (res.statusCode != 200) return false;
      final contentType = res.headers['content-type'] ?? '';
      if (!contentType.contains('image/jpeg')) return false;
      final length = res.bodyBytes.length;
      if (length <= 50 * 1024) return false; // > 50KB
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> _runAutomaticWhatsAppFlow({required bool isRetry}) async {
    ReceiptModel? receipt;
    _flowStopwatch..reset()..start();

    try {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is! Map<String, dynamic> || args['receipt'] == null) {
        throw Exception("Receipt data not found in route arguments.");
      }
      receipt = args['receipt'] as ReceiptModel;

      if (isRetry) {
        // Do not block the main pipeline on logging
        _logActivity('Retry Started', 'Manual retry for WhatsApp delivery triggered', receipt);
      }

      debugPrint('[PERFORMANCE LOG] 0 ms - Receipt Saved');

      // Check local cache receipt_cache/{receiptId}.jpg first
      final tempDir = await getTemporaryDirectory();
      final cacheDir = Directory('${tempDir.path}/receipt_cache');
      if (!await cacheDir.exists()) {
        await cacheDir.create(recursive: true);
      }
      final localFile = File('${cacheDir.path}/${receipt.id}.jpg');
      final hasCachedFile = await localFile.exists();

      Uint8List? jpgBytes;
      if (hasCachedFile) {
        debugPrint('ReceiptSuccessScreen: Reusing locally cached JPG from ${localFile.path}');
        jpgBytes = await localFile.readAsBytes();
      }

      // Check if image is already generated/uploaded on Firestore
      final docSnap = await FirebaseFirestore.instance
          .collection('receipts')
          .doc(receipt.id)
          .get();
      
      String? downloadUrl = docSnap.data()?['receiptImageUrl'] as String?;
      bool hasImage = downloadUrl != null && downloadUrl.isNotEmpty;

      if (!hasImage && !_imageUploaded) {
        if (mounted) {
          setState(() {
            _autoSendStep = 'Generating receipt image...';
          });
        }

        // 1. Image Generation
        final auth = Provider.of<AuthProvider>(context, listen: false);
        final tempProvider = Provider.of<TemplateProvider>(context, listen: false);

        // Find active template
        TemplateModel activeTemplate;
        if (tempProvider.templates.isNotEmpty) {
          activeTemplate = tempProvider.templates.firstWhere(
            (t) => t.id == receipt!.templateId,
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

        if (jpgBytes == null) {
          try {
            // Pre-cache all network images to ensure they paint synchronously
            await ReceiptImageService.precacheReceiptImages(
              context: context,
              receipt: receipt,
              organization: auth.organization!,
              template: activeTemplate,
            );

            // Capture only the TraditionalReceiptWidget from its repaint boundary
            debugPrint('[PERFORMANCE LOG] ${_flowStopwatch.elapsedMilliseconds} ms - Receipt Widget Built');
            jpgBytes = await ReceiptImageService.captureReceiptWidget(_receiptKey);
            // Save to local cache in fire-and-forget style
            localFile.writeAsBytes(jpgBytes).then((_) {
              debugPrint('[PERFORMANCE LOG] ${_flowStopwatch.elapsedMilliseconds} ms - PNG Saved');
            }).catchError((e) {
              debugPrint('Failed to cache file locally: $e');
              return localFile;
            });
          } catch (captureError) {
            debugPrint("ReceiptSuccessScreen: Image capture/generation failed: $captureError");
            _logActivity('Capture Failed', 'Image generation failed: $captureError', receipt);
            throw Exception("Unable to generate receipt image. Please try again.");
          }
        }

        debugPrint('[PERFORMANCE LOG] ${_flowStopwatch.elapsedMilliseconds} ms - PNG Generated');

        if (mounted) {
          setState(() {
            _autoSendStep = 'Uploading receipt image...';
          });
        }

        // 2. Firebase Storage Upload
        debugPrint('[PERFORMANCE LOG] ${_flowStopwatch.elapsedMilliseconds} ms - Storage Upload Started');

        final storageRef = FirebaseStorage.instance
            .ref()
            .child('receipt_images')
            .child('${receipt.id}.jpg');

        await storageRef.putData(
          jpgBytes,
          SettableMetadata(contentType: 'image/jpeg'),
        );
        _imageUploaded = true;
        downloadUrl = await storageRef.getDownloadURL();

        debugPrint('[PERFORMANCE LOG] ${_flowStopwatch.elapsedMilliseconds} ms - Storage Upload Finished');

        _logActivity('Receipt Image Generated', 'Receipt image generated', receipt);
        _logActivity('Receipt Uploaded', 'Uploaded receipt image', receipt);
      } else {
        // If image exists, save it locally if not already done, to enable offline sharing
        try {
          if (!hasCachedFile && downloadUrl != null) {
            // No await to avoid blocking the pipeline
            http.get(Uri.parse(downloadUrl)).then((res) {
              if (res.statusCode == 200) {
                localFile.writeAsBytes(res.bodyBytes);
              }
            }).catchError((e) {
              debugPrint('Failed to cache existing remote image locally: $e');
            });
          }
        } catch (e) {
          debugPrint('Failed to cache existing remote image locally: $e');
        }
      }

      if (mounted) {
        setState(() {
          _autoSendStep = 'Sending WhatsApp notification...';
        });
      }

      _logActivity('WhatsApp Sending Started', 'Initiated WhatsApp templates dispatch', receipt);

      // 3. WhatsApp API Cloud Function
      debugPrint('[PERFORMANCE LOG] ${_flowStopwatch.elapsedMilliseconds} ms - Cloud Function Started');
      debugPrint('[PERFORMANCE LOG] ${_flowStopwatch.elapsedMilliseconds} ms - Meta Request Sent');

      final user = FirebaseAuth.instance.currentUser;
      if (user == null) throw Exception("User is not authenticated.");
      final idToken = await user.getIdToken();

      // STEP 1: Flutter Pre-Call Diagnostic Log
      final traceTimestamp = DateTime.now().toIso8601String();
      debugPrint('[DIAGNOSTIC] STEP 1 - Flutter Pre-Request');
      debugPrint('  receiptId    : ${receipt.id}');
      debugPrint('  mobile       : ${receipt.donorMobile}');
      debugPrint('  imageUrl     : ${downloadUrl ?? receipt.receiptImageUrl ?? "N/A"}');
      debugPrint('  templateName : receipt_generated_image');
      debugPrint('  timestamp    : $traceTimestamp');

      final projectId = Firebase.app().options.projectId;
      final url = 'https://asia-south1-$projectId.cloudfunctions.net/sendReceiptMediaWhatsapp';

      // Perform Firestore update and Cloud Function call concurrently
      final updateFuture = FirebaseFirestore.instance
          .collection('receipts')
          .doc(receipt.id)
          .update({
        'receiptImagePath': 'receipt_images/${receipt.id}.jpg',
        'receiptImageUrl': downloadUrl,
        'whatsappMediaStatus': 'processing',
        'imageGeneratedAt': FieldValue.serverTimestamp(),
        'imageVersion': 1,
      });

      final callFuture = http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $idToken',
        },
        body: '{"data": {"receiptId": "${receipt.id}", "mediaType": "image"}}',
      );

      final results = await Future.wait([updateFuture, callFuture]);
      final response = results[1] as http.Response;

      debugPrint('[PERFORMANCE LOG] ${_flowStopwatch.elapsedMilliseconds} ms - Meta Response Received');

      // ── FULL RESPONSE LOG ────────────────────────────────────────────────
      debugPrint('[WA CF] HTTP status  : ${response.statusCode}');
      debugPrint('[WA CF] Response body: ${response.body}');
      // ─────────────────────────────────────────────────────────────────────

      // Parse response body regardless of HTTP status
      Map<String, dynamic>? parsedBody;
      try {
        parsedBody = jsonDecode(response.body) as Map<String, dynamic>?;
      } catch (_) {
        parsedBody = null;
      }

      if (response.statusCode == 200) {
        // Extract the 'result' envelope returned by Firebase onCall functions
        final result = parsedBody?['result'] as Map<String, dynamic>?;

        debugPrint('[WA CF] result : ${jsonEncode(result)}');

        final cfSuccess = result?['success'] == true;
        final messageId = result?['messageId'] as String?;
        final deliveryStatus = result?['deliveryStatus'] as String? ?? 'unknown';
        final cfError = result?['error'] as String?;
        final alreadySent = result?['alreadySent'] == true;

        debugPrint('[WA CF] success=$cfSuccess  messageId=$messageId  deliveryStatus=$deliveryStatus  alreadySent=$alreadySent');

        if (!cfSuccess) {
          throw Exception(cfError ?? 'WhatsApp delivery failed (Cloud Function reported failure).');
        }

        // STEP 8: Parse ONLY messageId — NEVER show success without a valid messageId
        if (messageId == null || messageId.isEmpty) {
          debugPrint('[DIAGNOSTIC] STEP 8 - messageId is EMPTY. Treating as DELIVERY FAILURE.');
          throw Exception('WhatsApp Delivery Failed');
        }
        debugPrint('[DIAGNOSTIC] STEP 8 - messageId confirmed NON-EMPTY.');

        if (alreadySent && (deliveryStatus == 'sent' || deliveryStatus == 'delivered' || deliveryStatus == 'read')) {
          HapticFeedback.mediumImpact();
          if (mounted) {
            setState(() {
              _isAutoSending = false;
              _whatsappStatus = true;
              _deliveryStatus = deliveryStatus;
              _error = null;
            });
          }
          return;
        }

        HapticFeedback.mediumImpact();
        if (isRetry) {
          _logActivity('Retry Accepted', 'WhatsApp retry accepted. messageId=$messageId status=$deliveryStatus', receipt);
        } else {
          _logActivity('WhatsApp Accepted', 'WhatsApp templates accepted. messageId=$messageId status=$deliveryStatus', receipt);
        }

        if (mounted) {
          setState(() {
            _deliveryStatus = 'accepted';
            _autoSendStep = 'Sending to WhatsApp...';
          });
        }

        _listenToDeliveryStatus(receipt.id);

      } else {
        final errorMessage = parsedBody?['error']?['message'] as String?
            ?? 'WhatsApp delivery failed (HTTP ${response.statusCode})';
        throw Exception(errorMessage);
      }
    } catch (e) {
      debugPrint('WhatsApp flow failed: $e');
      HapticFeedback.vibrate();
      if (receipt != null) {
        if (isRetry) {
          _logActivity('Retry Failed', 'WhatsApp retry attempt failed: $e', receipt);
        } else {
          _logActivity('WhatsApp Failed', 'WhatsApp delivery failed: $e', receipt);
        }
      }
      if (mounted) {
        setState(() {
          _isAutoSending = false;
          _whatsappStatus = false;
          _deliveryStatus = 'failed';
          _error = e.toString().replaceFirst('Exception: ', '');
        });
      }
    }
  }

  Future<void> _retryWhatsApp() async {
    if (_isAutoSending) return;
    setState(() {
      _isAutoSending = true;
      _autoSendStep = 'Retrying WhatsApp send...';
      _error = null;
    });
    await _runAutomaticWhatsAppFlow(isRetry: true);
  }

  String _getStatusText() {
    if (_isAutoSending) {
      return 'Sending to WhatsApp...';
    }
    switch (_deliveryStatus) {
      case 'accepted':
      case 'processing':
        return 'Sending to WhatsApp...';
      case 'sent':
        return '🟢 Sent to WhatsApp';
      case 'delivered':
      case 'read':
        return '🟢 Delivered on WhatsApp';
      case 'failed':
        return '⚠ WhatsApp Delivery Failed';
      default:
        return 'Sending to WhatsApp...';
    }
  }

  Color _getStatusBoxColor() {
    if (_isAutoSending) {
      return const Color(0xFFFFF3E0); // Light orange
    }
    switch (_deliveryStatus) {
      case 'accepted':
      case 'processing':
        return const Color(0xFFFFF3E0); // Light orange
      case 'sent':
        return const Color(0xFFE8F5E9); // Light green
      case 'delivered':
      case 'read':
        return const Color(0xFFE8F5E9); // Light green
      case 'failed':
        return const Color(0xFFFEEBEE); // Light red
      default:
        return const Color(0xFFFFF3E0);
    }
  }

  Color _getStatusBorderColor() {
    if (_isAutoSending) {
      return const Color(0xFFFFE0B2);
    }
    switch (_deliveryStatus) {
      case 'accepted':
      case 'processing':
        return const Color(0xFFFFE0B2);
      case 'sent':
        return const Color(0xFFC8E6C9);
      case 'delivered':
      case 'read':
        return const Color(0xFFC8E6C9);
      case 'failed':
        return const Color(0xFFFFCDD2);
      default:
        return const Color(0xFFFFE0B2);
    }
  }

  IconData _getStatusIcon() {
    if (_isAutoSending) {
      return Icons.hourglass_empty_rounded;
    }
    switch (_deliveryStatus) {
      case 'accepted':
      case 'processing':
        return Icons.hourglass_empty_rounded;
      case 'sent':
        return Icons.check_circle_outline;
      case 'delivered':
      case 'read':
        return Icons.check_circle;
      case 'failed':
        return Icons.warning_amber_rounded;
      default:
        return Icons.hourglass_empty_rounded;
    }
  }

  Color _getStatusColor() {
    if (_isAutoSending) {
      return const Color(0xFFE65100);
    }
    switch (_deliveryStatus) {
      case 'accepted':
      case 'processing':
        return const Color(0xFFE65100);
      case 'sent':
        return const Color(0xFF2E7D32);
      case 'delivered':
      case 'read':
        return const Color(0xFF2E7D32);
      case 'failed':
        return const Color(0xFFC62828);
      default:
        return const Color(0xFFE65100);
    }
  }

  Widget _getStatusDetailWidget() {
    if (_isAutoSending) {
      return Text(
        _autoSendStep,
        style: const TextStyle(
          fontSize: 13,
          color: Color(0xFFE65100),
        ),
      );
    }
    switch (_deliveryStatus) {
      case 'accepted':
      case 'processing':
        return const Text(
          'Meta is processing this message. You can safely leave this screen. Delivery status will continue updating.',
          style: TextStyle(
            fontSize: 13,
            color: Color(0xFFF57F17),
          ),
        );
      case 'sent':
        return const Text(
          '✔ Receipt Saved\n✔ Message sent to recipient.',
          style: TextStyle(
            fontSize: 13,
            color: Color(0xFF2E7D32),
            height: 1.4,
          ),
        );
      case 'delivered':
      case 'read':
        return const Text(
          '✔ Receipt Saved\n✔ Message delivered to recipient device.',
          style: TextStyle(
            fontSize: 13,
            color: Color(0xFF2E7D32),
            height: 1.4,
          ),
        );
      case 'failed':
        return Text(
          (_error != null && _error!.trim().isNotEmpty)
              ? _error!
              : "Couldn't send WhatsApp receipt. Please try again.",
          style: const TextStyle(
            fontSize: 13,
            color: Color(0xFFC62828),
          ),
        );
      default:
        return Text(
          _autoSendStep,
          style: const TextStyle(
            fontSize: 13,
            color: Color(0xFFE65100),
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    ReceiptModel? receipt;
    try {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is Map<String, dynamic>) {
        receipt = args['receipt'] as ReceiptModel?;
      }
    } catch (e) {
      debugPrint('Error getting receipt: $e');
    }

    final finalReceipt = receipt ??
        ReceiptModel(
          id: 'fallback_error',
          organizationId: '',
          donorId: '',
          receiptNumber: 'N/A',
          amount: 0.0,
          purpose: 'N/A',
          paymentMode: 'N/A',
          paymentStatus: 'N/A',
          qrCodeValue: '',
          createdAt: DateTime.now().toIso8601String(),
          templateId: '',
          donorName: 'Error Loading Donor',
          donorMobile: 'N/A',
        );

    final theme = Theme.of(context);
    final isSuccess = _whatsappStatus;
    final isPendingTimeout = !_isAutoSending && !_whatsappStatus && _deliveryStatus == 'accepted';
    final titleText = (isSuccess || _isAutoSending || isPendingTimeout)
        ? '✅ Receipt Saved Successfully'
        : '🟡 Receipt Saved Successfully';

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final tempProvider = Provider.of<TemplateProvider>(context, listen: false);
    TemplateModel? activeTemplate;
    if (tempProvider.templates.isNotEmpty) {
      activeTemplate = tempProvider.templates.firstWhere(
        (t) => t.id == finalReceipt.templateId,
        orElse: () => tempProvider.templates.firstWhere(
          (t) => t.isDefault,
          orElse: () => tempProvider.templates.first,
        ),
      );
    } else {
      activeTemplate = TemplateModel(
        id: '',
        organizationId: finalReceipt.organizationId,
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
            title: const Text('Receipt Status'),
            automaticallyImplyLeading: false,
          ),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 24),
                  // Big Success Icon
                  const Center(
                    child: Icon(
                      Icons.check_circle_outline,
                      color: Colors.green,
                      size: 80,
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Dynamic Saved Status Title Card
                  Center(
                    child: Text(
                      titleText,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF2E1C0C),
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Receipt Details Card
                  Card(
                    color: Colors.white,
                    elevation: 1,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: Color(0xFFEFE6D9)),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(20.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildDetailRow('Receipt Number', finalReceipt.receiptNumber),
                          const Divider(height: 24, color: Color(0xFFF4EDE4)),
                          _buildDetailRow('Recipient Name', finalReceipt.donorName ?? 'Guest Donor'),
                          const Divider(height: 24, color: Color(0xFFF4EDE4)),
                          _buildDetailRow('Recipient Mobile', finalReceipt.donorMobile ?? 'N/A'),
                          const Divider(height: 24, color: Color(0xFFF4EDE4)),
                          _buildDetailRow('Amount', '₹${finalReceipt.amount.toStringAsFixed(0)}'),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // WhatsApp Status Box
                  Card(
                    color: _getStatusBoxColor(),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(
                        color: _getStatusBorderColor(),
                        width: 1,
                      ),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            _getStatusIcon(),
                            color: _getStatusColor(),
                            size: 24,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _getStatusText(),
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                    color: _getStatusColor(),
                                  ),
                                ),
                                const SizedBox(height: 6),
                                _getStatusDetailWidget(),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Action Buttons
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Primary Action: Retry button ONLY appears on failure when not sending
                      if (_deliveryStatus == 'failed' && !_isAutoSending) ...[
                        ElevatedButton.icon(
                          onPressed: _retryWhatsApp,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry WhatsApp'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: theme.colorScheme.primary,
                            foregroundColor: Colors.white,
                            minimumSize: const Size.fromHeight(50),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                              side: BorderSide(color: theme.colorScheme.primary, width: 1.5),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                      
                      // Create New Receipt Button (primary on success or while sending, secondary on failure)
                      ElevatedButton(
                        onPressed: () {
                          HapticFeedback.lightImpact();
                          Navigator.pushReplacementNamed(
                            context,
                            '/create-receipt',
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: (isSuccess || _isAutoSending) ? theme.colorScheme.primary : Colors.white,
                          foregroundColor: (isSuccess || _isAutoSending) ? Colors.white : theme.colorScheme.primary,
                          minimumSize: const Size.fromHeight(50),
                          side: (isSuccess || _isAutoSending) ? null : BorderSide(color: theme.colorScheme.primary, width: 1.5),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: const Text(
                          'Create New Receipt',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Back to Dashboard
                      OutlinedButton(
                        onPressed: () {
                          HapticFeedback.lightImpact();
                          Navigator.pushNamedAndRemoveUntil(
                            context,
                            '/dashboard',
                            (route) => false,
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: (isSuccess || _isAutoSending) ? theme.colorScheme.primary : Colors.grey[700],
                          side: BorderSide(
                            color: (isSuccess || _isAutoSending) ? theme.colorScheme.primary : Colors.grey[400]!,
                            width: 1.5,
                          ),
                          minimumSize: const Size.fromHeight(50),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: const Text(
                          'Back to Dashboard',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
        if (receipt != null)
          Positioned(
            left: -9999,
            top: -9999,
            child: SizedBox(
              width: 360,
              child: Material(
                type: MaterialType.transparency,
                child: RepaintBoundary(
                  key: _receiptKey,
                  child: TraditionalReceiptWidget(
                    receipt: receipt,
                    organization: auth.organization!,
                    template: activeTemplate,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: Colors.grey,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: Color(0xFF2E1C0C),
          ),
        ),
      ],
    );
  }
}
