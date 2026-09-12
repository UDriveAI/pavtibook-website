"use client";

import React, { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "../../../lib/i18n";
import {
  useDashboardData,
  ReceiptItem,
  parseReceiptDateTime,
  normalizePaymentMode,
} from "../../../lib/useDashboardData";

export default function CollectionDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "today";
  const { t } = useLanguage();

  const { allReceipts, isLoading } = useDashboardData();

  const title = useMemo(() => {
    switch (type) {
      case "today":
        return t("todays_collection");
      case "month":
        return t("this_month");
      case "year":
        return t("this_year");
      case "total":
        return t("total_collection");
      case "cash":
        return t("cash_collection_report");
      case "upi":
        return t("upi_collection_report");
      case "bank":
        return t("bank_collection_report");
      case "cheque":
        return t("cheque_collection_report");
      case "other":
        return t("other_collection_report");
      case "pending":
        return t("pending_collection_report");
      default:
        return t("collection_details");
    }
  }, [type, t]);

  const { filteredReceipts, groupedData, totalAmount, isGrouped } = useMemo(() => {
    const now = new Date();
    // Exclude cancelled and soft-deleted records for standard reports
    const validReceipts = allReceipts.filter(
      (r) => r.paymentStatus !== "cancelled" && !r.isDeleted
    );

    let filtered: ReceiptItem[] = [];
    const grouped: Record<string, number> = {};
    let total = 0;
    let groupedMode = false;

    if (type === "today") {
      filtered = validReceipts.filter((r) => {
        const d = parseReceiptDateTime(r.createdAt);
        if (!d) return false;
        return (
          r.paymentStatus === "paid" &&
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      });
      total = filtered.reduce((sum, r) => sum + r.amount, 0);
    } else if (type === "month") {
      groupedMode = true;
      const monthReceipts = validReceipts.filter((r) => {
        const d = parseReceiptDateTime(r.createdAt);
        if (!d) return false;
        return (
          r.paymentStatus === "paid" &&
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth()
        );
      });

      monthReceipts.forEach((r) => {
        const d = parseReceiptDateTime(r.createdAt);
        if (d) {
          // Format as "dd MMM" e.g. "12 Sep"
          const dayStr = d.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          });
          grouped[dayStr] = (grouped[dayStr] || 0) + r.amount;
        }
      });
      total = monthReceipts.reduce((sum, r) => sum + r.amount, 0);
    } else if (type === "year") {
      groupedMode = true;
      const yearReceipts = validReceipts.filter((r) => {
        const d = parseReceiptDateTime(r.createdAt);
        if (!d) return false;
        return r.paymentStatus === "paid" && d.getFullYear() === now.getFullYear();
      });

      yearReceipts.forEach((r) => {
        const d = parseReceiptDateTime(r.createdAt);
        if (d) {
          // Format as "MMMM yyyy" e.g. "September 2026"
          const monthStr = d.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          });
          grouped[monthStr] = (grouped[monthStr] || 0) + r.amount;
        }
      });
      total = yearReceipts.reduce((sum, r) => sum + r.amount, 0);
    } else if (type === "total") {
      // For total, include cancelled & deleted for audit visibility
      filtered = allReceipts;
      total = validReceipts
        .filter((r) => r.paymentStatus === "paid")
        .reduce((sum, r) => sum + r.amount, 0);
    } else if (
      type === "cash" ||
      type === "upi" ||
      type === "bank" ||
      type === "cheque" ||
      type === "other"
    ) {
      filtered = validReceipts.filter(
        (r) => r.paymentStatus === "paid" && normalizePaymentMode(r.paymentMode) === type
      );
      total = filtered.reduce((sum, r) => sum + r.amount, 0);
    } else if (type === "pending") {
      filtered = validReceipts.filter((r) => r.paymentStatus === "pending");
      total = filtered.reduce((sum, r) => sum + r.amount, 0);
    }

    return {
      filteredReceipts: filtered,
      groupedData: grouped,
      totalAmount: total,
      isGrouped: groupedMode,
    };
  }, [type, allReceipts]);

  const formatDate = (dateStr: string) => {
    const d = parseReceiptDateTime(dateStr);
    if (!d) return "";
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFBF7]">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3.5 bg-[#8B1E2D] text-white shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 -ml-1 text-white/90 hover:text-white rounded-full hover:bg-black/10 transition"
            title="Back"
          >
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <h1 className="text-lg font-bold truncate">{title}</h1>
        </div>
      </header>

      {/* Main List */}
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <div className="w-8 h-8 border-3 border-[#8B1E2D] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : isGrouped ? (
          /* Grouped list (Month / Year) */
          Object.keys(groupedData).length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              {t("no_collections_logged")}
            </div>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(groupedData).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-4 bg-white rounded-xl border border-black/5 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#8B1E2D]/10 flex items-center justify-center text-[#8B1E2D]">
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
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <span className="font-bold text-gray-800">{key}</span>
                  </div>
                  <span className="text-lg font-bold text-[#8B1E2D]">
                    ₹ {val.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Detailed receipt list */
          filteredReceipts.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              {t("no_receipt_records")}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredReceipts.map((r) => {
                const isDel = r.isDeleted;
                return (
                  <div
                    key={r.id}
                    onClick={() => router.push(`/app/create-receipt?id=${r.id}`)}
                    className="p-4 bg-white rounded-xl border border-black/5 shadow-xs cursor-pointer hover:border-black/15 transition flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`font-bold text-sm truncate ${
                            isDel ? "text-red-900" : "text-gray-800"
                          }`}
                        >
                          {r.receiptNumber || "PB-RECEIPT"}
                        </span>
                        <span
                          className={`font-bold text-base ${
                            isDel
                              ? "text-red-800 line-through"
                              : "text-[#8B1E2D]"
                          }`}
                        >
                          ₹ {r.amount.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">
                        {t("donor")}: {r.donorName || "Anonymous"}
                      </p>
                      {type === "pending" ? (
                        <>
                          <p className="text-[11px] text-gray-500">
                            Mobile: {r.donorMobile || "N/A"}
                          </p>
                          <p className="text-[11px] font-bold text-[#8B1E2D]">
                            Amount Due: ₹ {r.amount.toLocaleString("en-IN")}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            Created Date: {formatDate(r.createdAt)}
                          </p>
                        </>
                      ) : (
                        <p className="text-[11px] text-gray-500">
                          Mode: {r.paymentMode.toUpperCase()} • {formatDate(r.createdAt)}
                        </p>
                      )}

                      {(type === "total" || isDel) && (
                        <div className="mt-1.5">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              isDel
                                ? "bg-red-100 text-red-900 border border-red-300"
                                : r.paymentStatus === "paid"
                                ? "bg-green-100 text-green-800"
                                : r.paymentStatus === "cancelled"
                                ? "bg-gray-200 text-gray-700"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {isDel ? "🔴 DELETED" : r.paymentStatus}
                          </span>
                        </div>
                      )}
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400 shrink-0"
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
                );
              })}
            </div>
          )
        )}
      </main>

      {/* Sticky Bottom Footer Total */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <span className="font-bold text-gray-700 text-base">
            {type === "pending" ? t("total_pending_due") : t("total_collection_footer")}
          </span>
          <span className="font-bold text-xl text-[#8B1E2D]">
            ₹ {totalAmount.toLocaleString("en-IN")}
          </span>
        </div>
      </footer>
    </div>
  );
}