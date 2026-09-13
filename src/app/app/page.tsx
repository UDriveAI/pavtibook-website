"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { useAuth } from "../../context/AuthContext";
import { useOrg } from "../../context/OrgContext";
import { useCollector } from "../../context/CollectorContext";
import { useLanguage } from "../../lib/i18n";
import {
  useDashboardData,
  parseReceiptDateTime,
} from "../../lib/useDashboardData";

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, userData } = useAuth();
  const {
    activeOrg,
    isOwner,
    isPresident,
    isTreasurer,
  } = useOrg();

  const { isCollectorMode, toggleCollectorMode } = useCollector();
  const {
    stats,
    recentReceipts,
    teamMembers,
    myPerformance,
    allReceipts,
  } = useDashboardData();

  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportPeriod, setExportPeriod] = useState<string>("today");
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  // Android Parity: Listen for pending change requests if user is Owner
  useEffect(() => {
    if (!activeOrg?.id || !isOwner) {
      setPendingApprovalsCount(0);
      return;
    }

    const q = query(
      collection(db, "change_requests"),
      where("organizationId", "==", activeOrg.id),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingApprovalsCount(snapshot.size);
    }, (err) => {
      console.warn("[DASHBOARD] Change requests listener error:", err);
    });

    return () => unsubscribe();
  }, [activeOrg?.id, isOwner]);

  const userName = userData?.name || user?.displayName || "";
  const greetingText = userName.trim().length > 0 ? `Namaste, ${userName}` : "Namaste";

  const handleExport = (format: "csv" | "excel") => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const validReceipts = allReceipts.filter(
      (r) => r.paymentStatus !== "cancelled" && !r.isDeleted
    );

    let filtered = validReceipts;
    if (exportPeriod === "today") {
      filtered = validReceipts.filter((r) => {
        const d = parseReceiptDateTime(r.createdAt);
        return d !== null && d >= startOfToday;
      });
    } else if (exportPeriod === "month") {
      filtered = validReceipts.filter((r) => {
        const d = parseReceiptDateTime(r.createdAt);
        return d !== null && d >= startOfMonth;
      });
    } else if (exportPeriod === "year") {
      filtered = validReceipts.filter((r) => {
        const d = parseReceiptDateTime(r.createdAt);
        return d !== null && d >= startOfYear;
      });
    }

    const rows: string[] = [];
    rows.push("Receipt No,Date,Donor,Amount,Mode,Status");

    filtered.forEach((r) => {
      const d = parseReceiptDateTime(r.createdAt);
      const dateStr = d
        ? `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
        : r.createdAt || "";
      const cleanDonor = (r.donorName || "").replace(/"/g, '""');
      rows.push(
        `"${r.receiptNumber}","${dateStr}","${cleanDonor}",${r.amount},"${r.paymentMode.toUpperCase()}","${r.paymentStatus.toUpperCase()}"`
      );
    });

    const csvContent = rows.join("\r\n");
    const blobParts = format === "excel" ? ["\uFEFF" + csvContent] : [csvContent];
    const blob = new Blob(blobParts, { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${exportPeriod}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const formatDate = (dateStr: string) => {
    const d = parseReceiptDateTime(dateStr);
    if (!d) return "";
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) return "Today";

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return "Yesterday";

    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  return (
    <div className="space-y-5 pb-16 max-w-4xl mx-auto">
      {/* ── COLLECTOR MODE BANNER ── */}
      {isCollectorMode && (
        <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚡</span>
            <div>
              <p className="font-bold text-sm leading-tight">{t("collector_mode_active")}</p>
              <p className="text-[11px] text-white/90 leading-tight">
                {t("collector_mode_active_desc")}
              </p>
            </div>
          </div>
          <button
            onClick={toggleCollectorMode}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg transition"
          >
            {t("disable")}
          </button>
        </div>
      )}

      {/* ── GREETING & ORG HEADER ── */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div>
          <h1 className="text-2xl font-bold text-[#2E1C0C]">{greetingText}</h1>
          <p className="text-xs text-gray-500 font-medium">
            {activeOrg?.name || t("no_org_selected")}
          </p>
        </div>
        <button
          onClick={toggleCollectorMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition border cursor-pointer ${
            isCollectorMode
              ? "bg-[#8B1E2D] text-white border-[#8B1E2D]"
              : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
          }`}
          title={t("collector_mode")}
        >
          <span>⚡</span>
          <span>{t("collector_mode")}</span>
        </button>
      </div>

      {/* ── ARCHIVED BANNER (Parity with Android read-only notice) ── */}
      {Boolean(activeOrg?.isArchived) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-900 shadow-2xs">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-700 font-bold">
            ⚠️
          </div>
          <div>
            <h4 className="font-bold text-sm text-red-900">Organization Archived (Read-Only Mode)</h4>
            <p className="text-xs text-red-700 mt-0.5">
              This organization has been archived by the owner. New receipts cannot be created. All previous receipts, donors, and records remain fully searchable and preserved.
            </p>
          </div>
        </div>
      )}

      {/* ── PENDING CHANGE REQUESTS BANNER (for Owner - Parity with Android lines 1368-1466) ── */}
      {isOwner && pendingApprovalsCount > 0 && (
        <div
          onClick={() => router.push("/app/approvals")}
          className="p-3.5 bg-[#FFF3E0] hover:bg-[#FFE8CC] rounded-2xl border-1.5 border-[#F47C20] shadow-2xs flex items-center justify-between cursor-pointer transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F47C20]/20 flex items-center justify-center text-[#F47C20]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#2E1C0C]">बदल मंजुरी विनंत्या</h4>
              <p className="text-xs text-gray-700">
                {pendingApprovalsCount} विनंत्या तुमच्या मंजुरीच्या प्रतीक्षेत आहेत
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-xl bg-[#F47C20] text-white text-xs font-bold shadow-2xs">
              {pendingApprovalsCount}
            </span>
            <svg className="w-5 h-5 text-[#F47C20] group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      )}

      {/* ── HERO ACTION CARD (Parity with large red Android card) ── */}
      <div
        onClick={() => router.push("/app/create-receipt")}
        className="relative overflow-hidden cursor-pointer bg-[#8B1E2D] text-white rounded-2xl p-5 sm:p-6 shadow-md hover:shadow-lg transition group border border-maroon/20"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center border border-[#F2C94C]/60 text-white shrink-0 group-hover:scale-105 transition transform">
            <svg
              className="w-9 h-9"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold leading-tight tracking-tight text-white">
              {t("add_new_collection")}
            </h2>
            <p className="text-xs text-white/80 mt-1">
              {isCollectorMode ? "Collector Fast Entry Enabled" : "Issue instant digital receipts"}
            </p>
          </div>
          <svg
            className="w-6 h-6 text-white/60 group-hover:translate-x-1 transition shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>

      {/* ── COLLECTION SUMMARY CARD (Visible to Owner/President/Treasurer) ── */}
      {(isOwner || isPresident || isTreasurer) && (
        <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-xs space-y-4">
          <div
            onClick={() => router.push("/app/collection-details?type=total")}
            className="flex items-center justify-between cursor-pointer group"
          >
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                {t("total_collections")}
              </span>
              <span className="text-3xl font-extrabold text-[#2E1C0C] group-hover:text-[#8B1E2D] transition">
                ₹ {stats.total.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#FFF6E8] flex items-center justify-center text-[#F47C20]">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          <div className="grid grid-cols-3 divide-x divide-gray-100 text-center">
            <div
              onClick={() => router.push("/app/collection-details?type=today")}
              className="cursor-pointer hover:bg-gray-50/80 p-2 rounded-xl transition"
            >
              <span className="text-[11px] text-gray-500 font-medium block">
                {t("today")}
              </span>
              <span className="text-base font-bold text-[#2E1C0C]">
                ₹ {stats.today.toLocaleString("en-IN")}
              </span>
            </div>
            <div
              onClick={() => router.push("/app/collection-details?type=month")}
              className="cursor-pointer hover:bg-gray-50/80 p-2 rounded-xl transition"
            >
              <span className="text-[11px] text-gray-500 font-medium block">
                {t("this_month")}
              </span>
              <span className="text-base font-bold text-[#2E1C0C]">
                ₹ {stats.monthly.toLocaleString("en-IN")}
              </span>
            </div>
            <div
              onClick={() => router.push("/app/collection-details?type=year")}
              className="cursor-pointer hover:bg-gray-50/80 p-2 rounded-xl transition"
            >
              <span className="text-[11px] text-gray-500 font-medium block">
                {t("this_year")}
              </span>
              <span className="text-base font-bold text-[#2E1C0C]">
                ₹ {stats.yearly.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div
                onClick={() => router.push("/app/collection-details?type=cash")}
                className="p-2 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition"
              >
                <span className="text-[10px] text-gray-500 block">Cash</span>
                <span className="text-xs font-bold text-gray-800">
                  ₹ {stats.cash.toLocaleString("en-IN")}
                </span>
              </div>
              <div
                onClick={() => router.push("/app/collection-details?type=upi")}
                className="p-2 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition"
              >
                <span className="text-[10px] text-gray-500 block">UPI</span>
                <span className="text-xs font-bold text-gray-800">
                  ₹ {stats.upi.toLocaleString("en-IN")}
                </span>
              </div>
              <div
                onClick={() => router.push("/app/collection-details?type=bank")}
                className="p-2 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition"
              >
                <span className="text-[10px] text-gray-500 block">Bank</span>
                <span className="text-xs font-bold text-gray-800">
                  ₹ {stats.bank.toLocaleString("en-IN")}
                </span>
              </div>
              <div
                onClick={() => router.push("/app/collection-details?type=cheque")}
                className="p-2 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition"
              >
                <span className="text-[10px] text-gray-500 block">Cheque</span>
                <span className="text-xs font-bold text-gray-800">
                  ₹ {stats.cheque.toLocaleString("en-IN")}
                </span>
              </div>
              <div
                onClick={() => router.push("/app/collection-details?type=other")}
                className="p-2 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition"
              >
                <span className="text-[10px] text-gray-500 block">Other</span>
                <span className="text-xs font-bold text-gray-800">
                  ₹ {stats.other.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DIGITAL RECEIPT ACTIVITY (Owner/President) ── */}
      {(isOwner || isPresident) && (
        <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg text-[#8B1E2D]">📊</span>
              <h3 className="font-bold text-sm text-[#2E1C0C]">
                {t("digital_receipt_activity")}
              </h3>
            </div>
            <button
              onClick={() => router.push("/app/settings")}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full transition"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-4 divide-x divide-gray-100 text-center pt-1">
            <div
              onClick={() => router.push("/app/collection-details?type=today")}
              className="cursor-pointer hover:bg-gray-50/80 p-2 rounded-xl transition"
            >
              <span className="text-[10px] text-gray-500 block">{t("today")}</span>
              <span className="text-base font-bold text-blue-600">
                {stats.todayReceiptsCount}
              </span>
            </div>
            <div
              onClick={() => router.push("/app/collection-details?type=month")}
              className="cursor-pointer hover:bg-gray-50/80 p-2 rounded-xl transition"
            >
              <span className="text-[10px] text-gray-500 block">{t("month")}</span>
              <span className="text-base font-bold text-orange-600">
                {stats.monthReceiptsCount}
              </span>
            </div>
            <div
              onClick={() => router.push("/app/receipt-history")}
              className="cursor-pointer hover:bg-gray-50/80 p-2 rounded-xl transition"
            >
              <span className="text-[10px] text-gray-500 block">{t("delivered")}</span>
              <span className="text-base font-bold text-green-600">
                {stats.deliveredReceiptsCount}
              </span>
            </div>
            <div
              onClick={() => router.push("/app/collection-details?type=pending")}
              className="cursor-pointer hover:bg-gray-50/80 p-2 rounded-xl transition"
            >
              <span className="text-[10px] text-gray-500 block">{t("pending")}</span>
              <span className="text-base font-bold text-amber-600">
                {stats.pendingReceiptsCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── MEMBER PERSONAL STATS ("My Performance" for non-owners) ── */}
      {!isOwner && !isPresident && !isTreasurer && (
        <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg text-[#8B1E2D]">👤</span>
            <h3 className="font-bold text-sm text-[#2E1C0C]">
              {t("my_performance")}
            </h3>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center pt-1">
            <div className="p-2.5 bg-orange-50/60 rounded-xl border border-orange-100">
              <span className="text-xs font-bold text-orange-700 block">
                ₹ {myPerformance.todayAmt.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] text-gray-500">{t("today")}</span>
            </div>
            <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100">
              <span className="text-xs font-bold text-blue-700 block">
                ₹ {myPerformance.monthAmt.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] text-gray-500">{t("month")}</span>
            </div>
            <div className="p-2.5 bg-red-50/60 rounded-xl border border-red-100">
              <span className="text-xs font-bold text-[#8B1E2D] block">
                ₹ {myPerformance.totalAmt.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] text-gray-500">{t("total")}</span>
            </div>
            <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100">
              <span className="text-xs font-bold text-amber-700 block">
                {myPerformance.pendingCount}
              </span>
              <span className="text-[10px] text-gray-500">{t("pending")}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── TEAM PERFORMANCE CARD (Owner/President) ── */}
      {(isOwner || isPresident) && teamMembers.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg text-[#8B1E2D]">🏆</span>
              <h3 className="font-bold text-sm text-[#2E1C0C]">
                {t("team_performance")}
              </h3>
            </div>
            <button
              onClick={() => router.push("/app/team")}
              className="text-xs font-bold text-[#8B1E2D] hover:underline"
            >
              Manage
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400">
                  <th className="pb-2">MEMBER</th>
                  <th className="pb-2 text-right">TODAY</th>
                  <th className="pb-2 text-right">MONTH</th>
                  <th className="pb-2 text-right">TOTAL</th>
                  <th className="pb-2 text-right">AVG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teamMembers.map((m, idx) => {
                  const isTop = idx === 0 && m.total > 0;
                  const avg = m.count > 0 ? m.total / m.count : 0;
                  return (
                    <tr
                      key={m.uid}
                      className={isTop ? "bg-[#FFF6E8]/60 font-semibold" : ""}
                    >
                      <td className="py-2.5 pr-2 truncate max-w-[120px]">
                        {isTop && "🏆 "}
                        {m.name}
                      </td>
                      <td className="py-2.5 text-right font-medium text-green-700">
                        ₹ {m.todayAmt.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 text-right font-medium text-gray-700">
                        ₹ {m.monthAmt.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 text-right font-bold text-[#8B1E2D]">
                        ₹ {m.total.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 text-right text-gray-500">
                        ₹ {Math.round(avg).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── QUICK ACTIONS GRID (Parity with 8 Android Quick Action tiles) ── */}
      <div className="space-y-3">
        <h3 className="font-bold text-base text-[#2E1C0C]">{t("quick_actions")}</h3>
        <div className="grid grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-black/5 shadow-xs">
          {/* Add Receipt */}
          <button
            onClick={() => router.push("/app/create-receipt")}
            className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-gray-50 transition group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-[#FFF6E8] flex items-center justify-center text-[#8B1E2D] mb-1.5 border border-[#8B1E2D]/20 group-hover:scale-105 transition">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <span className="text-[11px] font-semibold text-center text-gray-800 leading-tight">
              {t("action_add_receipt")}
            </span>
          </button>

          {/* History */}
          <button
            onClick={() => router.push("/app/receipt-history")}
            className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-gray-50 transition group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-[#FFF6E8] flex items-center justify-center text-[#8B1E2D] mb-1.5 border border-[#8B1E2D]/20 group-hover:scale-105 transition">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <span className="text-[11px] font-semibold text-center text-gray-800 leading-tight">
              {t("action_history")}
            </span>
          </button>

          {/* Donor List */}
          {(isOwner || isTreasurer) && (
            <button
              onClick={() => router.push("/app/donor-list")}
              className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-gray-50 transition group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-[#FFF6E8] flex items-center justify-center text-[#8B1E2D] mb-1.5 border border-[#8B1E2D]/20 group-hover:scale-105 transition">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-center text-gray-800 leading-tight">
                {t("action_donor_list")}
              </span>
            </button>
          )}

          {/* Pending Collections */}
          <button
            onClick={() => router.push("/app/collection-details?type=pending")}
            className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-red-50/50 transition group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-[#FFF1F1] flex items-center justify-center text-red-800 mb-1.5 border-2 border-red-800 group-hover:scale-105 transition">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-center text-red-900 leading-tight">
              {t("action_pending")}
            </span>
          </button>

          {/* Reports */}
          {(isOwner || isPresident) && (
            <button
              onClick={() => setShowExportModal(true)}
              className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-gray-50 transition group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-[#FFF6E8] flex items-center justify-center text-[#8B1E2D] mb-1.5 border border-[#8B1E2D]/20 group-hover:scale-105 transition">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-center text-gray-800 leading-tight">
                {t("action_report")}
              </span>
            </button>
          )}

          {/* Design Receipt (Owner only) */}
          {isOwner && (
            <button
              onClick={() => router.push("/app/settings")}
              className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-gray-50 transition group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-[#FFF6E8] flex items-center justify-center text-[#8B1E2D] mb-1.5 border border-[#8B1E2D]/20 group-hover:scale-105 transition">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-center text-gray-800 leading-tight">
                {t("action_design_receipt")}
              </span>
            </button>
          )}

          {/* Owner Signature (Owner only) */}
          {isOwner && (
            <button
              onClick={() => router.push("/app/settings")}
              className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-gray-50 transition group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-[#FFF6E8] flex items-center justify-center text-[#8B1E2D] mb-1.5 border border-[#8B1E2D]/20 group-hover:scale-105 transition">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-center text-gray-800 leading-tight">
                {t("action_owner_signature")}
              </span>
            </button>
          )}

          {/* Admin Settings (Owner only) */}
          {isOwner && (
            <button
              onClick={() => router.push("/app/settings")}
              className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-gray-50 transition group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-[#FFF6E8] flex items-center justify-center text-[#8B1E2D] mb-1.5 border border-[#8B1E2D]/20 group-hover:scale-105 transition">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-center text-gray-800 leading-tight">
                {t("action_admin_settings")}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── EXPENSE MANAGEMENT SECTION (Navigation to Expense History) ── */}
      <div
        onClick={() => router.push("/app/expense-history")}
        className="flex items-center justify-between p-4 bg-white rounded-2xl border border-black/5 shadow-xs cursor-pointer hover:border-black/15 transition group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#8B1E2D]/10 flex items-center justify-center text-[#8B1E2D]">
            💰
          </div>
          <div>
            <h4 className="font-bold text-sm text-gray-900 group-hover:text-[#8B1E2D] transition">
              {t("expense_management")}
            </h4>
            <p className="text-xs text-gray-500">{t("expense_management_desc")}</p>
          </div>
        </div>
        <svg
          className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>

      {/* ── CREDIT-DEBIT LEDGER SECTION ── */}
      <div
        onClick={() => router.push("/app/ledger")}
        className="flex items-center justify-between p-4 bg-white rounded-2xl border border-black/5 shadow-xs cursor-pointer hover:border-black/15 transition group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
            📊
          </div>
          <div>
            <h4 className="font-bold text-sm text-gray-900 group-hover:text-emerald-800 transition">
              {t("ledger_title")}
            </h4>
            <p className="text-xs text-gray-500">{t("ledger_subtitle")}</p>
          </div>
        </div>
        <svg
          className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>

      {/* ── RECENT RECEIPTS SECTION (Last 5) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-[#2E1C0C]">
            {t("recent_receipts")}
          </h3>
          <button
            onClick={() => router.push("/app/receipt-history")}
            className="text-xs font-bold text-[#8B1E2D] hover:underline"
          >
            {t("view_all")}
          </button>
        </div>

        {recentReceipts.length === 0 ? (
          <div className="p-8 bg-white/60 border border-gray-100 rounded-2xl text-center text-gray-500 text-xs">
            {t("no_recent_receipts")}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-black/5 shadow-xs divide-y divide-gray-100 overflow-hidden">
            {recentReceipts.map((r) => (
              <div
                key={r.id}
                onClick={() => router.push(`/app/receipt/${r.id}`)}
                className="p-3.5 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#8B1E2D]/10 text-[#8B1E2D] flex items-center justify-center font-bold text-xs shrink-0">
                    {(r.donorName || "G").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">
                      {r.donorName || "Guest Donor"}
                    </p>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                      <span>{r.receiptNumber}</span>
                      <span>•</span>
                      <span>{formatDate(r.createdAt)}</span>
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                          r.paymentStatus === "paid"
                            ? "bg-green-100 text-green-800"
                            : r.paymentStatus === "pending"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {r.paymentStatus}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pl-2 shrink-0">
                  <span className="font-extrabold text-sm text-[#2E1C0C]">
                    ₹ {r.amount.toLocaleString("en-IN")}
                  </span>
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── REPORTS BOTTOM SHEET / EXPORT MODAL ── */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-[#F8F1E7] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-[#2E1C0C]">
                {t("export_collection_reports")}
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 text-gray-500 hover:text-gray-800 rounded-full"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-600">
              {t("export_reports_desc")}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                {t("select_period")}
              </label>
              <select
                value={exportPeriod}
                onChange={(e) => setExportPeriod(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#8B1E2D]"
              >
                <option value="today">Today</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="total">Total (All Time)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleExport("csv")}
                className="py-2.5 px-4 bg-[#8B1E2D] hover:bg-[#721824] text-white rounded-xl font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>📄</span>
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => handleExport("excel")}
                className="py-2.5 px-4 bg-[#F47C20] hover:bg-[#d66512] text-white rounded-xl font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>📊</span>
                <span>Export Excel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
