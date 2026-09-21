const fs = require('fs');
const f = 'src/app/verify/[id]/VerifyPage.tsx';
let txt = fs.readFileSync(f, 'utf8');

if (!txt.includes('import React, { useEffect } from')) {
    txt = txt.replace('import React from', 'import React, { useEffect } from');
}

if (!txt.includes('useEffect(() => {')) {
    const replacement = `export default function VerifyPage({ token, result }: Props) {
  // Hide WhatsApp floating widgets
  useEffect(() => {
    const hideWidgets = () => {
      const widget = document.getElementById("wa-widget");
      if (widget) widget.style.display = "none";
      const efaWidget = document.querySelector(".elfsight-app-whatsapp-chat");
      if (efaWidget) (efaWidget).style.display = "none";
    };
    hideWidgets();
    const timeoutId = setTimeout(hideWidgets, 1500);
    return () => clearTimeout(timeoutId);
  }, []);`;
    
    txt = txt.replace('export default function VerifyPage({ token, result }: Props) {', replacement);
}

fs.writeFileSync(f, txt, 'utf8');
