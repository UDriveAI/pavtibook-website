"use client";

import { useState, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { trackWhatsAppClick } from "@/lib/analytics";

/**
 * Floating WhatsApp Widget
 * Checks for NEXT_PUBLIC_WHATSAPP_NUMBER and disables safely if missing.
 */
export default function WhatsAppButton() {
  const [whatsAppLink, setWhatsAppLink] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Generate support text query link
    const link = generateWhatsAppLink("नमस्कार PavtiBook Team, मला PavtiBook बद्दल माहिती हवी आहे.");
    setWhatsAppLink(link);
  }, []);

  const hasConfig = whatsAppLink !== null;

  const tooltipText = hasConfig
    ? isHovered
      ? "Talk to PavtiBook Team"
      : "Demo साठी WhatsApp करा"
    : "WhatsApp Support Not Configured";

  const buttonContent = (
    <div className="relative group">
      {/* Outer Pulse glow rings - only animated if active */}
      {hasConfig && (
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping -z-10"></span>
      )}
      
      {/* Main Button */}
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
          hasConfig
            ? "bg-emerald-500 hover:bg-emerald-600 hover:scale-110 active:scale-95 text-white cursor-pointer"
            : "bg-neutral-400 text-neutral-200 cursor-not-allowed"
        }`}
      >
        <MessageSquare className="w-7 h-7 fill-current shrink-0" />
      </div>

      {/* Tooltip Popup */}
      <div
        className={`absolute right-16 top-1/2 -translate-y-1/2 bg-neutral-900 text-white text-[11px] sm:text-xs font-bold py-1.5 px-3 rounded-lg shadow-md whitespace-nowrap transition-all duration-200 pointer-events-none ${
          isHovered
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-2"
        }`}
      >
        {tooltipText}
        <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-neutral-900 rotate-45"></div>
      </div>
    </div>
  );

  return (
    <div
      className="fixed bottom-6 right-6 z-45"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {hasConfig && whatsAppLink ? (
        <a
          href={whatsAppLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackWhatsAppClick("floating_widget")}
          aria-label="Contact PavtiBook on WhatsApp"
        >
          {buttonContent}
        </a>
      ) : (
        <button
          disabled
          aria-label="WhatsApp Support Not Configured"
          className="focus:outline-none cursor-not-allowed"
        >
          {buttonContent}
        </button>
      )}
    </div>
  );
}
