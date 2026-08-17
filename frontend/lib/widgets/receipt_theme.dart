import 'package:flutter/material.dart';
import '../models/models.dart';

class ReceiptThemePalette {
  final String id;
  final String name;
  final Color primary;
  final Color secondary;
  final Color accent;

  const ReceiptThemePalette({
    required this.id,
    required this.name,
    required this.primary,
    required this.secondary,
    required this.accent,
  });
}

ReceiptThemePalette getThemePalette(
    String? themeId, OrganizationModel org, TemplateModel? template) {
  final String tid =
      (themeId == null || themeId.isEmpty) ? 'maroon_gold' : themeId;

  Color getBrandPrimaryColor() {
    if (template != null && template.borderColor.isNotEmpty) {
      try {
        final hex = template.borderColor.replaceFirst('#', '');
        return Color(int.parse('ff$hex', radix: 16));
      } catch (_) {}
    }
    // Fallback to Maroon Gold if unavailable
    return const Color(0xFF8B1E2D);
  }

  switch (tid) {
    case 'royal_blue':
      return const ReceiptThemePalette(
        id: 'royal_blue',
        name: 'Royal Blue',
        primary: Color(0xFF0D47A1),
        secondary: Color(0xFFFFFFFF),
        accent: Color(0xFF1E88E5),
      );
    case 'emerald_green':
      return const ReceiptThemePalette(
        id: 'emerald_green',
        name: 'Emerald Green',
        primary: Color(0xFF1B5E20),
        secondary: Color(0xFFFFFFFF),
        accent: Color(0xFF43A047),
      );
    case 'maroon_gold':
      return const ReceiptThemePalette(
        id: 'maroon_gold',
        name: 'Maroon Gold',
        primary: Color(0xFF8B1E2D),
        secondary: Color(0xFFFFFEEA),
        accent: Color(0xFFD4AF37),
      );
    case 'navy_gold':
      return const ReceiptThemePalette(
        id: 'navy_gold',
        name: 'Navy Gold',
        primary: Color(0xFF0F172A),
        secondary: Color(0xFFFFFFFF),
        accent: Color(0xFFD4AF37),
      );
    case 'brand_theme':
      final primary = getBrandPrimaryColor();
      return ReceiptThemePalette(
        id: 'brand_theme',
        name: 'Brand Theme',
        primary: primary,
        secondary: const Color(0xFFFFFFFF),
        accent: const Color(0xFFD4AF37),
      );
    case 'traditional_saffron':
      return const ReceiptThemePalette(
        id: 'traditional_saffron',
        name: 'Traditional Saffron',
        primary: Color(0xFFD84315),
        secondary: Color(0xFFFFFFFF),
        accent: Color(0xFF3E2723),
      );
    default:
      return const ReceiptThemePalette(
        id: 'maroon_gold',
        name: 'Maroon Gold',
        primary: Color(0xFF8B1E2D),
        secondary: Color(0xFFFFFEEA),
        accent: Color(0xFFD4AF37),
      );
  }
}
