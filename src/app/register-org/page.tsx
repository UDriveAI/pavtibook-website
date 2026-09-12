"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { useLanguage } from "@/lib/i18n";
import LanguageSelector from "@/components/LanguageSelector";
import { ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, ChevronRight } from "lucide-react";

const ORG_TYPES = [
  "Ganesh Mandal",
  "Temple",
  "Trust",
  "NGO",
  "Society",
  "Club",
  "Religious Organization",
  "Community Organization",
];

const INDIAN_STATES = [
  "Maharashtra",
  "Gujarat",
  "Karnataka",
  "Goa",
  "Madhya Pradesh",
  "Delhi",
  "Rajasthan",
  "Other",
];

export default function RegisterOrgPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { registerOrganization, updateOnboardingDetails } = useOrg();
  const { t } = useLanguage();

  const [currentStep, setCurrentStep] = useState<0 | 1>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredOrgId, setRegisteredOrgId] = useState<string | null>(null);

  // Step 1 State
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState(ORG_TYPES[0]);
  const [adminName, setAdminName] = useState("");
  const [adminMobile, setAdminMobile] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [useAdminDetailsForOrg, setUseAdminDetailsForOrg] = useState(true);
  const [orgMobile, setOrgMobile] = useState("");
  const [orgEmail, setOrgEmail] = useState("");

  // Step 2 State
  const [upiId, setUpiId] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [selectedState, setSelectedState] = useState(INDIAN_STATES[0]);
  const [pincode, setPincode] = useState("");
  const [regNum, setRegNum] = useState("");

  // Pre-fill user data if already authenticated
  useEffect(() => {
    if (user) {
      if (user.email && !adminEmail) {
        setAdminEmail(user.email);
      }
      if (user.displayName && !adminName) {
        setAdminName(user.displayName);
      } else if (userData?.name && !adminName) {
        setAdminName(userData.name);
      }
      if (user.phoneNumber && !adminMobile) {
        const clean = user.phoneNumber.replace(/\D/g, "");
        setAdminMobile(clean.length >= 10 ? clean.substring(clean.length - 10) : clean);
      } else if (userData?.mobile && !adminMobile) {
        setAdminMobile(userData.mobile);
      }
    }
  }, [user, userData, adminEmail, adminName, adminMobile]);

  // Step 1: Submit Account & Organization Info
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setErrorMessage(null);

    // Validations matching Android RegisterOrgScreen
    if (!orgName.trim()) {
      setErrorMessage("Please enter an organization name.");
      return;
    }
    if (!adminName.trim()) {
      setErrorMessage("Please enter administrator name.");
      return;
    }
    const cleanMobile = adminMobile.replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!adminEmail.includes("@")) {
      setErrorMessage("Please enter a valid admin email address.");
      return;
    }
    if (!user && password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }
    if (!useAdminDetailsForOrg) {
      const cleanOrgMobile = orgMobile.replace(/\D/g, "");
      if (cleanOrgMobile.length < 10) {
        setErrorMessage("Please enter a valid 10-digit official organization mobile number.");
        return;
      }
      if (!orgEmail.includes("@")) {
        setErrorMessage("Please enter a valid official organization email address.");
        return;
      }
    }

    setIsProcessing(true);

    const regData = {
      orgName: orgName.trim(),
      orgType,
      adminName: adminName.trim(),
      adminMobile: cleanMobile.slice(-10),
      adminEmail: adminEmail.trim().toLowerCase(),
      password,
      orgMobile: useAdminDetailsForOrg ? cleanMobile.slice(-10) : orgMobile.trim(),
      orgEmail: useAdminDetailsForOrg ? adminEmail.trim().toLowerCase() : orgEmail.trim().toLowerCase(),
    };

    const res = await registerOrganization(regData);
    setIsProcessing(false);

    if (res.success && res.orgId) {
      setRegisteredOrgId(res.orgId);
      setContactPerson(adminName.trim());
      setCurrentStep(1);
    } else {
      setErrorMessage(res.error || "Account creation failed.");
    }
  };

  // Step 2: Submit Optional Profile Setup
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setErrorMessage(null);

    if (!registeredOrgId) {
      setErrorMessage("Session lost. Please finish setup from Settings.");
      router.push("/app");
      return;
    }

    if (!upiId.trim()) {
      setErrorMessage("Please enter a valid UPI ID for donations.");
      return;
    }
    if (!contactPerson.trim()) {
      setErrorMessage("Please enter contact person name.");
      return;
    }
    if (!address.trim()) {
      setErrorMessage("Please enter address.");
      return;
    }
    if (!city.trim()) {
      setErrorMessage("Please enter city.");
      return;
    }
    if (!pincode.trim()) {
      setErrorMessage("Please enter pincode.");
      return;
    }

    setIsProcessing(true);

    const onboardingData = {
      upiId: upiId.trim(),
      contactPerson: contactPerson.trim(),
      address: address.trim(),
      city: city.trim(),
      state: selectedState,
      pincode: pincode.trim(),
      registrationNumber: regNum.trim() || undefined,
    };

    const res = await updateOnboardingDetails(registeredOrgId, onboardingData);
    setIsProcessing(false);

    if (res.success) {
      router.push("/app");
    } else {
      setErrorMessage(res.error || "Failed to update profile details.");
    }
  };

  const handleSkip = () => {
    router.push("/app");
  };

  return (
    <div className="min-h-screen bg-[#FFF6E8] flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/onboarding" className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-100 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
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
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between mb-6 border-b border-stone-100 pb-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 0 ? "bg-[#8B1E2D] text-white" : "bg-emerald-600 text-white"
                }`}
              >
                {currentStep === 1 ? <CheckCircle2 className="w-4 h-4" /> : "1"}
              </div>
              <span className="text-xs sm:text-sm font-semibold text-stone-900">
                {t("register_org_step1_title", "Step 1: Account Credentials")}
              </span>
            </div>

            <ChevronRight className="w-4 h-4 text-stone-400" />

            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 1 ? "bg-[#8B1E2D] text-white" : "bg-stone-100 text-stone-500"
                }`}
              >
                2
              </div>
              <span className={`text-xs sm:text-sm font-semibold ${currentStep === 1 ? "text-stone-900" : "text-stone-400"}`}>
                {t("register_org_step2_title", "Step 2: Profile Settings")}
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* STEP 1 FORM */}
          {currentStep === 0 && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-[#8B1E2D]">
                  {t("register_org_step1_title", "Step 1: Account Credentials")}
                </h2>
                <p className="text-xs text-stone-500">
                  {t("register_org_step1_desc", "Required fields to register your organization and administrator details.")}
                </p>
              </div>

              {/* Organization Name */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {t("org_name_label", "Organization Name")} *
                </label>
                <input
                  type="text"
                  required
                  disabled={isProcessing}
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Shri Ganesh Utsav Mandal"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-sm text-stone-900"
                />
              </div>

              {/* Organization Type */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {t("org_type_label", "Organization Type")} *
                </label>
                <select
                  disabled={isProcessing}
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-sm text-stone-900 bg-white"
                >
                  {ORG_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Divider for Admin details */}
              <div className="pt-2 border-t border-stone-100">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Administrator Details
                </span>
              </div>

              {/* Admin Name */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {t("admin_name_label", "Admin Name")} *
                </label>
                <input
                  type="text"
                  required
                  disabled={isProcessing}
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-sm text-stone-900"
                />
              </div>

              {/* Admin Mobile */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {t("admin_mobile_label", "Admin Mobile Number")} *
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-stone-300 bg-stone-50 text-stone-500 text-sm font-medium">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    disabled={isProcessing}
                    value={adminMobile}
                    onChange={(e) => setAdminMobile(e.target.value.replace(/\D/g, ""))}
                    placeholder="10-digit mobile"
                    className="w-full px-3.5 py-2.5 rounded-r-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-sm text-stone-900"
                  />
                </div>
              </div>

              {/* Admin Email */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {t("admin_email_label", "Admin Email")} *
                </label>
                <input
                  type="email"
                  required
                  disabled={isProcessing}
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-sm text-stone-900"
                />
              </div>

              {/* Password (if user not authenticated) */}
              {!user && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    {t("password_label", "Sign-in Password")} *
                  </label>
                  <input
                    type="password"
                    required
                    disabled={isProcessing}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-sm text-stone-900"
                  />
                </div>
              )}

              {/* Checkbox: Use Admin details for Org */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAdminDetailsForOrg}
                    onChange={(e) => setUseAdminDetailsForOrg(e.target.checked)}
                    disabled={isProcessing}
                    className="mt-0.5 rounded border-stone-300 text-[#8B1E2D] focus:ring-[#8B1E2D]"
                  />
                  <span className="text-xs font-semibold text-stone-700 select-none">
                    {t("use_admin_details", "Use Admin Details as Official Organization Details")}
                  </span>
                </label>
              </div>

              {/* Optional Org Details if unchecked */}
              {!useAdminDetailsForOrg && (
                <div className="space-y-4 pt-2 border-t border-stone-100">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      {t("org_mobile_label", "Official Organization Mobile *")}
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-stone-300 bg-stone-50 text-stone-500 text-sm font-medium">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        disabled={isProcessing}
                        value={orgMobile}
                        onChange={(e) => setOrgMobile(e.target.value.replace(/\D/g, ""))}
                        placeholder="10-digit mobile"
                        className="w-full px-3.5 py-2.5 rounded-r-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-sm text-stone-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      {t("org_email_label", "Official Organization Email *")}
                    </label>
                    <input
                      type="email"
                      required
                      disabled={isProcessing}
                      value={orgEmail}
                      onChange={(e) => setOrgEmail(e.target.value)}
                      placeholder="org@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-sm text-stone-900"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-[#8B1E2D] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#721824] transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>{t("create_account_btn", "Create Account & Continue")}</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2 FORM (Profile / Optional) */}
          {currentStep === 1 && (
            <form onSubmit={handleStep2Submit} className="space-y-4">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-[#8B1E2D]">
                  {t("register_org_step2_title", "Step 2: Profile Settings (Optional)")}
                </h2>
                <p className="text-xs text-stone-500">
                  {t("register_org_step2_desc", "Complete your organization profile setup for billing and receipt templates, or skip to finish later.")}
                </p>
              </div>

              {/* UPI ID */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {t("upi_id_label", "Organization UPI ID")} *
                </label>
                <input
                  type="text"
                  required
                  disabled={isProcessing}
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. mandal@okhdfcbank"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-sm text-stone-900"
                />
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {t("contact_person_label", "Contact Person")} *
                </label>
                <input
                  type="text"
                  required
                  disabled={isProcessing}
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Primary contact name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-sm text-stone-900"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {t("address_label", "Address")} *
                </label>
                <input
                  type="text"
                  required
                  disabled={isProcessing}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street / Area / Landmark"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-sm text-stone-900"
                />
              </div>

              {/* City and State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    {t("city_label", "City")} *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isProcessing}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City / Village"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-sm text-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    {t("state_label", "State")} *
                  </label>
                  <select
                    disabled={isProcessing}
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-sm text-stone-900 bg-white"
                  >
                    {INDIAN_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pincode and Registration Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    {t("pincode_label", "Pincode")} *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    disabled={isProcessing}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                    placeholder="6-digit PIN"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-sm text-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    {t("reg_num_label", "Registration / Trust No. (Optional)")}
                  </label>
                  <input
                    type="text"
                    disabled={isProcessing}
                    value={regNum}
                    onChange={(e) => setRegNum(e.target.value)}
                    placeholder="e.g. E-12345/Pune"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D] focus:border-transparent text-sm text-stone-900"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 space-y-2.5">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-[#8B1E2D] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#721824] transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{t("save_profile_btn", "Save & Finish Setup")}</span>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleSkip}
                  className="w-full py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-stone-600 hover:text-stone-900 border border-stone-200 hover:bg-stone-50 transition"
                >
                  {t("skip_for_now", "Skip for Now")}
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
