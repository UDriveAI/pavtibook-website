import 'package:flutter_test/flutter_test.dart';
import 'package:pavtibook_app/models/models.dart';
import 'package:pavtibook_app/models/receipt_template_preset.dart';
import 'package:pavtibook_app/services/universal_receipt_engine.dart';

void main() {
  group('Phase C: Type / Event Catalog & Selection Tests', () {
    final mockOrgA = OrganizationModel(
      id: 'org_type_c_101',
      name: 'Shri Ganesh Festival Mandal',
      type: 'mandal',
      contactPerson: 'Amit Patil',
      mobile: '9876543210',
      email: 'mandal@example.com',
      address: 'Pune, Maharashtra',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      upiId: 'mandal@upi',
      isVerified: true,
      subscriptionPlan: 'free_trial',
    );

    final mockOrgB = OrganizationModel(
      id: 'org_type_c_102',
      name: 'Al-Noor Charitable Trust',
      type: 'trust',
      contactPerson: 'Zaid Khan',
      mobile: '9876543211',
      email: 'trust@example.com',
      address: 'Pune, Maharashtra',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      upiId: 'trust@upi',
      isVerified: true,
      subscriptionPlan: 'free_trial',
    );

    final mockReceipt = ReceiptModel(
      id: 'rec_c_9001',
      organizationId: 'org_type_c_101',
      donorId: 'donor_c_1',
      receiptNumber: 'PB-2026-000999',
      amount: 1500.0,
      purpose: 'Festival Sponsorship',
      paymentMode: 'upi',
      paymentStatus: 'completed',
      qrCodeValue: 'https://pavtibook.online/v/rec_c_9001',
      createdAt: '2026-08-09T15:00:00Z',
      donorName: 'Rahul Deshmukh',
    );

    test('1. Every Organization & Event Category Can Be Selected', () {
      final allPresets = ReceiptPresetCatalog.allPresets;
      expect(allPresets.length, greaterThanOrEqualTo(10));

      for (final preset in allPresets) {
        final template = PresetFactory.createPristineTemplate(
          organizationId: mockOrgA.id,
          preset: preset,
          org: mockOrgA,
        );

        final params = UniversalReceiptEngine.resolveRenderParams(
          receipt: mockReceipt,
          organization: mockOrgA,
          template: template,
          languageCode: 'mr',
        );

        expect(params.template.type, equals(preset.id));
        expect(params.validatePresetIsolation(), isTrue);
      }
    });

    test('2. Default Neutral Receipt Can Be Restored Cleanly', () {
      // 1. Select Ganesh Preset
      final ganeshPreset = ReceiptPresetCatalog.ganeshMandal;
      final ganeshTemplate = PresetFactory.createPristineTemplate(
        organizationId: mockOrgA.id,
        preset: ganeshPreset,
        org: mockOrgA,
      );

      final ganeshParams = UniversalReceiptEngine.resolveRenderParams(
        receipt: mockReceipt,
        organization: mockOrgA,
        template: ganeshTemplate,
        languageCode: 'mr',
      );
      expect(ganeshParams.headingSymbol, isNotNull);

      // 2. Restore Default Neutral Preset
      final defaultPreset = ReceiptPresetCatalog.defaultPavtiBook;
      final restoredTemplate = PresetFactory.createPristineTemplate(
        organizationId: mockOrgA.id,
        preset: defaultPreset,
        org: mockOrgA,
      );

      final restoredParams = UniversalReceiptEngine.resolveRenderParams(
        receipt: mockReceipt,
        organization: mockOrgA,
        template: restoredTemplate,
        languageCode: 'mr',
      );

      // Verify ZERO residual Ganesh state
      expect(restoredParams.headingSymbol, isNull);
      expect(restoredParams.greetingText, isNull);
      expect(restoredParams.footerQuoteText, isNull);
      expect(restoredParams.validatePresetIsolation(), isTrue);
    });

    test('3. Default -> Ganesh -> Mosque Isolation Test', () {
      // Step 1: Default
      final t1 = PresetFactory.createPristineTemplate(
        organizationId: mockOrgA.id,
        preset: ReceiptPresetCatalog.defaultPavtiBook,
        org: mockOrgA,
      );
      final p1 = UniversalReceiptEngine.resolveRenderParams(
        receipt: mockReceipt,
        organization: mockOrgA,
        template: t1,
        languageCode: 'mr',
      );
      expect(p1.headingSymbol, isNull);

      // Step 2: Ganesh
      final t2 = PresetFactory.createPristineTemplate(
        organizationId: mockOrgA.id,
        preset: ReceiptPresetCatalog.ganeshMandal,
        org: mockOrgA,
      );
      final p2 = UniversalReceiptEngine.resolveRenderParams(
        receipt: mockReceipt,
        organization: mockOrgA,
        template: t2,
        languageCode: 'mr',
      );
      expect(p2.headingSymbol, contains('गणेशाय'));

      // Step 3: Mosque
      final t3 = PresetFactory.createPristineTemplate(
        organizationId: mockOrgB.id,
        preset: ReceiptPresetCatalog.mosqueZakat,
        org: mockOrgB,
      );
      final p3 = UniversalReceiptEngine.resolveRenderParams(
        receipt: mockReceipt,
        organization: mockOrgB,
        template: t3,
        languageCode: 'mr',
      );

      // Zero Ganesh/Hindu text in Mosque preset
      expect(p3.headingSymbol, contains('الرَّحْمٰنِ'));
      expect(p3.headingSymbol!.contains('गणेश'), isFalse);
      expect(p3.headingSymbol!.contains('ॐ'), isFalse);
      expect(p3.validatePresetIsolation(), isTrue);
    });

    test('4. Default -> Church -> Buddha Vihar Isolation Test', () {
      // Step 1: Church
      final tChurch = PresetFactory.createPristineTemplate(
        organizationId: mockOrgA.id,
        preset: ReceiptPresetCatalog.churchDonation,
        org: mockOrgA,
      );
      final pChurch = UniversalReceiptEngine.resolveRenderParams(
        receipt: mockReceipt,
        organization: mockOrgA,
        template: tChurch,
        languageCode: 'en',
      );
      expect(pChurch.headingSymbol, equals('TO GOD BE THE GLORY'));

      // Step 2: Buddha Vihar
      final tBuddha = PresetFactory.createPristineTemplate(
        organizationId: mockOrgA.id,
        preset: ReceiptPresetCatalog.buddhaVihar,
        org: mockOrgA,
      );
      final pBuddha = UniversalReceiptEngine.resolveRenderParams(
        receipt: mockReceipt,
        organization: mockOrgA,
        template: tBuddha,
        languageCode: 'en',
      );

      // Zero Church/Christian text in Buddha preset
      expect(pBuddha.headingSymbol, contains('बुद्धं'));
      expect(pBuddha.headingSymbol!.contains('GLORY'), isFalse);
      expect(pBuddha.validatePresetIsolation(), isTrue);
    });

    test('5. Default -> NGO Isolation Test', () {
      final tNgo = PresetFactory.createPristineTemplate(
        organizationId: mockOrgA.id,
        preset: ReceiptPresetCatalog.ngoFoundation,
        org: mockOrgA,
      );
      final pNgo = UniversalReceiptEngine.resolveRenderParams(
        receipt: mockReceipt,
        organization: mockOrgA,
        template: tNgo,
        languageCode: 'mr',
      );

      expect(pNgo.preset.isNeutral, isTrue);
      expect(pNgo.headingSymbol, isNull);
      expect(pNgo.greetingText, isNull);
      expect(pNgo.validatePresetIsolation(), isTrue);
    });

    test('6. Language Setting Preserved Intact During Preset Selection', () {
      final languages = ['mr', 'hi', 'en'];

      for (final lang in languages) {
        final template = PresetFactory.createPristineTemplate(
          organizationId: mockOrgA.id,
          preset: ReceiptPresetCatalog.ambedkarJayanti,
          org: mockOrgA,
        );

        final params = UniversalReceiptEngine.resolveRenderParams(
          receipt: mockReceipt,
          organization: mockOrgA,
          template: template,
          languageCode: lang,
        );

        expect(params.languageCode, equals(lang));
        if (lang == 'mr') {
          expect(params.localizedLabels['receipt_title'], equals('देणगी पावती'));
        } else if (lang == 'hi') {
          expect(params.localizedLabels['receipt_title'], equals('दान रसीद'));
        } else if (lang == 'en') {
          expect(params.localizedLabels['receipt_title'], equals('Donation Receipt'));
        }
      }
    });
  });
}
