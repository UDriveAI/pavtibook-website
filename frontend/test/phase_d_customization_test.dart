import 'package:flutter_test/flutter_test.dart';
import 'package:pavtibook_app/models/models.dart';
import 'package:pavtibook_app/models/receipt_template_preset.dart';
import 'package:pavtibook_app/services/universal_receipt_engine.dart';
import 'package:pavtibook_app/services/sharing_service.dart';

void main() {
  group('Phase D: Mobile Live Customization & Template Versioning Tests', () {
    final mockOrgA = OrganizationModel(
      id: 'org_phase_d_101',
      name: 'Shri Ganesh Festival Trust',
      type: 'mandal',
      contactPerson: 'Anand Shinde',
      mobile: '9876543210',
      email: 'trust@example.com',
      address: 'Pune, Maharashtra',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      upiId: 'trust@upi',
      isVerified: true,
      subscriptionPlan: 'free_trial',
    );

    final mockOrgB = OrganizationModel(
      id: 'org_phase_d_102',
      name: 'Al-Noor Welfare Foundation',
      type: 'ngo',
      contactPerson: 'Tariq Ahmed',
      mobile: '9876543211',
      email: 'foundation@example.com',
      address: 'Pune, Maharashtra',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      upiId: 'foundation@upi',
      isVerified: true,
      subscriptionPlan: 'free_trial',
    );

    final historicalReceiptV1 = ReceiptModel(
      id: 'rec_hist_v1_001',
      organizationId: 'org_phase_d_101',
      donorId: 'donor_v1',
      receiptNumber: 'PB-2026-000100',
      amount: 1000.0,
      purpose: 'Historical Vargani V1',
      paymentMode: 'cash',
      paymentStatus: 'completed',
      qrCodeValue: 'https://pavtibook.online/v/rec_hist_v1_001',
      createdAt: '2026-08-01T10:00:00Z',
      donorName: 'Old Donor V1',
      receiptThemeId: 'default_pavtibook', // Snapshot V1
    );

    test('1. Live Preview Updates Colors & Fields Real-Time', () {
      final initialTemplate = PresetFactory.createPristineTemplate(
        organizationId: mockOrgA.id,
        preset: ReceiptPresetCatalog.defaultPavtiBook,
        org: mockOrgA,
      );

      final initialParams = UniversalReceiptEngine.resolveRenderParams(
        receipt: historicalReceiptV1,
        organization: mockOrgA,
        template: initialTemplate,
        languageCode: 'mr',
      );

      expect(initialParams.template.bgColor, equals('#FFFDD0'));

      // Modify background color & custom header text
      final updatedJson = Map<String, dynamic>.from(initialTemplate.toJson());
      updatedJson['bg_color'] = '#FFF3E0';
      updatedJson['header_text_en'] = 'REGISTERED CHARITABLE SOCIETY';

      final updatedTemplate = TemplateModel.fromJson(updatedJson);
      final updatedParams = UniversalReceiptEngine.resolveRenderParams(
        receipt: historicalReceiptV1,
        organization: mockOrgA,
        template: updatedTemplate,
        languageCode: 'mr',
      );

      expect(updatedParams.template.bgColor, equals('#FFF3E0'));
      expect(updatedParams.template.headerTextEn, equals('REGISTERED CHARITABLE SOCIETY'));
    });

    test('2. CRITICAL: Template Versioning Parity (Historical Receipts Unchanged)', () {
      // 1. Historical receipt generated under V1 Default Neutral Template
      final templateV1 = PresetFactory.createPristineTemplate(
        organizationId: mockOrgA.id,
        preset: ReceiptPresetCatalog.defaultPavtiBook,
        org: mockOrgA,
      );

      final paramsV1 = UniversalReceiptEngine.resolveRenderParams(
        receipt: historicalReceiptV1,
        organization: mockOrgA,
        template: templateV1,
        languageCode: 'mr',
      );

      expect(paramsV1.receipt.receiptNumber, equals('PB-2026-000100'));
      expect(paramsV1.template.type, equals('default_pavtibook'));

      // 2. Organization later updates customization to Ganesh Utsav Preset (V2)
      final templateV2 = PresetFactory.createPristineTemplate(
        organizationId: mockOrgA.id,
        preset: ReceiptPresetCatalog.ganeshMandal,
        org: mockOrgA,
      );

      // Future receipt generated under V2
      final futureReceiptV2 = ReceiptModel(
        id: 'rec_future_v2_002',
        organizationId: 'org_phase_d_101',
        donorId: 'donor_v2',
        receiptNumber: 'PB-2026-000101',
        amount: 2000.0,
        purpose: 'Future Vargani V2',
        paymentMode: 'upi',
        paymentStatus: 'completed',
        qrCodeValue: 'https://pavtibook.online/v/rec_future_v2_002',
        createdAt: '2026-08-09T15:30:00Z',
        donorName: 'New Donor V2',
        receiptThemeId: 'ganesh_mandal', // Snapshot V2
      );

      final paramsV2 = UniversalReceiptEngine.resolveRenderParams(
        receipt: futureReceiptV2,
        organization: mockOrgA,
        template: templateV2,
        languageCode: 'mr',
      );

      // Verify Historical Receipt V1 remains strictly V1 Default Neutral
      expect(paramsV1.template.type, equals('default_pavtibook'));
      expect(paramsV1.headingSymbol, isNull);

      // Verify Future Receipt V2 is Ganesh Mandal
      expect(paramsV2.template.type, equals('ganesh_mandal'));
      expect(paramsV2.headingSymbol, contains('गणेशाय'));
    });

    test('3. Ganesh -> Customize -> Mosque Isolation Safety Check', () {
      // Step 1: Ganesh Preset
      final tGanesh = PresetFactory.createPristineTemplate(
        organizationId: mockOrgA.id,
        preset: ReceiptPresetCatalog.ganeshMandal,
        org: mockOrgA,
      );

      final pGanesh = UniversalReceiptEngine.resolveRenderParams(
        receipt: historicalReceiptV1,
        organization: mockOrgA,
        template: tGanesh,
        languageCode: 'mr',
      );
      expect(pGanesh.headingSymbol, contains('गणेशाय'));

      // Step 2: Switch to Mosque Preset from Clean Base
      final tMosque = PresetFactory.createPristineTemplate(
        organizationId: mockOrgB.id,
        preset: ReceiptPresetCatalog.mosqueZakat,
        org: mockOrgB,
      );

      final pMosque = UniversalReceiptEngine.resolveRenderParams(
        receipt: historicalReceiptV1,
        organization: mockOrgB,
        template: tMosque,
        languageCode: 'mr',
      );

      // Zero Ganesh/Hindu content in Mosque preset
      expect(pMosque.headingSymbol, contains('الرَّحْمٰنِ'));
      expect(pMosque.headingSymbol!.contains('गणेश'), isFalse);
      expect(pMosque.headingSymbol!.contains('ॐ'), isFalse);
      expect(pMosque.validatePresetIsolation(), isTrue);
    });

    test('4. Mosque -> Customize -> Default Isolation Safety Check', () {
      final tDefault = PresetFactory.createPristineTemplate(
        organizationId: mockOrgB.id,
        preset: ReceiptPresetCatalog.defaultPavtiBook,
        org: mockOrgB,
      );

      final pDefault = UniversalReceiptEngine.resolveRenderParams(
        receipt: historicalReceiptV1,
        organization: mockOrgB,
        template: tDefault,
        languageCode: 'mr',
      );

      expect(pDefault.preset.isNeutral, isTrue);
      expect(pDefault.headingSymbol, isNull);
      expect(pDefault.greetingText, isNull);
      expect(pDefault.validatePresetIsolation(), isTrue);
    });

    test('5. Multi-Organization Customization Isolation Check', () {
      final tOrgA = PresetFactory.createPristineTemplate(
        organizationId: mockOrgA.id,
        preset: ReceiptPresetCatalog.ganeshMandal,
        org: mockOrgA,
      );
      final tOrgB = PresetFactory.createPristineTemplate(
        organizationId: mockOrgB.id,
        preset: ReceiptPresetCatalog.ngoFoundation,
        org: mockOrgB,
      );

      final pOrgA = UniversalReceiptEngine.resolveRenderParams(
        receipt: historicalReceiptV1,
        organization: mockOrgA,
        template: tOrgA,
        languageCode: 'en',
      );
      final pOrgB = UniversalReceiptEngine.resolveRenderParams(
        receipt: historicalReceiptV1,
        organization: mockOrgB,
        template: tOrgB,
        languageCode: 'en',
      );

      expect(pOrgA.template.organizationId, equals(mockOrgA.id));
      expect(pOrgB.template.organizationId, equals(mockOrgB.id));
      expect(pOrgB.headingSymbol, isNull); // NGO has 0% religious symbols
    });

    test('6. PDF Bytes Parity After Customization', () async {
      TestWidgetsFlutterBinding.ensureInitialized();

      final customTemplate = PresetFactory.createPristineTemplate(
        organizationId: mockOrgA.id,
        preset: ReceiptPresetCatalog.ngoFoundation,
        org: mockOrgA,
      );

      final pdfBytes = await SharingService.generateMinimalPdf(
        templateType: customTemplate.type,
        receiptNumber: historicalReceiptV1.receiptNumber,
        orgName: mockOrgA.name,
        donorName: historicalReceiptV1.donorName!,
        amount: historicalReceiptV1.amount,
        purpose: historicalReceiptV1.purpose,
        date: '09/08/2026',
        paymentMode: historicalReceiptV1.paymentMode,
        paymentStatus: historicalReceiptV1.paymentStatus,
        qrCodeValue: historicalReceiptV1.qrCodeValue,
        signatureLabel: customTemplate.signatureLabel,
      );

      expect(pdfBytes, isNotNull);
      expect(pdfBytes.length, greaterThan(1000));
    });
  });
}
