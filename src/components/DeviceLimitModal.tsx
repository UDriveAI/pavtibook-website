"use client";

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../lib/i18n";
import { ShieldAlert, RefreshCw, X } from "lucide-react";

export default function DeviceLimitModal() {
  const { isDeviceLimitReached, retrySessionProvisioning, dismissDeviceLimit } = useAuth();
  const { t } = useLanguage();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryFeedback, setRetryFeedback] = useState<string | null>(null);

  if (!isDeviceLimitReached) return null;

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryFeedback(null);
    const success = await retrySessionProvisioning();
    setIsRetrying(false);
    if (!success) {
      setRetryFeedback(t("device_limit_message"));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-maroon/20 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-maroon-dark px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">{t("device_limit_title")}</h3>
              <p className="text-xs text-orange-200 font-medium">3 / 3 Active Devices</p>
            </div>
          </div>
          <button
            onClick={dismissDeviceLimit}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-neutral-700 leading-relaxed">
            {t("device_limit_message")}
          </p>

          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200 text-xs text-orange-900 space-y-1">
            <p className="font-semibold">सुरक्षा नियम / Security Rule:</p>
            <p>
              To protect temple trusts and mandal accounts, PavtiBook permits a maximum of 3 concurrent devices per user account.
            </p>
          </div>

          {retryFeedback && (
            <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200">
              {retryFeedback}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={dismissDeviceLimit}
            className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 font-semibold text-sm hover:bg-neutral-100 transition"
          >
            {t("close")}
          </button>
          <button
            type="button"
            disabled={isRetrying}
            onClick={handleRetry}
            className="px-5 py-2.5 rounded-xl bg-maroon-dark text-white font-semibold text-sm hover:bg-maroon transition flex items-center gap-2 disabled:opacity-50"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Checking...</span>
              </>
            ) : (
              <span>{t("retry")}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
