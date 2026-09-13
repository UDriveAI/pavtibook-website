"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { useLanguage } from "@/lib/i18n";
import LanguageSelector from "@/components/LanguageSelector";
import { LogOut, UserCheck, RefreshCw, Building2, Repeat } from "lucide-react";

export default function AppProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userData, activeOrgData, activeRole, isLoading, logout } = useAuth();
  const { allOrganizations, isLoadingOrgs, activeOrg, activeRole: orgRole } = useOrg();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login?redirect=/app");
    } else if (
      !isLoading &&
      !isLoadingOrgs &&
      user &&
      !activeOrg &&
      !activeOrgData &&
      allOrganizations.length === 0 &&
      pathname !== "/app/select-org"
    ) {
      router.replace("/onboarding");
    }
  }, [user, isLoading, isLoadingOrgs, activeOrg, activeOrgData, allOrganizations.length, pathname, router]);

  if (isLoading || (isLoadingOrgs && !activeOrg && !activeOrgData)) {
    return (
      <div className="min-h-screen bg-cream-light flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-3xl border border-maroon/10 shadow-lg max-w-xs w-full">
          <Image
            src="/images/Pavati-Book-Logo-01.png"
            alt="PavtiBook Logo"
            width={160}
            height={45}
            className="h-10 w-auto object-contain"
            priority
          />
          <div className="flex items-center gap-2 text-sm text-maroon-dark font-semibold">
            <RefreshCw className="w-4 h-4 animate-spin text-orange-brand" />
            <span>Verifying session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  const displayOrg = activeOrg || activeOrgData;
  const displayRole = orgRole || activeRole;

  return (
    <div className="min-h-screen bg-cream-light font-sans text-neutral-800 flex flex-col">
      {/* Top Application Header */}
      <header className="bg-white border-b border-maroon/10 shadow-2xs sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/app" className="flex items-center gap-2">
              <Image
                src="/images/Pavati-Book-Logo-01.png"
                alt="PavtiBook Logo"
                width={130}
                height={36}
                className="h-8 w-auto object-contain"
                priority
              />
            </Link>

            {displayOrg ? (
              <Link
                href="/app/select-org"
                title={t("switch_org", "Switch Organization")}
                className="hidden sm:flex items-center gap-2 px-3 py-1 bg-cream-light hover:bg-white rounded-full border border-maroon/10 hover:border-maroon/30 text-xs font-bold text-maroon-dark transition group"
              >
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="truncate max-w-[180px]">{displayOrg.name || "My Organization"}</span>
                <span className="uppercase text-[10px] bg-maroon-dark text-white px-2 py-0.5 rounded-full">
                  {displayRole}
                </span>
                <Repeat className="w-3 h-3 text-stone-400 group-hover:text-maroon transition" />
              </Link>
            ) : (
              <Link
                href="/app/select-org"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 rounded-full border border-amber-200 text-xs font-bold text-amber-800 transition"
              >
                <Building2 className="w-3.5 h-3.5 text-amber-700" />
                <span>{t("select_org_title", "Select Organization")}</span>
              </Link>
            )}
          </div>

          {/* Desktop Navigation Links (Parity with Android Drawer core routes) */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link
              href="/app"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                pathname === "/app"
                  ? "bg-[#8B1E2D] text-white shadow-2xs"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              {t("nav_dashboard", "Dashboard")}
            </Link>
            <Link
              href="/app/create-receipt"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                pathname === "/app/create-receipt"
                  ? "bg-[#8B1E2D] text-white shadow-2xs"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              + {t("action_add_receipt", "New Receipt")}
            </Link>
            <Link
              href="/app/receipt-history"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                pathname.startsWith("/app/receipt") && pathname !== "/app/create-receipt"
                  ? "bg-[#8B1E2D] text-white shadow-2xs"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              {t("action_history", "Receipts")}
            </Link>
            <Link
              href="/app/ledger"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                pathname === "/app/ledger"
                  ? "bg-[#8B1E2D] text-white shadow-2xs"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              {t("ledger_title", "Ledger")}
            </Link>
            <Link
              href="/app/expense-history"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                pathname.startsWith("/app/expense")
                  ? "bg-[#8B1E2D] text-white shadow-2xs"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              {t("expense_management", "Expenses")}
            </Link>
            <Link
              href="/app/settings"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                pathname.startsWith("/app/settings")
                  ? "bg-[#8B1E2D] text-white shadow-2xs"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              {t("action_admin_settings", "Settings")}
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/app/select-org"
              title={t("switch_org", "Switch Organization")}
              className="sm:hidden p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition"
            >
              <Building2 className="w-4 h-4 text-maroon" />
            </Link>

            <LanguageSelector />

            <div className="hidden md:flex items-center gap-2 text-xs font-medium text-neutral-600 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200">
              <UserCheck className="w-3.5 h-3.5 text-maroon" />
              <span className="font-semibold text-neutral-800 truncate max-w-[150px]">
                {userData?.name || user.email || user.phoneNumber || "Member"}
              </span>
            </div>

            <button
              onClick={() => logout()}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t("logout_btn")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-maroon/10 bg-white/50 text-center text-xs text-neutral-500 font-medium">
        PavtiBook Web Application · Phase 1 Milestone 2 Organization Foundation · Project: pavtibook-7251a
      </footer>
    </div>
  );
}
