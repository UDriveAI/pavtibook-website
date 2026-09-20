"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { useCollector } from "@/context/CollectorContext";
import { useLanguage } from "@/lib/i18n";
import { db, functions } from "@/lib/firebase-client";
import {
  ArrowLeft,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  ChevronRight,
} from "lucide-react";

interface DonorSuggestion {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
}

export default function CreateReceiptPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { activeOrg, activeRole } = useOrg();
  const { t } = useLanguage();
  const {
    isCollectorMode,
    rememberSelections,
    lastPurpose,
    lastPaymentMode,
    lastCollectedBy,
    setLastPurpose,
    setLastPaymentMode,
    setLastCollectedBy,
  } = useCollector();

  // Form State
  const [donorName, setDonorName] = useState("");
  const [donorMobile, setDonorMobile] = useState("");
  const [donorAddress, setDonorAddress] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("Donation (देणगी)");
  const [customPurpose, setCustomPurpose] = useState("");
  const [isCustomPurpose, setIsCustomPurpose] = useState(false);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [collectorRole, setCollectorRole] = useState("");

  // Donor Autocomplete State
  const [suggestions, setSuggestions] = useState<DonorSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingDonors, setIsSearchingDonors] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Submission & Quota State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // Predefined purposes matching Android CreateReceiptScreen
  const predefinedPurposes = [
    "Donation (देणगी)",
    "Festival Vargani (वर्गणी)",
    "Aarti Pooja Sponsor (आरती प्रायोजक)",
    "Building & Development Fund (इमारत निधी)",
    "Charity Relief (मदत निधी)",
    "Cultural Program (सांस्कृतिक कार्यक्रम)",
    "Other Contribution",
  ];

  // Initialize form with Collector Mode preferences if active
  useEffect(() => {
    if (isCollectorMode && rememberSelections) {
      if (lastPaymentMode) {
        setPaymentMode(lastPaymentMode.toLowerCase());
        setPaymentStatus(lastPaymentMode.toLowerCase() === "cash" ? "paid" : "pending");
      }
      if (lastCollectedBy) {
        setCollectorRole(lastCollectedBy);
      }
      if (lastPurpose) {
        if (predefinedPurposes.includes(lastPurpose)) {
          setPurpose(lastPurpose);
          setIsCustomPurpose(lastPurpose === "Other Contribution");
        } else {
          setPurpose("Other Contribution");
          setCustomPurpose(lastPurpose);
          setIsCustomPurpose(true);
        }
      }
    } else {
      setCollectorRole(activeRole || userData?.role || "Member");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCollectorMode, rememberSelections, lastPurpose, lastPaymentMode, lastCollectedBy, activeRole, userData]);

  // Payment mode change automatically defaults cash to paid
  const handlePaymentModeChange = (mode: string) => {
    setPaymentMode(mode);
    if (mode === "cash") {
      setPaymentStatus("paid");
    } else {
      setPaymentStatus("pending");
    }
  };

  // F12: Donor Lookup & Autocomplete
  const handleMobileChange = async (val: string) => {
    const cleanDigits = val.replace(/\D/g, "");
    setDonorMobile(cleanDigits);

    if (cleanDigits.length === 10 && activeOrg?.id) {
      setIsSearchingDonors(true);
      try {
        const donorsRef = collection(db, "donors");
        const q = query(
          donorsRef,
          where("organizationId", "==", activeOrg.id),
          where("mobile", "==", cleanDigits),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const donorDoc = snap.docs[0].data();
          if (donorDoc.name && !donorName) setDonorName(donorDoc.name);
          if (donorDoc.address && !donorAddress) setDonorAddress(donorDoc.address);
          if (donorDoc.email && !donorEmail) setDonorEmail(donorDoc.email);
        }
      } catch (err) {
        console.error("Error searching donor by mobile:", err);
      } finally {
        setIsSearchingDonors(false);
      }
    }
  };

  // Name live autocomplete dropdown
  const handleNameChange = (val: string) => {
    setDonorName(val);
    if (!activeOrg?.id || val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const donorsRef = collection(db, "donors");
        const q = query(
          donorsRef,
          where("organizationId", "==", activeOrg.id),
          where("name", ">=", val.trim()),
          where("name", "<=", val.trim() + "\uf8ff"),
          limit(5)
        );
        const snap = await getDocs(q);
        const matches: DonorSuggestion[] = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "",
          mobile: d.data().mobile || "",
          email: d.data().email || "",
          address: d.data().address || "",
        }));
        setSuggestions(matches);
        setShowSuggestions(matches.length > 0);
      } catch (err) {
        console.error("Error matching donors by name:", err);
      }
    }, 250);
  };

  const selectSuggestion = (donor: DonorSuggestion) => {
    setDonorName(donor.name);
    if (donor.mobile) setDonorMobile(donor.mobile);
    if (donor.address) setDonorAddress(donor.address);
    if (donor.email) setDonorEmail(donor.email);
    setShowSuggestions(false);
  };

  // Handle Purpose Dropdown
  const handlePurposeChange = (val: string) => {
    setPurpose(val);
    setIsCustomPurpose(val === "Other Contribution");
  };

  // F14: Authoritative Cloud Function Call createReceipt
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!user) {
      setFormError("User authentication required.");
      return;
    }

    if (!activeOrg?.id) {
      setFormError("No active organization selected.");
      return;
    }

    if (!donorName.trim()) {
      setFormError("Please enter donor name.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("Please enter a valid donation amount.");
      return;
    }

    // F13: Custom Purpose Validation (2 to 60 characters, stored directly in purpose)
    let effectivePurpose = purpose.trim();
    if (isCustomPurpose) {
      const customTrim = customPurpose.trim();
      if (customTrim.length < 2 || customTrim.length > 60) {
        setFormError("Custom purpose must be between 2 and 60 characters.");
        return;
      }
      effectivePurpose = customTrim;
    }

    setIsSubmitting(true);

    try {
      const createReceiptFn = httpsCallable<
        {
          organizationId: string;
          donorName: string;
          donorMobile?: string;
          donorAddress?: string;
          donorEmail?: string;
          amount: number;
          purpose: string;
          paymentMode: string;
          paymentStatus: string;
          collectorRole?: string;
          idempotencyKey: string;
        },
        { success: boolean; receipt: { id: string; receiptNumber: string } }
      >(functions, "createReceipt");

      const idempotencyKey = `web_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const response = await createReceiptFn({
        organizationId: activeOrg.id,
        donorName: donorName.trim(),
        donorMobile: donorMobile.trim() || undefined,
        donorAddress: donorAddress.trim() || undefined,
        donorEmail: donorEmail.trim() || undefined,
        amount: numAmount,
        purpose: effectivePurpose,
        paymentMode: paymentMode.toLowerCase(),
        paymentStatus: paymentStatus.toLowerCase(),
        collectorRole: collectorRole || activeRole || userData?.role || "Member",
        idempotencyKey,
      });

      const result = response.data;
      const createdReceipt = result?.receipt;

      // Save Collector Mode Preferences
      if (isCollectorMode && rememberSelections) {
        setLastPurpose(effectivePurpose);
        setLastPaymentMode(paymentMode);
        setLastCollectedBy(collectorRole);
      }

      if (createdReceipt?.id) {
        router.push(`/app/receipt/${createdReceipt.id}`);
      } else {
        router.push("/app/receipt-history");
      }
    } catch (err: unknown) {
      console.error("Receipt creation failed:", err);
      const errMsg = err instanceof Error ? err.message : String(err);

      // F15: Free Tier Quota Gate Detection
      if (errMsg.includes("FREE_RECEIPT_LIMIT_EXCEEDED") || errMsg.includes("30") || errMsg.includes("25") || errMsg.includes("limit")) {
        setQuotaExceeded(true);
      } else {
        setFormError(errMsg || "Failed to create receipt. Please check your connection.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 -ml-2 text-stone-600 hover:text-stone-900 rounded-full hover:bg-stone-100 transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-stone-900">
              {t("action_add_receipt")}
            </h1>
            <p className="text-xs text-stone-500 font-medium">
              {activeOrg?.name || "Organization"} · {activeRole || "Member"}
            </p>
          </div>
        </div>

        {isCollectorMode && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-bold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>{t("collector_mode_title")}</span>
          </div>
        )}
      </div>

      {/* Collector Mode Notice Banner */}
      {isCollectorMode && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-900 font-medium">
          <span className="text-base">⚡</span>
          <div>
            <p className="font-bold">{t("collector_mode_banner")}</p>
            <p className="text-amber-700">{t("collector_mode_banner_desc")}</p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {formError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p>{formError}</p>
        </div>
      )}

      {/* Receipt Creation Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-xs space-y-6">
        {/* Donor Name with Autocomplete */}
        <div className="space-y-1.5 relative">
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
            {t("donor_name_label")}
          </label>
          <div className="relative">
            <input
              type="text"
              value={donorName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={t("donor_name_hint")}
              required
              className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-stone-900 text-sm font-medium"
            />
            {isSearchingDonors && (
              <div className="absolute right-3 top-3.5">
                <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Autocomplete Dropdown List */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-2xl shadow-lg z-30 overflow-hidden divide-y divide-stone-100">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectSuggestion(s)}
                  className="w-full text-left px-4 py-3 hover:bg-amber-50 flex items-center justify-between text-xs transition"
                >
                  <div>
                    <p className="font-bold text-stone-900">{s.name}</p>
                    {s.mobile && <p className="text-stone-500">{s.mobile}</p>}
                  </div>
                  {s.address && (
                    <p className="text-stone-400 truncate max-w-[150px]">{s.address}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Donor Mobile & Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
              {t("donor_mobile_label")}
            </label>
            <input
              type="tel"
              maxLength={10}
              value={donorMobile}
              onChange={(e) => handleMobileChange(e.target.value)}
              placeholder={t("donor_mobile_hint")}
              className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-stone-900 text-sm font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
              {t("donor_address_label")}
            </label>
            <input
              type="text"
              value={donorAddress}
              onChange={(e) => setDonorAddress(e.target.value)}
              placeholder={t("donor_address_hint")}
              className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-stone-900 text-sm"
            />
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
            {t("amount_label")}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-3 text-lg font-bold text-stone-500">₹</span>
            <input
              type="number"
              step="1"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("amount_hint")}
              required
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-stone-900 text-xl font-black font-mono"
            />
          </div>
        </div>

        {/* Purpose Selection */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
            {t("purpose_label")}
          </label>
          <select
            value={purpose}
            onChange={(e) => handlePurposeChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-stone-900 text-sm font-medium bg-white"
          >
            {predefinedPurposes.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* F13: Custom Purpose Text Input (2-60 chars) */}
          {isCustomPurpose && (
            <div className="space-y-1 pt-1">
              <label className="block text-xs font-bold text-stone-600">
                {t("custom_purpose_label")}
              </label>
              <input
                type="text"
                minLength={2}
                maxLength={60}
                value={customPurpose}
                onChange={(e) => setCustomPurpose(e.target.value)}
                placeholder={t("custom_purpose_hint")}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] text-stone-900 text-sm font-medium"
              />
              <p className="text-[11px] text-stone-400 text-right">
                {customPurpose.trim().length}/60 chars
              </p>
            </div>
          )}
        </div>

        {/* Payment Mode Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
            {t("payment_mode_label")}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "cash", label: "Cash (रोख)" },
              { id: "upi", label: "UPI (फोनपे/GPay)" },
              { id: "bank", label: "Bank Transfer" },
              { id: "cheque", label: "Cheque (धनादेश)" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handlePaymentModeChange(m.id)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                  paymentMode === m.id
                    ? "bg-[#8B1E2D] text-white border-[#8B1E2D] shadow-xs"
                    : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Status (Cash defaults to paid, other modes allow toggle) */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
            {t("payment_status_label")}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentStatus("paid")}
              className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider border transition flex items-center justify-center gap-2 ${
                paymentStatus === "paid"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t("status_paid")}</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentStatus("pending")}
              className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider border transition flex items-center justify-center gap-2 ${
                paymentStatus === "pending"
                  ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                  : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
              }`}
            >
              <span>⏳</span>
              <span>{t("status_pending")}</span>
            </button>
          </div>
        </div>

        {/* Collector Role Snapshot */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
            {t("collector_label")}
          </label>
          <input
            type="text"
            value={collectorRole}
            onChange={(e) => setCollectorRole(e.target.value)}
            placeholder="e.g. Volunteer / Treasurer"
            className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] text-stone-900 text-xs font-medium"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-[#8B1E2D] hover:bg-[#721824] active:scale-[0.99] text-white rounded-xl font-bold text-base shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{t("creating_receipt")}</span>
            </>
          ) : (
            <span>{t("create_receipt_btn")}</span>
          )}
        </button>
      </form>

      {/* F15: Free Limit Quota Exceeded Modal */}
      {quotaExceeded && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl border border-stone-200">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-stone-900">
              {t("quota_modal_title")}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              {t("quota_modal_desc")}
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => router.push("/app/settings")}
                className="w-full py-3 bg-[#8B1E2D] text-white rounded-xl font-bold text-sm hover:bg-[#721824] transition flex items-center justify-center gap-2"
              >
                <span>{t("upgrade_plan_btn")}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setQuotaExceeded(false)}
                className="w-full py-2.5 text-stone-500 hover:text-stone-800 text-xs font-bold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}