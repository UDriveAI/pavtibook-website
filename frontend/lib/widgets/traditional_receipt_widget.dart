import 'dart:math';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../models/receipt_template_preset.dart';
import '../services/universal_receipt_engine.dart';
import '../config/receipt_typography_config.dart';
import '../services/location_service.dart';
import '../services/amount_to_words_service.dart';

/// Production-Grade Universal Receipt Renderer for PavtiBook
/// DEFAULT PAVTIBOOK layout uses a FIXED MASTER COORDINATE SYSTEM (1536 x 1024).
/// All elements are positioned using Positioned widgets inside a Stack.
/// The entire 1536x1024 composition is scaled uniformly by FittedBox.
/// DO NOT add Expanded / Flexible to the default layout — it breaks the geometry.
class TraditionalReceiptWidget extends StatelessWidget {
  final ReceiptModel receipt;
  final OrganizationModel organization;
  final TemplateModel template;
  final String languageCode;

  const TraditionalReceiptWidget({
    super.key,
    required this.receipt,
    required this.organization,
    required this.template,
    this.languageCode = 'mr',
  });

  @override
  Widget build(BuildContext context) {
    final renderParams = UniversalReceiptEngine.resolveRenderParams(
      receipt: receipt,
      organization: organization,
      template: template,
      languageCode: languageCode,
    );

    final preset = renderParams.preset;

    final receiptContent = preset.isNeutral
        ? _buildDefaultPavtiBookLayout(context, renderParams)
        : _buildPresetCardLayout(context, renderParams);

    final isLandscape = preset.isNeutral;
    final targetAspectRatio = isLandscape ? (1536.0 / 1024.0) : (1024.0 / 1536.0);
    final canvasWidth = isLandscape ? 1536.0 : 1024.0;
    final canvasHeight = isLandscape ? 1024.0 : 1536.0;

    return Center(
      child: AspectRatio(
        aspectRatio: targetAspectRatio,
        child: FittedBox(
          fit: BoxFit.contain,
          alignment: Alignment.center,
          child: SizedBox(
            width: canvasWidth,
            height: canvasHeight,
            child: receiptContent,
          ),
        ),
      ),
    );
  }

  // ===========================================================================
  // 1. DEFAULT PAVTIBOOK LAYOUT — FIXED MASTER ARTBOARD (1536 x 1024)
  //
  // SINGLE SOURCE OF TRUTH: DefaultPavtiBookGeometry (1536 x 1024)
  // All Positioned widgets use fixed geometry constants.
  // FittedBox in build() scales the entire composition uniformly to any screen size.
  // ===========================================================================
  Widget _buildDefaultPavtiBookLayout(
    BuildContext context,
    UniversalReceiptRenderParams params,
  ) {
    final labels = params.localizedLabels;
    final preset = ReceiptPresetCatalog.getById(template.type);

    final DateTime? parsedCreatedAt = DateTime.tryParse(receipt.createdAt);
    final dateStr = parsedCreatedAt != null
        ? DateFormat('dd MMMM yyyy').format(parsedCreatedAt)
        : (receipt.createdAt.isNotEmpty ? receipt.createdAt : '');
    final timeStr = parsedCreatedAt != null
        ? DateFormat('hh:mm a').format(parsedCreatedAt)
        : '';
    final amountVal = receipt.amount;
    final amountFormatted = '₹ ${amountVal.toStringAsFixed(2)}';
    final assets = ResolvedReceiptAssets.resolve(receipt: receipt, organization: organization, template: template);

    // ---- MASTER COLORS FROM RESOLVED PARAMS ----
    final pageBg = params.backgroundColor;
    final maroon = params.primaryColor;
    final orange = params.borderColor;
    final cream = params.secondaryColor;
    const greenBg = DefaultPavtiBookGeometry.greenBg;
    const greenBorder = DefaultPavtiBookGeometry.greenBorder;
    const greenDark = DefaultPavtiBookGeometry.greenDark;

    // ---- PAYMENT MODE ----
    final payMode = receipt.paymentMode.toLowerCase();
    bool isPay(String m) {
      if (m == 'cash')     return payMode.contains('cash') || payMode.contains('रोख');
      if (m == 'upi')      return payMode.contains('upi') && !payMode.contains('google') && !payMode.contains('phone');
      if (m == 'gpay')     return payMode.contains('google') || payMode.contains('gpay');
      if (m == 'phonepe')  return payMode.contains('phone');
      if (m == 'bank')     return payMode.contains('bank') || payMode.contains('neft') || payMode.contains('rtgs');
      if (m == 'cheque')   return payMode.contains('cheque') || payMode.contains('चेक');
      return payMode == 'other';
    }

    // ---- PILL BUILDER ----
    Widget pill(String text, Color bg, double fs, double maxW, double maxH) {
      if (fs <= 0.0) return const SizedBox.shrink();
      return Container(
        constraints: BoxConstraints(maxWidth: maxW, maxHeight: maxH),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(24)),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
        child: FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.center,
          child: Text(
            text,
            style: TextStyle(fontSize: fs, fontWeight: FontWeight.bold, color: Colors.white),
          ),
        ),
      );
    }

    // ---- PAYMENT CHIP BUILDER (TEXT-ONLY, ENLARGED CLEAR TEXT, NO ICONS) ----
    Widget payChip(String label, bool selected) => Container(
      width: 216,
      height: 38,
      decoration: BoxDecoration(
        color: selected ? greenBg : Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
            color: selected ? greenBorder : Colors.grey.shade400,
            width: selected ? 2.5 : 1.5),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      child: Center(
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: selected ? greenDark : Colors.black87,
            ),
          ),
        ),
      ),
    );

    // ---- SIGNATURE COLUMN BUILDER ----
    Widget sigCol(String title, {String? sigUrl, double scale = 1.0, String? personName}) {
      final titleFs = ReceiptTypographyConfig.getResolvedFontSize(
        categoryKey: 'sig_labels',
        customTextSizes: template.customTextSizes,
        globalHeadingSize: template.headingSize,
        globalBodySize: template.bodySize,
        globalAmountSize: template.amountSize,
      );

      final double effectiveScale = scale.clamp(0.0, 3.0);
      final double sigHeight = (36.0 + (effectiveScale - 1.0) * 12.0).clamp(30.0, 60.0);
      final double sigWidth = (110.0 + (effectiveScale - 1.0) * 35.0).clamp(90.0, 180.0);

      return SizedBox(
        width: 196,
        height: 110,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // 1. Title Header at Top
            SizedBox(
              height: 22,
              child: titleFs > 0.0
                  ? FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.center,
                      child: Text(
                        title,
                        style: TextStyle(
                          fontSize: max(16.0, titleFs),
                          fontWeight: FontWeight.bold,
                          color: maroon,
                        ),
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
            // 2. Expanded Dedicated Signature Area Container
            Expanded(
              child: Container(
                width: 184,
                alignment: Alignment.center,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Positioned(
                      bottom: 0,
                      child: Container(
                        width: 155,
                        height: 1.5,
                        color: maroon.withValues(alpha: 0.5),
                      ),
                    ),
                    if (effectiveScale > 0.0 && sigUrl != null && sigUrl.trim().isNotEmpty)
                      Positioned(
                        top: 0,
                        bottom: 3,
                        child: FittedBox(
                          fit: BoxFit.contain,
                          alignment: Alignment.center,
                          child: SizedBox(
                            height: sigHeight,
                            width: sigWidth,
                            child: Image.network(
                              sigUrl,
                              fit: BoxFit.contain,
                              errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            // 3. Saved Person Name Sublabel Footer at Bottom
            SizedBox(
              height: 20,
              child: (personName != null && personName.trim().isNotEmpty)
                  ? FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.center,
                      child: Text(
                        personName.trim(),
                        style: TextStyle(
                          fontSize: max(13.0, titleFs - 2.0),
                          fontWeight: FontWeight.bold,
                          color: maroon.withValues(alpha: 0.95),
                        ),
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
          ],
        ),
      );
    }

    // ---- FEATURE ROW BUILDER ----
    Widget featureRow(String text) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(children: [
        Icon(Icons.check_circle, size: 18, color: Colors.green.shade600),
        const SizedBox(width: 8),
        Text(text, style: const TextStyle(fontSize: 15, color: Colors.black87)),
      ]),
    );

    // ---- DONOR FIELD ROW BUILDER ----
    Widget donorRow(String label, String value) => Padding(
      padding: const EdgeInsets.only(bottom: 7),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 216,
            child: Text(label,
                style: const TextStyle(
                    fontSize: DefaultPavtiBookGeometry.fontFields, fontWeight: FontWeight.bold, color: Colors.black87)),
          ),
          Expanded(
            child: Text(value,
                style: const TextStyle(fontSize: DefaultPavtiBookGeometry.fontFields, color: Colors.black87),
                overflow: TextOverflow.ellipsis,
                maxLines: 1),
          ),
        ],
      ),
    );

    // ---- TABLE CELL BUILDER ----
    Widget tblCell(String text, double fs, Color color,
        {bool bold = false, TextAlign align = TextAlign.left}) =>
        Padding(
          padding: const EdgeInsets.all(9),
          child: Text(text,
              textAlign: align,
              style: TextStyle(
                  fontSize: fs,
                  fontWeight: bold ? FontWeight.bold : FontWeight.normal,
                  color: color)),
        );

    // =========================================================================
    // STACK — ALL ELEMENTS IN MASTER COORDINATES (1536 x 1024)
    // =========================================================================
    return SizedBox(
      width: DefaultPavtiBookGeometry.masterWidth,
      height: DefaultPavtiBookGeometry.masterHeight,
      child: Stack(
        clipBehavior: Clip.hardEdge,
        children: [

          // [A] OUTER RECEIPT BACKGROUND + BORDER
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                color: pageBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: maroon, width: 2.5),
                boxShadow: const [
                  BoxShadow(
                      color: Colors.black12, blurRadius: 12, offset: Offset(0, 4))
                ],
              ),
            ),
          ),

          // [C] RIGHT SIDEBAR BACKGROUND
          Positioned(
            left: DefaultPavtiBookGeometry.sidebarX,
            top: 0,
            width: DefaultPavtiBookGeometry.sidebarWidth,
            height: DefaultPavtiBookGeometry.masterHeight,
            child: ClipRRect(
              borderRadius: const BorderRadius.only(
                topRight: Radius.circular(14),
                bottomRight: Radius.circular(14),
              ),
              child: ColoredBox(color: maroon),
            ),
          ),

          // [E] GREETING LINE
          Positioned(
            left: DefaultPavtiBookGeometry.greetingLine.x,
            top: DefaultPavtiBookGeometry.greetingLine.y,
            width: DefaultPavtiBookGeometry.greetingLine.width,
            height: DefaultPavtiBookGeometry.greetingLine.height,
            child: Center(
              child: ReceiptTypographyConfig.getResolvedFontSize(
                        categoryKey: 'greeting',
                        customTextSizes: template.customTextSizes,
                        globalHeadingSize: template.headingSize,
                        globalBodySize: template.bodySize,
                        globalAmountSize: template.amountSize,
                      ) > 0.0
                  ? FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        template.headerTextLocal ?? '॥ श्री गणेशाय नमः ॥',
                        style: TextStyle(
                          fontSize: ReceiptTypographyConfig.getResolvedFontSize(
                            categoryKey: 'greeting',
                            customTextSizes: template.customTextSizes,
                            globalHeadingSize: template.headingSize,
                            globalBodySize: template.bodySize,
                            globalAmountSize: template.amountSize,
                          ),
                          fontWeight: FontWeight.bold,
                          color: maroon,
                          letterSpacing: 2.0,
                        ),
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
          ),

          // [F] PAVTIBOOK LOGO / ORGANIZATION LOGO
          Positioned(
            left: DefaultPavtiBookGeometry.headerLogo.x,
            top: DefaultPavtiBookGeometry.headerLogo.y,
            width: DefaultPavtiBookGeometry.headerLogo.width,
            height: DefaultPavtiBookGeometry.headerLogo.height,
            child: Center(
              child: SizedBox(
                width: DefaultPavtiBookGeometry.headerLogo.width * template.logoScale.clamp(0.6, 1.6),
                height: DefaultPavtiBookGeometry.headerLogo.height * template.logoScale.clamp(0.6, 1.6),
                child: (template.logoVisible &&
                        assets.logoUrl != null &&
                        assets.logoUrl!.isNotEmpty)
                    ? Image.network(
                        assets.logoUrl!,
                        fit: BoxFit.contain,
                        alignment: Alignment.centerLeft,
                        errorBuilder: (_, __, ___) => Image.asset(
                          'assets/images/Pavati-Book-Logo.png',
                          fit: BoxFit.contain,
                          alignment: Alignment.centerLeft,
                        ),
                      )
                    : Image.asset(
                        'assets/images/Pavati-Book-Logo.png',
                        fit: BoxFit.contain,
                        alignment: Alignment.centerLeft,
                      ),
              ),
            ),
          ),

          // Logo tagline
          Positioned(
            left: DefaultPavtiBookGeometry.logoTagline.x,
            top: DefaultPavtiBookGeometry.logoTagline.y,
            width: DefaultPavtiBookGeometry.logoTagline.width,
            height: DefaultPavtiBookGeometry.logoTagline.height,
            child: const Text(
              'Digital Trust. Transparent Receipts.',
              style: TextStyle(
                  fontSize: 13, color: Colors.black54, fontWeight: FontWeight.w500),
            ),
          ),

          // [G] ORGANIZATION TITLE (Fitted to headerOrg area so long names never overflow)
          Positioned(
            left: DefaultPavtiBookGeometry.headerOrg.x,
            top: DefaultPavtiBookGeometry.headerOrg.y,
            width: DefaultPavtiBookGeometry.headerOrg.width,
            height: DefaultPavtiBookGeometry.headerOrg.height,
            child: ReceiptTypographyConfig.getResolvedFontSize(
                      categoryKey: 'org_name',
                      customTextSizes: template.customTextSizes,
                      globalHeadingSize: template.headingSize,
                      globalBodySize: template.bodySize,
                      globalAmountSize: template.amountSize,
                    ) > 0.0
                ? FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.center,
                    child: Container(
                      constraints: BoxConstraints(
                        maxWidth: DefaultPavtiBookGeometry.headerOrg.width,
                        maxHeight: DefaultPavtiBookGeometry.headerOrg.height,
                      ),
                      child: Text(
                        (organization.name.isEmpty ||
                                organization.name == 'गणपती बाप्पा मोरया')
                            ? (languageCode == 'mr'
                                ? 'आपल्या संस्थेचे नाव'
                                : 'Your Organization Name')
                            : organization.name,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: ReceiptTypographyConfig.getResolvedFontSize(
                            categoryKey: 'org_name',
                            customTextSizes: template.customTextSizes,
                            globalHeadingSize: template.headingSize,
                            globalBodySize: template.bodySize,
                            globalAmountSize: template.amountSize,
                          ),
                          fontWeight: FontWeight.bold,
                          color: maroon,
                          height: 1.1,
                        ),
                      ),
                    ),
                  )
                : const SizedBox.shrink(),
          ),

          // [H] SUBTITLE (Bound to customSubtitleLocal if customized, otherwise fallback)
          Positioned(
            left: DefaultPavtiBookGeometry.headerSubtitle.x,
            top: DefaultPavtiBookGeometry.headerSubtitle.y,
            width: DefaultPavtiBookGeometry.headerSubtitle.width,
            height: DefaultPavtiBookGeometry.headerSubtitle.height,
            child: ReceiptTypographyConfig.getResolvedFontSize(
                      categoryKey: 'subtitle',
                      customTextSizes: template.customTextSizes,
                      globalHeadingSize: template.headingSize,
                      globalBodySize: template.bodySize,
                      globalAmountSize: template.amountSize,
                    ) > 0.0
                ? FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.center,
                    child: Text(
                      (template.customSubtitleLocal != null &&
                              template.customSubtitleLocal!.trim().isNotEmpty)
                          ? template.customSubtitleLocal!
                          : (preset.defaultSubtitleLocal ??
                              _getOrgSubtitle(organization.type, languageCode)),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontSize: ReceiptTypographyConfig.getResolvedFontSize(
                            categoryKey: 'subtitle',
                            customTextSizes: template.customTextSizes,
                            globalHeadingSize: template.headingSize,
                            globalBodySize: template.bodySize,
                            globalAmountSize: template.amountSize,
                          ),
                          color: Colors.black54,
                          fontWeight: FontWeight.w600),
                    ),
                  )
                : const SizedBox.shrink(),
          ),

          // [I] ADDRESS
          Positioned(
            left: DefaultPavtiBookGeometry.headerAddress.x,
            top: DefaultPavtiBookGeometry.headerAddress.y,
            width: DefaultPavtiBookGeometry.headerAddress.width,
            height: DefaultPavtiBookGeometry.headerAddress.height,
            child: () {
              final cachedDisplay = LocationService.getCachedGpsAddress(organization.address);
              if (cachedDisplay.isNotEmpty || (organization.address != null && organization.address!.trim().isNotEmpty)) {
                final displayAddr = cachedDisplay.isNotEmpty ? cachedDisplay : organization.address!.trim();
                String fullAddr = displayAddr;
                if (organization.address != null && organization.address!.trim().isNotEmpty) {
                  final parts = <String>[organization.address!.trim()];
                  if (organization.city != null && organization.city!.trim().isNotEmpty && !organization.address!.contains(organization.city!)) {
                    parts.add(organization.city!.trim());
                  }
                  fullAddr = parts.join(', ');
                  if (organization.pincode != null && organization.pincode!.trim().isNotEmpty && !fullAddr.contains(organization.pincode!)) {
                    fullAddr += ' - ${organization.pincode!.trim()}';
                  }
                }
                return Text(
                  '📍 $fullAddr',
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: DefaultPavtiBookGeometry.fontAddress, color: Colors.black87),
                );
              }
              return FutureBuilder<String>(
                future: LocationService.resolveAddress(organization.address),
                builder: (context, snapshot) {
                  final displayAddr = (snapshot.data != null && snapshot.data!.trim().isNotEmpty)
                      ? snapshot.data!.trim()
                      : LocationService.getCachedGpsAddress(organization.address);

                  if (displayAddr.isEmpty) {
                    final cityPincode = [organization.city, organization.pincode].where((s) => s != null && s.trim().isNotEmpty).join(' - ');
                    if (cityPincode.isEmpty) return const SizedBox.shrink();
                    return Text(
                      '📍 $cityPincode',
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: DefaultPavtiBookGeometry.fontAddress, color: Colors.black87),
                    );
                  }

                  String fullAddr = displayAddr;
                  if (organization.address != null && organization.address!.trim().isNotEmpty) {
                    final parts = <String>[organization.address!.trim()];
                    if (organization.city != null && organization.city!.trim().isNotEmpty && !organization.address!.contains(organization.city!)) {
                      parts.add(organization.city!.trim());
                    }
                    fullAddr = parts.join(', ');
                    if (organization.pincode != null && organization.pincode!.trim().isNotEmpty && !fullAddr.contains(organization.pincode!)) {
                      fullAddr += ' - ${organization.pincode!.trim()}';
                    }
                  }

                  return Text(
                    '📍 $fullAddr',
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: DefaultPavtiBookGeometry.fontAddress, color: Colors.black87),
                  );
                },
              );
            }(),
          ),

          // [J] CONTACT ROW
          Positioned(
            left: DefaultPavtiBookGeometry.headerContact.x,
            top: DefaultPavtiBookGeometry.headerContact.y,
            width: DefaultPavtiBookGeometry.headerContact.width,
            height: DefaultPavtiBookGeometry.headerContact.height,
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (organization.mobile != null &&
                      organization.mobile!.isNotEmpty)
                    Text('📞 +91 ${organization.mobile}  ',
                        style: const TextStyle(
                            fontSize: DefaultPavtiBookGeometry.fontContact, fontWeight: FontWeight.w600)),
                  if (organization.email != null &&
                      organization.email!.isNotEmpty)
                    Text('✉️ ${organization.email}  ',
                        style: const TextStyle(fontSize: DefaultPavtiBookGeometry.fontContact)),
                  const Text('🌐 www.yourorg.org',
                      style: TextStyle(fontSize: DefaultPavtiBookGeometry.fontContact)),
                ],
              ),
            ),
          ),

          // [K] QR CARD
          Positioned(
            left: DefaultPavtiBookGeometry.headerQr.x,
            top: DefaultPavtiBookGeometry.headerQr.y,
            width: DefaultPavtiBookGeometry.headerQr.width,
            height: DefaultPavtiBookGeometry.headerQr.height,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                    color: orange.withValues(alpha: 0.7), width: 2.2),
              ),
              padding:
                  const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('SCAN & VERIFY',
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: orange)),
                  const SizedBox(height: 4),
                  SizedBox(
                    width: 120,
                    height: 120,
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: QrImageView(
                            data: 'https://pavtibook.online/verify/${receipt.qrCodeValue.trim().isNotEmpty ? receipt.qrCodeValue.trim() : receipt.receiptNumber}',
                            version: QrVersions.auto,
                            size: 120,
                            gapless: false,
                            errorCorrectionLevel: QrErrorCorrectLevel.H,
                            eyeStyle: const QrEyeStyle(
                              eyeShape: QrEyeShape.square,
                              color: Colors.black,
                            ),
                            dataModuleStyle: const QrDataModuleStyle(
                              dataModuleShape: QrDataModuleShape.square,
                              color: Colors.black,
                            ),
                            backgroundColor: Colors.white,
                            padding: EdgeInsets.zero,
                          ),
                        ),
                        Positioned(
                          left: 42,
                          top: 42,
                          child: Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(6),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.08),
                                  blurRadius: 2,
                                  spreadRadius: 0.5,
                                ),
                              ],
                            ),
                          ),
                        ),
                        Positioned(
                          left: 46,
                          top: 46,
                          child: SizedBox(
                            width: 28,
                            height: 28,
                            child: Image.asset(
                              'assets/images/Pavati-Book-LogoIcon-Clean.png',
                              fit: BoxFit.contain,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text('UPI / QR',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Colors.black54)),
                ],
              ),
            ),
          ),

          // [L] DONOR SECTION CONTAINER
          Positioned(
            left: DefaultPavtiBookGeometry.donorContainer.x,
            top: DefaultPavtiBookGeometry.donorContainer.y,
            width: DefaultPavtiBookGeometry.donorContainer.width,
            height: DefaultPavtiBookGeometry.donorContainer.height,
            child: Container(
              decoration: BoxDecoration(
                color: cream,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                    color: Colors.amber.shade400, width: 2.0),
              ),
            ),
          ),

          // [P] WATERMARK inside donor card (specifically Pavati-Book-Logo-01(1).png)
          Positioned(
            left: DefaultPavtiBookGeometry.donorContainer.x,
            top: DefaultPavtiBookGeometry.donorContainer.y,
            width: DefaultPavtiBookGeometry.donorContainer.width,
            height: DefaultPavtiBookGeometry.donorContainer.height,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Center(
                child: IgnorePointer(
                  child: Image.asset(
                    'assets/images/Pavati-Book-Logo-01(1).png',
                    width: 580,
                    height: 180,
                    fit: BoxFit.contain,
                    opacity: AlwaysStoppedAnimation(template.watermarkOpacity.clamp(0.0, 1.0)),
                    errorBuilder: (_, __, ___) => Image.asset(
                      'assets/images/Pavati-Book-Logo-01.png',
                      width: 580,
                      height: 180,
                      fit: BoxFit.contain,
                      opacity: AlwaysStoppedAnimation(template.watermarkOpacity.clamp(0.0, 1.0)),
                    ),
                  ),
                ),
              ),
            ),
          ),

          // [M] DONOR TITLE PILL
          Positioned(
            left: DefaultPavtiBookGeometry.donorTitlePill.x,
            top: DefaultPavtiBookGeometry.donorTitlePill.y,
            child: pill(
              labels['donor_details'] ?? 'देणगीदार माहिती',
              orange,
              ReceiptTypographyConfig.getResolvedFontSize(
                categoryKey: 'donor_title',
                customTextSizes: template.customTextSizes,
                globalHeadingSize: template.headingSize,
                globalBodySize: template.bodySize,
                globalAmountSize: template.amountSize,
              ),
              DefaultPavtiBookGeometry.donorTitlePill.width + 20.0,
              DefaultPavtiBookGeometry.donorTitlePill.height,
            ),
          ),

          // [N] DONOR FIELDS
          Positioned(
            left: DefaultPavtiBookGeometry.donorFields.x,
            top: DefaultPavtiBookGeometry.donorFields.y,
            width: DefaultPavtiBookGeometry.donorFields.width,
            height: DefaultPavtiBookGeometry.donorFields.height,
            child: FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.topLeft,
              child: SizedBox(
                width: DefaultPavtiBookGeometry.donorFields.width,
                height: DefaultPavtiBookGeometry.donorFields.height,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    donorRow(labels['donor_name_label'] ?? '👤 नाव :', receipt.donorName ?? 'प्रणय संजीव भोसले'),
                    donorRow(labels['donor_address_label'] ?? '🏠 पत्ता :',
                        receipt.donorAddress ?? 'पुणे, महाराष्ट्र - 411001'),
                    donorRow(labels['donor_mobile_label'] ?? '📞 मोबाईल :',
                        '+91 ${receipt.donorMobile ?? "98765 43210"}'),
                    donorRow(labels['donor_email_label'] ?? '✉️ ईमेल :', 'pranay@example.com'),
                    donorRow(labels['donor_id_label'] ?? '🪪 देणगीदार आयडी :',
                        (receipt.donorId.isNotEmpty) ? receipt.donorId : 'DR-00045'),
                  ],
                ),
              ),
            ),
          ),

          // [O] THANK-YOU STAMP IN EXISTING AUTO-FILL BOX
          Positioned(
            left: DefaultPavtiBookGeometry.donorAutoFill.x,
            top: DefaultPavtiBookGeometry.donorAutoFill.y,
            width: DefaultPavtiBookGeometry.donorAutoFill.width,
            height: DefaultPavtiBookGeometry.donorAutoFill.height,
            child: Center(
              child: Image.asset(
                (languageCode.toLowerCase().trim() == 'en' || languageCode.toLowerCase().trim() == 'english')
                    ? 'assets/images/thank_you_en.png'
                    : 'assets/images/thank_you_mr.png',
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => Container(
                  width: 124,
                  height: 124,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: maroon, width: 2.2),
                    color: Colors.white,
                  ),
                  padding: const EdgeInsets.all(4),
                  child: Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: maroon.withValues(alpha: 0.4), width: 1.2),
                    ),
                    padding: const EdgeInsets.all(6),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'PAVTIBOOK',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: maroon.withValues(alpha: 0.8),
                            letterSpacing: 1.2,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          languageCode == 'en' ? 'Thank You!' : 'धन्यवाद!',
                          style: TextStyle(
                            fontSize: languageCode == 'en' ? 16 : 18,
                            fontWeight: FontWeight.bold,
                            color: maroon,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'VERIFIED',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: maroon.withValues(alpha: 0.7),
                            letterSpacing: 1.0,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          // [Q] GREEN AUTO-NUMBER CARD
          Positioned(
            left: DefaultPavtiBookGeometry.donorStatus.x,
            top: DefaultPavtiBookGeometry.donorStatus.y,
            width: DefaultPavtiBookGeometry.donorStatus.width,
            height: DefaultPavtiBookGeometry.donorStatus.height,
            child: Container(
              decoration: BoxDecoration(
                color: greenBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: greenBorder, width: 1.5),
              ),
              padding: const EdgeInsets.all(10),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.check_circle,
                            size: 20, color: Colors.green.shade700),
                        const SizedBox(width: 6),
                        Text(labels['donor_autonum_title'] ?? 'स्वयंचलित क्रमांक',
                            style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: Colors.green.shade800)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(labels['donor_autonum_sub'] ?? 'तारीख आणि वेळ आधारित',
                        style: TextStyle(
                            fontSize: 13, color: Colors.green.shade900)),
                  ),
                ],
              ),
            ),
          ),

          // [R] DONATION DETAILS TITLE PILL
          Positioned(
            left: DefaultPavtiBookGeometry.donationTitlePill.x,
            top: DefaultPavtiBookGeometry.donationTitlePill.y,
            child: pill(
              labels['donation_details'] ?? 'देणगी तपशील',
              maroon,
              ReceiptTypographyConfig.getResolvedFontSize(
                categoryKey: 'donation_title',
                customTextSizes: template.customTextSizes,
                globalHeadingSize: template.headingSize,
                globalBodySize: template.bodySize,
                globalAmountSize: template.amountSize,
              ),
              DefaultPavtiBookGeometry.donationTitlePill.width + 20.0,
              DefaultPavtiBookGeometry.donationTitlePill.height,
            ),
          ),

          // [S] DONATION TABLE
          Positioned(
            left: DefaultPavtiBookGeometry.donationTable.x,
            top: DefaultPavtiBookGeometry.donationTable.y,
            width: DefaultPavtiBookGeometry.donationTable.width,
            height: DefaultPavtiBookGeometry.donationTable.height,
            child: Table(
              border: TableBorder.all(
                  color: maroon.withValues(alpha: 0.5), width: 1.5),
              columnWidths: const {
                0: FixedColumnWidth(65),
                1: FixedColumnWidth(220),
                2: FixedColumnWidth(220),
                3: FixedColumnWidth(195),
              },
              children: [
                TableRow(
                  decoration: BoxDecoration(color: maroon),
                  children: [
                    tblCell(labels['table_sr_no'] ?? 'अ.क्र.', 17, Colors.white,
                        bold: true, align: TextAlign.center),
                    tblCell(labels['table_details'] ?? 'तपशील', 17, Colors.white,
                        bold: true, align: TextAlign.center),
                    tblCell(labels['table_purpose_dept'] ?? 'उद्देश / विभाग', 17, Colors.white,
                        bold: true, align: TextAlign.center),
                    tblCell(labels['table_amount'] ?? 'रक्कम (₹)', 17, Colors.white,
                        bold: true, align: TextAlign.center),
                  ],
                ),
                TableRow(
                  decoration: const BoxDecoration(color: Colors.white),
                  children: [
                    tblCell('1', 17, Colors.black87,
                        align: TextAlign.center),
                    tblCell(
                        receipt.purpose.isNotEmpty
                            ? receipt.purpose
                            : (labels['table_default_purpose'] ?? 'सामान्य देणगी'),
                        17,
                        Colors.black87),
                    tblCell(labels['table_default_dept'] ?? 'सामान्य कार्य', 17, Colors.black87),
                    tblCell(amountVal.toStringAsFixed(2), 17, Colors.black87,
                        bold: true, align: TextAlign.right),
                  ],
                ),
              ],
            ),
          ),

          // [T] EDIT DETAILS PILL
          Positioned(
            left: DefaultPavtiBookGeometry.editDetailsPill.x,
            top: DefaultPavtiBookGeometry.editDetailsPill.y,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade400),
              ),
              padding:
                  const EdgeInsets.symmetric(horizontal: 18, vertical: 7),
              child: Row(
                children: [
                  const Icon(Icons.edit_outlined, size: 20, color: Colors.black87),
                  const SizedBox(width: 8),
                  Text(
                      labels['edit_details_pill'] ?? 'तपशील संपादित करा  •  अनेक आयटम जोडू शकता',
                      style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.black87)),
                ],
              ),
            ),
          ),

          // [U] AMOUNT SUMMARY BOX
          Positioned(
            left: DefaultPavtiBookGeometry.amountBox.x,
            top: DefaultPavtiBookGeometry.amountBox.y,
            width: DefaultPavtiBookGeometry.amountBox.width,
            height: DefaultPavtiBookGeometry.amountBox.height,
            child: Container(
              decoration: BoxDecoration(
                color: cream,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: maroon, width: 2.0),
              ),
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.topLeft,
                child: SizedBox(
                  width: DefaultPavtiBookGeometry.amountBox.width - 28.0,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.start,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(labels['subtotal'] ?? 'उपएकूण :',
                              style: const TextStyle(
                                  fontSize: 18, color: Colors.black87)),
                          Text(amountVal.toStringAsFixed(2),
                              style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w600)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(labels['discount'] ?? 'सूट :',
                              style: const TextStyle(
                                  fontSize: 18, color: Colors.black87)),
                          const Text('0.00', style: TextStyle(fontSize: 18)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Divider(
                          height: 1,
                          color: maroon.withValues(alpha: 0.4),
                          thickness: 1.5),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Text(labels['total_amount'] ?? 'एकूण रक्कम :',
                              style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: maroon)),
                          Flexible(
                            child: Text(amountFormatted,
                                textAlign: TextAlign.right,
                                style: TextStyle(
                                    fontSize: DefaultPavtiBookGeometry.fontAmountTotal,
                                    fontWeight: FontWeight.bold,
                                    color: maroon)),
                          ),
                        ],
                      ),
                      Builder(
                        builder: (_) {
                          final resolvedAmountWords = AmountToWordsService.convert(receipt.amount, languageCode: languageCode);
                          if (resolvedAmountWords.isEmpty) return const SizedBox.shrink();
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const SizedBox(height: 6),
                              Text(
                                '${labels['amount_in_words_label'] ?? 'रक्कम शब्दात :'}  $resolvedAmountWords',
                                textAlign: TextAlign.right,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                    fontSize: 15,
                                    fontStyle: FontStyle.italic,
                                    color: Colors.black87),
                              ),
                            ],
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // [V] PAYMENT TITLE PILL
          Positioned(
            left: DefaultPavtiBookGeometry.paymentTitlePill.x,
            top: DefaultPavtiBookGeometry.paymentTitlePill.y,
            child: pill(
              labels['payment_method_title'] ?? 'पेमेंट पद्धत',
              maroon,
              ReceiptTypographyConfig.getResolvedFontSize(
                categoryKey: 'payment_title',
                customTextSizes: template.customTextSizes,
                globalHeadingSize: template.headingSize,
                globalBodySize: template.bodySize,
                globalAmountSize: template.amountSize,
              ),
              DefaultPavtiBookGeometry.paymentTitlePill.width + 20.0,
              DefaultPavtiBookGeometry.paymentTitlePill.height,
            ),
          ),

          // [W] PAYMENT METHOD CONTAINER
          Positioned(
            left: DefaultPavtiBookGeometry.paymentContainer.x,
            top: DefaultPavtiBookGeometry.paymentContainer.y,
            width: DefaultPavtiBookGeometry.paymentContainer.width,
            height: DefaultPavtiBookGeometry.paymentContainer.height,
            child: Container(
              decoration: BoxDecoration(
                color: cream,
                borderRadius: BorderRadius.circular(14),
                border:
                    Border.all(color: Colors.grey.shade300, width: 1.5),
              ),
              padding:
                  const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  payChip(labels['pay_cash'] ?? (languageCode == 'en' ? 'Cash' : languageCode == 'hi' ? 'नकद' : 'रोख'), isPay('cash')),
                  payChip('UPI', isPay('upi')),
                  payChip(labels['pay_bank'] ?? (languageCode == 'en' ? 'Bank Transfer' : languageCode == 'hi' ? 'बैंक ट्रांसफर' : 'बँक हस्तांतरण'), isPay('bank')),
                  payChip(labels['pay_cheque'] ?? (languageCode == 'en' ? 'Cheque' : languageCode == 'hi' ? 'चेक' : 'धनादेश'), isPay('cheque')),
                  payChip(labels['pay_other'] ?? (languageCode == 'en' ? 'Etc.' : languageCode == 'hi' ? 'अन्य' : 'इतर'), isPay('other')),
                ],
              ),
            ),
          ),

          // [Y] NOTES BOX
          Positioned(
            left: DefaultPavtiBookGeometry.notesBox.x,
            top: DefaultPavtiBookGeometry.notesBox.y,
            width: DefaultPavtiBookGeometry.notesBox.width,
            height: DefaultPavtiBookGeometry.notesBox.height,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border:
                    Border.all(color: Colors.grey.shade300, width: 1.5),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    height: 28,
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Row(children: [
                        const Icon(Icons.edit_note, size: 22, color: Colors.black87),
                        const SizedBox(width: 6),
                        Text(labels['notes_title'] ?? 'टीप / नोंद',
                            style: TextStyle(
                                fontSize: ReceiptTypographyConfig.getResolvedFontSize(
                                  categoryKey: 'notes_title',
                                  customTextSizes: template.customTextSizes,
                                  globalHeadingSize: template.headingSize,
                                  globalBodySize: template.bodySize,
                                  globalAmountSize: template.amountSize,
                                ),
                                fontWeight: FontWeight.bold,
                                color: Colors.black87)),
                      ]),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(labels['notes_write_opt'] ?? 'टीप लिहा (ऐच्छिक)',
                      style: const TextStyle(fontSize: 14, color: Colors.grey)),
                  Text(labels['notes_thanks_terms'] ?? 'धन्यवाद संदेश / अटी / नोंदी',
                      style:
                          const TextStyle(fontSize: 13, color: Colors.black54)),
                ],
              ),
            ),
          ),

          // [Z] SIGNATURE BOX
          Positioned(
            left: DefaultPavtiBookGeometry.signatureBox.x,
            top: DefaultPavtiBookGeometry.signatureBox.y,
            width: DefaultPavtiBookGeometry.signatureBox.width,
            height: DefaultPavtiBookGeometry.signatureBox.height,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border:
                    Border.all(color: Colors.grey.shade300, width: 1.5),
              ),
              padding: const EdgeInsets.symmetric(
                  horizontal: 8, vertical: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  sigCol(
                    labels['sig_president'] ?? (languageCode == 'en' ? 'President' : 'President / अध्यक्ष'),
                    sigUrl: assets.presidentSignatureUrl,
                    scale: assets.presidentSignatureScale,
                    personName: assets.presidentName,
                  ),
                  sigCol(
                    labels['sig_treasurer'] ?? (languageCode == 'en' ? 'Treasurer' : 'Treasurer / कोषाध्यक्ष'),
                    sigUrl: assets.treasurerSignatureUrl,
                    scale: assets.treasurerSignatureScale,
                    personName: assets.treasurerName,
                  ),
                  sigCol(
                    labels['sig_secretary'] ?? (languageCode == 'en' ? 'Secretary' : 'Secretary / सचिव'),
                    sigUrl: assets.secretarySignatureUrl,
                    scale: assets.secretarySignatureScale,
                    personName: assets.secretaryName,
                  ),
                ],
              ),
            ),
          ),

          // [AD] OFFICIAL STAMP
          Positioned(
            left: DefaultPavtiBookGeometry.stampBox.x,
            top: DefaultPavtiBookGeometry.stampBox.y,
            width: DefaultPavtiBookGeometry.stampBox.width,
            height: DefaultPavtiBookGeometry.stampBox.height,
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Builder(
                    builder: (_) {
                      final double currentScale = template.stampScale.clamp(0.5, 2.0);
                      final double outerSize = (48.0 * currentScale).clamp(28.0, 96.0);
                      final double innerSize = max(18.0, outerSize - 22.0);

                      return Container(
                        width: outerSize,
                        height: outerSize,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: maroon, width: 2.0),
                        ),
                        padding: const EdgeInsets.all(3),
                        child: Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                                color: maroon.withValues(alpha: 0.5), width: 1.2),
                          ),
                          padding: const EdgeInsets.all(4),
                          child: Center(
                            child: (assets.stampUrl != null &&
                                    assets.stampUrl!.isNotEmpty)
                                ? Image.network(
                                    assets.stampUrl!,
                                    width: innerSize,
                                    height: innerSize,
                                    fit: BoxFit.contain,
                                    errorBuilder: (_, __, ___) => Image.asset(
                                      'assets/images/app_icon.png',
                                      width: innerSize,
                                      height: innerSize,
                                      fit: BoxFit.contain,
                                    ),
                                  )
                                : Image.asset(
                                    'assets/images/app_icon.png',
                                    width: innerSize,
                                    height: innerSize,
                                    fit: BoxFit.contain,
                                  ),
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 2),
                  SizedBox(
                    height: 22,
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        labels['official_stamp'] ?? 'अधिकृत शिक्का',
                        style: TextStyle(
                          fontSize: ReceiptTypographyConfig.getResolvedFontSize(
                            categoryKey: 'stamp_label',
                            customTextSizes: template.customTextSizes,
                            globalHeadingSize: template.headingSize,
                            globalBodySize: template.bodySize,
                            globalAmountSize: template.amountSize,
                          ),
                          fontWeight: FontWeight.bold,
                          color: maroon,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // [AE] FOOTER BAR
          Positioned(
            left: DefaultPavtiBookGeometry.footer.x,
            top: DefaultPavtiBookGeometry.footer.y,
            width: DefaultPavtiBookGeometry.footer.width,
            height: DefaultPavtiBookGeometry.footer.height,
            child: ClipRRect(
              borderRadius:
                  const BorderRadius.only(bottomLeft: Radius.circular(14)),
              child: Container(
                color: maroon,
                padding: const EdgeInsets.symmetric(
                    horizontal: 20, vertical: 10),
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(children: [
                        Image.asset(
                          'assets/images/app_icon.png',
                          width: 40,
                          height: 40,
                          fit: BoxFit.contain,
                        ),
                        const SizedBox(width: 8),
                        const Text('PavtiBook',
                            style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 22)),
                        const SizedBox(width: 12),
                        const Text('Digital Trust. Transparent Receipts.',
                            style: TextStyle(
                                color: Colors.white60, fontSize: 16)),
                      ]),
                      Row(children: [
                        ClipOval(
                          child: SizedBox(
                            width: 32,
                            height: 32,
                            child: Image.asset(
                              (languageCode.toLowerCase().trim() == 'en' || languageCode.toLowerCase().trim() == 'english')
                                  ? 'assets/images/thank_you_en.png'
                                  : 'assets/images/thank_you_mr.png',
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                            labels['footer_thankyou'] ?? 'आपल्या अमूल्य देणगीबद्दल मन:पूर्वक धन्यवाद!',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: ReceiptTypographyConfig.getResolvedFontSize(
                                  categoryKey: 'thank_you_msg',
                                  customTextSizes: template.customTextSizes,
                                  globalHeadingSize: template.headingSize,
                                  globalBodySize: template.bodySize,
                                  globalAmountSize: template.amountSize,
                                ),
                                fontWeight: FontWeight.bold)),
                      ]),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // =================================================================
          // ============ RIGHT SIDEBAR CONTENT ================================
          // =================================================================

          // [AF] RECEIPT NUMBER + DATE/TIME BLOCK
          Positioned(
            left: DefaultPavtiBookGeometry.sidebarReceipt.x,
            top: DefaultPavtiBookGeometry.sidebarReceipt.y,
            width: DefaultPavtiBookGeometry.sidebarReceipt.width,
            height: DefaultPavtiBookGeometry.sidebarReceipt.height,
            child: FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.topLeft,
              child: SizedBox(
                width: DefaultPavtiBookGeometry.sidebarReceipt.width,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(labels['receipt_no'] ?? 'पावती क्र.',
                        style: const TextStyle(color: Colors.white70, fontSize: 18)),
                    const SizedBox(height: 4),
                    Text(receipt.receiptNumber,
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: DefaultPavtiBookGeometry.fontSidebarReceiptNo,
                            fontWeight: FontWeight.bold)),
                    const SizedBox(height: 10),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Row(children: [
                        const Icon(Icons.calendar_today,
                            size: 18, color: Colors.white70),
                        const SizedBox(width: 6),
                        Text('${labels['date'] ?? 'दिनांक :'} $dateStr',
                            style: const TextStyle(
                                color: Colors.white, fontSize: 16)),
                      ]),
                    ),
                    const SizedBox(height: 6),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Row(children: [
                        const Icon(Icons.access_time,
                            size: 18, color: Colors.white70),
                        const SizedBox(width: 6),
                        Text('${labels['time'] ?? 'वेळ :'} $timeStr',
                            style: const TextStyle(
                                color: Colors.white, fontSize: 16)),
                      ]),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // [AG] SIDEBAR CONTACT CARD
          Positioned(
            left: DefaultPavtiBookGeometry.sidebarContact.x,
            top: DefaultPavtiBookGeometry.sidebarContact.y,
            width: DefaultPavtiBookGeometry.sidebarContact.width,
            height: DefaultPavtiBookGeometry.sidebarContact.height,
            child: Container(
              decoration: BoxDecoration(
                color: cream,
                borderRadius: BorderRadius.circular(14),
              ),
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    decoration: BoxDecoration(
                        color: maroon,
                        borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 5),
                    child: Text(labels['contact_details'] ?? 'संपर्क तपशील',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(height: 10),
                  const Text('📞 +91 98765 43210',
                      style: TextStyle(
                          fontSize: 16,
                          color: Colors.black87,
                          fontWeight: FontWeight.w600)),
                  const SizedBox(height: 5),
                  const Text('✉️ info@yourorg.org',
                      style:
                          TextStyle(fontSize: 16, color: Colors.black87)),
                  const SizedBox(height: 5),
                  const Text('🌐 www.yourorg.org',
                      style:
                          TextStyle(fontSize: 16, color: Colors.black87)),
                ],
              ),
            ),
          ),

          // [AH] SIDEBAR FEATURES CARD
          Positioned(
            left: DefaultPavtiBookGeometry.sidebarFeatures.x,
            top: DefaultPavtiBookGeometry.sidebarFeatures.y,
            width: DefaultPavtiBookGeometry.sidebarFeatures.width,
            height: DefaultPavtiBookGeometry.sidebarFeatures.height,
            child: Container(
              decoration: BoxDecoration(
                color: cream,
                borderRadius: BorderRadius.circular(14),
              ),
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    decoration: BoxDecoration(
                        color: maroon,
                        borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 5),
                    child: Text(labels['receipt_features_title'] ?? 'पावती वैशिष्ट्ये',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(height: 10),
                  featureRow(labels['feat_receipt_no'] ?? 'पावती क्रमांक'),
                  featureRow(labels['feat_date_time'] ?? 'दिनांक आणि वेळ'),
                  featureRow(labels['feat_donor_info'] ?? 'देणगीदार माहिती'),
                  featureRow(labels['feat_mobile_no'] ?? 'मोबाईल नंबर'),
                  featureRow(labels['feat_email'] ?? 'ईमेल'),
                  featureRow(labels['feat_donation_details'] ?? 'देणगी तपशील'),
                  featureRow(labels['feat_amount_words'] ?? 'रक्कम शब्दात'),
                  featureRow(labels['feat_payment_method'] ?? 'पेमेंट पद्धत'),
                  featureRow(labels['feat_qr_code'] ?? 'QR कोड'),
                  featureRow(labels['feat_signatures'] ?? 'स्वाक्षऱ्या'),
                ],
              ),
            ),
          ),

          // [AI] DIGITAL CARD
          Positioned(
            left: DefaultPavtiBookGeometry.sidebarDigital.x,
            top: DefaultPavtiBookGeometry.sidebarDigital.y,
            width: DefaultPavtiBookGeometry.sidebarDigital.width,
            height: DefaultPavtiBookGeometry.sidebarDigital.height,
            child: Container(
              decoration: BoxDecoration(
                color: cream,
                borderRadius: BorderRadius.circular(14),
              ),
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Text(labels['digital_receipt_title'] ?? 'ही पावती डिजिटल आहे',
                      style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          color: maroon)),
                  const SizedBox(height: 10),
                  Row(children: [
                    const Icon(Icons.verified_user_outlined,
                        size: 26, color: Colors.green),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                          labels['digital_receipt_sub'] ?? 'QR कोड स्कॅन करून पावतीची पडताळणी करा.',
                          style: const TextStyle(
                              fontSize: 15, color: Colors.black87)),
                    ),
                  ]),
                ],
              ),
            ),
          ),

          // [AJ] SIDEBAR FOOTER
          Positioned(
            left: DefaultPavtiBookGeometry.sidebarFooter.x,
            top: DefaultPavtiBookGeometry.sidebarFooter.y,
            width: DefaultPavtiBookGeometry.sidebarFooter.width,
            height: DefaultPavtiBookGeometry.sidebarFooter.height,
            child: const Column(
              children: [
                Text('Powered by PavtiBook',
                    style: TextStyle(color: Colors.white70, fontSize: 15)),
                SizedBox(height: 3),
                Text('www.pavtibook.in',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold)),
              ],
            ),
          ),

        ], // end Stack children
      ),
    );
  }

  // ===========================================================================
  // 2. APPROVED PRESET CARD LAYOUT (Image 3 Spec)
  // ===========================================================================
  Widget _buildPresetCardLayout(
    BuildContext context,
    UniversalReceiptRenderParams params,
  ) {
    final labels = params.localizedLabels;
    final preset = params.preset;
    final primaryColor = params.primaryColor;
    final borderColor = params.borderColor;
    final fontColor = params.fontColor;
    final bgColor = params.backgroundColor;

    final DateTime? parsedCreatedAt = DateTime.tryParse(receipt.createdAt);
    final dateStr = parsedCreatedAt != null
        ? DateFormat('dd/MM/yyyy').format(parsedCreatedAt)
        : (receipt.createdAt.isNotEmpty ? receipt.createdAt : '');
    final timeStr = parsedCreatedAt != null
        ? DateFormat('hh:mm a').format(parsedCreatedAt)
        : '';
    final amountFormatted = '₹ ${receipt.amount.toStringAsFixed(2)}';

    return Card(
      elevation: 6,
      margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      child: Container(
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: borderColor, width: 2.5),
        ),
        padding: const EdgeInsets.all(6.0),
        child: Container(
          decoration: BoxDecoration(
            border: Border.all(color: borderColor.withValues(alpha: 0.5), width: 1.0),
            borderRadius: BorderRadius.circular(4),
          ),
          padding: const EdgeInsets.all(8.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Top Mantra Row
              if (params.headingSymbol != null && params.headingSymbol!.isNotEmpty)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 4.0),
                    child: Text(
                      params.headingSymbol!,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: primaryColor,
                        letterSpacing: 1.1,
                      ),
                    ),
                  ),
                ),

              // Header Section (Preset Icon, Org Name, QR Box)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: primaryColor.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                      border: Border.all(color: primaryColor, width: 1.0),
                    ),
                    child: Center(child: _getPresetIcon(preset.id, primaryColor)),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Text(
                          (organization.name.isEmpty || organization.name == 'गणपती बाप्पा मोरया')
                              ? (preset.defaultOrgTitleLocal ?? preset.defaultOrgTitleEn ?? organization.name)
                              : organization.name,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: template.headingSize.clamp(12.0, 22.0),
                            fontWeight: template.fontWeight == 'normal'
                                ? FontWeight.normal
                                : template.fontWeight == 'medium'
                                    ? FontWeight.w500
                                    : FontWeight.bold,
                            color: fontColor,
                          ),
                        ),
                        const SizedBox(height: 1),
                        Text(
                          template.customSubtitleLocal ??
                              template.customSubtitleEn ??
                              preset.defaultSubtitleLocal ??
                              _getOrgSubtitle(organization.type, languageCode),
                          style: TextStyle(
                            fontSize: (template.bodySize - 1.0).clamp(7.0, 14.0),
                            color: Colors.grey.shade700,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${organization.address}, ${organization.city} - ${organization.pincode}',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: (template.bodySize - 1.5).clamp(7.0, 12.0),
                            color: Colors.grey.shade800,
                          ),
                        ),
                        if (organization.mobile != null && organization.mobile!.isNotEmpty)
                          Text(
                            '📞 +91 ${organization.mobile}',
                            style: TextStyle(
                              fontSize: (template.bodySize - 1.0).clamp(7.0, 12.0),
                              fontWeight: FontWeight.bold,
                              color: fontColor,
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (template.showQrCode) _buildQrBox(receipt, primaryColor),
                ],
              ),

              const SizedBox(height: 6),

              // Ribbon Title Banner
              Center(
                child: Container(
                  decoration: BoxDecoration(
                    color: primaryColor,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                  child: Text(
                    template.headerTextLocal ?? template.headerTextEn ?? preset.receiptTitleBanner ?? labels['receipt_title'] ?? 'देणगी पावती',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: (template.bodySize + 2.0).clamp(10.0, 18.0),
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 8),

              // Metadata Row
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        if (template.showReceiptNumber) ...[
                          Text(
                            '${labels['receipt_no'] ?? 'पावती क्र.'} : ',
                            style: TextStyle(fontSize: template.bodySize, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            receipt.receiptNumber,
                            style: TextStyle(
                              fontSize: template.bodySize,
                              fontWeight: FontWeight.bold,
                              color: primaryColor,
                            ),
                          ),
                          const SizedBox(width: 12),
                        ],
                        if (template.showDate) ...[
                          Text('${labels['date'] ?? 'दिनांक'} : $dateStr',
                              style: TextStyle(fontSize: template.bodySize - 0.5)),
                          const SizedBox(width: 10),
                        ],
                        if (template.showTime)
                          Text('${labels['time'] ?? 'वेळ'} : $timeStr',
                              style: TextStyle(fontSize: template.bodySize - 0.5)),
                      ],
                    ),
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8F5E9),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFF81C784)),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle, size: 10, color: Color(0xFF2E7D32)),
                          const SizedBox(width: 3),
                          Text(
                            labels['auto_generated'] ?? 'स्वयंचलित क्रमांक',
                            style: const TextStyle(
                              fontSize: 8,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF2E7D32),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 8),

              // Details & Amount Row
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 3,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildPillHeader(labels['donor_details'] ?? 'देणगीदार माहिती', primaryColor),
                        const SizedBox(height: 4),
                        if (template.showDonorName)
                          _buildDataRow(labels['name'] ?? 'नाव', receipt.donorName ?? '-'),
                        if (template.showDonorAddress && receipt.donorAddress != null && receipt.donorAddress!.isNotEmpty)
                          _buildDataRow(labels['address'] ?? 'पत्ता', receipt.donorAddress!),
                        if (template.showDonorMobile && receipt.donorMobile != null && receipt.donorMobile!.isNotEmpty)
                          _buildDataRow(labels['mobile'] ?? 'मोबाईल', '+91 ${receipt.donorMobile}'),
                        if (template.showDonorEmail)
                          _buildDataRow('Email', 'donor@example.com'),
                        const SizedBox(height: 6),
                        _buildPillHeader(labels['donation_details'] ?? 'देणगी तपशील', primaryColor),
                        const SizedBox(height: 4),
                        if (template.showPurpose)
                          _buildDataRow(labels['purpose'] ?? 'उद्देश', receipt.purpose),
                        if (template.showPaymentMode)
                          _buildDataRow(labels['payment_mode'] ?? 'पेमेंट पद्धत', _formatPaymentMode(receipt.paymentMode, languageCode)),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (template.showAmount)
                    Expanded(
                      flex: 2,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: primaryColor, width: 1.5),
                        ),
                        padding: const EdgeInsets.all(8),
                        child: Column(
                          children: [
                            Text(
                              labels['total_amount'] ?? 'रक्कम (₹)',
                              style: TextStyle(
                                fontSize: (template.bodySize).clamp(8.0, 14.0),
                                fontWeight: FontWeight.bold,
                                color: primaryColor,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              amountFormatted,
                              style: TextStyle(
                                fontSize: template.amountSize.clamp(14.0, 24.0),
                                fontWeight: FontWeight.bold,
                                color: primaryColor,
                              ),
                            ),
                            if (template.showAmountInWords) ...[
                              Builder(
                                builder: (_) {
                                  final resolvedAmountWords = AmountToWordsService.convert(receipt.amount, languageCode: languageCode);
                                  if (resolvedAmountWords.isEmpty) return const SizedBox.shrink();
                                  return Column(
                                    children: [
                                      const SizedBox(height: 4),
                                      const Divider(height: 1),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${labels['amount_in_words'] ?? 'अक्षरी'} : $resolvedAmountWords',
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          fontSize: (template.bodySize - 1.0).clamp(7.0, 12.0),
                                          fontStyle: FontStyle.italic,
                                        ),
                                      ),
                                    ],
                                  );
                                },
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                ],
              ),

              if (template.showNotes && template.customNote != null && template.customNote!.isNotEmpty) ...[
                const SizedBox(height: 6),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.amber.shade300),
                  ),
                  child: Text(
                    'Note: ${template.customNote}',
                    style: TextStyle(fontSize: (template.bodySize - 1.0).clamp(7.0, 12.0), color: Colors.brown.shade800),
                  ),
                ),
              ],

              const SizedBox(height: 12),

              // Signatures & Official Stamp Row
              if (template.showSignature)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    _buildSigCol(labels['president'] ?? 'अध्यक्ष', primaryColor),
                    _buildSigCol(labels['treasurer'] ?? 'खजिनदार', primaryColor),
                    _buildSigCol(template.signatureLabel, primaryColor),
                    if (template.showStamp) _buildOfficialStamp(primaryColor),
                  ],
                ),

              const SizedBox(height: 8),
              const Divider(height: 1),
              const SizedBox(height: 4),

              // Footer Row
              if (template.showFooter)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      template.footerTextLocal ?? template.footerTextEn ?? params.greetingText ?? 'आपल्या अमूल्य देणगीबद्दल मन:पूर्वक धन्यवाद!',
                      style: TextStyle(
                        fontSize: (template.bodySize - 1.0).clamp(7.0, 12.0),
                        fontWeight: FontWeight.bold,
                        color: primaryColor,
                      ),
                    ),
                    Row(
                      children: [
                        const Text('Powered by ', style: TextStyle(fontSize: 8, color: Colors.grey)),
                        Text(
                          'PavtiBook',
                          style: TextStyle(
                            fontSize: 8.5,
                            fontWeight: FontWeight.bold,
                            color: primaryColor,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _getPresetIcon(String presetId, Color color) {
    switch (presetId) {
      case 'ganesh_mandal':
        return Icon(Icons.temple_hindu, size: 26, color: color);
      case 'mosque_zakat':
        return Icon(Icons.mosque, size: 26, color: color);
      case 'church_donation':
        return Icon(Icons.church, size: 26, color: color);
      case 'buddha_vihar':
        return Icon(Icons.brightness_7, size: 26, color: color);
      case 'gurudwara_seva':
        return Icon(Icons.wb_sunny, size: 26, color: color);
      case 'jain_mandir':
        return Icon(Icons.back_hand, size: 24, color: color);
      case 'ngo_foundation':
        return Icon(Icons.volunteer_activism, size: 26, color: color);
      case 'society_maintenance':
        return Icon(Icons.location_city, size: 26, color: color);
      default:
        return Icon(Icons.verified, size: 26, color: color);
    }
  }

  Widget _buildQrBox(ReceiptModel receipt, Color color) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.grey.shade300),
      ),
      padding: const EdgeInsets.all(6),
      child: Column(
        children: [
          const Text('SCAN TO VERIFY', style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.bold)),
          const SizedBox(height: 3),
          SizedBox(
            width: 64,
            height: 64,
            child: Stack(
              children: [
                Positioned.fill(
                  child: QrImageView(
                    data: 'https://pavtibook.online/verify/${receipt.qrCodeValue.trim().isNotEmpty ? receipt.qrCodeValue.trim() : receipt.receiptNumber}',
                    version: QrVersions.auto,
                    size: 64,
                    gapless: false,
                    errorCorrectionLevel: QrErrorCorrectLevel.H,
                    eyeStyle: QrEyeStyle(
                      eyeShape: QrEyeShape.square,
                      color: color,
                    ),
                    dataModuleStyle: QrDataModuleStyle(
                      dataModuleShape: QrDataModuleShape.square,
                      color: color,
                    ),
                    padding: EdgeInsets.zero,
                  ),
                ),
                Positioned(
                  left: 23,
                  top: 23,
                  child: Container(
                    width: 18,
                    height: 18,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
                Positioned(
                  left: 25,
                  top: 25,
                  child: SizedBox(
                    width: 14,
                    height: 14,
                    child: Image.asset(
                      'assets/images/Pavati-Book-LogoIcon-Clean.png',
                      fit: BoxFit.contain,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 3),
          Text(
            receipt.receiptNumber.split('-').last,
            style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }

  Widget _buildPillHeader(String title, Color color) {
    return Container(
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(10),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      child: Text(
        title,
        style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Colors.white),
      ),
    );
  }

  Widget _buildDataRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 105,
            child: Text('$label :', style: const TextStyle(fontSize: 11.5, color: Colors.black54)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildSigCol(String title, Color color) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 16.0,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 4),
        Container(
          width: 100,
          height: 1.5,
          color: color.withValues(alpha: 0.6),
        ),
        const SizedBox(height: 4),
        Text(
          'स्वाक्षरी',
          style: TextStyle(
            fontSize: 14.0,
            color: color.withValues(alpha: 0.8),
          ),
        ),
      ],
    );
  }

  Widget _buildOfficialStamp(Color color) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: color, width: 1.5),
      ),
      child: Center(
        child: Text(
          'अधिकृत\nशिक्‍का',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 5.5, fontWeight: FontWeight.bold, color: color),
        ),
      ),
    );
  }

  String _getOrgSubtitle(String type, String lang) {
    switch (type) {
      case 'mandal':
        return lang == 'en' ? 'Public Festival Mandal' : 'सार्वजनिक उत्सव मंडळ';
      case 'trust':
        return lang == 'en' ? 'Public Charitable Trust' : 'सार्वजनिक धर्मादाय ट्रस्ट';
      case 'ngo':
        return lang == 'en' ? 'Social Welfare Organization' : 'समाज कल्याण संस्था';
      case 'temple':
        return lang == 'en' ? 'Temple Trust' : 'मंदिर संस्था';
      default:
        return lang == 'en' ? 'Registered Society' : 'धर्म / संस्था / मंडळ / NGO / ट्रस्ट';
    }
  }

  String _formatPaymentMode(String mode, String lang) {
    final m = mode.toLowerCase();
    if (m == 'upi') return 'UPI';
    if (m == 'cash' || m == 'рох') return lang == 'en' ? 'Cash' : 'रोख';
    if (m == 'bank_transfer') return lang == 'en' ? 'Bank Transfer' : 'बँक ट्रान्सफर';
    if (m == 'cheque') return lang == 'en' ? 'Cheque' : 'चेक';
    return mode.toUpperCase();
  }
}
