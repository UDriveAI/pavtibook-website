"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/lib/i18n";
import LanguageSelector from "@/components/LanguageSelector";
import DeviceLimitModal from "@/components/DeviceLimitModal";
import { RecaptchaVerifier, ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { LogIn, Phone, KeyRound, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

// Inner component that uses useSearchParams — must be wrapped in Suspense
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/app";

  const { user, loginWithEmail, loginWithGoogle, requestPhoneOtp, confirmPhoneOtp, sessionTerminatedMessage, clearSessionTerminatedMessage } = useAuth();
  const { t } = useLanguage();

  const [authMode, setAuthMode] = useState<"password" | "otp">("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [mobileForOtp, setMobileForOtp] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // If already logged in, redirect to app
  useEffect(() => {
    if (user) {
      router.replace(redirectUrl);
    }
  }, [user, router, redirectUrl]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!identifier.trim()) {
      setErrorMessage(t("enter_valid_email_or_mobile"));
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsLoading(true);
    const result = await loginWithEmail(identifier.trim(), password);
    setIsLoading(false);

    if (!result.success) {
      if (result.error !== "device_limit_reached") {
        setErrorMessage(result.error || "Login failed. Please verify your credentials.");
      }
    } else {
      router.replace(redirectUrl);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    const result = await loginWithGoogle();
    setIsLoading(false);

    if (!result.success) {
      if (result.error !== "device_limit_reached") {
        setErrorMessage(result.error || "Google sign-in failed.");
      }
    } else {
      router.replace(redirectUrl);
    }
  };

  const setupRecaptcha = () => {
    if (!recaptchaVerifierRef.current && typeof window !== "undefined") {
      try {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
          callback: () => {},
        });
      } catch (err) {
        console.warn("[RECAPTCHA] Error creating verifier:", err);
      }
    }
    return recaptchaVerifierRef.current;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const clean = mobileForOtp.trim().replace(/\D/g, "");
    if (clean.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsLoading(true);
    const verifier = setupRecaptcha();
    if (!verifier) {
      setIsLoading(false);
      setErrorMessage("Verification system error. Please refresh the page.");
      return;
    }

    const res = await requestPhoneOtp(clean, verifier);
    setIsLoading(false);

    if (res.success && res.confirmationResult) {
      setConfirmationResult(res.confirmationResult);
      setSuccessMessage(`${t("otp_sent_to")} +91 ${clean.slice(-10)}`);
    } else {
      setErrorMessage(res.error || "Failed to send OTP.");
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        } catch {
          // ignore
        }
      }
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !otpCode.trim()) return;

    setErrorMessage(null);
    setIsLoading(true);
    const res = await confirmPhoneOtp(confirmationResult, otpCode.trim());
    setIsLoading(false);

    if (!res.success) {
      if (res.error !== "device_limit_reached") {
        setErrorMessage(res.error || "Invalid OTP code.");
      }
    } else {
      router.replace(redirectUrl);
    }
  };

  return (
    <div className="min-h-screen bg-cream-light font-sans text-neutral-800 flex flex-col justify-between selection:bg-orange-brand/20 selection:text-maroon-dark">
      {/* Top Bar with Language Selector */}
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

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-3xl shadow-xl border border-maroon/10 p-8 sm:p-10 max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-maroon-dark tracking-tight">
              {t("login_title")}
            </h1>
            <p className="text-sm text-neutral-600 font-medium">
              {t("login_subtitle")}
            </p>
          </div>

          {/* Session Terminated Notice */}
          {sessionTerminatedMessage && (
            <div className="bg-red-50 text-red-800 text-xs p-3.5 rounded-xl border border-red-200 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <span>{sessionTerminatedMessage}</span>
              </div>
              <button
                onClick={clearSessionTerminatedMessage}
                className="text-red-600 font-bold hover:underline shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 text-red-800 text-xs p-3.5 rounded-xl border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 text-green-800 text-xs p-3.5 rounded-xl border border-green-200 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Tab Switcher: Password vs OTP */}
          <div className="flex p-1 bg-cream-light rounded-xl border border-maroon/10 text-xs font-bold text-neutral-600">
            <button
              type="button"
              onClick={() => {
                setAuthMode("password");
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                authMode === "password"
                  ? "bg-maroon-dark text-white shadow-xs"
                  : "hover:text-neutral-900"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{t("use_password")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("otp");
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                authMode === "otp"
                  ? "bg-maroon-dark text-white shadow-xs"
                  : "hover:text-neutral-900"
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{t("use_otp")}</span>
            </button>
          </div>

          {/* Google Sign-In Option */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-neutral-300 rounded-xl font-semibold text-sm text-neutral-700 bg-white hover:bg-neutral-50 transition shadow-2xs hover:shadow-xs disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{t("sign_in_with_google")}</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-neutral-200 w-full" />
            <span className="bg-white px-3 text-xs text-neutral-400 uppercase tracking-wider font-semibold">
              {t("or_continue_with")}
            </span>
          </div>

          {/* Form: Password Mode */}
          {authMode === "password" && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700">
                  {t("mobile_or_email")}
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

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-700">
                    {t("password_label")}
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-orange-brand hover:text-orange-700 transition"
                  >
                    {t("forgot_password")}
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  <span>{t("logging_in")}</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{t("login_btn")}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Form: OTP Mode */}
          {authMode === "otp" && (
            <div className="space-y-4">
              {!confirmationResult ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700">
                      {t("mobile_label")}
                    </label>
                    <div className="flex rounded-xl border border-neutral-300 overflow-hidden focus-within:border-maroon focus-within:ring-2 focus-within:ring-maroon/20 transition">
                      <span className="bg-cream-light px-3.5 py-3 text-sm font-bold text-neutral-600 border-r border-neutral-300">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        value={mobileForOtp}
                        onChange={(e) => setMobileForOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="9876543210"
                        className="w-full px-4 py-3 text-sm font-medium focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div id="recaptcha-container" />

                  <button
                    type="submit"
                    disabled={isLoading || mobileForOtp.length !== 10}
                    className="w-full py-3.5 rounded-xl bg-maroon-dark text-white font-bold text-sm hover:bg-maroon transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <span>{t("sending_otp")}</span> : <span>{t("send_otp")}</span>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-neutral-700">
                        {t("otp_label")}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmationResult(null);
                          setOtpCode("");
                        }}
                        className="text-xs text-orange-brand hover:underline font-semibold"
                      >
                        {t("change_number")}
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder={t("enter_otp_hint")}
                      className="w-full px-4 py-3 text-center tracking-widest text-lg font-bold rounded-xl border border-neutral-300 focus:outline-hidden focus:border-maroon focus:ring-2 focus:ring-maroon/20 transition"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length !== 6}
                    className="w-full py-3.5 rounded-xl bg-maroon-dark text-white font-bold text-sm hover:bg-maroon transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <span>{t("verifying_otp")}</span> : <span>{t("verify_otp")}</span>}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Register & Join Links (Exact Parity with Android login_screen.dart lines 560-605) */}
          <div className="pt-3 text-center text-xs border-t border-neutral-100 space-y-2.5">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-neutral-700 font-medium">Don&apos;t have an account?</span>
              <Link
                href="/register-org"
                className="text-[#8B1E2D] font-bold hover:underline"
              >
                Register Now
              </Link>
            </div>

            <div className="flex items-center justify-center gap-1.5">
              <span className="text-neutral-700 font-medium">Received an invitation?</span>
              <Link
                href="/join"
                className="text-[#F47C20] font-bold hover:underline"
              >
                Activate Account
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-neutral-500 font-medium">
        © {new Date().getFullYear()} PavtiBook. All rights reserved.
      </footer>

      {/* 3-Device Limit Modal */}
      <DeviceLimitModal />
    </div>
  );
}

// Suspense fallback shown while searchParams resolve during SSR/hydration
function LoginFallback() {
  return (
    <div className="min-h-screen bg-cream-light flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-maroon-dark">
        <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
        <span className="text-sm font-semibold">Loading...</span>
      </div>
    </div>
  );
}

// Default export wraps LoginContent in Suspense to satisfy Next.js requirement
// for useSearchParams() usage in App Router pages
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
