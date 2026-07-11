import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocaleProvider extends ChangeNotifier {
  Locale _locale = const Locale('en');

  Locale get locale => _locale;

  LocaleProvider() {
    _loadLocale();
  }

  Future<void> _loadLocale() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final langCode = prefs.getString('language_code') ?? 'en';
      _locale = Locale(langCode);
      notifyListeners();
    } catch (e) {
      debugPrint("Error loading locale: $e");
    }
  }

  Future<void> setLocale(Locale locale) async {
    if (!['en', 'mr', 'hi'].contains(locale.languageCode)) return;
    _locale = locale;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('language_code', locale.languageCode);
    } catch (e) {
      debugPrint("Error saving locale: $e");
    }
  }
}
