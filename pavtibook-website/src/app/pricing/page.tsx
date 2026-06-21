"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Check,
  QrCode
} from "lucide-react";
import { trackPricingView } from "@/lib/analytics";

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    trackPricingView(billingPeriod);
  }, [billingPeriod]);
  
  // UPI Simulator States
  const [simName, setSimName] = useState("Ramesh Patil");
  const [simAmount, setSimAmount] = useState("501");
  const [qrGenerated, setQrGenerated] = useState(false);

  const plans = [
    {
      name: "Professional",
      marathi: "व्यावसायिक",
      priceMonthly: 99,
      priceYearly: 799,
      desc: "Perfect for active Ganesh/Navratri Mandals, Temple Trusts, Housing Societies, and community organizations.",
      features: [
        "Unlimited Receipts",
        "WhatsApp Receipt Delivery",
        "Donor Database",
        "Pending Collection Tracking",
        "PDF Export",
        "JPG Export",
        "Multi-Device Access",
        "Branding & Signatures",
        "Dashboard Reports",
        "Backup & Restore"
      ],
      cta: "Start Free Trial",
      href: "/request-demo",
      popular: true
    },
    {
      name: "Enterprise",
      marathi: "उद्योग",
      priceMonthly: "Custom",
      priceYearly: "Custom",
      desc: "Designed for large temple trusts and NGOs with high-volume collection drives.",
      features: [
        "White Label",
        "Custom Branding",
        "Dedicated Support",
        "API Integrations",
        "Advanced Reporting",
        "Priority Onboarding"
      ],
      cta: "Contact Sales / Demo",
      href: "/request-demo",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-cream-light font-sans text-neutral-800 flex flex-col justify-between">
      <Header />

      <main className="flex-1 pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
          
          {/* Header Banner */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-maroon/10 border border-maroon/20 text-maroon text-xs font-semibold uppercase tracking-wider">
              Transparent Pricing
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-maroon-dark tracking-tight leading-tight">
              Simple Plans for Mandals & Trusts
            </h1>
            <p className="text-sm md:text-base text-neutral-600 font-medium leading-relaxed">
              No hidden platform fees, no commissions on donations. Choose the volume that fits your festival size.
            </p>

            {/* Monthly / Yearly Toggle */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <span className={`text-xs sm:text-sm font-bold ${billingPeriod === "monthly" ? "text-maroon" : "text-neutral-500"}`}>
                Monthly Billing
              </span>
              <button
                onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "yearly" : "monthly")}
                className="w-12 h-6 bg-maroon rounded-full p-1 transition-colors duration-200 focus:outline-none relative"
                aria-label="Toggle billing period"
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                    billingPeriod === "yearly" ? "translate-x-6" : "translate-x-0"
                  }`}
                ></div>
              </button>
              <span className={`text-xs sm:text-sm font-bold ${billingPeriod === "yearly" ? "text-maroon" : "text-neutral-500"} flex items-center gap-1`}>
                <span>Yearly Billing</span>
                <span className="bg-green-brand text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                  Save 30%
                </span>
              </span>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
            {plans.map((plan) => {
              const price = billingPeriod === "monthly" ? plan.priceMonthly : plan.priceYearly;
              const isCustom = price === "Custom";
              return (
                <div
                  key={plan.name}
                  className={`bg-white rounded-3xl border shadow-sm p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                    plan.popular
                      ? "border-orange-brand/50 shadow-md ring-2 ring-orange-brand/20 -translate-y-2 md:-translate-y-4"
                      : "border-maroon/10 hover:border-maroon/30"
                  }`}
                >
                  {/* Popular Banner */}
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-orange-brand text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl">
                      Most Popular
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h3 className="text-xl font-extrabold text-maroon-dark">{plan.name}</h3>
                      <p className="text-xs text-orange-brand font-bold devanagari">{plan.marathi}</p>
                    </div>

                    <div className="flex items-baseline">
                      {isCustom ? (
                        <span className="text-3xl font-black text-neutral-850 tracking-tight">
                          Custom Pricing
                        </span>
                      ) : (
                        <>
                          <span className="text-2xl font-bold text-neutral-850">₹</span>
                          <span className="text-4xl sm:text-5xl font-black text-neutral-850 tracking-tight">
                            {price}
                          </span>
                          <span className="text-neutral-500 text-xs font-semibold ml-1.5">
                            /{billingPeriod === "monthly" ? "month" : "year"}
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                      {plan.desc}
                    </p>

                    <hr className="border-neutral-100" />

                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-neutral-700 font-semibold">
                          <Check className="w-4 h-4 text-green-brand shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-8">
                    <a
                      href={plan.href}
                      className={`w-full text-center block font-bold text-xs sm:text-sm py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md ${
                        plan.popular
                          ? "bg-maroon hover:bg-maroon-light text-white"
                          : "bg-cream-brand hover:bg-cream-dark text-maroon"
                      }`}
                    >
                      {plan.cta}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trust Badges Section */}
          <div className="bg-white p-8 rounded-3xl border border-maroon/10 shadow-lg max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-center">
              {[
                { icon: "🔒", title: "Secure Cloud Storage", desc: "Military-grade data isolation & daily backups." },
                { icon: "📱", title: "WhatsApp Enabled", desc: "Instant PDF receipts pushed automatically." },
                { icon: "👥", title: "Multi-Device Support", desc: "Unlimited collectors sync concurrently." },
                { icon: "📋", title: "Complete Audit Trail", desc: "Tamper-proof volunteer transaction tracking." }
              ].map((badge, idx) => (
                <div key={idx} className="space-y-2 p-4 rounded-2xl hover:bg-cream-brand/20 transition-colors duration-250">
                  <span className="text-3xl block">{badge.icon}</span>
                  <h4 className="font-extrabold text-sm text-maroon-dark">{badge.title}</h4>
                  <p className="text-[11px] text-neutral-600 font-semibold">{badge.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* INTERACTIVE UPI SIMULATOR */}
          <div className="bg-white p-6 sm:p-10 rounded-3xl border border-maroon/10 shadow-lg grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-brand/10 border border-green-brand/20 text-green-brand text-xs font-semibold uppercase tracking-wider">
                Live Feature Demo
              </span>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-maroon-dark">
                  Direct P2P UPI QR Code Generator
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 font-semibold leading-relaxed">
                  Experience how PavtiBook helps volunteers collect money directly. Enter a test name and donation amount to generate a simulated merchant UPI deep link QR. Donors scan and pay directly with zero middleman gateway charges.
                </p>
              </div>

              {/* Input Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-neutral-700 uppercase">Test Donor Name</label>
                  <input
                    type="text"
                    value={simName}
                    onChange={(e) => {
                      setSimName(e.target.value);
                      setQrGenerated(false);
                    }}
                    placeholder="Donor Name"
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-xs outline-none focus:bg-white focus:border-maroon font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-neutral-700 uppercase">Donation Amount (₹)</label>
                  <input
                    type="number"
                    value={simAmount}
                    onChange={(e) => {
                      setSimAmount(e.target.value);
                      setQrGenerated(false);
                    }}
                    placeholder="e.g. 501"
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-xs outline-none focus:bg-white focus:border-maroon font-bold text-maroon"
                  />
                </div>
              </div>

              <button
                onClick={() => setQrGenerated(true)}
                className="bg-maroon hover:bg-maroon-light text-white font-bold text-xs px-6 py-3 rounded-lg shadow flex items-center gap-2 group cursor-pointer"
              >
                <span>Generate Demo UPI QR</span>
                <QrCode className="w-4 h-4" />
              </button>
            </div>

            {/* QR display visual mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="bg-[#FFFDF9] traditional-border p-5 rounded-2xl shadow-md w-full max-w-[280px] text-center space-y-4">
                <p className="text-[9px] font-bold text-maroon devanagari">॥ श्री गणेश प्रसन्न ॥</p>
                <div className="border border-neutral-100 p-4 bg-white rounded-xl flex items-center justify-center aspect-square max-w-[180px] mx-auto">
                  {qrGenerated ? (
                    /* Rendered mock QR */
                    <div className="space-y-2 animate-in fade-in duration-300 flex flex-col items-center">
                      <svg className="w-32 h-32 text-neutral-900" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2 2h6v6H2V2zm1 1v4h4V3H3zm11-1h6v6h-6V2zm1 1v4h4V3h-4zM2 14h6v6H2v-6zm1 1v4h4v-4H3zm13-1h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm-2-2h2v2h-2v-2zm0-2h2v2h-2v-2zm4-2h2v2h-2V8zm-2 2h2v2h-2v-2z" />
                      </svg>
                      <p className="text-[8px] font-extrabold text-neutral-700">UPI Link Pre-filled: ₹{simAmount}</p>
                    </div>
                  ) : (
                    <div className="text-neutral-400 text-center space-y-2 py-8">
                      <QrCode className="w-12 h-12 mx-auto stroke-1" />
                      <p className="text-[9px] font-bold">Awaiting inputs...</p>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-neutral-800">{simName || "Test Donor"}</p>
                  <p className="text-xs font-black text-maroon">₹ {simAmount || "0"}/-</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing FAQ short section */}
          <div className="space-y-6">
            <h4 className="text-center font-extrabold text-xl text-maroon-dark border-b border-neutral-100 pb-3">
              Pricing Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs sm:text-sm text-neutral-700 font-medium">
              <div className="space-y-1">
                <h5 className="font-bold text-neutral-900">Are there any transaction commission charges?</h5>
                <p className="text-neutral-600">No. Standard payment processors charge 1.5% to 3% per transaction. PavtiBook uses P2P UPI routing where donors pay your trust VPA bank details directly. We charge 0% commission.</p>
              </div>
              <div className="space-y-1">
                <h5 className="font-bold text-neutral-900">Can we cancel or upgrade our subscription?</h5>
                <p className="text-neutral-600">Yes. You can upgrade, downgrade, or cancel your subscription at any time. When you cancel, your donor database and files will remain in read-only format for compliance audits.</p>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
