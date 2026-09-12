"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, X, Camera, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { useLanguage } from "@/lib/i18n";
import {
  EXPENSE_CATEGORIES,
  createExpense,
} from "@/lib/expenseService";

export default function NewExpensePage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { activeOrg, activeRole } = useOrg();
  const { t, language } = useLanguage();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].id);
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paidTo, setPaidTo] = useState("");
  const [paidToMobile, setPaidToMobile] = useState("");
  const [notes, setNotes] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    if (files.length + selected.length > 5) {
      setError(t("max_attachments_warning"));
      return;
    }
    setError(null);

    const newFiles = [...files, ...selected];
    setFiles(newFiles);

    // Create object URLs for previews
    const newPreviews = [...previews];
    selected.forEach((f) => {
      newPreviews.push(URL.createObjectURL(f));
    });
    setPreviews(newPreviews);
  };

  const removeFile = (idx: number) => {
    const updatedFiles = files.filter((_, i) => i !== idx);
    const updatedPreviews = previews.filter((_, i) => i !== idx);
    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg?.id) {
      setError("Please select an active organization first.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid expense amount.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter an expense title / purpose.");
      return;
    }

    if (!paidTo.trim()) {
      setError("Please enter payee / vendor name.");
      return;
    }

    if (paidToMobile.trim() && !/^\d{10}$/.test(paidToMobile.trim())) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const parsedDate = new Date(expenseDate);

      const created = await createExpense({
        organizationId: activeOrg.id,
        title: title.trim(),
        category,
        amount: numAmount,
        expenseDate: parsedDate,
        paymentMode,
        paidTo: paidTo.trim(),
        paidToMobile: paidToMobile.trim() || undefined,
        notes: notes.trim() || undefined,
        files,
        createdBy: user?.uid || "",
        createdByName: userData?.name || user?.displayName || "Member",
        createdByRole: activeRole || "member",
      });

      setSuccessMsg(
        `${t("expense_recorded_success")} #${created.expenseNumber}`
      );

      setTimeout(() => {
        router.push("/app/expense-history");
      }, 1200);
    } catch (err: unknown) {
      console.error("Failed to create expense:", err);
      setError(
        err instanceof Error ? err.message : "Failed to record expense."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 text-stone-600 hover:text-stone-900 rounded-full hover:bg-stone-100 transition"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-stone-900">
            {t("add_new_expense")}
          </h1>
          <p className="text-xs text-stone-500 font-medium">
            {activeOrg?.name || "Organization"} · Strict financial ledger entry
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs text-red-800 font-medium">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-800 font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6"
      >
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-stone-700">
            {t("expense_title_label")}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("expense_title_hint")}
            required
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none"
          />
        </div>

        {/* Category & Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700">
              {t("expense_category_label")}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none"
            >
              {EXPENSE_CATEGORIES.map((cat) => {
                let name = cat.nameEn;
                if (language === "mr") name = cat.nameMr;
                if (language === "hi") name = cat.nameHi;
                return (
                  <option key={cat.id} value={cat.id}>
                    {cat.iconName} {name}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700">
              {t("expense_amount_label")}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-stone-400 font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t("expense_amount_hint")}
                required
                className="w-full pl-8 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono font-bold text-stone-900 focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Date & Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700">
              {t("expense_date_label")}
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              required
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700">
              {t("payment_mode_label")}
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none"
            >
              <option value="cash">Cash (रोख)</option>
              <option value="upi">UPI (GPay / PhonePe / QR)</option>
              <option value="bank">Bank Transfer (NEFT / RTGS)</option>
              <option value="cheque">Cheque (धनादेश)</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Paid To & Mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700">
              {t("expense_paid_to_label")}
            </label>
            <input
              type="text"
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              placeholder={t("expense_paid_to_hint")}
              required
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700">
              {t("expense_paid_to_mobile_label")}
            </label>
            <input
              type="tel"
              value={paidToMobile}
              onChange={(e) => setPaidToMobile(e.target.value)}
              placeholder={t("expense_paid_to_mobile_hint")}
              maxLength={10}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-stone-700">
            {t("expense_notes_label")}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("expense_notes_hint")}
            rows={2}
            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none"
          />
        </div>

        {/* Attachments Section (F27: Max 5 files) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-stone-700">
              {t("bill_attachments_label")}
            </label>
            <span className="text-[11px] text-stone-400 font-medium">
              {files.length} / 5
            </span>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            multiple
            className="hidden"
          />

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {previews.map((src, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-2xl overflow-hidden border border-stone-200 group bg-stone-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Attachment ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition shadow-sm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {files.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-2xl border-2 border-dashed border-stone-300 hover:border-[#8B1E2D] flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-[#8B1E2D] transition bg-stone-50 hover:bg-[#8B1E2D]/5"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-bold">
                  {t("add_attachment_btn")}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Submit button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#8B1E2D] hover:bg-[#721824] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t("recording_expense")}</span>
              </>
            ) : (
              <span>{t("record_expense_btn")}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}