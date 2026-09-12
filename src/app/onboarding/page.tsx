"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { useLanguage } from "@/lib/i18n";
import LanguageSelector from "@/components/LanguageSelector";
import { Building2, UserPlus, ArrowRight, LogOut, RefreshCw } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, activeOrgId, logout } = useAuth();
  const { allOrganizations, isLoadingOrgs } = useOrg();
  const { t } = useLanguage();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    } else if (!authLoading && (activeOrgId || allOrganizations.length > 0)) {
      router.replace("/app");
    }
  }, [user, authLoading, activeOrgId, allOrganizations.length, router]);

  if (authLoading || isLoadingOrgs) {
    return (
      <div className="min-h-screen bg-[#FFF6E8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#8B1E2D] animate-spin" />
          <p className="text-stone-600 font-medium">{t("loading_orgs", "Loading...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF6E8] flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="bg-white border-b border-stone-200 px-4 sm:px-8 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/logo.png"
            alt="PavtiBook"
            width={130}
            height={36}
            className="h-9 w-auto object-contain"
            priority
          />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSelector />
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-[#8B1E2D] px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t("logout_btn", "Logout")}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col justify-center">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
            {t("onboarding_title", "Welcome to PavtiBook")}
          </h1>
          <p className="text-stone-600 text-sm sm:text-base max-w-md mx-auto">
            {t("onboarding_subtitle", "Get started by registering a new organization or joining an existing one.")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto w-full">
          {/* Option 1: Register Organization */}
          <Link
            href="/register-org"
            className="group bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm hover:shadow-md hover:border-[#8B1E2D] transition flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-red-50 text-[#8B1E2D] flex items-center justify-center mb-4 group-hover:bg-[#8B1E2D] group-hover:text-white transition">
                <Building2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-stone-900 mb-2 group-hover:text-[#8B1E2D] transition">
                {t("register_org_card_title", "Register Organization")}
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                {t("register_org_card_desc", "Create a new organization account and become the administrator.")}
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#8B1E2D]">
              <span>{t("create_account_btn", "Create Account & Continue")}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* Option 2: Join Organization */}
          <Link
            href="/join"
            className="group bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm hover:shadow-md hover:border-[#8B1E2D] transition flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#F47C20] flex items-center justify-center mb-4 group-hover:bg-[#F47C20] group-hover:text-white transition">
                <UserPlus className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-stone-900 mb-2 group-hover:text-[#F47C20] transition">
                {t("join_org_card_title", "Join Organization")}
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                {t("join_org_card_desc", "Join an existing organization with an invitation code.")}
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#F47C20]">
              <span>{t("validate_invite_btn", "Validate Invitation")}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-stone-500 border-t border-stone-200 bg-white/50">
        PavtiBook &copy; {new Date().getFullYear()} &mdash; Traditional Trust. Digital Simplicity.
      </footer>
    </div>
  );
}
