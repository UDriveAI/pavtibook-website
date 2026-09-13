"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle, Calendar, Clock, Edit3, ShieldCheck, Phone, Mail, Globe } from "lucide-react";
import { AmountToWordsService } from "../../lib/amountToWords";

/**
 * Traditional Receipt Component for PavtiBook Web
 * 100% Geometry & Label Parity with Android traditional_receipt_widget.dart & DefaultPavtiBookGeometry
 * Fixed Master Artboard: 1536 x 1024 (Aspect Ratio 1.50 : 1)
 */

export interface ReceiptData {
  id?: string;
  receiptNumber: string;
  donorName: string;
  donorMobile?: string;
  donorAddress?: string;
  donorEmail?: string;
  donorId?: string;
  amount: number;
  purpose: string;
  paymentMode: string;
  paymentStatus: string;
  createdAt: string;
  qrCodeValue?: string;
  collectorName?: string;
  collectorRole?: string;
  isDeleted?: boolean;
  deleteReason?: string;
  languageCode?: string;
}

export interface OrganizationData {
  name: string;
  type?: string;
  registrationNumber?: string;
  orgMobile?: string;
  mobile?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  logoUrl?: string;
  headerLogoUrl?: string;
  stampUrl?: string;
  signatureUrl?: string;
  presidentSignatureUrl?: string;
  treasurerSignatureUrl?: string;
  secretarySignatureUrl?: string;
  presidentName?: string;
  treasurerName?: string;
  secretaryName?: string;
  footerText?: string;
  receiptTitle?: string;
  topGreeting?: string;
  primaryColor?: string;
  languageCode?: string;
  logoScale?: number;
  stampScale?: number;
  presidentSignatureScale?: number;
  treasurerSignatureScale?: number;
  secretarySignatureScale?: number;
  watermarkOpacity?: number;
}

export interface TraditionalReceiptProps {
  receipt: ReceiptData;
  organization: OrganizationData;
  languageCode?: "en" | "mr" | "hi" | string;
  receiptPublicUrl?: string;
  scale?: number;
}

export const TraditionalReceipt: React.FC<TraditionalReceiptProps> = ({
  receipt,
  organization,
  languageCode = "mr",
  receiptPublicUrl,
  scale: propScale,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [autoScale, setAutoScale] = useState<number>(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = rect.width || el.clientWidth;
      if (width > 0) {
        setAutoScale(width / 1536);
      }
    };

    updateScale();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(updateScale);
      ro.observe(el);
    }
    window.addEventListener("resize", updateScale);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  const effectiveScale = propScale !== undefined ? propScale : autoScale;

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // Language precedence: explicit prop -> org language -> receipt language -> fallback 'mr'
  const rawLang = (languageCode || organization?.languageCode || receipt?.languageCode || "mr").toLowerCase().trim();
  const effectiveLang: "en" | "hi" | "mr" = rawLang === "en" || rawLang === "english"
    ? "en"
    : rawLang === "hi" || rawLang === "hindi"
    ? "hi"
    : "mr";

  // Generate QR Code for verification matching Android verify URL
  useEffect(() => {
    const rawQrTarget = receiptPublicUrl || (receipt.qrCodeValue && receipt.qrCodeValue.trim().length > 0
      ? `https://pavtibook.online/verify/${receipt.qrCodeValue.trim()}`
      : `https://pavtibook.online/verify/${receipt.receiptNumber || receipt.id || ""}`);

    QRCode.toDataURL(rawQrTarget, {
      margin: 1,
      width: 256,
      errorCorrectionLevel: "H",
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error("Error generating receipt QR:", err));
  }, [receipt.id, receipt.receiptNumber, receipt.qrCodeValue, receiptPublicUrl]);

  // Format Date & Time matching Android DateFormat('dd MMMM yyyy') and ('hh:mm a')
  let dateStr = "";
  let timeStr = "";
  if (receipt.createdAt) {
    try {
      const d = new Date(receipt.createdAt);
      if (!isNaN(d.getTime())) {
        dateStr = d.toLocaleDateString(effectiveLang === "en" ? "en-IN" : "mr-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        timeStr = d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }
    } catch {
      dateStr = receipt.createdAt;
    }
  }

  // Amount in Words
  const amountVal = Number(receipt.amount) || 0;
  const amountFormatted = `₹ ${amountVal.toFixed(2)}`;
  const amountWords = AmountToWordsService.convert(amountVal, effectiveLang);

  // DefaultPavtiBookLabels exactly matching frontend/lib/services/universal_receipt_engine.dart
  const labels = {
    hi: {
      greeting: '॥ श्री गणेशाय नमः ॥',
      header_subtitle: 'धर्म / संस्था / मंडल / NGO / ट्रस्ट',
      donor_details: 'दाता विवरण',
      donor_name_label: '👤 नाम :',
      donor_address_label: '🏠 पता :',
      donor_mobile_label: '📞 मोबाइल :',
      donor_email_label: '✉️ ईमेल :',
      donor_id_label: '🪪 दानदाता आईडी :',
      donor_autofill_title: 'दानदाता विवरण',
      donor_autofill_sub: 'स्वचालित रूप से भरा जाएगा',
      donor_autonum_title: 'स्वचालित क्रमांक',
      donor_autonum_sub: 'दिनांक और समय आधारित',
      donation_details: 'दान विवरण',
      table_sr_no: 'क्र.सं.',
      table_details: 'विवरण',
      table_purpose_dept: 'उद्देश्य / विभाग',
      table_amount: 'राशि (₹)',
      table_default_purpose: 'सामान्य दान',
      table_default_dept: 'सामान्य कार्य',
      edit_details_pill: 'विवरण संपादित करें  •  एकाधिक आइटम जोड़ सकते हैं',
      subtotal: 'उप-योग :',
      discount: 'छूट :',
      total_amount: 'कुल राशि :',
      amount_in_words_label: 'राशि शब्दों में :',
      payment_method_title: 'भुगतान पद्धति',
      pay_cash: 'नकद',
      pay_upi: 'UPI',
      pay_bank: 'बैंक ट्रांसफर',
      pay_cheque: 'चेक',
      pay_other: 'अन्य',
      notes_title: 'टिप्पणी / नोट',
      notes_write_opt: 'नोट लिखें (वैकल्पिक)',
      notes_thanks_terms: 'धन्यवाद संदेश / शर्तें / टिप्पणियाँ',
      sig_president: 'President / अध्यक्ष',
      sig_treasurer: 'Treasurer / कोषाध्यक्ष',
      sig_secretary: 'Secretary / सचिव',
      official_stamp: 'अधिकृत मुहर',
      footer_thankyou: 'आपके अमूल्य दान के लिए हार्दिक धन्यवाद!',
      receipt_no: 'रसीद क्रमांक',
      date: 'दिनांक',
      time: 'समय',
      contact_details: 'संपर्क विवरण',
      receipt_features_title: 'रसीद विशेषताएँ',
      feat_receipt_no: 'रसीद क्रमांक',
      feat_date_time: 'दिनांक और समय',
      feat_donor_info: 'दानदाता विवरण',
      feat_mobile_no: 'मोबाइल नंबर',
      feat_email: 'ईमेल',
      feat_donation_details: 'दान विवरण',
      feat_amount_words: 'राशि शब्दों में',
      feat_payment_method: 'भुगतान पद्धति',
      feat_qr_code: 'QR कोड',
      feat_signatures: 'हस्ताक्षर',
      digital_receipt_title: 'यह रसीद डिजिटल है',
      digital_receipt_sub: 'QR कोड स्कैन करके रसीद का सत्यापन करें।',
      void_badge: 'रद्द पावती (VOID)',
    },
    en: {
      greeting: '॥ श्री गणेशाय नमः ॥',
      header_subtitle: 'Religion / Organization / Mandal / NGO / Trust',
      donor_details: 'Donor Details',
      donor_name_label: '👤 Name :',
      donor_address_label: '🏠 Address :',
      donor_mobile_label: '📞 Mobile :',
      donor_email_label: '✉️ Email :',
      donor_id_label: '🪪 Donor ID :',
      donor_autofill_title: 'Donor Details',
      donor_autofill_sub: 'Automatically filled',
      donor_autonum_title: 'Automatic Number',
      donor_autonum_sub: 'Date and Time Based',
      donation_details: 'Donation Details',
      table_sr_no: 'Sr. No.',
      table_details: 'Details',
      table_purpose_dept: 'Purpose / Department',
      table_amount: 'Amount (₹)',
      table_default_purpose: 'General Donation',
      table_default_dept: 'General Purpose',
      edit_details_pill: 'Edit Details  •  You can add multiple items',
      subtotal: 'Subtotal :',
      discount: 'Discount :',
      total_amount: 'Total Amount :',
      amount_in_words_label: 'Amount in Words :',
      payment_method_title: 'Payment Method',
      pay_cash: 'Cash',
      pay_upi: 'UPI',
      pay_bank: 'Bank Transfer',
      pay_cheque: 'Cheque',
      pay_other: 'Etc.',
      notes_title: 'Notes / Message',
      notes_write_opt: 'Write a note (optional)',
      notes_thanks_terms: 'Thank you message / Terms / Notes',
      sig_president: 'President',
      sig_treasurer: 'Treasurer',
      sig_secretary: 'Secretary',
      official_stamp: 'Official Stamp',
      footer_thankyou: 'Thank you sincerely for your valuable donation!',
      receipt_no: 'Receipt No.',
      date: 'Date',
      time: 'Time',
      contact_details: 'Contact Details',
      receipt_features_title: 'Receipt Features',
      feat_receipt_no: 'Receipt Number',
      feat_date_time: 'Date and Time',
      feat_donor_info: 'Donor Details',
      feat_mobile_no: 'Mobile Number',
      feat_email: 'Email',
      feat_donation_details: 'Donation Details',
      feat_amount_words: 'Amount in Words',
      feat_payment_method: 'Payment Method',
      feat_qr_code: 'QR Code',
      feat_signatures: 'Signatures',
      digital_receipt_title: 'This Receipt is Digital',
      digital_receipt_sub: 'Scan the QR Code to verify the receipt.',
      void_badge: 'VOID / CANCELLED',
    },
    mr: {
      greeting: '॥ श्री गणेशाय नमः ॥',
      header_subtitle: 'धर्म / संस्था / मंडळ / NGO / ट्रस्ट',
      donor_details: 'देणगीदार माहिती',
      donor_name_label: '👤 नाव :',
      donor_address_label: '🏠 पत्ता :',
      donor_mobile_label: '📞 मोबाईल :',
      donor_email_label: '✉️ ईमेल :',
      donor_id_label: '🪪 देणगीदार आयडी :',
      donor_autofill_title: 'देणगीदार माहिती',
      donor_autofill_sub: 'स्वयंचलित भरली जाईल',
      donor_autonum_title: 'स्वयंचलित क्रमांक',
      donor_autonum_sub: 'तारीख आणि वेळ आधारित',
      donation_details: 'देणगी तपशील',
      table_sr_no: 'अ.क्र.',
      table_details: 'तपशील',
      table_purpose_dept: 'उद्देश / विभाग',
      table_amount: 'रक्कम (₹)',
      table_default_purpose: 'सामान्य देणगी',
      table_default_dept: 'सामान्य कार्य',
      edit_details_pill: 'तपशील संपादित करा  •  अनेक आयटम जोडू शकता',
      subtotal: 'उपएकूण :',
      discount: 'सूट :',
      total_amount: 'एकूण रक्कम :',
      amount_in_words_label: 'रक्कम शब्दात :',
      payment_method_title: 'पेमेंट पद्धत',
      pay_cash: 'रोख',
      pay_upi: 'UPI',
      pay_bank: 'बँक हस्तांतरण',
      pay_cheque: 'धनादेश',
      pay_other: 'इतर',
      notes_title: 'टीप / नोंद',
      notes_write_opt: 'टीप लिहा (ऐच्छिक)',
      notes_thanks_terms: 'धन्यवाद संदेश / अटी / नोंदी',
      sig_president: 'President / अध्यक्ष',
      sig_treasurer: 'Treasurer / कोषाध्यक्ष',
      sig_secretary: 'Secretary / सचिव',
      official_stamp: 'अधिकृत शिक्का',
      footer_thankyou: 'आपल्या अमूल्य देणगीबद्दल मनःपूर्वक धन्यवाद!',
      receipt_no: 'पावती क्र.',
      date: 'दिनांक',
      time: 'वेळ',
      contact_details: 'संपर्क तपशील',
      receipt_features_title: 'पावती वैशिष्ट्ये',
      feat_receipt_no: 'पावती क्रमांक',
      feat_date_time: 'दिनांक आणि वेळ',
      feat_donor_info: 'देणगीदार माहिती',
      feat_mobile_no: 'मोबाईल नंबर',
      feat_email: 'ईमेल',
      feat_donation_details: 'देणगी तपशील',
      feat_amount_words: 'रक्कम शब्दात',
      feat_payment_method: 'पेमेंट पद्धत',
      feat_qr_code: 'QR कोड',
      feat_signatures: 'स्वाक्षऱ्या',
      digital_receipt_title: 'ही पावती डिजिटल आहे',
      digital_receipt_sub: 'QR कोड स्कॅन करून पावतीची पडताळणी करा.',
      void_badge: 'रद्द पावती (CANCELLED)',
    },
  }[effectiveLang];

  // Address assembly matching Android LocationService fallback
  const addressParts: string[] = [];
  if (organization?.address && organization.address.trim().length > 0) {
    addressParts.push(organization.address.trim());
  }
  if (organization?.city && organization.city.trim().length > 0 && !organization.address?.includes(organization.city.trim())) {
    addressParts.push(organization.city.trim());
  }
  let fullAddress = addressParts.join(", ");
  if (organization?.pincode && organization.pincode.trim().length > 0 && !fullAddress.includes(organization.pincode.trim())) {
    fullAddress += ` - ${organization.pincode.trim()}`;
  }
  if (!fullAddress && organization?.city) {
    fullAddress = `${organization.city}${organization.pincode ? ` - ${organization.pincode}` : ""}`;
  }

  // Payment Mode Matching
  const payModeLower = (receipt.paymentMode || "cash").toLowerCase();
  const isPay = (m: string) => {
    if (m === 'cash') return payModeLower.includes('cash') || payModeLower.includes('रोख') || payModeLower.includes('नकद');
    if (m === 'upi') return payModeLower.includes('upi') && !payModeLower.includes('google') && !payModeLower.includes('phone');
    if (m === 'bank') return payModeLower.includes('bank') || payModeLower.includes('neft') || payModeLower.includes('rtgs') || payModeLower.includes('हस्तांतरण');
    if (m === 'cheque') return payModeLower.includes('cheque') || payModeLower.includes('चेक') || payModeLower.includes('धनादेश');
    return payModeLower === 'other' || payModeLower === 'इतर' || payModeLower === 'अन्य';
  };

  const orgMobile = organization?.mobile || organization?.orgMobile || "";
  const orgEmail = organization?.email || "";
  const orgWebsite = organization?.website || "";
  const orgName = (organization?.name && organization.name !== "गणपती बाप्पा मोरया")
    ? organization.name
    : (effectiveLang === "mr" ? "आपल्या संस्थेचे नाव" : effectiveLang === "hi" ? "आपकी संस्था का नाम" : "Your Organization Name");

  const watermarkOpacity = typeof organization?.watermarkOpacity === "number" ? organization.watermarkOpacity : 0.05;

  return (
    <div className="w-full overflow-hidden flex justify-center items-center select-none print:m-0 print:p-0 min-w-0">
      {/* Outer Scaled Viewport Container (Aspect Ratio 1536 : 1024 = 1.50) */}
      <div
        ref={containerRef}
        className="relative w-full max-w-[1536px] overflow-hidden rounded-2xl mx-auto"
        style={{
          aspectRatio: "1536 / 1024",
          height: effectiveScale < 1 && containerRef.current ? `${Math.round(containerRef.current.clientWidth * (1024 / 1536))}px` : undefined,
        }}
      >
        {/* 
          Master Artboard (1536 x 1024 Fixed Master Units)
          Scales uniformly based on measured container width
        */}
        <div
          id="pavtibook-traditional-receipt"
          className="absolute top-0 left-0 bg-[#FFFDF5] text-[#2E1C0C] overflow-hidden print:static print:transform-none"
          style={{
            width: "1536px",
            height: "1024px",
            transform: `scale(${effectiveScale})`,
            transformOrigin: "top left",
            borderRadius: "16px",
            border: "2.5px solid #7A1C1C",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
            boxSizing: "border-box",
            fontFamily: "'Noto Sans Devanagari', 'Poppins', sans-serif",
          }}
        >
          {/* ========================================================================= */}
          {/* [C] RIGHT MAROON SIDEBAR BACKGROUND (X: 1189, Y: 0, W: 347, H: 1024)      */}
          {/* ========================================================================= */}
          <div
            className="absolute bg-[#7A1C1C]"
            style={{
              left: "1189px",
              top: "0px",
              width: "347px",
              height: "1024px",
              borderTopRightRadius: "14px",
              borderBottomRightRadius: "14px",
            }}
          />

          {/* ========================================================================= */}
          {/* [E] GREETING LINE (X: 0, Y: 6, W: 1189, H: 34)                            */}
          {/* ========================================================================= */}
          <div
            className="absolute flex items-center justify-center font-bold text-[#7A1C1C]"
            style={{
              left: "0px",
              top: "6px",
              width: "1189px",
              height: "34px",
              fontSize: "40px",
              letterSpacing: "2px",
            }}
          >
            {organization?.topGreeting || labels.greeting}
          </div>

          {/* ========================================================================= */}
          {/* [F] HEADER LOGO (X: 15, Y: 20, W: 210, H: 210)                            */}
          {/* ========================================================================= */}
          <div
            className="absolute flex items-center justify-center"
            style={{
              left: "15px",
              top: "20px",
              width: "210px",
              height: "210px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={organization?.logoUrl || "/images/Pavati-Book-Logo-01(1).png"}
              alt="Organization Logo"
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/images/Pavati-Book-Logo-01(1).png";
              }}
            />
          </div>

          {/* ========================================================================= */}
          {/* [G] HEADER ORGANIZATION TITLE (X: 0, Y: 38, W: 1189, H: 120)               */}
          {/* ========================================================================= */}
          <div
            className="absolute flex items-center justify-center px-6"
            style={{
              left: "0px",
              top: "38px",
              width: "1189px",
              height: "120px",
            }}
          >
            <h1
              className="font-black text-center text-[#7A1C1C] truncate leading-tight"
              style={{
                fontSize: "58px",
                maxWidth: "680px",
              }}
            >
              {orgName}
            </h1>
          </div>

          {/* ========================================================================= */}
          {/* [H] HEADER SUBTITLE (X: 0, Y: 162, W: 1189, H: 28)                        */}
          {/* ========================================================================= */}
          <div
            className="absolute flex items-center justify-center text-black/60 font-semibold"
            style={{
              left: "0px",
              top: "162px",
              width: "1189px",
              height: "28px",
              fontSize: "36px",
            }}
          >
            {organization?.registrationNumber
              ? `नोंदणी क्र. ${organization.registrationNumber}`
              : labels.header_subtitle}
          </div>

          {/* ========================================================================= */}
          {/* [I] HEADER ADDRESS (X: 0, Y: 192, W: 1189, H: 24)                         */}
          {/* ========================================================================= */}
          <div
            className="absolute flex items-center justify-center text-black/85 truncate px-8"
            style={{
              left: "0px",
              top: "192px",
              width: "1189px",
              height: "24px",
              fontSize: "20px",
            }}
          >
            {fullAddress ? `📍 ${fullAddress}` : "📍 महाराष्ट्र, भारत"}
          </div>

          {/* ========================================================================= */}
          {/* [J] HEADER CONTACT (X: 0, Y: 218, W: 1189, H: 24)                         */}
          {/* ========================================================================= */}
          <div
            className="absolute flex items-center justify-center text-black/85 gap-6"
            style={{
              left: "0px",
              top: "218px",
              width: "1189px",
              height: "24px",
              fontSize: "18px",
              fontWeight: 500,
            }}
          >
            {orgMobile && <span>📞 +91 {orgMobile}</span>}
            {orgEmail && <span>✉️ {orgEmail}</span>}
            {orgWebsite && <span>🌐 {orgWebsite}</span>}
            {!orgMobile && !orgEmail && !orgWebsite && <span>📞 +91 98765 43210   ✉️ info@pavtibook.in</span>}
          </div>

          {/* ========================================================================= */}
          {/* [K] HEADER QR CARD (X: 1004, Y: 20, W: 170, H: 210)                       */}
          {/* ========================================================================= */}
          <div
            className="absolute bg-white rounded-2xl flex flex-col items-center justify-center p-2 shadow-xs"
            style={{
              left: "1004px",
              top: "20px",
              width: "170px",
              height: "210px",
              border: "2.2px solid rgba(216, 67, 21, 0.7)",
            }}
          >
            <span
              className="font-bold text-[#D84315] uppercase tracking-wider mb-1"
              style={{ fontSize: "13px" }}
            >
              SCAN & VERIFY
            </span>
            <div className="relative w-[120px] h-[120px] flex items-center justify-center">
              {qrCodeDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={qrCodeDataUrl}
                  alt="Receipt QR Code"
                  className="w-[120px] h-[120px] object-contain"
                />
              ) : (
                <div className="w-[120px] h-[120px] bg-stone-100 animate-pulse rounded-sm" />
              )}
              {/* QR Center Icon */}
              <div className="absolute w-7 h-7 bg-white rounded-sm flex items-center justify-center shadow-xs p-0.5 pointer-events-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/Pavati-Book-LogoIcon-Clean.png"
                  alt="PavtiBook Icon"
                  className="w-5 h-5 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/images/app_icon.png";
                  }}
                />
              </div>
            </div>
            <span
              className="font-bold text-black/50 mt-1"
              style={{ fontSize: "12px" }}
            >
              UPI / QR
            </span>
          </div>

          {/* ========================================================================= */}
          {/* [L] DONOR SECTION CONTAINER (X: 12, Y: 248, W: 1165, H: 248)               */}
          {/* ========================================================================= */}
          <div
            className="absolute bg-[#FFFBF0] rounded-2xl overflow-hidden"
            style={{
              left: "12px",
              top: "248px",
              width: "1165px",
              height: "248px",
              border: "2px solid #FFD54F",
            }}
          >
            {/* Watermark inside donor card */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ opacity: watermarkOpacity }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/Pavati-Book-Logo-01(1).png"
                alt="Watermark"
                className="w-[580px] h-[180px] object-contain"
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* [M] DONOR TITLE PILL (X: 26, Y: 258, W: 200, H: 40)                       */}
          {/* ========================================================================= */}
          <div
            className="absolute bg-[#D84315] text-white font-bold rounded-full flex items-center justify-center px-4.5 z-10"
            style={{
              left: "26px",
              top: "258px",
              minWidth: "200px",
              height: "40px",
              fontSize: "22px",
            }}
          >
            {labels.donor_details}
          </div>

          {/* ========================================================================= */}
          {/* [N] DONOR FIELDS (X: 26, Y: 304, W: 656, H: 182)                          */}
          {/* ========================================================================= */}
          <div
            className="absolute flex flex-col justify-between py-1 z-10"
            style={{
              left: "26px",
              top: "304px",
              width: "656px",
              height: "182px",
              fontSize: "20px",
            }}
          >
            <div className="flex items-center">
              <span className="font-bold w-[216px] text-black/90">{labels.donor_name_label}</span>
              <span className="font-semibold text-black truncate flex-1">
                {receipt.donorName || "प्रणय संजीव भोसले"}
              </span>
            </div>
            <div className="flex items-center">
              <span className="font-bold w-[216px] text-black/90">{labels.donor_address_label}</span>
              <span className="text-black truncate flex-1">
                {receipt.donorAddress || "पुणे, महाराष्ट्र - 411001"}
              </span>
            </div>
            <div className="flex items-center">
              <span className="font-bold w-[216px] text-black/90">{labels.donor_mobile_label}</span>
              <span className="text-black truncate flex-1">
                +91 {receipt.donorMobile || "98765 43210"}
              </span>
            </div>
            <div className="flex items-center">
              <span className="font-bold w-[216px] text-black/90">{labels.donor_email_label}</span>
              <span className="text-black truncate flex-1">
                {receipt.donorEmail || organization?.email || "—"}
              </span>
            </div>
            <div className="flex items-center">
              <span className="font-bold w-[216px] text-black/90">{labels.donor_id_label}</span>
              <span className="text-black truncate flex-1 font-mono font-medium">
                {receipt.donorId || receipt.id?.slice(0, 8) || "DR-00045"}
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* [O] THANK-YOU STAMP / SEAL (X: 694, Y: 300, W: 244, H: 150)              */}
          {/* ========================================================================= */}
          <div
            className="absolute flex items-center justify-center z-10"
            style={{
              left: "694px",
              top: "300px",
              width: "244px",
              height: "150px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={effectiveLang === "en" ? "/images/thank_you_en.png" : "/images/thank_you_mr.png"}
              alt="Thank You Stamp"
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          {/* ========================================================================= */}
          {/* [Q] GREEN AUTO-NUMBER CARD (X: 948, Y: 262, W: 212, H: 120)               */}
          {/* ========================================================================= */}
          <div
            className="absolute bg-[#E8F5E9] rounded-2xl flex flex-col items-center justify-center p-3 z-10 text-center"
            style={{
              left: "948px",
              top: "262px",
              width: "212px",
              height: "120px",
              border: "1.5px solid #81C784",
            }}
          >
            <div className="flex items-center justify-center gap-1.5 text-[#2E7D32] font-bold text-[15px]">
              <CheckCircle className="w-5 h-5 text-[#2E7D32] shrink-0" />
              <span className="truncate">{labels.donor_autonum_title}</span>
            </div>
            <span className="text-[#1B5E20] text-[13px] mt-1">
              {labels.donor_autonum_sub}
            </span>
          </div>

          {/* ========================================================================= */}
          {/* [R] DONATION DETAILS TITLE PILL (X: 12, Y: 506, W: 200, H: 40)            */}
          {/* ========================================================================= */}
          <div
            className="absolute bg-[#7A1C1C] text-white font-bold rounded-full flex items-center justify-center px-4.5 z-10"
            style={{
              left: "12px",
              top: "506px",
              minWidth: "200px",
              height: "40px",
              fontSize: "22px",
            }}
          >
            {labels.donation_details}
          </div>

          {/* ========================================================================= */}
          {/* [S] DONATION TABLE (X: 12, Y: 552, W: 698, H: 140)                        */}
          {/* 4 Columns: 65px, 220px, 220px, 193px = 698px                             */}
          {/* ========================================================================= */}
          <div
            className="absolute rounded-sm overflow-hidden z-10"
            style={{
              left: "12px",
              top: "552px",
              width: "698px",
              height: "140px",
              border: "1.5px solid rgba(122, 28, 28, 0.5)",
            }}
          >
            <table className="w-full h-full border-collapse text-left">
              <thead>
                <tr className="bg-[#7A1C1C] text-white font-bold" style={{ height: "45px", fontSize: "17px" }}>
                  <th className="text-center border-r border-white/20" style={{ width: "65px" }}>{labels.table_sr_no}</th>
                  <th className="text-center border-r border-white/20" style={{ width: "220px" }}>{labels.table_details}</th>
                  <th className="text-center border-r border-white/20" style={{ width: "220px" }}>{labels.table_purpose_dept}</th>
                  <th className="text-center" style={{ width: "193px" }}>{labels.table_amount}</th>
                </tr>
              </thead>
              <tbody className="bg-white text-black/85" style={{ fontSize: "17px" }}>
                <tr className="border-t border-[#7A1C1C]/30">
                  <td className="text-center border-r border-[#7A1C1C]/30" style={{ width: "65px" }}>1</td>
                  <td className="px-3 border-r border-[#7A1C1C]/30 font-medium truncate" style={{ width: "220px" }}>
                    {receipt.purpose || labels.table_default_purpose}
                  </td>
                  <td className="px-3 border-r border-[#7A1C1C]/30 truncate text-stone-600" style={{ width: "220px" }}>
                    {labels.table_default_dept}
                  </td>
                  <td className="px-4 text-right font-bold" style={{ width: "193px" }}>
                    {amountVal.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ========================================================================= */}
          {/* [T] EDIT DETAILS PILL (X: 12, Y: 700, W: 390, H: 42)                      */}
          {/* ========================================================================= */}
          <div
            className="absolute bg-white rounded-xl flex items-center px-4 py-2 text-black/80 font-semibold shadow-2xs z-10"
            style={{
              left: "12px",
              top: "700px",
              width: "390px",
              height: "42px",
              border: "1px solid #D1D5DB",
              fontSize: "16px",
            }}
          >
            <Edit3 className="w-5 h-5 text-black/80 mr-2 shrink-0" />
            <span className="truncate">{labels.edit_details_pill}</span>
          </div>

          {/* ========================================================================= */}
          {/* [U] AMOUNT SUMMARY BOX (X: 718, Y: 504, W: 462, H: 234)                   */}
          {/* ========================================================================= */}
          <div
            className="absolute bg-[#FFFBF0] rounded-2xl flex flex-col justify-between p-4 z-10"
            style={{
              left: "718px",
              top: "504px",
              width: "462px",
              height: "234px",
              border: "2px solid #7A1C1C",
            }}
          >
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[18px] text-black/85">
                <span>{labels.subtotal}</span>
                <span className="font-semibold">{amountVal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-[18px] text-black/85">
                <span>{labels.discount}</span>
                <span>0.00</span>
              </div>
              <div className="border-b border-[#7A1C1C]/40 my-1" />
              <div className="flex justify-between items-center text-[#7A1C1C]">
                <span className="text-[20px] font-bold">{labels.total_amount}</span>
                <span className="text-[44px] font-black leading-none">
                  {amountFormatted}
                </span>
              </div>
            </div>

            {amountWords && (
              <div className="text-right italic text-black/85 text-[15px] leading-tight line-clamp-2 mt-1">
                <span className="font-semibold not-italic">{labels.amount_in_words_label}</span> {amountWords}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* [V] PAYMENT TITLE PILL (X: 12, Y: 752, W: 180, H: 38)                     */}
          {/* ========================================================================= */}
          <div
            className="absolute bg-[#7A1C1C] text-white font-bold rounded-full flex items-center justify-center px-4 z-20"
            style={{
              left: "12px",
              top: "752px",
              minWidth: "180px",
              height: "38px",
              fontSize: "20px",
            }}
          >
            {labels.payment_method_title}
          </div>

          {/* ========================================================================= */}
          {/* [W] PAYMENT METHOD CONTAINER (X: 12, Y: 754, W: 1165, H: 50)              */}
          {/* 5 Chips: Cash, UPI, Bank Transfer, Cheque, Other                          */}
          {/* ========================================================================= */}
          <div
            className="absolute bg-[#FFFBF0] rounded-2xl flex items-center justify-between px-3 z-10"
            style={{
              left: "12px",
              top: "754px",
              width: "1165px",
              height: "50px",
              border: "1.5px solid #D1D5DB",
            }}
          >
            <div className="w-[180px] shrink-0" /> {/* Space for overlapping Title Pill */}
            
            <div className="flex-1 flex items-center justify-evenly gap-2 pl-2">
              {/* Chip 1: Cash */}
              <div
                className={`w-[180px] h-[36px] rounded-lg flex items-center justify-center font-bold text-[18px] transition-colors ${
                  isPay('cash')
                    ? "bg-[#E8F5E9] text-[#2E7D32] border-[2.5px] border-[#81C784]"
                    : "bg-white text-black/80 border-[1.5px] border-stone-300"
                }`}
              >
                {labels.pay_cash}
              </div>

              {/* Chip 2: UPI */}
              <div
                className={`w-[180px] h-[36px] rounded-lg flex items-center justify-center font-bold text-[18px] transition-colors ${
                  isPay('upi')
                    ? "bg-[#E8F5E9] text-[#2E7D32] border-[2.5px] border-[#81C784]"
                    : "bg-white text-black/80 border-[1.5px] border-stone-300"
                }`}
              >
                {labels.pay_upi}
              </div>

              {/* Chip 3: Bank Transfer */}
              <div
                className={`w-[180px] h-[36px] rounded-lg flex items-center justify-center font-bold text-[18px] transition-colors ${
                  isPay('bank')
                    ? "bg-[#E8F5E9] text-[#2E7D32] border-[2.5px] border-[#81C784]"
                    : "bg-white text-black/80 border-[1.5px] border-stone-300"
                }`}
              >
                {labels.pay_bank}
              </div>

              {/* Chip 4: Cheque */}
              <div
                className={`w-[180px] h-[36px] rounded-lg flex items-center justify-center font-bold text-[18px] transition-colors ${
                  isPay('cheque')
                    ? "bg-[#E8F5E9] text-[#2E7D32] border-[2.5px] border-[#81C784]"
                    : "bg-white text-black/80 border-[1.5px] border-stone-300"
                }`}
              >
                {labels.pay_cheque}
              </div>

              {/* Chip 5: Other */}
              <div
                className={`w-[180px] h-[36px] rounded-lg flex items-center justify-center font-bold text-[18px] transition-colors ${
                  isPay('other')
                    ? "bg-[#E8F5E9] text-[#2E7D32] border-[2.5px] border-[#81C784]"
                    : "bg-white text-black/80 border-[1.5px] border-stone-300"
                }`}
              >
                {labels.pay_other}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* [Y] NOTES BOX (X: 12, Y: 814, W: 340, H: 118)                             */}
          {/* ========================================================================= */}
          <div
            className="absolute bg-white rounded-2xl flex flex-col justify-center px-4 py-2.5 z-10"
            style={{
              left: "12px",
              top: "814px",
              width: "340px",
              height: "118px",
              border: "1.5px solid #D1D5DB",
            }}
          >
            <div className="flex items-center gap-1.5 text-black font-bold text-[20px]">
              <Edit3 className="w-5 h-5 text-black" />
              <span>{labels.notes_title}</span>
            </div>
            <p className="text-stone-400 text-[14px] mt-1">
              {labels.notes_write_opt}
            </p>
            <p className="text-black/60 text-[13px]">
              {labels.notes_thanks_terms}
            </p>
          </div>

          {/* ========================================================================= */}
          {/* [Z] SIGNATURE BOX (X: 360, Y: 814, W: 638, H: 118)                        */}
          {/* 3 Columns: President, Treasurer, Secretary                                */}
          {/* ========================================================================= */}
          <div
            className="absolute bg-white rounded-2xl flex items-center justify-evenly px-2 py-2 z-10"
            style={{
              left: "360px",
              top: "814px",
              width: "638px",
              height: "118px",
              border: "1.5px solid #D1D5DB",
            }}
          >
            {/* Signature Col 1: President */}
            <div className="w-[196px] h-[104px] flex flex-col justify-between items-center text-center">
              <span className="text-[#7A1C1C] font-bold text-[17px] truncate max-w-full">
                {labels.sig_president}
              </span>
              <div className="relative w-[155px] h-[45px] flex items-center justify-center border-b border-[#7A1C1C]/50">
                {organization?.presidentSignatureUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={organization.presidentSignatureUrl}
                    alt="President Sign"
                    className="max-h-[42px] max-w-[140px] object-contain"
                  />
                )}
              </div>
              <span className="text-[#7A1C1C]/90 font-semibold text-[13px] truncate max-w-full">
                {organization?.presidentName || "अध्यक्ष स्वाक्षरी"}
              </span>
            </div>

            {/* Signature Col 2: Treasurer */}
            <div className="w-[196px] h-[104px] flex flex-col justify-between items-center text-center">
              <span className="text-[#7A1C1C] font-bold text-[17px] truncate max-w-full">
                {labels.sig_treasurer}
              </span>
              <div className="relative w-[155px] h-[45px] flex items-center justify-center border-b border-[#7A1C1C]/50">
                {organization?.treasurerSignatureUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={organization.treasurerSignatureUrl}
                    alt="Treasurer Sign"
                    className="max-h-[42px] max-w-[140px] object-contain"
                  />
                )}
              </div>
              <span className="text-[#7A1C1C]/90 font-semibold text-[13px] truncate max-w-full">
                {organization?.treasurerName || "खजिनदार स्वाक्षरी"}
              </span>
            </div>

            {/* Signature Col 3: Secretary */}
            <div className="w-[196px] h-[104px] flex flex-col justify-between items-center text-center">
              <span className="text-[#7A1C1C] font-bold text-[17px] truncate max-w-full">
                {labels.sig_secretary}
              </span>
              <div className="relative w-[155px] h-[45px] flex items-center justify-center border-b border-[#7A1C1C]/50">
                {organization?.secretarySignatureUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={organization.secretarySignatureUrl}
                    alt="Secretary Sign"
                    className="max-h-[42px] max-w-[140px] object-contain"
                  />
                )}
              </div>
              <span className="text-[#7A1C1C]/90 font-semibold text-[13px] truncate max-w-full">
                {organization?.secretaryName || "सचिव स्वाक्षरी"}
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* [AD] OFFICIAL STAMP (X: 1006, Y: 814, W: 174, H: 118)                     */}
          {/* ========================================================================= */}
          <div
            className="absolute flex flex-col items-center justify-between z-10"
            style={{
              left: "1006px",
              top: "814px",
              width: "174px",
              height: "118px",
            }}
          >
            <div className="w-[84px] h-[84px] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={organization?.stampUrl || "/images/app_icon.png"}
                alt="Official Stamp"
                className="w-[84px] h-[84px] object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/images/app_icon.png";
                }}
              />
            </div>
            <span
              className="text-[#7A1C1C] font-bold text-[18px] text-center"
              style={{ height: "24px" }}
            >
              {labels.official_stamp}
            </span>
          </div>

          {/* ========================================================================= */}
          {/* [AE] FOOTER BAR (X: 0, Y: 938, W: 1189, H: 80)                            */}
          {/* ========================================================================= */}
          <div
            className="absolute bg-[#7A1C1C] text-white flex items-center justify-between px-6"
            style={{
              left: "0px",
              top: "938px",
              width: "1189px",
              height: "80px",
              borderBottomLeftRadius: "14px",
            }}
          >
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/app_icon.png"
                alt="PavtiBook"
                className="w-10 h-10 object-contain"
              />
              <div className="flex items-baseline gap-3">
                <span className="font-bold text-[22px]">PavtiBook</span>
                <span className="text-white/60 text-[16px]">Digital Trust. Transparent Receipts.</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={effectiveLang === "en" ? "/images/thank_you_en.png" : "/images/thank_you_mr.png"}
                  alt="Thank you"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-bold text-[22px]">
                {organization?.footerText || labels.footer_thankyou}
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ============ RIGHT SIDEBAR CONTENT (X: 1189) ============================ */}
          {/* ========================================================================= */}

          {/* [AF] RECEIPT NUMBER + DATE/TIME (X: 1204, Y: 20, W: 318, H: 184)           */}
          <div
            className="absolute text-white flex flex-col justify-start z-10"
            style={{
              left: "1204px",
              top: "20px",
              width: "318px",
              height: "184px",
            }}
          >
            <span className="text-white/70 text-[18px]">{labels.receipt_no}</span>
            <span className="font-bold text-[28px] text-white leading-tight font-mono">
              {receipt.receiptNumber || "PB-2026-000001"}
            </span>

            <div className="flex items-center gap-2 text-white text-[17px] mt-3">
              <Calendar className="w-4.5 h-4.5 text-white/70 shrink-0" />
              <span>{labels.date} : {dateStr || "—"}</span>
            </div>

            <div className="flex items-center gap-2 text-white text-[17px] mt-1.5">
              <Clock className="w-4.5 h-4.5 text-white/70 shrink-0" />
              <span>{labels.time} : {timeStr || "—"}</span>
            </div>
          </div>

          {/* [AG] SIDEBAR CONTACT CARD (X: 1204, Y: 214, W: 318, H: 196)               */}
          <div
            className="absolute bg-[#FFFBF0] rounded-2xl p-3.5 flex flex-col justify-between z-10"
            style={{
              left: "1204px",
              top: "214px",
              width: "318px",
              height: "196px",
            }}
          >
            <div className="bg-[#7A1C1C] text-white font-bold rounded-xl px-3.5 py-1 text-[16px] inline-block self-start">
              {labels.contact_details}
            </div>
            <div className="space-y-1.5 text-black/85 text-[15px] font-medium">
              <div className="flex items-center gap-2 truncate">
                <Phone className="w-4 h-4 text-black/60 shrink-0" />
                <span className="truncate">+91 {orgMobile || "98765 43210"}</span>
              </div>
              <div className="flex items-center gap-2 truncate">
                <Mail className="w-4 h-4 text-black/60 shrink-0" />
                <span className="truncate">{orgEmail || "info@pavtibook.in"}</span>
              </div>
              <div className="flex items-center gap-2 truncate">
                <Globe className="w-4 h-4 text-black/60 shrink-0" />
                <span className="truncate">{orgWebsite || "www.pavtibook.in"}</span>
              </div>
            </div>
          </div>

          {/* [AH] SIDEBAR FEATURES CARD (X: 1204, Y: 420, W: 318, H: 350)              */}
          <div
            className="absolute bg-[#FFFBF0] rounded-2xl p-3.5 flex flex-col justify-between z-10"
            style={{
              left: "1204px",
              top: "420px",
              width: "318px",
              height: "350px",
            }}
          >
            <div className="bg-[#7A1C1C] text-white font-bold rounded-xl px-3.5 py-1 text-[16px] inline-block self-start mb-1">
              {labels.receipt_features_title}
            </div>
            <div className="space-y-1.5 text-black/85 text-[14px]">
              {[
                labels.feat_receipt_no,
                labels.feat_date_time,
                labels.feat_donor_info,
                labels.feat_mobile_no,
                labels.feat_email,
                labels.feat_donation_details,
                labels.feat_amount_words,
                labels.feat_payment_method,
                labels.feat_qr_code,
                labels.feat_signatures,
              ].map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="truncate">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* [AI] DIGITAL VERIFICATION CARD (X: 1204, Y: 780, W: 318, H: 156)           */}
          <div
            className="absolute bg-[#FFFBF0] rounded-2xl p-3.5 flex flex-col justify-center text-center z-10"
            style={{
              left: "1204px",
              top: "780px",
              width: "318px",
              height: "156px",
            }}
          >
            <span className="text-[#7A1C1C] font-bold text-[17px]">
              {labels.digital_receipt_title}
            </span>
            <div className="flex items-center gap-2.5 text-left text-black/85 text-[14px] mt-2">
              <ShieldCheck className="w-7 h-7 text-green-600 shrink-0" />
              <p className="leading-snug">
                {labels.digital_receipt_sub}
              </p>
            </div>
          </div>

          {/* [AJ] SIDEBAR FOOTER (X: 1204, Y: 946, W: 318, H: 64)                       */}
          <div
            className="absolute text-center flex flex-col items-center justify-center z-10"
            style={{
              left: "1204px",
              top: "946px",
              width: "318px",
              height: "64px",
            }}
          >
            <span className="text-white/70 text-[15px]">Powered by PavtiBook</span>
            <span className="text-white font-bold text-[18px]">www.pavtibook.in</span>
          </div>

          {/* Watermark for Void/Deleted Receipts */}
          {receipt.isDeleted && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <div className="text-red-600/35 text-8xl font-black uppercase tracking-widest -rotate-24 border-8 border-red-600/35 px-10 py-6 rounded-3xl">
                {labels.void_badge}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
