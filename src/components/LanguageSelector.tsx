"use client";

import React from "react";
import { useLanguage, Language } from "../lib/i18n";
import { Globe } from "lucide-react";

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  const options: { code: Language; label: string }[] = [
    { code: "en", label: "English" },
    { code: "mr", label: "मराठी" },
    { code: "hi", label: "हिंदी" },
  ];

  return (
    <div className="inline-flex items-center gap-1.5 bg-white/80 border border-neutral-300 rounded-full px-2.5 py-1 text-xs font-semibold shadow-xs">
      <Globe className="w-3.5 h-3.5 text-neutral-500" />
      <div className="flex items-center gap-1">
        {options.map((opt) => (
          <button
            key={opt.code}
            type="button"
            onClick={() => setLanguage(opt.code)}
            className={`px-2 py-0.5 rounded-full transition-all ${
              language === opt.code
                ? "bg-maroon-dark text-white shadow-xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
