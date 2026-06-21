"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";

export default function PromoBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check localStorage for dismissal state
    const isDismissed = localStorage.getItem("pavtibook_banner_dismissed");
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("pavtibook_banner_dismissed", "true");
    setIsVisible(false);
    
    // Dispatch a custom event to notify Header about layout height adjustment
    window.dispatchEvent(new Event("promo_banner_toggled"));
  };

  if (!isVisible) return null;

  return (
    <div className="bg-maroon text-gold-brand px-4 py-2 sm:py-2.5 text-center relative z-50 flex items-center justify-center flex-wrap gap-2 text-xs sm:text-sm font-bold border-b border-gold-brand/20 shadow-md">
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <span>🚀 Founding Member Launch Offer</span>
        <span className="hidden sm:inline text-cream-brand/50">|</span>
        <span className="text-white">First 100 Organizations Only</span>
        <span className="hidden sm:inline text-cream-brand/50">|</span>
        <span className="bg-orange-brand text-white px-2 py-0.5 rounded text-[10px] sm:text-xs">
          ₹99/month
        </span>
        <span className="text-cream-brand font-medium text-[11px] sm:text-xs">
          (Digital Receipts + WhatsApp Delivery + Donor Database)
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/request-demo"
          className="bg-gold-brand hover:bg-gold-light text-maroon font-extrabold text-[11px] sm:text-xs px-3 py-1 rounded-lg transition-colors duration-200 flex items-center gap-1 shrink-0"
        >
          <span>Request Free Demo</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
        
        <button
          onClick={handleDismiss}
          className="text-cream-brand/60 hover:text-white transition-colors duration-200 p-0.5 rounded-full hover:bg-white/5 focus:outline-none"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
