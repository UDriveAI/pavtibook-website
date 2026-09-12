"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/lib/i18n";
import { getOrCreateWebDeviceId, revokeRemoteDeviceSession } from "@/lib/device";

export interface DeviceSession {
  deviceId: string;
  deviceName: string;
  deviceModel?: string;
  osVersion?: string;
  platform?: string;
  appVersion?: string;
  status: string;
  isActive: boolean;
  createdAt?: string;
  lastActiveAt?: string;
  updatedAt?: string;
  revokedAt?: string;
  revokedBy?: string;
}

export default function LoggedInDevicesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [currentDeviceId, setCurrentDeviceId] = useState<string>("");
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [deviceToRevoke, setDeviceToRevoke] = useState<DeviceSession | null>(null);

  useEffect(() => {
    setCurrentDeviceId(getOrCreateWebDeviceId());
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setDevices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const devicesRef = collection(db, "users", user.uid, "devices");

    const unsubscribe = onSnapshot(
      devicesRef,
      (snapshot) => {
        const list: DeviceSession[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const parseDate = (val: unknown): string | undefined => {
            if (!val) return undefined;
            if (typeof val === "object" && val !== null && "toDate" in val) {
              return (val as { toDate: () => Date }).toDate().toISOString();
            }
            if (typeof val === "string") return val;
            return undefined;
          };

          return {
            deviceId: data.deviceId || docSnap.id,
            deviceName: data.deviceName || data.deviceModel || "Unknown Device",
            deviceModel: data.deviceModel || "",
            osVersion: data.osVersion || "Unknown OS",
            platform: data.platform || "web",
            appVersion: data.appVersion || "1.1.7",
            status: data.status || "active",
            isActive: data.isActive === true,
            createdAt: parseDate(data.createdAt),
            lastActiveAt: parseDate(data.lastActiveAt) || parseDate(data.updatedAt),
            updatedAt: parseDate(data.updatedAt),
            revokedAt: parseDate(data.revokedAt),
            revokedBy: data.revokedBy,
          };
        });

        list.sort((a, b) => {
          const aActive = a.status === "active" && a.isActive;
          const bActive = b.status === "active" && b.isActive;
          if (aActive && !bActive) return -1;
          if (!aActive && bActive) return 1;
          const aTime = a.lastActiveAt || a.createdAt || "";
          const bTime = b.lastActiveAt || b.createdAt || "";
          return bTime.localeCompare(aTime);
        });

        setDevices(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching devices:", err);
        setError("Unable to load logged-in devices. Please check your internet connection.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const activeDevices = devices.filter((d) => d.status === "active" && d.isActive);
  const inactiveDevices = devices.filter((d) => !(d.status === "active" && d.isActive));

  activeDevices.sort((a, b) => {
    const aIsCurrent = a.deviceId === currentDeviceId;
    const bIsCurrent = b.deviceId === currentDeviceId;
    if (aIsCurrent && !bIsCurrent) return -1;
    if (!aIsCurrent && bIsCurrent) return 1;
    return 0;
  });

  const maxDevices = 3;
  const isAtLimit = activeDevices.length >= maxDevices;

  const handleRevoke = async (device: DeviceSession) => {
    setRevokingId(device.deviceId);
    try {
      const result = await revokeRemoteDeviceSession(device.deviceId);
      if (!result.success) {
        alert(result.message || "Failed to log out device.");
      }
    } catch {
      alert("An unexpected error occurred while logging out device.");
    } finally {
      setRevokingId(null);
      setDeviceToRevoke(null);
    }
  };

  const getDeviceIcon = (platform?: string) => {
    const p = (platform || "").toLowerCase();
    if (p.includes("ios") || p.includes("apple") || p.includes("iphone") || p.includes("ipad")) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    if (p.includes("web") || p.includes("chrome") || p.includes("browser") || p.includes("desktop")) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  };

  const formatLastActive = (dateStr?: string) => {
    if (!dateStr) return "Not available";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Not available";
    const diffSecs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSecs < 60) return "Just now";
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    if (diffSecs < 172800) return "Yesterday";
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-900">{t("devices_title")}</h1>
          <p className="text-xs text-gray-500">Manage active sessions across your mobile, tablet, and browser devices</p>
        </div>
      </div>

      <div className="bg-[#FFF6E8] border border-[#F47C20]/30 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-[#F47C20]/10 rounded-xl text-[#F47C20]">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="text-xs text-[#2E1C0C] leading-relaxed">
          <p className="font-bold mb-0.5">Secure Multi-Device Sync</p>
          <p className="text-gray-600">
            These are the devices currently authenticated to your PavtiBook account. If you see an unrecognized device, log it out immediately.
          </p>
        </div>
      </div>

      <div
        className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${
          isAtLimit
            ? "bg-red-50/70 border-red-200 text-red-900"
            : "bg-emerald-50/70 border-emerald-200 text-emerald-900"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <svg
            className={`w-5 h-5 ${isAtLimit ? "text-red-700" : "text-emerald-700"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-bold">
            {activeDevices.length} of {maxDevices} {t("devices_slot_indicator")}
          </span>
        </div>
        {isAtLimit && (
          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-red-600 text-white">
            {t("device_limit_reached")}
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-center text-sm text-red-800">
          <p className="font-bold">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-black/5 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#8B1E2D] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs text-gray-500 font-medium">Loading devices...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-[#8B1E2D] tracking-wider uppercase">
                {t("devices_active_sessions")} ({activeDevices.length})
              </h2>
            </div>

            {activeDevices.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-black/5 text-center text-gray-500 text-sm">
                No active device sessions found.
              </div>
            ) : (
              <div className="space-y-3">
                {activeDevices.map((device) => {
                  const isCurrent = device.deviceId === currentDeviceId;
                  const isRevoking = revokingId === device.deviceId;

                  return (
                    <div
                      key={device.deviceId}
                      className={`bg-white rounded-2xl p-4 md:p-5 border transition ${
                        isCurrent
                          ? "border-[#8B1E2D] shadow-xs"
                          : "border-black/5 hover:border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-3 rounded-xl ${
                              isCurrent
                                ? "bg-[#8B1E2D]/10 text-[#8B1E2D]"
                                : "bg-[#F47C20]/10 text-[#F47C20]"
                            }`}
                          >
                            {getDeviceIcon(device.platform)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-gray-900 text-sm md:text-base">
                                {device.deviceName}
                              </h3>
                              {isCurrent && (
                                <span className="bg-[#8B1E2D] text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                                  {t("devices_this_device")}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {device.osVersion} • App v{device.appVersion}
                            </p>
                          </div>
                        </div>

                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Active
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeviceToRevoke(device)}
                            disabled={isRevoking}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 transition cursor-pointer disabled:opacity-50"
                          >
                            {isRevoking ? "Logging out..." : t("devices_logout_action")}
                          </button>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                        <span>
                          {t("devices_last_active")}: {formatLastActive(device.lastActiveAt)}
                        </span>
                        <span className="font-mono text-gray-400">
                          ID: {device.deviceId.length > 16 ? `...${device.deviceId.slice(-8)}` : device.deviceId}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {inactiveDevices.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="w-full flex items-center justify-between py-2 text-xs font-bold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition"
              >
                <span>
                  {t("devices_previous_sessions")} ({inactiveDevices.length})
                </span>
                <svg
                  className={`w-4 h-4 transform transition-transform ${
                    showInactive ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showInactive && (
                <div className="mt-3 space-y-3">
                  {inactiveDevices.map((device) => (
                    <div
                      key={device.deviceId}
                      className="bg-gray-50/70 rounded-2xl p-4 border border-gray-200/60"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-gray-200 text-gray-500 rounded-xl">
                            {getDeviceIcon(device.platform)}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-700 text-sm">
                              {device.deviceName}
                            </h4>
                            <p className="text-xs text-gray-400">
                              {device.osVersion} • App v{device.appVersion}
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-1 rounded bg-gray-200 text-gray-600">
                          {device.status === "revoked" ? "Revoked" : "Logged out"}
                        </span>
                      </div>
                      <div className="mt-3 pt-2 border-t border-gray-200/40 text-[11px] text-gray-400 flex items-center justify-between">
                        <span>Last active: {formatLastActive(device.lastActiveAt)}</span>
                        <span className="font-mono">
                          ID: {device.deviceId.length > 16 ? `...${device.deviceId.slice(-8)}` : device.deviceId}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {deviceToRevoke && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFF6E8] rounded-2xl max-w-md w-full p-6 border border-black/10 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-[#8B1E2D]">
              Log out this device?
            </h3>
            <p className="text-sm text-[#2E1C0C]">
              This will immediately sign out PavtiBook on{" "}
              <strong className="font-bold">{deviceToRevoke.deviceName}</strong>. Anyone using that device will need to log in again.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeviceToRevoke(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-xl hover:bg-black/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevoke(deviceToRevoke)}
                className="px-5 py-2 text-xs font-bold text-white bg-[#8B1E2D] hover:bg-[#721824] rounded-xl transition shadow-xs"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
