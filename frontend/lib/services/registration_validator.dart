import 'package:cloud_firestore/cloud_firestore.dart';

class RegistrationValidationResult {
  final bool isValid;
  final String? errorMessage;

  RegistrationValidationResult({required this.isValid, this.errorMessage});
}

class RegistrationValidator {
  static Future<RegistrationValidationResult> validate({
    required String email,
    required String mobile,
  }) async {
    try {
      final cleanEmail = email.trim().toLowerCase();
      String cleanMobile = mobile.replaceAll(RegExp(r'\D'), '');
      if (cleanMobile.startsWith('91') && cleanMobile.length > 10) {
        cleanMobile = cleanMobile.substring(2);
      }

      final firestore = FirebaseFirestore.instance;

      // 1. Query Firestore users for email
      final emailQuery = await firestore
          .collection('users')
          .where('email', isEqualTo: cleanEmail)
          .limit(1)
          .get();

      // 2. Query Firestore users for mobile
      final mobileQuery = await firestore
          .collection('users')
          .where('mobile', whereIn: [
            mobile,
            cleanMobile,
            '+91$cleanMobile',
            '+91 $cleanMobile'
          ])
          .limit(1)
          .get();

      final emailExists = emailQuery.docs.isNotEmpty;
      final mobileExists = mobileQuery.docs.isNotEmpty;

      if (emailExists && mobileExists) {
        return RegistrationValidationResult(
          isValid: false,
          errorMessage: 'This account already exists. Please log in.',
        );
      } else if (emailExists) {
        return RegistrationValidationResult(
          isValid: false,
          errorMessage: 'This email is already registered. Please log in.',
        );
      } else if (mobileExists) {
        return RegistrationValidationResult(
          isValid: false,
          errorMessage: 'This mobile number is already registered. Please log in.',
        );
      }

      return RegistrationValidationResult(isValid: true);
    } catch (e) {
      return RegistrationValidationResult(
        isValid: false,
        errorMessage: 'Network error during validation. Please check your connection.',
      );
    }
  }
}
