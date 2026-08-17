import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pavtibook_app/models/models.dart';
import 'package:pavtibook_app/models/receipt_template_preset.dart';
import 'package:pavtibook_app/widgets/traditional_receipt_widget.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Render TraditionalReceiptWidget to PNG artifact', (WidgetTester tester) async {
    final receipt = ReceiptModel(
      id: 'rcpt_123',
      organizationId: 'org_123',
      receiptNumber: 'PB-2026-000027',
      amount: 5001.0,
      purpose: 'Ganesh Utsav Vargani 2026',
      paymentMode: 'UPI / Online',
      paymentStatus: 'completed',
      qrCodeValue: 'https://pavtibook.online/verify/PB-2026-000027',
      createdAt: '2026-08-17T14:25:00',
      donorName: 'Rahul Sharma',
      donorMobile: '9876543210',
      donorAddress: 'Pune, Maharashtra',
      donorId: 'm34MriFNl2I7FigJZ5aR',
      organizationName: 'Shree Ganesh Utsav Mandal',
      organizationLogoUrl: null,
      collectorName: 'Pritam Shinde',
      collectorRole: 'Treasurer',
    );

    final key = GlobalKey();

    final mockOrg = OrganizationModel(
      id: 'org_123',
      name: 'Shree Ganesh Utsav Mandal Pune',
      type: 'temple',
      contactPerson: 'Secretary',
      mobile: '9876543210',
      email: 'info@pavtibook.online',
      address: 'Kothrud, Pune',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411038',
      upiId: 'mandal@upi',
      isVerified: true,
      subscriptionPlan: 'free_trial',
    );

    final mockTemplate = PresetFactory.createPristineTemplate(
      organizationId: mockOrg.id,
      preset: ReceiptPresetCatalog.defaultPavtiBook,
      org: mockOrg,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: RepaintBoundary(
              key: key,
              child: TraditionalReceiptWidget(
                receipt: receipt,
                organization: mockOrg,
                template: mockTemplate,
                languageCode: 'mr',
              ),
            ),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    final boundary = key.currentContext!.findRenderObject() as RenderRepaintBoundary;
    final image = await boundary.toImage(pixelRatio: 2.0);
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    final bytes = byteData!.buffer.asUint8List();

    final outFile = File('test_receipt_widget_render.png');
    await outFile.writeAsBytes(bytes);
    print('Saved widget render to: ${outFile.path} (${bytes.length} bytes)');
  });
}
