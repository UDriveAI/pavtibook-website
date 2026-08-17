import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';

class LocationService {
  static String? _cachedGpsAddress;
  static bool _isResolving = false;

  /// Returns the resolved organization address for receipt display:
  /// 1. If [manualAddress] is non-empty, returns [manualAddress] immediately.
  /// 2. If [manualAddress] is empty, attempts to reverse-geocode device GPS location
  ///    and format it concisely (e.g. "Kamothe, Panvel").
  /// 3. Returns empty string if permissions denied, GPS disabled, or geocoding fails.
  /// 4. Does NOT auto-save to Firestore or persist location.
  static Future<String> resolveAddress(String? manualAddress) async {
    // 1. MANUAL ADDRESS HAS HIGHEST PRIORITY
    if (manualAddress != null && manualAddress.trim().isNotEmpty) {
      return manualAddress.trim();
    }

    // 2. Return cached GPS address if already resolved
    if (_cachedGpsAddress != null && _cachedGpsAddress!.isNotEmpty) {
      return _cachedGpsAddress!;
    }

    if (_isResolving) {
      return _cachedGpsAddress ?? '';
    }

    _isResolving = true;
    try {
      // Check service availability
      final serviceEnabled = await Geolocator.isLocationServiceEnabled().timeout(
        const Duration(seconds: 2),
        onTimeout: () => false,
      );
      if (!serviceEnabled) {
        _isResolving = false;
        return '';
      }

      // Check / request permission
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          _isResolving = false;
          return '';
        }
      }

      if (permission == LocationPermission.deniedForever) {
        _isResolving = false;
        return '';
      }

      // Fetch position
      Position? position = await Geolocator.getLastKnownPosition();
      position ??= await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.low,
      ).timeout(
        const Duration(seconds: 4),
        onTimeout: () => throw Exception('Location request timed out'),
      );

      if (position != null) {
        final placemarks = await placemarkFromCoordinates(
          position.latitude,
          position.longitude,
        ).timeout(
          const Duration(seconds: 4),
          onTimeout: () => [],
        );

        if (placemarks.isNotEmpty) {
          final p = placemarks.first;
          final parts = <String>[];

          final locality = (p.subLocality != null && p.subLocality!.trim().isNotEmpty)
              ? p.subLocality!.trim()
              : (p.locality != null && p.locality!.trim().isNotEmpty ? p.locality!.trim() : '');

          final city = (p.locality != null && p.locality!.trim().isNotEmpty && p.locality!.trim() != locality)
              ? p.locality!.trim()
              : (p.subAdministrativeArea != null && p.subAdministrativeArea!.trim().isNotEmpty && p.subAdministrativeArea!.trim() != locality
                  ? p.subAdministrativeArea!.trim()
                  : (p.administrativeArea != null && p.administrativeArea!.trim().isNotEmpty && p.administrativeArea!.trim() != locality
                      ? p.administrativeArea!.trim()
                      : ''));

          if (locality.isNotEmpty) parts.add(locality);
          if (city.isNotEmpty) parts.add(city);

          if (parts.isNotEmpty) {
            _cachedGpsAddress = parts.join(', ');
            debugPrint('LocationService: Resolved GPS fallback address: $_cachedGpsAddress');
          }
        }
      }
    } catch (e) {
      debugPrint('LocationService: Failed to resolve GPS location address: $e');
    } finally {
      _isResolving = false;
    }

    return _cachedGpsAddress ?? '';
  }

  /// Synchronous fallback reader for immediate widget builds
  static String getCachedGpsAddress(String? manualAddress) {
    if (manualAddress != null && manualAddress.trim().isNotEmpty) {
      return manualAddress.trim();
    }
    return _cachedGpsAddress ?? '';
  }

  /// Reset cache if needed (e.g., during tests or session change)
  static void clearCache() {
    _cachedGpsAddress = null;
    _isResolving = false;
  }
}
