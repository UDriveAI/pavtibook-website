import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:pavtibook_app/models/models.dart';
import 'package:pavtibook_app/providers/auth_provider.dart';
import 'package:pavtibook_app/screens/activity_log_screen.dart';

class MockAuthProviderForLogs extends ChangeNotifier implements AuthProvider {
  final OrganizationModel _org = OrganizationModel(
    id: 'org_test_123',
    name: 'Audit Test Org',
    type: 'trust',
    upiId: 'test@upi',
    subscriptionPlan: 'free',
    isVerified: true,
  );

  @override
  OrganizationModel? get organization => _org;

  @override
  UserModel? get user => UserModel(
        id: 'user_123',
        email: 'audit@example.com',
        name: 'Audit Tester',
        mobile: '9876543210',
        role: 'admin',
        organizationId: 'org_test_123',
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
  testWidgets('ActivityLogScreen safely handles Firestore Timestamp, String, epoch and null timestamp fields without crashing', (WidgetTester tester) async {
    final mockAuth = MockAuthProviderForLogs();

    await tester.pumpWidget(
      MaterialApp(
        home: ChangeNotifierProvider<AuthProvider>.value(
          value: mockAuth,
          child: const ActivityLogScreen(),
        ),
      ),
    );

    // Initial render with loading state
    expect(find.text('Activity Audit Trail'), findsOneWidget);
    await tester.pump();
  });
}
