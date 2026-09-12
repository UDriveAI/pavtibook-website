"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Mail,
  Receipt,
  ExternalLink,
  Plus,
} from "lucide-react";
import { db } from "@/lib/firebase-client";
import { useOrg } from "@/context/OrgContext";
import { useLanguage } from "@/lib/i18n";

interface DonorDetail {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  address?: string;
  totalDonated?: number;
  donationCount?: number;
  lastDonationDate?: string;
}

interface DonorReceipt {
  id: string;
  receiptNumber: string;
  amount: number;
  purpose: string;
  paymentMode: string;
  paymentStatus: string;
  createdAt: string;
  collectorName?: string;
  isDeleted?: boolean;
}

export default function DonorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const donorId = resolvedParams.id;

  const router = useRouter();
  const { activeOrg } = useOrg();
  const { t } = useLanguage();

  const [donor, setDonor] = useState<DonorDetail | null>(null);
  const [receipts, setReceipts] = useState<DonorReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeOrg?.id || !donorId) return;

    const loadDonorData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch donor document
        const donorRef = doc(db, "donors", donorId);
        const donorSnap = await getDoc(donorRef);

        let donorData: DonorDetail;
        if (donorSnap.exists()) {
          const d = donorSnap.data();
          donorData = {
            id: donorSnap.id,
            name: d.name || "Donor",
            mobile: d.mobile || "",
            email: d.email || "",
            address: d.address || "",
            totalDonated: d.totalDonated || 0,
            donationCount: d.donationCount || d.receiptCount || 0,
            lastDonationDate: d.lastDonationDate || "",
          };
        } else {
          donorData = {
            id: donorId,
            name: "Donor",
          };
        }

        // 2. Fetch receipts matching donorId OR donorMobile
        const receiptsRef = collection(db, "receipts");
        const q = query(
          receiptsRef,
          where("organizationId", "==", activeOrg.id),
          where("donorId", "==", donorId)
        );

        let receiptsSnap = await getDocs(q);

        // Fallback: If no receipts by donorId and mobile is present, query by mobile
        if (receiptsSnap.empty && donorData.mobile) {
          const qMobile = query(
            receiptsRef,
            where("organizationId", "==", activeOrg.id),
            where("donorMobile", "==", donorData.mobile)
          );
          receiptsSnap = await getDocs(qMobile);
        }

        const list: DonorReceipt[] = receiptsSnap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            receiptNumber: data.receiptNumber || "",
            amount: typeof data.amount === "number" ? data.amount : 0,
            purpose: data.purpose || "",
            paymentMode: data.paymentMode || "cash",
            paymentStatus: data.paymentStatus || "paid",
            createdAt: data.createdAt || "",
            collectorName: data.collectorName || data.createdByName || "",
            isDeleted: data.isDeleted === true,
          };
        });

        // Sort chronological newest first
        list.sort((a, b) => {
          const da = new Date(a.createdAt).getTime() || 0;
          const db = new Date(b.createdAt).getTime() || 0;
          return db - da;
        });

        // Calculate dynamic totals from active receipts
        const activeReceipts = list.filter((r) => !r.isDeleted && r.paymentStatus !== "cancelled");
        const calcTotal = activeReceipts.reduce((sum, r) => sum + r.amount, 0);

        donorData.totalDonated = calcTotal || donorData.totalDonated || 0;
        donorData.donationCount = activeReceipts.length || donorData.donationCount || 0;
        if (activeReceipts.length > 0) {
          donorData.lastDonationDate = activeReceipts[0].createdAt;
        }

        setDonor(donorData);
        setReceipts(list);
      } catch (err) {
        console.error("Failed to load donor profile:", err);
        setError("Failed to load donor profile details.");
      } finally {
        setLoading(false);
      }
    };

    loadDonorData();
  }, [activeOrg?.id, donorId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-[#8B1E2D] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-stone-500 font-medium">Loading donor profile...</p>
      </div>
    );
  }

  if (error || !donor) {
    return (
      <div className="max-w-md mx-auto p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
          ⚠️
        </div>
        <h2 className="text-base font-bold text-stone-900">{error || "Donor not found"}</h2>
        <button
          onClick={() => router.push("/app/donor-list")}
          className="px-4 py-2 bg-[#8B1E2D] text-white rounded-xl text-xs font-bold"
        >
          Back to Donors List
        </button>
      </div>
    );
  }

  const activeReceipts = receipts.filter((r) => !r.isDeleted && r.paymentStatus !== "cancelled");
  const firstDonation = activeReceipts.length > 0 ? activeReceipts[activeReceipts.length - 1] : null;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/app/donor-list")}
            className="p-2 -ml-2 text-stone-600 hover:text-stone-900 rounded-full hover:bg-stone-100 transition cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-stone-900">
              {t("donor_profile_title")}
            </h1>
            <p className="text-xs text-stone-500 font-medium">
              {activeOrg?.name || "Organization"} · Comprehensive contribution history
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push(`/app/create-receipt?donorName=${encodeURIComponent(donor.name)}&donorMobile=${encodeURIComponent(donor.mobile || "")}`)}
          className="px-4 py-2 bg-[#8B1E2D] hover:bg-[#721824] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t("action_add_receipt")}</span>
        </button>
      </div>

      {/* Donor Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black text-2xl">
              {donor.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-black text-stone-900">{donor.name}</h2>
              <div className="flex items-center gap-3 text-xs text-stone-500 pt-1 flex-wrap">
                {donor.mobile && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    {donor.mobile}
                  </span>
                )}
                {donor.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-stone-400" />
                    {donor.email}
                  </span>
                )}
                {donor.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    {donor.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-stone-400 font-bold uppercase tracking-wide block">
              {t("total_contributions")}
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-[#8B1E2D]">
              ₹ {(donor.totalDonated || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-stone-100">
          <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100">
            <span className="text-[11px] text-stone-400 font-bold uppercase block">
              Total Receipts
            </span>
            <span className="text-lg font-black font-mono text-stone-900">
              {donor.donationCount || activeReceipts.length}
            </span>
          </div>

          <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100">
            <span className="text-[11px] text-stone-400 font-bold uppercase block">
              {t("last_donation_date")}
            </span>
            <span className="text-xs font-bold text-stone-700 block truncate">
              {donor.lastDonationDate ? donor.lastDonationDate.split("T")[0] : "-"}
            </span>
          </div>

          <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-stone-400 font-bold uppercase block">
              {t("first_donation_date")}
            </span>
            <span className="text-xs font-bold text-stone-700 block truncate">
              {firstDonation ? firstDonation.createdAt.split("T")[0] : "-"}
            </span>
          </div>
        </div>
      </div>

      {/* Receipts Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-stone-900">
            {t("donor_receipts_timeline")} ({receipts.length})
          </h3>
        </div>

        {receipts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center space-y-2">
            <Receipt className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs text-stone-500 font-medium">
              {t("no_donor_receipts")}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs divide-y divide-stone-100 overflow-hidden">
            {receipts.map((r) => {
              const isVoid = r.isDeleted || r.paymentStatus === "cancelled";
              const dateStr = r.createdAt ? r.createdAt.split("T")[0] : "";

              return (
                <div
                  key={r.id}
                  onClick={() => router.push(`/app/receipt/${r.id}`)}
                  className={`p-4 hover:bg-stone-50/80 transition flex items-center justify-between gap-3 cursor-pointer ${
                    isVoid ? "opacity-60 bg-stone-50/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-[#8B1E2D]/10 text-[#8B1E2D] flex items-center justify-center shrink-0">
                      <Receipt className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#8B1E2D]">
                          {r.receiptNumber}
                        </span>
                        {isVoid && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-md">
                            VOID
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-stone-900 truncate">
                        {r.purpose || "Contribution"}
                      </p>

                      <div className="flex items-center gap-2 text-[11px] text-stone-400">
                        <span>{dateStr}</span>
                        <span>·</span>
                        <span className="uppercase font-semibold text-stone-600">
                          {r.paymentMode}
                        </span>
                        {r.collectorName && (
                          <>
                            <span>·</span>
                            <span>Collector: {r.collectorName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span
                      className={`text-sm font-black font-mono ${
                        isVoid ? "text-stone-400 line-through" : "text-[#8B1E2D]"
                      }`}
                    >
                      ₹ {r.amount.toLocaleString("en-IN")}
                    </span>
                    <ExternalLink className="w-4 h-4 text-stone-400 hover:text-stone-700" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}