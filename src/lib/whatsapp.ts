/**
 * WhatsApp Utility Helper for PavtiBook
 * Official Number: +91 9930533929
 * Environment: NEXT_PUBLIC_WHATSAPP_NUMBER=919930533929
 */

export function getWhatsAppNumber(): string | null {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (!number || number.trim().length === 0) {
    if (typeof window !== "undefined") {
      console.warn("WhatsApp Support Not Configured: NEXT_PUBLIC_WHATSAPP_NUMBER environment variable is missing.");
    }
    return null;
  }
  return number.replace(/[\s+()-]+/g, "");
}

export function generateWhatsAppLink(message: string): string | null {
  const number = getWhatsAppNumber();
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function generateDemoWhatsAppLink(): string | null {
  return generateWhatsAppLink("नमस्कार PavtiBook Team, मला Demo पाहिजे आहे.");
}

export function generateSupportWhatsAppLink(): string | null {
  return generateWhatsAppLink("नमस्कार PavtiBook Team, मला PavtiBook बद्दल माहिती हवी आहे.");
}
