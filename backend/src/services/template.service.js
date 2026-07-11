const templateRepo = require('../repositories/template.repository');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

class TemplateService {
  async getTemplates(orgId) {
    return await templateRepo.findAll(orgId);
  }

  async getTemplateById(id, orgId) {
    const template = await templateRepo.findById(id, orgId);
    if (!template) {
      throw new Error('Template not found.');
    }
    return template;
  }

  async createTemplate(orgId, body) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      const templateId = uuidv4();
      if (body.is_default) {
        await templateRepo.resetDefaults(client, orgId);
      }

      const template = await templateRepo.create(client, {
        id: templateId,
        organizationId: orgId,
        ...body,
      });

      await client.query('COMMIT');
      return template;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateTemplate(id, orgId, body) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const exists = await templateRepo.findById(id, orgId);
      if (!exists) {
        throw new Error('Template not found.');
      }

      if (body.is_default) {
        await templateRepo.resetDefaults(client, orgId);
      }

      const updated = await templateRepo.update(id, orgId, body);
      await client.query('COMMIT');
      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async setDefaultTemplate(id, orgId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const exists = await templateRepo.findById(id, orgId);
      if (!exists) {
        throw new Error('Template not found.');
      }

      const result = await templateRepo.setDefault(client, id, orgId);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new TemplateService();
