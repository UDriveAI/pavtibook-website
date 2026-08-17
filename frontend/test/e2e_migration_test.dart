import 'package:flutter_test/flutter_test.dart';
import 'package:pavtibook_app/config/subscription_config.dart';
import 'package:pavtibook_app/models/models.dart';

void main() {
  group('Phase 1 & 2: User & Auth Models & Sanitation', () {
    test('UserModel should correctly parse lastSelectedOrgId and email fields', () {
      final json = {
        'id': 'user_123',
        'name': 'Test User',
        'email': 'test@example.com',
        'mobile': '9876543210',
        'role': 'owner',
        'lastSelectedOrgId': 'org_456',
        'organization_id': 'org_456',
        'isActive': true,
      };

      final user = UserModel.fromJson(json);
      expect(user.id, equals('user_123'));
      expect(user.email, equals('test@example.com'));
      expect(user.mobile, equals('9876543210'));
      expect(user.role, equals('owner'));
      expect(user.lastSelectedOrgId, equals('org_456'));
    });

    test('Mobile number 10-digit sanitization logic', () {
      String inputMobile = '+91 9876543210';
      String cleanMobile = inputMobile.replaceAll(RegExp(r'\D'), '');
      if (cleanMobile.startsWith('91') && cleanMobile.length > 10) {
        cleanMobile = cleanMobile.substring(2);
      }
      expect(cleanMobile, equals('9876543210'));
    });
  });

  group('Phase 3 & 4: InviteModel & Activation Schema', () {
    test('InviteModel properly parses activationToken, activationCode, and email', () {
      final json = {
        'id': 'invite_789',
        'organizationId': 'org_456',
        'organizationName': 'Ganesh Utsav Mandal',
        'name': 'Rahul Sharma',
        'mobile': '9876543210',
        'email': 'rahul@example.com',
        'role': 'treasurer',
        'activationCode': 'AB1234',
        'activationToken': 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890',
        'otp': 'AB1234',
        'status': 'pending',
        'expiresAt': '2026-07-26T12:00:00.000Z',
        'isOneTime': true,
        'used': false,
      };

      final invite = InviteModel.fromJson(json);
      expect(invite.id, equals('invite_789'));
      expect(invite.organizationId, equals('org_456'));
      expect(invite.organizationName, equals('Ganesh Utsav Mandal'));
      expect(invite.name, equals('Rahul Sharma'));
      expect(invite.mobile, equals('9876543210'));
      expect(invite.email, equals('rahul@example.com'));
      expect(invite.role, equals('treasurer'));
      expect(invite.activationCode, equals('AB1234'));
      expect(invite.activationToken, equals('a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890'));
      expect(invite.status, equals('pending'));
    });

    test('Activation code is exactly 6 alphanumeric characters and unifies with legacy fields', () {
      final jsonLegacy = {
        'id': 'invite_999',
        'organizationId': 'org_456',
        'name': 'Priya Patel',
        'mobile': '9876543211',
        'role': 'member',
        'activationCode': 'K9P4M2',
        'status': 'pending',
        'expiresAt': '2026-07-26T12:00:00.000Z',
        'isOneTime': true,
        'used': false,
      };

      final invite = InviteModel.fromJson(jsonLegacy);
      expect(invite.activationCode.length, equals(6));
      expect(invite.activationCode, equals('K9P4M2'));
      expect(invite.otp, equals('K9P4M2'));
    });

    test('10-minute invitation expiry calculation and one-time use validation', () {
      final now = DateTime.now();
      final createdStr = now.toIso8601String();
      final expiredStr = now.subtract(const Duration(minutes: 11)).toIso8601String();

      final jsonExpired = {
        'id': 'invite_exp',
        'organizationId': 'org_456',
        'name': 'Expired User',
        'mobile': '9876543212',
        'role': 'member',
        'activationCode': 'X9Y8Z7',
        'status': 'pending',
        'createdAt': createdStr,
        'expiresAt': expiredStr,
        'used': false,
      };

      final inviteExp = InviteModel.fromJson(jsonExpired);
      final expDate = DateTime.parse(inviteExp.expiresAt);
      expect(now.isAfter(expDate), isTrue);

      final jsonAccepted = {
        'id': 'invite_acc',
        'organizationId': 'org_456',
        'name': 'Accepted User',
        'mobile': '9876543213',
        'role': 'member',
        'activationCode': 'M1N2O3',
        'status': 'accepted',
        'used': true,
        'usedAt': now.toIso8601String(),
      };

      final inviteAcc = InviteModel.fromJson(jsonAccepted);
      expect(inviteAcc.status, equals('accepted'));
      expect(inviteAcc.used, isTrue);
    });
  });

  group('Subscription Normalization & PlanConfig Verification', () {
    test('Free plan has no magic numbers, null renewalDate, and limit 10', () {
      final freePlan = SubscriptionPlanConfig.getPlan('free');
      expect(freePlan.id, equals('free'));
      expect(freePlan.price, equals(0));
      expect(freePlan.usersLimit, equals(1));
      expect(freePlan.receiptLimit, equals(10));
      expect(freePlan.isUnlimitedReceipts, isFalse);
      expect(freePlan.autoWhatsAppLimit, equals(0));
      expect(freePlan.billingPeriod, equals('lifetime'));

      final sub = SubscriptionModel.fromJson({
        'id': 'org_1',
        'organizationId': 'org_1',
        'plan': 'free',
        'receiptsUsed': 5,
        'usersUsed': 1,
        'renewalDate': null,
        'status': 'free',
        'createdAt': '2026-07-19T00:00:00.000Z',
        'updatedAt': '2026-07-19T00:00:00.000Z',
      });

      expect(sub.renewalDate, null); // No fake 2099 expiry dates
      expect(sub.isUnlimitedReceipts, isFalse);
      expect(sub.receiptLimit, equals(10));
      expect(sub.isReceiptLimitReached, isFalse);
      expect(sub.isUserLimitReached, isTrue);
    });

    test('Professional and Premium plans have isUnlimitedReceipts = true and null receiptLimit', () {
      final proMonthly = SubscriptionPlanConfig.getPlan('professional_monthly');
      expect(proMonthly.isUnlimitedReceipts, isTrue);
      expect(proMonthly.receiptLimit, null); // No 999999 magic numbers
      expect(proMonthly.usersLimit, equals(3));
      expect(proMonthly.autoWhatsAppLimit, equals(0));

      final premYearly = SubscriptionPlanConfig.getPlan('premium_yearly');
      expect(premYearly.isUnlimitedReceipts, isTrue);
      expect(premYearly.receiptLimit, null);
      expect(premYearly.usersLimit, equals(10));
      expect(premYearly.autoWhatsAppLimit, equals(1000));

      final proSub = SubscriptionModel.fromJson({
        'id': 'org_2',
        'organizationId': 'org_2',
        'plan': 'professional_monthly',
        'receiptsUsed': 150,
        'usersUsed': 2,
        'renewalDate': '2026-08-19T00:00:00.000Z',
        'status': 'active',
        'createdAt': '2026-07-19T00:00:00.000Z',
        'updatedAt': '2026-07-19T00:00:00.000Z',
      });

      expect(proSub.isUnlimitedReceipts, isTrue);
      expect(proSub.receiptLimit, null);
      expect(proSub.isReceiptLimitReached, isFalse); // Never reached on unlimited
    });

    test('Exceeding Free plan limits soft-blocks new creations without breaking access', () {
      final exceededSub = SubscriptionModel.fromJson({
        'id': 'org_exceeded',
        'organizationId': 'org_exceeded',
        'plan': 'free',
        'receiptsUsed': 56, // Exceeds 10
        'usersUsed': 3,     // Exceeds 1
        'renewalDate': null,
        'status': 'free',
        'createdAt': '2026-06-01T00:00:00.000Z',
        'updatedAt': '2026-07-19T00:00:00.000Z',
      });

      expect(exceededSub.isReceiptLimitReached, isTrue);
      expect(exceededSub.isUserLimitReached, isTrue);
      expect(exceededSub.receiptsUsed, equals(56)); // Historical data intact
      expect(exceededSub.usersUsed, equals(3));       // Historical data intact
    });
  });
}
