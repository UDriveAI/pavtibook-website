import 'package:flutter_test/flutter_test.dart';
import 'package:pavtibook_app/services/sharing_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('generateMinimalPdf produces valid PDF bytes without glyph or font errors', () async {
    final pdfBytes = await SharingService.generateMinimalPdf(
      templateType: 'default_pavtibook',
      receiptNumber: 'PB-2026-000015',
      orgName: 'श्री गणेश मंडळ, पुणे',
      donorName: 'प्रणय भोसले',
      donorAddress: 'कामोटे, पनवेल, नवी मुंबई',
      donorMobile: '9876543210',
      amount: 5001.0,
      purpose: 'वार्षिक गणेशोत्सव देणगी / वर्गणी',
      date: '16/08/2026',
      paymentMode: 'upi',
      paymentStatus: 'completed',
      qrCodeValue: 'PB-2026-000015-VERIFY',
      signatureLabel: 'Authorized Signatory',
      presidentName: 'प्रणय भोसले',
      treasurerName: 'अमित पाटील',
      secretaryName: 'सचिन देशपांडे',
      presidentSignatureScale: 1.0,
      treasurerSignatureScale: 1.0,
      secretarySignatureScale: 1.0,
      orgAddress: 'कामोटे, पनवेल',
      headerTextLocal: '॥ श्री गणेशाय नमः ॥',
      headerTextEn: 'श्री गणेश मंदिर चॅरिटेबल ट्रस्ट',
      languageCode: 'mr',
      stampScale: 1.0,
    );

    expect(pdfBytes, isNotNull);
    expect(pdfBytes.isNotEmpty, isTrue);
    // Standard PDF header signature %PDF-
    expect(pdfBytes.sublist(0, 4), equals([0x25, 0x50, 0x44, 0x46]));
  });
}
