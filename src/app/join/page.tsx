"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useOrg, InviteData } from "@/context/OrgContext";
import { useLanguage } from "@/lib/i18n";
import LanguageSelector from "@/components/LanguageSelector";
import { UserPlus, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, KeyRound, Phone, Mail, User, Eye, EyeOff } from "lucide-react";

export default function JoinOrgPage() {
  const router = useRouter();
  const { verifyInvitation, activateInvitation } = useOrg();
  const { t } = useLanguage();

  const [isInviteVerified, setIsInviteVerified] = useState(false);
  const [verifiedInvite, setVerifiedInvite] = useState<InviteData | null>(null);
  const [isExistingAccount, setIsExistingAccount] = useState(false);

  // Phase 1 State
  const [mobileOrEmail, setMobileOrEmail] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Phase 2 State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Phase 1: Verify Invitation
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;
    setErrorMessage(null);

    const input = mobileOrEmail.trim();
    const isEmail = input.includes("@");

    if (isEmail) {
      if (!input.includes(".") || input.length < 5) {
        setErrorMessage("Please enter a valid email address.");
        return;
      }
    } else {
      const cleanMobile = input.replace(/\D/g, "");
      if (cleanMobile.length < 10) {
        setErrorMessage("Please enter a valid 10-digit mobile number or email address.");
        return;
      }
    }

    const cleanCode = activationCode.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      setErrorMessage("Please enter a valid 6-character activation code.");
      return;
    }

    setIsVerifying(true);
    const queryInput = isEmail ? input.toLowerCase() : input.replace(/\D/g, "").slice(-10);
    const res = await verifyInvitation(queryInput, cleanCode);
    setIsVerifying(false);

    if (res.success && res.invite) {
      setVerifiedInvite(res.invite);
      setName(res.invite.name || "");
      setEmail(res.invite.email || (isEmail ? input.toLowerCase() : ""));
      setIsInviteVerified(true);
      setSuccessMessage(`Invitation verified for ${res.invite.name || "Member"}! Please set up your password to activate your account.`);
    } else {
      setErrorMessage(res.error || "Unable to validate invitation.");
    }
  };

  // Phase 2: Activate Member Account
  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isActivating || !verifiedInvite) return;
    setErrorMessage(null);

    if (!isExistingAccount && !name.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsActivating(true);
    const res = await activateInvitation(verifiedInvite, name.trim(), email.trim().toLowerCase(), password);
    setIsActivating(false);

    if (res.success) {
      router.push("/app");
    } else {
      const err = res.error || "Failed to activate member account.";
      if (err.includes("already exists") || err.includes("existing password")) {
        setIsExistingAccount(true);
      }
      setErrorMessage(err);
    }
  };

  const handleBack = () => {
    if (isInviteVerified) {
      setIsInviteVerified(false);
      setIsExistingAccount(false);
      setErrorMessage(null);
      setSuccessMessage(null);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF6E8] flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-100 transition cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Image
            src="/images/logo.png"
            alt="PavtiBook"
            width={120}
            height={32}
            className="h-8 w-auto object-contain"
            priority
          />
        </div>
        <div className="flex items-center gap-3">
          <LanguageSelector />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 sm:px-6 py-8">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F47C20] flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900">
                {isExistingAccount
                  ? t("join_org_card_title", "Join Organization")
                  : t("join_title", "Activate Account & Join")}
              </h1>
              <p className="text-xs text-stone-500">
                {isExistingAccount
                  ? `Joining as ${(verifiedInvite?.role || "member").toUpperCase()} with your existing account`
                  : isInviteVerified
                  ? `Joining as ${(verifiedInvite?.role || "member").toUpperCase()}`
                  : t("join_step1_desc", "Enter your registered Mobile Number and 6-character Activation Code.")}
              </p>
            </div>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* PHASE 1: Verify Invitation */}
          {!isInviteVerified ? (
            <form onSubmit={handleVerify} className="space-y-4">
              {/* Mobile Number or Email */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {t("mobile_or_email", "Mobile Number or Email")} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    {mobileOrEmail.includes("@") ? (
                      <Mail className="w-4 h-4" />
                    ) : (
                      <Phone className="w-4 h-4" />
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    disabled={isVerifying}
                    value={mobileOrEmail}
                    onChange={(e) => setMobileOrEmail(e.target.value)}
                    placeholder={t("mobile_or_email_hint", "Enter 10-digit mobile or registered email")}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-sm text-stone-900"
                  />
                </div>
              </div>

              {/* 6-Character Activation Code */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {t("activation_code_label", "6-character Activation Code *")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    disabled={isVerifying}
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                    placeholder="e.g. A7B9K2"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-sm text-stone-900 font-mono tracking-wider uppercase"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full bg-[#8B1E2D] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#721824] transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{t("validating", "Validating...")}</span>
                    </>
                  ) : (
                    <span>{t("validate_invite_btn", "Validate Invitation")}</span>
                  )}
                </button>
              </div>

              {/* Link back to login */}
              <div className="pt-2 text-center text-xs font-medium text-stone-500">
                <span>{t("already_have_account", "Already have an account?")} </span>
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="text-maroon-dark font-bold hover:underline"
                >
                  {t("login_btn", "Login")}
                </button>
              </div>
            </form>
          ) : (
            /* PHASE 2: Activate Member Account */
            <form onSubmit={handleActivate} className="space-y-4">
              {/* Full Name */}
              {!isExistingAccount && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    {t("full_name_label", "Full Name")} *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required={!isExistingAccount}
                      disabled={isActivating}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-sm text-stone-900"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {t("email_label", "Email Address")} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    disabled={isActivating || isExistingAccount}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="member@example.com"
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-sm text-stone-900 ${
                      isExistingAccount ? "bg-stone-100 text-stone-600 cursor-not-allowed" : ""
                    }`}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {isExistingAccount
                    ? t("existing_account_password_label", "Existing Account Password")
                    : t("password_label", "Set Account Password")}{" "}
                  *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={isActivating}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isExistingAccount ? "Enter existing password" : "At least 6 characters"}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-sm text-stone-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isActivating}
                  className="w-full bg-[#8B1E2D] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#721824] transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isActivating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{t("activating", "Activating...")}</span>
                    </>
                  ) : (
                    <span>
                      {isExistingAccount
                        ? t("join_org_btn", "Join Organization")
                        : t("activate_account_btn", "Activate Account & Log In")}
                    </span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-stone-500 border-t border-stone-200 bg-white/50">
        PavtiBook &copy; {new Date().getFullYear()} &mdash; Traditional Trust. Digital Simplicity.
      </footer>
    </div>
  );
}
