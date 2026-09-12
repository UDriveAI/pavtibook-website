"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useOrg } from "@/context/OrgContext";
import { useLanguage } from "@/lib/i18n";
import { db, functions } from "@/lib/firebase-client";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertCircle,
  Eye,
} from "lucide-react";

interface ChangeRequestItem {
  id: string;
  targetType: string;
  targetId: string;
  requestedAction: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  requestedBy: string;
  requestedByName: string;
  requestReason: string;
  createdAt: string;
  oldValues?: Record<string, unknown>;
  proposedValues?: Record<string, unknown>;
  rejectionReason?: string;
}

export default function ApprovalsPage() {
  const router = useRouter();
  const { activeOrg, isOwner } = useOrg();
  const { t } = useLanguage();

  const [requests, setRequests] = useState<ChangeRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Rejection modal
  const [rejectModalReq, setRejectModalReq] = useState<ChangeRequestItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadRequests = async () => {
    if (!activeOrg?.id) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "change_requests"),
        where("organizationId", "==", activeOrg.id),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const list: ChangeRequestItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ChangeRequestItem, "id">),
      }));
      setRequests(list);
    } catch (err) {
      console.error("Error loading change requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrg?.id]);

  // F23: Review Change Request (Owner only)
  const handleReview = async (
    requestId: string,
    action: "approve" | "reject",
    rejectionReasonText?: string
  ) => {
    setProcessingId(requestId);
    setActionError(null);

    try {
      const reviewFn = httpsCallable<
        { requestId: string; action: "approve" | "reject"; rejectionReason?: string },
        { success: boolean }
      >(functions, "reviewChangeRequest");

      await reviewFn({
        requestId,
        action,
        rejectionReason: rejectionReasonText,
      });

      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? {
                ...r,
                status: action === "approve" ? "approved" : "rejected",
                rejectionReason: rejectionReasonText,
              }
            : r
        )
      );

      if (action === "reject") {
        setRejectModalReq(null);
        setRejectReason("");
      }
    } catch (err: unknown) {
      console.error("Failed to review change request:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg || "Failed to process request.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/app")}
            className="p-2 -ml-2 text-stone-600 hover:text-stone-900 rounded-full hover:bg-stone-100 transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#8B1E2D]" />
              <span>{t("approvals_title", "Approval Requests")}</span>
            </h1>
            <p className="text-xs text-stone-500 font-medium">
              Review and authorize receipt edit requests submitted by members
            </p>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3 text-xs">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p>{actionError}</p>
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#8B1E2D] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-stone-500">Loading change requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center space-y-3">
            <div className="w-12 h-12 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mx-auto text-xl">
              🛡️
            </div>
            <p className="text-sm font-bold text-stone-800">No pending approval requests</p>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Member-submitted receipt corrections requiring Owner verification will appear here.
            </p>
          </div>
        ) : (
          requests.map((req) => {
            const isPending = req.status === "pending";
            return (
              <div
                key={req.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-stone-900">
                        {req.requestedAction === "EDIT_RECEIPT" ? "Receipt Correction" : req.requestedAction}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isPending
                            ? "bg-amber-100 text-amber-800"
                            : req.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Requested by {req.requestedByName || "Member"} ·{" "}
                      {new Date(req.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <button
                    onClick={() => router.push(`/app/receipt/${req.targetId}`)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#8B1E2D] hover:underline"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Target Receipt</span>
                  </button>
                </div>

                {/* Reason */}
                <div className="bg-stone-50 p-3 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-stone-700">Reason for Request:</p>
                  <p className="text-stone-600 italic">&ldquo;{req.requestReason}&rdquo;</p>
                </div>

                {/* Proposed Changes Comparison */}
                {req.proposedValues && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1">
                      <p className="font-bold text-amber-900">Proposed New Values</p>
                      {Object.entries(req.proposedValues).map(([k, v]) => (
                        <p key={k} className="text-amber-800">
                          <span className="font-medium text-amber-950">{k}:</span>{" "}
                          <span className="font-bold">{String(v)}</span>
                        </p>
                      ))}
                    </div>

                    {req.oldValues && (
                      <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                        <p className="font-bold text-stone-700">Original Values</p>
                        {Object.entries(req.oldValues).map(([k, v]) => (
                          <p key={k} className="text-stone-600">
                            <span className="font-medium text-stone-900">{k}:</span>{" "}
                            <span>{String(v)}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions for Owner */}
                {isPending && isOwner && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                    <button
                      onClick={() => setRejectModalReq(req)}
                      disabled={processingId === req.id}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleReview(req.id, "approve")}
                      disabled={processingId === req.id}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Update</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Rejection Modal */}
      {rejectModalReq && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900">
              Reject Change Request
            </h3>
            <p className="text-xs text-stone-500">
              Please specify the reason why this correction cannot be approved.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Verified with donor, original amount is correct"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalReq(null)}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReview(rejectModalReq.id, "reject", rejectReason)}
                disabled={!rejectReason.trim() || processingId === rejectModalReq.id}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 transition"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}