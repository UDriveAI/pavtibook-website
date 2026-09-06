"use client";

import React from "react";

interface VerificationResult {
  isValid: boolean;
  isDeleted?: boolean;
  receiptNumber?: string;
  donorName?: string;
  donorMobile?: string;
  amount?: number;
  purpose?: string;
  paymentMode?: string;
  paymentStatus?: string;
  date?: string;
  organizationName?: string;
  organizationType?: string;
  logoUrl?: string;
  collectorName?: string;
  isOrganizationVerified?: boolean;
  languageCode?: string;
  message?: string;
  error?: boolean;
}

interface Props {
  token: string;
  result: VerificationResult;
}

const SYSTEM_LABELS: Record<string, Record<string, string>> = {
  mr: {
    greeting: "॥ श्री गणेशाय नमः ॥",
    orgSubtitleFallback: "सार्वजनिक उत्सव मंडळ",
    receiptBadge: "॥ अधिकृत देणगी पावती ॥ · DONATION RECEIPT",
    receiptNo: "पावती क्र.:",
    date: "दिनांक:",
    donorTitle: "देणगीदाराचे नाव (Donor Name):",
    donorPrefix: "श्री / मे. ",
    donorFallback: "श्री / देणगीदार",
    purpose: "कारण / Purpose:",
    purposeFallback: "वर्गणी / उत्सव देणगी",
    paymentMode: "पेमेंट पद्धत / Mode:",
    amountTitle: "प्राप्त देणगी रक्कम (Contribution Amount)",
    wordsPrefix: "अक्षरी: ",
    signaturesTitle: "अधिकृत स्वाक्षऱ्या (Authorized Signatures)",
    president: "President / अध्यक्ष",
    treasurer: "Treasurer / कोषाध्यक्ष",
    secretary: "Secretary / सचिव",
    sealText: "अधिकृत शिक्का · OFFICIAL SEAL",
    verifiedBadge: "✓ VERIFIED DIGITAL RECEIPT · PAVTIBOOK",
    thankYou: "आपल्या सहकार्याबद्दल व अमूल्य देणगीबद्दल मनःपूर्वक धन्यवाद! 🙏",
    footerAudit: "ही एक अधिकृत डिजिटल पावती आहे. संगणकीय प्रणालीद्वारे तयार करण्यात आलेली असल्यामुळे यावर प्रत्यक्ष स्वाक्षरीची आवश्यकता नाही.",
    voidTitle: "ही पावती सध्या उपलब्ध नाही",
    voidSub: "This receipt is no longer available (Voided / Cancelled)",
    voidDesc: "सदर पावती अधिकृत अधिकाऱ्यांद्वारे रद्द (Voided / Cancelled) करण्यात आली आहे. सुरक्षेच्या नियमांनुसार रद्द केलेल्या पावतीचा तपशील सार्वजनिकरीत्या उपलब्ध केला जात नाही.",
  },
  hi: {
    greeting: "॥ श्री गणेशाय नमः ॥",
    orgSubtitleFallback: "सार्वजनिक उत्सव मंडल / ट्रस्ट",
    receiptBadge: "॥ अधिकृत दान रसीद ॥ · DONATION RECEIPT",
    receiptNo: "रसीद क्र.:",
    date: "दिनांक:",
    donorTitle: "दानदाता का नाम (Donor Name):",
    donorPrefix: "श्री / मे. ",
    donorFallback: "श्री / दानदाता",
    purpose: "उद्देश्य / Purpose:",
    purposeFallback: "दान / उत्सव सहयोग",
    paymentMode: "भुगतान पद्धति / Mode:",
    amountTitle: "प्राप्त दान राशि (Donation Amount)",
    wordsPrefix: "शब्दों में: ",
    signaturesTitle: "अधिकृत हस्ताक्षर (Authorized Signatures)",
    president: "President / अध्यक्ष",
    treasurer: "Treasurer / कोषाध्यक्ष",
    secretary: "Secretary / सचिव",
    sealText: "अधिकृत मुहर · OFFICIAL SEAL",
    verifiedBadge: "✓ VERIFIED DIGITAL RECEIPT · PAVTIBOOK",
    thankYou: "आपके अमूल्य दान व सहयोग के लिए हार्दिक धन्यवाद! 🙏",
    footerAudit: "यह एक अधिकृत डिजिटल रसीद है। कंप्यूटर प्रणाली द्वारा जनरेट होने के कारण इस पर भौतिक हस्ताक्षर की आवश्यकता नहीं है।",
    voidTitle: "यह रसीद वर्तमान में उपलब्ध नहीं है",
    voidSub: "This receipt is no longer available (Voided / Cancelled)",
    voidDesc: "यह रसीद अधिकृत अधिकारियों द्वारा रद्द (Voided / Cancelled) कर दी गई है। सुरक्षा नियमों के अनुसार रद्द की गई रसीद का विवरण सार्वजनिक रूप से नहीं दिखाया जाता।",
  },
  en: {
    greeting: "॥ Shree Ganeshay Namah ॥",
    orgSubtitleFallback: "Public Trust / NGO / Association",
    receiptBadge: "OFFICIAL DONATION RECEIPT",
    receiptNo: "Receipt No.:",
    date: "Date:",
    donorTitle: "Donor Name:",
    donorPrefix: "Mr. / M/s. ",
    donorFallback: "Donor",
    purpose: "Purpose:",
    purposeFallback: "Donation / Contribution",
    paymentMode: "Payment Mode:",
    amountTitle: "Donation Amount",
    wordsPrefix: "In Words: ",
    signaturesTitle: "Authorized Signatures",
    president: "President",
    treasurer: "Treasurer",
    secretary: "Secretary",
    sealText: "OFFICIAL SEAL",
    verifiedBadge: "✓ VERIFIED DIGITAL RECEIPT · PAVTIBOOK",
    thankYou: "Thank you for your generous contribution and support! 🙏",
    footerAudit: "This is an authenticated computer-generated digital receipt. No physical signature is required.",
    voidTitle: "This receipt is no longer available",
    voidSub: "This receipt is no longer available (Voided / Cancelled)",
    voidDesc: "This receipt has been voided/cancelled by the authorized organization officer. Details of cancelled receipts are not publicly displayed.",
  },
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return dateStr;
  }
}

function formatAmount(amount?: number): string {
  if (amount === undefined || amount === null) return "₹ 0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPaymentMode(mode?: string): string {
  if (!mode) return "रोख (Cash)";
  const m = mode.toLowerCase();
  if (m.includes("cash") || m.includes("रोख")) return "रोख (Cash)";
  if (m.includes("upi")) return "UPI";
  if (m.includes("gpay") || m.includes("google")) return "Google Pay";
  if (m.includes("phone")) return "PhonePe";
  if (m.includes("cheque") || m.includes("चेक")) return "चेक (Cheque)";
  if (m.includes("bank") || m.includes("neft")) return "Bank Transfer";
  return mode;
}

function convertNumberToWords(num: number): string {
  if (num === 0) return "Zero Rupees Only";
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + inWords(n % 100) : "");
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + inWords(n % 10000000) : "");
  }

  const integerPart = Math.floor(num);
  return inWords(integerPart) + " Rupees Only";
}

export default function VerifyPage({ token, result }: Props) {
  const isDeleted = result.isDeleted === true;
  const isValid = result.isValid === true && !isDeleted;
  const isError = result.error === true;

  const langKey = (result.languageCode === "en" || result.languageCode === "hi") ? result.languageCode : "mr";
  const L = SYSTEM_LABELS[langKey] || SYSTEM_LABELS.mr;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      const url = window.location.href;
      const text = `🙏 ${L.receiptBadge}:\n${url}`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8F1E7",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 16px 48px",
        fontFamily: "'Noto Sans Devanagari', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <style>{`
        @media print {
          body {
            background: #fff !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .receipt-sheet {
            box-shadow: none !important;
            border: 2px solid #8B1E2D !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* Top Brand Bar (no-print) */}
      <div className="no-print" style={{ textAlign: "center", marginBottom: "16px" }}>
        <a
          href="https://pavtibook.online"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            textDecoration: "none",
            color: "#8B1E2D",
            fontWeight: 800,
            fontSize: "20px",
            letterSpacing: "-0.02em",
          }}
        >
          <span style={{ fontSize: "24px" }}>🧾</span>
          <span>PavtiBook</span>
        </a>
        <p style={{ fontSize: "12px", color: "#795548", margin: "2px 0 0", fontWeight: 600 }}>
          Digital Donation Receipt Engine · डिजिटल पावती
        </p>
      </div>

      {/* ============================================================ */}
      {/* CASE 1: RECEIPT IS DELETED / VOIDED                           */}
      {/* STRICT: SHOW ONLY VOID NOTICE — ZERO RECEIPT DETAILS LEAKED  */}
      {/* ============================================================ */}
      {isDeleted && (
        <div
          style={{
            width: "100%",
            maxWidth: "500px",
            background: "#FFFFFF",
            borderRadius: "16px",
            boxShadow: "0 8px 30px rgba(185, 28, 28, 0.12)",
            border: "2px solid #DC2626",
            overflow: "hidden",
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #991B1B 0%, #7F1D1D 100%)",
              color: "#FFFFFF",
              padding: "32px 20px",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: "32px",
              }}
            >
              🚫
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
              {L.voidTitle}
            </h1>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.9)", margin: 0, fontWeight: 500 }}>
              {L.voidSub}
            </p>
          </div>

          <div style={{ padding: "28px 24px", color: "#374151", lineHeight: 1.6 }}>
            <p style={{ fontSize: "14px", margin: "0 0 14px", color: "#4B5563" }}>
              {L.voidDesc}
            </p>
            <div
              style={{
                marginTop: "20px",
                padding: "10px 14px",
                background: "#FEF2F2",
                borderRadius: "8px",
                border: "1px solid #FCA5A5",
                fontSize: "12px",
                color: "#991B1B",
                fontWeight: 600,
              }}
            >
              🔒 अधिकृत सुरक्षा इशारा · PavtiBook Audit-Safe Record
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CASE 2: AUTHENTIC DIGITAL RECEIPT (VALID)                    */}
      {/* ============================================================ */}
      {isValid && (
        <div
          className="receipt-sheet"
          style={{
            width: "100%",
            maxWidth: "540px",
            background: "#FFFDF9",
            borderRadius: "16px",
            boxShadow: "0 10px 36px rgba(139, 30, 45, 0.12), 0 2px 8px rgba(0,0,0,0.04)",
            border: "2.5px solid #8B1E2D",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Traditional Auspicious Header Banner */}
          <div
            style={{
              background: "#8B1E2D",
              color: "#FFF2D6",
              textAlign: "center",
              padding: "8px 12px",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "1.5px",
              borderBottom: "2px solid #D97706",
            }}
          >
            {L.greeting}
          </div>

          <div style={{ padding: "24px 24px 20px" }}>
            {/* Organization Header */}
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  color: "#8B1E2D",
                  lineHeight: 1.25,
                  letterSpacing: "-0.01em",
                }}
              >
                {result.organizationName ?? "PavtiBook Trust"}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#78350F",
                  marginTop: "4px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <span>{result.organizationType ?? L.orgSubtitleFallback}</span>
                {result.isOrganizationVerified && (
                  <span
                    style={{
                      background: "#15803D",
                      color: "#FFFFFF",
                      fontSize: "10px",
                      fontWeight: 700,
                      borderRadius: "12px",
                      padding: "1px 8px",
                    }}
                  >
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>

            {/* Receipt Type Pill */}
            <div
              style={{
                textAlign: "center",
                margin: "12px 0 16px",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
                  border: "1.5px solid #D97706",
                  borderRadius: "20px",
                  padding: "4px 18px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#92400E",
                  letterSpacing: "0.5px",
                }}
              >
                {L.receiptBadge}
              </div>
            </div>

            {/* Meta Strip: Receipt No & Date */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                background: "rgba(139, 30, 45, 0.05)",
                borderRadius: "8px",
                border: "1px dashed rgba(139, 30, 45, 0.2)",
                fontSize: "12.5px",
                marginBottom: "18px",
              }}
            >
              <div>
                <span style={{ color: "#78350F", fontWeight: 600 }}>{L.receiptNo} </span>
                <span style={{ fontWeight: 800, color: "#8B1E2D" }}>{result.receiptNumber ?? "—"}</span>
              </div>
              <div>
                <span style={{ color: "#78350F", fontWeight: 600 }}>{L.date} </span>
                <span style={{ fontWeight: 700, color: "#1F2937" }}>{formatDate(result.date)}</span>
              </div>
            </div>

            {/* Main Donor Details Box */}
            <div
              style={{
                border: "1px solid #E5E7EB",
                borderRadius: "10px",
                padding: "14px 16px",
                background: "#FFFFFF",
                marginBottom: "18px",
              }}
            >
              <div style={{ marginBottom: "10px" }}>
                <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 600 }}>
                  {L.donorTitle}
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "#111827",
                    marginTop: "2px",
                  }}
                >
                  {result.donorName ? `${L.donorPrefix}${result.donorName}` : L.donorFallback}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  paddingTop: "10px",
                  borderTop: "1px solid #F3F4F6",
                }}
              >
                <div>
                  <div style={{ fontSize: "11.5px", color: "#6B7280", fontWeight: 600 }}>
                    {L.purpose}
                  </div>
                  <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#8B1E2D", marginTop: "2px" }}>
                    {result.purpose ?? L.purposeFallback}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "11.5px", color: "#6B7280", fontWeight: 600 }}>
                    {L.paymentMode}
                  </div>
                  <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#15803D", marginTop: "2px" }}>
                    {formatPaymentMode(result.paymentMode)} · PAID
                  </div>
                </div>
              </div>
            </div>

            {/* Grand Amount Spotlight */}
            <div
              style={{
                background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
                border: "2px solid #D97706",
                borderRadius: "12px",
                padding: "16px",
                textAlign: "center",
                marginBottom: "18px",
                boxShadow: "0 4px 12px rgba(217, 119, 6, 0.15)",
              }}
            >
              <div style={{ fontSize: "12px", color: "#92400E", fontWeight: 700, textTransform: "uppercase" }}>
                {L.amountTitle}
              </div>
              <div
                style={{
                  fontSize: "34px",
                  fontWeight: 900,
                  color: "#8B1E2D",
                  letterSpacing: "-0.02em",
                  margin: "4px 0",
                }}
              >
                {formatAmount(result.amount)}
              </div>
              <div style={{ fontSize: "12px", color: "#78350F", fontWeight: 600, fontStyle: "italic" }}>
                ({L.wordsPrefix}{convertNumberToWords(result.amount ?? 0)})
              </div>
            </div>

            {/* Signatures & Seal Section */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                padding: "16px 8px 6px",
                borderTop: "1.5px dashed rgba(139, 30, 45, 0.2)",
              }}
            >
              <div style={{ textAlign: "center", width: "140px" }}>
                <div style={{ height: "30px" }}></div>
                <div
                  style={{
                    borderTop: "1.5px solid #8B1E2D",
                    paddingTop: "4px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#8B1E2D",
                  }}
                >
                  {L.treasurer}
                </div>
                <div style={{ fontSize: "10.5px", color: "#6B7280" }}>Authorized Signatory</div>
              </div>

              {/* Digital Seal Emblem */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "rgba(22, 101, 52, 0.1)",
                    border: "2px solid #166534",
                    color: "#166534",
                    fontSize: "22px",
                    fontWeight: 900,
                  }}
                >
                  ✓
                </div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#166534", marginTop: "2px" }}>
                  AUTHENTIC
                </div>
              </div>

              <div style={{ textAlign: "center", width: "140px" }}>
                <div style={{ height: "30px" }}></div>
                <div
                  style={{
                    borderTop: "1.5px solid #8B1E2D",
                    paddingTop: "4px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#8B1E2D",
                  }}
                >
                  {result.collectorName ?? L.president}
                </div>
                <div style={{ fontSize: "10.5px", color: "#6B7280" }}>Receiver</div>
              </div>
            </div>

            {/* Bottom Authenticity Note */}
            <div
              style={{
                marginTop: "16px",
                padding: "8px 12px",
                background: "#F9FAFB",
                borderRadius: "8px",
                textAlign: "center",
                fontSize: "11px",
                color: "#6B7280",
                border: "1px solid #E5E7EB",
              }}
            >
              🔒 {L.footerAudit}
            </div>
          </div>

          {/* Action Buttons Bar (no-print) */}
          <div
            className="no-print"
            style={{
              background: "#F8F1E7",
              padding: "16px 24px",
              borderTop: "1.5px solid #E5E7EB",
              display: "flex",
              gap: "12px",
            }}
          >
            <button
              onClick={handlePrint}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: "#8B1E2D",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "10px",
                padding: "12px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(139, 30, 45, 0.25)",
              }}
            >
              <span>📄</span>
              <span>Download / Print (PDF)</span>
            </button>

            <button
              onClick={handleShare}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: "#25D366",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "10px",
                padding: "12px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(37, 211, 102, 0.25)",
              }}
            >
              <span>💬</span>
              <span>Share on WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CASE 3: INVALID RECEIPT                                      */}
      {/* ============================================================ */}
      {!isValid && !isDeleted && (
        <div
          style={{
            width: "100%",
            maxWidth: "440px",
            background: "#FFFFFF",
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            border: "1px solid #E5E7EB",
            overflow: "hidden",
            textAlign: "center",
            padding: "36px 24px",
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚠️</div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1F2937", margin: "0 0 8px" }}>
            {isError ? "सेवा तात्पुरती अनुपलब्ध आहे" : "अवैध पावती / Invalid Receipt"}
          </h2>
          <p style={{ fontSize: "13px", color: "#6B7280", margin: "0 0 16px", lineHeight: 1.5 }}>
            {isError
              ? "पडताळणी सर्व्हर तात्पुरता अनुपलब्ध आहे. कृपया काही वेळानंतर प्रयत्न करा."
              : "ही पावती PavtiBook प्रणालीमध्ये सापडली नाही. कृपया लिंक किंवा QR कोड तपासा."}
          </p>
          <div
            style={{
              fontSize: "12px",
              color: "#9CA3AF",
              background: "#F3F4F6",
              padding: "6px 12px",
              borderRadius: "6px",
              wordBreak: "break-all",
            }}
          >
            Token: {token}
          </div>
        </div>
      )}

      {/* Subtle Footer (no-print) */}
      <div className="no-print" style={{ textAlign: "center", marginTop: "24px" }}>
        <p style={{ fontSize: "11px", color: "#9CA3AF", margin: 0 }}>
          Powered by <strong style={{ color: "#8B1E2D" }}>PavtiBook</strong> · India&apos;s #1 Digital Receipt Platform
        </p>
      </div>
    </div>
  );
}
