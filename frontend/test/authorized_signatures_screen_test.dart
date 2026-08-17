import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:pavtibook_app/models/models.dart';
import 'package:pavtibook_app/providers/auth_provider.dart';
import 'package:pavtibook_app/screens/settings_subpages.dart';

class MockAuthProvider extends ChangeNotifier implements AuthProvider {
  final OrganizationModel _org = OrganizationModel(
    id: 'test_org',
    name: 'Test Org',
    type: 'trust',
    upiId: 'test@upi',
    subscriptionPlan: 'free',
    isVerified: true,
    presidentName: 'Pranay Bhosale',
    treasurerName: 'Asha Dhasal',
    secretaryName: 'Nikhil Bhosale',
    presidentSignatureUrl: 'https://example.com/pres.png',
    treasurerSignatureUrl: 'https://example.com/treas.png',
    secretarySignatureUrl: 'https://example.com/sec.png',
    presidentSignatureScale: 1.0,
    treasurerSignatureScale: 1.0,
    secretarySignatureScale: 1.0,
  );

  @override
  OrganizationModel? get organization => _org;

  @override
  UserModel? get user => UserModel(
        id: 'u1',
        email: 'test@example.com',
        name: 'User',
        mobile: '9876543210',
        role: 'admin',
        organizationId: 'test_org',
        isActive: true,
      );

  @override
  bool get isAuthenticated => true;

  @override
  bool get isLoading => false;

  @override
  Future<void> reloadProfile() async {}

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  testWidgets('AuthorizedSignaturesScreen renders President, Treasurer and Secretary with unified Name, Signature & Scale controls', (WidgetTester tester) async {
    final mockAuth = MockAuthProvider();

    await tester.pumpWidget(
      MaterialApp(
        home: ChangeNotifierProvider<AuthProvider>.value(
          value: mockAuth,
          child: const AuthorizedSignaturesScreen(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify Title and Subtitle
    expect(find.text('Authorized Persons'), findsOneWidget);
    expect(find.text('Manage Authorized Persons & Signatures'), findsOneWidget);

    // Verify 3 Roles are present
    expect(find.text('President'), findsOneWidget);
    expect(find.text('Treasurer'), findsOneWidget);
    expect(find.text('Secretary'), findsOneWidget);

    // Verify Person Names loaded
    expect(find.text('Pranay Bhosale'), findsOneWidget);
    expect(find.text('Asha Dhasal'), findsOneWidget);
    expect(find.text('Nikhil Bhosale'), findsOneWidget);

    // Verify Signature Sizes loaded (3 widgets showing 100%)
    expect(find.text('100%'), findsNWidgets(3));

    // Verify Save Button present
    expect(find.text('Save All Changes'), findsOneWidget);
  });
}
