"use client";

import React, { useState, useEffect } from "react";
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
  const [paymentState, setPaymentState] = useState<"idle" | "uncertain" | "failed">("idle");
  const [receiptIdStr, setReceiptIdStr] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Hide WhatsApp floating widgets
  useEffect(() => {
    const hideWidgets = () => {
      const widgets = document.querySelectorAll(
        '[id*="whatsapp"], [class*="whatsapp-float"], [class*="chat-widget"]'
      );
      widgets.forEach((w) => {
        if (w instanceof HTMLElement) {
          w.style.display = "none";
        }
      });
    };
    hideWidgets();
    const timeoutId = setTimeout(hideWidgets, 1500);
    return () => clearTimeout(timeoutId);
  }, []);

  const quickAmounts = ["51", "101", "501", "1001"];

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid donation amount.");
      return;
    }

    if (!donorMobile || !/^[0-9]{10}$/.test(donorMobile)) {
      setError("Valid 10-digit mobile number is required.");
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

      setReceiptIdStr(data.receiptId);

      // Generate UPI Intent (Fix Bug 1: Do NOT encode upiId, apps expect raw @ symbol)
      const safeUpiId = upiId.trim();
      // Optional: attempt to pass returnUrl for apps that support it
      const returnUrl = `${window.location.origin}/receipt/${data.receiptId}`;
      const intentUrl = `upi://pay?pa=${safeUpiId}&pn=${encodeURIComponent(orgName.trim())}&am=${numAmount}&cu=INR&tn=Donation&url=${encodeURIComponent(returnUrl)}`;

      // Attempt to open UPI app
      const startTime = Date.now();
      window.location.href = intentUrl;

      // Listen for return to browser to handle state locally
      const handleReturn = () => {
        if (document.visibilityState === "visible") {
          document.removeEventListener("visibilitychange", handleReturn);
          window.removeEventListener("focus", handleReturn);
          setIsSubmitting(false);
          const elapsed = Date.now() - startTime;
          // If the app closed almost instantly (<2.5s), it likely rejected the intent or the user cancelled immediately.
          if (elapsed < 2500) {
            setPaymentState("failed");
          } else {
            setPaymentState("uncertain");
          }
        }
      };

      document.addEventListener("visibilitychange", handleReturn);
      window.addEventListener("focus", handleReturn);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  const getButtonText = () => {
    if (isSubmitting) return "Initiating...";
    if (amount && parseFloat(amount) > 0) return `PAY ₹${amount}`;
    return "SELECT DONATION AMOUNT";
  };


  if (paymentState === "uncertain") {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-6 text-center font-sans">
        <div
          style={{
            width: "100%",
            maxWidth: "500px",
            background: "#FFFDF9",
            borderRadius: "16px",
            boxShadow: "0 8px 30px rgba(139, 30, 45, 0.08)",
            border: "1px solid rgba(139, 30, 45, 0.15)",
            overflow: "hidden",
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "#8B1E2D",
              color: "#FFFFFF",
              padding: "36px 20px 28px",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#FFFDF9",
                border: "2px solid #F47C20",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: "28px",
                boxShadow: "0 4px 12px rgba(244, 124, 32, 0.3)",
              }}
            >
              ⏳
            </div>
            <h1 style={{ fontSize: "24px", fontWeight: 900, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
              Payment Status
            </h1>
            <p style={{ fontSize: "15px", color: "#FFFDF9", opacity: 0.9, margin: 0, fontWeight: 500 }}>
              Your payment status is being confirmed.
            </p>
            <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "4px", background: "linear-gradient(to right, #F47C20, #F2C94C)" }}></div>
          </div>

          <div style={{ padding: "32px 24px", color: "#374151", lineHeight: 1.6 }}>
            <button
              onClick={() => router.push(`/receipt/${receiptIdStr}`)}
              style={{
                width: "100%",
                padding: "14px 24px",
                background: "#8B1E2D",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(139, 30, 45, 0.3)",
                transition: "all 0.2s ease-in-out",
                marginBottom: "12px"
              }}
            >
              Check Payment Status
            </button>
            <button
              onClick={() => setPaymentState("idle")}
              style={{
                width: "100%",
                padding: "14px 24px",
                background: "#FFFFFF",
                color: "#8B1E2D",
                border: "1px solid #8B1E2D",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (paymentState === "failed") {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-6 text-center font-sans">
        <div
          style={{
            width: "100%",
            maxWidth: "500px",
            background: "#FFFDF9",
            borderRadius: "16px",
            boxShadow: "0 8px 30px rgba(139, 30, 45, 0.08)",
            border: "1px solid rgba(139, 30, 45, 0.15)",
            overflow: "hidden",
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              color: "#374151",
              padding: "36px 20px 28px",
              position: "relative",
              borderBottom: "1px solid #E5E7EB"
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#FFFDF9",
                border: "2px solid #EF4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: "28px",
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.15)",
              }}
            >
              ❌
            </div>
            <h1 style={{ fontSize: "24px", fontWeight: 900, margin: "0 0 8px", letterSpacing: "-0.01em", color: "#111827" }}>
              Payment Not Completed
            </h1>
            <p style={{ fontSize: "15px", color: "#4B5563", margin: 0, fontWeight: 500 }}>
              Your payment could not be completed.
            </p>
          </div>

          <div style={{ padding: "32px 24px", color: "#374151", lineHeight: 1.6 }}>
            <button
              onClick={() => setPaymentState("idle")}
              style={{
                width: "100%",
                padding: "14px 24px",
                background: "#8B1E2D",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(139, 30, 45, 0.3)",
                transition: "all 0.2s ease-in-out",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF9] relative overflow-hidden font-sans">
      {/* Subtle decorative top accent */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#F47C20] via-[#8B1E2D] to-[#2E7D6B]"></div>

      {/* Background subtle decoration */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#F47C20] opacity-[0.03] pointer-events-none blur-3xl"></div>
      <div className="absolute top-40 left-0 -ml-16 w-48 h-48 rounded-full bg-[#8B1E2D] opacity-[0.02] pointer-events-none blur-3xl"></div>

      <div className="max-w-md mx-auto p-4 md:p-6 pb-28 relative z-10">
        {/* Top Branding */}
        <div className="flex flex-col items-center mt-6 mb-8">
          <Image
            src="/images/Pavati-Book-Logo-01.png"
            alt="PavtiBook Logo"
            width={160}
            height={48}
            className="mb-2 object-contain"
            priority
          />
          <h1 className="text-[12px] font-bold text-[#8B1E2D] tracking-[0.2em] uppercase mt-2">
            Digital Donation
          </h1>
        </div>

        {/* Organization Header */}
        <div className="text-center mb-8">
          {logoUrl ? (
            <div className="w-20 h-20 mx-auto mb-3 rounded-full border border-gray-100 shadow-sm overflow-hidden bg-white flex items-center justify-center p-1">
              <Image
                src={logoUrl}
                alt={orgName}
                width={80}
                height={80}
                className="w-full h-full object-cover rounded-full"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-20 h-20 mx-auto mb-3 rounded-full border border-gray-100 shadow-sm bg-white flex items-center justify-center text-[#8B1E2D] text-3xl font-bold">
              {orgName.substring(0, 1).toUpperCase()}
            </div>
          )}

          <h2 className="text-2xl font-black text-gray-900 leading-snug px-2">
            {orgName}
          </h2>
          {orgType && (
            <p className="text-sm font-semibold text-[#F47C20] mt-1 tracking-wide">
              {orgType}
            </p>
          )}
        </div>

        <form onSubmit={handleDonate} className="space-y-6">
          {/* Amount Card */}
          <div className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#8B1E2D]/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#8B1E2D]"></div>

            <label className="block text-sm font-bold text-gray-800 mb-4 text-center">
              Select Donation Amount
            </label>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {quickAmounts.map((amt) => {
                const isSelected = amount === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt)}
                    className={`py-3.5 rounded-xl font-bold text-lg transition-all duration-200 border ${
                      isSelected
                        ? "bg-[#8B1E2D] text-white border-[#8B1E2D] shadow-md transform scale-[1.02]"
                        : "bg-[#FFFDF9] text-gray-800 border-[#8B1E2D]/20 hover:bg-[#8B1E2D]/5 hover:border-[#8B1E2D]/30"
                    }`}
                  >
                    ₹{amt}
                  </button>
                );
              })}
            </div>

            <div className="relative mt-2">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span
                  className={`font-bold text-xl ${
                    amount && !quickAmounts.includes(amount)
                      ? "text-[#8B1E2D]"
                      : "text-gray-400"
                  }`}
                >
                  ₹
                </span>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter Custom Amount"
                className={`w-full pl-10 pr-4 py-4 bg-[#FFFDF9] border rounded-xl text-xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#F47C20]/30 focus:border-[#F47C20] ${
                  amount && !quickAmounts.includes(amount)
                    ? "border-[#F47C20] text-[#8B1E2D] shadow-[0_0_0_1px_#F47C20] bg-white"
                    : "border-gray-200 text-gray-900"
                }`}
                min="1"
              />
            </div>
          </div>

          {/* Donor Details Section */}
          <div className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#8B1E2D]/10 space-y-4">
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Donor Details
            </label>

            <div>
              <input
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="Full Name (Optional)"
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/10 focus:border-[#F47C20] transition-colors placeholder:font-normal"
              />
            </div>
            <div>
              <input
                type="tel"
                value={donorMobile}
                onChange={(e) => setDonorMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Mobile Number *"
                required
                pattern="[0-9]{10}"
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/10 focus:border-[#F47C20] transition-colors placeholder:font-normal"
              />
            </div>
          </div>

          {error && (
            <div className="bg-[#8B1E2D]/5 text-[#8B1E2D] text-sm font-semibold p-4 rounded-xl border border-[#8B1E2D]/20 text-center">
              {error}
            </div>
          )}

          {/* Fixed Bottom CTA for mobile */}
          <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-[#FFFDF9] via-[#FFFDF9] to-transparent md:static md:bg-transparent md:p-0 z-50">
            <div className="max-w-md mx-auto">
              <button
                type="submit"
                disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
                className="w-full py-4 rounded-xl bg-[#8B1E2D] text-white font-black text-lg shadow-[0_4px_14px_rgba(139,30,45,0.3)] hover:bg-[#721825] transition-all disabled:opacity-60 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Initiating...
                  </>
                ) : (
                  getButtonText()
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
