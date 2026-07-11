const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

/**
 * Generates a beautiful traditional Indian PDF receipt.
 * @param {Object} data - Receipt, donor, organization, and template details.
 * @returns {Promise<Buffer>} - Generated PDF as binary buffer.
 */
async function generateReceiptPDF(data) {
  return new Promise(async (resolve, reject) => {
    try {
      const { receipt, donor, organization, template } = data;
      
      // Create PDF Document (A5 landscape size mimics traditional physical receipt books)
      const doc = new PDFDocument({
        size: 'A5',
        layout: 'landscape',
        margin: 20,
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Extract template variables or fallback to defaults
      const bgColor = '#FFFBEF'; // Warm Cream Paper background
      const borderColor = '#E65100'; // Vibrant Saffron
      const fontColor = '#2E1C0C'; // Charcoal Brown
      const bannerColor = '#D84315'; // Red-orange banner
      const darkMaroon = '#3E2723'; // Dark Maroon/Brown

      const headerTextLocal = template.header_text_local || `॥ श्री गणेश प्रसन्न ॥`;
      const headerTextEn = template.header_text_en || `PUBLIC CHARITABLE TRUST`;
      const signatureLabel = template.signature_label || 'Treasurer';

      // 1. Draw Page Background Color
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(bgColor);

      // 2. Draw Traditional Borders
      doc.save();
      doc.strokeColor(borderColor);

      // Outer border
      doc.lineWidth(2.5);
      doc.rect(15, 15, doc.page.width - 30, doc.page.height - 30).stroke();
      // Inner border
      doc.lineWidth(1);
      doc.rect(19, 19, doc.page.width - 38, doc.page.height - 38).stroke();
      doc.restore();

      // Render Template Style 2: Left-Side Ganesha Panel Style
      if (template.type === 'temple') {
        // A. Draw Left Ganesha Column Panel
        doc.save();
        
        // Linear gold gradient
        const grad = doc.linearGradient(20, 20, 130, doc.page.height - 20);
        grad.stop(0, '#FFF9C4').stop(0.5, '#FFCC80').stop(1, '#FFAB91');
        doc.rect(20, 20, 110, doc.page.height - 40).fill(grad);
        
        // Gold panel right border
        doc.strokeColor(borderColor).lineWidth(2.0);
        doc.moveTo(130, 20).lineTo(130, doc.page.height - 20).stroke();
        
        // Inner gold accent line in panel
        doc.strokeColor('#FFD700').lineWidth(0.8);
        doc.rect(23, 23, 104, doc.page.height - 46).stroke();
        
        // Holy salutation
        doc.fillColor('#3E2723');
        doc.fontSize(7.5);
        doc.text('॥ श्री गजानन प्रसन्न ॥', 25, 30, { width: 100, align: 'center' });
        
        // Gold ring and white circle for Ganesha idol placeholder
        doc.fillColor('#FFD700');
        doc.circle(75, doc.page.height / 2 - 10, 26).fill();
        doc.fillColor('#FFFFFF');
        doc.circle(75, doc.page.height / 2 - 10, 24).fill();
        
        doc.fillColor('#D84315');
        doc.fontSize(22);
        doc.text('🐘', 64, doc.page.height / 2 - 20);
        
        // Bottom flowers
        doc.fontSize(10);
        doc.text('🌸 🌼 🌸', 25, doc.page.height - 38, { width: 100, align: 'center' });
        doc.restore();

        // B. Top Metadata Row
        doc.save();
        doc.fillColor(fontColor);
        doc.fontSize(7.5);
        doc.text('स्थापना: १९६२', 145, 24);
        doc.text('रजि. नं.: एफ/११२१७/ठाणे', doc.page.width - 150, 24, { align: 'right', width: 120 });
        doc.restore();

        // C. Organization Header Banner (Dark Maroon Horizontal Band)
        doc.save();
        doc.fillColor(darkMaroon);
        doc.rect(130, 36, doc.page.width - 150, 42).fill();
        
        // Flanking Portraits
        doc.fillColor('#FFCC80'); // Shivaji circle
        doc.circle(162, 57, 13).fill();
        doc.fillColor('#FFFFFF');
        doc.circle(162, 57, 11).fill();
        doc.fillColor('#D84315');
        doc.fontSize(10);
        doc.text('🚩', 157, 52);

        doc.fillColor('#90CAF9'); // Tilak circle
        doc.circle(doc.page.width - 162, 57, 13).fill();
        doc.fillColor('#FFFFFF');
        doc.circle(doc.page.width - 162, 57, 11).fill();
        doc.fillColor('#D84315');
        doc.fontSize(10);
        doc.text('📜', doc.page.width - 167, 52);

        // Name inside banner
        doc.fillColor('#FFEE58'); // Yellow Title
        doc.fontSize(12.5);
        doc.text(organization.name, 180, 42, { align: 'center', width: doc.page.width - 360 });
        
        doc.fillColor('#FFFFFF');
        doc.fontSize(7.5);
        doc.text(template.headerTextEn || 'SHIVNERI FOUNDATION', 180, 58, { align: 'center', width: doc.page.width - 360 });
        doc.restore();

        // D. Subtitle badge
        doc.save();
        doc.fillColor('#FFFFFF');
        doc.strokeColor(bannerColor).lineWidth(1.0);
        // Rounded badge
        const badgeX = doc.page.width / 2 - 35 + 55;
        const badgeY = 82;
        doc.rect(badgeX, badgeY, 70, 14).fillAndStroke();
        doc.fillColor(bannerColor);
        doc.fontSize(8);
        doc.text(template.headerTextLocal || 'सार्वजनिक गणेशोत्सव', badgeX, badgeY + 3, { align: 'center', width: 70 });
        doc.restore();

        // E. Receipt No & Date
        doc.save();
        doc.fillColor(fontColor);
        doc.fontSize(8.5);
        doc.text(`पावती क्र. / No: ${receipt.receipt_number}`, 145, 102);
        
        const receiptDate = new Date(receipt.created_at).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        doc.text(`दिनांक / Date: ${receiptDate}`, doc.page.width - 120, 102);
        doc.restore();

        // F. Fields Underlined Rows
        let currentY = 120;
        _drawPaperField(doc, 'श्री. / श्रीमती / मेसर्स (From):', donor.name, currentY, fontColor, 145, doc.page.width - 30);
        currentY += 22;

        const rupeesWords = numberToWords(parseInt(receipt.amount)) + ' Rupees Only';
        _drawPaperField(doc, 'अक्षरी रुपये (Words):', rupeesWords, currentY, fontColor, 145, doc.page.width - 30);
        currentY += 22;

        _drawPaperField(doc, 'देणगी कारण (Purpose):', receipt.purpose, currentY, fontColor, 145, doc.page.width - 30);

        // G. Bottom Grid
        const bottomY = doc.page.height - 84;
        
        // 1. Rupee Box
        _drawRupeeBoxPdf(doc, receipt, bannerColor, fontColor, 145, bottomY);
        
        // 2. Ink Stamp
        _drawInkStampPdf(doc, doc.page.width / 2 + 50, bottomY);
        
        // 3. QR Code
        await _drawQrCodePdf(doc, receipt, fontColor, doc.page.width - 150, bottomY - 5);
        
        // 4. Signature line
        _drawSignatureLinePdf(doc, signatureLabel, fontColor, doc.page.width - 95, bottomY);

      } else {
        // Render Template Style 1: Classic Top Banner Style (Default)
        
        // 3. Draw Watermark Text in center
        doc.save();
        doc.fillColor(bannerColor);
        doc.fillOpacity(0.06);
        doc.fontSize(44);
        doc.translate(doc.page.width / 2, doc.page.height / 2);
        doc.rotate(-20);
        doc.text(organization.name.toUpperCase(), -200, -20, { width: 400, align: 'center' });
        doc.restore();

        // 4. Solid Saffron Top Banner Block
        doc.save();
        doc.fillColor(bannerColor);
        doc.rect(20, 20, doc.page.width - 40, 52).fill();
        doc.restore();

        // Ganesha white circle placeholder
        doc.save();
        doc.fillColor('#FFFFFF');
        doc.circle(42, 46, 16).fill();
        doc.restore();
        doc.save();
        doc.fillColor('#D84315');
        doc.fontSize(14);
        doc.text('🐘', 33, 39);
        doc.restore();

        // Flag white circle placeholder
        doc.save();
        doc.fillColor('#FFFFFF');
        doc.circle(doc.page.width - 42, 46, 16).fill();
        doc.restore();
        doc.save();
        doc.fillColor('#D84315');
        doc.fontSize(14);
        doc.text('🚩', doc.page.width - 51, 39);
        doc.restore();

        // Middle headings text inside saffron banner
        doc.save();
        doc.fillColor('#FFFFFF');
        doc.fontSize(9);
        doc.text(headerTextLocal, 65, 25, { align: 'center', width: doc.page.width - 130 });
        doc.fontSize(14.5);
        doc.fillColor('#FFEB3B'); // Yellow title
        doc.text(organization.name, 65, 36, { align: 'center', width: doc.page.width - 130 });
        doc.fontSize(8);
        doc.fillColor('#FFFFFF');
        doc.text(headerTextEn, 65, 54, { align: 'center', width: doc.page.width - 130 });
        doc.restore();

        // 5. Receipt Metadata (No. & Date)
        doc.save();
        doc.fillColor(fontColor);
        doc.fontSize(9.5);
        doc.text(`पावती क्र. / Receipt No: ${receipt.receipt_number}`, 30, 84);
        
        const receiptDate = new Date(receipt.created_at).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        doc.text(`दिनांक / Date: ${receiptDate}`, doc.page.width - 130, 84);
        doc.restore();

        // 6. Fields Underlined Rows
        let currentY = 108;
        _drawPaperField(doc, 'श्री. / श्रीमती (Donor):', donor.name, currentY, fontColor, 30, doc.page.width - 30);
        currentY += 24;

        const rupeesWords = numberToWords(parseInt(receipt.amount)) + ' Rupees Only';
        _drawPaperField(doc, 'अक्षरी रुपये (Rupees in words):', rupeesWords, currentY, fontColor, 30, doc.page.width - 30);
        currentY += 24;

        _drawPaperField(doc, 'देणगी कारण (Contribution Purpose):', receipt.purpose, currentY, fontColor, 30, doc.page.width - 30);

        // 7. Bottom Grid
        const bottomY = doc.page.height - 90;
        
        // 1. Rupee Box
        _drawRupeeBoxPdf(doc, receipt, bannerColor, fontColor, 30, bottomY);
        
        // 2. Ink Stamp
        _drawInkStampPdf(doc, doc.page.width / 2 - 35, bottomY);
        
        // 3. QR Code
        await _drawQrCodePdf(doc, receipt, fontColor, doc.page.width - 165, bottomY - 5);
        
        // 4. Signature line
        _drawSignatureLinePdf(doc, signatureLabel, fontColor, doc.page.width - 100, bottomY);
      }

      // Draw PavtiBook watermark footer at the bottom center of the page
      doc.save();
      doc.fillColor('grey');
      doc.fontSize(6);
      doc.text('Powered by PavtiBook • Traditional Trust. Digital Simplicity.', 20, doc.page.height - 24, { align: 'center', width: doc.page.width - 40 });
      doc.restore();

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// --- ACCURATE PDF HELPERS ---

function _drawPaperField(doc, label, value, y, fontColor, startX, endX) {
  doc.save();
  doc.fillColor(fontColor);
  doc.fontSize(9.5);
  doc.text(label, startX, y);
  
  const labelWidth = doc.widthOfString(label);
  const underlineX = startX + labelWidth + 5;
  
  // Draw solid underline
  doc.strokeColor('black').lineWidth(0.8).moveTo(underlineX, y + 10).lineTo(endX, y + 10).stroke();
  
  doc.font('Helvetica-Oblique');
  doc.fontSize(10);
  doc.text(value, underlineX + 5, y - 1);
  doc.restore();
}

function _drawRupeeBoxPdf(doc, receipt, bannerColor, fontColor, x, y) {
  doc.save();
  doc.strokeColor(bannerColor).lineWidth(1.8);
  doc.rect(x, y, 100, 24).stroke();
  
  // Rupee circle
  doc.fillColor(bannerColor);
  doc.circle(x + 12, y + 12, 7.5).fill();
  doc.fillColor('#FFFFFF');
  doc.fontSize(8);
  doc.text('₹', x + 9, y + 8);
  
  doc.fillColor(bannerColor);
  doc.fontSize(11);
  doc.text(`${parseFloat(receipt.amount).toString()}/-`, x + 25, y + 7);
  
  // Labels
  doc.fillColor('grey');
  doc.fontSize(5.5);
  doc.text('धनादेश वटल्यानंतरच पावती ग्राह्य धरली जाईल.', x, y + 28);
  
  doc.fillColor(fontColor);
  doc.fontSize(7);
  doc.text(`Mode: ${receipt.payment_mode.toUpperCase()}`, x, y + 36);
  doc.restore();
}

function _drawInkStampPdf(doc, x, y) {
  doc.save();
  // Tilt stamp for realistic hand-inked rubber look
  doc.translate(x + 35, y + 10);
  doc.rotate(-4);
  
  // Double Rounded Rectangle Border
  doc.strokeColor('#C62828').lineWidth(1.2);
  doc.rect(-35, -10, 70, 20).stroke();
  
  doc.strokeColor('#C62828').lineWidth(0.5);
  doc.rect(-32, -8, 64, 16).stroke();
  
  doc.fillColor('#C62828');
  doc.fontSize(9.5);
  doc.text('धन्यवाद!', -25, -5);
  doc.restore();
}

async function _drawQrCodePdf(doc, receipt, fontColor, x, y) {
  const verificationUrl = `https://pavtibook.in/verify/${receipt.qr_code_value}`;
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 0, width: 44 });
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
  doc.image(qrBuffer, x, y, { width: 38 });
  
  doc.save();
  doc.fillColor(fontColor);
  doc.fontSize(5.5);
  doc.text('पडताळणी QR', x, y + 42, { width: 38, align: 'center' });
  doc.restore();
}

function _drawSignatureLinePdf(doc, signatureLabel, fontColor, x, y) {
  doc.save();
  doc.strokeColor(fontColor).lineWidth(0.5).moveTo(x, y + 14).lineTo(x + 65, y + 14).stroke();
  doc.fillColor(fontColor);
  doc.fontSize(7.5);
  doc.text(signatureLabel, x, y + 18, { width: 65, align: 'center' });
  doc.fontSize(6);
  doc.fillColor('grey');
  doc.text('वसुली अधिकारी (Sign)', x, y + 26, { width: 65, align: 'center' });
  doc.restore();
}

/**
 * Simple utility to translate numbers to English words (Rupees)
 */
function numberToWords(num) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if ((num = num.toString()).length > 9) return 'overflow';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str.trim();
}

module.exports = {
  generateReceiptPDF,
};
