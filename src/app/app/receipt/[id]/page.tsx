"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs, DocumentData } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { useLanguage } from "@/lib/i18n";
import { db, functions } from "@/lib/firebase-client";
import { TraditionalReceipt, ReceiptData, OrganizationData } from "@/components/receipt/TraditionalReceipt";
import {
  exportReceiptAsJpg,
  exportReceiptAsPdf,
  printReceipt,
  buildWhatsAppShareUrl,
} from "@/lib/receiptExport";
import {
  ArrowLeft,
  Share2,
  Download,
  Printer,
  Trash2,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";

export default function ReceiptDetailsPage() {
  const params = useParams();
  const receiptId = (params?.id as string) || "";
  const router = useRouter();
  const { userData } = useAuth();
  const { activeOrg, isOwner, isPresident, isTreasurer } = useOrg();
  const { t, language } = useLanguage();

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Soft Delete Modal State (F21)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Change Request Modal State (F22)
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [propDonorName, setPropDonorName] = useState("");
  const [propAmount, setPropAmount] = useState("");
  const [propPurpose, setPropPurpose] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [isSubmittingChange, setIsSubmittingChange] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeSuccess, setChangeSuccess] = useState(false);

  // Payment Confirmation State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMethod, setConfirmMethod] = useState("cash");
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  // Export Action State
  const [isExporting, setIsExporting] = useState(false);

  // Authorized to soft delete: Owner, Admin, President, Treasurer
  const canSoftDelete = isOwner || isPresident || isTreasurer || userData?.isSoftwareOwner;

  // Load Receipt Data
  useEffect(() => {
    if (!receiptId) return;

    const fetchReceipt = async () => {
      setLoading(true);
      setError(null);
      try {
        const receiptRef = doc(db, "receipts", receiptId);
        const snap = await getDoc(receiptRef);
        let data: DocumentData | null = null;
        let finalDocId = receiptId;

        if (snap.exists()) {
          data = snap.data();
          finalDocId = snap.id;
        } else {
          // Fallback: search by receiptNumber (e.g., "PB-2026-000076")
          try {
            const q = query(
              collection(db, "receipts"),
              where("receiptNumber", "==", receiptId)
            );
            const qSnap = await getDocs(q);
            if (!qSnap.empty) {
              const firstDoc = qSnap.docs[0];
              data = firstDoc.data();
              finalDocId = firstDoc.id;
            }
          } catch (queryErr) {
            console.warn("Receipt lookup by receiptNumber failed:", queryErr);
          }
        }

        if (!data) {
          if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
            const mockReceipt: ReceiptData = {
              id: receiptId,
              receiptNumber: receiptId.startsWith("PB-") ? receiptId : "PB-2026-000025",
              donorName: "सचिन तेंडुलकर (Sachin Tendulkar)",
              donorMobile: "9822012345",
              donorAddress: "Bandra West, Mumbai, Maharashtra",
              amount: 5001,
              purpose: "श्री गणेश उत्सव देणगी (Festival Donation)",
              paymentMode: "upi",
              paymentStatus: "paid",
              createdAt: "2026-09-12T10:30:00.000Z",
              qrCodeValue: `https://pavtibook.online/receipt/${receiptId}`,
              collectorName: "प्रणय भोसले (Pranay Bhosale)",
              collectorRole: "Owner",
              isDeleted: false,
              deleteReason: "",
              languageCode: "mr",
            };
            setReceipt(mockReceipt);
            setPropDonorName(mockReceipt.donorName);
            setPropAmount(mockReceipt.amount.toString());
            setPropPurpose(mockReceipt.purpose);
            setLoading(false);
            return;
          }
          setError("Receipt not found or has been removed.");
          return;
        }

        const model: ReceiptData = {
          id: finalDocId,
          receiptNumber: data.receiptNumber || data.receipt_number || "PB-RECEIPT",
          donorName: data.donorName || data.donor_name || "Donor",
          donorMobile: data.donorMobile || data.donor_mobile || "",
          donorAddress: data.donorAddress || data.donor_address || "",
          amount: typeof data.amount === "number" ? data.amount : parseFloat(data.amount) || 0,
          purpose: data.purpose || "General Donation",
          paymentMode: data.paymentMode || data.payment_mode || "cash",
          paymentStatus: data.paymentStatus || data.payment_status || "paid",
          createdAt: data.createdAt || data.created_at || new Date().toISOString(),
          qrCodeValue: data.qrCodeValue || data.qr_code_value || "",
          collectorName: data.collectorName || data.createdByName || "Authorized User",
          collectorRole: data.collectorRole || data.createdByRole || "Member",
          isDeleted: data.isDeleted === true,
          deleteReason: data.deleteReason || "",
          languageCode: data.languageCode || data.language_code || "",
        };

        setReceipt(model);
        setPropDonorName(model.donorName);
        setPropAmount(model.amount.toString());
        setPropPurpose(model.purpose);
      } catch (err: unknown) {
        if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
          const mockReceipt: ReceiptData = {
            id: receiptId,
            receiptNumber: receiptId.startsWith("PB-") ? receiptId : "PB-2026-000025",
            donorName: "सचिन तेंडुलकर (Sachin Tendulkar)",
            donorMobile: "9822012345",
            donorAddress: "Bandra West, Mumbai, Maharashtra",
            amount: 5001,
            purpose: "श्री गणेश उत्सव देणगी (Festival Donation)",
            paymentMode: "upi",
            paymentStatus: "paid",
            createdAt: "2026-09-12T10:30:00.000Z",
            qrCodeValue: `https://pavtibook.online/receipt/${receiptId}`,
            collectorName: "प्रणय भोसले (Pranay Bhosale)",
            collectorRole: "Owner",
            isDeleted: false,
            deleteReason: "",
            languageCode: "mr",
          };
          setReceipt(mockReceipt);
          setPropDonorName(mockReceipt.donorName);
          setPropAmount(mockReceipt.amount.toString());
          setPropPurpose(mockReceipt.purpose);
          setLoading(false);
          return;
        }
        console.error("Error fetching receipt:", err);
        setError("Failed to load receipt details.");
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [receiptId]);

  // F17: Download PDF
  const handleDownloadPdf = async () => {
    const el = document.getElementById("pavtibook-traditional-receipt");
    if (!el || !receipt) return;
    setIsExporting(true);
    try {
      await exportReceiptAsPdf(el, `${receipt.receiptNumber}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // F18: Download JPG
  const handleDownloadJpg = async () => {
    const el = document.getElementById("pavtibook-traditional-receipt");
    if (!el || !receipt) return;
    setIsExporting(true);
    try {
      await exportReceiptAsJpg(el, `${receipt.receiptNumber}.jpg`);
    } catch (err) {
      console.error("JPG export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // F19: Print Receipt
  const handlePrint = () => {
    printReceipt();
  };

  // F20: WhatsApp Share
  const handleWhatsAppShare = () => {
    if (!receipt) return;
    const url = buildWhatsAppShareUrl({
      receipt: {
        receiptNumber: receipt.receiptNumber,
        donorName: receipt.donorName,
        donorMobile: receipt.donorMobile,
        amount: receipt.amount,
        purpose: receipt.purpose,
        createdAt: receipt.createdAt,
        id: receipt.id,
        paymentStatus: receipt.paymentStatus,
      },
      orgName: activeOrg?.name || "Organization",
      languageCode: receipt.languageCode || (activeOrg as { languageCode?: string })?.languageCode || language || "mr",
      receiptPublicUrl: `https://pavtibook.online/receipt/${receipt.id}`,
    });
    window.open(url, "_blank");
  };

  // Payment Confirmation via confirmPayment Cloud Function
  const handleConfirmPayment = async () => {
    if (!receipt?.id) return;
    setIsConfirming(true);
    setConfirmError(null);

    try {
      if (canSoftDelete) {
        // Owner / Admin / President / Treasurer: direct confirmPayment callable
        const confirmFn = httpsCallable<
          { receiptId: string; paymentMethod: string; transactionRef: string },
          { success: boolean; message?: string; alreadyPaid?: boolean }
        >(functions, "confirmPayment");

        const res = await confirmFn({
          receiptId: receipt.id,
          paymentMethod: confirmMethod,
          transactionRef: "MANUAL-RECONCILED",
        });

        if (res.data.success) {
          setReceipt((prev) =>
            prev
              ? {
                  ...prev,
                  paymentStatus: "paid",
                  paymentMode: confirmMethod,
                }
              : null
          );
          setConfirmSuccess(true);
          setTimeout(() => {
            setShowConfirmModal(false);
            setConfirmSuccess(false);
          }, 1500);
        } else {
          setConfirmError(res.data.message || "Failed to confirm payment on server.");
        }
      } else {
        // Member / Collector: submit change request
        const submitChangeFn = httpsCallable<
          {
            targetType: string;
            targetId: string;
            requestedAction: string;
            proposedValues: Record<string, unknown>;
            requestReason: string;
          },
          { success: boolean }
        >(functions, "submitChangeRequest");

        await submitChangeFn({
          targetType: "receipt",
          targetId: receipt.id,
          requestedAction: "CONFIRM_PAYMENT",
          proposedValues: {
            paymentStatus: "paid",
            paymentMode: confirmMethod,
          },
          requestReason: `Payment collected via ${confirmMethod.toUpperCase()}`,
        });

        setConfirmSuccess(true);
        setTimeout(() => {
          setShowConfirmModal(false);
          setConfirmSuccess(false);
        }, 1500);
      }
    } catch (err: unknown) {
      console.error("Payment confirmation error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setConfirmError(msg || "Failed to confirm payment on server.");
    } finally {
      setIsConfirming(false);
    }
  };

  // F21: Soft Delete Receipt via Cloud Function softDeleteReceipt
  const handleConfirmDelete = async () => {
    if (!receipt?.id || deleteConfirmText.trim() !== "DELETE") {
      setDeleteError('You must type "DELETE" exactly to confirm.');
      return;
    }
    if (!deleteReason.trim()) {
      setDeleteError("Please enter a reason for voiding this receipt.");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const softDeleteFn = httpsCallable<
        { receiptId: string; confirmationText: string; deleteReason: string },
        { success: boolean }
      >(functions, "softDeleteReceipt");

      await softDeleteFn({
        receiptId: receipt.id,
        confirmationText: "DELETE",
        deleteReason: deleteReason.trim(),
      });

      setReceipt((prev) =>
        prev
          ? {
              ...prev,
              isDeleted: true,
              deleteReason: deleteReason.trim(),
            }
          : null
      );
      setShowDeleteModal(false);
    } catch (err: unknown) {
      console.error("Failed to void receipt:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setDeleteError(msg || "Failed to void receipt.");
    } finally {
      setIsDeleting(false);
    }
  };

  // F22: Submit Change Request via Cloud Function submitChangeRequest
  const handleSubmitChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receipt?.id) return;
    if (!changeReason.trim()) {
      setChangeError("Please provide a reason for the requested changes.");
      return;
    }

    setIsSubmittingChange(true);
    setChangeError(null);

    try {
      const submitChangeFn = httpsCallable<
        {
          targetType: string;
          targetId: string;
          requestedAction: string;
          proposedValues: Record<string, unknown>;
          requestReason: string;
        },
        { success: boolean }
      >(functions, "submitChangeRequest");

      const proposedValues: Record<string, unknown> = {};
      if (propDonorName.trim() && propDonorName.trim() !== receipt.donorName) {
        proposedValues.donorName = propDonorName.trim();
      }
      const numAmt = parseFloat(propAmount);
      if (!isNaN(numAmt) && numAmt !== receipt.amount) {
        proposedValues.amount = numAmt;
      }
      if (propPurpose.trim() && propPurpose.trim() !== receipt.purpose) {
        proposedValues.purpose = propPurpose.trim();
      }

      if (Object.keys(proposedValues).length === 0) {
        setChangeError("No changes were made to the receipt fields.");
        setIsSubmittingChange(false);
        return;
      }

      await submitChangeFn({
        targetType: "receipt",
        targetId: receipt.id,
        requestedAction: "EDIT_RECEIPT",
        proposedValues,
        requestReason: changeReason.trim(),
      });

      setChangeSuccess(true);
      setTimeout(() => {
        setShowChangeModal(false);
        setChangeSuccess(false);
      }, 2000);
    } catch (err: unknown) {
      console.error("Failed to submit change request:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setChangeError(msg || "Failed to submit change request.");
    } finally {
      setIsSubmittingChange(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-10 h-10 border-4 border-[#8B1E2D] border-t-transparent rounded-full animate-spin" />
        <p className="text-stone-500 font-medium text-sm">Loading receipt details...</p>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="max-w-md mx-auto p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-2xl font-bold">
          !
        </div>
        <h2 className="text-lg font-bold text-stone-900">{error || "Receipt not found"}</h2>
        <button
          onClick={() => router.push("/app/receipt-history")}
          className="px-6 py-2.5 bg-[#8B1E2D] text-white rounded-xl text-xs font-bold hover:bg-[#721824] transition"
        >
          Back to Receipt History
        </button>
      </div>
    );
  }

  const organizationData: OrganizationData = {
    name: (activeOrg?.name as string) || "Organization",
    registrationNumber: (activeOrg?.registrationNumber as string) || "",
    orgMobile: (activeOrg?.orgMobile as string) || (activeOrg?.adminMobile as string) || "",
    address: (activeOrg?.address as string) || "",
    city: (activeOrg?.city as string) || "",
    state: (activeOrg?.state as string) || "",
    pincode: (activeOrg?.pincode as string) || "",
    logoUrl: (activeOrg?.logoUrl as string) || undefined,
    headerLogoUrl: (activeOrg?.headerLogoUrl as string) || undefined,
    stampUrl: (activeOrg?.stampUrl as string) || undefined,
    signatureUrl: (activeOrg?.signatureUrl as string) || undefined,
    footerText: (activeOrg?.footerText as string) || undefined,
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/app/receipt-history")}
            className="p-2 -ml-2 text-stone-600 hover:text-stone-900 rounded-full hover:bg-stone-100 transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 flex items-center gap-2">
              <span>{receipt.receiptNumber}</span>
              {receipt.isDeleted && (
                <span className="text-xs bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full font-bold uppercase">
                  {t("status_deleted")}
                </span>
              )}
            </h1>
            <p className="text-xs text-stone-500 font-medium">
              {receipt.donorName} · ₹{receipt.amount.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* F20: WhatsApp */}
          <button
            onClick={handleWhatsAppShare}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
          >
            <Share2 className="w-4 h-4" />
            <span>{t("share_whatsapp")}</span>
          </button>

          {/* F18: JPG */}
          <button
            onClick={handleDownloadJpg}
            disabled={isExporting}
            className="px-3 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-60"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>{t("download_jpg")}</span>
          </button>

          {/* F17: PDF */}
          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="px-3 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-60"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>{t("download_pdf")}</span>
          </button>

          {/* F19: Print */}
          <button
            onClick={handlePrint}
            className="p-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-xl transition"
            title={t("print_receipt")}
          >
            <Printer className="w-4 h-4" />
          </button>

          {/* Confirm Payment button for pending receipts */}
          {!receipt.isDeleted && receipt.paymentStatus === "pending" && (
            <button
              onClick={() => setShowConfirmModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {canSoftDelete
                  ? t("confirm_payment", "पेमेंट पुष्टी (Confirm Payment)")
                  : t("request_confirm_payment", "पेमेंट मंजुरी विनंती (Request Confirmation)")}
              </span>
            </button>
          )}

          {/* F21: Soft Delete (Owner/Officer) or F22: Change Request (Member) */}
          {!receipt.isDeleted && (
            <>
              {canSoftDelete ? (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t("void_receipt")}</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowChangeModal(true)}
                  className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{t("request_edit")}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Traditional Receipt Canvas Component */}
      <div className="py-2">
        <TraditionalReceipt
          receipt={receipt}
          organization={organizationData}
          languageCode={receipt.languageCode || (activeOrg as { languageCode?: string })?.languageCode || language || "mr"}
          receiptPublicUrl={`https://pavtibook.online/receipt/${receipt.id}`}
        />
      </div>

      {/* F21: Soft Delete Dialog */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600 font-bold">
                <AlertTriangle className="w-5 h-5" />
                <span>{t("delete_confirmation_title")}</span>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              {t("delete_confirmation_desc")}
            </p>

            {deleteError && (
              <p className="text-xs text-red-600 font-semibold">{deleteError}</p>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  {t("delete_reason_label")}
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder={t("delete_reason_hint")}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  {t("type_delete_to_confirm")}
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 text-xs font-mono font-bold tracking-widest border border-red-300 bg-red-50/40 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none uppercase"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting || deleteConfirmText.trim() !== "DELETE" || !deleteReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 transition"
              >
                {isDeleting ? t("voiding") : t("confirm_void_btn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* F22: Change Request Modal (Member -> Owner) */}
      {showChangeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSubmitChangeRequest}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl border border-stone-200"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">
                {t("submit_change_request_title")}
              </h3>
              <button
                type="button"
                onClick={() => setShowChangeModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              {t("submit_change_request_desc")}
            </p>

            {changeSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Correction request submitted successfully!</span>
              </div>
            ) : (
              <>
                {changeError && (
                  <p className="text-xs text-red-600 font-semibold">{changeError}</p>
                )}

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="block font-bold text-stone-700">
                      {t("proposed_donor_name")}
                    </label>
                    <input
                      type="text"
                      value={propDonorName}
                      onChange={(e) => setPropDonorName(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-stone-700">
                      {t("proposed_amount")}
                    </label>
                    <input
                      type="number"
                      value={propAmount}
                      onChange={(e) => setPropAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-stone-700">
                      {t("proposed_purpose")}
                    </label>
                    <input
                      type="text"
                      value={propPurpose}
                      onChange={(e) => setPropPurpose(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-stone-700">
                      {t("request_reason_label")}
                    </label>
                    <textarea
                      rows={2}
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                      required
                      placeholder="Why is this change required?"
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowChangeModal(false)}
                    className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingChange || !changeReason.trim()}
                    className="px-4 py-2 bg-[#8B1E2D] hover:bg-[#721824] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 transition"
                  >
                    {isSubmittingChange ? t("submitting_request") : t("send_request_btn")}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#8B1E2D] font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-stone-900">
                  {canSoftDelete
                    ? t("confirm_payment_title", "पेमेंट पुष्टी (Confirm Payment)")
                    : t("request_payment_title", "पेमेंट मंजुरी विनंती (Request Confirmation)")}
                </h3>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600">
              {canSoftDelete
                ? `पावती क्र. ${receipt.receiptNumber} साठी ₹${receipt.amount.toLocaleString("en-IN")} चे देयक जमा झाल्याची पुष्टी करा.`
                : `पावती क्र. ${receipt.receiptNumber} साठी ₹${receipt.amount.toLocaleString("en-IN")} चे देयक जमा झाले असल्यास मालकाकडे मंजुरीची विनंती पाठवा.`}
            </p>

            {confirmSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {canSoftDelete
                    ? "Payment confirmed successfully! Receipt marked as PAID."
                    : "Payment confirmation request submitted to Owner!"}
                </span>
              </div>
            ) : (
              <>
                {confirmError && (
                  <p className="text-xs text-red-600 font-semibold">{confirmError}</p>
                )}

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="block font-bold text-stone-700">
                      {t("select_payment_mode", "पेमेंट पद्धत निवडा (Payment Method)")}
                    </label>
                    <select
                      value={confirmMethod}
                      onChange={(e) => setConfirmMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none bg-white font-medium"
                    >
                      <option value="cash">{t("cash", "रोख रक्कम (Cash)")}</option>
                      <option value="upi">{t("upi", "UPI / QR Code")}</option>
                      <option value="bank">{t("bank", "बँक हस्तांतरण (Bank Transfer)")}</option>
                      <option value="cheque">{t("cheque", "धनादेश (Cheque)")}</option>
                      <option value="other">{t("other", "इतर (Other)")}</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={isConfirming}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 transition flex items-center gap-1.5"
                  >
                    {isConfirming ? (
                      <span>Processing...</span>
                    ) : (
                      <span>
                        {canSoftDelete
                          ? t("confirm_paid_btn", "पेमेंट पुष्टी करा (Mark as PAID)")
                          : t("submit_request_btn", "विनंती पाठवा (Send Request)")}
                      </span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
