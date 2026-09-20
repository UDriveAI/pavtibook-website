"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ExternalLink } from "lucide-react";

interface AdSlotProps {
  plan?: string | null;
  className?: string;
}

/**
 * Checks if the given plan is an active paid plan.
 * Hard business rule: Paid tiers (Professional or Premium) must NEVER see ads.
 */
export function isPaidTier(plan?: string | null): boolean {
  if (!plan) return false;
  const p = plan.toLowerCase().trim();
  return (
    p.includes("professional") ||
    p.includes("premium") ||
    p === "monthly" ||
    p === "yearly"
  );
}

export default function AdSlot({ plan, className = "" }: AdSlotProps) {
  // Fail-safe rule: Unknown subscription state / loading (null / undefined) = NO AD
  if (!plan) {
    return null;
  }

  // Paid subscribers are 100% exempt from ads
  if (isPaidTier(plan)) {
    return null;
  }

  // Strictly render only for verified Free / Free Trial tiers
  const p = plan.toLowerCase().trim();
  if (p !== "free" && p !== "free_trial" && p !== "trial") {
    return null;
  }

  // Privacy invariant: Zero PII transmitted or rendered
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-neutral-50 p-3 sm:p-4 transition hover:border-amber-300 ${className}`}
      role="complementary"
      aria-label="Sponsored Announcement"
    >
      {/* Required Identification Badge */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold tracking-wider uppercase bg-neutral-200/80 text-neutral-600 px-1.5 py-0.5 rounded">
            Advertisement
          </span>
          <span className="text-[10px] text-neutral-400 font-medium hidden sm:inline">
            PavtiBook Partner Network
          </span>
        </div>
        <Link
          href="/app/subscription"
          className="text-[10px] font-bold text-[#8B1E2D] hover:underline flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Go Ad-Free for ₹99/mo</span>
        </Link>
      </div>

      {/* Ad Creative Payload */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#8B1E2D]/10 border border-[#8B1E2D]/20 text-[#8B1E2D] flex items-center justify-center font-bold text-lg shrink-0">
            🏛️
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-neutral-900 leading-snug">
              Smart Sound & Donation Systems for Mandals & Trusts
            </h4>
            <p className="text-[11px] text-neutral-600 leading-tight mt-0.5">
              Verified equipment, digital display boards & thermal printer solutions for organizations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Link
            href="/app/subscription"
            className="px-3 py-1.5 bg-[#8B1E2D] hover:bg-[#721824] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <span>Learn More</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
