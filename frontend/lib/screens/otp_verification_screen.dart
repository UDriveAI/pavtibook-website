import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class OtpVerificationScreen extends StatefulWidget {
  const OtpVerificationScreen({super.key});

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  final _otpController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _handleVerify(String mobile) async {
    if (!_formKey.currentState!.validate()) return;

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.verifyOtp(mobile, _otpController.text.trim());

    if (success && mounted) {
      // Clear routes and go directly to dashboard
      Navigator.pushNamedAndRemoveUntil(
          context, '/dashboard', (route) => false);
    } else if (mounted) {
      final errMsg = auth.errorMessage ?? '';
      if (errMsg.startsWith('linking-required:')) {
        final email = errMsg.substring('linking-required:'.length);
        _showLinkingPasswordDialog(context, auth, email);
      } else if (errMsg.startsWith('invite-verification-required:')) {
        final inviteMobile = errMsg.substring('invite-verification-required:'.length);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Verification successful. Please enter your invite code to join.'),
            backgroundColor: Colors.blue,
          ),
        );
        Navigator.pushReplacementNamed(
          context,
          '/join-organization',
          arguments: inviteMobile,
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(errMsg.isEmpty ? 'OTP verification failed.' : errMsg)),
        );
      }
    }
  }

  void _showLinkingPasswordDialog(BuildContext context, AuthProvider auth, String email) {
    final passwordController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool obscureText = true;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              backgroundColor: const Color(0xFFFFF6E8),
              title: const Text(
                'Link Phone to Account',
                style: TextStyle(color: Color(0xFF8B1E2D), fontWeight: FontWeight.bold),
              ),
              content: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'This phone number is registered under email: $email.\n\nEnter your password to link them and sign in.',
                      style: const TextStyle(fontSize: 13, color: Colors.black87),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: passwordController,
                      obscureText: obscureText,
                      decoration: InputDecoration(
                        labelText: 'Password',
                        border: const OutlineInputBorder(),
                        suffixIcon: IconButton(
                          icon: Icon(obscureText ? Icons.visibility : Icons.visibility_off),
                          onPressed: () => setState(() => obscureText = !obscureText),
                        ),
                      ),
                      validator: (val) => val == null || val.length < 6 ? 'Password too short' : null,
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () {
                    auth.cancelPendingLinking();
                    Navigator.pop(context);
                  },
                  child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF8B1E2D),
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () async {
                    if (!formKey.currentState!.validate()) return;
                    
                    final scaffoldMessenger = ScaffoldMessenger.of(context);
                    final navigator = Navigator.of(context);
                    
                    final success = await auth.linkPhoneAccount(passwordController.text.trim());
                    if (success) {
                      navigator.pop(); // Close dialog
                      navigator.pushNamedAndRemoveUntil('/dashboard', (route) => false);
                    } else {
                      scaffoldMessenger.showSnackBar(
                        SnackBar(content: Text(auth.errorMessage ?? 'Linking failed.')),
                      );
                    }
                  },
                  child: auth.isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Link & Sign In'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    // Read the passed mobile number from arguments
    final mobile = ModalRoute.of(context)!.settings.arguments as String;
    final auth = Provider.of<AuthProvider>(context);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Verify Mobile OTP'),
      ),
      backgroundColor: theme.colorScheme.surface,
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 20),
              Icon(
                Icons.sms_failed,
                size: 60,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(height: 20),
              const Text(
                'Enter Security Code',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'A 6-digit code has been simulated for user $mobile. Please review the backend console logs to read it.',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.blueGrey, fontSize: 13),
              ),
              const SizedBox(height: 30),
              TextFormField(
                controller: _otpController,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: 22,
                    letterSpacing: 8,
                    fontWeight: FontWeight.bold),
                maxLength: 6,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  counterText: '',
                  hintText: '000000',
                  hintStyle: TextStyle(color: Colors.grey, letterSpacing: 8),
                ),
                validator: (val) => val == null || val.length != 6
                    ? 'Enter a 6-digit code'
                    : null,
              ),
              const SizedBox(height: 30),
              auth.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : ElevatedButton(
                      onPressed: () => _handleVerify(mobile),
                      child: const Text('Verify Code'),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}
