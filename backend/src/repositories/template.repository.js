const db = require('../config/db');

class TemplateRepository {
  async findAll(orgId) {
    const query = `
      SELECT * FROM templates 
      WHERE organization_id = $1 AND deleted_at IS NULL 
      ORDER BY is_default DESC, created_at DESC
    `;
    const res = await db.query(query, [orgId]);
    return res.rows;
  }

  async findById(id, orgId) {
    const query = `
      SELECT * FROM templates 
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
    `;
    const res = await db.query(query, [id, orgId]);
    return res.rows[0] || null;
  }

  async findDefault(orgId) {
    const query = `
      SELECT id FROM templates 
      WHERE organization_id = $1 AND is_default = true AND deleted_at IS NULL 
      LIMIT 1
    `;
    const res = await db.query(query, [orgId]);
    return res.rows[0] || null;
  }

  async resetDefaults(client, orgId) {
    const query = `
      UPDATE templates 
      SET is_default = false, updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = $1 AND deleted_at IS NULL
    `;
    await client.query(query, [orgId]);
  }

  async create(client, templateData) {
    const query = `
      INSERT INTO templates (
        id, organization_id, name, type, bg_color, border_style, border_color,
        font_family, font_color, logo_visible, god_image_url, god_image_position,
        watermark_url, watermark_opacity, header_text_en, header_text_local,
        footer_text_en, footer_text_local, signature_label, signature_url, is_default
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `;
    const res = await client.query(query, [
      templateData.id,
      templateData.organizationId,
      templateData.name,
      templateData.type,
      templateData.bgColor || '#FFFDD0',
      templateData.borderStyle || 'double',
      templateData.borderColor || '#E65100',
      templateData.fontFamily || 'Poppins',
      templateData.fontColor || '#3E2723',
      templateData.logoVisible !== undefined ? templateData.logoVisible : true,
      templateData.godImageUrl || null,
      templateData.godImagePosition || 'left',
      templateData.watermarkUrl || null,
      templateData.watermarkOpacity !== undefined ? templateData.watermarkOpacity : 0.10,
      templateData.headerTextEn || null,
      templateData.headerTextLocal || null,
      templateData.footerTextEn || null,
      templateData.footerTextLocal || null,
      templateData.signatureLabel || 'Authorized Signatory',
      templateData.signatureUrl || null,
      templateData.isDefault || false,
    ]);
    return res.rows[0];
  }

  async update(id, orgId, templateData) {
    const query = `
      UPDATE templates
      SET name = $1, type = $2, bg_color = $3, border_style = $4, border_color = $5,
          font_family = $6, font_color = $7, logo_visible = $8, god_image_url = $9, god_image_position = $10,
          watermark_url = $11, watermark_opacity = $12, header_text_en = $13, header_text_local = $14,
          footer_text_en = $15, footer_text_local = $16, signature_label = $17, signature_url = $18,
          is_default = $19, updated_at = CURRENT_TIMESTAMP
      WHERE id = $20 AND organization_id = $21 AND deleted_at IS NULL
      RETURNING *
    `;
    const res = await db.query(query, [
      templateData.name,
      templateData.type,
      templateData.bgColor,
      templateData.borderStyle,
      templateData.borderColor,
      templateData.fontFamily,
      templateData.fontColor,
      templateData.logoVisible,
      templateData.godImageUrl,
      templateData.godImagePosition,
      templateData.watermarkUrl,
      templateData.watermarkOpacity,
      templateData.headerTextEn,
      templateData.headerTextLocal,
      templateData.footerTextEn,
      templateData.footerTextLocal,
      templateData.signatureLabel,
      templateData.signatureUrl,
      templateData.isDefault,
      id,
      orgId,
    ]);
    return res.rows[0] || null;
  }

  async setDefault(client, id, orgId) {
    // 1. Reset all
    await client.query(
      'UPDATE templates SET is_default = false, updated_at = CURRENT_TIMESTAMP WHERE organization_id = $1 AND deleted_at IS NULL',
      [orgId]
    );

    // 2. Set active
    const query = `
      UPDATE templates 
      SET is_default = true, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL 
      RETURNING *
    `;
    const res = await client.query(query, [id, orgId]);
    return res.rows[0] || null;
  }
}

module.exports = new TemplateRepository();
