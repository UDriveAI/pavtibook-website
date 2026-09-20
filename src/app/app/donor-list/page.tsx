"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, limit, doc, getDoc } from "firebase/firestore";
import { useOrg } from "@/context/OrgContext";
import { useLanguage } from "@/lib/i18n";
import { db } from "@/lib/firebase-client";
import AdSlot from "@/components/ads/AdSlot";
import {
  ArrowLeft,
  Search,
  Phone,
  MapPin,
  Plus,
} from "lucide-react";

interface DonorRecord {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  totalDonated?: number;
  donationCount?: number;
  receiptCount?: number;
  lastDonationDate?: string;
}

export default function DonorListPage() {
  const router = useRouter();
  const { activeOrg } = useOrg();
  const { t } = useLanguage();

  const [donors, setDonors] = useState<DonorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!activeOrg?.id) return;

    const fetchDonors = async () => {
      setLoading(true);
      try {
        // Fetch subscription plan for ad eligibility
        try {
          const subSnap = await getDoc(doc(db, "subscriptions", activeOrg.id));
          if (subSnap.exists()) {
            setPlan(subSnap.data().plan || "free");
          } else {
            setPlan("free");
          }
        } catch {
          setPlan("free");
        }

        const donorsRef = collection(db, "donors");
        const q = query(
          donorsRef,
          where("organizationId", "==", activeOrg.id),
          limit(250)
        );
        const snap = await getDocs(q);
        const list: DonorRecord[] = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "Donor",
          mobile: d.data().mobile || "",
          email: d.data().email || "",
          address: d.data().address || "",
          totalDonated: d.data().totalDonated || 0,
          donationCount: d.data().donationCount || d.data().receiptCount || 0,
          lastDonationDate: d.data().lastDonationDate || "",
        }));

        // Sort by totalDonated descending
        list.sort((a, b) => (b.totalDonated || 0) - (a.totalDonated || 0));
        setDonors(list);
      } catch (err) {
        console.error("Error loading donors:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDonors();
  }, [activeOrg?.id]);

  const filteredDonors = useMemo(() => {
    if (!searchQuery.trim()) return donors;
    const q = searchQuery.toLowerCase().trim();
    return donors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.mobile.includes(q) ||
        (d.address && d.address.toLowerCase().includes(q))
    );
  }, [donors, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/app")}
            className="p-2 -ml-2 text-stone-600 hover:text-stone-900 rounded-full hover:bg-stone-100 transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-stone-900">
              {t("action_donor_list")}
            </h1>
            <p className="text-xs text-stone-500 font-medium">
              {activeOrg?.name || "Organization"} · {filteredDonors.length} Donors
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push("/app/create-receipt")}
          className="px-4 py-2 bg-[#8B1E2D] hover:bg-[#721824] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>{t("action_add_receipt")}</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Donor Name, Mobile number, or Location..."
          className="w-full pl-9 pr-4 py-3 bg-white border border-stone-200 rounded-2xl text-xs focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none shadow-2xs"
        />
      </div>

      {/* Donors Grid / List */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#8B1E2D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-stone-500 font-medium">Loading donors list...</p>
        </div>
      ) : filteredDonors.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center space-y-3">
          <div className="w-12 h-12 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mx-auto text-xl">
            👥
          </div>
          <p className="text-sm font-bold text-stone-800">No donors found</p>
          <p className="text-xs text-stone-500">
            Donors will automatically be added and aggregated as you issue receipts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDonors.map((donor) => (
            <div
              key={donor.id}
              onClick={() => router.push(`/app/donor/${donor.id}`)}
              className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs hover:shadow-md hover:border-[#8B1E2D]/30 transition space-y-3 cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition">
                    {donor.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 leading-tight group-hover:text-[#8B1E2D] transition">
                      {donor.name}
                    </h3>
                    <p className="text-[11px] text-stone-400 font-medium">
                      {donor.donationCount} {donor.donationCount === 1 ? "Receipt" : "Receipts"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black font-mono text-[#8B1E2D] block">
                    ₹{(donor.totalDonated || 0).toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] text-stone-400 uppercase font-semibold">
                    Total
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 space-y-1 text-xs text-stone-600">
                {donor.mobile && (
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    <span>{donor.mobile}</span>
                  </div>
                )}
                {donor.address && (
                  <div className="flex items-center gap-1.5 text-[11px] truncate">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">{donor.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Non-intrusive ad slot for free tier */}
      <AdSlot plan={plan} className="mt-6" />
    </div>
  );
}