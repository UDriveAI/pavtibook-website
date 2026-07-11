const templateService = require('../services/template.service');

class TemplateController {
  async getTemplates(req, res) {
    try {
      const templates = await templateService.getTemplates(req.organization_id);
      res.json(templates);
    } catch (error) {
      console.error('Fetch templates error:', error);
      res.status(500).json({ message: error.message || 'Server error fetching templates.' });
    }
  }

  async getTemplateById(req, res) {
    try {
      const { id } = req.params;
      const template = await templateService.getTemplateById(id, req.organization_id);
      res.json(template);
    } catch (error) {
      console.error('Fetch template detail error:', error);
      res.status(404).json({ message: error.message || 'Template not found.' });
    }
  }

  async createTemplate(req, res) {
    try {
      const template = await templateService.createTemplate(req.organization_id, req.body);
      res.status(201).json(template);
    } catch (error) {
      console.error('Create template error:', error);
      res.status(400).json({ message: error.message || 'Server error creating template.' });
    }
  }

  async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const template = await templateService.updateTemplate(id, req.organization_id, req.body);
      res.json(template);
    } catch (error) {
      console.error('Update template error:', error);
      res.status(400).json({ message: error.message || 'Server error updating template.' });
    }
  }

  async setDefaultTemplate(req, res) {
    try {
      const { id } = req.params;
      const template = await templateService.setDefaultTemplate(id, req.organization_id);
      res.json({ message: 'Default template set successfully.', template });
    } catch (error) {
      console.error('Set default template error:', error);
      res.status(400).json({ message: error.message || 'Server error setting default template.' });
    }
  }
}

module.exports = new TemplateController();
