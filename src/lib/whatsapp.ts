/**
 * Centralized WhatsApp Utility Helper for PavtiBook
 * Official Support Number: 919930533929 (+91 9930533929)
 * Supported Config: NEXT_PUBLIC_SUPPORT_WHATSAPP or NEXT_PUBLIC_WHATSAPP_NUMBER
 */

const DEFAULT_SUPPORT_WHATSAPP = "919930533929";

export function getWhatsAppNumber(): string {
  const envNumber =
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ||
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
    DEFAULT_SUPPORT_WHATSAPP;

  // Strip all non-digit characters (+, -, spaces, parentheses)
  const cleaned = envNumber.replace(/[^0-9]/g, "");
  return cleaned.length >= 10 ? cleaned : DEFAULT_SUPPORT_WHATSAPP;
}

export function getFormattedWhatsAppDisplay(): string {
  const num = getWhatsAppNumber();
  if (num.startsWith("91") && num.length === 12) {
    return `+91 ${num.slice(2, 7)} ${num.slice(7)}`;
  }
  return `+${num}`;
}

export function generateWhatsAppLink(message: string): string {
  const number = getWhatsAppNumber();
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function generateDemoWhatsAppLink(orgName?: string): string {
  const msg = orgName && orgName.trim().length > 0
    ? `नमस्कार PavtiBook Team, मला आमच्या मंडळासाठी (${orgName.trim()}) PavtiBook Demo पाहिजे आहे.`
    : "नमस्कार PavtiBook Team, मला PavtiBook चा Free Demo पाहिजे आहे.";
  return generateWhatsAppLink(msg);
}

export function generateSupportWhatsAppLink(): string {
  return generateWhatsAppLink("नमस्कार PavtiBook Team, मला PavtiBook बद्दल माहिती हवी आहे.");
}

export function generatePricingWhatsAppLink(planName?: string): string {
  const msg = planName
    ? `नमस्कार PavtiBook Team, मला ${planName} Plan बद्दल माहिती हवी आहे.`
    : "नमस्कार PavtiBook Team, मला Subscription Plans बद्दल माहिती हवी आहे.";
  return generateWhatsAppLink(msg);
}
