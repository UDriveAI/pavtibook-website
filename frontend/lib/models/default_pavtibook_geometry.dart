import 'package:flutter/material.dart';

/// Single source of truth for DEFAULT_PAVTIBOOK master geometry (1536 x 1024).
/// All coordinates, sizes, padding, and font sizes are defined in fixed master units.
/// Responsive flex layout inside the receipt is strictly prohibited.
class RectGeo {
  final double x;
  final double y;
  final double width;
  final double height;

  const RectGeo(this.x, this.y, this.width, this.height);
}

class DefaultPavtiBookGeometry {
  // Canvas Dimensions
  static const double masterWidth = 1536.0;
  static const double masterHeight = 1024.0;
  static const double leftPanelWidth = 1189.0;
  static const double sidebarX = 1189.0;
  static const double sidebarWidth = 347.0;

  // Master Colors
  static const Color primaryMaroon = Color(0xFF7A1C1C);
  static const Color accentOrange = Color(0xFFD84315);
  static const Color softCream = Color(0xFFFFFBF0);
  static const Color pageBg = Color(0xFFFFFDF5);
  static const Color greenBg = Color(0xFFE8F5E9);
  static const Color greenBorder = Color(0xFF81C784);
  static const Color greenDark = Color(0xFF2E7D32);
  static const Color amberBorder = Color(0xFFFFD54F);

  // Section Geometry (Master Coordinates: 1536 x 1024)
  // ── HEADER BAND ─────────────────────────────────────────────────────────────
  static const RectGeo greetingLine   = RectGeo(0,    6,   1189, 34);
  static const RectGeo headerLogo     = RectGeo(14,   38,  250,  165);
  static const RectGeo logoTagline    = RectGeo(14,   208, 250,  24);
  static const RectGeo headerOrg      = RectGeo(274,  42,  720,  118);
  static const RectGeo headerSubtitle = RectGeo(274,  162, 720,  28);
  static const RectGeo headerAddress  = RectGeo(274,  192, 720,  24);
  static const RectGeo headerContact  = RectGeo(274,  218, 720,  24);
  static const RectGeo headerQr       = RectGeo(1000, 36,  170,  210);

  // ── DONOR BAND ───────────────────────────────────────────────────────────────
  static const RectGeo donorContainer = RectGeo(12,  248, 1165, 248);
  static const RectGeo donorTitlePill = RectGeo(26,  258,  200,  40);
  static const RectGeo donorFields    = RectGeo(26,  304,  656,  182);
  static const RectGeo donorAutoFill  = RectGeo(694, 300,  244,  150);
  static const RectGeo donorStatus    = RectGeo(948, 262,  212,  120);

  // ── DONATION TABLE BAND ──────────────────────────────────────────────────────
  static const RectGeo donationTitlePill = RectGeo(12,  506, 200, 40);
  static const RectGeo donationTable     = RectGeo(12,  552, 698, 140);
  static const RectGeo editDetailsPill   = RectGeo(12,  700, 390, 42);

  // ── AMOUNT BOX ───────────────────────────────────────────────────────────────
  static const RectGeo amountBox = RectGeo(718, 504, 462, 234);

  // ── PAYMENT BAND ─────────────────────────────────────────────────────────────
  static const RectGeo paymentTitlePill  = RectGeo(12,  752,  180, 38);
  static const RectGeo paymentContainer  = RectGeo(12,  754,  1165, 50); // pill overlaps top

  // ── BOTTOM BAND ──────────────────────────────────────────────────────────────
  static const RectGeo notesBox      = RectGeo(12,  814,  340, 118);
  static const RectGeo signatureBox  = RectGeo(360, 814,  638, 118);
  static const RectGeo stampBox      = RectGeo(1006, 814, 174, 118);

  // ── FOOTER ───────────────────────────────────────────────────────────────────
  static const RectGeo footer = RectGeo(0, 938, 1189, 80);

  // ── RIGHT SIDEBAR ────────────────────────────────────────────────────────────
  static const RectGeo sidebarReceipt  = RectGeo(1204, 20,  318, 184);
  static const RectGeo sidebarContact  = RectGeo(1204, 214, 318, 196);
  static const RectGeo sidebarFeatures = RectGeo(1204, 420, 318, 350);
  static const RectGeo sidebarDigital  = RectGeo(1204, 780, 318, 156);
  static const RectGeo sidebarFooter   = RectGeo(1204, 946, 318, 64);

  // ── FONT HIERARCHY (+2 px for WhatsApp image readability) ─────────────────────
  static const double fontGreeting         = 28.0;   // top greeting strip
  static const double fontOrgTitle         = 74.0;   // org name — primary focal point
  static const double fontSubtitle         = 24.0;   // org subtitle
  static const double fontAddress          = 20.0;   // address line
  static const double fontContact          = 18.0;   // contact row
  static const double fontPills            = 22.0;   // section pill labels
  static const double fontFields           = 20.0;   // donor field values
  static const double fontAmountTotal      = 44.0;   // total amount — very prominent
  static const double fontAmountLabel      = 24.0;   // "एकूण रक्कम" label
  static const double fontAmountSmall      = 22.0;   // subtotal / discount rows
  static const double fontAmountWords      = 19.0;   // words line
  static const double fontTableHeader      = 20.0;   // table header cells
  static const double fontTableBody        = 19.0;   // table body cells
  static const double fontPayChip          = 17.0;   // payment chip label
  static const double fontNotes            = 20.0;   // notes heading
  static const double fontSig              = 19.0;   // signature col title
  static const double fontFooter           = 26.0;   // footer thank-you
  static const double fontSidebarReceiptNo = 36.0;   // receipt number — big & bold
  static const double fontSidebarLabel     = 20.0;   // sidebar date/time labels
  static const double fontSidebarValue     = 19.0;   // sidebar checklist items
  static const double fontSidebarHeading   = 19.0;   // sidebar card headings
}
