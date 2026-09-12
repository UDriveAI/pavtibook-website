"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase-client";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/lib/i18n";

interface WhatsAppLog {
  id: string;
  receiptNumber?: string;
  recipientMobile?: string;
  textStatus?: string;
  whatsappMediaStatus?: string;
  attemptCount?: number;
  textError?: string;
  whatsappMediaError?: string;
  whatsappMediaUrl?: string;
  updatedAt?: string;
  createdAt?: string;
}

export default function WhatsAppLogsPage() {
  const router = useRouter();
  const { activeOrgId } = useAuth();
  const { t } = useLanguage();

  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "sent" | "failed" | "pending">("all");
  const [retryingReceiptId, setRetryingReceiptId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    if (!activeOrgId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "whatsapp_logs"),
      where("organizationId", "==", activeOrgId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: WhatsAppLog[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const parseDate = (val: unknown): string | undefined => {
            if (!val) return undefined;
            if (typeof val === "object" && val !== null && "toDate" in val) {
              return (val as { toDate: () => Date }).toDate().toISOString();
            }
            if (typeof val === "string") return val;
            return undefined;
          };

          return {
            id: docSnap.id,
            receiptNumber: d.receiptNumber || "Unknown Receipt",
            recipientMobile: d.recipientMobile || "Unknown Phone",
            textStatus: d.textStatus || "pending",
            whatsappMediaStatus: d.whatsappMediaStatus || "not_sent",
            attemptCount: typeof d.attemptCount === "number" ? d.attemptCount : 1,
            textError: d.textError || "",
            whatsappMediaError: d.whatsappMediaError || "",
            whatsappMediaUrl: d.whatsappMediaUrl || "",
            updatedAt: parseDate(d.updatedAt),
            createdAt: parseDate(d.createdAt),
          };
        });

        list.sort((a, b) => {
          const timeA = a.updatedAt || a.createdAt || "";
          const timeB = b.updatedAt || b.createdAt || "";
          return timeB.localeCompare(timeA);
        });

        setLogs(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching whatsapp logs:", err);
        setError("Unable to load delivery history. Please check connection.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeOrgId]);

  const isSent = (l: WhatsAppLog) =>
    l.textStatus === "sent" && (l.whatsappMediaStatus === "sent" || l.whatsappMediaStatus === "not_sent" || !l.whatsappMediaStatus);

  const isFailed = (l: WhatsAppLog) =>
    l.textStatus === "failed" || l.whatsappMediaStatus === "failed" || l.textStatus === "permanent_failure";

  const isPending = (l: WhatsAppLog) =>
    l.textStatus === "processing" || l.whatsappMediaStatus === "processing" || l.textStatus === "pending";

  const filteredLogs = logs.filter((l) => {
    if (activeTab === "sent") return isSent(l);
    if (activeTab === "failed") return isFailed(l);
    if (activeTab === "pending") return isPending(l);
    return true;
  });

  const handleRetryText = async (receiptId: string) => {
    setRetryingReceiptId(receiptId);
    setStatusMessage(null);
    try {
      const retryFn = httpsCallable<{ receiptId: string }, { success: boolean }>(functions, "retryWhatsappSend");
      await retryFn({ receiptId });
      setStatusMessage({ text: "WhatsApp text retry triggered successfully!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Retry failed.";
      setStatusMessage({ text: `Retry failed: ${msg}`, isError: true });
    } finally {
      setRetryingReceiptId(null);
    }
  };

  const handleRetryMedia = async (receiptId: string) => {
    setRetryingReceiptId(receiptId);
    setStatusMessage(null);
    try {
      const retryMediaFn = httpsCallable<{ receiptId: string }, { success: boolean }>(functions, "sendReceiptMediaWhatsapp");
      await retryMediaFn({ receiptId });
      setStatusMessage({ text: "WhatsApp media delivery triggered successfully!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Media delivery failed.";
      setStatusMessage({ text: `Media retry failed: ${msg}`, isError: true });
    } finally {
      setRetryingReceiptId(null);
    }
  };

  const getStatusBadge = (status: string, label: string) => {
    let bg = "bg-blue-50 text-blue-800 border-blue-200";
    if (status === "sent") {
      bg = "bg-green-50 text-green-800 border-green-200";
    } else if (status === "failed" || status === "permanent_failure") {
      bg = "bg-red-50 text-red-800 border-red-200";
    } else if (status === "processing") {
      bg = "bg-amber-50 text-amber-800 border-amber-200";
    } else if (status === "disabled" || status === "not_sent") {
      bg = "bg-gray-100 text-gray-700 border-gray-200";
    }

    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${bg} uppercase`}>
        {label}: {status}
      </span>
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Just now";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Just now";
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-20">
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
          <h1 className="text-2xl font-black text-gray-900">{t("whatsapp_logs_title")}</h1>
          <p className="text-xs text-gray-500">Track and manage automated WhatsApp receipt message deliveries</p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold border transition ${
            statusMessage.isError
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        {(
          [
            { id: "all", label: t("whatsapp_tab_all") },
            { id: "sent", label: t("whatsapp_tab_sent") },
            { id: "failed", label: t("whatsapp_tab_failed") },
            { id: "pending", label: t("whatsapp_tab_pending") },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-[#8B1E2D] text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-black/5 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#8B1E2D] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs text-gray-500 font-medium">Loading delivery logs...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl text-center space-y-2">
          <p className="text-sm font-bold text-red-800">{error}</p>
          <button
            onClick={() => router.refresh()}
            className="px-4 py-1.5 text-xs font-bold bg-red-600 text-white rounded-xl"
          >
            Retry
          </button>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-black/5 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-gray-700">No logs found in this tab</p>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Automated delivery records and errors for donor receipts will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isRetrying = retryingReceiptId === log.id;
            const canRetryText = log.textStatus === "failed" && (log.attemptCount || 1) >= 3;
            const canSendMedia =
              log.textStatus === "sent" &&
              (log.whatsappMediaStatus === "failed" || log.whatsappMediaStatus === "not_sent");

            return (
              <div
                key={log.id}
                className="bg-white rounded-2xl p-4 md:p-5 border border-black/5 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-black text-sm text-[#8B1E2D]">
                      {log.receiptNumber}
                    </span>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5">
                      Recipient: <span className="font-mono">{log.recipientMobile}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 justify-end">
                    {getStatusBadge(log.textStatus || "pending", "Text")}
                    {getStatusBadge(log.whatsappMediaStatus || "not_sent", "Media")}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>Attempts: {log.attemptCount}/3</span>
                  <span>{formatDate(log.updatedAt || log.createdAt)}</span>
                </div>

                {log.textError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-900 leading-relaxed font-mono">
                    Text Error: {log.textError}
                  </div>
                )}

                {log.whatsappMediaError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-900 leading-relaxed font-mono">
                    Media Error: {log.whatsappMediaError}
                  </div>
                )}

                {log.whatsappMediaUrl && (
                  <div className="text-[11px] font-bold text-teal-700 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.102-1.101" />
                    </svg>
                    Signed URL generated (Expires in 24h)
                  </div>
                )}

                {(canRetryText || canSendMedia) && (
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                    {canRetryText && (
                      <button
                        onClick={() => handleRetryText(log.id)}
                        disabled={isRetrying}
                        className="px-3 py-1.5 rounded-xl border border-[#F47C20] text-[#F47C20] text-xs font-bold hover:bg-[#F47C20]/10 transition disabled:opacity-50"
                      >
                        {isRetrying ? "Retrying..." : t("whatsapp_retry_text")}
                      </button>
                    )}
                    {canSendMedia && (
                      <button
                        onClick={() => handleRetryMedia(log.id)}
                        disabled={isRetrying}
                        className="px-3 py-1.5 rounded-xl bg-teal-800 text-white text-xs font-bold hover:bg-teal-900 transition disabled:opacity-50"
                      >
                        {isRetrying ? "Sending..." : t("whatsapp_send_media")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
