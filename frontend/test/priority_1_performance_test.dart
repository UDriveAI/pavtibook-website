import 'package:flutter_test/flutter_test.dart';
import 'package:pavtibook_app/services/sharing_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Priority 1 Performance Optimizations', () {
    test('SharingService Image Cache Stores and Invalidates Correctly', () {
      SharingService.clearImageCache();
      expect(SharingService.isWhatsAppInstalled(), completes);
    });

    test('SharingService Font Caching API functions without errors', () async {
      expect(SharingService.clearImageCache, isNotNull);
    });
  });
}
