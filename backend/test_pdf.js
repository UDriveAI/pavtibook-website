const fs = require('fs');
const path = require('path');
const { generateReceiptPDF } = require('./src/utils/pdfEngine');

const mockData = {
  receipt: {
    receipt_number: 'PB-A-0001',
    amount: 1001,
    purpose: 'Ganesh Utsav Aarti Sponsor',
    payment_mode: 'upi',
    qr_code_value: 'verify_test_token_123',
    created_at: new Date().toISOString()
  },
  donor: {
    name: 'Dilip Kumar Joshi',
    mobile: '9876543210'
  },
  organization: {
    name: 'Shivneri Krida Mandal',
    logo_url: null
  }
};

async function test() {
  console.log('Testing PDF generation for Ganesh Mandal style...');
  const dataMandal = {
    ...mockData,
    template: {
      type: 'ganesh_mandal',
      header_text_local: '॥ श्री गणेश प्रसन्न ॥',
      header_text_en: 'JAY MAHARASHTRA GANESHOTSAV MANDAL',
      signature_label: 'Treasurer Mandal'
    }
  };
  
  const bufferMandal = await generateReceiptPDF(dataMandal);
  fs.writeFileSync(path.join(__dirname, 'db/test_receipt_mandal.pdf'), bufferMandal);
  console.log('Mandal PDF generated at backend/db/test_receipt_mandal.pdf');

  console.log('Testing PDF generation for Temple style...');
  const dataTemple = {
    ...mockData,
    template: {
      type: 'temple',
      header_text_local: 'सार्वजनिक गणेशोत्सव',
      header_text_en: 'SHIVNERI KRIDA MANDAL',
      signature_label: 'Trust Administrator'
    }
  };
  
  const bufferTemple = await generateReceiptPDF(dataTemple);
  fs.writeFileSync(path.join(__dirname, 'db/test_receipt_temple.pdf'), bufferTemple);
  console.log('Temple PDF generated at backend/db/test_receipt_temple.pdf');
}

test().catch(console.error);
