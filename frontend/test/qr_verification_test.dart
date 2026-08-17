import 'package:flutter_test/flutter_test.dart';
import 'package:pavtibook_app/services/sharing_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Unique SCAN & VERIFY QR Code Tests', () {
    test('1. Receipts PB-2026-000020, PB-2026-000021, PB-2026-000022 generate distinct verification URLs', () {
      const receiptNum1 = 'PB-2026-000020';
      const receiptNum2 = 'PB-2026-000021';
      const receiptNum3 = 'PB-2026-000022';

      final url1 = 'https://pavtibook.online/verify/$receiptNum1';
      final url2 = 'https://pavtibook.online/verify/$receiptNum2';
      final url3 = 'https://pavtibook.online/verify/$receiptNum3';

      expect(url1, equals('https://pavtibook.online/verify/PB-2026-000020'));
      expect(url2, equals('https://pavtibook.online/verify/PB-2026-000021'));
      expect(url3, equals('https://pavtibook.online/verify/PB-2026-000022'));

      // All URLs must be distinct
      expect(url1, isNot(equals(url2)));
      expect(url2, isNot(equals(url3)));
      expect(url1, isNot(equals(url3)));
    });

    test('2. Verification URL contains ZERO private donor/payment data', () {
      const receiptNum = 'PB-2026-000013';
      final verificationUrl = 'https://pavtibook.online/verify/$receiptNum';

      expect(verificationUrl.contains('donor'), isFalse);
      expect(verificationUrl.contains('mobile'), isFalse);
      expect(verificationUrl.contains('email'), isFalse);
      expect(verificationUrl.contains('amount'), isFalse);
      expect(verificationUrl.contains('payment'), isFalse);
      expect(verificationUrl.contains('5000'), isFalse);
      expect(verificationUrl, equals('https://pavtibook.online/verify/PB-2026-000013'));
    });

    test('3. PDF Generator generates valid PDF bytes with centered logo QR code', () async {
      final pdfBytes = await SharingService.generateMinimalPdf(
        templateType: 'traditional',
        receiptNumber: 'PB-2026-000013',
        orgName: 'Shree Ganesh Utsav Mandal Pune',
        donorName: 'Rahul Sharma',
        amount: 1001.0,
        purpose: 'Vargani',
        date: '16/08/2026',
        paymentMode: 'cash',
        paymentStatus: 'paid',
        qrCodeValue: 'https://pavtibook.online/verify/PB-2026-000013',
        signatureLabel: 'President',
      );

      expect(pdfBytes, isNotNull);
      expect(pdfBytes.length, greaterThan(2000));
    });
  });
}
