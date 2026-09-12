"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import {
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  X,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { db } from "@/lib/firebase-client";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { useLanguage } from "@/lib/i18n";
import {
  ExpenseRecord,
  EXPENSE_CATEGORIES,
  voidExpense,
  parseExpenseDate,
} from "@/lib/expenseService";

export default function ExpenseHistoryPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { activeOrg, activeRole, isOwner, isPresident, isTreasurer } = useOrg();
  const { t, language } = useLanguage();

  const canVoid = isOwner || isPresident || isTreasurer;

  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "month" | "year">("all");

  // Expense details modal
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRecord | null>(null);
  const [activeImageZoom, setActiveImageZoom] = useState<string | null>(null);

  // Void modal
  const [voidModalExpense, setVoidModalExpense] = useState<ExpenseRecord | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeOrg?.id) return;

    setLoading(true);
    const q = query(
      collection(db, "expenses"),
      where("organizationId", "==", activeOrg.id)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
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

        // Sort newest expenseDate first
        list.sort((a, b) => {
          const da = parseExpenseDate(a.expenseDate)?.getTime() || 0;
          const db = parseExpenseDate(b.expenseDate)?.getTime() || 0;
          return db - da;
        });

        setExpenses(list);
        setLoading(false);
      },
      (err) => {
        console.error("Expenses snapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeOrg?.id]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return expenses.filter((e) => {
      // Category
      if (categoryFilter !== "all" && e.category !== categoryFilter) {
        return false;
      }

      // Mode
      if (
        paymentModeFilter !== "all" &&
        e.paymentMode.toLowerCase() !== paymentModeFilter.toLowerCase()
      ) {
        return false;
      }

      // Date Preset
      const d = parseExpenseDate(e.expenseDate);
      if (datePreset === "today" && (!d || d < startOfToday)) return false;
      if (datePreset === "month" && (!d || d < startOfMonth)) return false;
      if (datePreset === "year" && (!d || d < startOfYear)) return false;

      // Search query
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const mNum = e.expenseNumber.toLowerCase().includes(q);
        const mTitle = e.title.toLowerCase().includes(q);
        const mPaidTo = e.paidTo.toLowerCase().includes(q);
        const mMobile = (e.paidToMobile || "").includes(q);
        if (!mNum && !mTitle && !mPaidTo && !mMobile) return false;
      }

      return true;
    });
  }, [expenses, categoryFilter, paymentModeFilter, datePreset, search]);

  // Financial totals across active non-voided filtered expenses
  const activeExpenses = useMemo(
    () => filteredExpenses.filter((e) => !e.isDeleted),
    [filteredExpenses]
  );

  const totalAmount = useMemo(
    () => activeExpenses.reduce((sum, e) => sum + e.amount, 0),
    [activeExpenses]
  );

  const handleConfirmVoid = async () => {
    if (!voidModalExpense) return;
    if (!voidReason.trim()) {
      setVoidError(t("void_expense_reason_label"));
      return;
    }

    setVoiding(true);
    setVoidError(null);

    try {
      await voidExpense(
        voidModalExpense.id,
        voidModalExpense.organizationId,
        voidReason.trim(),
        {
          uid: user?.uid || "",
          name: userData?.name || user?.displayName || "Admin",
          role: activeRole || "owner",
        }
      );

      setVoidModalExpense(null);
      setVoidReason("");
      if (selectedExpense?.id === voidModalExpense.id) {
        setSelectedExpense(null);
      }
    } catch (err) {
      console.error("Failed to void expense:", err);
      setVoidError("Failed to void expense record.");
    } finally {
      setVoiding(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
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
              {t("expense_history_title")}
            </h1>
            <p className="text-xs text-stone-500 font-medium">
              {activeOrg?.name || "Organization"} · {activeExpenses.length} Active Records
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push("/app/expenses/new")}
          className="px-4 py-2.5 bg-[#8B1E2D] hover:bg-[#721824] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t("add_new_expense")}</span>
        </button>
      </div>

      {/* Summary Total Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-500 font-bold block">
              {t("total_expenses_label")}
            </span>
            <span className="text-2xl font-black font-mono text-[#8B1E2D]">
              ₹ {totalAmount.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#8B1E2D]/10 text-[#8B1E2D] flex items-center justify-center text-xl font-bold">
            💰
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-500 font-bold block">
              Active Records
            </span>
            <span className="text-2xl font-black font-mono text-stone-900">
              {activeExpenses.length}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center text-xl font-bold">
            📊
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-500 font-bold block">
              Voided Records
            </span>
            <span className="text-2xl font-black font-mono text-stone-400">
              {filteredExpenses.filter((e) => e.isDeleted).length}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center text-xl font-bold">
            🚫
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, payee, #..."
              className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none"
            />
          </div>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none text-stone-700 font-medium"
          >
            <option value="all">All Categories</option>
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

          {/* Mode */}
          <select
            value={paymentModeFilter}
            onChange={(e) => setPaymentModeFilter(e.target.value)}
            className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none text-stone-700 font-medium"
          >
            <option value="all">{t("filter_all_modes")}</option>
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

      {/* Expense List */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#8B1E2D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-stone-500 font-medium">Loading expenses...</p>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center space-y-3">
          <div className="w-12 h-12 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mx-auto text-xl">
            💰
          </div>
          <p className="text-sm font-bold text-stone-800">{t("no_expenses_found")}</p>
          <button
            onClick={() => router.push("/app/expenses/new")}
            className="px-4 py-2 bg-[#8B1E2D] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#721824] transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t("add_new_expense")}</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs divide-y divide-stone-100 overflow-hidden">
          {filteredExpenses.map((exp) => {
            const catObj = EXPENSE_CATEGORIES.find((c) => c.id === exp.category);
            let catName = catObj?.nameEn || exp.category;
            if (language === "mr" && catObj?.nameMr) catName = catObj.nameMr;
            if (language === "hi" && catObj?.nameHi) catName = catObj.nameHi;

            const dateParsed = parseExpenseDate(exp.expenseDate);
            const dateDisplay = dateParsed
              ? `${dateParsed.getDate()}/${dateParsed.getMonth() + 1}/${dateParsed.getFullYear()}`
              : exp.expenseDate;

            const attachments = exp.billImageUrls || (exp.billImageUrl ? [exp.billImageUrl] : []);

            return (
              <div
                key={exp.id}
                onClick={() => setSelectedExpense(exp)}
                className={`p-4 hover:bg-stone-50/80 transition flex items-center justify-between gap-3 cursor-pointer ${
                  exp.isDeleted ? "opacity-60 bg-stone-50/50" : ""
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 flex items-center justify-center text-lg shrink-0">
                    {catObj?.iconName || "📝"}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`text-sm font-bold text-stone-900 truncate ${
                          exp.isDeleted ? "line-through text-stone-500" : ""
                        }`}
                      >
                        {exp.title}
                      </h4>
                      {exp.isDeleted && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-md">
                          VOID
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-stone-500 flex-wrap">
                      <span className="font-mono text-[11px] text-stone-400 font-semibold">
                        {exp.expenseNumber}
                      </span>
                      <span>·</span>
                      <span>{catName}</span>
                      <span>·</span>
                      <span>Paid to: {exp.paidTo}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        {dateDisplay}
                      </span>
                      {attachments.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-[#8B1E2D] font-bold flex items-center gap-1">
                            📎 {attachments.length}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <span
                    className={`text-sm font-black font-mono block ${
                      exp.isDeleted ? "text-stone-400 line-through" : "text-[#8B1E2D]"
                    }`}
                  >
                    ₹ {exp.amount.toLocaleString("en-IN")}
                  </span>
                  <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-[10px] uppercase font-bold tracking-wide">
                    {exp.paymentMode}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EXPENSE DETAILS MODAL */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-[#8B1E2D]">
                  {selectedExpense.expenseNumber}
                </span>
                <h3 className="text-lg font-black text-stone-900 leading-snug">
                  {selectedExpense.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedExpense(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedExpense.isDeleted && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1 text-xs text-red-800">
                <span className="font-bold flex items-center gap-1 text-red-700">
                  <AlertTriangle className="w-4 h-4" /> This expense record is VOID
                </span>
                <p>Reason: {selectedExpense.deleteReason || "Not specified"}</p>
                {selectedExpense.deletedBy && (
                  <p className="text-[11px] text-red-600">
                    Voided by: {selectedExpense.deletedBy}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <div>
                <span className="text-stone-400 block font-semibold">Amount</span>
                <span className="text-base font-mono font-black text-[#8B1E2D]">
                  ₹ {selectedExpense.amount.toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block font-semibold">Payment Mode</span>
                <span className="font-bold uppercase text-stone-800">
                  {selectedExpense.paymentMode}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block font-semibold">Paid To</span>
                <span className="font-bold text-stone-800">{selectedExpense.paidTo}</span>
                {selectedExpense.paidToMobile && (
                  <span className="text-stone-500 font-mono block">
                    {selectedExpense.paidToMobile}
                  </span>
                )}
              </div>
              <div>
                <span className="text-stone-400 block font-semibold">Expense Date</span>
                <span className="font-medium text-stone-800">
                  {selectedExpense.expenseDate.split("T")[0]}
                </span>
              </div>
              <div className="col-span-2 pt-2 border-t border-stone-200">
                <span className="text-stone-400 block font-semibold">Created By</span>
                <span className="text-stone-700">
                  {selectedExpense.createdByName} ({selectedExpense.createdByRole})
                </span>
              </div>
              {selectedExpense.notes && (
                <div className="col-span-2 pt-2 border-t border-stone-200">
                  <span className="text-stone-400 block font-semibold">Notes</span>
                  <p className="text-stone-700 italic">{selectedExpense.notes}</p>
                </div>
              )}
            </div>

            {/* Attachments view */}
            {selectedExpense.billImageUrls && selectedExpense.billImageUrls.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-700 block">
                  Bill Attachments ({selectedExpense.billImageUrls.length})
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {selectedExpense.billImageUrls.map((url, i) => (
                    <div
                      key={i}
                      onClick={() => setActiveImageZoom(url)}
                      className="aspect-square rounded-xl overflow-hidden border border-stone-200 cursor-pointer hover:opacity-90 transition bg-stone-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt="Attachment"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100">
              {canVoid && !selectedExpense.isDeleted ? (
                <button
                  type="button"
                  onClick={() => setVoidModalExpense(selectedExpense)}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t("void_expense_title")}</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setSelectedExpense(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE ZOOM MODAL */}
      {activeImageZoom && (
        <div
          onClick={() => setActiveImageZoom(null)}
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[85vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImageZoom}
              alt="Zoomed bill"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setActiveImageZoom(null)}
              className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* VOID EXPENSE MODAL */}
      {voidModalExpense && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">
                  {t("void_expense_title")}
                </h3>
                <span className="font-mono text-xs text-stone-400">
                  {voidModalExpense.expenseNumber}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              {t("void_expense_desc")}
            </p>

            {voidError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {voidError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">
                {t("void_expense_reason_label")}
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder={t("void_expense_reason_hint")}
                rows={3}
                required
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setVoidModalExpense(null);
                  setVoidReason("");
                  setVoidError(null);
                }}
                className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={voiding || !voidReason.trim()}
                onClick={handleConfirmVoid}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {voiding ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t("voiding_expense")}</span>
                  </>
                ) : (
                  <span>{t("confirm_void_expense_btn")}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}