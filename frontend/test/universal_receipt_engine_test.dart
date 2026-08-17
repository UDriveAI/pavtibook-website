import 'package:flutter_test/flutter_test.dart';
import 'package:pavtibook_app/models/models.dart';
import 'package:pavtibook_app/models/receipt_template_preset.dart';
import 'package:pavtibook_app/services/universal_receipt_engine.dart';

void main() {
  group('Phase A: Universal Receipt Engine & Safety Isolation Tests', () {
    final mockOrgA = OrganizationModel(
      id: 'org_ganesh_mandal_123',
      name: 'Shri Ganesh Mitra Mandal',
      type: 'mandal',
      contactPerson: 'Pranay Bhosale',
      mobile: '9876543210',
      email: 'ganesh@example.com',
      address: 'Pune, Maharashtra',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      upiId: 'ganesh@upi',
      isVerified: true,
      subscriptionPlan: 'free_trial',
    );

    final mockOrgB = OrganizationModel(
      id: 'org_mosque_committee_456',
      name: 'Al-Noor Mosque Committee',
      type: 'trust',
      contactPerson: 'Syed Ali',
      mobile: '9876543211',
      email: 'mosque@example.com',
      address: 'Pune, Maharashtra',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      upiId: 'mosque@upi',
      isVerified: true,
      subscriptionPlan: 'free_trial',
    );

    final mockReceipt = ReceiptModel(
      id: 'rec_1001',
      organizationId: 'org_ganesh_mandal_123',
      donorId: 'donor_555',
      receiptNumber: 'PB-2026-000123',
      amount: 1000.0,
      purpose: 'Donation',
      paymentMode: 'cash',
      paymentStatus: 'completed',
      qrCodeValue: 'https://pavtibook.online/v/rec_1001',
      createdAt: '2026-08-09T14:00:00Z',
      donorName: 'Pranay Sanjeev Bhosale',
      donorMobile: '9876543210',
    );

    test('1. Default PavtiBook Preset MUST be 100% Neutral', () {
      final defaultPreset = ReceiptPresetCatalog.defaultPavtiBook;

      expect(defaultPreset.isNeutral, isTrue);
      expect(defaultPreset.headingSymbol, isNull);
      expect(defaultPreset.greetingKey, isNull);
      expect(defaultPreset.footerQuoteKey, isNull);
      expect(defaultPreset.godImageUrl, isNull);

      final pristineTemplate = PresetFactory.createPristineTemplate(
        organizationId: mockOrgA.id,
        preset: defaultPreset,
        org: mockOrgA,
      );

      final params = UniversalReceiptEngine.resolveRenderParams(
        receipt: mockReceipt,
        organization: mockOrgA,
        template: pristineTemplate,
        languageCode: 'mr',
      );

      expect(params.validatePresetIsolation(), isTrue);
      expect(params.headingSymbol, isNull);
      expect(params.greetingText, isNull);
      expect(params.footerQuoteText, isNull);
    });

    test('2. Clean-Base PresetFactory Discards Previous Preset State', () {
      // Create Ganesh template
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
      expect(ganeshParams.headingSymbol, contains('गणेशाय'));

      // Switch to Mosque Preset starting from Clean Base
      final mosquePreset = ReceiptPresetCatalog.mosqueZakat;
      final mosqueTemplate = PresetFactory.createPristineTemplate(
        organizationId: mockOrgB.id,
        preset: mosquePreset,
        org: mockOrgB,
      );

      final mosqueParams = UniversalReceiptEngine.resolveRenderParams(
        receipt: mockReceipt,
        organization: mockOrgB,
        template: mosqueTemplate,
        languageCode: 'mr',
      );

      // Verify ZERO Ganesh assets or symbols leaked into Mosque preset
      expect(mosqueParams.validatePresetIsolation(), isTrue);
      expect(mosqueParams.headingSymbol, contains('الرَّحْمٰنِ'));
      expect(mosqueParams.headingSymbol, isNot(contains('गणेश')));
      expect(mosqueParams.headingSymbol, isNot(contains('ॐ')));
    });

    test('3. Negative Isolation Checks for All Presets', () {
      final presets = ReceiptPresetCatalog.allPresets;
      for (final preset in presets) {
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

        expect(
          params.validatePresetIsolation(),
          isTrue,
          reason: 'Preset ${preset.id} failed negative isolation validation!',
        );
      }
    });

    test('4. Multi-Organization Switch Data Purity', () {
      // Org A: Ganesh Mandal
      final ganeshTemplate = PresetFactory.createPristineTemplate(
        organizationId: mockOrgA.id,
        preset: ReceiptPresetCatalog.ganeshMandal,
        org: mockOrgA,
      );
      final paramsA = UniversalReceiptEngine.resolveRenderParams(
        receipt: mockReceipt,
        organization: mockOrgA,
        template: ganeshTemplate,
        languageCode: 'en',
      );

      expect(paramsA.headingSymbol, contains('गणेशाय'));

      // Org B: Mosque Committee
      final mosqueTemplate = PresetFactory.createPristineTemplate(
        organizationId: mockOrgB.id,
        preset: ReceiptPresetCatalog.mosqueZakat,
        org: mockOrgB,
      );
      final paramsB = UniversalReceiptEngine.resolveRenderParams(
        receipt: mockReceipt,
        organization: mockOrgB,
        template: mosqueTemplate,
        languageCode: 'en',
      );

      expect(paramsB.headingSymbol, contains('الرَّحْمٰنِ'));
      expect(paramsB.headingSymbol!.contains('गणेश'), isFalse);
      expect(paramsB.headingSymbol!.contains('ॐ'), isFalse);
    });

    test('5. Full Switch Sequence: Default -> Ganesh -> Mosque -> Church -> Buddha -> NGO -> Default',
        () {
      final sequence = [
        ReceiptPresetCatalog.defaultPavtiBook,
        ReceiptPresetCatalog.ganeshMandal,
        ReceiptPresetCatalog.mosqueZakat,
        ReceiptPresetCatalog.churchDonation,
        ReceiptPresetCatalog.buddhaVihar,
        ReceiptPresetCatalog.ngoFoundation,
        ReceiptPresetCatalog.defaultPavtiBook,
      ];

      for (final preset in sequence) {
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

        expect(params.validatePresetIsolation(), isTrue);
        if (preset.isNeutral) {
          expect(params.headingSymbol, isNull);
          expect(params.greetingText, isNull);
        }
      }
    });
  });
}
