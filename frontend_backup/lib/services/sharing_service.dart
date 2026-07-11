import 'dart:io';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:http/http.dart' as http;
import '../models/models.dart';

class SharingService {
  static Future<Uint8List?> _downloadImage(String? url) async {
    if (url == null || url.isEmpty) return null;
    try {
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        return response.bodyBytes;
      }
    } catch (e) {
      debugPrint('Error downloading image: $e');
    }
    return null;
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

  /// Direct WhatsApp text/URL sharing.
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

  /// Generic system text sharing.
  static Future<void> shareViaSystemShareSheet(String text,
      {String? subject}) async {
    await Share.share(text, subject: subject);
  }

  /// English number to words converter.
  static String _numberToWords(double amount) {
    int num = amount.toInt();
    if (num == 0) return "Zero Rupees Only";

    final units = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen"
    ];
    final tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety"
    ];

    String convert(int n) {
      if (n < 20) {
        return units[n];
      }
      if (n < 100) {
        return "${tens[n ~/ 10]}${n % 10 != 0 ? " ${units[n % 10]}" : ""}";
      }
      if (n < 1000) {
        return "${units[n ~/ 100]} Hundred${n % 100 != 0 ? " and ${convert(n % 100)}" : ""}";
      }
      if (n < 100000) {
        return "${convert(n ~/ 1000)} Thousand${n % 1000 != 0 ? " ${convert(n % 1000)}" : ""}";
      }
      if (n < 10000000) {
        return "${convert(n ~/ 100000)} Lakh${n % 100000 != 0 ? " ${convert(n % 100000)}" : ""}";
      }
      return "${convert(n ~/ 10000000)} Crore${n % 10000000 != 0 ? " ${convert(n % 10000000)}" : ""}";
    }

    return "${convert(num)} Rupees Only";
  }

  /// Generate a valid A5 Landscape temple receipt PDF document in memory.
  static Future<List<int>> generateMinimalPdf({
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
  }) async {
    final pdf = pw.Document();

    // Load custom fonts for Devanagari support
    final fontDataRegular =
        await rootBundle.load('assets/fonts/Poppins-Regular.ttf');
    final ttfRegular = pw.Font.ttf(fontDataRegular);

    final fontDataBold = await rootBundle.load('assets/fonts/Poppins-Bold.ttf');
    final ttfBold = pw.Font.ttf(fontDataBold);

    final fontDataYatra =
        await rootBundle.load('assets/fonts/YatraOne-Regular.ttf');
    final ttfYatra = pw.Font.ttf(fontDataYatra);

    // Predefined PDF theme colors
    PdfColor primaryColor;
    PdfColor accentColor;

    final String tid = receiptThemeId ?? 'traditional_saffron';
    if (tid == 'royal_blue') {
      primaryColor = PdfColor.fromHex('#0D47A1');
      accentColor = PdfColor.fromHex('#1E88E5');
    } else if (tid == 'emerald_green') {
      primaryColor = PdfColor.fromHex('#1B5E20');
      accentColor = PdfColor.fromHex('#43A047');
    } else if (tid == 'maroon_gold') {
      primaryColor = PdfColor.fromHex('#8B1E2D');
      accentColor = PdfColor.fromHex('#D4AF37');
    } else if (tid == 'navy_gold') {
      primaryColor = PdfColor.fromHex('#0F172A');
      accentColor = PdfColor.fromHex('#D4AF37');
    } else if (tid == 'brand_theme') {
      if (brandPrimaryColorHex != null && brandPrimaryColorHex.isNotEmpty) {
        try {
          primaryColor = PdfColor.fromHex(brandPrimaryColorHex);
        } catch (_) {
          primaryColor = PdfColor.fromHex('#0D47A1');
        }
      } else {
        primaryColor = PdfColor.fromHex('#0D47A1');
      }
      accentColor = PdfColor.fromHex('#D4AF37');
    } else {
      // traditional_saffron
      primaryColor = PdfColor.fromHex('#D84315');
      accentColor = PdfColor.fromHex('#3E2723');
    }

    // Color system
    final bgColor = PdfColor.fromHex('#FFFDD0'); // Cream paper background
    final borderColor = PdfColor.fromHex('#E65100'); // Saffron orange border
    final fontColor = PdfColor.fromHex('#3E2723'); // Dark maroon font color
    final bannerColor =
        primaryColor; // Deep red-orange saffron banner replaced by theme primary

    final amountWords = _numberToWords(amount);

    // Download custom images in memory
    final headerLogoBytes = await _downloadImage(headerLogoUrl);
    final leftSideImageBytes = await _downloadImage(leftSideImageUrl);
    final rightSideImageBytes = await _downloadImage(rightSideImageUrl);
    final customStampBytes = await _downloadImage(customStampUrl);
    final signatureBytes = await _downloadImage(signatureUrl);

    final pw.MemoryImage? headerLogo =
        headerLogoBytes != null ? pw.MemoryImage(headerLogoBytes) : null;
    final pw.MemoryImage? leftSideImage =
        leftSideImageBytes != null ? pw.MemoryImage(leftSideImageBytes) : null;
    final pw.MemoryImage? rightSideImage = rightSideImageBytes != null
        ? pw.MemoryImage(rightSideImageBytes)
        : null;
    final pw.MemoryImage? customStamp =
        customStampBytes != null ? pw.MemoryImage(customStampBytes) : null;
    final pw.MemoryImage? signature =
        signatureBytes != null ? pw.MemoryImage(signatureBytes) : null;

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a5.landscape,
        margin: const pw.EdgeInsets.all(12),
        build: (pw.Context context) {
          final contentColumn = pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.stretch,
            children: [
              // A. Solid Saffron Top Banner Header
              (() {
                if (templateType == 'temple') {
                  return pw.Container(
                    color: bannerColor,
                    padding: const pw.EdgeInsets.symmetric(
                        horizontal: 8, vertical: 6),
                    child: pw.Row(
                      children: [
                        // Left Circle: Logo or Om symbol
                        pw.Container(
                          width: 28,
                          height: 28,
                          decoration: const pw.BoxDecoration(
                            color: PdfColors.white,
                            shape: pw.BoxShape.circle,
                          ),
                          alignment: pw.Alignment.center,
                          child: headerLogo != null
                              ? pw.ClipOval(
                                  child: pw.Image(headerLogo,
                                      fit: pw.BoxFit.cover,
                                      width: 28,
                                      height: 28),
                                )
                              : pw.Text(
                                  'ॐ',
                                  style: pw.TextStyle(
                                    font: ttfYatra,
                                    fontSize: 15,
                                    fontWeight: pw.FontWeight.bold,
                                    color: bannerColor,
                                  ),
                                ),
                        ),
                        pw.SizedBox(width: 8),

                        // Center headings
                        pw.Expanded(
                          child: pw.Column(
                            crossAxisAlignment: pw.CrossAxisAlignment.center,
                            children: [
                              pw.Text(
                                headerTextLocal ?? '॥ श्री गणेश प्रसन्न ॥',
                                style: pw.TextStyle(
                                  font: ttfYatra,
                                  color: PdfColors.white,
                                  fontSize: 9.5,
                                  letterSpacing: 1.2,
                                ),
                              ),
                              pw.SizedBox(height: 1),
                              pw.Text(
                                orgName,
                                textAlign: pw.TextAlign.center,
                                style: pw.TextStyle(
                                  font: ttfYatra,
                                  color: PdfColors.yellow,
                                  fontSize: 14.5,
                                  fontWeight: pw.FontWeight.bold,
                                ),
                              ),
                              pw.SizedBox(height: 3),
                              pw.Container(
                                decoration: const pw.BoxDecoration(
                                  color: PdfColors.white,
                                  borderRadius: pw.BorderRadius.all(
                                      pw.Radius.circular(10)),
                                ),
                                padding: const pw.EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 1.5),
                                child: pw.Text(
                                  headerTextEn ?? 'PUBLIC CHARITABLE TRUST',
                                  style: pw.TextStyle(
                                    font: ttfBold,
                                    color: bannerColor,
                                    fontSize: 7.5,
                                    fontWeight: pw.FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        pw.SizedBox(width: 8),

                        // Right Circle: Custom right side image or default Orange Flag vector
                        pw.Container(
                          width: 28,
                          height: 28,
                          decoration: const pw.BoxDecoration(
                            color: PdfColors.white,
                            shape: pw.BoxShape.circle,
                          ),
                          alignment: pw.Alignment.center,
                          child: rightSideImage != null
                              ? pw.ClipOval(
                                  child: pw.Image(rightSideImage,
                                      fit: pw.BoxFit.cover,
                                      width: 28,
                                      height: 28),
                                )
                              : pw.CustomPaint(
                                  size: const PdfPoint(16, 16),
                                  painter: (PdfGraphics canvas, PdfPoint size) {
                                    canvas.setFillColor(
                                        PdfColor.fromHex('#FF6D00'));
                                    canvas.moveTo(3, 3);
                                    canvas.lineTo(3, 13);
                                    canvas.lineTo(13, 10);
                                    canvas.lineTo(3, 6);
                                    canvas.closePath();
                                    canvas.fillPath();

                                    canvas.setStrokeColor(
                                        PdfColor.fromHex('#3E2723'));
                                    canvas.setLineWidth(1.0);
                                    canvas.moveTo(3, 3);
                                    canvas.lineTo(3, 14);
                                    canvas.strokePath();
                                  },
                                ),
                        ),
                      ],
                    ),
                  );
                } else {
                  // Classic Style: Symmetric logo slots inside saffron header row
                  final hasLeft = leftSideImage != null;
                  final hasRight = rightSideImage != null;
                  final showLogos = hasLeft || hasRight;

                  return pw.Container(
                    color: bannerColor,
                    padding: const pw.EdgeInsets.symmetric(
                        horizontal: 8, vertical: 6),
                    child: pw.Row(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        if (showLogos) ...[
                          if (hasLeft)
                            pw.Container(
                              width: 40,
                              height: 40,
                              decoration: const pw.BoxDecoration(
                                color: PdfColors.white,
                                borderRadius:
                                    pw.BorderRadius.all(pw.Radius.circular(4)),
                              ),
                              padding: const pw.EdgeInsets.all(1),
                              child: pw.Image(leftSideImage,
                                  fit: pw.BoxFit.contain),
                            )
                          else
                            pw.SizedBox(width: 40, height: 40),
                          pw.SizedBox(width: 8),
                        ],

                        // Headings
                        pw.Expanded(
                          child: pw.Column(
                            crossAxisAlignment: pw.CrossAxisAlignment.center,
                            children: [
                              pw.Text(
                                headerTextLocal ?? '॥ श्री गणेश प्रसन्न ॥',
                                style: pw.TextStyle(
                                  font: ttfYatra,
                                  color: PdfColors.white,
                                  fontSize: 9.5,
                                  letterSpacing: 1.2,
                                ),
                              ),
                              pw.SizedBox(height: 1),
                              pw.Text(
                                orgName,
                                textAlign: pw.TextAlign.center,
                                style: pw.TextStyle(
                                  font: ttfYatra,
                                  color: PdfColors.yellow,
                                  fontSize: 14.5,
                                  fontWeight: pw.FontWeight.bold,
                                ),
                              ),
                              pw.SizedBox(height: 3),
                              pw.Container(
                                decoration: const pw.BoxDecoration(
                                  color: PdfColors.white,
                                  borderRadius: pw.BorderRadius.all(
                                      pw.Radius.circular(10)),
                                ),
                                padding: const pw.EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 1.5),
                                child: pw.Text(
                                  headerTextEn ?? 'PUBLIC CHARITABLE TRUST',
                                  style: pw.TextStyle(
                                    font: ttfBold,
                                    color: bannerColor,
                                    fontSize: 7.5,
                                    fontWeight: pw.FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        if (showLogos) ...[
                          pw.SizedBox(width: 8),
                          if (hasRight)
                            pw.Container(
                              width: 40,
                              height: 40,
                              decoration: const pw.BoxDecoration(
                                color: PdfColors.white,
                                borderRadius:
                                    pw.BorderRadius.all(pw.Radius.circular(4)),
                              ),
                              padding: const pw.EdgeInsets.all(1),
                              child: pw.Image(rightSideImage,
                                  fit: pw.BoxFit.contain),
                            )
                          else
                            pw.SizedBox(width: 40, height: 40),
                        ],
                      ],
                    ),
                  );
                }
              })(),
              pw.SizedBox(height: 8),

              // B. Metadata Line (No & Date)
              pw.Padding(
                padding: const pw.EdgeInsets.symmetric(horizontal: 6),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Container(
                      padding: const pw.EdgeInsets.symmetric(
                          horizontal: 5, vertical: 2),
                      decoration: pw.BoxDecoration(
                        color: PdfColors.white,
                        border: pw.Border.all(color: accentColor, width: 0.6),
                        borderRadius:
                            const pw.BorderRadius.all(pw.Radius.circular(4)),
                      ),
                      child: pw.Text(
                        'पावती क्र. / Receipt No: $receiptNumber',
                        style: pw.TextStyle(
                          font: ttfBold,
                          color: primaryColor,
                          fontSize: 8.5,
                        ),
                      ),
                    ),
                    pw.Text(
                      'दिनांक / Date: $date',
                      style: pw.TextStyle(
                        font: ttfBold,
                        color: fontColor,
                        fontSize: 9.5,
                      ),
                    ),
                  ],
                ),
              ),
              pw.SizedBox(height: 6),

              // C. Field Rows
              pw.Padding(
                padding: const pw.EdgeInsets.symmetric(horizontal: 6),
                child: pw.Column(
                  children: [
                    _buildPdfFieldLine('श्री. / श्रीमती (Donor):', donorName,
                        ttfRegular, ttfBold, fontColor,
                        labelColor: primaryColor),
                    pw.SizedBox(height: 4),
                    _buildPdfFieldLine('अक्षरी रुपये (Rupees in words):',
                        amountWords, ttfRegular, ttfBold, fontColor,
                        labelColor: primaryColor),
                    pw.SizedBox(height: 4),
                    _buildPdfFieldLine('देणगी कारण (Contribution Purpose):',
                        purpose, ttfRegular, ttfBold, fontColor,
                        labelColor: primaryColor),
                  ],
                ),
              ),
              pw.SizedBox(height: 10),

              // D. Bottom Grid
              pw.Padding(
                padding: const pw.EdgeInsets.symmetric(horizontal: 6),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: pw.CrossAxisAlignment.end,
                  children: [
                    // 1. Rupee Box
                    _buildPdfRupeeBox(amount, paymentMode, ttfBold, fontColor,
                        primaryColor: primaryColor),

                    // 2. Stamp
                    _buildPdfStamp(paymentStatus, ttfBold, customStamp),

                    // 3. QR code
                    _buildPdfQrCode(qrCodeValue, ttfBold, fontColor),

                    // 4. Signatory
                    _buildPdfSignatureLine(signatureLabel, ttfBold, fontColor,
                        signature, collectorName,
                        lineColor: accentColor),
                  ],
                ),
              ),

              pw.Spacer(),
              pw.Divider(height: 1, color: accentColor),
              pw.Padding(
                padding: const pw.EdgeInsets.only(top: 2),
                child: pw.Center(
                  child: pw.Text(
                    footerText ??
                        'Powered by PavtiBook • Traditional Trust. Digital Simplicity.',
                    style: pw.TextStyle(
                      font: ttfRegular,
                      color: PdfColors.grey500,
                      fontSize: 6.5,
                    ),
                  ),
                ),
              ),
            ],
          );

          final rightImg = rightSideImage ?? customStamp;

          return pw.Container(
            decoration: pw.BoxDecoration(
              color: bgColor,
              border: pw.Border.all(color: borderColor, width: 1.5),
            ),
            padding: const pw.EdgeInsets.all(4),
            child: pw.Container(
              decoration: pw.BoxDecoration(
                border: pw.Border.all(color: borderColor, width: 3.5),
              ),
              padding: const pw.EdgeInsets.all(8),
              child: templateType == 'temple'
                  ? pw.Row(
                      crossAxisAlignment: pw.CrossAxisAlignment.stretch,
                      children: [
                        // 1. Left deity panel
                        if (leftSideImage != null)
                          pw.Container(
                            width: 60,
                            decoration: pw.BoxDecoration(
                              border: pw.Border(
                                right: pw.BorderSide(
                                    color: borderColor, width: 1.5),
                              ),
                            ),
                            padding: const pw.EdgeInsets.symmetric(
                                vertical: 4, horizontal: 2),
                            margin: const pw.EdgeInsets.only(right: 6),
                            child: pw.Column(
                              mainAxisAlignment:
                                  pw.MainAxisAlignment.spaceBetween,
                              children: [
                                pw.Text(
                                  '॥ श्री गजानन प्रसन्न ॥',
                                  textAlign: pw.TextAlign.center,
                                  style: pw.TextStyle(
                                    font: ttfYatra,
                                    fontSize: 5.5,
                                    fontWeight: pw.FontWeight.bold,
                                    color: fontColor,
                                  ),
                                ),
                                pw.SizedBox(height: 4),
                                pw.Expanded(
                                  child: pw.Container(
                                    decoration: pw.BoxDecoration(
                                      border: pw.Border.all(
                                          color: accentColor, width: 1.0),
                                    ),
                                    child: pw.Image(leftSideImage,
                                        fit: pw.BoxFit.cover),
                                  ),
                                ),
                                pw.SizedBox(height: 4),
                                pw.Text(
                                  '🌸 🌼 🌸',
                                  style: const pw.TextStyle(fontSize: 5.5),
                                ),
                              ],
                            ),
                          ),

                        // 2. Center details content
                        pw.Expanded(child: contentColumn),

                        // 3. Right deity/stamp panel
                        if (rightImg != null)
                          pw.Container(
                            width: 60,
                            decoration: pw.BoxDecoration(
                              border: pw.Border(
                                left: pw.BorderSide(
                                    color: borderColor, width: 1.5),
                              ),
                            ),
                            padding: const pw.EdgeInsets.symmetric(
                                vertical: 4, horizontal: 2),
                            margin: const pw.EdgeInsets.only(left: 6),
                            child: pw.Column(
                              mainAxisAlignment:
                                  pw.MainAxisAlignment.spaceBetween,
                              children: [
                                pw.Text(
                                  '॥ श्री गणेशाय नमः ॥',
                                  textAlign: pw.TextAlign.center,
                                  style: pw.TextStyle(
                                    font: ttfYatra,
                                    fontSize: 5.5,
                                    fontWeight: pw.FontWeight.bold,
                                    color: fontColor,
                                  ),
                                ),
                                pw.SizedBox(height: 4),
                                pw.Expanded(
                                  child: pw.Container(
                                    decoration: pw.BoxDecoration(
                                      border: pw.Border.all(
                                          color: accentColor, width: 1.0),
                                    ),
                                    child: pw.Image(rightImg,
                                        fit: pw.BoxFit.cover),
                                  ),
                                ),
                                pw.SizedBox(height: 4),
                                pw.Text(
                                  '🌸 🌼 🌸',
                                  style: const pw.TextStyle(fontSize: 5.5),
                                ),
                              ],
                            ),
                          ),
                      ],
                    )
                  : contentColumn,
            ),
          );
        },
      ),
    );

    return pdf.save();
  }

  static pw.Widget _buildPdfFieldLine(
    String label,
    String value,
    pw.Font fontRegular,
    pw.Font fontBold,
    PdfColor fontColor, {
    PdfColor? labelColor,
  }) {
    final resolvedLabelColor = labelColor ?? fontColor;
    return pw.Row(
      crossAxisAlignment: pw.CrossAxisAlignment.end,
      children: [
        pw.Text(
          label,
          style: pw.TextStyle(
            font: fontRegular,
            color: resolvedLabelColor,
            fontSize: 9.5,
          ),
        ),
        pw.SizedBox(width: 6),
        pw.Expanded(
          child: pw.Container(
            decoration: const pw.BoxDecoration(
              border: pw.Border(
                bottom: pw.BorderSide(
                  color: PdfColors.black,
                  width: 0.8,
                ),
              ),
            ),
            padding: const pw.EdgeInsets.only(bottom: 1),
            child: pw.Text(
              value,
              style: pw.TextStyle(
                font: fontBold,
                color: fontColor,
                fontSize: 10.5,
                fontStyle: pw.FontStyle.italic,
              ),
            ),
          ),
        ),
      ],
    );
  }

  static pw.Widget _buildPdfRupeeBox(
      double amount, String paymentMode, pw.Font fontBold, PdfColor fontColor,
      {PdfColor? primaryColor}) {
    final colorAccent = primaryColor ?? PdfColor.fromHex('#D84315');
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Container(
          decoration: pw.BoxDecoration(
            color: PdfColors.white,
            border: pw.Border.all(color: colorAccent, width: 1.8),
            borderRadius: const pw.BorderRadius.all(pw.Radius.circular(4)),
          ),
          padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          child: pw.Row(
            mainAxisSize: pw.MainAxisSize.min,
            children: [
              pw.Container(
                width: 12,
                height: 12,
                decoration: pw.BoxDecoration(
                  color: colorAccent,
                  shape: pw.BoxShape.circle,
                ),
                alignment: pw.Alignment.center,
                child: pw.Text(
                  '₹',
                  style: pw.TextStyle(
                    font: fontBold,
                    color: PdfColors.white,
                    fontSize: 8,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
              ),
              pw.SizedBox(width: 5),
              pw.Text(
                '${amount.toStringAsFixed(0)}/-',
                style: pw.TextStyle(
                  font: fontBold,
                  color: colorAccent,
                  fontSize: 14,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        pw.SizedBox(height: 3),
        pw.Text(
          'धनादेश वटल्यानंतरच पावती ग्राह्य धरली जाईल.',
          style: pw.TextStyle(
              font: fontBold, color: PdfColors.grey600, fontSize: 5.5),
        ),
        pw.Text(
          'Mode: ${paymentMode.toUpperCase()}',
          style: pw.TextStyle(
              font: fontBold,
              color: fontColor,
              fontSize: 6.5,
              fontWeight: pw.FontWeight.bold),
        ),
      ],
    );
  }

  static pw.Widget _buildPdfStamp(
      String status, pw.Font fontBold, pw.MemoryImage? customStamp) {
    if (customStamp != null) {
      return pw.Transform.rotate(
        angle: -0.08,
        child: pw.SizedBox(
          width: 55,
          height: 38,
          child: pw.Image(customStamp, fit: pw.BoxFit.contain),
        ),
      );
    }

    String text = 'धन्यवाद!';
    PdfColor color = PdfColor.fromHex('#C62828');

    if (status == 'pending') {
      text = 'PENDING';
      color = PdfColor.fromHex('#E65100');
    } else if (status == 'cancelled') {
      text = 'CANCELLED';
      color = PdfColors.grey700;
    }

    return pw.Transform.rotate(
      angle: -0.08,
      child: pw.Container(
        padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: pw.BoxDecoration(
          border: pw.Border.all(color: color, width: 1.2),
          borderRadius: const pw.BorderRadius.all(pw.Radius.circular(4)),
        ),
        child: pw.Text(
          text,
          style: pw.TextStyle(
            font: fontBold,
            color: color,
            fontStyle: pw.FontStyle.italic,
            fontWeight: pw.FontWeight.bold,
            fontSize: 11,
          ),
        ),
      ),
    );
  }

  static pw.Widget _buildPdfQrCode(
      String qrValue, pw.Font fontBold, PdfColor fontColor) {
    return pw.Column(
      children: [
        pw.Container(
          width: 36,
          height: 36,
          child: pw.BarcodeWidget(
            barcode: pw.Barcode.qrCode(),
            data: 'https://pavtibook.in/verify/$qrValue',
            color: fontColor,
          ),
        ),
        pw.SizedBox(height: 2),
        pw.Text(
          'पडताळणी QR',
          style: pw.TextStyle(
              font: fontBold,
              color: fontColor,
              fontSize: 5.5,
              fontWeight: pw.FontWeight.bold),
        ),
      ],
    );
  }

  static pw.Widget _buildPdfSignatureLine(
    String label,
    pw.Font fontBold,
    PdfColor fontColor,
    pw.MemoryImage? signature,
    String? collectorName, {
    PdfColor? lineColor,
  }) {
    final resolvedLineColor = lineColor ?? fontColor;
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.center,
      children: [
        if (signature != null)
          pw.SizedBox(
            height: 25,
            width: 50,
            child: pw.Image(signature, fit: pw.BoxFit.contain),
          )
        else
          pw.SizedBox(height: 25),
        pw.Container(
          width: 65,
          height: 0.8,
          color: resolvedLineColor,
        ),
        pw.SizedBox(height: 3),
        pw.Text(
          collectorName ?? "PavtiBook Collector",
          style: pw.TextStyle(
            font: fontBold,
            color: fontColor,
            fontSize: 7.5,
            fontWeight: pw.FontWeight.bold,
          ),
        ),
        pw.Text(
          label,
          style: pw.TextStyle(
            font: fontBold,
            color: PdfColors.grey600,
            fontSize: 5.5,
          ),
        ),
      ],
    );
  }

  /// Write valid PDF receipt file, upload to Firebase Storage, and share natively.
  static Future<bool> sharePdfDirectly({
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
  }) async {
    try {
      final tempDir = await getTemporaryDirectory();
      final file = File('${tempDir.path}/$fileName');

      if (!await file.exists()) {
        final pdfBytes = await generateMinimalPdf(
          templateType: templateType,
          receiptNumber: receiptNumber,
          orgName: orgName,
          donorName: donorName,
          amount: amount,
          purpose: purpose,
          date: date,
          paymentMode: paymentMode,
          paymentStatus: paymentStatus,
          qrCodeValue: qrCodeValue,
          signatureLabel: signatureLabel,
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
  }) async {
    try {
      final fileName = 'receipt_$receiptNumber.pdf';
      final pdfBytes = await generateMinimalPdf(
        templateType: templateType,
        receiptNumber: receiptNumber,
        orgName: orgName,
        donorName: donorName,
        amount: amount,
        purpose: purpose,
        date: date,
        paymentMode: paymentMode,
        paymentStatus: paymentStatus,
        qrCodeValue: qrCodeValue,
        signatureLabel: signatureLabel,
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
      );

      // On Android, check the public downloads directory first
      Directory? downloadDir;
      if (Platform.isAndroid) {
        final dir = Directory('/storage/emulated/0/Download');
        if (await dir.exists()) {
          downloadDir = dir;
        }
      }

      // Fallback to external storage directory
      downloadDir ??= await getExternalStorageDirectory();
      // Fallback to app documents directory
      downloadDir ??= await getApplicationDocumentsDirectory();

      final file = File('${downloadDir.path}/$fileName');
      await file.writeAsBytes(pdfBytes);
      return file.path;
    } catch (e) {
      debugPrint('Save PDF local error: $e');
      return null;
    }
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

      final pdfBytes = await generateMinimalPdf(
        templateType: template.type,
        receiptNumber: receipt.receiptNumber,
        orgName: receipt.organizationName ?? 'PavtiBook',
        donorName: receipt.donorName ?? 'Guest Donor',
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
