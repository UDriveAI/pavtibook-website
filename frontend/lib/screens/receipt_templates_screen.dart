import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../models/models.dart';
import '../widgets/traditional_receipt_widget.dart';

class ReceiptTemplatesScreen extends StatefulWidget {
  const ReceiptTemplatesScreen({super.key});

  @override
  State<ReceiptTemplatesScreen> createState() => _ReceiptTemplatesScreenState();
}

class _ReceiptTemplatesScreenState extends State<ReceiptTemplatesScreen> {
  final _formKey = GlobalKey<FormState>();

  final _nameController = TextEditingController();
  final _headerEnController = TextEditingController();
  final _headerLocalController = TextEditingController();
  final _footerEnController = TextEditingController();
  final _footerLocalController = TextEditingController();
  final _signatureController = TextEditingController();

  String _selectedType = 'traditional';
  String _bgColor = '#FFFDD0'; // Cream
  String _borderColor = '#E65100'; // Orange
  String _borderStyle = 'double';
  String _fontFamily = 'Poppins';
  String _fontColor = '#3E2723'; // Dark brown
  double _watermarkOpacity = 0.08;

  bool _isDefault = false;

  final List<String> _bgColors = [
    '#FFFDD0',
    '#FFFDE7',
    '#FFF3E0',
    '#FFFFFF',
    '#F5F5F5'
  ];
  final List<String> _borderColors = [
    '#E65100',
    '#D84315',
    '#B71C1C',
    '#0D47A1',
    '#2E7D32'
  ];

  @override
  void initState() {
    super.initState();
    Future.delayed(Duration.zero, () {
      if (mounted) {
        _loadTemplates();
      }
    });
  }

  void _loadTemplates() {
    Provider.of<TemplateProvider>(context, listen: false).fetchTemplates();
  }

  // Pre-fill editor when template selected
  void _selectTemplate(TemplateModel t) {
    setState(() {
      _nameController.text = t.name;
      _selectedType = t.type;
      _bgColor = t.bgColor;
      _borderColor = t.borderColor;
      _borderStyle = t.borderStyle;
      _fontFamily = t.fontFamily;
      _fontColor = t.fontColor;
      _watermarkOpacity = t.watermarkOpacity;
      _headerEnController.text = t.headerTextEn ?? '';
      _headerLocalController.text = t.headerTextLocal ?? '';
      _footerEnController.text = t.footerTextEn ?? '';
      _footerLocalController.text = t.footerTextLocal ?? '';
      _signatureController.text = t.signatureLabel;
      _isDefault = t.isDefault;
    });
  }

  Future<void> _saveTemplate() async {
    if (!_formKey.currentState!.validate()) return;

    final tp = Provider.of<TemplateProvider>(context, listen: false);
    final payload = {
      'name': _nameController.text.trim(),
      'type': _selectedType,
      'bg_color': _bgColor,
      'border_style': _borderStyle,
      'border_color': _borderColor,
      'font_family': _fontFamily,
      'font_color': _fontColor,
      'logo_visible': true,
      'god_image_position': 'left',
      'watermark_opacity': _watermarkOpacity,
      'header_text_en': _headerEnController.text.trim(),
      'header_text_local': _headerLocalController.text.trim(),
      'footer_text_en': _footerEnController.text.trim(),
      'footer_text_local': _footerLocalController.text.trim(),
      'signature_label': _signatureController.text.trim(),
      'is_default': _isDefault,
    };

    final success = await tp.createTemplate(payload);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Custom layout template saved successfully!')),
      );
      _formKey.currentState!.reset();
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to save layout configuration.')),
      );
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _headerEnController.dispose();
    _headerLocalController.dispose();
    _footerEnController.dispose();
    _footerLocalController.dispose();
    _signatureController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tempProvider = Provider.of<TemplateProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final theme = Theme.of(context);

    // Mock receipt data for live preview
    final mockReceipt = ReceiptModel(
      id: '',
      organizationId: '',
      donorId: '',
      receiptNumber: 'PB-2026-000000',
      amount: 1001,
      purpose: 'Sample Vargani Contribution',
      paymentMode: 'upi',
      paymentStatus: 'paid',
      qrCodeValue: 'preview',
      createdAt: DateTime.now().toIso8601String(),
      donorName: 'Shri. Rajesh Patil',
      donorMobile: '9876543210',
    );

    // Simulated Template Model constructed from sliders/inputs
    final currentEditorTemplate = TemplateModel(
      id: '',
      organizationId: '',
      name: _nameController.text.isEmpty ? 'Live Editor' : _nameController.text,
      type: _selectedType,
      bgColor: _bgColor,
      borderStyle: _borderStyle,
      borderColor: _borderColor,
      fontFamily: _fontFamily,
      fontColor: _fontColor,
      logoVisible: true,
      godImagePosition: 'left',
      watermarkOpacity: _watermarkOpacity,
      headerTextEn:
          _headerEnController.text.isEmpty ? null : _headerEnController.text,
      headerTextLocal: _headerLocalController.text.isEmpty
          ? null
          : _headerLocalController.text,
      footerTextEn:
          _footerEnController.text.isEmpty ? null : _footerEnController.text,
      footerTextLocal: _footerLocalController.text.isEmpty
          ? null
          : _footerLocalController.text,
      signatureLabel: _signatureController.text.isEmpty
          ? 'Treasurer'
          : _signatureController.text,
      isDefault: _isDefault,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Receipt templates'),
      ),
      backgroundColor: theme.colorScheme.surface,
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Live Preview Section
            Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Live Layout Preview',
                    style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: Colors.blueGrey),
                  ),
                  const SizedBox(height: 6),
                  TraditionalReceiptWidget(
                    receipt: mockReceipt,
                    organization: auth.organization!,
                    template: currentEditorTemplate,
                  ),
                ],
              ),
            ),

            // 2. Preset selectors
            if (tempProvider.templates.isNotEmpty)
              Container(
                height: 50,
                color: Colors.white,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  itemCount: tempProvider.templates.length,
                  itemBuilder: (context, index) {
                    final t = tempProvider.templates[index];
                    return Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: ActionChip(
                        label:
                            Text('${t.name} ${t.isDefault ? "(Active)" : ""}'),
                        onPressed: () => _selectTemplate(t),
                        backgroundColor: t.isDefault
                            ? theme.colorScheme.primary.withValues(alpha: 0.15)
                            : null,
                      ),
                    );
                  },
                ),
              ),

            // 3. Editor Controls
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Visual Customizations',
                              style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blueGrey),
                            ),
                            const Divider(),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _nameController,
                              decoration: const InputDecoration(
                                  labelText: 'Template Name *',
                                  border: OutlineInputBorder()),
                              validator: (val) => val == null || val.isEmpty
                                  ? 'Enter template name'
                                  : null,
                            ),
                            const SizedBox(height: 16),

                            // Color Picker (Bg Color)
                            const Text('Paper Background Tone',
                                style: TextStyle(
                                    fontSize: 12, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 8),
                            Row(
                              children: _bgColors.map((color) {
                                final isSelected = _bgColor == color;
                                final hex = int.parse(
                                    'ff${color.replaceFirst('#', '')}',
                                    radix: 16);
                                return GestureDetector(
                                  onTap: () => setState(() => _bgColor = color),
                                  child: Container(
                                    margin: const EdgeInsets.only(right: 12),
                                    width: 32,
                                    height: 32,
                                    decoration: BoxDecoration(
                                      color: Color(hex),
                                      border: Border.all(
                                        color: isSelected
                                            ? Colors.black
                                            : Colors.grey[400]!,
                                        width: isSelected ? 2.5 : 1,
                                      ),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                            const SizedBox(height: 16),

                            // Border Color
                            const Text('Traditional Border Color',
                                style: TextStyle(
                                    fontSize: 12, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 8),
                            Row(
                              children: _borderColors.map((color) {
                                final isSelected = _borderColor == color;
                                final hex = int.parse(
                                    'ff${color.replaceFirst('#', '')}',
                                    radix: 16);
                                return GestureDetector(
                                  onTap: () =>
                                      setState(() => _borderColor = color),
                                  child: Container(
                                    margin: const EdgeInsets.only(right: 12),
                                    width: 32,
                                    height: 32,
                                    decoration: BoxDecoration(
                                      color: Color(hex),
                                      border: Border.all(
                                        color: isSelected
                                            ? Colors.black
                                            : Colors.transparent,
                                        width: isSelected ? 2.5 : 1,
                                      ),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                            const SizedBox(height: 16),

                            // Border Style Selector
                            DropdownButtonFormField<String>(
                              initialValue: _borderStyle,
                              decoration: const InputDecoration(
                                  labelText: 'Border Pattern *',
                                  border: OutlineInputBorder()),
                              items: const [
                                DropdownMenuItem(
                                    value: 'double',
                                    child: Text(
                                        'Classic Double-line (पारंपारिक)')),
                                DropdownMenuItem(
                                    value: 'floral',
                                    child: Text(
                                        'Marigold Garland Accent (झेंडू फुलांची नक्षी)')),
                                DropdownMenuItem(
                                    value: 'thin',
                                    child: Text('Modern Thin Accent')),
                              ],
                              onChanged: (val) {
                                if (val != null)
                                  setState(() => _borderStyle = val);
                              },
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Headings Card
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Typography & Bilingual Texts',
                              style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blueGrey),
                            ),
                            const Divider(),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _headerLocalController,
                              decoration: const InputDecoration(
                                labelText:
                                    'Local Devanagari Title (Hindi/Marathi)',
                                border: OutlineInputBorder(),
                                hintText:
                                    'e.g. ॥ श्री गणेश प्रसन्न ॥ लालबागचा राजा मित्र मंडळ',
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _headerEnController,
                              decoration: const InputDecoration(
                                labelText: 'English Main Heading',
                                border: OutlineInputBorder(),
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _footerLocalController,
                              decoration: const InputDecoration(
                                labelText: 'Local Language Footer Subtitle',
                                border: OutlineInputBorder(),
                                hintText:
                                    'e.g. गणेशोत्सवाच्या हार्दिक शुभेच्छा!',
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _footerEnController,
                              decoration: const InputDecoration(
                                labelText: 'English Footer Subtitle',
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Signature & Default Settings
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Signatory & Publishing Control',
                              style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blueGrey),
                            ),
                            const Divider(),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _signatureController,
                              decoration: const InputDecoration(
                                labelText: 'Signature Label *',
                                border: OutlineInputBorder(),
                                hintText:
                                    'e.g. Treasurer / Trustee / Administrator',
                              ),
                              validator: (val) => val == null || val.isEmpty
                                  ? 'Enter signature title'
                                  : null,
                            ),
                            const SizedBox(height: 16),
                            SwitchListTile(
                              title:
                                  const Text('Set as Active default template'),
                              subtitle: const Text(
                                  'New receipts will generate using this styling profile'),
                              value: _isDefault,
                              onChanged: (val) {
                                setState(() => _isDefault = val);
                              },
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    tempProvider.isLoading
                        ? const Center(child: CircularProgressIndicator())
                        : ElevatedButton(
                            onPressed: _saveTemplate,
                            child: const Text('Save Template Layout'),
                          ),
                    const SizedBox(height: 30),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
