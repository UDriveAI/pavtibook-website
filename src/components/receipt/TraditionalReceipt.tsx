"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { AmountToWordsService } from "../../lib/amountToWords";

/**
 * Traditional Receipt Component for PavtiBook Web
 * Implements F16: Exact visual and functional parity with Android traditional_receipt_widget.dart
 * Master coordinate/layout system: 1536 x 1024 aspect ratio with authentic temple trust borders,
 * header logos, stamp, signature lines, Devnagari amount in words, and verification QR code.
 */

export interface ReceiptData {
  id?: string;
  receiptNumber: string;
  donorName: string;
  donorMobile?: string;
  donorAddress?: string;
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
}

export interface OrganizationData {
  name: string;
  registrationNumber?: string;
  orgMobile?: string;
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
}

interface TraditionalReceiptProps {
  receipt: ReceiptData;
  organization: OrganizationData;
  languageCode?: "en" | "mr" | "hi";
  receiptPublicUrl?: string;
}

export const TraditionalReceipt: React.FC<TraditionalReceiptProps> = ({
  receipt,
  organization,
  languageCode = "mr",
  receiptPublicUrl,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  const effectiveLang = (["hi", "en"].includes(languageCode) ? languageCode : "mr") as "en" | "mr" | "hi";

  // Generate QR Code matching verification link
  useEffect(() => {
    const qrValue = receiptPublicUrl || `https://pavtibook.online/receipt/${receipt.id || receipt.receiptNumber}`;
    QRCode.toDataURL(qrValue, {
      margin: 1,
      width: 256,
      color: {
        dark: "#8B1E2D",
        light: "#FFFFFF",
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error("Error generating receipt QR:", err));
  }, [receipt.id, receipt.receiptNumber, receiptPublicUrl]);

  // Format Date & Time
  let formattedDate = "";
  let formattedTime = "";
  if (receipt.createdAt) {
    try {
      const d = new Date(receipt.createdAt);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        formattedTime = d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }
    } catch {
      formattedDate = receipt.createdAt;
    }
  }

  // Amount in Words
  const amountInWords = AmountToWordsService.convert(receipt.amount, effectiveLang);

  // Multilingual Labels
  const labels = {
    en: {
      receiptNo: "Receipt No",
      date: "Date",
      time: "Time",
      receivedFrom: "Received with thanks from",
      mobile: "Mobile",
      address: "Address",
      sumOfRupees: "The sum of Rupees",
      rupeesInWords: "Rupees in words",
      towards: "Towards / Purpose",
      paymentMode: "Payment Mode",
      status: "Status",
      collectedBy: "Collected By",
      receiverSign: "Receiver's Sign",
      authorizedSign: "Authorized Signatory",
      cash: "Cash",
      upi: "UPI",
      bank: "Bank Transfer",
      cheque: "Cheque",
      other: "Other",
      paid: "PAID",
      pending: "PENDING",
      deletedBadge: "VOID / CANCELLED",
    },
    hi: {
      receiptNo: "रसीद क्र.",
      date: "दिनांक",
      time: "समय",
      receivedFrom: "सधन्यवाद प्राप्त हुए श्री/श्रीमती",
      mobile: "मोबाईल",
      address: "पत्ता",
      sumOfRupees: "रुपये (अंकों में)",
      rupeesInWords: "रुपये (अक्षरी)",
      towards: "उद्देश्य / कारण",
      paymentMode: "भुगतान प्रकार",
      status: "स्थिति",
      collectedBy: "जमाकर्ता",
      receiverSign: "प्राप्तकर्ता स्वाक्षरी",
      authorizedSign: "अधिकृत स्वाक्षरी",
      cash: "रोख (Cash)",
      upi: "यूपीआय (UPI)",
      bank: "बँक ट्रान्सफर",
      cheque: "चेक (Cheque)",
      other: "अन्य",
      paid: "प्राप्त (PAID)",
      pending: "प्रलंबित (PENDING)",
      deletedBadge: "रद्द पावती (VOID)",
    },
    mr: {
      receiptNo: "पावती क्र.",
      date: "दिनांक",
      time: "वेळ",
      receivedFrom: "पावती लिहून घेणार श्री/श्रीमती",
      mobile: "मोबाईल",
      address: "पत्ता",
      sumOfRupees: "रुपये (अंकी)",
      rupeesInWords: "अक्षरी रुपये",
      towards: "देणगीचे कारण",
      paymentMode: "पेमेंट प्रकार",
      status: "स्थिती",
      collectedBy: "पावती देणारा",
      receiverSign: "घेणाऱ्याची सही",
      authorizedSign: "अधिकृत स्वाक्षरी",
      cash: "रोख (Cash)",
      upi: "यूपीआय (UPI)",
      bank: "बँक ट्रान्सफर",
      cheque: "धनादेश (Cheque)",
      other: "इतर",
      paid: "जमा (PAID)",
      pending: "प्रलंबित (PENDING)",
      deletedBadge: "रद्द पावती (CANCELLED)",
    },
  }[effectiveLang];

  const payModeLower = (receipt.paymentMode || "cash").toLowerCase();
  const isPaid = (receipt.paymentStatus || "").toLowerCase() === "paid" || payModeLower === "cash";

  return (
    <div
      id="pavtibook-traditional-receipt"
      className="relative w-full max-w-[850px] mx-auto bg-[#FFFDD0] text-[#331800] rounded-2xl shadow-xl overflow-hidden print:shadow-none print:m-0 print:w-full print:max-w-none font-serif select-none"
      style={{
        border: "10px double #8B1E2D",
        boxSizing: "border-box",
      }}
    >
      {/* Decorative Ornate Corner Borders */}
      <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-[#D97706] pointer-events-none" />
      <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-[#D97706] pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-[#D97706] pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-[#D97706] pointer-events-none" />

      {/* Watermark for Void/Deleted Receipts */}
      {receipt.isDeleted && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="text-red-600/30 text-7xl md:text-9xl font-black uppercase tracking-widest -rotate-24 border-8 border-red-600/30 px-8 py-4 rounded-3xl">
            {labels.deletedBadge}
          </div>
        </div>
      )}

      {/* Top Header Section */}
      <div className="p-6 md:p-8 bg-[#8B1E2D] text-white text-center relative border-b-4 border-[#D97706]">
        {/* Left Side Logo if present */}
        {organization.logoUrl && (
          <div className="absolute left-6 top-6 w-16 h-16 md:w-20 md:h-20 bg-white rounded-full p-1 shadow-md hidden sm:flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={organization.logoUrl}
              alt="Organization Logo"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}

        {/* Right Side Header Logo if present */}
        {organization.headerLogoUrl && (
          <div className="absolute right-6 top-6 w-16 h-16 md:w-20 md:h-20 bg-white rounded-full p-1 shadow-md hidden sm:flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={organization.headerLogoUrl}
              alt="Header Logo"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}

        <div className="max-w-xl mx-auto space-y-1">
          <div className="inline-block bg-[#D97706] text-white text-xs font-bold uppercase tracking-widest px-3 py-0.5 rounded-full mb-1">
            ।। श्री गणेशाय नमः ।।
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-wide drop-shadow-sm">
            {organization.name || "श्री गणेश उत्सव मंडळ"}
          </h1>
          {organization.registrationNumber && (
            <p className="text-xs text-amber-200 font-medium">
              Reg. No: {organization.registrationNumber}
            </p>
          )}
          {(organization.address || organization.city) && (
            <p className="text-xs text-amber-100 opacity-90">
              {[organization.address, organization.city, organization.state, organization.pincode]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
          {organization.orgMobile && (
            <p className="text-xs text-amber-200">
              संपर्क: {organization.orgMobile}
            </p>
          )}
        </div>
      </div>

      {/* Receipt Meta Bar */}
      <div className="bg-[#FFF5E6] px-6 py-3 border-b-2 border-dashed border-[#8B1E2D]/30 flex flex-wrap items-center justify-between gap-4 text-xs md:text-sm font-bold">
        <div className="flex items-center gap-2">
          <span className="text-[#8B1E2D]">{labels.receiptNo}:</span>
          <span className="bg-[#8B1E2D] text-white px-2.5 py-0.5 rounded-md font-mono tracking-wider">
            {receipt.receiptNumber}
          </span>
        </div>
        <div className="flex items-center gap-4 text-gray-700">
          <div>
            <span className="text-gray-500 mr-1">{labels.date}:</span>
            <span>{formattedDate}</span>
          </div>
          {formattedTime && (
            <div>
              <span className="text-gray-500 mr-1">{labels.time}:</span>
              <span>{formattedTime}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Receipt Body */}
      <div className="p-6 md:p-8 space-y-5 text-sm md:text-base">
        {/* Donor Row */}
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 border-b border-[#8B1E2D]/20 pb-2">
          <span className="font-bold text-[#8B1E2D] min-w-[210px] shrink-0">
            {labels.receivedFrom}:
          </span>
          <span className="font-extrabold text-lg text-gray-900 flex-1">
            {receipt.donorName || "देणगीदार"}
          </span>
        </div>

        {/* Mobile & Address Row */}
        {(receipt.donorMobile || receipt.donorAddress) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-[#8B1E2D]/20 pb-2 text-sm">
            {receipt.donorMobile && (
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-600">{labels.mobile}:</span>
                <span className="font-mono text-gray-800">{receipt.donorMobile}</span>
              </div>
            )}
            {receipt.donorAddress && (
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-600">{labels.address}:</span>
                <span className="text-gray-800 truncate">{receipt.donorAddress}</span>
              </div>
            )}
          </div>
        )}

        {/* Amount in Numbers & Words Box */}
        <div className="bg-[#FFF0D4] p-4 rounded-xl border border-[#D97706]/40 space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-bold text-[#8B1E2D]">{labels.sumOfRupees}:</span>
            <div className="bg-[#8B1E2D] text-white px-4 py-1.5 rounded-lg text-xl md:text-2xl font-black font-mono tracking-tight shadow-xs">
              ₹ {receipt.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          {amountInWords && (
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 pt-1 border-t border-[#D97706]/30">
              <span className="text-xs font-bold text-gray-600 shrink-0">
                {labels.rupeesInWords}:
              </span>
              <span className="font-bold text-[#8B1E2D] italic text-sm md:text-base">
                {amountInWords}
              </span>
            </div>
          )}
        </div>

        {/* Purpose Row */}
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 border-b border-[#8B1E2D]/20 pb-2">
          <span className="font-bold text-[#8B1E2D] min-w-[210px] shrink-0">
            {labels.towards}:
          </span>
          <span className="font-bold text-gray-800 flex-1">
            {receipt.purpose || "General Donation (देणगी)"}
          </span>
        </div>

        {/* Payment Mode Chips & Status */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-gray-600 uppercase tracking-wider">
              {labels.paymentMode}:
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-900 border border-green-300 rounded-lg text-xs font-black uppercase tracking-wider shadow-2xs">
              {payModeLower === "cash"
                ? labels.cash
                : payModeLower === "upi"
                ? labels.upi
                : payModeLower === "bank"
                ? labels.bank
                : payModeLower === "cheque"
                ? labels.cheque
                : labels.other}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-gray-600 uppercase tracking-wider">
              {labels.status}:
            </span>
            <span
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                isPaid
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-500 text-white"
              }`}
            >
              {isPaid ? labels.paid : labels.pending}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Signatures & Verification QR */}
      <div className="px-6 md:px-8 py-6 bg-[#FFF9E6] border-t-2 border-[#D97706]/40 flex flex-wrap items-end justify-between gap-6">
        {/* Verification QR Code */}
        <div className="flex items-center gap-3">
          {qrCodeDataUrl ? (
            <div className="bg-white p-1.5 rounded-lg border border-gray-300 shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeDataUrl}
                alt="Digital Receipt Verification QR"
                className="w-20 h-20 md:w-24 md:h-24"
              />
            </div>
          ) : (
            <div className="w-20 h-20 bg-gray-100 rounded-lg animate-pulse" />
          )}
          <div className="text-[11px] text-gray-600 space-y-0.5 leading-tight">
            <p className="font-bold text-gray-800">Scan QR Code</p>
            <p>To verify digital receipt authenticity</p>
            <p className="text-[9px] text-[#8B1E2D] font-mono">pavtibook.online</p>
          </div>
        </div>

        {/* Center Stamp if uploaded */}
        {organization.stampUrl && (
          <div className="w-24 h-24 flex items-center justify-center opacity-85 rotate-[-6deg]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={organization.stampUrl}
              alt="Organization Stamp"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}

        {/* Committee & Collector Signatures */}
        <div className="flex flex-wrap items-end justify-end gap-6 sm:gap-8 text-center">
          {/* President Signature if present */}
          {organization.presidentSignatureUrl && (
            <div className="space-y-1">
              <div className="h-12 flex items-end justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={organization.presidentSignatureUrl}
                  alt="President Signature"
                  className="max-h-full max-w-[110px] object-contain"
                />
              </div>
              <div className="w-28 border-t-2 border-[#8B1E2D]" />
              <p className="text-[11px] font-bold text-[#8B1E2D]">
                {effectiveLang === "mr" ? "अध्यक्ष स्वाक्षरी" : effectiveLang === "hi" ? "अध्यक्ष हस्ताक्षर" : "President"}
              </p>
              {organization.presidentName && (
                <p className="text-[9px] text-gray-500 font-medium">({organization.presidentName})</p>
              )}
            </div>
          )}

          {/* Treasurer Signature if present */}
          {organization.treasurerSignatureUrl && (
            <div className="space-y-1">
              <div className="h-12 flex items-end justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={organization.treasurerSignatureUrl}
                  alt="Treasurer Signature"
                  className="max-h-full max-w-[110px] object-contain"
                />
              </div>
              <div className="w-28 border-t-2 border-[#8B1E2D]" />
              <p className="text-[11px] font-bold text-[#8B1E2D]">
                {effectiveLang === "mr" ? "कोषाध्यक्ष स्वाक्षरी" : effectiveLang === "hi" ? "कोषाध्यक्ष हस्ताक्षर" : "Treasurer"}
              </p>
              {organization.treasurerName && (
                <p className="text-[9px] text-gray-500 font-medium">({organization.treasurerName})</p>
              )}
            </div>
          )}

          {/* Secretary Signature if present */}
          {organization.secretarySignatureUrl && (
            <div className="space-y-1">
              <div className="h-12 flex items-end justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={organization.secretarySignatureUrl}
                  alt="Secretary Signature"
                  className="max-h-full max-w-[110px] object-contain"
                />
              </div>
              <div className="w-28 border-t-2 border-[#8B1E2D]" />
              <p className="text-[11px] font-bold text-[#8B1E2D]">
                {effectiveLang === "mr" ? "सचिव स्वाक्षरी" : effectiveLang === "hi" ? "सचिव हस्ताक्षर" : "Secretary"}
              </p>
              {organization.secretaryName && (
                <p className="text-[9px] text-gray-500 font-medium">({organization.secretaryName})</p>
              )}
            </div>
          )}

          {/* Authorized Signatory (Fallback or primary if committee not configured) */}
          {!organization.presidentSignatureUrl && !organization.treasurerSignatureUrl && !organization.secretarySignatureUrl && (
            <div className="space-y-1">
              <div className="h-12 flex items-end justify-center">
                {organization.signatureUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={organization.signatureUrl}
                    alt="Authorized Signature"
                    className="max-h-full max-w-[110px] object-contain"
                  />
                ) : (
                  <span className="text-[11px] text-gray-400 italic">Signature</span>
                )}
              </div>
              <div className="w-28 border-t-2 border-[#8B1E2D]" />
              <p className="text-[11px] font-bold text-[#8B1E2D]">
                {labels.authorizedSign}
              </p>
            </div>
          )}

          {/* Receiver / Collector Sign */}
          <div className="space-y-1">
            <div className="h-12 flex items-end justify-center">
              <span className="font-script text-gray-700 italic text-sm font-semibold">
                {receipt.collectorName || "Authorized User"}
              </span>
            </div>
            <div className="w-28 border-t-2 border-[#8B1E2D]" />
            <p className="text-[11px] font-bold text-[#8B1E2D]">
              {labels.receiverSign}
            </p>
            {receipt.collectorRole && (
              <p className="text-[9px] text-gray-500">({receipt.collectorRole})</p>
            )}
          </div>
        </div>
      </div>

      {/* Trust Footer Note */}
      <div className="bg-[#8B1E2D] text-amber-100 text-center py-2 px-4 text-[11px] font-medium flex items-center justify-between border-t border-[#D97706]">
        <span>
          {organization.footerText || "आपल्या मोलाच्या देणगीबद्दल धन्यवाद!"}
        </span>
        <span className="font-mono opacity-80">Powered by PavtiBook</span>
      </div>
    </div>
  );
};
