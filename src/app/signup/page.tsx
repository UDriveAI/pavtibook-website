"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase-client";
import { provisionWebDeviceSession } from "@/lib/device";
import { useLanguage } from "@/lib/i18n";
import LanguageSelector from "@/components/LanguageSelector";
import { UserPlus, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanMobile = mobile.trim().replace(/\D/g, "");
    if (cleanMobile.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage(t("password_min_length"));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(t("password_mismatch"));
      return;
    }

    setIsLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;

      // Create user profile document in Firestore
      const now = new Date().toISOString();
      const userDocData = {
        id: uid,
        name: name.trim(),
        mobile: cleanMobile,
        email: email.trim(),
        role: "member",
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, "users", uid), userDocData);

      // Provision session
      const idToken = await cred.user.getIdToken();
      await provisionWebDeviceSession(idToken);

      setSuccessMessage(t("account_created_success"));
      setTimeout(() => {
        router.push("/app");
      }, 1000);
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : "Failed to create account. Please verify details.";
      setErrorMessage(msg);
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

      {/* Main Signup Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-3xl shadow-xl border border-maroon/10 p-8 sm:p-10 max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-maroon-dark tracking-tight">
              {t("signup_title")}
            </h1>
            <p className="text-sm text-neutral-600 font-medium">
              {t("signup_subtitle")}
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

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">
                {t("full_name_label")} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("full_name_hint")}
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:outline-hidden focus:border-maroon focus:ring-2 focus:ring-maroon/20 text-sm font-medium transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">
                {t("mobile_label")} *
              </label>
              <div className="flex rounded-xl border border-neutral-300 overflow-hidden focus-within:border-maroon focus-within:ring-2 focus-within:ring-maroon/20 transition">
                <span className="bg-cream-light px-3.5 py-3 text-sm font-bold text-neutral-600 border-r border-neutral-300">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  placeholder="9876543210"
                  className="w-full px-4 py-3 text-sm font-medium focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">
                {t("email_label")} *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:outline-hidden focus:border-maroon focus:ring-2 focus:ring-maroon/20 text-sm font-medium transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">
                {t("password_label")} *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:outline-hidden focus:border-maroon focus:ring-2 focus:ring-maroon/20 text-sm font-medium transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">
                {t("confirm_password_label")} *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:outline-hidden focus:border-maroon focus:ring-2 focus:ring-maroon/20 text-sm font-medium transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-maroon-dark text-white font-bold text-sm hover:bg-maroon transition shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Registering...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{t("signup_title")}</span>
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
              <span>{t("already_have_account")}</span>
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
