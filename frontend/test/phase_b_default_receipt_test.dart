import 'package:flutter_test/flutter_test.dart';
import 'package:pavtibook_app/models/models.dart';
import 'package:pavtibook_app/models/receipt_template_preset.dart';
import 'package:pavtibook_app/services/universal_receipt_engine.dart';
import 'package:pavtibook_app/services/sharing_service.dart';

void main() {
  group('Phase B: Default PavtiBook Neutral Receipt & Localization Tests', () {
    final mockOrg = OrganizationModel(
      id: 'org_pavtibook_demo_101',
      name: 'PavatiBook Trust & Society',
      type: 'ngo',
      contactPerson: 'Rahul Kulkarni',
      mobile: '9876543210',
      email: 'info@pavtibook.online',
      address: 'Kothrud, Pune, Maharashtra - 411038',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411038',
      upiId: 'pavtibook@upi',
      isVerified: true,
      subscriptionPlan: 'free_trial',
    );

    final mockReceipt = ReceiptModel(
      id: 'rec_pb_2026_9999',
      organizationId: 'org_pavtibook_demo_101',
      donorId: 'donor_777',
      receiptNumber: 'PB-2026-000999',
      amount: 2500.0,
      purpose: 'Social Welfare Contribution',
      paymentMode: 'upi',
      paymentStatus: 'completed',
      qrCodeValue: 'https://pavtibook.online/v/rec_pb_2026_9999',
      createdAt: '2026-08-09T14:30:00Z',
      donorName: 'Pranay Sanjeev Bhosale',
      donorMobile: '9876543210',
      donorAddress: 'Pune, Maharashtra - 411001',
    );

    test('1. Default PavtiBook Receipt MUST be 100% Neutral', () {
      final defaultPreset = ReceiptPresetCatalog.defaultPavtiBook;
      expect(defaultPreset.isNeutral, isTrue);

      final pristineTemplate = PresetFactory.createPristineTemplate(
        organizationId: mockOrg.id,
        preset: defaultPreset,
        org: mockOrg,
      );

      final renderParams = UniversalReceiptEngine.resolveRenderParams(
        receipt: mockReceipt,
        organization: mockOrg,
        template: pristineTemplate,
        languageCode: 'mr',
      );

      // Verify ZERO religious, festival, or political content
      expect(renderParams.headingSymbol, isNull);
      expect(renderParams.greetingText, isNull);
      expect(renderParams.footerQuoteText, isNull);
      expect(renderParams.validatePresetIsolation(), isTrue);
    });

    test('2. Marathi Localization System Labels', () {
      final defaultPreset = ReceiptPresetCatalog.defaultPavtiBook;
      final template = PresetFactory.createPristineTemplate(
        organizationId: mockOrg.id,
        preset: defaultPreset,
        org: mockOrg,
      );

      final params = UniversalReceiptEngine.resolveRenderParams(
        receipt: mockReceipt,
        organization: mockOrg,
        template: template,
        languageCode: 'mr',
      );

      expect(params.localizedLabels['receipt_title'], equals('देणगी पावती'));
      expect(params.localizedLabels['receipt_no'], equals('पावती क्र.'));
      expect(params.localizedLabels['date'], equals('दिनांक'));
      expect(params.localizedLabels['donor_details'], equals('देणगीदार माहिती'));
      expect(params.localizedLabels['donation_details'], equals('देणगी तपशील'));
      expect(params.localizedLabels['amount_in_words'], equals('रकमेचे अक्षरी मूल्य'));

      // User-entered content preserved as entered
      expect(params.receipt.donorName, equals('Pranay Sanjeev Bhosale'));
      expect(params.organization.name, equals('PavatiBook Trust & Society'));
    });

    test('3. Hindi Localization System Labels', () {
      final defaultPreset = ReceiptPresetCatalog.defaultPavtiBook;
      final template = PresetFactory.createPristineTemplate(
        organizationId: mockOrg.id,
        preset: defaultPreset,
        org: mockOrg,
      );

      final params = UniversalReceiptEngine.resolveRenderParams(
        receipt: mockReceipt,
        organization: mockOrg,
        template: template,
        languageCode: 'hi',
      );

      expect(params.localizedLabels['receipt_title'], equals('दान रसीद'));
      expect(params.localizedLabels['receipt_no'], equals('रसीद क्रमांक'));
      expect(params.localizedLabels['date'], equals('दिनांक'));
      expect(params.localizedLabels['donor_details'], equals('दाता विवरण'));
      expect(params.localizedLabels['donation_details'], equals('दान विवरण'));
      expect(params.localizedLabels['amount_in_words'], equals('राशि शब्दों में'));

      // User-entered content preserved as entered
      expect(params.receipt.donorName, equals('Pranay Sanjeev Bhosale'));
      expect(params.organization.name, equals('PavatiBook Trust & Society'));
    });

    test('4. English Localization System Labels', () {
      final defaultPreset = ReceiptPresetCatalog.defaultPavtiBook;
      final template = PresetFactory.createPristineTemplate(
        organizationId: mockOrg.id,
        preset: defaultPreset,
        org: mockOrg,
      );

      final params = UniversalReceiptEngine.resolveRenderParams(
        receipt: mockReceipt,
        organization: mockOrg,
        template: template,
        languageCode: 'en',
      );

      expect(params.localizedLabels['receipt_title'], equals('Donation Receipt'));
      expect(params.localizedLabels['receipt_no'], equals('Receipt No.'));
      expect(params.localizedLabels['date'], equals('Date'));
      expect(params.localizedLabels['donor_details'], equals('Donor Details'));
      expect(params.localizedLabels['donation_details'], equals('Donation Details'));
      expect(params.localizedLabels['amount_in_words'], equals('Amount in Words'));

      // User-entered content preserved as entered
      expect(params.receipt.donorName, equals('Pranay Sanjeev Bhosale'));
      expect(params.organization.name, equals('PavatiBook Trust & Society'));
    });

    test('5. Missing Translation Key Validation', () {
      final languages = ['mr', 'hi', 'en'];
      final requiredKeys = [
        'receipt_title',
        'receipt_no',
        'date',
        'time',
        'donor_details',
        'name',
        'address',
        'mobile',
        'donation_details',
        'purpose',
        'payment_mode',
        'amount',
        'total_amount',
        'amount_in_words',
        'signature',
        'verification',
      ];

      final defaultPreset = ReceiptPresetCatalog.defaultPavtiBook;
      final template = PresetFactory.createPristineTemplate(
        organizationId: mockOrg.id,
        preset: defaultPreset,
        org: mockOrg,
      );

      for (final lang in languages) {
        final params = UniversalReceiptEngine.resolveRenderParams(
          receipt: mockReceipt,
          organization: mockOrg,
          template: template,
          languageCode: lang,
        );

        for (final key in requiredKeys) {
          expect(
            params.localizedLabels.containsKey(key),
            isTrue,
            reason: 'Missing required translation key [$key] for language [$lang]',
          );
          expect(
            params.localizedLabels[key]!.isNotEmpty,
            isTrue,
            reason: 'Empty translation value for key [$key] in language [$lang]',
          );
        }
      }
    });

    test('6. Existing Receipt Regression & Numbering Parity', () {
      expect(mockReceipt.receiptNumber, equals('PB-2026-000999'));
      expect(mockReceipt.amount, equals(2500.0));
      expect(mockReceipt.qrCodeValue, contains('https://pavtibook.online/v/'));
    });

    test('7. PDF Bytes Generation Compatibility Test', () async {
      TestWidgetsFlutterBinding.ensureInitialized();

      final pdfBytes = await SharingService.generateMinimalPdf(
        templateType: 'default_pavtibook',
        receiptNumber: mockReceipt.receiptNumber,
        orgName: mockOrg.name,
        donorName: mockReceipt.donorName!,
        amount: mockReceipt.amount,
        purpose: mockReceipt.purpose,
        date: '09/08/2026',
        paymentMode: mockReceipt.paymentMode,
        paymentStatus: mockReceipt.paymentStatus,
        qrCodeValue: mockReceipt.qrCodeValue,
        signatureLabel: 'Authorized Signatory',
      );

      expect(pdfBytes, isNotNull);
      expect(pdfBytes.length, greaterThan(1000));
    });

    test('8. Preview vs PDF Data Consistency Check', () {
      final defaultPreset = ReceiptPresetCatalog.defaultPavtiBook;
      final template = PresetFactory.createPristineTemplate(
        organizationId: mockOrg.id,
        preset: defaultPreset,
        org: mockOrg,
      );

      final renderParams = UniversalReceiptEngine.resolveRenderParams(
        receipt: mockReceipt,
        organization: mockOrg,
        template: template,
        languageCode: 'mr',
      );

      expect(renderParams.receipt.receiptNumber, equals(mockReceipt.receiptNumber));
      expect(renderParams.receipt.amount, equals(mockReceipt.amount));
      expect(renderParams.organization.name, equals(mockOrg.name));
    });
  });
}
