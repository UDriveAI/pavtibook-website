import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:pavtibook_app/models/models.dart';
import 'package:pavtibook_app/providers/auth_provider.dart';
import 'package:pavtibook_app/providers/data_providers.dart';
import 'package:pavtibook_app/screens/receipt_customize_screen.dart';

class MockAuthForCustomization extends ChangeNotifier implements AuthProvider {
  final OrganizationModel _org = OrganizationModel(
    id: 'org_test_123',
    name: 'Preview Isolation Test Org',
    type: 'trust',
    upiId: 'test@upi',
    subscriptionPlan: 'free',
    isVerified: true,
  );

  @override
  OrganizationModel? get organization => _org;

  @override
  bool get isAuthenticated => true;

  @override
  bool get isLoading => false;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class MockTemplateProvider extends ChangeNotifier implements TemplateProvider {
  @override
  List<TemplateModel> get templates => [];

  @override
  Future<void> fetchTemplates({bool forceRefresh = false}) async {}

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  testWidgets('ReceiptCustomizeScreen renders live preview without throwing rebuild exceptions', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1400, 3600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final originalOnError = FlutterError.onError;
    FlutterError.onError = (FlutterErrorDetails details) {
      if (details.exception.toString().contains('overflowed')) return;
      originalOnError?.call(details);
    };
    addTearDown(() => FlutterError.onError = originalOnError);

    final mockAuth = MockAuthForCustomization();
    final mockTp = MockTemplateProvider();

    await tester.pumpWidget(
      MaterialApp(
        home: MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: mockAuth),
            ChangeNotifierProvider<TemplateProvider>.value(value: mockTp),
          ],
          child: const ReceiptCustomizeScreen(),
        ),
      ),
    );

    await tester.pump(const Duration(milliseconds: 100));
    await tester.pumpAndSettle();

    expect(find.text('Receipt Customization'), findsOneWidget);
    expect(find.text('Live Preview'), findsOneWidget);
    expect(find.text('DEFAULT PAVTIBOOK'), findsAtLeastNWidgets(1));

    await tester.pumpWidget(const SizedBox());
    await tester.pump(const Duration(seconds: 5));
  });
}
