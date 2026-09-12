"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useOrg, UserMembership } from "@/context/OrgContext";
import { useLanguage } from "@/lib/i18n";
import {
  Building2,
  RefreshCw,
  ArrowRight,
  PlusCircle,
  UserPlus,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function SelectOrgPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { allOrganizations, isLoadingOrgs, refreshOrgs, switchOrganization, activeOrgId } = useOrg();
  const { t } = useLanguage();

  const [isSwitching, setIsSwitching] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // Android parity: Auto-select if only 1 organization exists and user enters selector
  useEffect(() => {
    if (!isLoadingOrgs && allOrganizations.length === 1 && !isSwitching) {
      const singleOrg = allOrganizations[0];
      if (activeOrgId !== singleOrg.organizationId) {
        setIsSwitching(singleOrg.organizationId);
        switchOrganization(singleOrg.organizationId).then((res) => {
          if (res.success) {
            router.replace("/app");
          }
        });
      }
    }
  }, [isLoadingOrgs, allOrganizations, activeOrgId, isSwitching, switchOrganization, router]);

  const handleSelectOrg = async (membership: UserMembership) => {
    if (isSwitching) return;
    setErrorMessage(null);
    setIsSwitching(membership.organizationId);

    const res = await switchOrganization(membership.organizationId);
    if (res.success) {
      router.push("/app");
    } else {
      setIsSwitching(null);
      setErrorMessage(res.error || "Failed to switch organization.");
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role.toLowerCase()) {
      case "owner":
      case "president":
        return "bg-red-50 text-[#8B1E2D] border-red-200";
      case "treasurer":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
  };

  if (authLoading || isLoadingOrgs) {
    return (
      <div className="min-h-screen bg-[#FFF6E8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#8B1E2D] animate-spin" />
          <p className="text-stone-600 font-medium text-sm">
            {t("loading_orgs", "Loading organizations...")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF6E8] flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="bg-white border-b border-stone-200 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base sm:text-lg font-bold text-stone-900">
            {t("select_org_title", "Select Organization")}
          </h1>
        </div>
        <button
          onClick={() => refreshOrgs()}
          title={t("refresh_orgs", "Refresh Organizations")}
          className="p-2 text-stone-600 hover:text-[#8B1E2D] rounded-lg hover:bg-stone-100 transition flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">{t("refresh_orgs", "Refresh")}</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Empty State: 0 Memberships */}
        {allOrganizations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              {t("no_orgs_found", "No Organization Memberships Found")}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto mb-6">
              {t(
                "no_orgs_desc",
                "Register a new organization or ask an administrator to send you an invitation."
              )}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register-org"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#8B1E2D] text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-[#721824] transition shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t("register_org_card_title", "Register Organization")}</span>
              </Link>
              <Link
                href="/join"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-stone-300 text-stone-700 rounded-xl font-bold text-xs sm:text-sm hover:bg-stone-50 transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>{t("join_org_card_title", "Join Organization")}</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Multi-Organization List */
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-[#8B1E2D] flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-stone-900">
                  {t("your_organizations", "Your Organizations")}
                </h2>
                <p className="text-xs text-stone-500">
                  {t("select_org_desc", "Select an organization to open its dashboard")} ({allOrganizations.length} found)
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {allOrganizations.map((item) => {
                const isActive = activeOrgId === item.organizationId;
                const isCurrentSwitching = isSwitching === item.organizationId;

                return (
                  <button
                    key={item.membershipId + item.organizationId}
                    onClick={() => handleSelectOrg(item)}
                    disabled={isSwitching !== null}
                    className={`w-full text-left bg-white rounded-2xl border p-4 sm:p-5 shadow-sm hover:shadow-md transition flex items-center justify-between gap-4 ${
                      isActive ? "border-[#8B1E2D] ring-2 ring-red-100" : "border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-stone-100 text-[#8B1E2D] flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-stone-900 truncate">
                            {item.organizationName}
                          </h3>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getRoleBadgeClass(
                              item.role
                            )}`}
                          >
                            {item.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center text-stone-400">
                      {isCurrentSwitching ? (
                        <RefreshCw className="w-5 h-5 text-[#8B1E2D] animate-spin" />
                      ) : (
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Actions Footer */}
            <div className="pt-4 flex items-center justify-center gap-4 text-xs font-semibold text-stone-500">
              <Link href="/register-org" className="hover:text-[#8B1E2D] transition flex items-center gap-1">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ {t("register_org_card_title", "Register Organization")}</span>
              </Link>
              <span>&bull;</span>
              <Link href="/join" className="hover:text-[#F47C20] transition flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ {t("join_org_card_title", "Join Organization")}</span>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-stone-500 border-t border-stone-200 bg-white/50">
        PavtiBook &copy; {new Date().getFullYear()} &mdash; Traditional Trust. Digital Simplicity.
      </footer>
    </div>
  );
}
