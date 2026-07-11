import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Email controller
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _emailFormKey = GlobalKey<FormState>();

  // Mobile controller
  final _mobileController = TextEditingController();
  final _mobileFormKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (mounted) {
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _mobileController.dispose();
    super.dispose();
  }

  Future<void> _handleEmailLogin() async {
    if (!_emailFormKey.currentState!.validate()) return;

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.loginEmail(
      _emailController.text.trim(),
      _passwordController.text,
    );

    if (success && mounted) {
      Navigator.pushReplacementNamed(context, '/dashboard');
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(auth.errorMessage ?? 'Login failed.')),
      );
    }
  }

  Future<void> _handleOtpRequest() async {
    if (!_mobileFormKey.currentState!.validate()) return;

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.requestOtp(_mobileController.text.trim());

    if (success && mounted) {
      Navigator.pushNamed(
        context,
        '/otp-verify',
        arguments: _mobileController.text.trim(),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(auth.errorMessage ?? 'Failed to request OTP.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    final borderStyle = OutlineInputBorder(
      borderRadius: BorderRadius.circular(15),
      borderSide: const BorderSide(
          color: Color(0xFF8B1E2D), width: 1.2), // Maroon border
    );

    final focusedBorderStyle = OutlineInputBorder(
      borderRadius: BorderRadius.circular(15),
      borderSide: const BorderSide(color: Color(0xFF8B1E2D), width: 2.0),
    );

    final errorBorderStyle = OutlineInputBorder(
      borderRadius: BorderRadius.circular(15),
      borderSide: const BorderSide(color: Colors.red, width: 1.2),
    );

    return Scaffold(
      backgroundColor: const Color(0xFFFFF6E8), // Cream Background
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding:
                  const EdgeInsets.symmetric(horizontal: 24.0, vertical: 24.0),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: constraints.maxHeight - 48,
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Centered Full Logo
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16.0),
                        child: Image.asset(
                          'assets/images/Pavati-Book-Logo.png',
                          width: MediaQuery.of(context).size.width * 0.65,
                          fit: BoxFit.contain,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Welcome Texts
                    const Text(
                      'Welcome Back!',
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF8B1E2D), // Primary Maroon
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Log in your account',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 28),

                    // Login Card
                    Card(
                      color: Colors.white,
                      elevation: 4,
                      shadowColor: Colors.black.withOpacity(0.04),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 20.0, vertical: 24.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Tabs with solid Maroon active indicator
                            Container(
                              decoration: BoxDecoration(
                                color: Colors.grey[200],
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: TabBar(
                                controller: _tabController,
                                indicator: BoxDecoration(
                                  color:
                                      const Color(0xFF8B1E2D), // Primary Maroon
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                labelColor: Colors.white,
                                unselectedLabelColor: Colors.grey[700],
                                labelStyle: const TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 13),
                                unselectedLabelStyle: const TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 13),
                                tabs: const [
                                  Tab(text: 'Email & Password'),
                                  Tab(text: 'Mobile OTP'),
                                ],
                              ),
                            ),
                            const SizedBox(height: 24),

                            // Tab Views
                            SizedBox(
                              height: 190,
                              child: TabBarView(
                                controller: _tabController,
                                children: [
                                  // Email Form
                                  Form(
                                    key: _emailFormKey,
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'Enter Register Email',
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w500,
                                            color: Colors.black87,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        TextFormField(
                                          controller: _emailController,
                                          keyboardType:
                                              TextInputType.emailAddress,
                                          decoration: InputDecoration(
                                            border: borderStyle,
                                            enabledBorder: borderStyle,
                                            focusedBorder: focusedBorderStyle,
                                            errorBorder: errorBorderStyle,
                                            focusedErrorBorder:
                                                focusedBorderStyle,
                                            contentPadding:
                                                const EdgeInsets.symmetric(
                                                    vertical: 12,
                                                    horizontal: 16),
                                            fillColor: Colors.white,
                                            filled: true,
                                          ),
                                          validator: (val) =>
                                              val == null || !val.contains('@')
                                                  ? 'Enter a valid email'
                                                  : null,
                                        ),
                                        const SizedBox(height: 16),
                                        const Text(
                                          'Enter Password',
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w500,
                                            color: Colors.black87,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        TextFormField(
                                          controller: _passwordController,
                                          obscureText: true,
                                          decoration: InputDecoration(
                                            border: borderStyle,
                                            enabledBorder: borderStyle,
                                            focusedBorder: focusedBorderStyle,
                                            errorBorder: errorBorderStyle,
                                            focusedErrorBorder:
                                                focusedBorderStyle,
                                            contentPadding:
                                                const EdgeInsets.symmetric(
                                                    vertical: 12,
                                                    horizontal: 16),
                                            fillColor: Colors.white,
                                            filled: true,
                                          ),
                                          validator: (val) => val == null ||
                                                  val.length < 6
                                              ? 'Password must be at least 6 characters'
                                              : null,
                                        ),
                                      ],
                                    ),
                                  ),

                                  // OTP Form
                                  Form(
                                    key: _mobileFormKey,
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'Enter Mobile Number',
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w500,
                                            color: Colors.black87,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        TextFormField(
                                          controller: _mobileController,
                                          keyboardType: TextInputType.phone,
                                          decoration: InputDecoration(
                                            border: borderStyle,
                                            enabledBorder: borderStyle,
                                            focusedBorder: focusedBorderStyle,
                                            errorBorder: errorBorderStyle,
                                            focusedErrorBorder:
                                                focusedBorderStyle,
                                            contentPadding:
                                                const EdgeInsets.symmetric(
                                                    vertical: 12,
                                                    horizontal: 16),
                                            fillColor: Colors.white,
                                            filled: true,
                                            hintText: 'e.g. 9876543210',
                                            hintStyle: const TextStyle(
                                                color: Colors.grey,
                                                fontSize: 13),
                                          ),
                                          validator: (val) => val == null ||
                                                  val.length < 10
                                              ? 'Enter a valid 10-digit number'
                                              : null,
                                        ),
                                        const SizedBox(height: 12),
                                        const Text(
                                          '* Note: Mobile OTP login is disabled in Firebase real testing mode. Please use Email & Password instead.',
                                          style: TextStyle(
                                            color: Colors.blueGrey,
                                            fontSize: 10,
                                            fontStyle: FontStyle.italic,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),

                            // Centered Pill Button (40-50% width)
                            Center(
                              child: auth.isLoading
                                  ? const CircularProgressIndicator(
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                          Color(0xFF8B1E2D)),
                                    )
                                  : SizedBox(
                                      width: 140, // Centered, smaller width
                                      height: 48,
                                      child: ElevatedButton(
                                        onPressed: () {
                                          if (_tabController.index == 0) {
                                            _handleEmailLogin();
                                          } else {
                                            _handleOtpRequest();
                                          }
                                        },
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: const Color(
                                              0xFF8B1E2D), // Primary Maroon
                                          foregroundColor: Colors.white,
                                          elevation: 2,
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(
                                                22), // Pill shape
                                          ),
                                          textStyle: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 15,
                                          ),
                                        ),
                                        child: Text(_tabController.index == 0
                                            ? 'Log In'
                                            : 'Send OTP'),
                                      ),
                                    ),
                            ),
                            const SizedBox(height: 24),

                            // Register Link
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Text(
                                  "Don't have account? ",
                                  style: TextStyle(
                                      color: Colors.black87, fontSize: 13),
                                ),
                                GestureDetector(
                                  onTap: () {
                                    Navigator.pushNamed(context, '/register');
                                  },
                                  child: const Text(
                                    'Register Now',
                                    style: TextStyle(
                                      color: Color(0xFF8B1E2D), // Maroon
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            // Join Organization Link
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Text(
                                  "Received an invite OTP? ",
                                  style: TextStyle(
                                      color: Colors.black87, fontSize: 13),
                                ),
                                GestureDetector(
                                  onTap: () {
                                    Navigator.pushNamed(
                                        context, '/join-organization');
                                  },
                                  child: const Text(
                                    'Join Organization',
                                    style: TextStyle(
                                      color: Color(0xFFF47C20), // Orange
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
