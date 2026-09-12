"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
  ArrowLeft,
  Search,
  Download,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Scale,
} from "lucide-react";
import { db } from "@/lib/firebase-client";
import { useOrg } from "@/context/OrgContext";
import { useLanguage } from "@/lib/i18n";
import { ExpenseRecord, EXPENSE_CATEGORIES } from "@/lib/expenseService";
import {
  ReceiptRecordForLedger,
  buildLedger,
  calculateLedgerTotals,
  exportLedgerCsv,
  exportLedgerPdf,
} from "@/lib/ledgerService";

export default function LedgerPage() {
  const router = useRouter();
  const { activeOrg } = useOrg();
  const { t, language } = useLanguage();

  const [receipts, setReceipts] = useState<ReceiptRecordForLedger[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<"all" | "credit" | "debit">("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "month" | "year">("all");

  useEffect(() => {
    if (!activeOrg?.id) return;
    setLoading(true);

    // 1. Stream receipts
    const receiptsQ = query(
      collection(db, "receipts"),
      where("organizationId", "==", activeOrg.id)
    );
    const unsubReceipts = onSnapshot(receiptsQ, (snapshot) => {
      const list: ReceiptRecordForLedger[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          receiptNumber: data.receiptNumber || "",
          donorName: data.donorName || "",
          amount: typeof data.amount === "number" ? data.amount : 0,
          purpose: data.purpose || "",
          paymentMode: data.paymentMode || "cash",
          paymentStatus: data.paymentStatus || "paid",
          createdAt: data.createdAt || "",
          isDeleted: data.isDeleted === true,
        };
      });
      setReceipts(list);
    });

    // 2. Stream expenses
    const expensesQ = query(
      collection(db, "expenses"),
      where("organizationId", "==", activeOrg.id)
    );
    const unsubExpenses = onSnapshot(expensesQ, (snapshot) => {
      const list: ExpenseRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          organizationId: data.organizationId || "",
          expenseNumber: data.expenseNumber || "",
          title: data.title || "",
          category: data.category || "other",
          amount: typeof data.amount === "number" ? data.amount : 0,
          expenseDate: data.expenseDate || data.createdAt || "",
          paymentMode: data.paymentMode || "cash",
          paidTo: data.paidTo || "",
          paidToMobile: data.paidToMobile || null,
          billImageUrl: data.billImageUrl || null,
          billImageUrls: Array.isArray(data.billImageUrls)
            ? data.billImageUrls
            : data.billImageUrl
            ? [data.billImageUrl]
            : [],
          notes: data.notes || null,
          status: data.status || "paid",
          createdAt: data.createdAt || "",
          createdBy: data.createdBy || "",
          createdByName: data.createdByName || "",
          createdByRole: data.createdByRole || "",
          isDeleted: data.isDeleted === true,
          deletedAt: data.deletedAt || null,
          deletedBy: data.deletedBy || null,
          deleteReason: data.deleteReason || null,
        };
      });
      setExpenses(list);
      setLoading(false);
    });

    return () => {
      unsubReceipts();
      unsubExpenses();
    };
  }, [activeOrg?.id]);

  // Compute start/end dates from preset
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const now = new Date();
    if (datePreset === "today") {
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        endDate: null,
        periodLabel: "Today",
      };
    }
    if (datePreset === "month") {
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: null,
        periodLabel: "This Month",
      };
    }
    if (datePreset === "year") {
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: null,
        periodLabel: "This Year",
      };
    }
    return { startDate: null, endDate: null, periodLabel: "All Time" };
  }, [datePreset]);

  // Build unified chronological ledger entries
  const ledgerEntries = useMemo(() => {
    return buildLedger({
      receipts,
      expenses,
      typeFilter,
      categoryFilter: categoryFilter || undefined,
      paymentModeFilter: paymentModeFilter || undefined,
      startDate,
      endDate,
      search,
      lang: language,
    });
  }, [
    receipts,
    expenses,
    typeFilter,
    categoryFilter,
    paymentModeFilter,
    startDate,
    endDate,
    search,
    language,
  ]);

  // Financial summary
  const totals = useMemo(() => {
    return calculateLedgerTotals(ledgerEntries);
  }, [ledgerEntries]);

  // Running balance calculation: compute running balance from earliest to latest, then attach to entries
  const entriesWithBalance = useMemo(() => {
    // Reverse to chronological order (oldest to newest) to accumulate balance
    const reversed = [...ledgerEntries].reverse();
    let accBalance = 0;
    const mapped = reversed.map((e) => {
      accBalance += e.creditAmount - e.debitAmount;
      return { ...e, runningBalance: accBalance };
    });
    // Return back to newest-first order
    return mapped.reverse();
  }, [ledgerEntries]);

  const handleExportCsv = () => {
    exportLedgerCsv(ledgerEntries, activeOrg?.name || "PavtiBook", periodLabel);
  };

  const handleExportPdf = () => {
    exportLedgerPdf(ledgerEntries, activeOrg?.name || "PavtiBook", periodLabel);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/app")}
            className="p-2 -ml-2 text-stone-600 hover:text-stone-900 rounded-full hover:bg-stone-100 transition cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-stone-900">
              {t("ledger_title")}
            </h1>
            <p className="text-xs text-stone-500 font-medium">
              {activeOrg?.name || "Organization"} · {t("ledger_subtitle")}
            </p>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t("export_ledger_csv")}</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="px-3.5 py-2 bg-[#8B1E2D] hover:bg-[#721824] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t("export_ledger_pdf")}</span>
          </button>
        </div>
      </div>

      {/* Summary Cards (Credit, Debit, Net Balance) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Credit */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
              {t("total_credit_label")}
            </span>
            <span className="text-2xl font-black font-mono text-emerald-700 block">
              ₹ {totals.totalCredit.toLocaleString("en-IN")}
            </span>
            <span className="text-[11px] text-stone-400 font-medium">
              Collections & Receipts
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Total Debit */}
        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-red-800 uppercase tracking-wide">
              {t("total_debit_label")}
            </span>
            <span className="text-2xl font-black font-mono text-red-700 block">
              ₹ {totals.totalDebit.toLocaleString("en-IN")}
            </span>
            <span className="text-[11px] text-stone-400 font-medium">
              Paid Expenditures
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Net Balance */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">
              {t("net_balance_label")}
            </span>
            <span
              className={`text-2xl font-black font-mono block ${
                totals.netBalance >= 0 ? "text-emerald-700" : "text-red-700"
              }`}
            >
              ₹ {totals.netBalance.toLocaleString("en-IN")}
            </span>
            <span className="text-[11px] text-stone-400 font-medium">
              Available Net Surplus
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-700 flex items-center justify-center">
            <Scale className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ref, party, particulars..."
              className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as "all" | "credit" | "debit")
            }
            className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none"
          >
            <option value="all">{t("filter_type_all")}</option>
            <option value="credit">{t("filter_type_credit")}</option>
            <option value="debit">{t("filter_type_debit")}</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none"
          >
            <option value="">All Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => {
              let name = cat.nameEn;
              if (language === "mr") name = cat.nameMr;
              if (language === "hi") name = cat.nameHi;
              return (
                <option key={cat.id} value={cat.id}>
                  {name}
                </option>
              );
            })}
          </select>

          {/* Payment Mode Filter */}
          <select
            value={paymentModeFilter}
            onChange={(e) => setPaymentModeFilter(e.target.value)}
            className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none"
          >
            <option value="">{t("filter_all_modes")}</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank">Bank Transfer</option>
            <option value="cheque">Cheque</option>
            <option value="other">Other</option>
          </select>

          {/* Date Presets */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-stone-100 rounded-xl">
            {(["all", "today", "month", "year"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDatePreset(p)}
                className={`py-1.5 text-[11px] font-bold rounded-lg capitalize transition cursor-pointer ${
                  datePreset === p
                    ? "bg-white text-[#8B1E2D] shadow-xs"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#8B1E2D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-stone-500 font-medium">
            Building unified ledger...
          </p>
        </div>
      ) : entriesWithBalance.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center space-y-3">
          <div className="w-12 h-12 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mx-auto text-xl">
            📜
          </div>
          <p className="text-sm font-bold text-stone-800">
            {t("no_ledger_entries")}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">{t("particulars_label")}</th>
                <th className="py-3 px-4">{t("party_label")}</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4 text-right">{t("credit_amount_col")}</th>
                <th className="py-3 px-4 text-right">{t("debit_amount_col")}</th>
                <th className="py-3 px-4 text-right">{t("balance_col")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {entriesWithBalance.map((e, idx) => {
                const isCredit = e.type === "credit";
                return (
                  <tr
                    key={`${e.reference}_${idx}`}
                    className="hover:bg-stone-50/70 transition"
                  >
                    <td className="py-3 px-4 font-mono text-stone-600">
                      {e.dateStr}
                    </td>

                    <td className="py-3 px-4">
                      {isCredit ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md uppercase">
                          Credit
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded-md uppercase">
                          Debit
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 max-w-[200px] truncate">
                      <span className="font-semibold text-stone-900 block truncate">
                        {e.particulars}
                      </span>
                      {e.category && (
                        <span className="text-[10px] text-stone-400">
                          {e.category}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-stone-700 font-medium max-w-[150px] truncate">
                      {e.partyName}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-stone-500">
                      <span className="px-1.5 py-0.5 bg-stone-100 rounded">
                        {e.reference}
                      </span>
                      <span className="ml-1 text-[10px] uppercase text-stone-400">
                        {e.paymentMode}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      {e.creditAmount > 0
                        ? `₹ ${e.creditAmount.toLocaleString("en-IN")}`
                        : "-"}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-red-700">
                      {e.debitAmount > 0
                        ? `₹ ${e.debitAmount.toLocaleString("en-IN")}`
                        : "-"}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-black text-stone-900">
                      ₹ {e.runningBalance.toLocaleString("en-IN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}