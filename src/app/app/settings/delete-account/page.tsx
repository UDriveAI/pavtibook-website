"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { signOut } from "firebase/auth";
import { auth, functions } from "@/lib/firebase-client";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/lib/i18n";

export default function DeleteAccountPage() {
  const router = useRouter();
  const { userData, activeRole } = useAuth();
  const { t } = useLanguage();

  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSoftwareOwner =
    userData?.isSoftwareOwner === true ||
    userData?.is_software_owner === true ||
    userData?.role === "software_owner" ||
    userData?.role === "superadmin";

  const isOwner = activeRole === "owner";

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmInput.trim().toUpperCase() !== "DELETE") {
      setErrorMessage("Please type DELETE in capital letters to confirm.");
      return;
    }

    if (isSoftwareOwner) {
      setErrorMessage("Software Owner / Founder accounts cannot be deleted through this in-app flow.");
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const deleteFn = httpsCallable<Record<string, never>, { success: boolean; message?: string }>(
        functions,
        "deleteAccount"
      );
      const res = await deleteFn({});

      if (res.data?.success) {
        await signOut(auth);
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {
          // ignore
        }
        router.push("/login?deleted=true");
      } else {
        setErrorMessage(res.data?.message || "Failed to delete account. Please try again.");
      }
    } catch (err: unknown) {
      console.error("Account deletion failed:", err);
      let msg = "An unexpected error occurred.";
      if (err instanceof Error) {
        msg = err.message;
        if (msg.includes("OWNER_MUST_TRANSFER_OWNERSHIP")) {
          msg = "You are the owner of an active organization with financial or member records. Please transfer ownership or archive the organization before deleting your account.";
        } else if (msg.includes("permission-denied")) {
          msg = "Software Owner / Founder accounts cannot be deleted through this in-app flow.";
        }
      }
      setErrorMessage(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 space-y-6 pb-20">
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
          <h1 className="text-2xl font-black text-red-600">{t("delete_account_title")}</h1>
          <p className="text-xs text-gray-500">Irreversible personal account and profile removal</p>
        </div>
      </div>

      {isSoftwareOwner ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Account Protected
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Software Owner and founder accounts are protected from in-app automated deletion to preserve regulatory compliance and administrative continuity.
          </p>
          <button
            onClick={() => router.push("/app/settings")}
            className="px-4 py-2 bg-amber-800 text-white rounded-xl text-xs font-bold hover:bg-amber-900 transition"
          >
            Return to Settings
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-xs space-y-5">
          <div className="p-4 bg-red-50 border border-red-200/80 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Permanent Action Warning
            </div>
            <p className="text-xs text-red-700 leading-relaxed">
              Deleting your account will permanently delete your user login, personal profile, device tokens, and remove your memberships.
            </p>
            {isOwner && (
              <p className="text-xs text-red-900 font-bold bg-white/70 p-2.5 rounded-lg border border-red-200">
                Note: Since you are an Organization Owner, if your organization contains receipts, donors, or other active members, you must first transfer ownership before you can delete your account.
              </p>
            )}
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-red-100 border border-red-300 rounded-xl text-xs font-bold text-red-900">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleDelete} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Type <span className="font-mono text-red-600 font-black">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500 font-mono uppercase"
                disabled={isDeleting}
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDeleting || confirmInput.trim().toUpperCase() !== "DELETE"}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition disabled:opacity-40 shadow-xs flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting Account...</span>
                  </>
                ) : (
                  <span>Permanently Delete My Account</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
