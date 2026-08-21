"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Check,
  QrCode,
  MessageSquare
} from "lucide-react";
import { trackPricingView, trackWhatsAppClick } from "@/lib/analytics";
import { generatePricingWhatsAppLink, getFormattedWhatsAppDisplay } from "@/lib/whatsapp";

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const displayPhone = getFormattedWhatsAppDisplay();

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
      priceYearly: 999,
      desc: "Perfect for active Ganesh/Navratri Mandals, Temple Trusts, Housing Societies, and community organizations.",
      features: [
        "Unlimited Receipt Generation",
        "Dashboard Reports & Daily Tally",
        "PDF & JPG Receipt Export",
        "Full Donor Directory & History",
        "Pending Vargani Reminders",
        "CSV & Excel File Export",
        "Unlimited WhatsApp Share Now",
        "Multi-Device Volunteer Access",
        "Custom Branding, Logo & Signatures"
      ],
      cta: "Start Free Trial",
      href: "/request-demo",
      popular: false,
      savings: 189
    },
    {
      name: "Premium",
      marathi: "प्रीमियम",
      priceMonthly: 199,
      priceYearly: 1999,
      desc: "Designed for busy collection drives requiring automatic WhatsApp delivery and priority assistance.",
      features: [
        "Everything in Professional Plan",
        "Auto WhatsApp Receipt Send",
        "Up to 1,000 Auto Sends per month",
        "Custom Deity Watermarks & Themes",
        "Priority Technical Assistance",
        "Unlimited WhatsApp Share Now",
        "Advanced Collection Analytics",
        "Multi-User Role Control"
      ],
      cta: "Book Free Demo",
      href: "/request-demo",
      popular: true,
      savings: 389
    }
  ];

  return (
    <div className="min-h-screen bg-cream-light font-sans text-neutral-800 flex flex-col justify-between">
      <Header />

      <main className="flex-1 pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          
          {/* Header Banner */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-maroon/10 border border-maroon/20 text-maroon text-xs font-semibold uppercase tracking-wider">
              Transparent Pricing (पारदर्शक दर)
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-maroon-dark tracking-tight leading-tight">
              Simple Plans for Mandals & Trusts
            </h1>
            <p className="text-sm md:text-base text-neutral-600 font-medium leading-relaxed">
              No hidden platform fees, no commissions on donations. Choose the plan that fits your festival size.
            </p>

            {/* Monthly / Yearly Toggle */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <span className={`text-xs sm:text-sm font-bold ${billingPeriod === "monthly" ? "text-maroon" : "text-neutral-500"}`}>
                Monthly Billing
              </span>
              <button
                onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "yearly" : "monthly")}
                className="w-12 h-6 bg-maroon rounded-full p-1 transition-colors duration-200 focus:outline-none relative cursor-pointer"
                aria-label="Toggle billing period"
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                    billingPeriod === "yearly" ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
              <span className={`text-xs sm:text-sm font-bold ${billingPeriod === "yearly" ? "text-maroon" : "text-neutral-500"} flex items-center gap-1`}>
                <span>Yearly Billing</span>
                <span className="bg-emerald-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                  Save 30%
                </span>
              </span>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
            {plans.map((plan) => {
              const price = billingPeriod === "monthly" ? plan.priceMonthly : plan.priceYearly;
              return (
                <div
                  key={plan.name}
                  className={`bg-white rounded-3xl border shadow-sm p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                    plan.popular
                      ? "border-orange-brand/50 shadow-md ring-2 ring-orange-brand/20 -translate-y-1 md:-translate-y-2"
                      : "border-maroon/10 hover:border-maroon/30"
                  }`}
                >
                  {/* Popular Banner */}
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-orange-brand text-white text-[9px] font-black uppercase tracking-wider px-3.5 py-1 rounded-bl-xl">
                      Most Popular
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-maroon-dark">{plan.name}</h3>
                      <p className="text-xs text-orange-brand font-bold devanagari">{plan.marathi}</p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-baseline">
                        <span className="text-2xl font-bold text-neutral-800">₹</span>
                        <span className="text-4xl sm:text-5xl font-black text-neutral-900 tracking-tight">
                          {price}
                        </span>
                        <span className="text-neutral-500 text-xs font-semibold ml-1.5">
                          /{billingPeriod === "monthly" ? "month" : "year"}
                        </span>
                      </div>
                      {billingPeriod === "yearly" && (
                        <p className="text-xs font-bold text-emerald-700">
                          Save ₹{plan.savings}/year with annual billing
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                      {plan.desc}
                    </p>

                    <hr className="border-neutral-100" />

                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-neutral-700 font-semibold">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-8 space-y-3">
                    <Link
                      href={plan.href}
                      className={`w-full text-center block font-bold text-xs sm:text-sm py-3.5 rounded-xl transition-all duration-200 shadow-xs hover:shadow ${
                        plan.popular
                          ? "bg-maroon hover:bg-maroon-light text-white"
                          : "bg-cream-brand hover:bg-cream-dark text-maroon border border-maroon/20"
                      }`}
                    >
                      {plan.cta}
                    </Link>

                    <a
                      href={generatePricingWhatsAppLink(plan.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackWhatsAppClick(`pricing_plan_${plan.name.toLowerCase()}`)}
                      className="w-full text-center flex items-center justify-center gap-1.5 text-emerald-700 text-xs font-bold hover:underline"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Ask questions about {plan.name} on WhatsApp</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trust Badges */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-maroon/10 shadow-sm max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-center">
              {[
                { icon: "🔒", title: "Secure Cloud Storage", desc: "Safe multi-tenant database & daily backups." },
                { icon: "📱", title: "WhatsApp Enabled", desc: "Instant PDF receipts pushed automatically." },
                { icon: "👥", title: "Multi-Device Support", desc: "Multiple volunteers collect concurrently." },
                { icon: "📋", title: "Complete Audit Trail", desc: "Verifiable transaction numbers & volunteer logs." }
              ].map((badge, idx) => (
                <div key={idx} className="space-y-1.5 p-3 rounded-2xl">
                  <span className="text-2xl block">{badge.icon}</span>
                  <h4 className="font-extrabold text-xs sm:text-sm text-maroon-dark">{badge.title}</h4>
                  <p className="text-[11px] text-neutral-600 font-medium">{badge.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* INTERACTIVE UPI SIMULATOR */}
          <div className="bg-white p-6 sm:p-10 rounded-3xl border border-maroon/10 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-4xl mx-auto">
            <div className="lg:col-span-7 space-y-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/70 border border-emerald-300 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                Live Feature Preview
              </span>
              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-black text-maroon-dark">
                  Direct P2P UPI QR Code Generator
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-medium">
                  Experience how PavtiBook helps volunteers collect funds directly. Enter a test name and donation amount to generate a simulated UPI deep link QR. Donors scan and pay directly to the trust with zero middleman gateway charges.
                </p>
              </div>

              {/* Form Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                className="bg-maroon hover:bg-maroon-light text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <span>Generate Demo UPI QR</span>
                <QrCode className="w-4 h-4" />
              </button>
            </div>

            {/* QR Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="bg-[#FFFDF9] traditional-border p-5 rounded-2xl shadow-md w-full max-w-[260px] text-center space-y-3">
                <p className="text-[9px] font-bold text-maroon devanagari">॥ श्री गणेश प्रसन्न ॥</p>
                <div className="border border-neutral-200 p-3 bg-white rounded-xl flex items-center justify-center aspect-square max-w-[160px] mx-auto">
                  {qrGenerated ? (
                    <div className="space-y-1.5 animate-in fade-in duration-300 flex flex-col items-center">
                      <QrCode className="w-24 h-24 text-neutral-900" />
                      <p className="text-[8px] font-extrabold text-emerald-700">UPI Link: ₹{simAmount}</p>
                    </div>
                  ) : (
                    <div className="text-neutral-400 text-center space-y-1.5 py-6">
                      <QrCode className="w-10 h-10 mx-auto stroke-1" />
                      <p className="text-[9px] font-semibold">Enter details & generate</p>
                    </div>
                  )}
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-neutral-800">{simName || "Test Donor"}</p>
                  <p className="text-xs font-black text-maroon">₹ {simAmount || "0"}/-</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing FAQ */}
          <div className="space-y-6 max-w-4xl mx-auto pt-6">
            <h4 className="text-center font-extrabold text-xl text-maroon-dark border-b border-neutral-200 pb-3">
              Pricing FAQs
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-neutral-700 font-medium">
              <div className="space-y-1">
                <h5 className="font-bold text-neutral-900">What is &quot;WhatsApp Share Now&quot; vs &quot;Auto WhatsApp Send&quot;?</h5>
                <p className="text-neutral-600 text-xs leading-relaxed"><strong>WhatsApp Share Now</strong> (both plans) opens the native share sheet to send the receipt via your WhatsApp app. <strong>Auto WhatsApp Send</strong> (Premium plan) delivers receipts automatically via our cloud backend.</p>
              </div>
              <div className="space-y-1">
                <h5 className="font-bold text-neutral-900">Are there any donation commissions?</h5>
                <p className="text-neutral-600 text-xs leading-relaxed">No. Standard payment gateways take 2% to 3%. PavtiBook uses direct P2P UPI routing to your trust bank account with 0% platform commission.</p>
              </div>
              <div className="space-y-1">
                <h5 className="font-bold text-neutral-900">Can we cancel our subscription anytime?</h5>
                <p className="text-neutral-600 text-xs leading-relaxed">Yes, you can upgrade, downgrade, or cancel at any time. When cancelled, your historical donor database remains safely accessible in read-only mode.</p>
              </div>
              <div className="space-y-1">
                <h5 className="font-bold text-neutral-900">Need a custom plan for very large trusts?</h5>
                <p className="text-neutral-600 text-xs leading-relaxed">For large temple trusts with multiple branch collections, contact us directly on WhatsApp ({displayPhone}) for customized volunteer packages.</p>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
