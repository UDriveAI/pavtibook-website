/**
 * Centralized Contact & WhatsApp Utility Helper for PavtiBook
 * Official WhatsApp Number: 919653333929 (+91 9653333929)
 * Official Call Number: 919930533929 (+91 9930533929)
 * Official Google Play Store URL: https://play.google.com/store/apps/details?id=com.pavtibook.app
 */

export const OFFICIAL_WHATSAPP_NUMBER = "919653333929";
export const OFFICIAL_CALL_NUMBER = "919930533929";
export const OFFICIAL_PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.pavtibook.app";

export function getWhatsAppNumber(): string {
  const envNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ||
    OFFICIAL_WHATSAPP_NUMBER;

  // Strip all non-digit characters (+, -, spaces, parentheses)
  const cleaned = envNumber.replace(/[^0-9]/g, "");
  return cleaned.length >= 10 ? cleaned : OFFICIAL_WHATSAPP_NUMBER;
}

export function getCallNumber(): string {
  const envNumber =
    process.env.NEXT_PUBLIC_CALL_NUMBER ||
    OFFICIAL_CALL_NUMBER;

  const cleaned = envNumber.replace(/[^0-9]/g, "");
  return cleaned.length >= 10 ? cleaned : OFFICIAL_CALL_NUMBER;
}

export function getFormattedWhatsAppDisplay(): string {
  const num = getWhatsAppNumber();
  if (num.startsWith("91") && num.length === 12) {
    return `+91 ${num.slice(2, 7)} ${num.slice(7)}`;
  }
  return `+${num}`;
}

export function getFormattedCallDisplay(): string {
  const num = getCallNumber();
  if (num.startsWith("91") && num.length === 12) {
    return `+91 ${num.slice(2, 7)} ${num.slice(7)}`;
  }
  return `+${num}`;
}

export function getCallTelLink(): string {
  return `tel:+${getCallNumber()}`;
}

export function generateWhatsAppLink(message: string): string {
  const number = getWhatsAppNumber();
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function generateDemoWhatsAppLink(orgName?: string): string {
  const msg = orgName && orgName.trim().length > 0
    ? `नमस्कार, मला आमच्या मंडळासाठी (${orgName.trim()}) PavtiBook चा Demo हवा आहे.`
    : "नमस्कार, मला PavtiBook चा Demo हवा आहे.";
  return generateWhatsAppLink(msg);
}

export function generateSupportWhatsAppLink(): string {
  return generateWhatsAppLink("नमस्कार, मला PavtiBook बद्दल माहिती हवी आहे.");
}

export function generatePricingWhatsAppLink(planName?: string): string {
  const msg = planName
    ? `नमस्कार, मला ${planName} Plan बद्दल माहिती हवी आहे.`
    : "नमस्कार, मला Subscription Plans बद्दल माहिती हवी आहे.";
  return generateWhatsAppLink(msg);
}
