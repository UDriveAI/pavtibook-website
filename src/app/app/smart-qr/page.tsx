"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/lib/i18n";

// ─── Android Config Constants (mirrors smart_donation_qr_config.dart) ─────────
// CRITICAL: smartDonationQrComingSoon = true | smartDonationQrEnabled = false (compliance #20504096)
const SMART_DONATION_QR_COMING_SOON = true;

const AVAILABLE_ORG_TYPES = [
  "Mandal",
  "Trust",
  "Temple",
  "Vihara",
  "NGO / Social",
  "Other",
];

const AVAILABLE_USE_CASES = [
  "Festival collections (उत्सव देणगी)",
  "Temple / Trust donations (मंदिर / ट्रस्ट देणगी)",
  "Social work (सामाजिक कार्य)",
  "General donations (सामान्य देणगी)",
  "Other (इतर)",
];

// ─── Types ─────────────────────────────────────────────────────────────────────
interface InterestData {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationType: string;
  userId: string;
  userName: string;
  mobile: string;
  email: string;
  city: string;
  state: string;
  useCase: string;
  notifyWhenAvailable: boolean;
  status: string;
  source: string;
  interestedAt?: { toDate?: () => Date } | Date | string;
  createdAt?: { toDate?: () => Date } | Date | string;
}

// ─── Helper: Log funnel analytics (non-blocking, best-effort) ─────────────────
async function logAnalyticsEvent(eventName: string) {
  try {
    const docRef = doc(db, "smart_donation_qr_analytics", "summary");
    await setDoc(
      docRef,
      {
        [eventName]: increment(1),
        lastEventAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch {
    // Non-fatal — mirrors Android: debugPrint error, never throws
  }
}

// ─── Helper: Generate UPI QR canvas ───────────────────────────────────────────
function useUpiQrCanvas(upiId: string, merchantName: string, size = 220) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !upiId) return;

    const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&cu=INR`;

    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(canvasRef.current!, upiUri, {
        width: size,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
        errorCorrectionLevel: "H",
      }).catch(() => {});
    });
  }, [upiId, merchantName, size]);

  return canvasRef;
}

// ─── Standee Component ─────────────────────────────────────────────────────────
function StandeePreview({
  orgName,
  regNo,
  upiId,
  merchantName,
  logoUrl,
}: {
  orgName: string;
  regNo?: string;
  upiId: string;
  merchantName: string;
  logoUrl?: string;
}) {
  const canvasRef = useUpiQrCanvas(upiId, merchantName, 220);

  return (
    <div
      id="pavtibook-standee"
      className="bg-white border-4 border-[#8B1E2D] rounded-2xl overflow-hidden shadow-xl"
      style={{ width: 340, minHeight: 480 }}
    >
      {/* Top auspicious header */}
      <div className="bg-[#8B1E2D] text-white text-center py-3 px-4">
        <p className="text-xs font-semibold tracking-widest opacity-90">
          ॥ श्री गणेशाय नमः ॥
        </p>
        <p className="text-[10px] opacity-70 mt-0.5">सर्वांचे स्वागत आहे</p>
      </div>

      {/* Organization identity */}
      <div className="flex flex-col items-center px-6 pt-5 pb-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt="org logo"
            className="w-16 h-16 rounded-full object-cover border-2 border-[#8B1E2D]/20 mb-3"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[#8B1E2D]/10 flex items-center justify-center border-2 border-[#8B1E2D]/20 mb-3">
            <span className="text-2xl">🏛️</span>
          </div>
        )}
        <h2
          className="text-[#2E1C0C] font-black text-center leading-tight"
          style={{ fontSize: 16 }}
        >
          {orgName || "संस्थेचे नाव"}
        </h2>
        {regNo && (
          <p className="text-gray-500 text-[10px] mt-0.5">
            Reg. No: {regNo}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="mx-6 border-t border-dashed border-[#8B1E2D]/30 my-1" />

      {/* Instruction */}
      <p className="text-center text-xs text-gray-600 px-4 pt-2 pb-1">
        देणगी द्यावयास QR स्कॅन करा
      </p>
      <p className="text-center text-[10px] text-gray-400 pb-2">
        Scan QR Code to Donate
      </p>

      {/* QR Code */}
      <div className="flex justify-center px-6 pb-3">
        {upiId ? (
          <div className="border-4 border-[#8B1E2D]/10 rounded-xl overflow-hidden bg-white p-1">
            <canvas ref={canvasRef} style={{ display: "block" }} />
          </div>
        ) : (
          <div
            className="bg-gray-100 rounded-xl flex items-center justify-center"
            style={{ width: 228, height: 228 }}
          >
            <div className="text-center text-gray-400">
              <span className="text-3xl block mb-2">📱</span>
              <p className="text-xs">UPI ID not configured</p>
            </div>
          </div>
        )}
      </div>

      {/* UPI info */}
      <div className="text-center px-4 pb-3">
        <p className="text-xs font-bold text-[#2E1C0C]">{merchantName || orgName}</p>
        <p className="text-xs text-[#8B1E2D] font-mono">{upiId}</p>
      </div>

      {/* UPI app icons row */}
      <div className="flex justify-center gap-3 pb-3 px-4">
        {["GPay", "PhonePe", "Paytm", "BHIM"].map((app) => (
          <div
            key={app}
            className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-[9px] font-bold text-gray-500"
          >
            {app}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-100 text-center py-2">
        <p className="text-[9px] text-gray-400">
          Digital Pavti Powered by{" "}
          <span className="font-bold text-[#8B1E2D]">PavtiBook</span>
        </p>
      </div>
    </div>
  );
}

// ─── Tab 1: Standee Generator ──────────────────────────────────────────────────
function StandeeGeneratorTab({
  orgData,
}: {
  orgId: string;
  orgData: Record<string, string>;
}) {
  const { t } = useLanguage();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState("");

  const upiId: string = (orgData.upi_id as string) || "";
  const merchantName: string =
    (orgData.upi_merchant_name as string) ||
    (orgData.name as string) ||
    "";
  const orgName: string = (orgData.name as string) || "";
  const regNo: string = (orgData.registrationNumber as string) || "";
  const logoUrl: string =
    (orgData.logoUrl as string) ||
    (orgData.logo_url as string) ||
    "";

  const hasUpi = !!upiId;

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleDownload = async () => {
    if (!hasUpi) return;
    setIsDownloading(true);
    setDownloadMsg("");
    try {
      const { toPng } = await import("html-to-image");
      const el = document.getElementById("pavtibook-standee");
      if (!el) throw new Error("Standee element not found");
      const dataUrl = await toPng(el, { quality: 0.95, pixelRatio: 3 });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `PavtiBook_Standee_${orgName.replace(/\s+/g, "_")}.png`;
      link.click();
      setDownloadMsg(t("standee_downloaded_success", "Standee PNG downloaded!"));
    } catch {
      setDownloadMsg(t("standee_download_failed", "Download failed. Please try print instead."));
    } finally {
      setIsDownloading(false);
      setTimeout(() => setDownloadMsg(""), 4000);
    }
  };

  return (
    <div className="space-y-5">
      {!hasUpi && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-amber-600 text-lg mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-bold text-amber-800">
              {t("upi_id_not_configured", "UPI ID Not Configured")}
            </p>
            <p className="text-xs text-amber-700 mt-1">
              {t(
                "upi_id_not_configured_desc",
                "Please set up your official UPI ID in Receipt Customization settings to generate your QR Standee."
              )}
            </p>
            <Link
              href="/app/settings/customization"
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-amber-700 underline"
            >
              Go to Customization Settings →
            </Link>
          </div>
        </div>
      )}

      {/* Standee preview (printable) */}
      <div className="flex flex-col items-center gap-4">
        <div id="standee-print-wrapper" className="print:shadow-none">
          <StandeePreview
            orgName={orgName}
            regNo={regNo}
            upiId={upiId}
            merchantName={merchantName}
            logoUrl={logoUrl}
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={handleDownload}
            disabled={!hasUpi || isDownloading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B1E2D] text-white text-sm font-bold shadow hover:bg-[#7a1825] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isDownloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t("downloading", "Downloading...")}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {t("download_standee", "Download PNG")}
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            disabled={!hasUpi || isPrinting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[#8B1E2D] text-[#8B1E2D] text-sm font-bold hover:bg-[#8B1E2D]/5 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {t("print_standee", "Print Standee")}
          </button>

          <Link
            href="/app/settings/customization"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            {t("edit_upi_details", "Edit UPI Details")}
          </Link>
        </div>

        {downloadMsg && (
          <p className="text-sm text-center text-[#8B1E2D] font-medium">{downloadMsg}</p>
        )}
      </div>

      {/* How to use */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-bold text-gray-800">
          {t("how_to_use_standee", "How to Use Your QR Standee")}
        </h3>
        <ul className="space-y-1.5">
          {[
            t("standee_tip_1", "Print this standee on thick paper or get it laminated for festivals."),
            t("standee_tip_2", "Place it on your donation table or temple entrance."),
            t("standee_tip_3", "Donors scan with any UPI app — GPay, PhonePe, Paytm, or BHIM."),
            t("standee_tip_4", "For digital receipts on WhatsApp, enable Smart Donation QR (coming soon)."),
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="w-4 h-4 rounded-full bg-[#8B1E2D]/10 text-[#8B1E2D] flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Tab 2: Smart Donation System (Coming Soon + Demand Capture) ───────────────
function SmartDonationTab({
  orgId,
  userData,
  activeOrgData,
}: {
  orgId: string;
  userData: Record<string, unknown> | null;
  activeOrgData: Record<string, unknown> | null;
}) {
  const { t } = useLanguage();
  const [existingInterest, setExistingInterest] = useState<InterestData | null>(null);
  const [isLoadingInterest, setIsLoadingInterest] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [hasLoggedFormStart, setHasLoggedFormStart] = useState(false);

  // Form state
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState(AVAILABLE_ORG_TYPES[0]);
  const [contactName, setContactName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [useCase, setUseCase] = useState(AVAILABLE_USE_CASES[0]);
  const [notifyMe, setNotifyMe] = useState(true);

  // Load existing interest + prefill
  useEffect(() => {
    if (!orgId) {
      setIsLoadingInterest(false);
      return;
    }
    logAnalyticsEvent("smart_qr_opened");

    const docId = `org_${orgId}`;
    getDoc(doc(db, "smart_donation_qr_interest", docId))
      .then((snap) => {
        if (snap.exists()) {
          setExistingInterest({ id: snap.id, ...snap.data() } as InterestData);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingInterest(false));
  }, [orgId]);

  // Prefill from org/user data
  useEffect(() => {
    if (existingInterest) {
      setOrgName(existingInterest.organizationName || "");
      setOrgType(existingInterest.organizationType || AVAILABLE_ORG_TYPES[0]);
      setContactName(existingInterest.userName || "");
      setMobile(existingInterest.mobile || "");
      setEmail(existingInterest.email || "");
      setCity(existingInterest.city || "");
      setState(existingInterest.state || "Maharashtra");
      setUseCase(existingInterest.useCase || AVAILABLE_USE_CASES[0]);
      setNotifyMe(existingInterest.notifyWhenAvailable ?? true);
    } else {
      setOrgName((activeOrgData?.name as string) || "");
      setOrgType((activeOrgData?.type as string) || AVAILABLE_ORG_TYPES[0]);
      setContactName((userData?.name as string) || "");
      setMobile((userData?.mobile as string) || (activeOrgData?.mobile as string) || "");
      setEmail((userData?.email as string) || (activeOrgData?.email as string) || "");
      setCity((activeOrgData?.city as string) || "");
      setState((activeOrgData?.state as string) || "Maharashtra");
    }
  }, [existingInterest, userData, activeOrgData]);

  const handleFormFocus = useCallback(() => {
    if (!hasLoggedFormStart) {
      setHasLoggedFormStart(true);
      logAnalyticsEvent("smart_qr_interest_form_started");
    }
  }, [hasLoggedFormStart]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !userData) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const docId = `org_${orgId}`;
      const now = new Date();
      const payload = {
        id: docId,
        organizationId: orgId,
        organizationName: orgName.trim(),
        organizationType: orgType.trim(),
        userId: (userData.id as string) || "",
        userName: contactName.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        city: city.trim(),
        state: state.trim(),
        useCase: useCase.trim(),
        notifyWhenAvailable: notifyMe,
        status: "interested",
        source: "web_app",
        interestedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(existingInterest ? {} : { createdAt: serverTimestamp() }),
      };

      await setDoc(doc(db, "smart_donation_qr_interest", docId), payload, { merge: true });
      await logAnalyticsEvent("smart_qr_interest_completed");

      setExistingInterest({
        ...payload,
        interestedAt: now,
        createdAt: now,
      } as unknown as InterestData);
      setSubmitSuccess(true);
    } catch {
      setSubmitError(t("interest_submit_error", "Could not save your interest. Please check your connection and try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInterestDate = () => {
    if (!existingInterest?.interestedAt) return "";
    const raw = existingInterest.interestedAt;
    if (typeof raw === "object" && "toDate" in raw && typeof raw.toDate === "function") {
      return raw.toDate().toLocaleDateString("en-IN");
    }
    if (raw instanceof Date) return raw.toLocaleDateString("en-IN");
    return "";
  };

  return (
    <div className="space-y-5">
      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-br from-[#8B1E2D] to-[#C0392B] rounded-2xl p-5 text-white">
        <div className="flex items-start gap-3">
          <span className="text-3xl">🚀</span>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-black text-base">{t("smart_donation_system_title", "Smart Donation System")}</h3>
              <span className="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                COMING SOON
              </span>
            </div>
            <p className="text-xs text-white/80 leading-relaxed">
              {t(
                "smart_donation_tagline",
                "One QR for Donations, Digital Receipts & Donor Growth."
              )}
            </p>
            <p className="text-[11px] text-white/70 mt-1">
              देणग्या, डिजिटल पावत्या आणि दानशूर डेटाबेस — एकाच स्मार्ट QR मध्ये.
            </p>
          </div>
        </div>
      </div>

      {/* Feature highlights */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">
            {t("what_you_get", "What You Get with Smart Donation QR")}
          </h3>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { icon: "📱", title: t("feature_donor_self_fill", "Donor Self-Fill Form"), desc: t("feature_donor_self_fill_desc", "Donors enter their own name, mobile, and amount — zero operator entry required.") },
            { icon: "💬", title: t("feature_instant_whatsapp", "Instant WhatsApp Receipt"), desc: t("feature_instant_whatsapp_desc", "Automated digital Pavti delivered to donor's WhatsApp immediately on payment.") },
            { icon: "📊", title: t("feature_donor_database", "Auto Donor Database"), desc: t("feature_donor_database_desc", "Every donor is captured automatically with name, mobile, amount, and date.") },
            { icon: "🔒", title: t("feature_compliance", "Razorpay Compliance"), desc: t("feature_compliance_desc", "Compliant payment gateway integration pending regulatory approval #20504096.") },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3 p-3.5">
              <span className="text-xl flex-shrink-0">{f.icon}</span>
              <div>
                <p className="text-xs font-bold text-gray-800">{f.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Existing registration confirmation OR form */}
      {isLoadingInterest ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-[#8B1E2D]/20 border-t-[#8B1E2D] rounded-full animate-spin" />
        </div>
      ) : existingInterest && !submitSuccess ? (
        // Already registered card
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 text-lg">✅</span>
            <h3 className="font-bold text-emerald-800 text-sm">
              {t("already_registered_title", "Your Interest is Registered!")}
            </h3>
          </div>
          <p className="text-xs text-emerald-700">
            {t("already_registered_desc", "We'll notify you as soon as Smart Donation QR launches for your organization.")}
          </p>
          <div className="bg-white rounded-lg p-3 space-y-1.5 border border-emerald-100 mt-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">{t("org_label", "Organization")}</span>
              <span className="font-medium text-gray-800">{existingInterest.organizationName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">{t("status_label", "Status")}</span>
              <span className="capitalize font-bold text-emerald-600">{existingInterest.status}</span>
            </div>
            {getInterestDate() && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">{t("registered_on", "Registered on")}</span>
                <span className="text-gray-800">{getInterestDate()}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setExistingInterest(null)}
            className="text-xs text-[#8B1E2D] font-medium underline mt-1"
          >
            {t("update_interest", "Update my interest details")}
          </button>
        </div>
      ) : submitSuccess ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center space-y-2">
          <span className="text-3xl block">🎉</span>
          <p className="font-bold text-emerald-800 text-sm">
            {t("interest_registered_success", "Thank you! We'll notify you when Smart Donation QR launches.")}
          </p>
        </div>
      ) : (
        // Interest registration form
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
          <div
            className="p-4 border-b border-gray-100 cursor-pointer"
            onClick={() => logAnalyticsEvent("smart_qr_interest_clicked")}
          >
            <h3 className="text-sm font-bold text-gray-800">
              {t("register_early_access", "Register for Early Access")}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("register_early_access_desc", "Be among the first organizations to get Smart Donation QR.")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-3" onFocus={handleFormFocus}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t("org_name_label", "Organization Name")} *
                </label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/30 focus:border-[#8B1E2D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t("org_type_label", "Organization Type")} *
                </label>
                <select
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/30 focus:border-[#8B1E2D] bg-white"
                >
                  {AVAILABLE_ORG_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t("contact_person_label", "Contact Person")} *
                </label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/30 focus:border-[#8B1E2D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t("mobile_label", "Mobile Number")} *
                </label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/30 focus:border-[#8B1E2D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t("email_label", "Email")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/30 focus:border-[#8B1E2D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t("city_label", "City")}
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/30 focus:border-[#8B1E2D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t("state_label", "State")}
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/30 focus:border-[#8B1E2D]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t("use_case_label", "Primary Use Case")} *
                </label>
                <select
                  value={useCase}
                  onChange={(e) => setUseCase(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/30 focus:border-[#8B1E2D] bg-white"
                >
                  {AVAILABLE_USE_CASES.map((uc) => (
                    <option key={uc} value={uc}>{uc}</option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyMe}
                onChange={(e) => setNotifyMe(e.target.checked)}
                className="mt-0.5 rounded text-[#8B1E2D] focus:ring-[#8B1E2D]"
              />
              <span className="text-xs text-gray-600">
                {t("notify_when_available", "Notify me via WhatsApp / Email when Smart Donation QR is available")}
              </span>
            </label>

            {submitError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-[#8B1E2D] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#7a1825] disabled:opacity-60 transition"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("submitting", "Submitting...")}
                </>
              ) : (
                t("register_interest_btn", "Register My Interest")
              )}
            </button>
          </form>
        </div>
      )}

      {/* Compliance note */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
        <span className="text-blue-500 text-sm mt-0.5">ℹ️</span>
        <p className="text-xs text-blue-700">
          {t(
            "compliance_note",
            "Smart Donation QR live payment collection is pending regulatory compliance approval (Ref #20504096). The UPI QR Standee above can be used immediately for offline donation collection."
          )}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function SmartQrPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user, userData, activeOrgId, activeOrgData, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"standee" | "smart">("standee");
  const [orgFullData, setOrgFullData] = useState<Record<string, string>>({});

  // Log page view on mount
  useEffect(() => {
    logAnalyticsEvent("smart_qr_viewed");
  }, []);

  // Fetch full org data (includes upi_id, upi_merchant_name etc.)
  useEffect(() => {
    if (!activeOrgId) return;
    getDoc(doc(db, "organizations", activeOrgId))
      .then((snap) => {
        if (snap.exists()) {
          setOrgFullData({ id: snap.id, ...snap.data() } as Record<string, string>);
        }
      })
      .catch(() => {});
  }, [activeOrgId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#8B1E2D]/20 border-t-[#8B1E2D] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #standee-print-wrapper { display: flex !important; justify-content: center; }
          #pavtibook-standee { display: block !important; }
        }
      `}</style>

      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5 pb-20">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900">
              {t("smart_qr_title", "Smart Donation QR")}
            </h1>
            <p className="text-xs text-gray-500">
              {t("smart_qr_subtitle", "Official UPI Standee & Digital Donor Registration")}
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveTab("standee")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
              activeTab === "standee"
                ? "bg-white text-[#8B1E2D] shadow-xs"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🪧 {t("tab_standee_generator", "UPI QR Standee")}
          </button>
          <button
            onClick={() => {
              setActiveTab("smart");
              logAnalyticsEvent("smart_qr_interest_clicked");
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition relative ${
              activeTab === "smart"
                ? "bg-white text-[#8B1E2D] shadow-xs"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🚀 {t("tab_smart_donation", "Smart Donation")}{" "}
            {SMART_DONATION_QR_COMING_SOON && (
              <span className="absolute -top-1 -right-1 bg-[#8B1E2D] text-white text-[8px] font-black px-1 py-0.5 rounded-full leading-none">
                SOON
              </span>
            )}
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "standee" ? (
          <StandeeGeneratorTab orgId={activeOrgId || ""} orgData={orgFullData} />
        ) : (
          <SmartDonationTab
            orgId={activeOrgId || ""}
            userData={userData as Record<string, unknown> | null}
            activeOrgData={activeOrgData as Record<string, unknown> | null}
          />
        )}
      </div>
    </>
  );
}
