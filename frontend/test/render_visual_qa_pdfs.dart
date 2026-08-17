import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:pavtibook_app/models/models.dart';
import 'package:pavtibook_app/models/receipt_template_preset.dart';
import 'package:pavtibook_app/services/sharing_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('Generate 8 Production PDF Files for Visual QA (Targets A-H)', () async {
    final outputDir = Directory('qa_pdf_renders');
    if (outputDir.existsSync()) {
      outputDir.deleteSync(recursive: true);
    }
    outputDir.createSync(recursive: true);

    final mockOrgA = OrganizationModel(
      id: 'org_qa_101',
      name: 'PavatiBook Trust & Public Foundation',
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

    final mockOrgMosque = OrganizationModel(
      id: 'org_qa_102',
      name: 'Al-Noor Social Welfare & Zakat Trust',
      type: 'trust',
      contactPerson: 'Imran Shaikh',
      mobile: '9876543211',
      email: 'contact@alnoortrust.org',
      address: 'Camp, Pune, Maharashtra - 411001',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      upiId: 'alnoor@upi',
      isVerified: true,
      subscriptionPlan: 'free_trial',
    );

    final mockOrgGanesh = OrganizationModel(
      id: 'org_qa_103',
      name: 'Shree Ganesh Utsav Mandal Pune',
      type: 'mandal',
      contactPerson: 'Amit Deshmukh',
      mobile: '9876543212',
      email: 'ganesh@mandalpune.org',
      address: 'Sadashiv Peth, Pune, Maharashtra - 411030',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411030',
      upiId: 'ganeshmandal@upi',
      isVerified: true,
      subscriptionPlan: 'free_trial',
    );

    final mockOrgBuddha = OrganizationModel(
      id: 'org_qa_104',
      name: 'Buddha Vihar Sangh Pune',
      type: 'trust',
      contactPerson: 'Upasak Anand',
      mobile: '9876543213',
      email: 'buddha@vihar.org',
      address: 'Shantinagar, Pune, Maharashtra - 411006',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411006',
      upiId: 'buddhavihar@upi',
      isVerified: true,
      subscriptionPlan: 'free_trial',
    );

    final mockReceipt = ReceiptModel(
      id: 'rec_qa_2026_001',
      organizationId: 'org_qa_101',
      donorId: 'donor_qa_01',
      receiptNumber: 'PB-2026-000123',
      amount: 1000.0,
      purpose: 'सामान्य देणगी / योगदान',
      paymentMode: 'upi',
      paymentStatus: 'completed',
      qrCodeValue: 'https://pavtibook.online/v/rec_qa_2026_001',
      createdAt: '2026-08-09T14:30:00Z',
      donorName: 'प्रणय संजीव भोसले',
      donorAddress: 'पुणे, महाराष्ट्र - 411001',
    );

    // A. Default Marathi PDF
    final defaultTemplateMR = PresetFactory.createPristineTemplate(
      organizationId: mockOrgA.id,
      preset: ReceiptPresetCatalog.defaultPavtiBook,
      org: mockOrgA,
    );
    final pdfBytesA = await SharingService.generateMinimalPdf(
      templateType: defaultTemplateMR.type,
      receiptNumber: mockReceipt.receiptNumber,
      orgName: mockOrgA.name,
      donorName: mockReceipt.donorName!,
      amount: mockReceipt.amount,
      purpose: mockReceipt.purpose,
      date: '20 जुलै 2026',
      paymentMode: mockReceipt.paymentMode,
      paymentStatus: mockReceipt.paymentStatus,
      qrCodeValue: mockReceipt.qrCodeValue,
      signatureLabel: 'Authorized Signatory',
      headerTextLocal: defaultTemplateMR.headerTextLocal,
      headerTextEn: defaultTemplateMR.headerTextEn,
    );
    File('qa_pdf_renders/A_default_mr.pdf').writeAsBytesSync(pdfBytesA);

    // B. Default Hindi PDF
    final pdfBytesB = await SharingService.generateMinimalPdf(
      templateType: defaultTemplateMR.type,
      receiptNumber: mockReceipt.receiptNumber,
      orgName: mockOrgA.name,
      donorName: mockReceipt.donorName!,
      amount: mockReceipt.amount,
      purpose: 'सामान्य दान / योगदान',
      date: '20 जुलाई 2026',
      paymentMode: mockReceipt.paymentMode,
      paymentStatus: mockReceipt.paymentStatus,
      qrCodeValue: mockReceipt.qrCodeValue,
      signatureLabel: 'अधिकृत हस्ताक्षरकर्ता',
      headerTextLocal: defaultTemplateMR.headerTextLocal,
      headerTextEn: defaultTemplateMR.headerTextEn,
    );
    File('qa_pdf_renders/B_default_hi.pdf').writeAsBytesSync(pdfBytesB);

    // C. Default English PDF
    final pdfBytesC = await SharingService.generateMinimalPdf(
      templateType: defaultTemplateMR.type,
      receiptNumber: mockReceipt.receiptNumber,
      orgName: mockOrgA.name,
      donorName: 'Pranay Sanjeev Bhosale',
      amount: mockReceipt.amount,
      purpose: 'General Contribution',
      date: '20 July 2026',
      paymentMode: 'UPI',
      paymentStatus: mockReceipt.paymentStatus,
      qrCodeValue: mockReceipt.qrCodeValue,
      signatureLabel: 'Authorized Signatory',
      headerTextLocal: defaultTemplateMR.headerTextLocal,
      headerTextEn: 'PUBLIC CHARITABLE TRUST',
    );
    File('qa_pdf_renders/C_default_en.pdf').writeAsBytesSync(pdfBytesC);

    // D. Ganesh Preset PDF
    final ganeshTemplate = PresetFactory.createPristineTemplate(
      organizationId: mockOrgGanesh.id,
      preset: ReceiptPresetCatalog.ganeshMandal,
      org: mockOrgGanesh,
    );
    final pdfBytesD = await SharingService.generateMinimalPdf(
      templateType: ganeshTemplate.type,
      receiptNumber: 'PB-2026-000124',
      orgName: mockOrgGanesh.name,
      donorName: 'प्रणय संजीव भोसले',
      amount: 1000.0,
      purpose: 'गणेशोत्सव देणगी',
      date: '20 जुलै 2026',
      paymentMode: 'रोख',
      paymentStatus: 'completed',
      qrCodeValue: 'https://pavtibook.online/v/rec_qa_2026_002',
      signatureLabel: 'खजिनदार',
      headerTextLocal: ganeshTemplate.headerTextLocal,
      headerTextEn: ganeshTemplate.headerTextEn,
    );
    File('qa_pdf_renders/D_ganesh_preset.pdf').writeAsBytesSync(pdfBytesD);

    // E. Mosque / Zakat Preset PDF
    final mosqueTemplate = PresetFactory.createPristineTemplate(
      organizationId: mockOrgMosque.id,
      preset: ReceiptPresetCatalog.mosqueZakat,
      org: mockOrgMosque,
    );
    final pdfBytesE = await SharingService.generateMinimalPdf(
      templateType: mosqueTemplate.type,
      receiptNumber: 'PB-2026-000125',
      orgName: mockOrgMosque.name,
      donorName: 'प्रणय संजीव भोसले',
      amount: 2500.0,
      purpose: 'जकात / सदका',
      date: '20 जुलै 2026',
      paymentMode: 'UPI',
      paymentStatus: 'completed',
      qrCodeValue: 'https://pavtibook.online/v/rec_qa_2026_003',
      signatureLabel: 'खजिनदार',
      headerTextLocal: mosqueTemplate.headerTextLocal,
      headerTextEn: mosqueTemplate.headerTextEn,
    );
    File('qa_pdf_renders/E_mosque_zakat_preset.pdf').writeAsBytesSync(pdfBytesE);

    // F. Buddha Vihar Preset PDF
    final buddhaTemplate = PresetFactory.createPristineTemplate(
      organizationId: mockOrgBuddha.id,
      preset: ReceiptPresetCatalog.buddhaVihar,
      org: mockOrgBuddha,
    );
    final pdfBytesF = await SharingService.generateMinimalPdf(
      templateType: buddhaTemplate.type,
      receiptNumber: 'PB-2026-000126',
      orgName: mockOrgBuddha.name,
      donorName: 'प्रणय संजीव भोसले',
      amount: 1000.0,
      purpose: 'बुद्ध विहार विकास निधी',
      date: '20 जुलै 2026',
      paymentMode: 'PhonePe',
      paymentStatus: 'completed',
      qrCodeValue: 'https://pavtibook.online/v/rec_qa_2026_004',
      signatureLabel: 'खजिनदार',
      headerTextLocal: buddhaTemplate.headerTextLocal,
      headerTextEn: buddhaTemplate.headerTextEn,
    );
    File('qa_pdf_renders/F_buddha_vihar_preset.pdf').writeAsBytesSync(pdfBytesF);

    // G. NGO Preset PDF
    final ngoTemplate = PresetFactory.createPristineTemplate(
      organizationId: mockOrgA.id,
      preset: ReceiptPresetCatalog.ngoFoundation,
      org: mockOrgA,
    );
    final pdfBytesG = await SharingService.generateMinimalPdf(
      templateType: ngoTemplate.type,
      receiptNumber: 'PB-2026-000129',
      orgName: 'Helping Hands Foundation',
      donorName: 'Rohan Patil',
      amount: 1000.0,
      purpose: 'Education Support',
      date: '20 July 2026',
      paymentMode: 'UPI',
      paymentStatus: 'completed',
      qrCodeValue: 'https://pavtibook.online/v/rec_qa_2026_005',
      signatureLabel: 'Treasurer',
      headerTextLocal: 'NGO Registration No. MH/12345/2020',
      headerTextEn: 'Social Welfare Organization',
    );
    File('qa_pdf_renders/G_ngo_preset.pdf').writeAsBytesSync(pdfBytesG);

    // H. Customized Receipt PDF
    final pdfBytesH = await SharingService.generateMinimalPdf(
      templateType: defaultTemplateMR.type,
      receiptNumber: 'PB-2026-000130',
      orgName: 'श्री समर्थ सेवा ट्रस्ट',
      donorName: 'प्रणय संजीव भोसले',
      amount: 1500.0,
      purpose: 'समाजसेवा कार्य',
      date: '20 जुलै 2026',
      paymentMode: 'रोख',
      paymentStatus: 'completed',
      qrCodeValue: 'https://pavtibook.online/v/rec_qa_2026_006',
      signatureLabel: 'खजिनदार',
      headerTextLocal: '॥ सर्व भवन्तु सुखिनः ॥',
      headerTextEn: 'सार्वजनिक धर्मादाय ट्रस्ट',
    );
    File('qa_pdf_renders/H_customized_receipt.pdf').writeAsBytesSync(pdfBytesH);

    expect(outputDir.listSync().length, equals(8));
  });
}
