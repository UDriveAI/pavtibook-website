"use client";

import React, { useEffect } from "react";

interface VerificationResult {
  isValid: boolean;
  isDeleted?: boolean;
  id?: string;
  pdfUrl?: string;
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
  receiptImageUrl?: string;
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
    receiptBadge: "॥ अधिकृत देणगी पावती ॥",
    receiptNo: "पावती क्र.:",
    date: "दिनांक:",
    donorTitle: "देणगीदाराचे नाव:",
    donorPrefix: "श्री / मे. ",
    donorFallback: "श्री / देणगीदार",
    purpose: "उद्देश / कारण:",
    purposeFallback: "वर्गणी / उत्सव देणगी",
    paymentMode: "पेमेंट पद्धत:",
    amountTitle: "प्राप्त देणगी रक्कम",
    wordsPrefix: "अक्षरी: ",
    signaturesTitle: "अधिकृत स्वाक्षऱ्या",
    president: "अध्यक्ष",
    treasurer: "कोषाध्यक्ष",
    secretary: "सचिव",
    authorizedSignatory: "अधिकृत स्वाक्षरी",
    receiver: "स्वीकारकर्ता",
    sealText: "अधिकृत शिक्का",
    verifiedBadge: "✓ अधिकृत डिजिटल पावती · पावतीबुक",
    orgVerifiedBadge: "✓ पडताळणी पूर्ण",
    thankYou: "आपल्या सहकार्याबद्दल व अमूल्य देणगीबद्दल मनःपूर्वक धन्यवाद! 🙏",
    footerAudit: "ही एक अधिकृत डिजिटल पावती आहे. संगणकीय प्रणालीद्वारे तयार करण्यात आलेली असल्यामुळे यावर प्रत्यक्ष स्वाक्षरीची आवश्यकता नाही.",
    voidTitle: "ही पावती सध्या उपलब्ध नाही",
    voidSub: "सदर पावती रद्द करण्यात आली आहे",
    voidDesc: "सदर पावती अधिकृत अधिकाऱ्यांद्वारे रद्द करण्यात आली आहे. सुरक्षेच्या नियमांनुसार रद्द केलेल्या पावतीचा तपशील सार्वजनिकरीत्या उपलब्ध केला जात नाही.",
    voidSecurityNotice: "🔒 अधिकृत सुरक्षा इशारा · पावतीबुक सुरक्षित नोंद",
    invalidTitle: "अवैध पावती",
    invalidDesc: "ही पावती पावतीबुक प्रणालीमध्ये सापडली नाही. कृपया लिंक किंवा क्यूआर कोड तपासा.",
    serverUnavailableTitle: "सेवा तात्पुरती अनुपलब्ध आहे",
    serverUnavailableDesc: "पडताळणी सर्व्हर तात्पुरता अनुपलब्ध आहे. कृपया काही वेळानंतर प्रयत्न करा.",
    downloadPdf: "पीडीएफ",
    downloadJpg: "प्रतिमा (JPG)",
    print: "प्रिंट",
    whatsapp: "व्हॉट्सॲप",
    paid: "प्राप्त",
  },
  hi: {
    greeting: "॥ श्री गणेशाय नमः ॥",
    orgSubtitleFallback: "सार्वजनिक उत्सव मंडल / ट्रस्ट",
    receiptBadge: "॥ अधिकृत दान रसीद ॥",
    receiptNo: "रसीद क्र.:",
    date: "दिनांक:",
    donorTitle: "दानदाता का नाम:",
    donorPrefix: "श्री / मे. ",
    donorFallback: "श्री / दानदाता",
    purpose: "दान का उद्देश्य:",
    purposeFallback: "दान / उत्सव सहयोग",
    paymentMode: "भुगतान पद्धति:",
    amountTitle: "प्राप्त दान राशि",
    wordsPrefix: "शब्दों में: ",
    signaturesTitle: "अधिकृत हस्ताक्षर",
    president: "अध्यक्ष",
    treasurer: "कोषाध्यक्ष",
    secretary: "सचिव",
    authorizedSignatory: "अधिकृत हस्ताक्षर",
    receiver: "प्राप्तकर्ता",
    sealText: "अधिकृत मुहर",
    verifiedBadge: "✓ अधिकृत डिजिटल रसीद · पावतीबुक",
    orgVerifiedBadge: "✓ सत्यापित",
    thankYou: "आपके अमूल्य दान व सहयोग के लिए हार्दिक धन्यवाद! 🙏",
    footerAudit: "यह एक अधिकृत डिजिटल रसीद है। कंप्यूटर प्रणाली द्वारा जनरेट होने के कारण इस पर भौतिक हस्ताक्षर की आवश्यकता नहीं है।",
    voidTitle: "यह रसीद वर्तमान में उपलब्ध नहीं है",
    voidSub: "यह रसीद रद्द कर दी गई है",
    voidDesc: "यह रसीद अधिकृत अधिकारियों द्वारा रद्द कर दी गई है। सुरक्षा नियमों के अनुसार रद्द की गई रसीद का विवरण सार्वजनिक रूप से नहीं दिखाया जाता।",
    voidSecurityNotice: "🔒 अधिकृत सुरक्षा सूचना · पावतीबुक सुरक्षित रिकॉर्ड",
    invalidTitle: "अमान्य रसीद",
    invalidDesc: "यह रसीद पावतीबुक प्रणाली में नहीं मिली। कृपया लिंक या क्यूआर कोड की जांच करें।",
    serverUnavailableTitle: "सेवा अस्थायी रूप से अनुपलब्ध है",
    serverUnavailableDesc: "सत्यापन सर्वर अस्थायी रूप से अनुपलब्ध है। कृपया कुछ समय बाद पुनः प्रयास करें।",
    downloadPdf: "पीडीएफ",
    downloadJpg: "फोटो (JPG)",
    print: "प्रिंट",
    whatsapp: "व्हाट्सएप",
    paid: "प्राप्त",
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
    authorizedSignatory: "Authorized Signatory",
    receiver: "Receiver",
    sealText: "OFFICIAL SEAL",
    verifiedBadge: "✓ VERIFIED DIGITAL RECEIPT · PAVTIBOOK",
    orgVerifiedBadge: "✓ Verified",
    thankYou: "Thank you for your generous contribution and support! 🙏",
    footerAudit: "This is an authenticated computer-generated digital receipt. No physical signature is required.",
    voidTitle: "This receipt is no longer available",
    voidSub: "This receipt is no longer available (Voided / Cancelled)",
    voidDesc: "This receipt has been voided/cancelled by the authorized organization officer. Details of cancelled receipts are not publicly displayed.",
    voidSecurityNotice: "🔒 Security Notice · PavtiBook Audit-Safe Record",
    invalidTitle: "Invalid Receipt",
    invalidDesc: "This receipt could not be found in the PavtiBook system. Please check the link or QR code.",
    serverUnavailableTitle: "Service Temporarily Unavailable",
    serverUnavailableDesc: "The verification server is temporarily unavailable. Please try again later.",
    downloadPdf: "PDF",
    downloadJpg: "Download JPG",
    print: "Print",
    whatsapp: "WhatsApp",
    paid: "PAID",
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

function formatPaymentMode(mode?: string, langKey: string = "mr"): string {
  const m = (mode || "cash").toLowerCase();
  const isCash = m.includes("cash") || m.includes("रोख") || m.includes("नकद");
  const isCheque = m.includes("cheque") || m.includes("चेक");
  const isBank = m.includes("bank") || m.includes("neft") || m.includes("rtgs") || m.includes("imps");

  if (langKey === "mr") {
    if (isCash) return "रोख";
    if (isCheque) return "चेक";
    if (isBank) return "बँक ट्रान्सफर";
    if (m.includes("upi")) return "UPI";
    if (m.includes("gpay") || m.includes("google")) return "Google Pay";
    if (m.includes("phone")) return "PhonePe";
    return mode || "रोख";
  }

  if (langKey === "hi") {
    if (isCash) return "नकद";
    if (isCheque) return "चेक";
    if (isBank) return "बैंक ट्रांसफर";
    if (m.includes("upi")) return "UPI";
    if (m.includes("gpay") || m.includes("google")) return "Google Pay";
    if (m.includes("phone")) return "PhonePe";
    return mode || "नकद";
  }

  // English fallback
  if (isCash) return "Cash";
  if (isCheque) return "Cheque";
  if (isBank) return "Bank Transfer";
  if (m.includes("upi")) return "UPI";
  if (m.includes("gpay") || m.includes("google")) return "Google Pay";
  if (m.includes("phone")) return "PhonePe";
  return mode || "Cash";
}

import { AmountToWordsService } from "@/lib/amountToWords";

function convertNumberToWords(num: number, lang: string = "mr"): string {
  if (num === 0) return lang === "en" ? "Zero Rupees Only" : "शून्य रुपये मात्र";
  const words = AmountToWordsService.convert(num, lang);
  return words || `${num} रुपये मात्र`;
}

export default function VerifyPage({ token, result }: Props) {
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
  }, []);
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

  const handleDownloadPdf = () => {
    if (result.pdfUrl) {
      window.open(result.pdfUrl, "_blank");
    } else {
      handlePrint();
    }
  };

  const handleDownloadJpg = async () => {
    if (!result.receiptImageUrl) {
      handlePrint();
      return;
    }
    try {
      const res = await fetch(result.receiptImageUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${result.receiptNumber || "receipt"}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(result.receiptImageUrl, "_blank");
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
              {L.voidSecurityNotice}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CASE 2: PENDING SMART DONATION PAYMENT                       */}
      {/* ============================================================ */}
      {isValid && result.paymentStatus === "pending" && (
        <div
          style={{
            width: "100%",
            maxWidth: "500px",
            background: "#FFFDF9",
            borderRadius: "16px",
            boxShadow: "0 8px 30px rgba(139, 30, 45, 0.08)",
            border: "1px solid rgba(139, 30, 45, 0.15)",
            overflow: "hidden",
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "#8B1E2D",
              color: "#FFFFFF",
              padding: "36px 20px 28px",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#FFFDF9",
                border: "2px solid #F47C20",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: "28px",
                boxShadow: "0 4px 12px rgba(244, 124, 32, 0.3)",
              }}
            >
              ⏳
            </div>
            <h1 style={{ fontSize: "24px", fontWeight: 900, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
              Payment Status
            </h1>
            <p style={{ fontSize: "15px", color: "#FFFDF9", opacity: 0.9, margin: 0, fontWeight: 500 }}>
              Your payment is being confirmed.
            </p>
            {/* Subtle bottom border accent */}
            <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "4px", background: "linear-gradient(to right, #F47C20, #F2C94C)" }}></div>
          </div>

          <div style={{ padding: "32px 24px", color: "#374151", lineHeight: 1.6 }}>
            <p style={{ fontSize: "15px", margin: "0 0 24px", color: "#4B5563" }}>
              Your donation of <strong style={{ color: "#8B1E2D", fontSize: "16px" }}>{formatAmount(result.amount)}</strong> has been initiated. The status will update once the payment is confirmed by the organization.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                width: "100%",
                padding: "14px 24px",
                background: "#8B1E2D",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(139, 30, 45, 0.3)",
                transition: "all 0.2s ease-in-out",
              }}
            >
              Check Payment Status
            </button>
            <p style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "16px", marginBottom: 0 }}>
              You may refresh this page to check for updates.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CASE 3: AUTHENTIC DIGITAL RECEIPT (VALID & PAID)             */}
      {/* ============================================================ */}
      {isValid && result.paymentStatus !== "pending" && (
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
          {result.receiptImageUrl ? (
            <div>
              {/* Traditional Auspicious Header Banner */}
              <div
                style={{
                  background: "#8B1E2D",
                  color: "#FFF2D6",
                  textAlign: "center",
                  padding: "10px 14px",
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "1px",
                  borderBottom: "2px solid #D97706",
                }}
              >
                {L.greeting} · {result.organizationName || "PavtiBook"}
              </div>

              {/* Authoritative Generated Receipt Image from PavtiBook App */}
              <div style={{ padding: "12px", background: "#FFFDF9", textAlign: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.receiptImageUrl}
                  alt={`Receipt ${result.receiptNumber || ""}`}
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    borderRadius: "8px",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  }}
                />
              </div>

              <div
                style={{
                  padding: "10px 16px",
                  background: "#FFFBF2",
                  borderTop: "1px solid #F3E8D6",
                  fontSize: "11px",
                  color: "#78350F",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  textAlign: "center",
                }}
              >
                <span>🔒</span>
                <span>{L.footerAudit}</span>
              </div>
            </div>
          ) : (
            <>
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
                    {L.orgVerifiedBadge}
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
                    {formatPaymentMode(result.paymentMode, langKey)} · {L.paid}
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
                ({L.wordsPrefix}{convertNumberToWords(result.amount ?? 0, langKey)})
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
                <div style={{ fontSize: "10.5px", color: "#6B7280" }}>{L.authorizedSignatory}</div>
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
                  {L.sealText}
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
                <div style={{ fontSize: "10.5px", color: "#6B7280" }}>{L.receiver}</div>
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
        </>
      )}

          {/* Action Buttons Bar (no-print) */}
          <div
            className="no-print"
            style={{
              background: "#F8F1E7",
              padding: "16px 20px",
              borderTop: "1.5px solid #E5E7EB",
              display: "flex",
              gap: "8px",
            }}
          >
            {result.receiptImageUrl && (
              <button
                onClick={handleDownloadJpg}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  background: "#1E3A8A",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "10px",
                  padding: "12px 6px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(30, 58, 138, 0.25)",
                }}
              >
                <span>📥</span>
                <span>{L.downloadJpg}</span>
              </button>
            )}

            <button
              onClick={handleDownloadPdf}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                background: "#8B1E2D",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "10px",
                padding: "12px 6px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(139, 30, 45, 0.25)",
              }}
            >
              <span>📄</span>
              <span>{L.downloadPdf}</span>
            </button>

            <button
              onClick={handlePrint}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                background: "#4B5563",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "10px",
                padding: "12px 6px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(75, 85, 99, 0.25)",
              }}
            >
              <span>🖨️</span>
              <span>{L.print}</span>
            </button>

            <button
              onClick={handleShare}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                background: "#25D366",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "10px",
                padding: "12px 6px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(37, 211, 102, 0.25)",
              }}
            >
              <span>💬</span>
              <span>{L.whatsapp}</span>
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
            {isError ? L.serverUnavailableTitle : L.invalidTitle}
          </h2>
          <p style={{ fontSize: "13px", color: "#6B7280", margin: "0 0 16px", lineHeight: 1.5 }}>
            {isError ? L.serverUnavailableDesc : L.invalidDesc}
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
            Powered by <strong style={{ color: "#8B1E2D" }}>PavtiBook</strong> &bull; Digital Pavti
          </p>
      </div>
    </div>
  );
}
