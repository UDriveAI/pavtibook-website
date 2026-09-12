"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage, Language } from "@/lib/i18n";
import { useCollector } from "@/context/CollectorContext";
import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const { activeRole, userData } = useAuth();
  const {
    isCollectorMode,
    setIsCollectorMode,
    rememberSelections,
    setRememberSelections,
    autoNext,
    setAutoNext,
  } = useCollector();

  const isOwnerOrAdmin = activeRole === "owner" || activeRole === "admin";
  const isSoftwareOwner =
    userData?.isSoftwareOwner === true ||
    (userData as Record<string,unknown>)?.is_software_owner === true ||
    userData?.role === "software_owner" ||
    userData?.role === "superadmin";

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6 pb-20">
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
          <h1 className="text-2xl font-black text-gray-900">{t("action_admin_settings")}</h1>
          <p className="text-xs text-gray-500">Configure receipt designs, subscriptions, devices, and preferences</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 shadow-xs overflow-hidden divide-y divide-gray-100">
        {isOwnerOrAdmin && (
          <Link
            href="/app/settings/customization"
            className="p-4 flex items-center justify-between hover:bg-gray-50 transition group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#8B1E2D]/10 text-[#8B1E2D] flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm group-hover:text-[#8B1E2D] transition">
                  {t("customization_title")}
                </h3>
                <p className="text-xs text-gray-500">Logo, stamp, committee signatures, and traditional layout</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}

        <Link
          href="/app/subscription"
          className="p-4 flex items-center justify-between hover:bg-gray-50 transition group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm group-hover:text-[#8B1E2D] transition">
                {t("nav_subscription")}
              </h3>
              <p className="text-xs text-gray-500">Plan entitlements, quotas, upgrade, and payment history</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link
          href="/app/settings/devices"
          className="p-4 flex items-center justify-between hover:bg-gray-50 transition group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm group-hover:text-[#8B1E2D] transition">
                {t("devices_title")}
              </h3>
              <p className="text-xs text-gray-500">Manage 3-device sessions, identify active logins, and remote logout</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link
          href="/app/settings/whatsapp-logs"
          className="p-4 flex items-center justify-between hover:bg-gray-50 transition group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm group-hover:text-[#8B1E2D] transition">
                {t("whatsapp_logs_title")}
              </h3>
              <p className="text-xs text-gray-500">View real-time delivery status, error logs, and retry receipts</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link
          href="/app/smart-qr"
          className="p-4 flex items-center justify-between hover:bg-gray-50 transition group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm group-hover:text-[#8B1E2D] transition">
                {t("nav_smart_qr", "Smart Donation QR")}
              </h3>
              <p className="text-xs text-gray-500">UPI QR Standee generator, print, download, and Early Access registration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-orange-600 bg-orange-100 border border-orange-200 px-1.5 py-0.5 rounded-full">LIVE</span>
            <svg className="w-5 h-5 text-gray-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        {isSoftwareOwner && (
          <Link
            href="/app/founder"
            className="p-4 flex items-center justify-between hover:bg-gray-50 transition group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#8B1E2D]/10 text-[#8B1E2D] flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm group-hover:text-[#8B1E2D] transition">
                  {t("nav_founder", "Founder Dashboard")}
                </h3>
                <p className="text-xs text-gray-500">SaaS admin — organizations, revenue, Smart QR leads, and campaigns</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#8B1E2D] bg-[#8B1E2D]/10 border border-[#8B1E2D]/20 px-1.5 py-0.5 rounded-full">OWNER</span>
              <svg className="w-5 h-5 text-gray-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">{t("collector_mode_settings_title")}</h2>
              <p className="text-xs text-gray-500">{t("collector_mode_settings_desc")}</p>
            </div>
          </div>
          <button
            onClick={() => setIsCollectorMode(!isCollectorMode)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
              isCollectorMode ? "bg-[#8B1E2D]" : "bg-gray-300"
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                isCollectorMode ? "translate-x-6" : ""
              }`}
            />
          </button>
        </div>

        {isCollectorMode && (
          <div className="pt-3 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-700 font-medium">{t("collector_remember_selections")}</span>
              <input
                type="checkbox"
                checked={rememberSelections}
                onChange={(e) => setRememberSelections(e.target.checked)}
                className="rounded text-[#8B1E2D] focus:ring-[#8B1E2D]"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-700 font-medium">{t("collector_auto_next")}</span>
              <input
                type="checkbox"
                checked={autoNext}
                onChange={(e) => setAutoNext(e.target.checked)}
                className="rounded text-[#8B1E2D] focus:ring-[#8B1E2D]"
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-xs space-y-3">
        <h2 className="font-bold text-gray-900 text-sm">{t("language")}</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "mr", label: "मराठी" },
            { id: "hi", label: "हिंदी" },
            { id: "en", label: "English" },
          ].map((lang) => (
            <button
              key={lang.id}
              onClick={() => setLanguage(lang.id as Language)}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                language === lang.id
                  ? "border-[#8B1E2D] bg-[#8B1E2D] text-white shadow-xs"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-red-50/50 rounded-2xl p-5 border border-red-200/70 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-red-900 text-sm">{t("delete_account_title")}</h2>
            <p className="text-xs text-red-700">Permanently delete your account and personal authentication profile</p>
          </div>
          <Link
            href="/app/settings/delete-account"
            className="px-3.5 py-1.5 rounded-xl border border-red-300 text-red-600 bg-white hover:bg-red-50 text-xs font-bold transition shadow-2xs"
          >
            Manage
          </Link>
        </div>
      </div>
    </div>
  );
}
