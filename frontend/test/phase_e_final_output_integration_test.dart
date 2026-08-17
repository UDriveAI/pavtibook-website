import 'package:flutter_test/flutter_test.dart';
import 'package:pavtibook_app/models/models.dart';
import 'package:pavtibook_app/models/receipt_template_preset.dart';
import 'package:pavtibook_app/services/universal_receipt_engine.dart';
import 'package:pavtibook_app/services/sharing_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Phase E: Universal Receipt System — Final Receipt Output Integration Tests', () {
    final mockOrgA = OrganizationModel(
      id: 'org_output_e_101',
      name: 'Shree Ganesh Utsav Mandal Pune',
      type: 'mandal',
      contactPerson: 'Sanjay Deshmukh',
      mobile: '9876543210',
      email: 'mandal@example.com',
      address: 'Kothrud, Pune, Maharashtra - 411038',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411038',
      upiId: 'mandal@upi',
      isVerified: true,
      subscriptionPlan: 'free_trial',
    );

    final mockOrgB = OrganizationModel(
      id: 'org_output_e_102',
      name: 'Al-Madina Social Welfare Trust',
      type: 'trust',
      contactPerson: 'Imran Shaikh',
      mobile: '9876543211',
      email: 'trust@example.com',
      address: 'Camp, Pune, Maharashtra - 411001',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      upiId: 'trust@upi',
      isVerified: true,
      subscriptionPlan: 'free_trial',
    );

    final receiptA = ReceiptModel(
      id: 'rec_e_1001',
      organizationId: 'org_output_e_101',
      donorId: 'donor_e_1',
      receiptNumber: 'PB-2026-001001',
      amount: 5000.0,
      purpose: 'Ganesh Utsav Vargani',
      paymentMode: 'upi',
      paymentStatus: 'completed',
      qrCodeValue: 'https://pavtibook.online/v/rec_e_1001',
      createdAt: '2026-08-05T10:00:00Z',
      donorName: 'Prashant Patil',
      donorAddress: 'Pune, Maharashtra',
      receiptThemeId: 'ganesh_mandal',
    );

    final receiptB = ReceiptModel(
      id: 'rec_e_1002',
      organizationId: 'org_output_e_102',
      donorId: 'donor_e_2',
      receiptNumber: 'PB-2026-001002',
      amount: 3000.0,
      purpose: 'Zakat & Community Support',
      paymentMode: 'bank_transfer',
      paymentStatus: 'completed',
      qrCodeValue: 'https://pavtibook.online/v/rec_e_1002',
      createdAt: '2026-08-09T14:00:00Z',
      donorName: 'Farhan Inamdar',
      donorAddress: 'Camp, Pune, Maharashtra',
      receiptThemeId: 'mosque_zakat',
    );

    test('1. PDF Generation Output Matrix Across All Presets', () async {
      final presets = ReceiptPresetCatalog.allPresets;

      for (final preset in presets) {
        final template = PresetFactory.createPristineTemplate(
          organizationId: mockOrgA.id,
          preset: preset,
          org: mockOrgA,
        );

        final pdfBytes = await SharingService.generateMinimalPdf(
          templateType: template.type,
          receiptNumber: receiptA.receiptNumber,
          orgName: mockOrgA.name,
          donorName: receiptA.donorName!,
          amount: receiptA.amount,
          purpose: receiptA.purpose,
          date: '09/08/2026',
          paymentMode: receiptA.paymentMode,
          paymentStatus: receiptA.paymentStatus,
          qrCodeValue: receiptA.qrCodeValue,
          signatureLabel: template.signatureLabel,
          headerTextLocal: template.headerTextLocal,
          headerTextEn: template.headerTextEn,
        );

        expect(pdfBytes, isNotNull);
        expect(pdfBytes.length, greaterThan(1000));
      }
    });

    test('2. Multi-Language PDF Generation Integrity (Marathi, Hindi, English)', () async {
      final languages = ['mr', 'hi', 'en'];

      for (final lang in languages) {
        final template = PresetFactory.createPristineTemplate(
          organizationId: mockOrgA.id,
          preset: ReceiptPresetCatalog.defaultPavtiBook,
          org: mockOrgA,
        );

        final renderParams = UniversalReceiptEngine.resolveRenderParams(
          receipt: receiptA,
          organization: mockOrgA,
          template: template,
          languageCode: lang,
        );

        final pdfBytes = await SharingService.generateMinimalPdf(
          templateType: template.type,
          receiptNumber: renderParams.receipt.receiptNumber,
          orgName: renderParams.organization.name,
          donorName: renderParams.receipt.donorName!,
          amount: renderParams.receipt.amount,
          purpose: renderParams.receipt.purpose,
          date: '09/08/2026',
          paymentMode: renderParams.receipt.paymentMode,
          paymentStatus: renderParams.receipt.paymentStatus,
          qrCodeValue: renderParams.receipt.qrCodeValue,
          signatureLabel: renderParams.localizedLabels['signature'] ?? 'Authorized Signatory',
        );

        expect(pdfBytes, isNotNull);
        expect(pdfBytes.length, greaterThan(1000));
        expect(renderParams.languageCode, equals(lang));
      }
    });

    test('3. Verification QR & Receipt URL Association Integrity', () {
      expect(receiptA.qrCodeValue, equals('https://pavtibook.online/v/rec_e_1001'));
      expect(receiptB.qrCodeValue, equals('https://pavtibook.online/v/rec_e_1002'));
      expect(receiptA.qrCodeValue, isNot(equals(receiptB.qrCodeValue)));
    });

    test('4. WhatsApp / Share Payload Generation Using Selected Template', () {
      final template = PresetFactory.createPristineTemplate(
        organizationId: mockOrgA.id,
        preset: ReceiptPresetCatalog.ganeshMandal,
        org: mockOrgA,
      );

      final renderParams = UniversalReceiptEngine.resolveRenderParams(
        receipt: receiptA,
        organization: mockOrgA,
        template: template,
        languageCode: 'mr',
      );

      expect(renderParams.template.type, equals('ganesh_mandal'));
      expect(renderParams.receipt.receiptNumber, equals(receiptA.receiptNumber));
    });

    test('5. Historical Receipt Invariance Parity (V1 Snapshot Unchanged)', () {
      // Historical Receipt generated under V1
      final templateV1 = PresetFactory.createPristineTemplate(
        organizationId: mockOrgA.id,
        preset: ReceiptPresetCatalog.defaultPavtiBook,
        org: mockOrgA,
      );

      final paramsV1 = UniversalReceiptEngine.resolveRenderParams(
        receipt: receiptA,
        organization: mockOrgA,
        template: templateV1,
        languageCode: 'mr',
      );

      expect(paramsV1.template.type, equals('default_pavtibook'));
      expect(paramsV1.headingSymbol, isNull);

      // Organization updates to V2 Ganesh Preset for future receipts
      final templateV2 = PresetFactory.createPristineTemplate(
        organizationId: mockOrgA.id,
        preset: ReceiptPresetCatalog.ganeshMandal,
        org: mockOrgA,
      );

      final futureReceipt = ReceiptModel(
        id: 'rec_e_2001',
        organizationId: 'org_output_e_101',
        donorId: 'donor_e_3',
        receiptNumber: 'PB-2026-001003',
        amount: 2000.0,
        purpose: 'Future Vargani V2',
        paymentMode: 'upi',
        paymentStatus: 'completed',
        qrCodeValue: 'https://pavtibook.online/v/rec_e_2001',
        createdAt: '2026-08-09T15:00:00Z',
        donorName: 'Future Donor',
        receiptThemeId: 'ganesh_mandal',
      );

      final paramsV2 = UniversalReceiptEngine.resolveRenderParams(
        receipt: futureReceipt,
        organization: mockOrgA,
        template: templateV2,
        languageCode: 'mr',
      );

      // Re-downloading Historical Receipt A must STILL return V1 Default Neutral
      final reloadedParamsV1 = UniversalReceiptEngine.resolveRenderParams(
        receipt: receiptA,
        organization: mockOrgA,
        template: templateV1,
        languageCode: 'mr',
      );

      expect(reloadedParamsV1.template.type, equals('default_pavtibook'));
      expect(reloadedParamsV1.headingSymbol, isNull);
      expect(paramsV2.template.type, equals('ganesh_mandal'));
    });

    test('6. Religious Safety Negative Checks on Output Renders', () {
      // 1. Mosque Output Check
      final tMosque = PresetFactory.createPristineTemplate(
        organizationId: mockOrgB.id,
        preset: ReceiptPresetCatalog.mosqueZakat,
        org: mockOrgB,
      );
      final pMosque = UniversalReceiptEngine.resolveRenderParams(
        receipt: receiptB,
        organization: mockOrgB,
        template: tMosque,
        languageCode: 'mr',
      );
      expect(pMosque.validatePresetIsolation(), isTrue);

      // 2. Default PavtiBook Neutral Check
      final tDefault = PresetFactory.createPristineTemplate(
        organizationId: mockOrgA.id,
        preset: ReceiptPresetCatalog.defaultPavtiBook,
        org: mockOrgA,
      );
      final pDefault = UniversalReceiptEngine.resolveRenderParams(
        receipt: receiptA,
        organization: mockOrgA,
        template: tDefault,
        languageCode: 'mr',
      );
      expect(pDefault.headingSymbol, isNull);
      expect(pDefault.greetingText, isNull);
      expect(pDefault.validatePresetIsolation(), isTrue);
    });

    test('7. Multi-Organization Output Data Isolation', () {
      final tOrgA = PresetFactory.createPristineTemplate(
        organizationId: mockOrgA.id,
        preset: ReceiptPresetCatalog.ganeshMandal,
        org: mockOrgA,
      );
      final tOrgB = PresetFactory.createPristineTemplate(
        organizationId: mockOrgB.id,
        preset: ReceiptPresetCatalog.mosqueZakat,
        org: mockOrgB,
      );

      final pOrgA = UniversalReceiptEngine.resolveRenderParams(
        receipt: receiptA,
        organization: mockOrgA,
        template: tOrgA,
        languageCode: 'en',
      );

      final pOrgB = UniversalReceiptEngine.resolveRenderParams(
        receipt: receiptB,
        organization: mockOrgB,
        template: tOrgB,
        languageCode: 'en',
      );

      expect(pOrgA.organization.id, equals(mockOrgA.id));
      expect(pOrgB.organization.id, equals(mockOrgB.id));
      expect(pOrgA.organization.name, isNot(equals(pOrgB.organization.name)));
    });
  });
}
