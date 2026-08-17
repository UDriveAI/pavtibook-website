import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class RegisterOrgScreen extends StatefulWidget {
  const RegisterOrgScreen({super.key});

  @override
  State<RegisterOrgScreen> createState() => _RegisterOrgScreenState();
}

class _RegisterOrgScreenState extends State<RegisterOrgScreen> {
  final _formKey1 = GlobalKey<FormState>();
  final _formKey2 = GlobalKey<FormState>();

  int _currentStep = 0; // 0 for Step 1, 1 for Step 2
  bool _isProcessing = false;
  bool _useAdminDetailsForOrg = true;

  // Controllers for Step 1 (Required Info)
  final _orgNameController = TextEditingController();
  String _selectedOrgType = 'Ganesh Mandal';
  final _adminNameController = TextEditingController();
  final _adminMobileController = TextEditingController();
  final _adminEmailController = TextEditingController();
  final _passwordController = TextEditingController();

  // Optional Organization-specific details (If not Same as Admin)
  final _orgMobileController = TextEditingController();
  final _orgEmailController = TextEditingController();

  // Controllers for Step 2 (Skippable Profile Details)
  final _contactPersonController = TextEditingController();
  final _upiIdController = TextEditingController();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _pincodeController = TextEditingController();
  final _regNumController = TextEditingController();

  final List<String> _orgTypes = [
    'Ganesh Mandal',
    'Temple',
    'Trust',
    'NGO',
    'Society',
    'Club',
    'Religious Organization',
    'Community Organization',
  ];

  final List<String> _indianStates = [
    'Maharashtra',
    'Gujarat',
    'Karnataka',
    'Goa',
    'Madhya Pradesh',
    'Delhi',
    'Rajasthan',
    'Other',
  ];
  String _selectedState = 'Maharashtra';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (auth.user != null) {
        if (auth.user!.email.isNotEmpty && _adminEmailController.text.isEmpty) {
          _adminEmailController.text = auth.user!.email;
        }
        if (auth.user!.name.isNotEmpty && _adminNameController.text.isEmpty) {
          _adminNameController.text = auth.user!.name;
        }
      }
    });
  }

  @override
  void dispose() {
    _orgNameController.dispose();
    _adminNameController.dispose();
    _adminMobileController.dispose();
    _adminEmailController.dispose();
    _passwordController.dispose();
    _orgMobileController.dispose();
    _orgEmailController.dispose();
    _contactPersonController.dispose();
    _upiIdController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _pincodeController.dispose();
    _regNumController.dispose();
    super.dispose();
  }

  Future<void> _handleStep1Submit() async {
    if (_isProcessing) return;
    if (!_formKey1.currentState!.validate()) return;

    setState(() => _isProcessing = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);

    final regData = {
      'orgName': _orgNameController.text.trim(),
      'orgType': _selectedOrgType,
      'adminName': _adminNameController.text.trim(),
      'adminMobile': _adminMobileController.text.trim(),
      'adminEmail': _adminEmailController.text.trim(),
      'password': _passwordController.text,
      'orgMobile': _useAdminDetailsForOrg ? _adminMobileController.text.trim() : _orgMobileController.text.trim(),
      'orgEmail': _useAdminDetailsForOrg ? _adminEmailController.text.trim() : _orgEmailController.text.trim(),
    };

    final success = await auth.registerOrganization(regData);

    if (success && mounted) {
      _contactPersonController.text = _adminNameController.text.trim();
      setState(() {
        _currentStep = 1;
        _isProcessing = false;
      });
    } else if (mounted) {
      setState(() => _isProcessing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(auth.errorMessage ?? 'Account creation failed.')),
      );
    }
  }

  Future<void> _handleStep2Submit() async {
    if (_isProcessing) return;
    if (!_formKey2.currentState!.validate()) return;

    setState(() => _isProcessing = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.lastRegisteredOrgId;

    if (orgId == null) {
      setState(() => _isProcessing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Session lost. Please skip and complete from settings.')),
      );
      return;
    }

    final onboardingData = {
      'upiId': _upiIdController.text.trim(),
      'contactPerson': _contactPersonController.text.trim(),
      'address': _addressController.text.trim(),
      'city': _cityController.text.trim(),
      'state': _selectedState,
      'pincode': _pincodeController.text.trim(),
      'registrationNumber': _regNumController.text.trim(),
    };

    final success = await auth.updateOnboardingDetails(orgId, onboardingData);

    if (success && mounted) {
      setState(() => _isProcessing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Profile setup complete! Welcome to PavtiBook.'),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.pushNamedAndRemoveUntil(context, '/dashboard', (route) => false);
    } else if (mounted) {
      setState(() => _isProcessing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(auth.errorMessage ?? 'Onboarding profile update failed.')),
      );
    }
  }

  void _handleSkip() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Onboarding skipped. You can complete this later from Profile Settings.'),
      ),
    );
    Navigator.pushNamedAndRemoveUntil(context, '/dashboard', (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    // Maroon input decoration borders
    final borderStyle = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: Color(0xFFD4B282), width: 1.0),
    );

    final focusedBorderStyle = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: Color(0xFF8B1E2D), width: 1.5),
    );

    return Scaffold(
      backgroundColor: const Color(0xFFFFF6E8), // Cream Background
      appBar: AppBar(
        title: Text(_currentStep == 0 ? 'Create Account (1/2)' : 'Setup Profile (2/2)'),
        backgroundColor: const Color(0xFF8B1E2D),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SafeArea(
        child: Stack(
          children: [
            SingleChildScrollView(
              padding: const EdgeInsets.all(20.0),
              child: Card(
                color: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 3,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 24.0),
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    child: _currentStep == 0 ? _buildStep1Form(borderStyle, focusedBorderStyle) : _buildStep2Form(borderStyle, focusedBorderStyle),
                  ),
                ),
              ),
            ),
            if (_isProcessing)
              Container(
                color: Colors.black.withOpacity(0.3),
                child: const Center(
                  child: CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF8B1E2D)),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep1Form(OutlineInputBorder borderStyle, OutlineInputBorder focusedBorderStyle) {
    return Form(
      key: _formKey1,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Step 1: Account Credentials',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF8B1E2D)),
          ),
          const SizedBox(height: 4),
          const Text(
            'Required fields to register your organization and administrator details.',
            style: TextStyle(fontSize: 12, color: Colors.blueGrey),
          ),
          const SizedBox(height: 20),

          // Organization Fields
          TextFormField(
            controller: _orgNameController,
            enabled: !_isProcessing,
            decoration: InputDecoration(
              labelText: 'Organization Name *',
              border: borderStyle,
              focusedBorder: focusedBorderStyle,
            ),
            validator: (val) => val == null || val.trim().isEmpty ? 'Enter organization name' : null,
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _selectedOrgType,
            decoration: InputDecoration(
              labelText: 'Organization Type *',
              border: borderStyle,
              focusedBorder: focusedBorderStyle,
            ),
            items: _orgTypes
                .map((type) => DropdownMenuItem(value: type, child: Text(type)))
                .toList(),
            onChanged: _isProcessing ? null : (val) {
              if (val != null) setState(() => _selectedOrgType = val);
            },
          ),
          const SizedBox(height: 16),

          // Admin Fields
          const Divider(),
          const SizedBox(height: 8),
          const Text('Administrator Details', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blueGrey)),
          const SizedBox(height: 12),
          TextFormField(
            controller: _adminNameController,
            enabled: !_isProcessing,
            decoration: InputDecoration(
              labelText: 'Admin Name *',
              border: borderStyle,
              focusedBorder: focusedBorderStyle,
            ),
            validator: (val) => val == null || val.trim().isEmpty ? 'Enter admin name' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _adminMobileController,
            enabled: !_isProcessing,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(
              labelText: 'Admin Mobile Number *',
              border: borderStyle,
              focusedBorder: focusedBorderStyle,
            ),
            validator: (val) => val == null || val.trim().length < 10 ? 'Enter a 10-digit mobile number' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _adminEmailController,
            enabled: !_isProcessing,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(
              labelText: 'Admin Email *',
              border: borderStyle,
              focusedBorder: focusedBorderStyle,
            ),
            validator: (val) => val == null || !val.contains('@') ? 'Enter a valid email' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _passwordController,
            enabled: !_isProcessing,
            obscureText: true,
            decoration: InputDecoration(
              labelText: 'Sign-in Password *',
              border: borderStyle,
              focusedBorder: focusedBorderStyle,
            ),
            validator: (val) => val == null || val.length < 6 ? 'Password must be at least 6 characters' : null,
          ),
          const SizedBox(height: 12),

          // Checkbox for Same as Admin Details
          CheckboxListTile(
            title: const Text(
              'Use Admin Details as Official Organization Details',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
            ),
            value: _useAdminDetailsForOrg,
            activeColor: const Color(0xFF8B1E2D),
            onChanged: _isProcessing ? null : (val) {
              if (val != null) setState(() => _useAdminDetailsForOrg = val);
            },
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: EdgeInsets.zero,
          ),

          if (!_useAdminDetailsForOrg) ...[
            const SizedBox(height: 8),
            TextFormField(
              controller: _orgMobileController,
              enabled: !_isProcessing,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: 'Official Organization Mobile *',
                border: borderStyle,
                focusedBorder: focusedBorderStyle,
              ),
              validator: (val) => val == null || val.trim().length < 10 ? 'Enter a 10-digit organization mobile' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _orgEmailController,
              enabled: !_isProcessing,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                labelText: 'Official Organization Email *',
                border: borderStyle,
                focusedBorder: focusedBorderStyle,
              ),
              validator: (val) => val == null || !val.contains('@') ? 'Enter a valid organization email' : null,
            ),
          ],

          const SizedBox(height: 24),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8B1E2D),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: _isProcessing ? null : _handleStep1Submit,
            child: const Text('Create Account & Continue', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildStep2Form(OutlineInputBorder borderStyle, OutlineInputBorder focusedBorderStyle) {
    return Form(
      key: _formKey2,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Step 2: Profile Settings (Optional)',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF8B1E2D)),
          ),
          const SizedBox(height: 4),
          const Text(
            'Complete your organization profile setup for billing and receipt templates, or skip to finish later.',
            style: TextStyle(fontSize: 12, color: Colors.blueGrey),
          ),
          const SizedBox(height: 20),

          TextFormField(
            controller: _upiIdController,
            enabled: !_isProcessing,
            decoration: InputDecoration(
              labelText: 'Organization UPI ID *',
              hintText: 'e.g. name@upi',
              border: borderStyle,
              focusedBorder: focusedBorderStyle,
            ),
            validator: (val) => val == null || val.trim().isEmpty ? 'Enter a valid UPI ID for donations' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _contactPersonController,
            enabled: !_isProcessing,
            decoration: InputDecoration(
              labelText: 'Contact Person *',
              border: borderStyle,
              focusedBorder: focusedBorderStyle,
            ),
            validator: (val) => val == null || val.trim().isEmpty ? 'Enter contact person name' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _addressController,
            enabled: !_isProcessing,
            decoration: InputDecoration(
              labelText: 'Address *',
              border: borderStyle,
              focusedBorder: focusedBorderStyle,
            ),
            validator: (val) => val == null || val.trim().isEmpty ? 'Enter address' : null,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _cityController,
                  enabled: !_isProcessing,
                  decoration: InputDecoration(
                    labelText: 'City *',
                    border: borderStyle,
                    focusedBorder: focusedBorderStyle,
                  ),
                  validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _selectedState,
                  decoration: InputDecoration(
                    labelText: 'State *',
                    border: borderStyle,
                    focusedBorder: focusedBorderStyle,
                  ),
                  items: _indianStates
                      .map((state) => DropdownMenuItem(value: state, child: Text(state)))
                      .toList(),
                  onChanged: _isProcessing ? null : (val) {
                    if (val != null) setState(() => _selectedState = val);
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _pincodeController,
            enabled: !_isProcessing,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: 'Pincode *',
              border: borderStyle,
              focusedBorder: focusedBorderStyle,
            ),
            validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _regNumController,
            enabled: !_isProcessing,
            decoration: InputDecoration(
              labelText: 'Registration / Trust No. (Optional)',
              border: borderStyle,
              focusedBorder: focusedBorderStyle,
            ),
          ),
          const SizedBox(height: 24),

          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8B1E2D),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: _isProcessing ? null : _handleStep2Submit,
            child: const Text('Save & Finish Setup', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Color(0xFF8B1E2D)),
              foregroundColor: const Color(0xFF8B1E2D),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: _isProcessing ? null : _handleSkip,
            child: const Text('Skip for Now', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
