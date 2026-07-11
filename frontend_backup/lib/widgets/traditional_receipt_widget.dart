import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import 'receipt_theme.dart';

class TraditionalReceiptWidget extends StatelessWidget {
  final ReceiptModel receipt;
  final OrganizationModel organization;
  final TemplateModel template;

  const TraditionalReceiptWidget({
    super.key,
    required this.receipt,
    required this.organization,
    required this.template,
  });

  Color _parseColor(String hex, Color fallback) {
    try {
      final buffer = StringBuffer();
      if (hex.length == 6 || hex.length == 7) buffer.write('ff');
      buffer.write(hex.replaceFirst('#', ''));
      return Color(int.parse(buffer.toString(), radix: 16));
    } catch (e) {
      return fallback;
    }
  }

  @override
  Widget build(BuildContext context) {
    final bgColor = _parseColor(
        template.bgColor, const Color(0xFFFFFBEF)); // Warm Cream Paper
    final borderColor = _parseColor(
        template.borderColor, const Color(0xFFE65100)); // Vibrant Saffron
    final fontColor = _parseColor(
        template.fontColor, const Color(0xFF2E1C0C)); // Dark Charcoal Brown

    // Resolve receipt theme palette
    final themeId = receipt.receiptThemeId ??
        organization.receiptThemeId ??
        'traditional_saffron';
    final palette = getThemePalette(themeId, organization, template);

    final dateStr = DateFormat('dd/MM/yyyy')
        .format(DateTime.tryParse(receipt.createdAt) ?? DateTime.now());

    // Render Template Style 2: Left-Side Ganesha Panel Style
    if (template.type == 'temple') {
      return Card(
        elevation: 8,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        child: Container(
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(8),
          ),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. Left God Panel
                _buildLeftGodPanel(template, borderColor),

                // 2. Center Receipt Content
                Expanded(
                  child: Container(
                    margin: const EdgeInsets.all(4.0),
                    decoration: BoxDecoration(
                      border: Border.all(color: borderColor, width: 2.0),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // A. Top metadata row (Establishment and Registration No)
                        Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8.0, vertical: 4.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'स्थापना: १९६२',
                                style: TextStyle(
                                    color: fontColor,
                                    fontSize: 7.5,
                                    fontWeight: FontWeight.bold),
                              ),
                              Container(
                                width: 14,
                                height: 14,
                                decoration: BoxDecoration(
                                  color: borderColor.withValues(alpha: 0.2),
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                      color: borderColor, width: 0.5),
                                ),
                                child: const Center(
                                  child: Text('ॐ',
                                      style: TextStyle(
                                          fontSize: 6,
                                          fontWeight: FontWeight.bold)),
                                ),
                              ),
                              Text(
                                'रजि. नं.: एफ/११२१७/ठाणे',
                                style: TextStyle(
                                    color: fontColor,
                                    fontSize: 7.5,
                                    fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),

                        // B. Dark Maroon Header Banner with Shivaji & Tilak portraits
                        Container(
                          color: palette.primary,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 6),
                          child: Row(
                            children: [
                              // Left Portrait (Shivaji Maharaj banner avatar placeholder)
                              _buildPortraitAvatar(
                                  '🚩', 'शिवाजी', const Color(0xFFFFB74D)),
                              const SizedBox(width: 6),

                              // Org name in center
                              Expanded(
                                child: Column(
                                  children: [
                                    Text(
                                      receipt.organizationName ??
                                          organization.name,
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                        color:
                                            Color(0xFFFFEE58), // Bright Yellow
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.bold,
                                        shadows: [
                                          Shadow(
                                              offset: Offset(0.5, 0.5),
                                              blurRadius: 0.5,
                                              color: Colors.black),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      template.headerTextEn ??
                                          'SHIVNERI FOUNDATION',
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 7.5,
                                        fontWeight: FontWeight.w500,
                                        letterSpacing: 0.8,
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              const SizedBox(width: 6),
                              // Right Portrait (Lokmanya Tilak banner avatar placeholder)
                              _buildPortraitAvatar(
                                  '📜', 'टिळक', const Color(0xFF90CAF9)),
                            ],
                          ),
                        ),

                        // C. Subtitle Badge
                        const SizedBox(height: 4),
                        Center(
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              border: Border.all(
                                  color: palette.primary, width: 1.0),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            child: Text(
                              template.headerTextLocal ?? 'सार्वजनिक गणेशोत्सव',
                              style: TextStyle(
                                color: palette.primary,
                                fontSize: 8.5,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),

                        // D. Receipt No & Date
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 5, vertical: 1.5),
                                decoration: BoxDecoration(
                                  color: palette.accent.withOpacity(0.08),
                                  border: Border.all(
                                      color: palette.accent.withOpacity(0.3),
                                      width: 0.6),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  'पावती क्र. / No: ${receipt.receiptNumber}',
                                  style: TextStyle(
                                      color: palette.primary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 8.0),
                                ),
                              ),
                              Text(
                                'दिनांक / Date: $dateStr',
                                style: TextStyle(
                                    color: fontColor,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 8.5),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 4),

                        // E. Fields
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8.0),
                          child: Column(
                            children: [
                              _buildPaperFieldLine(
                                  'श्री. / श्रीमती / मेसर्स (From):',
                                  receipt.donorName ?? '',
                                  fontColor,
                                  labelColor: palette.primary),
                              const SizedBox(height: 6),
                              _buildPaperFieldLine(
                                  'अक्षरी रुपये (Words):',
                                  '${receipt.amount.toInt()} Rupees Only',
                                  fontColor,
                                  labelColor: palette.primary),
                              const SizedBox(height: 6),
                              _buildPaperFieldLine('देणगी कारण (Purpose):',
                                  receipt.purpose, fontColor,
                                  labelColor: palette.primary),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),

                        // F. Bottom Grid (Rupee box, Cursive stamp, QR code, Sign)
                        Padding(
                          padding: const EdgeInsets.only(
                              left: 8.0, right: 8.0, bottom: 4.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              // 1. Rupee Box
                              _buildRupeeBox(receipt, fontColor,
                                  primaryColor: palette.primary),

                              // 2. Tilted cursive "धन्यवाद!" stamp
                              _buildCursiveStamp(palette.primary, borderColor),

                              // 3. QR verification
                              _buildQrCode(receipt, fontColor),

                              // 4. Signature line
                              _buildSignatureLine(template, fontColor,
                                  lineColor: palette.accent),
                            ],
                          ),
                        ),
                        Divider(
                            height: 1, color: palette.accent.withOpacity(0.2)),
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 2.0),
                          child: Center(
                            child: Text(
                              receipt.footerText ??
                                  organization.footerText ??
                                  'Powered by PavtiBook • Traditional Trust. Digital Simplicity.',
                              style: const TextStyle(
                                  color: Colors.grey,
                                  fontSize: 6.0,
                                  fontWeight: FontWeight.w500),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                // 3. Right God Panel (Symmetric)
                _buildRightGodPanel(template, borderColor),
              ],
            ),
          ),
        ),
      );
    }

    // Render Template Style 1: Saffron Top Banner Style (Classic Mandal / Default)
    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
      ),
      child: Container(
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Stack(
          children: [
            // Faded watermark background
            Positioned.fill(
              child: Opacity(
                opacity: template.watermarkOpacity,
                child: Center(
                  child: template.watermarkUrl != null &&
                          template.watermarkUrl!.isNotEmpty
                      ? (() {
                          debugPrint(
                              'TraditionalReceiptWidget loading watermark image: ${template.watermarkUrl}');
                          return Image.network(
                            template.watermarkUrl!,
                            fit: BoxFit.contain,
                            width: 160,
                            height: 160,
                            errorBuilder: (context, error, stackTrace) {
                              debugPrint(
                                  'TraditionalReceiptWidget failed to load watermark: $error');
                              return const Icon(
                                Icons.brightness_7,
                                size: 150,
                                color: Color(0xFFD84315),
                              );
                            },
                          );
                        })()
                      : const Icon(
                          Icons.brightness_7,
                          size: 150,
                          color: Color(0xFFD84315),
                        ),
                ),
              ),
            ),

            // Outer double-border container wrapped in a Row with side images
            Padding(
              padding: const EdgeInsets.all(6.0),
              child: Container(
                decoration: BoxDecoration(
                  border: Border.all(color: borderColor, width: 2.5),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Container(
                  margin: const EdgeInsets.all(2.0),
                  decoration: BoxDecoration(
                    border: Border.all(color: borderColor, width: 1.0),
                    borderRadius: BorderRadius.circular(2),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // A. Solid Saffron Top Banner Header
                      (() {
                        final leftLogoUrl = receipt.leftSideImageUrl ??
                            organization.leftSideImageUrl;
                        final rightLogoUrl = receipt.rightSideImageUrl ??
                            organization.rightSideImageUrl;
                        final hasLeftLogo =
                            leftLogoUrl != null && leftLogoUrl.isNotEmpty;
                        final hasRightLogo =
                            rightLogoUrl != null && rightLogoUrl.isNotEmpty;
                        final showLogoLayout = hasLeftLogo || hasRightLogo;

                        return Container(
                          color: palette.primary,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 8),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (showLogoLayout) ...[
                                if (hasLeftLogo)
                                  _buildHeaderLogo(leftLogoUrl, borderColor)
                                else
                                  const SizedBox(width: 52, height: 52),
                                const SizedBox(width: 8),
                              ],

                              // Headings
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.center,
                                  children: [
                                    Text(
                                      template.headerTextLocal ??
                                          '॥ श्री गणेश प्रसन्न ॥',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.w500,
                                        letterSpacing: 1.2,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      receipt.organizationName ??
                                          organization.name,
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                        color: Color(0xFFFFEB3B), // Yellow text
                                        fontSize: 14.5,
                                        fontWeight: FontWeight.bold,
                                        shadows: [
                                          Shadow(
                                              offset: Offset(1.0, 1.0),
                                              blurRadius: 1.0,
                                              color: Colors.black45),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Container(
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 10, vertical: 2),
                                      child: Text(
                                        template.headerTextEn ??
                                            'PUBLIC CHARITABLE TRUST',
                                        style: TextStyle(
                                          color: palette.primary,
                                          fontSize: 8,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              if (showLogoLayout) ...[
                                const SizedBox(width: 8),
                                if (hasRightLogo)
                                  _buildHeaderLogo(rightLogoUrl, borderColor)
                                else
                                  const SizedBox(width: 52, height: 52),
                              ],
                            ],
                          ),
                        );
                      })(),

                      // B. Metadata Line (No & Date)
                      Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12.0, vertical: 8.0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: palette.accent.withOpacity(0.08),
                                border: Border.all(
                                    color: palette.accent.withOpacity(0.3),
                                    width: 0.6),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'पावती क्र. / Receipt No: ${receipt.receiptNumber}',
                                style: TextStyle(
                                    color: palette.primary,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 8.5),
                              ),
                            ),
                            Text(
                              'दिनांक / Date: $dateStr',
                              style: TextStyle(
                                  color: fontColor,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 9.5),
                            ),
                          ],
                        ),
                      ),

                      // C. Field Rows
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12.0),
                        child: Column(
                          children: [
                            _buildPaperFieldLine('श्री. / श्रीमती (Donor):',
                                receipt.donorName ?? '', fontColor,
                                labelColor: palette.primary),
                            const SizedBox(height: 8),
                            _buildPaperFieldLine(
                                'अक्षरी रुपये (Rupees in words):',
                                '${receipt.amount.toInt()} Rupees Only',
                                fontColor,
                                labelColor: palette.primary),
                            const SizedBox(height: 8),
                            _buildPaperFieldLine(
                                'देणगी कारण (Contribution Purpose):',
                                receipt.purpose,
                                fontColor,
                                labelColor: palette.primary),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      // D. Bottom Grid: Rupee Box, Reconciled Stamp, QR Scan, Signature
                      Padding(
                        padding: const EdgeInsets.only(
                            left: 12.0, right: 12.0, bottom: 4.0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            // 1. Rupee Box
                            _buildRupeeBox(receipt, fontColor,
                                primaryColor: palette.primary),

                            // 2. Stylized hand-stamped cursive "धन्यवाद!" in red
                            _buildCursiveStamp(palette.primary, borderColor),

                            // 3. QR code Verification
                            _buildQrCode(receipt, fontColor),

                            // 4. Signatory
                            _buildSignatureLine(template, fontColor,
                                lineColor: palette.accent),
                          ],
                        ),
                      ),
                      Divider(
                          height: 1, color: palette.accent.withOpacity(0.2)),
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2.0),
                        child: Center(
                          child: Text(
                            receipt.footerText ??
                                organization.footerText ??
                                'Powered by PavtiBook • Traditional Trust. Digital Simplicity.',
                            style: const TextStyle(
                                color: Colors.grey,
                                fontSize: 6.5,
                                fontWeight: FontWeight.w500),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- STYLISH HELPER WIDGETS ---

  Widget _buildLeftGodPanel(TemplateModel template, Color borderColor) {
    return Container(
      width: 80,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFFFFF9C4), // Golden Yellow
            Color(0xFFFFCC80), // Pastel Saffron
            Color(0xFFFFAB91), // Orange Red
          ],
        ),
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(8),
          bottomLeft: Radius.circular(8),
        ),
        border: Border(
          right: BorderSide(color: borderColor, width: 2.0),
        ),
      ),
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            '॥ श्री गजानन प्रसन्न ॥',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.brown[900],
              fontSize: 7.5,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 4),
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                border: Border.all(
                    color: const Color(0xFFFFD700), width: 1.5), // Gold border
                borderRadius: BorderRadius.circular(4),
              ),
              clipBehavior: Clip.antiAlias,
              child: (receipt.leftSideImageUrl ??
                              organization.leftSideImageUrl ??
                              template.godImageUrl) !=
                          null &&
                      (receipt.leftSideImageUrl ??
                              organization.leftSideImageUrl ??
                              template.godImageUrl)!
                          .isNotEmpty
                  ? (() {
                      final imgUrl = receipt.leftSideImageUrl ??
                          organization.leftSideImageUrl ??
                          template.godImageUrl!;
                      debugPrint(
                          'TraditionalReceiptWidget loading left side image: $imgUrl');
                      return Image.network(
                        imgUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          debugPrint(
                              'TraditionalReceiptWidget failed to load left side image: $error');
                          return Container(
                            color: Colors.white,
                            alignment: Alignment.center,
                            child: const Text('🐘',
                                style: TextStyle(fontSize: 28)),
                          );
                        },
                      );
                    })()
                  : Container(
                      color: Colors.white,
                      alignment: Alignment.center,
                      child: const Text(
                        '🐘',
                        style: TextStyle(fontSize: 28),
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 4),
          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('🌸', style: TextStyle(fontSize: 9)),
              Text('🌼', style: TextStyle(fontSize: 9)),
              Text('🌸', style: TextStyle(fontSize: 9)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRightGodPanel(TemplateModel template, Color borderColor) {
    return Container(
      width: 80,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFFFFF9C4), // Golden Yellow
            Color(0xFFFFCC80), // Pastel Saffron
            Color(0xFFFFAB91), // Orange Red
          ],
        ),
        borderRadius: const BorderRadius.only(
          topRight: Radius.circular(8),
          bottomRight: Radius.circular(8),
        ),
        border: Border(
          left: BorderSide(color: borderColor, width: 2.0),
        ),
      ),
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            '॥ श्री गणेशाय नमः ॥',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.brown[900],
              fontSize: 7.5,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 4),
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                border: Border.all(
                    color: const Color(0xFFFFD700), width: 1.5), // Gold border
                borderRadius: BorderRadius.circular(4),
              ),
              clipBehavior: Clip.antiAlias,
              child: (receipt.rightSideImageUrl ??
                              organization.rightSideImageUrl ??
                              receipt.customStampUrl ??
                              organization.customStampUrl) !=
                          null &&
                      (receipt.rightSideImageUrl ??
                              organization.rightSideImageUrl ??
                              receipt.customStampUrl ??
                              organization.customStampUrl)!
                          .isNotEmpty
                  ? (() {
                      final imgUrl = receipt.rightSideImageUrl ??
                          organization.rightSideImageUrl ??
                          receipt.customStampUrl ??
                          organization.customStampUrl!;
                      debugPrint(
                          'TraditionalReceiptWidget loading right side image: $imgUrl');
                      return Image.network(
                        imgUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          debugPrint(
                              'TraditionalReceiptWidget failed to load right side image: $error');
                          return Container(
                            color: Colors.white,
                            alignment: Alignment.center,
                            child: const Text('🏵',
                                style: TextStyle(fontSize: 28)),
                          );
                        },
                      );
                    })()
                  : Container(
                      color: Colors.white,
                      alignment: Alignment.center,
                      child: const Text(
                        '🏵',
                        style: TextStyle(fontSize: 28),
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 4),
          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('🌸', style: TextStyle(fontSize: 9)),
              Text('🌼', style: TextStyle(fontSize: 9)),
              Text('🌸', style: TextStyle(fontSize: 9)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderLogo(String imageUrl, Color borderColor) {
    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.white, width: 1.5),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: Image.network(
          imageUrl,
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) {
            debugPrint(
                'TraditionalReceiptWidget failed to load header logo: $error');
            return const Center(
              child: Icon(Icons.image, size: 28, color: Colors.grey),
            );
          },
        ),
      ),
    );
  }

  Widget _buildPortraitAvatar(String emoji, String label, Color bgColor) {
    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        color: bgColor,
        shape: BoxShape.circle,
        border: Border.all(
            color: const Color(0xFFFFD700), width: 1.2), // Gold frame
      ),
      child: Center(
        child: Text(
          emoji,
          style: const TextStyle(fontSize: 14),
        ),
      ),
    );
  }

  Widget _buildRupeeBox(ReceiptModel receipt, Color fontColor,
      {Color? primaryColor}) {
    final colorAccent = primaryColor ?? const Color(0xFFD84315);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: colorAccent, width: 2.0),
            borderRadius: BorderRadius.circular(4),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  color: colorAccent,
                  shape: BoxShape.circle,
                ),
                child: const Text(
                  '₹',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Text(
                '${receipt.amount.toStringAsFixed(0)}/-',
                style: TextStyle(
                  color: colorAccent,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 3),
        const Text(
          'धनादेश वटल्यानंतरच पावती ग्राह्य धरली जाईल.',
          style: TextStyle(color: Colors.grey, fontSize: 5.5),
        ),
        Text(
          'Mode: ${receipt.paymentMode.toUpperCase()}',
          style: TextStyle(
              color: fontColor, fontSize: 6.5, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  Widget _buildCursiveStamp(Color bannerColor, Color borderColor) {
    final stampUrl = receipt.customStampUrl ?? organization.customStampUrl;
    if (stampUrl != null && stampUrl.isNotEmpty) {
      return Transform.rotate(
        angle: -0.08,
        child: SizedBox(
          width: 65,
          height: 45,
          child: (() {
            debugPrint(
                'TraditionalReceiptWidget loading custom stamp image: $stampUrl');
            return Image.network(
              stampUrl,
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) {
                debugPrint(
                    'TraditionalReceiptWidget failed to load custom stamp: $error');
                return _buildFallbackCursiveStamp(bannerColor, borderColor);
              },
            );
          })(),
        ),
      );
    }

    return _buildFallbackCursiveStamp(bannerColor, borderColor);
  }

  Widget _buildFallbackCursiveStamp(Color bannerColor, Color borderColor) {
    String text = 'धन्यवाद!';
    Color color = const Color(0xFFC62828); // red for thanks/paid

    if (receipt.paymentStatus == 'pending') {
      text = 'PENDING';
      color = const Color(0xFFE65100); // orange for pending
    } else if (receipt.paymentStatus == 'cancelled') {
      text = 'CANCELLED';
      color = Colors.grey[700]!; // grey for cancelled
    }

    return Transform.rotate(
      angle: -0.08,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          border: Border.all(color: color, width: 1.5),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(
          text,
          style: TextStyle(
            color: color,
            fontStyle: FontStyle.italic,
            fontWeight: FontWeight.bold,
            fontFamily: 'Rozha One',
            fontSize: 11.5,
          ),
        ),
      ),
    );
  }

  Widget _buildQrCode(ReceiptModel receipt, Color fontColor) {
    return Column(
      children: [
        QrImageView(
          data: 'https://pavtibook.in/verify/${receipt.qrCodeValue}',
          version: QrVersions.auto,
          size: 38,
          eyeStyle: QrEyeStyle(eyeShape: QrEyeShape.square, color: fontColor),
          dataModuleStyle: QrDataModuleStyle(
              dataModuleShape: QrDataModuleShape.square, color: fontColor),
        ),
        const SizedBox(height: 1),
        Text(
          'पडताळणी QR',
          style: TextStyle(
              color: fontColor, fontSize: 5.5, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  Widget _buildSignatureLine(TemplateModel template, Color fontColor,
      {Color? lineColor}) {
    final sigUrl = receipt.signatureUrl;
    final nameLabel = receipt.collectorName ?? "PavtiBook Collector";
    final roleLabel = receipt.collectorRole ?? template.signatureLabel;
    final resolvedLineColor = lineColor ?? fontColor;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        if (sigUrl != null && sigUrl.isNotEmpty)
          SizedBox(
            height: 35,
            width: 70,
            child: (() {
              debugPrint(
                  'TraditionalReceiptWidget loading signature image: $sigUrl');
              return Image.network(
                sigUrl,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) {
                  debugPrint(
                      'TraditionalReceiptWidget failed to load signature: $error');
                  return const SizedBox(height: 35);
                },
              );
            })(),
          )
        else
          const SizedBox(height: 35),
        Container(
          width: 65,
          height: 0.8,
          color: resolvedLineColor,
        ),
        const SizedBox(height: 3),
        Text(
          nameLabel,
          style: TextStyle(
            color: fontColor,
            fontSize: 7.5,
            fontWeight: FontWeight.bold,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        Text(
          roleLabel,
          style: const TextStyle(
            color: Colors.grey,
            fontSize: 5.5,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }

  Widget _buildPaperFieldLine(String label, String value, Color fontColor,
      {Color? labelColor}) {
    final resolvedLabelColor = labelColor ?? fontColor.withValues(alpha: 0.8);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              label,
              style: TextStyle(
                color: resolvedLabelColor,
                fontSize: 9.5,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Container(
                decoration: const BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: Colors.black54,
                      width: 1.0,
                      style: BorderStyle.solid,
                    ),
                  ),
                ),
                padding: const EdgeInsets.only(bottom: 1),
                child: Text(
                  value,
                  style: TextStyle(
                    color: fontColor,
                    fontSize: 10.5,
                    fontWeight: FontWeight.bold,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
