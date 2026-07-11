import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../providers/auth_provider.dart';
import '../services/subscription_permission_service.dart';

class WhatsAppSettingsScreen extends StatefulWidget {
  const WhatsAppSettingsScreen({super.key});

  @override
  State<WhatsAppSettingsScreen> createState() => _WhatsAppSettingsScreenState();
}

class _WhatsAppSettingsScreenState extends State<WhatsAppSettingsScreen> {
  bool _whatsappAutoSend = true;
  bool _pdfAutoSend = false;
  bool _pendingReminder = true;
  bool _isLoading = false;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  void _loadSettings() {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final org = auth.organization;
    if (org != null) {
      setState(() {
        _whatsappAutoSend = org.whatsappAutoSend;
        _pdfAutoSend = org.pdfAutoSend;
        _pendingReminder = org.pendingReminder;
      });
    }
  }

  Future<void> _saveSettings() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orgId = auth.organization?.id;
    if (orgId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No active organization found.')),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      await FirebaseFirestore.instance
          .collection('organizations')
          .doc(orgId)
          .update({
        'whatsappAutoSend': _whatsappAutoSend,
        'whatsapp_auto_send': _whatsappAutoSend, // Backwards compatibility
        'pdfAutoSend': _pdfAutoSend,
        'pdf_auto_send': _pdfAutoSend, // Backwards compatibility
        'pendingReminder': _pendingReminder,
        'pending_reminder': _pendingReminder, // Backwards compatibility
      });

      // Reload organization in AuthProvider
      await auth.reloadProfile();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Settings saved successfully!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save settings: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isPremium = SubscriptionPermissionService.isPremium(auth.subscription?.plan);

    if (!isPremium) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('WhatsApp Settings'),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.lock_outline, size: 64, color: Colors.grey),
                const SizedBox(height: 16),
                const Text(
                  'Upgrade to Premium',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Auto WhatsApp Receipt Sending is available only in the Premium plan.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {
                    Navigator.pushReplacementNamed(context, '/settings/subscription-usage');
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF8B1E2D),
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('View Subscription Plans'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('WhatsApp Settings'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Card(
                    color: Colors.white,
                    elevation: 2,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: Colors.grey.withOpacity(0.15)),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.phone_android,
                                  color: Color(0xFF8B1E2D)),
                              SizedBox(width: 8),
                              Text(
                                'Notification Settings',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: Color(0xFF8B1E2D),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          SwitchListTile(
                            activeColor: const Color(0xFF8B1E2D),
                            title: const Text(
                              'Enable WhatsApp Auto Send',
                              style: TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            subtitle: const Text(
                              'Automatically send a text confirmation message to the donor via WhatsApp as soon as a receipt is successfully created.',
                              style:
                                  TextStyle(fontSize: 11, color: Colors.grey),
                            ),
                            value: _whatsappAutoSend,
                            onChanged: (val) {
                              setState(() {
                                _whatsappAutoSend = val;
                              });
                            },
                          ),
                          const Divider(height: 24),
                          SwitchListTile(
                            activeColor: const Color(0xFF8B1E2D),
                            title: const Text(
                              'Enable PDF Auto Send',
                              style: TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            subtitle: const Text(
                              'Automatically generate and send a PDF receipt document template to the donor right after the text template succeeds. (Requires WhatsApp Auto Send to be ON)',
                              style:
                                  TextStyle(fontSize: 11, color: Colors.grey),
                            ),
                            value: _pdfAutoSend,
                            onChanged: _whatsappAutoSend
                                ? (val) {
                                    setState(() {
                                      _pdfAutoSend = val;
                                    });
                                  }
                                : null,
                          ),
                          const Divider(height: 24),
                          SwitchListTile(
                            activeColor: const Color(0xFF8B1E2D),
                            title: const Text(
                              'Enable Pending Reminder',
                              style: TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            subtitle: const Text(
                              'Enable reminder triggers for receipts with pending payment status.',
                              style:
                                  TextStyle(fontSize: 11, color: Colors.grey),
                            ),
                            value: _pendingReminder,
                            onChanged: (val) {
                              setState(() {
                                _pendingReminder = val;
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _isSaving ? null : _saveSettings,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF8B1E2D),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: _isSaving
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2),
                          )
                        : const Text(
                            'Save Configuration',
                            style: TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                  ),
                ],
              ),
            ),
    );
  }
}
