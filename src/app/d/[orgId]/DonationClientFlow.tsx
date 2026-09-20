"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface DonationClientFlowProps {
  orgId: string;
  orgName: string;
  orgType: string;
  logoUrl: string | null;
  upiId: string;
}

export default function DonationClientFlow({
  orgId,
  orgName,
  orgType,
  logoUrl,
  upiId,
}: DonationClientFlowProps) {
  const router = useRouter();
  const [amount, setAmount] = useState<string>("");
  const [donorName, setDonorName] = useState<string>("");
  const [donorMobile, setDonorMobile] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickAmounts = ["51", "101", "501", "1001"];

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid donation amount.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/donation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          amount: numAmount,
          donorName,
          donorMobile,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate donation");
      }

      // Generate UPI Intent
      const intentUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
        orgName
      )}&am=${numAmount}&cu=INR&tn=Donation`;

      // Attempt to open UPI app
      window.location.href = intentUrl;

      // After a short delay, redirect to the receipt page
      setTimeout(() => {
        router.push(`/receipt/${data.receiptId}`);
      }, 2000);
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 md:p-6 pb-24">
      {/* Header */}
      <div className="text-center mb-8 pt-4">
        <h1 className="text-sm font-bold text-[#8B1E2D] tracking-widest uppercase mb-6">
          Digital Donation
        </h1>

        {logoUrl ? (
          <div className="w-24 h-24 mx-auto mb-4 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
            <Image
              src={logoUrl}
              alt={orgName}
              width={96}
              height={96}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-24 h-24 mx-auto mb-4 rounded-full border-4 border-white shadow-lg bg-[#8B1E2D] flex items-center justify-center text-white text-3xl font-bold">
            {orgName.substring(0, 1).toUpperCase()}
          </div>
        )}

        <h2 className="text-2xl font-black text-gray-900 leading-tight">
          {orgName}
        </h2>
        {orgType && (
          <p className="text-sm font-medium text-gray-500 mt-1">{orgType}</p>
        )}
      </div>

      <form onSubmit={handleDonate} className="space-y-6">
        {/* Amount Section */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <label className="block text-sm font-bold text-gray-800 mb-3 text-center">
            Select Donation Amount
          </label>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setAmount(amt)}
                className={`py-3 rounded-xl font-bold text-lg transition-all ${
                  amount === amt
                    ? "bg-[#8B1E2D] text-white shadow-md scale-105"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                â‚¹{amt}
              </button>
            ))}
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-gray-500 font-bold text-xl">â‚¹</span>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter Custom Amount"
              className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/50 focus:border-[#8B1E2D] transition-all"
              required
              min="1"
            />
          </div>
        </div>

        {/* Donor Details Section */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <label className="block text-sm font-bold text-gray-800 mb-1">
            Donor Details (Optional)
          </label>
          
          <div>
            <input
              type="text"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="Your Full Name"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/50 focus:border-[#8B1E2D]"
            />
          </div>
          <div>
            <input
              type="tel"
              value={donorMobile}
              onChange={(e) => setDonorMobile(e.target.value)}
              placeholder="Mobile Number"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/50 focus:border-[#8B1E2D]"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm font-medium p-4 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !amount}
          className="w-full py-4 rounded-xl bg-[#8B1E2D] text-white font-black text-lg shadow-lg hover:bg-[#7a1825] hover:shadow-xl transition-all disabled:opacity-50 disabled:hover:shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Initiating...
            </>
          ) : (
            `Donate â‚¹${amount || "..."}`
          )}
        </button>
        
        <p className="text-center text-xs text-gray-500 font-medium px-4">
          By donating, you will generate a pending Digital Pavti.
        </p>
      </form>
    </div>
  );
}
