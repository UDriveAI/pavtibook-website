import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:pavtibook_app/services/sharing_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('Generate actual PDF for PB-2026-000022 with 3-layer logo QR', () async {
    final pdfBytes = await SharingService.generateMinimalPdf(
      templateType: 'traditional',
      receiptNumber: 'PB-2026-000022',
      orgName: 'Shree Ganesh Utsav Mandal Pune',
      donorName: 'Rahul Sharma',
      amount: 5001.0,
      purpose: 'Ganesh Utsav Vargani',
      date: '17/08/2026',
      paymentMode: 'upi',
      paymentStatus: 'paid',
      qrCodeValue: 'https://pavtibook.online/verify/PB-2026-000022',
      signatureLabel: 'President',
    );

    expect(pdfBytes, isNotNull);
    expect(pdfBytes.length, greaterThan(3000));

    final file = File('test_receipt_PB-2026-000022.pdf');
    await file.writeAsBytes(pdfBytes);
    print('Generated test PDF: ${file.path} (${file.lengthSync()} bytes)');
  });
}
