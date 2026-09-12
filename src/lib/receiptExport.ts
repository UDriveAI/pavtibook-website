import { jsPDF } from "jspdf";
import { toPng, toJpeg } from "html-to-image";

/**
 * Receipt Export Utility for PavtiBook Web
 * Implements F17 (PDF generation), F18 (JPG export), F19 (Print), F20 (WhatsApp share)
 */

export interface ExportReceiptData {
  id: string;
  receiptNumber: string;
  donorName: string;
  amount: number;
  purpose: string;
  createdAt: string;
  qrCodeValue?: string;
}

/**
 * Generate and download high-resolution JPG image of the receipt element
 */
export async function exportReceiptAsJpg(
  element: HTMLElement,
  fileName: string = "receipt.jpg"
): Promise<string> {
  const dataUrl = await toJpeg(element, {
    quality: 0.95,
    pixelRatio: 2, // High DPI for crystal-clear text
    backgroundColor: "#FFFDD0",
  });

  const link = document.createElement("a");
  link.download = fileName.endsWith(".jpg") ? fileName : `${fileName}.jpg`;
  link.href = dataUrl;
  link.click();

  return dataUrl;
}

/**
 * Generate and download actual downloadable PDF of the receipt element
 */
export async function exportReceiptAsPdf(
  element: HTMLElement,
  fileName: string = "receipt.pdf"
): Promise<void> {
  const pngDataUrl = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: "#FFFDD0",
  });

  // Calculate PDF orientation based on aspect ratio
  const width = element.offsetWidth || 1536;
  const height = element.offsetHeight || 1024;
  const isLandscape = width >= height;

  const pdf = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "pt",
    format: isLandscape ? [width, height] : [height, width],
  });

  pdf.addImage(pngDataUrl, "PNG", 0, 0, width, height, undefined, "FAST");
  pdf.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
}

/**
 * Trigger clean receipt-only print dialog
 */
export function printReceipt(): void {
  window.print();
}

/**
 * Builds formatted date matching Android sharing_service.dart formatReceiptDate
 */
export function formatReceiptDate(raw: string): string {
  if (!raw || !raw.trim()) return "Today";
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    }
  } catch {
    // fallback
  }
  return raw;
}

/**
 * Build WhatsApp Share URL and message text with exact Android parity
 * Supports English ('en'), Marathi ('mr'), Hindi ('hi')
 */
export function buildWhatsAppShareUrl(options: {
  receipt: {
    receiptNumber: string;
    donorName?: string;
    donorMobile?: string;
    amount: number;
    purpose: string;
    createdAt: string;
    id?: string;
  };
  orgName: string;
  languageCode?: string;
  receiptPublicUrl?: string;
}): string {
  const { receipt, orgName, languageCode = "mr", receiptPublicUrl } = options;
  const code = ["hi", "en"].includes(languageCode.toLowerCase().trim())
    ? languageCode.toLowerCase().trim()
    : "mr";

  const formattedDate = formatReceiptDate(receipt.createdAt);
  const amountStr = Math.floor(receipt.amount).toString();
  const cleanDonorName = receipt.donorName?.trim();
  const hasReceiptUrl = Boolean(receiptPublicUrl && receiptPublicUrl.trim());

  let message = "";
  if (code === "hi") {
    const donorGreeting = cleanDonorName || "दानदाता";
    const urlLine = hasReceiptUrl ? `\n🔗 डिजिटल रसीद देखें: ${receiptPublicUrl?.trim()}\n` : "";
    message =
      `🙏 नमस्कार ${donorGreeting}\n\n` +
      `आपका ₹${amountStr} का दान सफलतापूर्वक प्राप्त हुआ है।\n\n` +
      `🧾 रसीद क्र. / Receipt No: ${receipt.receiptNumber}\n` +
      `🏛 संस्था / Organization: ${orgName}\n` +
      `🌸 उद्देश्य / Purpose: ${receipt.purpose}\n` +
      `📅 दिनांक / Date: ${formattedDate}\n` +
      `${urlLine}\n` +
      `धन्यवाद!\n— PavtiBook`;
  } else if (code === "en") {
    const donorGreeting = cleanDonorName || "Donor";
    const urlLine = hasReceiptUrl ? `\n🔗 View Digital Receipt: ${receiptPublicUrl?.trim()}\n` : "";
    message =
      `🙏 Hello ${donorGreeting},\n\n` +
      `Your contribution of ₹${amountStr} has been received successfully.\n\n` +
      `🧾 Receipt No: ${receipt.receiptNumber}\n` +
      `🏛 Organization: ${orgName}\n` +
      `🌸 Purpose: ${receipt.purpose}\n` +
      `📅 Date: ${formattedDate}\n` +
      `${urlLine}\n` +
      `Thank you!\n— PavtiBook`;
  } else {
    // Default Marathi ('mr')
    const donorGreeting = cleanDonorName || "देणगीदार";
    const urlLine = hasReceiptUrl ? `\n🔗 डिजिटल पावती पहा: ${receiptPublicUrl?.trim()}\n` : "";
    message =
      `🙏 नमस्कार ${donorGreeting}\n\n` +
      `आपली ₹${amountStr} वर्गणी यशस्वीरित्या प्राप्त झाली आहे.\n\n` +
      `🧾 पावती क्र. / Receipt No: ${receipt.receiptNumber}\n` +
      `🏛 संस्था / Organization: ${orgName}\n` +
      `🌸 कारण / Purpose: ${receipt.purpose}\n` +
      `📅 दिनांक / Date: ${formattedDate}\n` +
      `${urlLine}\n` +
      `धन्यवाद.\n— PavtiBook`;
  }

  // Format mobile to international digits
  let targetMobile = "";
  if (receipt.donorMobile) {
    const cleanDigits = receipt.donorMobile.replace(/\D/g, "");
    if (cleanDigits.length === 10) {
      targetMobile = `91${cleanDigits}`;
    } else if (cleanDigits.length > 10) {
      targetMobile = cleanDigits.startsWith("91") ? cleanDigits : `91${cleanDigits.slice(-10)}`;
    }
  }

  const encodedText = encodeURIComponent(message);
  if (targetMobile) {
    return `https://wa.me/${targetMobile}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Generate CSV export content with UTF-8 BOM (\uFEFF) for Excel Marathi/Hindi support
 */
export function generateReceiptsCsv(receipts: Array<{
  receiptNumber: string;
  date: string;
  donorName: string;
  donorMobile: string;
  amount: number;
  purpose: string;
  paymentMode: string;
  paymentStatus: string;
  collectedBy?: string;
  isDeleted?: boolean;
}>): string {
  const headers = [
    "Receipt No (पावती क्र)",
    "Date (दिनांक)",
    "Donor Name (देणगीदार)",
    "Mobile (मोबाईल)",
    "Amount (रक्कम)",
    "Purpose (कारण)",
    "Payment Mode (पेमेंट पद्धत)",
    "Status (स्थिती)",
    "Collector (जमाकर्ता)",
    "Deleted (रद्द)",
  ];

  const escapeCsv = (val: unknown) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = receipts.map((r) => [
    escapeCsv(r.receiptNumber),
    escapeCsv(r.date),
    escapeCsv(r.donorName),
    escapeCsv(r.donorMobile),
    escapeCsv(r.amount),
    escapeCsv(r.purpose),
    escapeCsv(r.paymentMode),
    escapeCsv(r.paymentStatus),
    escapeCsv(r.collectedBy || ""),
    escapeCsv(r.isDeleted ? "Yes" : "No"),
  ]);

  const csvBody = [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
  // Prepend UTF-8 BOM (\uFEFF) for proper Devnagari display in Microsoft Excel
  return "\uFEFF" + csvBody;
}

/**
 * Helper to download CSV in browser
 */
export function downloadCsv(csvContent: string, fileName: string = "receipts.csv"): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName.endsWith(".csv") ? fileName : `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
