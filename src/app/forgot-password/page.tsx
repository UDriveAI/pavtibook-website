"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { resolveMobileToEmail } from "@/lib/auth-helpers";
import { useLanguage } from "@/lib/i18n";
import LanguageSelector from "@/components/LanguageSelector";
import { KeyRound, AlertCircle, CheckCircle2, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();

  const [identifier, setIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const val = identifier.trim();
    if (!val) {
      setErrorMessage(t("enter_valid_email_or_mobile"));
      return;
    }

    setIsLoading(true);
    let targetEmail = val;

    // Check if input is a 10-digit mobile number
    const cleanMobile = val.replace(/\D/g, "");
    if (cleanMobile.length === 10 && !val.includes("@")) {
      const resolved = await resolveMobileToEmail(cleanMobile);
      if (resolved) {
        targetEmail = resolved;
      } else {
        // Obfuscated generic message to prevent enumeration, matching Android
        setIsLoading(false);
        setSuccessMessage(t("reset_email_sent"));
        return;
      }
    }

    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setIsLoading(false);
      setSuccessMessage(t("reset_email_sent"));
    } catch {
      setIsLoading(false);
      // Even if user not found, show standard message to prevent account enumeration
      setSuccessMessage(t("reset_email_sent"));
    }
  };

  return (
    <div className="min-h-screen bg-cream-light font-sans text-neutral-800 flex flex-col justify-between selection:bg-orange-brand/20 selection:text-maroon-dark">
      {/* Top Bar */}
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/Pavati-Book-Logo-01.png"
            alt="PavtiBook Logo"
            width={140}
            height={40}
            className="h-9 w-auto object-contain"
            priority
          />
        </Link>
        <LanguageSelector />
      </header>

      {/* Main Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-3xl shadow-xl border border-maroon/10 p-8 sm:p-10 max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-2">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-maroon-dark tracking-tight">
              {t("forgot_password_title")}
            </h1>
            <p className="text-sm text-neutral-600 font-medium leading-relaxed">
              {t("forgot_password_subtitle")}
            </p>
          </div>

          {errorMessage && (
            <div className="bg-red-50 text-red-800 text-xs p-3.5 rounded-xl border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 text-green-800 text-xs p-3.5 rounded-xl border border-green-200 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">
                {t("mobile_or_email")} *
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t("mobile_or_email_hint")}
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:outline-hidden focus:border-maroon focus:ring-2 focus:ring-maroon/20 text-sm font-medium transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-maroon-dark text-white font-bold text-sm hover:bg-maroon transition shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Sending...</span>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>{t("send_reset_link")}</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-xs font-medium text-neutral-600 border-t border-neutral-100">
            <Link
              href="/login"
              className="text-maroon-dark font-bold hover:underline inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t("back_to_login")}</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-neutral-500 font-medium">
        © {new Date().getFullYear()} PavtiBook. All rights reserved.
      </footer>
    </div>
  );
}
