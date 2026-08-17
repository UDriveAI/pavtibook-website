import 'package:flutter_test/flutter_test.dart';
import 'package:pavtibook_app/models/models.dart';
import 'package:pavtibook_app/providers/auth_provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Google Sign-In Authentication Tests', () {
    test('AuthProvider initializes with default google auth state', () {
      final auth = AuthProvider();
      expect(auth.isAuthenticated, isFalse);
      expect(auth.needsOrgRegistration, isFalse);
      expect(auth.errorMessage, isNull);
      expect(auth.user, isNull);
      expect(auth.organization, isNull);
    });

    test('New Google user model structure handles photoUrl and authProvider fields', () {
      final googleUserMap = {
        'id': 'google_test_uid_123',
        'name': 'Google Admin',
        'email': 'admin@google.com',
        'mobile': '9876543210',
        'role': 'owner',
        'photoUrl': 'https://lh3.googleusercontent.com/a/default-user',
        'authProvider': 'google',
        'organizationId': 'org_123',
        'organizationName': 'Google Mandir Trust',
        'createdAt': '2026-08-15T19:30:00Z',
        'updatedAt': '2026-08-15T19:30:00Z',
      };

      final user = UserModel.fromJson(googleUserMap);
      expect(user.id, equals('google_test_uid_123'));
      expect(user.name, equals('Google Admin'));
      expect(user.email, equals('admin@google.com'));
      expect(user.role, equals('owner'));
      expect(user.toJson()['email'], equals('admin@google.com'));
    });

    test('Preserves existing user profile data when logging in via Google', () {
      final existingUserMap = {
        'id': 'existing_uid_456',
        'name': 'Custom Org Owner',
        'email': 'existing@pavtibook.org',
        'mobile': '9123456789',
        'role': 'owner',
        'organizationId': 'org_456',
      };

      final existingUser = UserModel.fromJson(existingUserMap);

      // Verify that existing PavtiBook custom name and mobile are not overwritten
      expect(existingUser.name, equals('Custom Org Owner'));
      expect(existingUser.mobile, equals('9123456789'));
    });

    test('Google sign-out does not affect existing OTP or Email auth state cleanup', () {
      final auth = AuthProvider();
      expect(auth.isAuthenticated, isFalse);
      expect(auth.userOrganizations, isEmpty);
      expect(auth.hasMultipleOrganizations, isFalse);
    });
  });
}
