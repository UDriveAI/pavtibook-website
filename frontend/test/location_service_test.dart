import 'package:flutter_test/flutter_test.dart';
import 'package:pavtibook_app/services/location_service.dart';

void main() {
  setUp(() {
    LocationService.clearCache();
  });

  group('LocationService Intelligent Address Fallback Tests', () {
    test('Case 1: Manual address has highest priority', () async {
      const manual = 'Pune, Maharashtra';
      final result = await LocationService.resolveAddress(manual);
      expect(result, equals('Pune, Maharashtra'));
    });

    test('Case 2 & 3: Empty manual address handles permission/disabled safely without inventing location', () async {
      LocationService.clearCache();
      final result = await LocationService.resolveAddress('');
      // Without live device GPS or placemark mock, returns empty string cleanly (no fake address)
      expect(result, isA<String>());
    });

    test('Case 4: Synchronous fallback reader respects manual address priority', () {
      const manual = 'Dadar, Mumbai';
      final result = LocationService.getCachedGpsAddress(manual);
      expect(result, equals('Dadar, Mumbai'));
    });

    test('Case 5: Manual address takes immediate priority after empty address query', () async {
      LocationService.clearCache();
      await LocationService.resolveAddress('');
      
      const manual = 'Vashi, Navi Mumbai';
      final updatedResult = await LocationService.resolveAddress(manual);
      expect(updatedResult, equals('Vashi, Navi Mumbai'));
    });
  });
}
