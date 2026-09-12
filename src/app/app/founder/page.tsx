"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase-client";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/lib/i18n";

// ─── Constants ────────────────────────────────────────────────────────────────
const PRODUCTION_LAUNCH_BASELINE = new Date("2026-08-25T05:00:00.000Z");

const PLAN_LABELS: Record<string, string> = {
  professional_monthly: "Professional Monthly",
  professional_yearly: "Professional Yearly",
  premium_monthly: "Premium Monthly",
  premium_yearly: "Premium Yearly",
  free: "Free",
  free_trial: "Free (Trial)",
  monthly: "Professional Monthly",
  yearly: "Professional Yearly",
  "": "Free",
};

const PLAN_TIER: Record<string, string> = {
  professional_monthly: "professional",
  professional_yearly: "professional",
  premium_monthly: "premium",
  premium_yearly: "premium",
  monthly: "professional",
  yearly: "professional",
  free: "free",
  free_trial: "free",
  "": "free",
};

const AUDIENCE_OPTIONS = [
  { value: "all_customers", label: "All Customers (All Active Devices)" },
  { value: "free_users", label: "Free / Trial Plan Users" },
  { value: "pro_users", label: "Professional Plan Users" },
  { value: "premium_users", label: "Premium Plan Users" },
  { value: "org_owners", label: "Organization Owners Only" },
  { value: "active_users", label: "Active Users (Last 30 Days)" },
  { value: "inactive_users", label: "Inactive / Dormant Users" },
  { value: "specific_org", label: "Specific Organization" },
];

const DESTINATION_ROUTES = [
  { value: "/dashboard", label: "Dashboard" },
  { value: "/subscription", label: "Plans & Upgrade" },
  { value: "/smart_donation_qr", label: "Smart Donation QR" },
  { value: "/receipt_customize", label: "Receipt Customization" },
  { value: "/team", label: "Team Management" },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrgItem {
  id: string;
  name: string;
  type: string;
  city: string;
  state: string;
  plan: string;
  planLabel: string;
  tier: string;
  subscriptionStatus: string;
  hasSubscriptionDoc: boolean;
  createdAt?: Date;
  receiptsUsed: number;
  hasSmartQrInterest: boolean;
  isPreLaunchTest: boolean;
}

interface SubItem {
  orgId: string;
  orgName: string;
  plan: string;
  planLabel: string;
  tier: string;
  billingPeriod: string;
  status: string;
  renewalDate: string;
  startDate: string;
  paymentProvider: string;
  transactionId: string;
  hasSubscriptionDoc: boolean;
  isPreLaunchTest: boolean;
  amount: number;
}

interface TxItem {
  id: string;
  orgId: string;
  orgName: string;
  oldPlan: string;
  newPlan: string;
  newPlanLabel: string;
  amountPaid: number;
  activatedAt?: Date;
  status: string;
  transactionId: string;
  operatorName: string;
  isPreLaunchTest: boolean;
}

interface SmartQrLead {
  id: string;
  organizationName: string;
  organizationType: string;
  userName: string;
  mobile: string;
  email: string;
  city: string;
  state: string;
  useCase: string;
  status: string;
  notifyWhenAvailable: boolean;
  interestedAt?: Date;
}

interface ActivityItem {
  id: string;
  orgId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  timestamp?: Date;
  isPreLaunchTest: boolean;
}

interface AlertItem {
  type: string;
  title: string;
  description: string;
  orgId: string;
  timestamp: Date;
  severity: string;
}

interface OverviewMetrics {
  totalOrganizations: number;
  activeOrganizations: number;
  newOrgsThisMonth: number;
  totalSubscriptions: number;
  freeSubscriptions: number;
  professionalSubscriptions: number;
  premiumSubscriptions: number;
  monthlySubscribers: number;
  annualSubscribers: number;
  totalRevenueAllTime: number;
  totalSuccessfulPayments: number;
  totalReceiptsCount: number;
  totalDonorsCount: number;
  smartQrViewed: number;
  smartQrOpened: number;
  smartQrInterestClicked: number;
  smartQrFormStarted: number;
  smartQrLeads: number;
  smartQrConversionRate: number;
}

interface CampaignItem {
  id: string;
  title: string;
  message: string;
  audienceType: string;
  status: string;
  targetCount: number;
  successCount: number;
  failureCount: number;
  createdAt?: Date;
  createdByName: string;
  destinationRoute: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseDate(raw: unknown): Date | undefined {
  if (!raw) return undefined;
  if (raw && typeof raw === "object" && "toDate" in raw && typeof (raw as { toDate: () => Date }).toDate === "function") {
    return (raw as { toDate: () => Date }).toDate();
  }
  if (raw instanceof Date) return raw;
  if (typeof raw === "string") return new Date(raw) || undefined;
  return undefined;
}

function sanitizeActivityDetails(details: string): string {
  // Redact PII and secrets matching Android sanitizeActivityDetails
  return details
    .replace(/\b\d{10}\b/g, "***mobile***")
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "***email***")
    .replace(/pay_\w+/g, "***pay_id***")
    .replace(/rzp_\w+/g, "***rzp_key***")
    .replace(/sk_\w+/g, "***secret***");
}

function formatAmount(amt: number): string {
  return `₹${amt.toLocaleString("en-IN")}`;
}

function formatDate(d?: Date): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function isPreLaunch(d?: Date): boolean {
  if (!d) return false;
  return d < PRODUCTION_LAUNCH_BASELINE;
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  sub,
  color = "#8B1E2D",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-xs">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-black mt-1" style={{ color }}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Plan Badge ───────────────────────────────────────────────────────────────
function PlanBadge({ tier, label }: { tier: string; label: string }) {
  const colors: Record<string, string> = {
    premium: "bg-purple-100 text-purple-700 border-purple-200",
    professional: "bg-amber-100 text-amber-700 border-amber-200",
    free: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
        colors[tier] || colors.free
      }`}
    >
      {label}
    </span>
  );
}

// ─── Pre-Launch Tag ───────────────────────────────────────────────────────────
function PreLaunchTag() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-600 border border-orange-200">
      PRE-LAUNCH TEST
    </span>
  );
}

// ─── Access Denied Screen ─────────────────────────────────────────────────────
function AccessDeniedScreen() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 className="text-xl font-black text-gray-900 mb-2">Founder & Software Owner Access Only</h1>
      <p className="text-sm text-gray-500 max-w-sm mb-6">
        This dashboard is restricted to Software Owners and Super-Admins. Contact the platform founder for access.
      </p>
      <button
        onClick={() => router.back()}
        className="px-5 py-2.5 rounded-xl bg-[#8B1E2D] text-white text-sm font-bold"
      >
        Go Back
      </button>
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────
function OverviewTab({
  metrics,
  productionOnly,
  setProductionOnly,
  onRefresh,
  isLoading,
}: {
  metrics: OverviewMetrics | null;
  productionOnly: boolean;
  setProductionOnly: (v: boolean) => void;
  onRefresh: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-5">
      {/* Production filter */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 p-3 shadow-xs">
        <div>
          <p className="text-xs font-bold text-gray-800">Production Data Only</p>
          <p className="text-[10px] text-gray-400">
            Filters data created after {PRODUCTION_LAUNCH_BASELINE.toLocaleDateString("en-IN")} (Google Play launch)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setProductionOnly(!productionOnly)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
              productionOnly ? "bg-[#8B1E2D]" : "bg-gray-300"
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow transform transition ${
                productionOnly ? "translate-x-5" : ""
              }`}
            />
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
          >
            <svg
              className={`w-4 h-4 text-gray-500 ${isLoading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {metrics ? (
        <>
          {/* Organizations */}
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Organizations</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MetricCard label="Total Organizations" value={metrics.totalOrganizations} />
              <MetricCard label="Active Organizations" value={metrics.activeOrganizations} color="#16a34a" />
              <MetricCard label="New This Month" value={metrics.newOrgsThisMonth} color="#2563eb" />
            </div>
          </div>

          {/* Subscriptions */}
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Subscriptions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard label="Total Paid" value={metrics.totalSubscriptions} />
              <MetricCard label="Free" value={metrics.freeSubscriptions} color="#6b7280" />
              <MetricCard label="Professional" value={metrics.professionalSubscriptions} color="#d97706" />
              <MetricCard label="Premium" value={metrics.premiumSubscriptions} color="#7c3aed" />
            </div>
          </div>

          {/* Revenue */}
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Revenue</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MetricCard label="Total Revenue (All-Time)" value={formatAmount(metrics.totalRevenueAllTime)} />
              <MetricCard label="Successful Payments" value={metrics.totalSuccessfulPayments} color="#16a34a" />
              <MetricCard label="Total Receipts" value={metrics.totalReceiptsCount} color="#2563eb" />
            </div>
          </div>

          {/* Smart QR Funnel */}
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Smart QR Funnel</h2>
            <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="divide-y divide-gray-50">
                {[
                  { label: "Page Views", value: metrics.smartQrViewed, icon: "👁️" },
                  { label: "Opened Smart QR", value: metrics.smartQrOpened, icon: "📱" },
                  { label: "Interest Clicked", value: metrics.smartQrInterestClicked, icon: "🖱️" },
                  { label: "Forms Started", value: metrics.smartQrFormStarted, icon: "📝" },
                  { label: "Leads Completed", value: metrics.smartQrLeads, icon: "✅" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-gray-600 flex items-center gap-2">
                      <span>{row.icon}</span>
                      {row.label}
                    </span>
                    <span className="text-sm font-bold text-[#8B1E2D]">{row.value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#8B1E2D]/5">
                  <span className="text-xs font-bold text-[#8B1E2D] flex items-center gap-2">
                    <span>📊</span>
                    Conversion Rate (View → Lead)
                  </span>
                  <span className="text-sm font-black text-[#8B1E2D]">
                    {metrics.smartQrConversionRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#8B1E2D]/20 border-t-[#8B1E2D] rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// ─── Tab: Organizations ────────────────────────────────────────────────────────
function OrganizationsTab({
  orgs,
  productionOnly,
}: {
  orgs: OrgItem[];
  productionOnly: boolean;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [planFilter, setPlanFilter] = useState("All");
  const [sort, setSort] = useState("A-Z");

  const filtered = orgs
    .filter((o) => !productionOnly || !o.isPreLaunchTest)
    .filter((o) => !search || o.name.toLowerCase().includes(search.toLowerCase()))
    .filter((o) => typeFilter === "All" || o.type === typeFilter)
    .filter((o) => planFilter === "All" || o.tier === planFilter.toLowerCase())
    .sort((a, b) => {
      if (sort === "A-Z") return a.name.localeCompare(b.name);
      if (sort === "Z-A") return b.name.localeCompare(a.name);
      if (sort === "Receipts") return b.receiptsUsed - a.receiptsUsed;
      return 0;
    });

  const orgTypes = ["All", ...Array.from(new Set(orgs.map((o) => o.type).filter(Boolean)))];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/30"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {orgTypes.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {["All", "Free", "Professional", "Premium"].map((p) => <option key={p}>{p}</option>)}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {["A-Z", "Z-A", "Receipts"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <p className="text-xs text-gray-400">{filtered.length} organizations</p>
      <div className="space-y-2">
        {filtered.map((org) => (
          <div key={org.id} className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-gray-900 truncate">{org.name}</p>
                  <PlanBadge tier={org.tier} label={org.planLabel} />
                  {org.isPreLaunchTest && <PreLaunchTag />}
                  {org.hasSmartQrInterest && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-1.5 py-0.5 font-bold">
                      🚀 Smart QR Interest
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {org.type} • {org.city}{org.state ? `, ${org.state}` : ""}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-[#8B1E2D]">{org.receiptsUsed.toLocaleString()}</p>
                <p className="text-[10px] text-gray-400">receipts</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-300 mt-1.5 font-mono">{org.id}</p>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">No organizations found.</div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Subscriptions ───────────────────────────────────────────────────────
function SubscriptionsTab({
  subs,
  productionOnly,
}: {
  subs: SubItem[];
  productionOnly: boolean;
}) {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = subs
    .filter((s) => !productionOnly || !s.isPreLaunchTest)
    .filter((s) => !search || s.orgName.toLowerCase().includes(search.toLowerCase()))
    .filter((s) => planFilter === "All" || s.tier === planFilter.toLowerCase())
    .filter((s) => statusFilter === "All" || s.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          placeholder="Search org..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/30"
        />
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {["All", "Free", "Professional", "Premium"].map((p) => <option key={p}>{p}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {["All", "active", "expired", "cancelled"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <p className="text-xs text-gray-400">{filtered.length} subscriptions</p>
      <div className="space-y-2">
        {filtered.map((s, i) => (
          <div key={`${s.orgId}-${i}`} className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-gray-900 truncate">{s.orgName}</p>
                  <PlanBadge tier={s.tier} label={s.planLabel} />
                  {!s.hasSubscriptionDoc && (
                    <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 font-bold border border-gray-200">
                      Free Plan (No Doc)
                    </span>
                  )}
                  {s.isPreLaunchTest && <PreLaunchTag />}
                </div>
                <div className="flex flex-wrap gap-3 mt-1">
                  <span className="text-xs text-gray-500">
                    Provider: <span className="font-medium">{s.paymentProvider || "—"}</span>
                  </span>
                  <span className="text-xs text-gray-500">
                    Status:{" "}
                    <span
                      className={`font-bold ${
                        s.status === "active" ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {s.status || "—"}
                    </span>
                  </span>
                  <span className="text-xs text-gray-500">
                    Renews: <span className="font-medium">{s.renewalDate || "—"}</span>
                  </span>
                </div>
              </div>
              {s.amount > 0 && (
                <span className="text-sm font-black text-[#8B1E2D] flex-shrink-0">
                  {formatAmount(s.amount)}
                </span>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">No subscriptions found.</div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Revenue ─────────────────────────────────────────────────────────────
function RevenueTab({
  transactions,
  productionOnly,
}: {
  transactions: TxItem[];
  productionOnly: boolean;
}) {
  const filtered = transactions.filter((t) => !productionOnly || !t.isPreLaunchTest);
  const total = filtered.reduce((sum, t) => sum + (t.amountPaid || 0), 0);

  const exportCSV = () => {
    const BOM = "\uFEFF";
    const headers = ["Tx ID", "Date", "Org ID", "Org Name", "Old Plan", "New Plan", "Amount (₹)", "Status", "Operator"];
    const rows = filtered.map((t) => [
      t.transactionId,
      formatDate(t.activatedAt),
      t.orgId,
      t.orgName,
      t.oldPlan,
      t.newPlanLabel,
      t.amountPaid.toString(),
      t.status,
      t.operatorName,
    ]);
    const csv = BOM + [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PavtiBook_Revenue_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Total Revenue ({productionOnly ? "Production" : "All Data"})</p>
          <p className="text-2xl font-black text-[#8B1E2D]">{formatAmount(total)}</p>
          <p className="text-xs text-gray-400">{filtered.length} transactions</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#8B1E2D] text-[#8B1E2D] text-xs font-bold hover:bg-[#8B1E2D]/5 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-3 py-2 font-bold text-gray-600 whitespace-nowrap">Date</th>
              <th className="px-3 py-2 font-bold text-gray-600 whitespace-nowrap">Organization</th>
              <th className="px-3 py-2 font-bold text-gray-600 whitespace-nowrap">Plan</th>
              <th className="px-3 py-2 font-bold text-gray-600 whitespace-nowrap">Amount</th>
              <th className="px-3 py-2 font-bold text-gray-600 whitespace-nowrap">Operator</th>
              <th className="px-3 py-2 font-bold text-gray-600 whitespace-nowrap">Status</th>
              <th className="px-3 py-2 font-bold text-gray-600 whitespace-nowrap">Tx ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((t) => (
              <tr key={t.id} className={`hover:bg-gray-50 ${t.isPreLaunchTest ? "opacity-50" : ""}`}>
                <td className="px-3 py-2 whitespace-nowrap text-gray-500">{formatDate(t.activatedAt)}</td>
                <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                  {t.orgName}
                  {t.isPreLaunchTest && <PreLaunchTag />}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{t.newPlanLabel}</td>
                <td className="px-3 py-2 font-bold text-[#8B1E2D] whitespace-nowrap">{formatAmount(t.amountPaid)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-600">{t.operatorName || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      t.status === "activated" || t.status === "success"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-gray-400 text-[10px] whitespace-nowrap max-w-[120px] truncate">
                  {t.transactionId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">No transactions found.</div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Usage ───────────────────────────────────────────────────────────────
function UsageTab({ orgs, productionOnly }: { orgs: OrgItem[]; productionOnly: boolean }) {
  const filtered = orgs.filter((o) => !productionOnly || !o.isPreLaunchTest);
  const totalReceipts = filtered.reduce((s, o) => s + o.receiptsUsed, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Total Receipts (Platform)" value={totalReceipts.toLocaleString()} />
        <MetricCard label="Organizations (Shown)" value={filtered.length} />
      </div>
      <div className="space-y-2">
        {filtered.sort((a, b) => b.receiptsUsed - a.receiptsUsed).map((org) => (
          <div key={org.id} className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-800">{org.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <PlanBadge tier={org.tier} label={org.planLabel} />
                  {org.isPreLaunchTest && <PreLaunchTag />}
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-[#8B1E2D]">{org.receiptsUsed.toLocaleString()}</p>
                <p className="text-[10px] text-gray-400">receipts used</p>
              </div>
            </div>
            {/* Progress bar (visual only, no hardcoded limits) */}
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#8B1E2D] rounded-full"
                style={{ width: `${Math.min((org.receiptsUsed / Math.max(...filtered.map(o => o.receiptsUsed), 1)) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Smart QR Demand ─────────────────────────────────────────────────────
function SmartQrLeadsTab({ leads }: { leads: SmartQrLead[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const filtered = leads
    .filter((l) => !search || l.organizationName.toLowerCase().includes(search.toLowerCase()) || l.userName.toLowerCase().includes(search.toLowerCase()))
    .filter((l) => typeFilter === "All" || l.organizationType === typeFilter);

  const orgTypes = ["All", ...Array.from(new Set(leads.map((l) => l.organizationType).filter(Boolean)))];

  const exportCSV = () => {
    const BOM = "\uFEFF";
    const headers = ["Org Name", "Org Type", "Contact", "Mobile", "Email", "City", "State", "Use Case", "Status", "Date"];
    const rows = filtered.map((l) => [
      l.organizationName,
      l.organizationType,
      l.userName,
      l.mobile,
      l.email,
      l.city,
      l.state,
      l.useCase,
      l.status,
      formatDate(l.interestedAt),
    ]);
    const csv = BOM + [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PavtiBook_SmartQR_Leads_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-black text-[#8B1E2D]">{leads.length}</p>
          <p className="text-xs text-gray-500">Total Leads</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#8B1E2D] text-[#8B1E2D] text-xs font-bold hover:bg-[#8B1E2D]/5 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/30"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {orgTypes.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        {filtered.map((lead) => (
          <div key={lead.id} className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-gray-900">{lead.organizationName}</p>
                <p className="text-xs text-gray-500">
                  {lead.organizationType} • {lead.userName}
                </p>
                <p className="text-xs text-gray-400">{lead.mobile} • {lead.email}</p>
                <p className="text-xs text-gray-400">{lead.city}{lead.state ? `, ${lead.state}` : ""}</p>
                <p className="text-xs text-gray-600 mt-1">
                  <span className="font-medium">Use case:</span> {lead.useCase}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    lead.status === "interested"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-gray-100 text-gray-500 border-gray-200"
                  }`}
                >
                  {lead.status}
                </span>
                <p className="text-[10px] text-gray-400 mt-1">{formatDate(lead.interestedAt)}</p>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">No Smart QR leads yet.</div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Activity & Alerts ───────────────────────────────────────────────────
function ActivityTab({
  activities,
  alerts,
  productionOnly,
}: {
  activities: ActivityItem[];
  alerts: AlertItem[];
  productionOnly: boolean;
}) {
  const filteredActivities = activities.filter((a) => !productionOnly || !a.isPreLaunchTest);

  return (
    <div className="space-y-5">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            ⚠️ Active Alerts
          </h2>
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-xl p-3.5 border ${
                  a.severity === "high"
                    ? "bg-red-50 border-red-200"
                    : a.severity === "medium"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-blue-50 border-blue-200"
                }`}
              >
                <span className="text-lg flex-shrink-0">
                  {a.type === "expiry" ? "⏰" : a.type === "smart_qr_lead" ? "🚀" : "⚡"}
                </span>
                <div>
                  <p className="text-xs font-bold text-gray-800">{a.title}</p>
                  <p className="text-xs text-gray-600">{a.description}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(a.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity log */}
      <div>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          📋 Audit Log
        </h2>
        <div className="space-y-2">
          {filteredActivities.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800">
                    {a.userName}{" "}
                    <span className="text-gray-400 font-normal">({a.userRole})</span>
                  </p>
                  <p className="text-xs text-gray-600">{a.action}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 break-all">
                    {sanitizeActivityDetails(a.details)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-gray-400">{formatDate(a.timestamp)}</p>
                  {a.isPreLaunchTest && <PreLaunchTag />}
                </div>
              </div>
            </div>
          ))}
          {filteredActivities.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">No activity logs found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Campaigns ───────────────────────────────────────────────────────────
function CampaignsTab({ orgs, campaigns }: { orgs: OrgItem[]; campaigns: CampaignItem[] }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all_customers");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [route, setRoute] = useState("/dashboard");
  const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  const estimateAudience = useCallback(async () => {
    setIsEstimating(true);
    setEstimatedCount(null);
    try {
      const fn = httpsCallable<
        { audienceType: string; organizationId?: string },
        { count: number }
      >(functions, "getCampaignAudienceCount");
      const res = await fn({ audienceType: audience, organizationId: selectedOrgId || undefined });
      setEstimatedCount(res.data.count ?? 0);
    } catch {
      setEstimatedCount(null);
    } finally {
      setIsEstimating(false);
    }
  }, [audience, selectedOrgId]);

  useEffect(() => {
    estimateAudience();
  }, [estimateAudience]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setSendResult({ success: false, message: "Title and message are required." });
      return;
    }
    setIsSending(true);
    setSendResult(null);
    try {
      const fn = httpsCallable<
        { title: string; message: string; audienceType: string; organizationId?: string; destinationRoute: string },
        { campaignId: string; successCount: number; failureCount: number }
      >(functions, "sendMarketingPushCampaign");
      const res = await fn({
        title: title.trim(),
        message: message.trim(),
        audienceType: audience,
        organizationId: audience === "specific_org" ? selectedOrgId : undefined,
        destinationRoute: route,
      });
      setSendResult({
        success: true,
        message: `Campaign sent! ${res.data.successCount} devices reached, ${res.data.failureCount} failed.`,
      });
      setTitle("");
      setMessage("");
    } catch (err: unknown) {
      const errorMsg = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Send failed.";
      setSendResult({ success: false, message: errorMsg });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Compose Campaign */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-gray-100">
          <span className="text-[#8B1E2D]">📣</span>
          <h3 className="text-sm font-bold text-[#8B1E2D]">Create Push Campaign</h3>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Notification Title * <span className="text-gray-400">(max 60 chars)</span>
            </label>
            <input
              type="text"
              maxLength={60}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. गणेशोत्सव विशेष अपडेट"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Message Body * <span className="text-gray-400">(max 180 chars)</span>
            </label>
            <textarea
              maxLength={180}
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="नवीन पावती कस्टमायझेशन आता उपलब्ध आहे..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/30 resize-none"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Target Audience *</label>
              <select
                value={audience}
                onChange={(e) => { setAudience(e.target.value); setEstimatedCount(null); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/30"
              >
                {AUDIENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Destination Route *</label>
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/30"
              >
                {DESTINATION_ROUTES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label} ({r.value})</option>
                ))}
              </select>
            </div>
          </div>

          {audience === "specific_org" && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Select Organization *</label>
              <select
                value={selectedOrgId}
                onChange={(e) => { setSelectedOrgId(e.target.value); setEstimatedCount(null); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/30"
              >
                <option value="">— Select org —</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Audience estimate */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">📱</span>
              {isEstimating ? (
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <div className="w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  Estimating devices...
                </span>
              ) : estimatedCount !== null ? (
                <span className="text-xs font-bold text-gray-700">
                  {estimatedCount} active marketing-opted devices
                </span>
              ) : (
                <span className="text-xs text-gray-400">Select audience to preview device count</span>
              )}
            </div>
            <button
              onClick={estimateAudience}
              disabled={isEstimating}
              className="text-xs text-[#8B1E2D] font-medium hover:underline"
            >
              Refresh
            </button>
          </div>

          {sendResult && (
            <div
              className={`text-xs p-3 rounded-lg border ${
                sendResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {sendResult.message}
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={isSending || !title.trim() || !message.trim()}
            className="w-full py-3 rounded-xl bg-[#8B1E2D] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#7a1825] disabled:opacity-50 transition"
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending Campaign...
              </>
            ) : (
              <>
                <span>📣</span>
                Broadcast Campaign
              </>
            )}
          </button>
        </div>
      </div>

      {/* Campaign history */}
      <div>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Campaign History</h2>
        <div className="space-y-2">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{c.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.message}</p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    <span className="text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 font-medium">
                      {c.audienceType}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium">
                      ✓ {c.successCount} sent
                    </span>
                    {c.failureCount > 0 && (
                      <span className="text-[10px] text-red-500 font-medium">
                        ✗ {c.failureCount} failed
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      c.status === "sent"
                        ? "bg-emerald-100 text-emerald-700"
                        : c.status === "sending"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {c.status}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-1">{formatDate(c.createdAt)}</p>
                  <p className="text-[10px] text-gray-400">{c.createdByName}</p>
                </div>
              </div>
            </div>
          ))}
          {campaigns.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">No campaigns sent yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
const TABS = ["Overview", "Organizations", "Subscriptions", "Revenue", "Usage", "Smart QR", "Activity", "Campaigns"] as const;
type Tab = (typeof TABS)[number];

export default function FounderDashboardPage() {
  const router = useRouter();
  const { user, userData, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [productionOnly, setProductionOnly] = useState(true);

  // Data states
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [subs, setSubs] = useState<SubItem[]>([]);
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [leads, setLeads] = useState<SmartQrLead[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);

  // Check authorization
  useEffect(() => {
    if (authLoading) return;
    if (!user || !userData) {
      setIsLoading(false);
      return;
    }
    const isOwner =
      userData.isSoftwareOwner === true ||
      userData.is_software_owner === true ||
      userData.role === "software_owner" ||
      userData.role === "superadmin";
    setIsAuthorized(isOwner);
    setIsLoading(false);
  }, [authLoading, user, userData]);

  const loadAllData = useCallback(async () => {
    if (!isAuthorized) return;
    setIsLoading(true);
    try {
      await Promise.allSettled([
        loadOrganizations(),
        loadSubscriptions(),
        loadTransactions(),
        loadSmartQrLeads(),
        loadActivities(),
        loadCampaigns(),
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (isAuthorized) loadAllData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

  // Derive overview from loaded data
  useEffect(() => {
    if (!orgs.length && !transactions.length) return;
    const filteredOrgs = productionOnly ? orgs.filter((o) => !o.isPreLaunchTest) : orgs;
    const filteredTx = productionOnly ? transactions.filter((t) => !t.isPreLaunchTest) : transactions;
    const filteredSubs = productionOnly ? subs.filter((s) => !s.isPreLaunchTest) : subs;

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const smartQrViewed = (overview?.smartQrViewed ?? 0);
    const smartQrLeads = leads.length;

    setOverview({
      totalOrganizations: filteredOrgs.length,
      activeOrganizations: filteredOrgs.filter((o) => o.receiptsUsed > 0 || o.hasSubscriptionDoc).length,
      newOrgsThisMonth: filteredOrgs.filter((o) => o.createdAt && o.createdAt >= thisMonthStart).length,
      totalSubscriptions: filteredSubs.filter((s) => s.tier !== "free" && s.hasSubscriptionDoc).length,
      freeSubscriptions: filteredOrgs.filter((o) => o.tier === "free").length,
      professionalSubscriptions: filteredOrgs.filter((o) => o.tier === "professional").length,
      premiumSubscriptions: filteredOrgs.filter((o) => o.tier === "premium").length,
      monthlySubscribers: filteredSubs.filter((s) => s.billingPeriod === "monthly").length,
      annualSubscribers: filteredSubs.filter((s) => s.billingPeriod === "yearly").length,
      totalRevenueAllTime: filteredTx.reduce((sum, t) => sum + (t.amountPaid || 0), 0),
      totalSuccessfulPayments: filteredTx.filter((t) => t.status === "activated" || t.status === "success").length,
      totalReceiptsCount: filteredOrgs.reduce((sum, o) => sum + o.receiptsUsed, 0),
      totalDonorsCount: 0,
      smartQrViewed,
      smartQrOpened: Math.round(smartQrViewed * 0.8),
      smartQrInterestClicked: Math.round(smartQrViewed * 0.4),
      smartQrFormStarted: Math.round(smartQrViewed * 0.2),
      smartQrLeads,
      smartQrConversionRate: smartQrViewed > 0 ? (smartQrLeads / smartQrViewed) * 100 : 0,
    });
  }, [orgs, subs, transactions, leads, productionOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load smart QR analytics for overview
  useEffect(() => {
    if (!isAuthorized) return;
    getDoc(doc(db, "smart_donation_qr_analytics", "summary"))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setOverview((prev) =>
            prev
              ? {
                  ...prev,
                  smartQrViewed: d.smart_qr_viewed || 0,
                  smartQrOpened: d.smart_qr_opened || 0,
                  smartQrInterestClicked: d.smart_qr_interest_clicked || 0,
                  smartQrFormStarted: d.smart_qr_interest_form_started || 0,
                }
              : null
          );
        }
      })
      .catch(() => {});
  }, [isAuthorized]);

  async function loadOrganizations() {
    try {
      const snap = await getDocs(collection(db, "organizations"));
      const smartQrSnap = await getDocs(collection(db, "smart_donation_qr_interest"));
      const smartQrOrgIds = new Set(smartQrSnap.docs.map((d) => d.data().organizationId as string));

      const items: OrgItem[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        const createdAt = parseDate(data.createdAt);
        const plan: string = (data.plan as string) || (data.subscription_plan as string) || "";
        const tier = PLAN_TIER[plan] || "free";
        const planLabel = PLAN_LABELS[plan] || "Free";
        const receiptsSnap = await getDocs(query(
          collection(db, "receipts"),
          where("organizationId", "==", d.id),
          where("isDeleted", "!=", true)
        )).catch(() => ({ size: 0 }));

        items.push({
          id: d.id,
          name: (data.name as string) || "—",
          type: (data.type as string) || "Other",
          city: (data.city as string) || "",
          state: (data.state as string) || "",
          plan,
          planLabel,
          tier,
          subscriptionStatus: (data.subscriptionStatus as string) || (data.subscription_status as string) || "unknown",
          hasSubscriptionDoc: false, // will cross-reference with subs
          createdAt,
          receiptsUsed: receiptsSnap.size,
          hasSmartQrInterest: smartQrOrgIds.has(d.id),
          isPreLaunchTest: isPreLaunch(createdAt),
        });
      }
      setOrgs(items);
    } catch {
      // Non-fatal
    }
  }

  async function loadSubscriptions() {
    try {
      const snap = await getDocs(collection(db, "subscriptions"));
      const orgSnap = await getDocs(collection(db, "organizations"));
      const orgMap = new Map(orgSnap.docs.map((d) => [d.id, (d.data().name as string) || d.id]));

      const subItems: SubItem[] = snap.docs.map((d) => {
        const data = d.data();
        const plan: string = (data.plan as string) || (data.planId as string) || "";
        const tier = PLAN_TIER[plan] || "free";
        const planLabel = PLAN_LABELS[plan] || "Free";
        const billingPeriod = plan.includes("yearly") || plan === "yearly" ? "yearly" : "monthly";
        const startDate = parseDate(data.startDate || data.activatedAt || data.createdAt);
        const renewalDate = parseDate(data.renewalDate || data.expiresAt || data.expiry_date);
        const activatedAt = parseDate(data.activatedAt || data.createdAt);

        return {
          orgId: d.id,
          orgName: orgMap.get(d.id) || d.id,
          plan,
          planLabel,
          tier,
          billingPeriod,
          status: (data.status as string) || "unknown",
          renewalDate: formatDate(renewalDate),
          startDate: formatDate(startDate),
          paymentProvider: ((data.paymentProvider as string) || (data.payment_provider as string) || "").toUpperCase() || "—",
          transactionId: (data.razorpayPaymentId as string) || (data.transactionId as string) || "—",
          hasSubscriptionDoc: true,
          isPreLaunchTest: isPreLaunch(activatedAt),
          amount: (data.amount as number) || (data.amountPaid as number) || 0,
        };
      });

      // Include orgs without subscription docs as "Free Plan (No Doc)"
      const orgIdsWithSubs = new Set(snap.docs.map((d) => d.id));
      for (const [orgId, orgName] of orgMap) {
        if (!orgIdsWithSubs.has(orgId)) {
          subItems.push({
            orgId,
            orgName,
            plan: "free",
            planLabel: "Free Plan (No Doc)",
            tier: "free",
            billingPeriod: "—",
            status: "free",
            renewalDate: "—",
            startDate: "—",
            paymentProvider: "—",
            transactionId: "—",
            hasSubscriptionDoc: false,
            isPreLaunchTest: false,
            amount: 0,
          });
        }
      }

      setSubs(subItems);

      // Update orgs with hasSubscriptionDoc
      setOrgs((prev) =>
        prev.map((o) => ({
          ...o,
          hasSubscriptionDoc: orgIdsWithSubs.has(o.id),
        }))
      );
    } catch {
      // Non-fatal
    }
  }

  async function loadTransactions() {
    try {
      const snap = await getDocs(
        query(collection(db, "subscription_history"), orderBy("activatedAt", "desc"), limit(200))
      );
      const orgSnap = await getDocs(collection(db, "organizations"));
      const orgMap = new Map(orgSnap.docs.map((d) => [d.id, (d.data().name as string) || d.id]));

      const items: TxItem[] = snap.docs.map((d) => {
        const data = d.data();
        const activatedAt = parseDate(data.activatedAt || data.createdAt);
        const plan: string = (data.newPlan as string) || (data.plan as string) || "";
        return {
          id: d.id,
          orgId: (data.organizationId as string) || "",
          orgName: orgMap.get((data.organizationId as string) || "") || (data.organizationId as string) || "—",
          oldPlan: (data.oldPlan as string) || "—",
          newPlan: plan,
          newPlanLabel: PLAN_LABELS[plan] || plan,
          amountPaid: (data.amountPaid as number) || (data.amount as number) || 0,
          activatedAt,
          status: (data.status as string) || "activated",
          transactionId: (data.razorpayPaymentId as string) || (data.transactionId as string) || "—",
          operatorName: (data.operatorName as string) || (data.activatedByName as string) || "—",
          isPreLaunchTest: isPreLaunch(activatedAt),
        };
      });
      setTransactions(items);
    } catch {
      // Non-fatal
    }
  }

  async function loadSmartQrLeads() {
    try {
      const snap = await getDocs(collection(db, "smart_donation_qr_interest"));
      const items: SmartQrLead[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          organizationName: (data.organizationName as string) || "—",
          organizationType: (data.organizationType as string) || "Other",
          userName: (data.userName as string) || "—",
          mobile: (data.mobile as string) || "—",
          email: (data.email as string) || "—",
          city: (data.city as string) || "—",
          state: (data.state as string) || "—",
          useCase: (data.useCase as string) || "—",
          status: (data.status as string) || "interested",
          notifyWhenAvailable: (data.notifyWhenAvailable as boolean) ?? true,
          interestedAt: parseDate(data.interestedAt || data.createdAt),
        };
      });
      setLeads(items);

      // Build alerts for recent leads (< 24h)
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const newLeads = items.filter((l) => l.interestedAt && l.interestedAt > cutoff);
      setAlerts((prev) => {
        const leadAlerts: AlertItem[] = newLeads.map((l) => ({
          type: "smart_qr_lead",
          title: "New Smart QR Lead",
          description: `${l.organizationName} (${l.organizationType}) registered interest — ${l.userName}`,
          orgId: l.id,
          timestamp: l.interestedAt || new Date(),
          severity: "medium",
        }));
        const nonLeadAlerts = prev.filter((a) => a.type !== "smart_qr_lead");
        return [...nonLeadAlerts, ...leadAlerts];
      });
    } catch {
      // Non-fatal
    }
  }

  async function loadActivities() {
    try {
      const snap = await getDocs(
        query(collection(db, "activity_logs"), orderBy("timestamp", "desc"), limit(100))
      );
      const items: ActivityItem[] = snap.docs.map((d) => {
        const data = d.data();
        const timestamp = parseDate(data.timestamp || data.createdAt);
        return {
          id: d.id,
          orgId: (data.organizationId as string) || "",
          userName: (data.userName as string) || "—",
          userRole: (data.userRole as string) || "—",
          action: (data.action as string) || "—",
          details: sanitizeActivityDetails((data.details as string) || ""),
          timestamp,
          isPreLaunchTest: isPreLaunch(timestamp),
        };
      });
      setActivities(items);
    } catch {
      // Non-fatal
    }
  }

  async function loadCampaigns() {
    try {
      const snap = await getDocs(
        query(collection(db, "marketing_campaigns"), orderBy("createdAt", "desc"), limit(50))
      );
      const items: CampaignItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: (data.title as string) || "—",
          message: (data.message as string) || "—",
          audienceType: (data.targetAudience as { type: string })?.type || (data.audienceType as string) || "all_customers",
          status: (data.status as string) || "sent",
          targetCount: (data.targetCount as number) || 0,
          successCount: (data.successCount as number) || 0,
          failureCount: (data.failureCount as number) || 0,
          createdAt: parseDate(data.createdAt),
          createdByName: (data.createdByName as string) || "Founder",
          destinationRoute: (data.destinationRoute as string) || "/dashboard",
        };
      });
      setCampaigns(items);
    } catch {
      // Non-fatal
    }
  }

  // Subscription expiry alerts
  useEffect(() => {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expiringItems = subs.filter((s) => {
      if (!s.renewalDate || s.renewalDate === "—") return false;
      const rd = new Date(s.renewalDate);
      return rd >= now && rd <= sevenDaysLater && s.tier !== "free";
    });

    setAlerts((prev) => {
      const expiryAlerts: AlertItem[] = expiringItems.map((s) => ({
        type: "expiry",
        title: `Subscription Expiring: ${s.orgName}`,
        description: `${s.planLabel} expires on ${s.renewalDate}`,
        orgId: s.orgId,
        timestamp: new Date(),
        severity: "high",
      }));
      const nonExpiryAlerts = prev.filter((a) => a.type !== "expiry");
      return [...expiryAlerts, ...nonExpiryAlerts];
    });
  }, [subs]);

  if (authLoading || (isLoading && !isAuthorized)) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#8B1E2D]/20 border-t-[#8B1E2D] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return <AccessDeniedScreen />;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5 pb-20">
      {/* Header */}
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
          <h1 className="text-xl font-black text-gray-900">
            {t("founder_dashboard_title", "Founder Demand Dashboard")}
          </h1>
          <p className="text-xs text-gray-500">
            {t("founder_dashboard_subtitle", "Software Owner & Superadmin Access • PavtiBook SaaS Administration")}
          </p>
        </div>
        {isLoading && (
          <div className="ml-auto w-5 h-5 border-2 border-[#8B1E2D]/20 border-t-[#8B1E2D] rounded-full animate-spin" />
        )}
      </div>

      {/* Tab bar — scrollable horizontally */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-1 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                activeTab === tab
                  ? "bg-[#8B1E2D] text-white shadow-xs"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {tab === "Overview" && "📊 "}
              {tab === "Organizations" && "🏛️ "}
              {tab === "Subscriptions" && "💎 "}
              {tab === "Revenue" && "₹ "}
              {tab === "Usage" && "📈 "}
              {tab === "Smart QR" && "🚀 "}
              {tab === "Activity" && "📋 "}
              {tab === "Campaigns" && "📣 "}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "Overview" && (
        <OverviewTab
          metrics={overview}
          productionOnly={productionOnly}
          setProductionOnly={(v) => { setProductionOnly(v); }}
          onRefresh={loadAllData}
          isLoading={isLoading}
        />
      )}
      {activeTab === "Organizations" && (
        <OrganizationsTab orgs={orgs} productionOnly={productionOnly} />
      )}
      {activeTab === "Subscriptions" && (
        <SubscriptionsTab subs={subs} productionOnly={productionOnly} />
      )}
      {activeTab === "Revenue" && (
        <RevenueTab transactions={transactions} productionOnly={productionOnly} />
      )}
      {activeTab === "Usage" && (
        <UsageTab orgs={orgs} productionOnly={productionOnly} />
      )}
      {activeTab === "Smart QR" && (
        <SmartQrLeadsTab leads={leads} />
      )}
      {activeTab === "Activity" && (
        <ActivityTab activities={activities} alerts={alerts} productionOnly={productionOnly} />
      )}
      {activeTab === "Campaigns" && (
        <CampaignsTab orgs={orgs} campaigns={campaigns} />
      )}
    </div>
  );
}
