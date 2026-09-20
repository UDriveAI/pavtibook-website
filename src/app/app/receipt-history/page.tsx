"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { useOrg } from "@/context/OrgContext";
import { useLanguage } from "@/lib/i18n";
import { db } from "@/lib/firebase-client";
import { generateReceiptsCsv, downloadCsv } from "@/lib/receiptExport";
import AdSlot from "@/components/ads/AdSlot";
import {
  ArrowLeft,
  Search,
  Eye,
  Plus,
  Calendar,
  FileSpreadsheet,
} from "lucide-react";

interface ReceiptItem {
  id: string;
  receiptNumber: string;
  donorName: string;
  donorMobile: string;
  amount: number;
  purpose: string;
  paymentMode: string;
  paymentStatus: string;
  createdAt: string;
  collectorName?: string;
  isDeleted?: boolean;
}

export default function ReceiptHistoryPage() {
  const router = useRouter();
  const { activeOrg } = useOrg();
  const { t } = useLanguage();

  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMode, setSelectedMode] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [plan, setPlan] = useState<string | null>(null);

  // Load Receipts for Active Organization
  useEffect(() => {
    if (!activeOrg?.id) return;

    const fetchReceipts = async () => {
      setLoading(true);
      try {
        // Fetch subscription plan for entitlement / ad eligibility
        try {
          const subSnap = await getDoc(doc(db, "subscriptions", activeOrg.id));
          if (subSnap.exists()) {
            setPlan(subSnap.data().plan || "free");
          } else {
            setPlan("free");
          }
        } catch {
          setPlan("free");
        }

        const receiptsRef = collection(db, "receipts");
        const q = query(
          receiptsRef,
          where("organizationId", "==", activeOrg.id),
          orderBy("createdAt", "desc"),
          limit(200)
        );
        const snap = await getDocs(q);

        const items: ReceiptItem[] = snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            receiptNumber: d.receiptNumber || d.receipt_number || "PB-UNKNOWN",
            donorName: d.donorName || d.donor_name || "Donor",
            donorMobile: d.donorMobile || d.donor_mobile || "",
            amount: typeof d.amount === "number" ? d.amount : parseFloat(d.amount) || 0,
            purpose: d.purpose || "General Donation",
            paymentMode: (d.paymentMode || d.payment_mode || "cash").toLowerCase(),
            paymentStatus: (d.paymentStatus || d.payment_status || "paid").toLowerCase(),
            createdAt: d.createdAt || d.created_at || new Date().toISOString(),
            collectorName: d.collectorName || d.createdByName || "",
            isDeleted: d.isDeleted === true,
          };
        });

        setReceipts(items);
      } catch (err) {
        console.error("Error fetching receipts history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReceipts();
  }, [activeOrg?.id]);

  // Client-Side Filtered Receipts (F24)
  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      // 1. Search filter: donorName, donorMobile, receiptNumber
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = r.donorName.toLowerCase().includes(q);
        const matchMobile = r.donorMobile.includes(q);
        const matchNum = r.receiptNumber.toLowerCase().includes(q);
        if (!matchName && !matchMobile && !matchNum) return false;
      }

      // 2. Mode filter
      if (selectedMode !== "all" && r.paymentMode !== selectedMode) {
        return false;
      }

      // 3. Status filter
      if (selectedStatus !== "all") {
        if (selectedStatus === "deleted") {
          if (!r.isDeleted) return false;
        } else if (selectedStatus === "paid") {
          if (r.isDeleted || r.paymentStatus !== "paid") return false;
        } else if (selectedStatus === "pending") {
          if (r.isDeleted || r.paymentStatus !== "pending") return false;
        }
      }

      // 4. Date Range
      if (startDate) {
        const itemDate = new Date(r.createdAt).setHours(0, 0, 0, 0);
        const start = new Date(startDate).setHours(0, 0, 0, 0);
        if (itemDate < start) return false;
      }
      if (endDate) {
        const itemDate = new Date(r.createdAt).setHours(23, 59, 59, 999);
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        if (itemDate > end) return false;
      }

      return true;
    });
  }, [receipts, searchQuery, selectedMode, selectedStatus, startDate, endDate]);

  // F25: CSV Export with UTF-8 BOM
  const handleExportCsv = () => {
    if (filteredReceipts.length === 0) return;

    const exportRows = filteredReceipts.map((r) => ({
      receiptNumber: r.receiptNumber,
      date: new Date(r.createdAt).toLocaleDateString("en-IN"),
      donorName: r.donorName,
      donorMobile: r.donorMobile,
      amount: r.amount,
      purpose: r.purpose,
      paymentMode: r.paymentMode.toUpperCase(),
      paymentStatus: r.paymentStatus.toUpperCase(),
      collectedBy: r.collectorName,
      isDeleted: r.isDeleted,
    }));

    const csvData = generateReceiptsCsv(exportRows);
    const orgSlug = (activeOrg?.name || "PavtiBook").replace(/\s+/g, "_");
    downloadCsv(csvData, `${orgSlug}_receipts_${Date.now()}.csv`);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/app")}
            className="p-2 -ml-2 text-stone-600 hover:text-stone-900 rounded-full hover:bg-stone-100 transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-stone-900">
              {t("action_history")}
            </h1>
            <p className="text-xs text-stone-500 font-medium">
              {activeOrg?.name || "Organization"} · {filteredReceipts.length}{" "}
              {t("total_receipts_count")}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* F25: CSV Export Button */}
          <button
            onClick={handleExportCsv}
            disabled={filteredReceipts.length === 0}
            className="px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-2 transition disabled:opacity-50 shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{t("download_csv")}</span>
          </button>

          {/* Add Receipt Button */}
          <button
            onClick={() => router.push("/app/create-receipt")}
            className="px-4 py-2 bg-[#8B1E2D] hover:bg-[#721824] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t("action_add_receipt")}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar (F24) */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("receipt_search_hint")}
              className="w-full pl-9 pr-4 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none"
            />
          </div>

          {/* Payment Mode Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none bg-white font-medium text-stone-700"
            >
              <option value="all">{t("filter_all_modes")}</option>
              <option value="cash">Cash (रोख)</option>
              <option value="upi">UPI (फोनपे/GPay)</option>
              <option value="bank">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-4">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none bg-white font-medium text-stone-700"
            >
              <option value="all">{t("filter_all_statuses")}</option>
              <option value="paid">{t("status_paid")}</option>
              <option value="pending">{t("status_pending")}</option>
              <option value="deleted">{t("status_deleted")}</option>
            </select>
          </div>
        </div>

        {/* Date Filter Range */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-stone-100 text-xs text-stone-600">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <span className="font-semibold text-stone-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 border border-stone-200 rounded-lg text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-stone-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 border border-stone-200 rounded-lg text-xs"
            />
          </div>
          {(startDate || endDate || searchQuery || selectedMode !== "all" || selectedStatus !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedMode("all");
                setSelectedStatus("all");
                setStartDate("");
                setEndDate("");
              }}
              className="text-[11px] font-bold text-[#8B1E2D] hover:underline ml-auto"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Receipts Table / List */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#8B1E2D] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-stone-500 font-medium">Loading receipts...</p>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mx-auto text-xl">
              🧾
            </div>
            <p className="text-sm font-bold text-stone-800">
              {t("no_receipts_found")}
            </p>
            <button
              onClick={() => router.push("/app/create-receipt")}
              className="px-4 py-2 bg-[#8B1E2D] text-white text-xs font-bold rounded-xl hover:bg-[#721824] transition"
            >
              {t("action_add_receipt")}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Receipt #</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Donor</th>
                  <th className="py-3.5 px-4">Purpose</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Mode</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredReceipts.map((r) => {
                  const isPaid = r.paymentStatus === "paid" || r.paymentMode === "cash";
                  return (
                    <tr
                      key={r.id}
                      onClick={() => router.push(`/app/receipt/${r.id}`)}
                      className="hover:bg-amber-50/40 cursor-pointer transition"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                        {r.receiptNumber}
                      </td>
                      <td className="py-3.5 px-4 text-stone-600">
                        {new Date(r.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-stone-900">{r.donorName}</p>
                        {r.donorMobile && (
                          <p className="text-[11px] text-stone-400 font-mono">
                            {r.donorMobile}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-stone-700 truncate max-w-[150px]">
                        {r.purpose}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-stone-900">
                        ₹{r.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 uppercase font-bold text-stone-600 text-[10px]">
                        {r.paymentMode}
                      </td>
                      <td className="py-3.5 px-4">
                        {r.isDeleted ? (
                          <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 font-black text-[10px] uppercase tracking-wider">
                            VOID
                          </span>
                        ) : isPaid ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[10px] uppercase tracking-wider">
                            PAID
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-black text-[10px] uppercase tracking-wider">
                            PENDING
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8B1E2D] hover:underline">
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Non-intrusive ad slot for free tier */}
      <AdSlot plan={plan} className="mt-6" />
    </div>
  );
}