import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class RegisterOrgScreen extends StatefulWidget {
  const RegisterOrgScreen({super.key});

  @override
  State<RegisterOrgScreen> createState() => _RegisterOrgScreenState();
}

class _RegisterOrgScreenState extends State<RegisterOrgScreen> {
  final _formKey = GlobalKey<FormState>();

  // Organization details
  final _orgNameController = TextEditingController();
  String _selectedOrgType = 'Ganesh Mandal';
  final _contactPersonController = TextEditingController();
  final _orgMobileController = TextEditingController();
  final _orgEmailController = TextEditingController();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _pincodeController = TextEditingController();
  final _upiIdController = TextEditingController();
  final _regNumController = TextEditingController();

  // Administrator Details
  final _adminNameController = TextEditingController();
  final _adminEmailController = TextEditingController();
  final _adminMobileController = TextEditingController();
  final _passwordController = TextEditingController();

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

  @override
  void dispose() {
    _orgNameController.dispose();
    _contactPersonController.dispose();
    _orgMobileController.dispose();
    _orgEmailController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _pincodeController.dispose();
    _upiIdController.dispose();
    _regNumController.dispose();
    _adminNameController.dispose();
    _adminEmailController.dispose();
    _adminMobileController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final regData = {
      // Org Details
      'orgName': _orgNameController.text.trim(),
      'orgType': _selectedOrgType,
      'contactPerson': _contactPersonController.text.trim(),
      'orgMobile': _orgMobileController.text.trim(),
      'orgEmail': _orgEmailController.text.trim(),
      'address': _addressController.text.trim(),
      'city': _cityController.text.trim(),
      'state': _stateController.text.trim(),
      'pincode': _pincodeController.text.trim(),
      'upiId': _upiIdController.text.trim(),
      'registrationNumber': _regNumController.text.trim(),
      // Admin Details
      'adminName': _adminNameController.text.trim(),
      'adminEmail': _adminEmailController.text.trim(),
      'adminMobile': _adminMobileController.text.trim(),
      'password': _passwordController.text,
    };

    final success = await auth.registerOrganization(regData);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Registration Successful! Please login to continue.'),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(auth.errorMessage ?? 'Onboarding failed.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Register Organization'),
      ),
      backgroundColor: theme.colorScheme.surface,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Create PavtiBook Account',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'Digitalize your traditional collection books seamlessly.',
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
              ),
              const SizedBox(height: 24),

              // Organization Card Section
              _buildSectionTitle('Organization Details'),
              const SizedBox(height: 12),
              TextFormField(
                controller: _orgNameController,
                decoration: const InputDecoration(
                    labelText: 'Organization Name *',
                    border: OutlineInputBorder()),
                validator: (val) => val == null || val.isEmpty
                    ? 'Enter organization name'
                    : null,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _selectedOrgType,
                decoration: const InputDecoration(
                    labelText: 'Organization Type *',
                    border: OutlineInputBorder()),
                items: _orgTypes
                    .map((type) =>
                        DropdownMenuItem(value: type, child: Text(type)))
                    .toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedOrgType = val);
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _upiIdController,
                decoration: const InputDecoration(
                  labelText: 'Organization UPI ID *',
                  border: OutlineInputBorder(),
                  hintText: 'e.g. name@upi',
                ),
                validator: (val) => val == null || val.isEmpty
                    ? 'Enter a valid UPI ID for donations'
                    : null,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _contactPersonController,
                      decoration: const InputDecoration(
                          labelText: 'Contact Person *',
                          border: OutlineInputBorder()),
                      validator: (val) =>
                          val == null || val.isEmpty ? 'Required' : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _orgMobileController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                          labelText: 'Mobile No. *',
                          border: OutlineInputBorder()),
                      validator: (val) =>
                          val == null || val.isEmpty ? 'Required' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _orgEmailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                    labelText: 'Official Email *',
                    border: OutlineInputBorder()),
                validator: (val) => val == null || !val.contains('@')
                    ? 'Enter a valid email'
                    : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _addressController,
                decoration: const InputDecoration(
                    labelText: 'Address *', border: OutlineInputBorder()),
                validator: (val) =>
                    val == null || val.isEmpty ? 'Enter address' : null,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _cityController,
                      decoration: const InputDecoration(
                          labelText: 'City *', border: OutlineInputBorder()),
                      validator: (val) =>
                          val == null || val.isEmpty ? 'Required' : null,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextFormField(
                      controller: _stateController,
                      decoration: const InputDecoration(
                          labelText: 'State *', border: OutlineInputBorder()),
                      validator: (val) =>
                          val == null || val.isEmpty ? 'Required' : null,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextFormField(
                      controller: _pincodeController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                          labelText: 'Pincode *', border: OutlineInputBorder()),
                      validator: (val) =>
                          val == null || val.isEmpty ? 'Required' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _regNumController,
                decoration: const InputDecoration(
                  labelText: 'Registration / Trust No. (Optional)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 24),

              // Administrator Section
              _buildSectionTitle('Administrator Account'),
              const SizedBox(height: 12),
              TextFormField(
                controller: _adminNameController,
                decoration: const InputDecoration(
                    labelText: 'Admin Full Name *',
                    border: OutlineInputBorder()),
                validator: (val) =>
                    val == null || val.isEmpty ? 'Enter admin name' : null,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _adminEmailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                          labelText: 'Admin Email *',
                          border: OutlineInputBorder()),
                      validator: (val) => val == null || !val.contains('@')
                          ? 'Invalid email'
                          : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _adminMobileController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                          labelText: 'Admin Mobile *',
                          border: OutlineInputBorder()),
                      validator: (val) => val == null || val.length < 10
                          ? 'Invalid mobile'
                          : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                    labelText: 'Sign-in Password *',
                    border: OutlineInputBorder()),
                validator: (val) => val == null || val.length < 6
                    ? 'Password must be at least 6 characters'
                    : null,
              ),
              const SizedBox(height: 32),

              auth.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : ElevatedButton(
                      onPressed: _handleRegister,
                      child: const Text('Register & Onboard'),
                    ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.blueGrey),
        ),
        const SizedBox(height: 4),
        const Divider(),
      ],
    );
  }
}
