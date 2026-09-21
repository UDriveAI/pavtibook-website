const fs = require('fs');
const f = 'src/app/d/[orgId]/DonationClientFlow.tsx';
let txt = fs.readFileSync(f, 'utf8');
txt = txt.replace(/const getButtonText = \(\) => \{[\s\S]*?return "SELECT DONATION AMOUNT";\s*\};/, 'const getButtonText = () => {\n    if (isSubmitting) return "Initiating...";\n    if (amount && parseFloat(amount) > 0) return `PAY ₹${amount}`;\n    return "SELECT DONATION AMOUNT";\n  };');
fs.writeFileSync(f, txt, 'utf8');
