import 'dart:io';
import 'package:flutter/services.dart' show rootBundle, MethodChannel, PlatformException;
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../widgets/receipt_theme.dart';
import 'universal_receipt_engine.dart';
import 'devanagari_shaper.dart';
import 'amount_to_words_service.dart';

class SharingService {
  static final Map<String, Uint8List> _imageCache = {};
  static pw.Font? _cachedTtfRegular;
  static pw.Font? _cachedTtfBold;
  static pw.Font? _cachedTtfYatra;

  static Future<Uint8List?> _downloadImage(String? url, {int maxRetries = 3}) async {
    if (url == null || url.trim().isEmpty) return null;
    final cleanUrl = url.trim();

    if (_imageCache.containsKey(cleanUrl)) {
      debugPrint('[IMAGE_CACHE] Hit for URL: $cleanUrl');
      return _imageCache[cleanUrl];
    }

    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        final response = await http
            .get(Uri.parse(cleanUrl))
            .timeout(const Duration(seconds: 10));
        if (response.statusCode == 200) {
          final bytes = response.bodyBytes;
          if (bytes.isNotEmpty) {
            _imageCache[cleanUrl] = bytes;
            debugPrint('[IMAGE_CACHE] Saved ${bytes.length} bytes for URL: $cleanUrl');
            return bytes;
          }
        }
      } catch (e) {
        debugPrint('Error downloading image (attempt $attempt/$maxRetries) for $cleanUrl: $e');
        if (attempt < maxRetries) {
          await Future.delayed(Duration(milliseconds: 250 * attempt));
        }
      }
    }
    return null;
  }

  /// Explicitly invalidate image cache (e.g. when user replaces logo or signature)
  static void clearImageCache([String? url]) {
    if (url != null) {
      _imageCache.remove(url.trim());
    } else {
      _imageCache.clear();
    }
  }

  static Future<pw.Font> _getTtfRegular() async {
    if (_cachedTtfRegular != null) return _cachedTtfRegular!;
    final fontData = await rootBundle.load('assets/fonts/Poppins-Regular.ttf');
    _cachedTtfRegular = pw.Font.ttf(fontData);
    return _cachedTtfRegular!;
  }

  static Future<pw.Font> _getTtfBold() async {
    if (_cachedTtfBold != null) return _cachedTtfBold!;
    final fontData = await rootBundle.load('assets/fonts/Poppins-Bold.ttf');
    _cachedTtfBold = pw.Font.ttf(fontData);
    return _cachedTtfBold!;
  }

  static Future<pw.Font> _getTtfYatra() async {
    if (_cachedTtfYatra != null) return _cachedTtfYatra!;
    final fontData = await rootBundle.load('assets/fonts/YatraOne-Regular.ttf');
    _cachedTtfYatra = pw.Font.ttf(fontData);
    return _cachedTtfYatra!;
  }

  /// Check if WhatsApp is launchable.
  static Future<bool> isWhatsAppInstalled() async {
    final nativeUri = Uri.parse("whatsapp://send");
    try {
      return await canLaunchUrl(nativeUri);
    } catch (_) {
      return false;
    }
  }

  /// Direct WhatsApp text/URL sharing (no file attachment).
  static Future<bool> shareViaWhatsAppNative(String mobile, String text) async {
    String formattedPhone = mobile.replaceAll(RegExp(r'[^0-9]'), '');
    if (!formattedPhone.startsWith('91') && formattedPhone.length == 10) {
      formattedPhone = '91$formattedPhone';
    }

    final nativeUri = Uri.parse(
        "whatsapp://send?phone=$formattedPhone&text=${Uri.encodeComponent(text)}");
    final webUri = Uri.parse(
        "https://wa.me/$formattedPhone?text=${Uri.encodeComponent(text)}");

    try {
      if (await canLaunchUrl(nativeUri)) {
        return await launchUrl(nativeUri,
            mode: LaunchMode.externalNonBrowserApplication);
      } else {
        return await launchUrl(webUri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      debugPrint('WhatsApp native share error: $e');
      return false;
    }
  }

  /// Sends invite details containing token link and 6-digit activation code via WhatsApp or SMS.
  static Future<void> sendInviteDetails({
    required String mobile,
    required String inviteCode,
    required String activationToken,
    required String orgName,
    required String role,
  }) async {
    final String inviteUrl = "https://app.pavtibook.online/invite/$activationToken";
    final String text = "🙏 नमस्कार,\n\n"
        "आपल्याला $orgName संस्थेमध्ये $role म्हणून आमंत्रित केले आहे.\n\n"
        "आपला निमंत्रण कोड (Activation Code): $inviteCode\n"
        "किंवा थेट खालील लिंकवर क्लिक करून आपले अकाऊंट सुरू करा:\n$inviteUrl\n\n"
        "पावतीबुक (PavtiBook) ॲप लिंक: https://pavtibook.online/download\n\n"
        "धन्यवाद.";

    final success = await shareViaWhatsAppNative(mobile, text);
    if (!success) {
      String formattedPhone = mobile.replaceAll(RegExp(r'[^0-9]'), '');
      if (!formattedPhone.startsWith('91') && formattedPhone.length == 10) {
        formattedPhone = '91$formattedPhone';
      }
      final smsUri = Uri.parse("sms:$formattedPhone?body=${Uri.encodeComponent(text)}");
      try {
        if (await canLaunchUrl(smsUri)) {
          await launchUrl(smsUri);
        }
      } catch (e) {
        debugPrint('SMS launch error: $e');
      }
    }
  }


  /// WhatsApp share with file attachment.
  ///
  /// ANDROID PLATFORM LIMITATION (documented):
  /// There is no Android intent that simultaneously pre-selects a WhatsApp
  /// recipient AND carries a file attachment.
  ///
  ///   `whatsapp://send?phone=X&text=Y`  → opens specific chat, NO file support.
  ///   `Intent.ACTION_SEND + EXTRA_STREAM` → carries the file, NO recipient pre-selection.
  ///
  /// CHOSEN APPROACH — Priority 1: file attachment is ALWAYS guaranteed.
  ///
  /// The system share sheet opens with the JPG/PDF attached and the receipt
  /// text as caption. The user selects WhatsApp, then picks the recipient
  /// inside WhatsApp. This is the ONLY production-reliable method.
  ///
  /// NOTE: A previous implementation attempted a "two-step" UX that fired
  /// `whatsapp://send?phone=X` after the share sheet closed. This caused
  /// WhatsApp to navigate away from the file-sending contact picker, discarding
  /// the attachment. That Step 2 has been removed permanently.
  static const _channel = MethodChannel('com.pavtibook.app/whatsapp_share');

  /// WhatsApp share with file attachment.
  ///
  /// Priority 1: File attachment is ALWAYS guaranteed.
  /// Priority 2: Direct WhatsApp chat is opened on Android using a custom MethodChannel.
  ///
  /// On Android: Uses com.pavtibook.app/whatsapp_share MethodChannel to launch an
  /// Intent targeting standard WhatsApp (com.whatsapp) or WhatsApp Business (com.whatsapp.w4b)
  /// with JID set to target the donor's phone number directly.
  ///
  /// Fallback: If Android MethodChannel fails or on other platforms (iOS), falls
  /// back to standard system share sheet.
  static Future<bool> shareViaWhatsAppWithFile({
    required String filePath,
    required String mimeType,
    required String text,
    required String mobile,
  }) async {
    debugPrint('SharingService: [shareViaWhatsAppWithFile] Preparing receipt...');
    try {
      final file = File(filePath);
      final exists = await file.exists();
      debugPrint('SharingService: [shareViaWhatsAppWithFile] Does file exist? $exists');
      if (!exists) {
        debugPrint('SharingService: [shareViaWhatsAppWithFile] file does not exist at $filePath');
        return false;
      }

      final int size = await file.length();
      debugPrint('SharingService: [shareViaWhatsAppWithFile] File size: $size bytes');
      debugPrint('SharingService: [shareViaWhatsAppWithFile] Mime type: $mimeType');
      debugPrint('SharingService: [shareViaWhatsAppWithFile] PDF path: $filePath');

      if (Platform.isAndroid) {
        String formattedPhone = mobile.replaceAll(RegExp(r'[^0-9]'), '');
        if (!formattedPhone.startsWith('91') && formattedPhone.length == 10) {
          formattedPhone = '91$formattedPhone';
        }

        if (formattedPhone.isNotEmpty) {
          debugPrint('SharingService: [shareViaWhatsAppWithFile] Launching Intent via MethodChannel...');
          try {
            final bool? success = await _channel.invokeMethod<bool>('shareToWhatsAppDirect', {
              'filePath': filePath,
              'phoneNumber': formattedPhone,
              'text': text,
            });
            debugPrint('SharingService: [shareViaWhatsAppWithFile] Intent launched? $success');
            if (success == true) {
              debugPrint('SharingService: [shareViaWhatsAppWithFile] Direct WhatsApp share succeeded');
              return true;
            } else {
              debugPrint('SharingService: [shareViaWhatsAppWithFile] Direct WhatsApp share returned false (WhatsApp not installed or intent failed)');
            }
          } on PlatformException catch (pe, stack) {
            debugPrint('SharingService: [shareViaWhatsAppWithFile] PlatformException during direct share: $pe');
            debugPrint('SharingService: [shareViaWhatsAppWithFile] Stacktrace:\n$stack');
          } catch (e, stack) {
            debugPrint('SharingService: [shareViaWhatsAppWithFile] Unexpected exception during direct share: $e');
            debugPrint('SharingService: [shareViaWhatsAppWithFile] Stacktrace:\n$stack');
          }
        } else {
          debugPrint('SharingService: [shareViaWhatsAppWithFile] Mobile number is empty, skipping direct share');
        }
      }

      // Fallback — share file via system share sheet.
      debugPrint('SharingService: [shareViaWhatsAppWithFile] Falling back to system share sheet (Share.shareXFiles)...');
      try {
        final result = await Share.shareXFiles(
          [XFile(filePath, mimeType: mimeType)],
          text: text,
        );
        debugPrint('SharingService: [shareViaWhatsAppWithFile] ShareResult: status=${result.status}, raw=${result.toString()}');
        // NOTE: On Android, result.status is ALWAYS 'dismissed' regardless of whether
        // the user actually shared or not — Android does not report back the selected app.
        // We treat ANY non-exception result as success. The share sheet was shown with the
        // file attached; the user chose what to do with it. Only PlatformException = failure.
        return true;
      } on PlatformException catch (pe, stack) {
        debugPrint('SharingService: [shareViaWhatsAppWithFile] PlatformException in Share.shareXFiles: $pe');
        debugPrint('SharingService: [shareViaWhatsAppWithFile] Stacktrace:\n$stack');
        return false;
      } catch (shareError, stack) {
        debugPrint('SharingService: [shareViaWhatsAppWithFile] General Exception in Share.shareXFiles: $shareError');
        debugPrint('SharingService: [shareViaWhatsAppWithFile] Stacktrace:\n$stack');
        return false;
      }
    } catch (e, stack) {
      debugPrint('SharingService: [shareViaWhatsAppWithFile] shareViaWhatsAppWithFile outer error: $e');
      debugPrint('SharingService: [shareViaWhatsAppWithFile] Stacktrace:\n$stack');
      return false;
    }
  }

  /// Open a locally saved file on the device.
  static Future<bool> openLocalFile(String filePath) async {
    try {
      if (Platform.isAndroid) {
        final bool? success = await _channel.invokeMethod<bool>('openFile', {'filePath': filePath});
        return success == true;
      } else {
        final uri = Uri.parse('file://$filePath');
        if (await canLaunchUrl(uri)) {
          return await launchUrl(uri);
        }
      }
      return false;
    } catch (e) {
      debugPrint('openLocalFile error: $e');
      return false;
    }
  }

  /// Generic system text sharing.
  static Future<void> shareViaSystemShareSheet(String text,
      {String? subject}) async {
    try {
      await Share.share(text, subject: subject);
    } catch (e) {
      debugPrint('shareViaSystemShareSheet error (caught safely): $e');
    }
  }

  /// Share a local file via the system share sheet.
  static Future<void> shareLocalFile(String filePath, String mimeType, {String? text}) async {
    try {
      await Share.shareXFiles(
        [XFile(filePath, mimeType: mimeType)],
        text: text,
      );
    } catch (e) {
      debugPrint('shareLocalFile error: $e');
    }
  }


  /// Generate a valid A5 Landscape temple receipt PDF document in memory.
  /// Generate a valid A5 Landscape temple receipt PDF document in memory.
  static Future<List<int>> generateMinimalPdf({
    ReceiptModel? receipt,
    required String templateType,
    required String receiptNumber,
    required String orgName,
    required String donorName,
    required double amount,
    required String purpose,
    required String date,
    required String paymentMode,
    required String paymentStatus,
    required String qrCodeValue,
    required String signatureLabel,
    String? donorAddress,
    String? donorMobile,
    String? donorEmail,
    String? donorId,
    String? receiptTime,
    String? customNote,
    String? presidentSignatureUrl,
    String? treasurerSignatureUrl,
    String? secretarySignatureUrl,
    double? presidentSignatureScale,
    double? treasurerSignatureScale,
    double? secretarySignatureScale,
    String? presidentName,
    String? treasurerName,
    String? secretaryName,
    String? orgAddress,
    String? headerTextLocal,
    String? headerTextEn,
    String? headerLogoUrl,
    String? leftSideImageUrl,
    String? rightSideImageUrl,
    String? customStampUrl,
    String? signatureUrl,
    String? footerText,
    String? collectorName,
    String? receiptThemeId,
    String? brandPrimaryColorHex,
    String? bgColorHex,
    String? borderColorHex,
    String? languageCode,
    double? watermarkOpacity,
    double? logoScale,
    double? stampScale,
    Map<String, double>? customTextSizes,
    Uint8List? capturedReceiptImage,
  }) async {
    final pdf = pw.Document();

    final String lang = (languageCode != null && languageCode.trim().isNotEmpty)
        ? languageCode.trim()
        : 'mr';
    final labels = DefaultPavtiBookLabels.getLabels(lang);

    final String rawCreatedAt = (receipt != null && receipt.createdAt.isNotEmpty)
        ? receipt.createdAt
        : (receiptTime ?? date);
    final DateTime? parsedDate = DateTime.tryParse(rawCreatedAt) ?? DateTime.tryParse(date);
    final String dateStrPdf = parsedDate != null
        ? DateFormat('dd MMMM yyyy').format(parsedDate)
        : date;
    final String timeStrPdf = parsedDate != null
        ? DateFormat('hh:mm a').format(parsedDate)
        : (receiptTime != null && receiptTime.isNotEmpty ? receiptTime : "");

    final String effectiveQrCodeValue = (qrCodeValue.trim().isNotEmpty)
        ? qrCodeValue.trim()
        : (receipt?.receiptNumber ?? receiptNumber);

    final String resDonorName = (receipt?.donorName != null && receipt!.donorName!.trim().isNotEmpty)
        ? receipt.donorName!
        : (donorName.trim().isNotEmpty ? donorName : '');
    final String resDonorAddress = (receipt?.donorAddress != null && receipt!.donorAddress!.trim().isNotEmpty)
        ? receipt.donorAddress!
        : (donorAddress != null ? donorAddress.trim() : '');
    final String resDonorMobile = (receipt?.donorMobile != null && receipt!.donorMobile!.trim().isNotEmpty)
        ? '+91 ${receipt.donorMobile}'
        : (donorMobile != null && donorMobile.trim().isNotEmpty ? '+91 ${donorMobile.trim()}' : '');
    final String resDonorEmail = (donorEmail != null && donorEmail.trim().isNotEmpty)
        ? donorEmail.trim()
        : '';
    final String resDonorId = (receipt?.donorId != null && receipt!.donorId.trim().isNotEmpty)
        ? receipt.donorId
        : (donorId != null ? donorId.trim() : '');

    // Load or retrieve cached custom fonts for Devanagari support
    final ttfRegular = await _getTtfRegular();
    final ttfBold = await _getTtfBold();
    final ttfYatra = await _getTtfYatra();

    final amountWords = AmountToWordsService.convert(amount, languageCode: languageCode ?? 'mr');

    // Download custom images in memory
    final headerLogoBytes = await _downloadImage(headerLogoUrl);
    // leftSideImageUrl and rightSideImageUrl are passed through to the receipt but not rendered directly in this PDF layout
    final customStampBytes = await _downloadImage(customStampUrl);
    final signatureBytes = await _downloadImage(signatureUrl);
    final presidentSigBytes = await _downloadImage(presidentSignatureUrl);
    final treasurerSigBytes = await _downloadImage(treasurerSignatureUrl);
    final secretarySigBytes = await _downloadImage(secretarySignatureUrl);

    // headerLogoBytes, leftSideImageBytes, rightSideImageBytes are used below via headerLogoImage
    final pw.MemoryImage? customStamp =
        customStampBytes != null ? pw.MemoryImage(customStampBytes) : null;
    final pw.MemoryImage? signature =
        signatureBytes != null ? pw.MemoryImage(signatureBytes) : null;
    final pw.MemoryImage? presidentSig =
        presidentSigBytes != null ? pw.MemoryImage(presidentSigBytes) : signature;
    final pw.MemoryImage? treasurerSig =
        treasurerSigBytes != null ? pw.MemoryImage(treasurerSigBytes) : null;
    final pw.MemoryImage? secretarySig =
        secretarySigBytes != null ? pw.MemoryImage(secretarySigBytes) : null;

    Uint8List? watermarkBytes;
    try {
      final wmByteData = await rootBundle.load('assets/images/Pavati-Book-Logo-01(1).png');
      watermarkBytes = wmByteData.buffer.asUint8List();
    } catch (_) {
      try {
        final wmByteData = await rootBundle.load('assets/images/Pavati-Book-Logo-01.png');
        watermarkBytes = wmByteData.buffer.asUint8List();
      } catch (_) {}
    }
    final pw.MemoryImage? watermarkImage =
        watermarkBytes != null ? pw.MemoryImage(watermarkBytes) : null;

    pw.MemoryImage? thankYouBadge;
    try {
      final tyPath = (lang.toLowerCase().trim() == 'en' || lang.toLowerCase().trim() == 'english')
          ? 'assets/images/thank_you_en.png'
          : 'assets/images/thank_you_mr.png';
      final tyByteData = await rootBundle.load(tyPath);
      thankYouBadge = pw.MemoryImage(tyByteData.buffer.asUint8List());
    } catch (_) {}

    pw.MemoryImage? logoIconImage;
    try {
      final logoByteData = await rootBundle.load('assets/images/Pavati-Book-LogoIcon-Clean.png');
      logoIconImage = pw.MemoryImage(logoByteData.buffer.asUint8List());
    } catch (_) {
      try {
        final logoByteData = await rootBundle.load('assets/images/Pavati-Book-LogoIcon.png');
        logoIconImage = pw.MemoryImage(logoByteData.buffer.asUint8List());
      } catch (_) {}
    }

    pw.MemoryImage? headerLogoImage;
    if (headerLogoBytes != null) {
      headerLogoImage = pw.MemoryImage(headerLogoBytes);
    } else {
      try {
        final lByteData = await rootBundle.load('assets/images/Pavati-Book-Logo.png');
        headerLogoImage = pw.MemoryImage(lByteData.buffer.asUint8List());
      } catch (_) {}
    }

      final resolvedPalette = getThemePalette(
          receiptThemeId,
          OrganizationModel(
              id: '',
              name: '',
              type: '',
              upiId: '',
              isVerified: false,
              subscriptionPlan: 'free'),
          null);
      final String hexStr = resolvedPalette.primary.toARGB32().toRadixString(16).substring(2);
      final String bgHexStr = resolvedPalette.secondary.toARGB32().toRadixString(16).substring(2);

      final primaryMaroon = (brandPrimaryColorHex != null &&
              brandPrimaryColorHex.isNotEmpty &&
              brandPrimaryColorHex != '#3E2723' &&
              brandPrimaryColorHex != '#D84315' &&
              brandPrimaryColorHex != '#E65100')
          ? PdfColor.fromHex(brandPrimaryColorHex)
          : PdfColor.fromHex('#$hexStr');
      final pageBg = (bgColorHex != null &&
              bgColorHex.isNotEmpty &&
              bgColorHex != '#FFFDD0')
          ? PdfColor.fromHex(bgColorHex)
          : PdfColor.fromHex('#$bgHexStr');
      final creamBg = PdfColor.fromHex('#$bgHexStr');

      pdf.addPage(
        pw.Page(
          pageFormat: const PdfPageFormat(
              DefaultPavtiBookGeometry.masterWidth,
              DefaultPavtiBookGeometry.masterHeight),
          margin: pw.EdgeInsets.zero,
          build: (pw.Context context) {
            return pw.SizedBox(
              width: DefaultPavtiBookGeometry.masterWidth,
              height: DefaultPavtiBookGeometry.masterHeight,
              child: pw.Stack(
                children: [
                  // Outer Background
                  pw.Positioned.fill(
                    child: pw.Container(
                      decoration: pw.BoxDecoration(
                        color: pageBg,
                        border: pw.Border.all(color: primaryMaroon, width: 2.5),
                      ),
                    ),
                  ),

                  // Sidebar Background
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.sidebarX,
                    top: 0,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.sidebarWidth,
                      height: DefaultPavtiBookGeometry.masterHeight,
                      child: pw.Container(color: primaryMaroon),
                    ),
                  ),

                  // Greeting Line
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.greetingLine.x,
                    top: DefaultPavtiBookGeometry.greetingLine.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.greetingLine.width,
                      height: DefaultPavtiBookGeometry.greetingLine.height,
                      child: pw.Center(
                        child: pw.FittedBox(
                          fit: pw.BoxFit.scaleDown,
                          child: pw.Text(
                            DevanagariShaper.shape(headerTextLocal ?? '॥ श्री गणेशाय नमः ॥'),
                            style: pw.TextStyle(
                              font: ttfBold,
                              fontSize: DefaultPavtiBookGeometry.fontGreeting,
                              fontWeight: pw.FontWeight.bold,
                              color: primaryMaroon,
                              letterSpacing: 2.0,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Organization Title
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.headerOrg.x,
                    top: DefaultPavtiBookGeometry.headerOrg.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.headerOrg.width,
                      height: DefaultPavtiBookGeometry.headerOrg.height,
                      child: pw.FittedBox(
                        fit: pw.BoxFit.scaleDown,
                        alignment: pw.Alignment.center,
                        child: pw.Container(
                          constraints: pw.BoxConstraints(
                            maxWidth: DefaultPavtiBookGeometry.headerOrg.width,
                            maxHeight: DefaultPavtiBookGeometry.headerOrg.height,
                          ),
                          child: pw.Text(
                            DevanagariShaper.shape((orgName.isEmpty || orgName == 'गणपती बाप्पा मोरया')
                                ? (lang == 'mr' ? 'आपल्या संस्थेचे नाव' : 'Your Organization Name')
                                : orgName),
                            textAlign: pw.TextAlign.center,
                            style: pw.TextStyle(
                              font: ttfBold,
                              fontSize: DefaultPavtiBookGeometry.fontOrgTitle,
                              fontWeight: pw.FontWeight.bold,
                              color: primaryMaroon,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Subtitle
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.headerSubtitle.x,
                    top: DefaultPavtiBookGeometry.headerSubtitle.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.headerSubtitle.width,
                      height: DefaultPavtiBookGeometry.headerSubtitle.height,
                      child: pw.FittedBox(
                        fit: pw.BoxFit.scaleDown,
                        alignment: pw.Alignment.center,
                        child: pw.Text(
                          DevanagariShaper.shape((headerTextLocal != null && headerTextLocal.trim().isNotEmpty)
                              ? headerTextLocal
                              : ((headerTextEn != null && headerTextEn.trim().isNotEmpty)
                                  ? headerTextEn
                                  : (labels['org_type_desc'] ?? 'धर्म / संस्था / मंडळ / NGO / ट्रस्ट'))),
                          textAlign: pw.TextAlign.center,
                          style: pw.TextStyle(
                            font: ttfBold,
                            fontSize: DefaultPavtiBookGeometry.fontSubtitle,
                            color: PdfColors.grey700,
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Organization Address with Vector Location Pin Icon
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.headerAddress.x,
                    top: DefaultPavtiBookGeometry.headerAddress.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.headerAddress.width,
                      height: DefaultPavtiBookGeometry.headerAddress.height,
                      child: pw.FittedBox(
                        fit: pw.BoxFit.scaleDown,
                        alignment: pw.Alignment.center,
                        child: pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.center,
                          crossAxisAlignment: pw.CrossAxisAlignment.center,
                          children: [
                            _buildPdfLocationPinIcon(size: 16, color: PdfColor.fromHex('#D84315')),
                            pw.SizedBox(width: 4),
                            pw.Text(
                              DevanagariShaper.shape((orgAddress != null && orgAddress.trim().isNotEmpty)
                                  ? (orgAddress.trim().contains('Panvel') || orgAddress.trim().contains('410209')
                                      ? orgAddress.trim().replaceAll('📍', '').trim()
                                      : '${orgAddress.trim().replaceAll('📍', '').trim()}, Panvel - 410209')
                                  : 'kamothe, Panvel - 410209'),
                              textAlign: pw.TextAlign.center,
                              style: pw.TextStyle(
                                font: ttfRegular,
                                fontSize: DefaultPavtiBookGeometry.fontAddress,
                                color: PdfColors.grey800,
                                fontFallback: [ttfYatra, ttfRegular, ttfBold],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Organization Contact Row with Vector Icons (Phone, Email, Website)
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.headerContact.x,
                    top: DefaultPavtiBookGeometry.headerContact.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.headerContact.width,
                      height: DefaultPavtiBookGeometry.headerContact.height,
                      child: pw.FittedBox(
                        fit: pw.BoxFit.scaleDown,
                        alignment: pw.Alignment.center,
                        child: pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.center,
                          crossAxisAlignment: pw.CrossAxisAlignment.center,
                          children: [
                            _buildPdfPhoneIcon(size: 16, color: primaryMaroon),
                            pw.SizedBox(width: 4),
                            pw.Text(' +91 8097041571     ', style: pw.TextStyle(font: ttfBold, fontSize: DefaultPavtiBookGeometry.fontContact, color: PdfColors.black)),
                            _buildPdfEmailIcon(size: 16, color: primaryMaroon),
                            pw.SizedBox(width: 4),
                            pw.Text(' bhosalepranay1@gmail.com     ', style: pw.TextStyle(font: ttfRegular, fontSize: DefaultPavtiBookGeometry.fontContact, color: PdfColors.black)),
                            _buildPdfWebIcon(size: 16, color: primaryMaroon),
                            pw.SizedBox(width: 4),
                            pw.Text(' www.yourorg.org', style: pw.TextStyle(font: ttfRegular, fontSize: DefaultPavtiBookGeometry.fontContact, color: PdfColors.black)),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Header Logo
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.headerLogo.x,
                    top: DefaultPavtiBookGeometry.headerLogo.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.headerLogo.width,
                      height: DefaultPavtiBookGeometry.headerLogo.height,
                      child: pw.Center(
                        child: pw.SizedBox(
                          width: DefaultPavtiBookGeometry.headerLogo.width * (logoScale ?? 1.0).clamp(0.6, 1.6),
                          height: DefaultPavtiBookGeometry.headerLogo.height * (logoScale ?? 1.0).clamp(0.6, 1.6),
                          child: headerLogoImage != null
                              ? pw.Image(headerLogoImage, fit: pw.BoxFit.contain, alignment: pw.Alignment.centerLeft)
                              : pw.SizedBox.shrink(),
                        ),
                      ),
                    ),
                  ),

                  // Logo Tagline
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.logoTagline.x,
                    top: DefaultPavtiBookGeometry.logoTagline.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.logoTagline.width,
                      height: DefaultPavtiBookGeometry.logoTagline.height,
                      child: pw.Text(
                        'Digital Trust. Transparent Receipts.',
                        style: pw.TextStyle(
                          font: ttfRegular,
                          fontSize: 13,
                          color: PdfColors.grey700,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                    ),
                  ),

                  // Watermark
                  if (watermarkImage != null)
                    pw.Positioned(
                      left: DefaultPavtiBookGeometry.donorContainer.x,
                      top: DefaultPavtiBookGeometry.donorContainer.y,
                      child: pw.SizedBox(
                        width: DefaultPavtiBookGeometry.donorContainer.width,
                        height: DefaultPavtiBookGeometry.donorContainer.height,
                        child: pw.Center(
                          child: pw.Opacity(
                            opacity: watermarkOpacity ?? 0.06,
                            child: pw.Image(
                              watermarkImage,
                              width: 580,
                              height: 180,
                              fit: pw.BoxFit.contain,
                            ),
                          ),
                        ),
                      ),
                    ),

                  // Sidebar Block (Receipt No, Date, Time)
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.sidebarReceipt.x,
                    top: DefaultPavtiBookGeometry.sidebarReceipt.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.sidebarReceipt.width,
                      height: DefaultPavtiBookGeometry.sidebarReceipt.height,
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text(DevanagariShaper.shape(labels['receipt_no_abbr'] ?? 'पावती क्र.'), style: pw.TextStyle(font: ttfRegular, fontSize: 18, color: PdfColors.grey300)),
                          pw.SizedBox(height: 4),
                          pw.Text(receiptNumber, style: pw.TextStyle(font: ttfBold, fontSize: DefaultPavtiBookGeometry.fontSidebarReceiptNo, color: PdfColors.white)),
                          pw.SizedBox(height: 12),
                          pw.Text(DevanagariShaper.shape('${(labels['date_label'] ?? 'दिनांक').replaceAll(':', '').trim()} : $dateStrPdf'), style: pw.TextStyle(font: ttfBold, fontSize: 17, color: PdfColors.white)),
                          pw.SizedBox(height: 6),
                          pw.Text(DevanagariShaper.shape('${(labels['time_label'] ?? 'वेळ').replaceAll(':', '').trim()} : $timeStrPdf'), style: pw.TextStyle(font: ttfBold, fontSize: 17, color: PdfColors.white)),
                        ],
                      ),
                    ),
                  ),

                  // Header Verification QR Box
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.headerQr.x,
                    top: DefaultPavtiBookGeometry.headerQr.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.headerQr.width,
                      height: DefaultPavtiBookGeometry.headerQr.height,
                      child: pw.Container(
                        decoration: pw.BoxDecoration(
                          color: PdfColors.white,
                          borderRadius: const pw.BorderRadius.all(pw.Radius.circular(14)),
                          border: pw.Border.all(color: PdfColor.fromHex('#D84315'), width: 2.2),
                        ),
                        padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                        child: pw.Column(
                          mainAxisAlignment: pw.MainAxisAlignment.center,
                          children: [
                            pw.Text('SCAN & VERIFY', style: pw.TextStyle(font: ttfBold, fontSize: 13, color: PdfColor.fromHex('#D84315'))),
                            pw.SizedBox(height: 4),
                            pw.SizedBox(
                              width: 120,
                              height: 120,
                              child: pw.Stack(
                                children: [
                                  // Layer 1: High-quality vector QR code
                                  pw.Positioned(
                                    left: 0,
                                    top: 0,
                                    child: pw.BarcodeWidget(
                                      barcode: pw.Barcode.qrCode(errorCorrectLevel: pw.BarcodeQRCorrectionLevel.high),
                                      data: 'https://pavtibook.online/verify/$effectiveQrCodeValue',
                                      color: PdfColors.black,
                                      backgroundColor: PdfColors.white,
                                      width: 120,
                                      height: 120,
                                    ),
                                  ),
                                  // Layer 2: Clean solid white background in exact mathematical center (120 - 36) / 2 = 42
                                  pw.Positioned(
                                    left: 42,
                                    top: 42,
                                    child: pw.Container(
                                      width: 36,
                                      height: 36,
                                      decoration: const pw.BoxDecoration(
                                        color: PdfColors.white,
                                        borderRadius: pw.BorderRadius.all(pw.Radius.circular(6)),
                                      ),
                                    ),
                                  ),
                                  // Layer 3: PavtiBook logo icon centered (120 - 28) / 2 = 46
                                  if (logoIconImage != null)
                                    pw.Positioned(
                                      left: 46,
                                      top: 46,
                                      child: pw.SizedBox(
                                        width: 28,
                                        height: 28,
                                        child: pw.Image(logoIconImage, fit: pw.BoxFit.contain),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            pw.SizedBox(height: 4),
                            pw.Text('UPI / QR', style: pw.TextStyle(font: ttfBold, fontSize: 12, color: PdfColors.grey700)),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Donor Container Box
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.donorContainer.x,
                    top: DefaultPavtiBookGeometry.donorContainer.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.donorContainer.width,
                      height: DefaultPavtiBookGeometry.donorContainer.height,
                      child: pw.Container(
                        decoration: pw.BoxDecoration(
                          color: PdfColors.white,
                          borderRadius: const pw.BorderRadius.all(pw.Radius.circular(16)),
                          border: pw.Border.all(color: PdfColors.grey300, width: 1.5),
                        ),
                      ),
                    ),
                  ),
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.donorTitlePill.x,
                    top: DefaultPavtiBookGeometry.donorTitlePill.y,
                    child: _buildPdfPill(labels['donor_details'] ?? 'देणगीदार माहिती', primaryMaroon, 16, DefaultPavtiBookGeometry.donorTitlePill.width + 20.0, DefaultPavtiBookGeometry.donorTitlePill.height, ttfBold),
                  ),
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.donorFields.x,
                    top: DefaultPavtiBookGeometry.donorFields.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.donorFields.width,
                      height: DefaultPavtiBookGeometry.donorFields.height,
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        mainAxisAlignment: pw.MainAxisAlignment.center,
                        children: [
                          _buildPdfDonorRow(labels['donor_name'] ?? 'नाव :', resDonorName, ttfBold, ttfRegular, primaryMaroon, ttfYatra: ttfYatra),
                          _buildPdfDonorRow(labels['donor_address'] ?? 'पत्ता :', resDonorAddress, ttfBold, ttfRegular, primaryMaroon, ttfYatra: ttfYatra),
                          _buildPdfDonorRow(labels['donor_mobile'] ?? 'मोबाईल :', resDonorMobile, ttfBold, ttfRegular, primaryMaroon, ttfYatra: ttfYatra),
                          _buildPdfDonorRow(labels['donor_email'] ?? 'ईमेल :', resDonorEmail, ttfBold, ttfRegular, primaryMaroon, ttfYatra: ttfYatra),
                          _buildPdfDonorRow(labels['donor_id'] ?? 'देणगीदार आयडी :', resDonorId, ttfBold, ttfRegular, primaryMaroon, ttfYatra: ttfYatra),
                        ],
                      ),
                    ),
                  ),

                  // Thank-You Badge (NO WHITE RECTANGLE BEHIND IT)
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.donorAutoFill.x,
                    top: DefaultPavtiBookGeometry.donorAutoFill.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.donorAutoFill.width,
                      height: DefaultPavtiBookGeometry.donorAutoFill.height,
                      child: pw.Center(
                        child: thankYouBadge != null
                            ? pw.Image(thankYouBadge, fit: pw.BoxFit.contain)
                            : pw.Text(
                                DevanagariShaper.shape((lang == 'en') ? 'Thank You!' : 'धन्यवाद!'),
                                style: pw.TextStyle(font: ttfBold, fontSize: 18, color: primaryMaroon),
                              ),
                      ),
                    ),
                  ),

                  // Auto-Number Status Card
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.donorStatus.x,
                    top: DefaultPavtiBookGeometry.donorStatus.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.donorStatus.width,
                      height: DefaultPavtiBookGeometry.donorStatus.height,
                      child: pw.Container(
                        decoration: pw.BoxDecoration(
                          color: PdfColor.fromHex('#E8F5E9'),
                          borderRadius: const pw.BorderRadius.all(pw.Radius.circular(14)),
                          border: pw.Border.all(color: PdfColor.fromHex('#A5D6A7'), width: 1.5),
                        ),
                        padding: const pw.EdgeInsets.all(12),
                        child: pw.Column(
                          mainAxisAlignment: pw.MainAxisAlignment.center,
                          children: [
                            pw.Row(
                              mainAxisAlignment: pw.MainAxisAlignment.center,
                              children: [
                                _buildPdfCheckIcon(size: 16, color: PdfColor.fromHex('#2E7D32')),
                                pw.SizedBox(width: 6),
                                pw.Text(DevanagariShaper.shape(labels['donor_autonum_title'] ?? 'स्वयंचलित क्रमांक'), style: pw.TextStyle(font: ttfBold, fontSize: 15, color: PdfColor.fromHex('#2E7D32'))),
                              ],
                            ),
                            pw.SizedBox(height: 4),
                            pw.Text(DevanagariShaper.shape(labels['donor_autonum_sub'] ?? 'तारीख आणि वेळ आधारित'), style: pw.TextStyle(font: ttfRegular, fontSize: 13, color: PdfColor.fromHex('#1B5E20'))),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Donation Details Title Pill & Table
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.donationTitlePill.x,
                    top: DefaultPavtiBookGeometry.donationTitlePill.y,
                    child: _buildPdfPill(labels['donation_details'] ?? 'देणगी तपशील', primaryMaroon, 16, DefaultPavtiBookGeometry.donationTitlePill.width + 20.0, DefaultPavtiBookGeometry.donationTitlePill.height, ttfBold),
                  ),
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.donationTable.x,
                    top: DefaultPavtiBookGeometry.donationTable.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.donationTable.width,
                      height: DefaultPavtiBookGeometry.donationTable.height,
                      child: pw.Table(
                        border: pw.TableBorder.all(color: primaryMaroon, width: 1.5),
                        columnWidths: const {
                          0: pw.FixedColumnWidth(65),
                          1: pw.FixedColumnWidth(220),
                          2: pw.FixedColumnWidth(220),
                          3: pw.FixedColumnWidth(195),
                        },
                        children: [
                          pw.TableRow(
                            decoration: pw.BoxDecoration(color: primaryMaroon),
                            children: [
                              _buildPdfTableCell(labels['table_sr_no'] ?? 'अ.क्र.', ttfBold, 17, PdfColors.white, align: pw.TextAlign.center),
                              _buildPdfTableCell(labels['table_details'] ?? 'तपशील', ttfBold, 17, PdfColors.white, align: pw.TextAlign.center),
                              _buildPdfTableCell(labels['table_purpose_dept'] ?? 'उद्देश / विभाग', ttfBold, 17, PdfColors.white, align: pw.TextAlign.center),
                              _buildPdfTableCell(labels['table_amount'] ?? 'रक्कम (₹)', ttfBold, 17, PdfColors.white, align: pw.TextAlign.center),
                            ],
                          ),
                          pw.TableRow(
                            decoration: const pw.BoxDecoration(color: PdfColors.white),
                            children: [
                              _buildPdfTableCell('1', ttfRegular, 17, PdfColors.black, align: pw.TextAlign.center),
                              _buildPdfTableCell(purpose.isNotEmpty ? purpose : (labels['table_default_purpose'] ?? 'Donation (देणगी)'), ttfRegular, 17, PdfColors.black),
                              _buildPdfTableCell(labels['table_default_dept'] ?? 'सामान्य कार्य', ttfRegular, 17, PdfColors.black),
                              _buildPdfTableCell(amount.toStringAsFixed(2), ttfBold, 17, PdfColors.black, align: pw.TextAlign.right),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Edit Details Pill
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.editDetailsPill.x,
                    top: DefaultPavtiBookGeometry.editDetailsPill.y,
                    child: pw.Container(
                      decoration: pw.BoxDecoration(
                        color: PdfColors.white,
                        borderRadius: const pw.BorderRadius.all(pw.Radius.circular(12)),
                        border: pw.Border.all(color: PdfColors.grey400, width: 1.0),
                      ),
                      padding: const pw.EdgeInsets.symmetric(horizontal: 18, vertical: 7),
                      child: pw.Row(
                        children: [
                          _buildPdfPencilIcon(size: 14, color: primaryMaroon),
                          pw.SizedBox(width: 6),
                          pw.Text(DevanagariShaper.shape(labels['edit_details_pill'] ?? 'तपशील संपादित करा  •  अनेक आयटम जोडू शकता'), style: pw.TextStyle(font: ttfBold, fontSize: 15, color: PdfColors.black)),
                        ],
                      ),
                    ),
                  ),

                  // Amount Summary Box
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.amountBox.x,
                    top: DefaultPavtiBookGeometry.amountBox.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.amountBox.width,
                      height: DefaultPavtiBookGeometry.amountBox.height,
                      child: pw.Container(
                        decoration: pw.BoxDecoration(
                          color: creamBg,
                          borderRadius: const pw.BorderRadius.all(pw.Radius.circular(16)),
                          border: pw.Border.all(color: primaryMaroon, width: 2.0),
                        ),
                        padding: const pw.EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.stretch,
                          children: [
                            pw.Row(
                              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                              children: [
                                pw.Text(DevanagariShaper.shape(labels['subtotal'] ?? 'उपएकूण :'), style: pw.TextStyle(font: ttfRegular, fontSize: 18, color: PdfColors.black)),
                                pw.Text(amount.toStringAsFixed(2), style: pw.TextStyle(font: ttfBold, fontSize: 18, color: PdfColors.black)),
                              ],
                            ),
                            pw.SizedBox(height: 6),
                            pw.Row(
                              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                              children: [
                                pw.Text(DevanagariShaper.shape(labels['discount'] ?? 'सूट :'), style: pw.TextStyle(font: ttfRegular, fontSize: 18, color: PdfColors.black)),
                                pw.Text('0.00', style: pw.TextStyle(font: ttfRegular, fontSize: 18, color: PdfColors.black)),
                              ],
                            ),
                            pw.SizedBox(height: 6),
                            pw.Divider(height: 1, color: primaryMaroon, thickness: 1.5),
                            pw.SizedBox(height: 8),
                            pw.Row(
                              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                              children: [
                                pw.Text(DevanagariShaper.shape(labels['total_amount'] ?? 'एकूण रक्कम :'), style: pw.TextStyle(font: ttfBold, fontSize: 20, color: primaryMaroon)),
                                pw.Text('₹ ${amount.toStringAsFixed(2)}', style: pw.TextStyle(font: ttfBold, fontSize: 22, color: primaryMaroon)),
                              ],
                            ),
                            if (amountWords.isNotEmpty) ...[
                              pw.SizedBox(height: 6),
                              pw.Text(
                                DevanagariShaper.shape('${labels['amount_in_words_label'] ?? 'रक्कम शब्दात :'}  $amountWords'),
                                textAlign: pw.TextAlign.right,
                                style: pw.TextStyle(font: ttfRegular, fontSize: 15, color: PdfColors.black),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Payment Method Title Pill & Chips
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.paymentTitlePill.x,
                    top: DefaultPavtiBookGeometry.paymentTitlePill.y,
                    child: _buildPdfPill(labels['payment_method_title'] ?? 'पेमेंट पद्धत', primaryMaroon, 16, DefaultPavtiBookGeometry.paymentTitlePill.width + 20.0, DefaultPavtiBookGeometry.paymentTitlePill.height, ttfBold),
                  ),
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.paymentContainer.x,
                    top: DefaultPavtiBookGeometry.paymentContainer.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.paymentContainer.width,
                      height: DefaultPavtiBookGeometry.paymentContainer.height,
                      child: pw.Container(
                        decoration: pw.BoxDecoration(
                          color: creamBg,
                          borderRadius: const pw.BorderRadius.all(pw.Radius.circular(14)),
                          border: pw.Border.all(color: PdfColors.grey300, width: 1.5),
                        ),
                        padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 5),
                        child: pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceEvenly,
                          children: [
                            _buildPdfPayChip(labels['pay_cash'] ?? 'रोख', (paymentMode.toLowerCase().contains('cash') || paymentMode.toLowerCase().contains('रोख')), primaryMaroon, ttfBold),
                            _buildPdfPayChip(labels['pay_upi'] ?? 'UPI', (paymentMode.toLowerCase().contains('upi') || paymentMode.toLowerCase().contains('google') || paymentMode.toLowerCase().contains('phone')), primaryMaroon, ttfBold),
                            _buildPdfPayChip(labels['pay_bank'] ?? 'बँक हस्तांतरण', (paymentMode.toLowerCase().contains('bank') || paymentMode.toLowerCase().contains('neft') || paymentMode.toLowerCase().contains('rtgs')), primaryMaroon, ttfBold),
                            _buildPdfPayChip(labels['pay_cheque'] ?? 'धनादेश', (paymentMode.toLowerCase().contains('cheque') || paymentMode.toLowerCase().contains('चेक')), primaryMaroon, ttfBold),
                            _buildPdfPayChip(labels['pay_other'] ?? 'इतर', paymentMode.toLowerCase() == 'other', primaryMaroon, ttfBold),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Notes Box
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.notesBox.x,
                    top: DefaultPavtiBookGeometry.notesBox.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.notesBox.width,
                      height: DefaultPavtiBookGeometry.notesBox.height,
                      child: pw.Container(
                        decoration: pw.BoxDecoration(
                          color: PdfColors.white,
                          borderRadius: const pw.BorderRadius.all(pw.Radius.circular(14)),
                          border: pw.Border.all(color: PdfColors.grey300, width: 1.5),
                        ),
                        padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          mainAxisAlignment: pw.MainAxisAlignment.center,
                          children: [
                            pw.Row(
                              children: [
                                _buildPdfPencilIcon(size: 14, color: PdfColors.black),
                                pw.SizedBox(width: 6),
                                pw.Text(DevanagariShaper.shape(labels['notes_title'] ?? 'टीप / नोंद'), style: pw.TextStyle(font: ttfBold, fontSize: 16, color: PdfColors.black)),
                              ],
                            ),
                            pw.SizedBox(height: 4),
                            pw.Text(DevanagariShaper.shape(customNote ?? (labels['notes_write_opt'] ?? 'टीप लिहा (ऐच्छिक)')), style: pw.TextStyle(font: ttfRegular, fontSize: 14, color: PdfColors.grey700)),
                            pw.Text(DevanagariShaper.shape(labels['notes_thanks_terms'] ?? 'धन्यवाद संदेश / अटी / नोंदी'), style: pw.TextStyle(font: ttfRegular, fontSize: 13, color: PdfColors.grey600)),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // 3 Signature Columns Box
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.signatureBox.x,
                    top: DefaultPavtiBookGeometry.signatureBox.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.signatureBox.width,
                      height: DefaultPavtiBookGeometry.signatureBox.height,
                      child: pw.Container(
                        decoration: pw.BoxDecoration(
                          color: PdfColors.white,
                          borderRadius: const pw.BorderRadius.all(pw.Radius.circular(14)),
                          border: pw.Border.all(color: PdfColors.grey300, width: 1.5),
                        ),
                        padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        child: pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceEvenly,
                          children: [
                            _buildPdfSignatureCol(
                              title: labels['sig_president'] ?? (lang == 'en' ? 'President' : 'President / अध्यक्ष'),
                              personName: presidentName,
                              fontBold: ttfBold,
                              fontRegular: ttfRegular,
                              maroon: primaryMaroon,
                              signature: presidentSig,
                              scale: presidentSignatureScale ?? 1.0,
                              ttfYatra: ttfYatra,
                            ),
                            _buildPdfSignatureCol(
                              title: labels['sig_treasurer'] ?? (lang == 'en' ? 'Treasurer' : 'Treasurer / कोषाध्यक्ष'),
                              personName: treasurerName,
                              fontBold: ttfBold,
                              fontRegular: ttfRegular,
                              maroon: primaryMaroon,
                              signature: treasurerSig,
                              scale: treasurerSignatureScale ?? 1.0,
                              ttfYatra: ttfYatra,
                            ),
                            _buildPdfSignatureCol(
                              title: labels['sig_secretary'] ?? (lang == 'en' ? 'Secretary' : 'Secretary / सचिव'),
                              personName: secretaryName,
                              fontBold: ttfBold,
                              fontRegular: ttfRegular,
                              maroon: primaryMaroon,
                              signature: secretarySig,
                              scale: secretarySignatureScale ?? 1.0,
                              ttfYatra: ttfYatra,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Organization Stamp in stampBox
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.stampBox.x,
                    top: DefaultPavtiBookGeometry.stampBox.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.stampBox.width,
                      height: DefaultPavtiBookGeometry.stampBox.height,
                      child: pw.Column(
                        mainAxisAlignment: pw.MainAxisAlignment.center,
                        children: [
                          pw.Container(
                            width: (48.0 * (stampScale ?? 1.0).clamp(0.5, 2.0)).clamp(28.0, 96.0),
                            height: (48.0 * (stampScale ?? 1.0).clamp(0.5, 2.0)).clamp(28.0, 96.0),
                            decoration: pw.BoxDecoration(
                              shape: pw.BoxShape.circle,
                              border: pw.Border.all(color: primaryMaroon, width: 2.0),
                            ),
                            padding: const pw.EdgeInsets.all(3),
                            child: pw.Container(
                              decoration: pw.BoxDecoration(
                                shape: pw.BoxShape.circle,
                                border: pw.Border.all(color: PdfColors.grey400, width: 1.2),
                              ),
                              padding: const pw.EdgeInsets.all(4),
                              alignment: pw.Alignment.center,
                              child: customStamp != null
                                  ? pw.Image(customStamp, fit: pw.BoxFit.contain)
                                  : (logoIconImage != null
                                      ? pw.Image(logoIconImage, fit: pw.BoxFit.contain)
                                      : pw.SizedBox.shrink()),
                            ),
                          ),
                          pw.SizedBox(height: 2),
                          pw.Text(
                            DevanagariShaper.shape(labels['official_stamp'] ?? 'अधिकृत शिक्का'),
                            style: pw.TextStyle(font: ttfBold, fontSize: 13, color: primaryMaroon),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Right Sidebar Contact Card
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.sidebarContact.x,
                    top: DefaultPavtiBookGeometry.sidebarContact.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.sidebarContact.width,
                      height: DefaultPavtiBookGeometry.sidebarContact.height,
                      child: pw.Container(
                        decoration: pw.BoxDecoration(
                          color: creamBg,
                          borderRadius: const pw.BorderRadius.all(pw.Radius.circular(14)),
                        ),
                        padding: const pw.EdgeInsets.all(12),
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            pw.Container(
                              decoration: pw.BoxDecoration(
                                color: primaryMaroon,
                                borderRadius: const pw.BorderRadius.all(pw.Radius.circular(12)),
                              ),
                              padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              child: pw.Text(DevanagariShaper.shape(labels['contact_details'] ?? 'संपर्क तपशील'), style: pw.TextStyle(font: ttfBold, fontSize: 15, color: PdfColors.white)),
                            ),
                            pw.SizedBox(height: 8),
                            pw.Text('Phone: +91 98765 43210', style: pw.TextStyle(font: ttfBold, fontSize: 14, color: PdfColors.black)),
                            pw.SizedBox(height: 4),
                            pw.Text('Email: info@yourorg.org', style: pw.TextStyle(font: ttfRegular, fontSize: 14, color: PdfColors.black)),
                            pw.SizedBox(height: 4),
                            pw.Text('Web: www.yourorg.org', style: pw.TextStyle(font: ttfRegular, fontSize: 14, color: PdfColors.black)),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Right Sidebar Features Card
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.sidebarFeatures.x,
                    top: DefaultPavtiBookGeometry.sidebarFeatures.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.sidebarFeatures.width,
                      height: DefaultPavtiBookGeometry.sidebarFeatures.height,
                      child: pw.Container(
                        decoration: pw.BoxDecoration(
                          color: creamBg,
                          borderRadius: const pw.BorderRadius.all(pw.Radius.circular(14)),
                        ),
                        padding: const pw.EdgeInsets.all(12),
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            pw.Container(
                              decoration: pw.BoxDecoration(
                                color: primaryMaroon,
                                borderRadius: const pw.BorderRadius.all(pw.Radius.circular(12)),
                              ),
                              padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              child: pw.Text(DevanagariShaper.shape(labels['receipt_features_title'] ?? 'पावती वैशिष्ट्ये'), style: pw.TextStyle(font: ttfBold, fontSize: 15, color: PdfColors.white)),
                            ),
                            pw.SizedBox(height: 6),
                            _buildPdfFeatureRow(labels['feat_receipt_no'] ?? 'पावती क्रमांक', ttfRegular, ttfBold: ttfBold),
                            _buildPdfFeatureRow(labels['feat_date_time'] ?? 'दिनांक आणि वेळ', ttfRegular, ttfBold: ttfBold),
                            _buildPdfFeatureRow(labels['feat_donor_info'] ?? 'देणगीदार माहिती', ttfRegular, ttfBold: ttfBold),
                            _buildPdfFeatureRow(labels['feat_mobile_no'] ?? 'मोबाईल नंबर', ttfRegular, ttfBold: ttfBold),
                            _buildPdfFeatureRow(labels['feat_email'] ?? 'ईमेल', ttfRegular, ttfBold: ttfBold),
                            _buildPdfFeatureRow(labels['feat_donation_details'] ?? 'देणगी तपशील', ttfRegular, ttfBold: ttfBold),
                            _buildPdfFeatureRow(labels['feat_amount_words'] ?? 'रक्कम शब्दात', ttfRegular, ttfBold: ttfBold),
                            _buildPdfFeatureRow(labels['feat_payment_method'] ?? 'पेमेंट पद्धत', ttfRegular, ttfBold: ttfBold),
                            _buildPdfFeatureRow(labels['feat_qr_code'] ?? 'QR कोड', ttfRegular, ttfBold: ttfBold),
                            _buildPdfFeatureRow(labels['feat_signatures'] ?? 'स्वाक्षऱ्या', ttfRegular, ttfBold: ttfBold),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Right Sidebar Digital Receipt Card
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.sidebarDigital.x,
                    top: DefaultPavtiBookGeometry.sidebarDigital.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.sidebarDigital.width,
                      height: DefaultPavtiBookGeometry.sidebarDigital.height,
                      child: pw.Container(
                        decoration: pw.BoxDecoration(
                          color: creamBg,
                          borderRadius: const pw.BorderRadius.all(pw.Radius.circular(14)),
                        ),
                        padding: const pw.EdgeInsets.all(12),
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.center,
                          children: [
                            pw.Text(DevanagariShaper.shape(labels['digital_receipt_title'] ?? 'ही पावती डिजिटल आहे'), style: pw.TextStyle(font: ttfBold, fontSize: 16, color: primaryMaroon)),
                            pw.SizedBox(height: 6),
                            pw.Row(
                              mainAxisAlignment: pw.MainAxisAlignment.center,
                              children: [
                                _buildPdfCheckIcon(size: 14, color: PdfColor.fromHex('#2E7D32')),
                                pw.SizedBox(width: 6),
                                pw.Text(DevanagariShaper.shape(labels['digital_receipt_sub'] ?? 'QR कोड स्कॅन करून पावतीची पडताळणी करा.'), textAlign: pw.TextAlign.center, style: pw.TextStyle(font: ttfRegular, fontSize: 12, color: PdfColors.black)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Right Sidebar Footer Branding
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.sidebarFooter.x,
                    top: DefaultPavtiBookGeometry.sidebarFooter.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.sidebarFooter.width,
                      height: DefaultPavtiBookGeometry.sidebarFooter.height,
                      child: pw.Column(
                        mainAxisAlignment: pw.MainAxisAlignment.center,
                        crossAxisAlignment: pw.CrossAxisAlignment.center,
                        children: [
                          pw.Text('Powered by PavtiBook', style: pw.TextStyle(font: ttfBold, fontSize: 14, color: PdfColors.white)),
                          pw.SizedBox(height: 2),
                          pw.Text('www.pavtibook.in', style: pw.TextStyle(font: ttfRegular, fontSize: 12, color: PdfColors.white)),
                        ],
                      ),
                    ),
                  ),

                  // Main Section Bottom Footer Bar
                  pw.Positioned(
                    left: DefaultPavtiBookGeometry.footer.x,
                    top: DefaultPavtiBookGeometry.footer.y,
                    child: pw.SizedBox(
                      width: DefaultPavtiBookGeometry.footer.width,
                      height: DefaultPavtiBookGeometry.footer.height,
                      child: pw.Container(
                        decoration: pw.BoxDecoration(
                          color: primaryMaroon,
                          borderRadius: const pw.BorderRadius.only(bottomLeft: pw.Radius.circular(14)),
                        ),
                        padding: const pw.EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Row(
                              children: [
                                if (logoIconImage != null)
                                  pw.Image(logoIconImage, width: 24, height: 24)
                                else
                                  pw.Text('P', style: pw.TextStyle(font: ttfBold, fontSize: 20, color: PdfColors.white)),
                                pw.SizedBox(width: 8),
                                pw.Text('PavtiBook', style: pw.TextStyle(font: ttfBold, fontSize: 18, color: PdfColors.white)),
                                pw.SizedBox(width: 12),
                                pw.Text('Digital Trust. Transparent Receipts.', style: pw.TextStyle(font: ttfRegular, fontSize: 13, color: PdfColors.grey300)),
                              ],
                            ),
                            pw.Row(
                              children: [
                                if (thankYouBadge != null)
                                  pw.Container(
                                    width: 32,
                                    height: 32,
                                    decoration: const pw.BoxDecoration(shape: pw.BoxShape.circle),
                                    child: pw.Image(thankYouBadge, fit: pw.BoxFit.cover),
                                  ),
                                pw.SizedBox(width: 8),
                                pw.Text(
                                  DevanagariShaper.shape(labels['footer_thankyou'] ?? 'आपल्या अमूल्य देणगीबद्दल मनःपूर्वक धन्यवाद!'),
                                  style: pw.TextStyle(font: ttfBold, fontSize: 16, color: PdfColors.white),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      );
      return pdf.save();
  }

  /// Write valid PDF receipt file, upload to Firebase Storage, and share natively.
  static Future<bool> sharePdfDirectly({
    ReceiptModel? receipt,
    required String templateType,
    required String receiptId,
    required String fileName,
    required String receiptNumber,
    required String orgName,
    required String donorName,
    required double amount,
    required String purpose,
    required String date,
    required String paymentMode,
    required String paymentStatus,
    required String qrCodeValue,
    required String signatureLabel,
    String? donorAddress,
    String? donorMobile,
    String? donorEmail,
    String? donorId,
    String? receiptTime,
    String? presidentSignatureUrl,
    String? treasurerSignatureUrl,
    String? secretarySignatureUrl,
    double? presidentSignatureScale,
    double? treasurerSignatureScale,
    double? secretarySignatureScale,
    String? presidentName,
    String? treasurerName,
    String? secretaryName,
    String? orgAddress,
    String? customNote,
    String? headerTextLocal,
    String? headerTextEn,
    String? headerLogoUrl,
    String? leftSideImageUrl,
    String? rightSideImageUrl,
    String? customStampUrl,
    String? signatureUrl,
    String? footerText,
    String? collectorName,
    String? text,
    String? receiptThemeId,
    String? brandPrimaryColorHex,
    String? bgColorHex,
    String? borderColorHex,
    String? languageCode,
    Uint8List? capturedReceiptImage,
  }) async {
    try {
      final tempDir = await getTemporaryDirectory();
      final file = File('${tempDir.path}/$fileName');

      final pdfBytes = await SharingService.generateMinimalPdf(
        receipt: receipt,
        templateType: templateType,
        receiptNumber: receiptNumber,
        orgName: orgName,
        donorName: donorName,
        donorAddress: donorAddress,
        donorMobile: donorMobile,
        donorEmail: donorEmail,
        donorId: donorId,
        receiptTime: receiptTime,
        amount: amount,
        purpose: purpose,
        date: date,
        paymentMode: paymentMode,
        paymentStatus: paymentStatus,
        qrCodeValue: qrCodeValue,
        signatureLabel: signatureLabel,
        presidentSignatureUrl: presidentSignatureUrl,
        treasurerSignatureUrl: treasurerSignatureUrl,
        secretarySignatureUrl: secretarySignatureUrl,
        presidentSignatureScale: presidentSignatureScale,
        treasurerSignatureScale: treasurerSignatureScale,
        secretarySignatureScale: secretarySignatureScale,
        presidentName: presidentName,
        treasurerName: treasurerName,
        secretaryName: secretaryName,
        orgAddress: orgAddress,
        customNote: customNote,
        headerTextLocal: headerTextLocal,
        headerTextEn: headerTextEn,
        headerLogoUrl: headerLogoUrl,
        leftSideImageUrl: leftSideImageUrl,
        rightSideImageUrl: rightSideImageUrl,
        customStampUrl: customStampUrl,
        signatureUrl: signatureUrl,
        footerText: footerText,
        collectorName: collectorName,
        receiptThemeId: receiptThemeId,
        brandPrimaryColorHex: brandPrimaryColorHex,
        bgColorHex: bgColorHex,
        borderColorHex: borderColorHex,
        languageCode: languageCode,
        capturedReceiptImage: capturedReceiptImage,
      );

      await file.writeAsBytes(pdfBytes);

        // Upload PDF file to Firebase Storage
        try {
          final storageRef = FirebaseStorage.instance
              .ref()
              .child('receipt_pdfs')
              .child('$receiptId.pdf');
          await storageRef.putData(Uint8List.fromList(pdfBytes));
          debugPrint(
              'PDF successfully uploaded to Firebase Storage: ${storageRef.fullPath}');
        } catch (storageError) {
          debugPrint('Firebase Storage upload failed: $storageError');
        }

        await Share.shareXFiles(
          [XFile(file.path, mimeType: 'application/pdf')],
          text: text,
        );
      return true;
    } catch (e) {
      debugPrint('PDF sharing error: $e');
      return false;
    }
  }

  /// Generate PDF receipt and save it to the local Downloads folder.
  static Future<String?> savePdfLocally({
    ReceiptModel? receipt,
    required String templateType,
    required String receiptNumber,
    required String orgName,
    required String donorName,
    required double amount,
    required String purpose,
    required String date,
    required String paymentMode,
    required String paymentStatus,
    required String qrCodeValue,
    required String signatureLabel,
    String? donorAddress,
    String? donorMobile,
    String? donorEmail,
    String? donorId,
    String? receiptTime,
    String? presidentSignatureUrl,
    String? treasurerSignatureUrl,
    String? secretarySignatureUrl,
    double? presidentSignatureScale,
    double? treasurerSignatureScale,
    double? secretarySignatureScale,
    String? presidentName,
    String? treasurerName,
    String? secretaryName,
    String? orgAddress,
    String? customNote,
    String? headerTextLocal,
    String? headerTextEn,
    String? headerLogoUrl,
    String? leftSideImageUrl,
    String? rightSideImageUrl,
    String? customStampUrl,
    String? signatureUrl,
    String? footerText,
    String? collectorName,
    String? receiptThemeId,
    String? brandPrimaryColorHex,
    String? bgColorHex,
    String? borderColorHex,
    String? languageCode,
    double? watermarkOpacity,
    double? logoScale,
    double? stampScale,
    Map<String, double>? customTextSizes,
    Uint8List? capturedReceiptImage,
  }) async {
    try {
      final sanitizedReceiptNumber = receiptNumber.replaceAll(RegExp(r'[/\\]'), '-');
      final fileName = 'receipt_$sanitizedReceiptNumber.pdf';

      // On Android, check the public downloads directory first
      Directory? downloadDir;
      if (Platform.isAndroid) {
        final dir = Directory('/storage/emulated/0/Download/PavtiBook');
        try {
          if (!await dir.exists()) {
            await dir.create(recursive: true);
          }
          downloadDir = dir;
        } catch (e) {
          debugPrint('Could not create Downloads/PavtiBook directory: $e');
        }
      }

      if (downloadDir == null) {
        final extDir = await getExternalStorageDirectory();
        if (extDir != null) {
          final dir = Directory('${extDir.path}/PavtiBook');
          if (!await dir.exists()) {
            await dir.create(recursive: true);
          }
          downloadDir = dir;
        }
      }

      downloadDir ??= await getApplicationDocumentsDirectory();
      final file = File('${downloadDir.path}/$fileName');

      // Generate fresh PDF bytes to reflect any customized settings or signatures
      final pdfBytes = await SharingService.generateMinimalPdf(
        receipt: receipt,
        templateType: templateType,
        receiptNumber: receiptNumber,
        orgName: orgName,
        donorName: donorName,
        donorAddress: donorAddress,
        donorMobile: donorMobile,
        donorEmail: donorEmail,
        donorId: donorId,
        receiptTime: receiptTime,
        amount: amount,
        purpose: purpose,
        date: date,
        paymentMode: paymentMode,
        paymentStatus: paymentStatus,
        qrCodeValue: qrCodeValue,
        signatureLabel: signatureLabel,
        presidentSignatureUrl: presidentSignatureUrl,
        treasurerSignatureUrl: treasurerSignatureUrl,
        secretarySignatureUrl: secretarySignatureUrl,
        presidentSignatureScale: presidentSignatureScale,
        treasurerSignatureScale: treasurerSignatureScale,
        secretarySignatureScale: secretarySignatureScale,
        presidentName: presidentName,
        treasurerName: treasurerName,
        secretaryName: secretaryName,
        orgAddress: orgAddress,
        customNote: customNote,
        headerTextLocal: headerTextLocal,
        headerTextEn: headerTextEn,
        headerLogoUrl: headerLogoUrl,
        leftSideImageUrl: leftSideImageUrl,
        rightSideImageUrl: rightSideImageUrl,
        customStampUrl: customStampUrl,
        signatureUrl: signatureUrl,
        footerText: footerText,
        collectorName: collectorName,
        receiptThemeId: receiptThemeId,
        brandPrimaryColorHex: brandPrimaryColorHex,
        bgColorHex: bgColorHex,
        borderColorHex: borderColorHex,
        languageCode: languageCode,
        watermarkOpacity: watermarkOpacity,
        logoScale: logoScale,
        stampScale: stampScale,
        customTextSizes: customTextSizes,
        capturedReceiptImage: capturedReceiptImage,
      );

      await file.writeAsBytes(pdfBytes);
      return file.path;
    } catch (e) {
      debugPrint('Save PDF local error: $e');
      return null;
    }
  }

  static pw.Widget _buildPdfPill(String title, PdfColor maroon, double fontSize, double width, double height, pw.Font fontBold, {pw.Font? ttfYatra, pw.Font? ttfRegular}) {
    return pw.Container(
      width: width,
      height: height,
      decoration: pw.BoxDecoration(
        color: maroon,
        borderRadius: const pw.BorderRadius.all(pw.Radius.circular(16)),
      ),
      alignment: pw.Alignment.center,
      child: pw.Text(
        DevanagariShaper.shape(title),
        style: pw.TextStyle(
          font: fontBold,
          fontSize: fontSize,
          color: PdfColors.white,
          fontWeight: pw.FontWeight.bold,
          fontFallback: [if (ttfYatra != null) ttfYatra, if (ttfRegular != null) ttfRegular, fontBold],
        ),
      ),
    );
  }
  static pw.Widget _buildPdfCheckIcon({double size = 14.0, PdfColor? color}) {
    final effectiveColor = color ?? PdfColor.fromHex('#2E7D32');
    return pw.Container(
      width: size,
      height: size,
      decoration: pw.BoxDecoration(
        color: effectiveColor,
        shape: pw.BoxShape.circle,
      ),
      alignment: pw.Alignment.center,
      child: pw.CustomPaint(
        size: PdfPoint(size * 0.65, size * 0.65),
        painter: (PdfGraphics canvas, PdfPoint pointSize) {
          canvas
            ..setStrokeColor(PdfColors.white)
            ..setLineWidth(1.8)
            ..setLineCap(PdfLineCap.round)
            ..setLineJoin(PdfLineJoin.round)
            ..moveTo(pointSize.x * 0.2, pointSize.y * 0.5)
            ..lineTo(pointSize.x * 0.45, pointSize.y * 0.25)
            ..lineTo(pointSize.x * 0.8, pointSize.y * 0.75)
            ..strokePath();
        },
      ),
    );
  }

  static pw.Widget _buildPdfPencilIcon({double size = 14.0, PdfColor? color}) {
    final effectiveColor = color ?? PdfColor.fromHex('#8B1E2D');
    return pw.Container(
      width: size,
      height: size,
      alignment: pw.Alignment.center,
      child: pw.CustomPaint(
        size: PdfPoint(size, size),
        painter: (PdfGraphics canvas, PdfPoint pointSize) {
          canvas
            ..setStrokeColor(effectiveColor)
            ..setLineWidth(1.5)
            ..setLineCap(PdfLineCap.round)
            ..setLineJoin(PdfLineJoin.round)
            ..moveTo(pointSize.x * 0.2, pointSize.y * 0.2)
            ..lineTo(pointSize.x * 0.7, pointSize.y * 0.7)
            ..lineTo(pointSize.x * 0.85, pointSize.y * 0.85)
            ..lineTo(pointSize.x * 0.65, pointSize.y * 0.85)
            ..lineTo(pointSize.x * 0.15, pointSize.y * 0.35)
            ..closePath()
            ..strokePath();
        },
      ),
    );
  }

  static pw.Widget _buildPdfPhoneIcon({double size = 16.0, PdfColor? color}) {
    final effectiveColor = color ?? PdfColor.fromHex('#7A1C1C');
    return pw.Container(
      width: size,
      height: size,
      alignment: pw.Alignment.center,
      child: pw.CustomPaint(
        size: PdfPoint(size, size),
        painter: (PdfGraphics canvas, PdfPoint pointSize) {
          canvas
            ..setStrokeColor(effectiveColor)
            ..setLineWidth(1.6)
            ..setLineCap(PdfLineCap.round)
            ..setLineJoin(PdfLineJoin.round)
            ..moveTo(pointSize.x * 0.25, pointSize.y * 0.75)
            ..lineTo(pointSize.x * 0.45, pointSize.y * 0.75)
            ..lineTo(pointSize.x * 0.35, pointSize.y * 0.45)
            ..lineTo(pointSize.x * 0.55, pointSize.y * 0.35)
            ..lineTo(pointSize.x * 0.75, pointSize.y * 0.55)
            ..lineTo(pointSize.x * 0.75, pointSize.y * 0.25)
            ..strokePath();
        },
      ),
    );
  }

  static pw.Widget _buildPdfEmailIcon({double size = 16.0, PdfColor? color}) {
    final effectiveColor = color ?? PdfColor.fromHex('#7A1C1C');
    return pw.Container(
      width: size,
      height: size,
      alignment: pw.Alignment.center,
      child: pw.CustomPaint(
        size: PdfPoint(size, size),
        painter: (PdfGraphics canvas, PdfPoint pointSize) {
          canvas
            ..setStrokeColor(effectiveColor)
            ..setLineWidth(1.5)
            ..drawRect(pointSize.x * 0.1, pointSize.y * 0.2, pointSize.x * 0.8, pointSize.y * 0.6)
            ..strokePath()
            ..moveTo(pointSize.x * 0.1, pointSize.y * 0.8)
            ..lineTo(pointSize.x * 0.5, pointSize.y * 0.45)
            ..lineTo(pointSize.x * 0.9, pointSize.y * 0.8)
            ..strokePath();
        },
      ),
    );
  }

  static pw.Widget _buildPdfWebIcon({double size = 16.0, PdfColor? color}) {
    final effectiveColor = color ?? PdfColor.fromHex('#7A1C1C');
    return pw.Container(
      width: size,
      height: size,
      alignment: pw.Alignment.center,
      child: pw.CustomPaint(
        size: PdfPoint(size, size),
        painter: (PdfGraphics canvas, PdfPoint pointSize) {
          final r = pointSize.x * 0.4;
          final cx = pointSize.x * 0.5;
          final cy = pointSize.y * 0.5;
          canvas
            ..setStrokeColor(effectiveColor)
            ..setLineWidth(1.5)
            ..drawEllipse(cx, cy, r, r)
            ..strokePath()
            ..moveTo(cx - r, cy)
            ..lineTo(cx + r, cy)
            ..strokePath()
            ..drawEllipse(cx, cy, r * 0.5, r)
            ..strokePath();
        },
      ),
    );
  }

  static pw.Widget _buildPdfLocationPinIcon({double size = 16.0, PdfColor? color}) {
    final effectiveColor = color ?? PdfColor.fromHex('#D84315');
    return pw.Container(
      width: size,
      height: size,
      alignment: pw.Alignment.center,
      child: pw.CustomPaint(
        size: PdfPoint(size, size),
        painter: (PdfGraphics canvas, PdfPoint pointSize) {
          final cx = pointSize.x * 0.5;
          final cy = pointSize.y * 0.65;
          final r = pointSize.x * 0.35;
          canvas
            ..setStrokeColor(effectiveColor)
            ..setFillColor(effectiveColor)
            ..setLineWidth(1.4)
            ..drawEllipse(cx, cy, r, r)
            ..fillPath()
            ..moveTo(cx - r, cy)
            ..lineTo(cx, pointSize.y * 0.1)
            ..lineTo(cx + r, cy)
            ..fillPath()
            ..setStrokeColor(PdfColors.white)
            ..setFillColor(PdfColors.white)
            ..drawEllipse(cx, cy, r * 0.4, r * 0.4)
            ..fillPath();
        },
      ),
    );
  }

  static pw.Widget _buildPdfFeatureRow(String text, pw.Font font, {pw.Font? ttfBold}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2),
      child: pw.Row(
        children: [
          _buildPdfCheckIcon(size: 14, color: PdfColor.fromHex('#2E7D32')),
          pw.SizedBox(width: 6),
          pw.Text(DevanagariShaper.shape(text), style: pw.TextStyle(font: font, fontSize: 13, color: PdfColors.black, fontFallback: [if (ttfBold != null) ttfBold])),
        ],
      ),
    );
  }

  static pw.Widget _buildPdfDonorRow(String label, String value, pw.Font fontBold, pw.Font fontRegular, PdfColor maroon, {pw.Font? ttfYatra}) {
    return pw.Row(
      children: [
        pw.SizedBox(
          width: 140,
          child: pw.Text(
            DevanagariShaper.shape(label),
            style: pw.TextStyle(
              font: fontBold,
              fontSize: 16,
              color: maroon,
              fontWeight: pw.FontWeight.bold,
              fontFallback: [if (ttfYatra != null) ttfYatra, fontRegular, fontBold],
            ),
          ),
        ),
        pw.Expanded(
          child: pw.Text(
            DevanagariShaper.shape(value),
            style: pw.TextStyle(
              font: fontRegular,
              fontSize: 16,
              color: PdfColors.black,
              fontFallback: [if (ttfYatra != null) ttfYatra, fontBold, fontRegular],
            ),
          ),
        ),
      ],
    );
  }

  static pw.Widget _buildPdfTableCell(String text, pw.Font font, double fontSize, PdfColor color, {pw.TextAlign align = pw.TextAlign.left, pw.Font? ttfYatra, pw.Font? ttfBold}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 8),
      child: pw.Text(
        DevanagariShaper.shape(text),
        textAlign: align,
        style: pw.TextStyle(
          font: font,
          fontSize: fontSize,
          color: color,
          fontFallback: [if (ttfYatra != null) ttfYatra, if (ttfBold != null) ttfBold, font],
        ),
      ),
    );
  }

  static pw.Widget _buildPdfPayChip(String title, bool selected, PdfColor maroon, pw.Font fontBold, {pw.Font? ttfYatra, pw.Font? ttfRegular}) {
    return pw.SizedBox(
      width: 180,
      height: 38,
      child: pw.Container(
        padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: pw.BoxDecoration(
          color: selected ? PdfColor.fromHex('#E8F5E9') : PdfColors.white,
          borderRadius: const pw.BorderRadius.all(pw.Radius.circular(10)),
          border: pw.Border.all(
            color: selected ? PdfColor.fromHex('#A5D6A7') : PdfColors.grey400,
            width: selected ? 2.5 : 1.5,
          ),
        ),
        alignment: pw.Alignment.center,
        child: pw.FittedBox(
          fit: pw.BoxFit.scaleDown,
          child: pw.Text(
            DevanagariShaper.shape(title),
            style: pw.TextStyle(
              font: fontBold,
              fontSize: 14,
              color: selected ? PdfColor.fromHex('#2E7D32') : PdfColors.black,
              fontWeight: pw.FontWeight.bold,
              fontFallback: [if (ttfYatra != null) ttfYatra, if (ttfRegular != null) ttfRegular, fontBold],
            ),
          ),
        ),
      ),
    );
  }

  static pw.Widget _buildPdfSignatureCol({
    required String title,
    String? personName,
    required pw.Font fontBold,
    required pw.Font fontRegular,
    required PdfColor maroon,
    pw.MemoryImage? signature,
    double scale = 1.0,
    pw.Font? ttfYatra,
  }) {
    final double effectiveScale = scale.clamp(0.0, 3.0);
    final double sigHeight = (36.0 + (effectiveScale - 1.0) * 12.0).clamp(30.0, 60.0);
    final double sigWidth = (110.0 + (effectiveScale - 1.0) * 35.0).clamp(90.0, 180.0);

    final bool hasPersonName = personName != null && personName.trim().isNotEmpty;

    return pw.SizedBox(
      width: 196,
      height: 110,
      child: pw.Column(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.SizedBox(
            height: 22,
            child: pw.FittedBox(
              fit: pw.BoxFit.scaleDown,
              alignment: pw.Alignment.center,
              child: pw.Text(
                DevanagariShaper.shape(title),
                style: pw.TextStyle(
                  font: fontBold,
                  fontSize: 16,
                  fontWeight: pw.FontWeight.bold,
                  color: maroon,
                  fontFallback: [if (ttfYatra != null) ttfYatra, fontRegular, fontBold],
                ),
              ),
            ),
          ),
          pw.Expanded(
            child: pw.Container(
              width: 184,
              alignment: pw.Alignment.center,
              child: pw.Stack(
                alignment: pw.Alignment.center,
                children: [
                  pw.Positioned(
                    bottom: 0,
                    child: pw.Container(
                      width: 155,
                      height: 1.5,
                      color: maroon,
                    ),
                  ),
                  if (effectiveScale > 0.0 && signature != null)
                    pw.Positioned(
                      top: 0,
                      bottom: 3,
                      child: pw.FittedBox(
                        fit: pw.BoxFit.contain,
                        alignment: pw.Alignment.center,
                        child: pw.SizedBox(
                          height: sigHeight,
                          width: sigWidth,
                          child: pw.Image(signature, fit: pw.BoxFit.contain),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          pw.SizedBox(
            height: 20,
            child: hasPersonName
                ? pw.FittedBox(
                    fit: pw.BoxFit.scaleDown,
                    alignment: pw.Alignment.center,
                    child: pw.Text(
                      DevanagariShaper.shape(personName.trim()),
                      style: pw.TextStyle(
                        font: fontBold,
                        fontSize: 13,
                        fontWeight: pw.FontWeight.bold,
                        color: maroon,
                        fontFallback: [if (ttfYatra != null) ttfYatra, fontRegular, fontBold],
                      ),
                    ),
                  )
                : pw.SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  /// Automatically generate and upload the receipt PDF to Firebase Storage in the background.
  static Future<void> uploadReceiptPdfInBackground({
    required TemplateModel template,
    required ReceiptModel receipt,
  }) async {
    try {
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
        receipt: receipt,
        templateType: template.type,
        receiptNumber: receipt.receiptNumber,
        orgName: receipt.organizationName ?? 'PavtiBook',
        donorName: receipt.donorName ?? 'Guest Donor',
        donorAddress: receipt.donorAddress,
        donorMobile: receipt.donorMobile,
        donorId: receipt.donorId,
        receiptTime: receipt.createdAt,
        amount: receipt.amount,
        purpose: receipt.purpose,
        date: dateStr,
        paymentMode: receipt.paymentMode,
        paymentStatus: receipt.paymentStatus,
        qrCodeValue: receipt.qrCodeValue,
        signatureLabel: receipt.collectorRole ?? template.signatureLabel,
        headerTextLocal: template.headerTextLocal,
        headerTextEn: template.headerTextEn,
        headerLogoUrl: receipt.headerLogoUrl ?? receipt.organizationLogoUrl,
        leftSideImageUrl: receipt.leftSideImageUrl ?? receipt.leftImageUrl,
        rightSideImageUrl: receipt.rightSideImageUrl ?? receipt.rightImageUrl,
        customStampUrl: receipt.customStampUrl ?? receipt.stampUrl,
        signatureUrl: receipt.signatureUrl ?? receipt.collectorSignatureUrl,
        footerText: receipt.footerText,
        collectorName: receipt.collectorName,
        receiptThemeId: receipt.receiptThemeId,
        brandPrimaryColorHex: template.borderColor,
      );

      final storageRef = FirebaseStorage.instance
          .ref()
          .child('receipt_pdfs')
          .child('${receipt.id}.pdf');
      await storageRef.putData(Uint8List.fromList(pdfBytes));
      debugPrint('Background PDF successfully uploaded to Firebase Storage.');
    } catch (e) {
      debugPrint('Background PDF generation/upload failed: $e');
    }
  }
}
