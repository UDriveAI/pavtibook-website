const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
if (!saJson) {
  console.log('No credentials');
  process.exit(0);
}

const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(saJson)) });
const db = getFirestore(app);

async function check() {
  const orgId = 'G6Bwjna0WrPctK1Mo6jB';
  const org = await db.collection('organizations').doc(orgId).get();
  console.log('Org exists:', org.exists);
  if (org.exists) {
    const data = org.data();
    console.log('UPI ID:', data.upiId || data.upi_id);
  }
  
  const interest = await db.collection('smart_donation_qr_interest').doc('org_' + orgId).get();
  console.log('Interest exists:', interest.exists);
  if (interest.exists) {
    console.log('Status:', interest.data().status);
  }
}

check().catch(console.error);
