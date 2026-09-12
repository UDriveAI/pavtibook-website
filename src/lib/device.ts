"use client";

/**
 * Web Device Management and Session Provisioning
 * Implements 3-device-limit compliance equivalent to the Android client.
 * Uses persistent `pb_web_device_id` in localStorage.
 */

export interface DeviceProvisionResult {
  isAllowed: boolean;
  isLimitReached: boolean;
  activeCount?: number;
  errorMessage?: string;
}

export function getOrCreateWebDeviceId(): string {
  if (typeof window === "undefined") {
    return "web_server_placeholder";
  }

  const STORAGE_KEY = "pb_web_device_id";
  let deviceId = localStorage.getItem(STORAGE_KEY);

  if (!deviceId || deviceId.trim().length < 8) {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    deviceId = `web_${Date.now()}_${randomHex}`;
    try {
      localStorage.setItem(STORAGE_KEY, deviceId);
    } catch {
      // ignore localStorage quota error
    }
  }

  return deviceId;
}

export function getWebDeviceMetadata() {
  if (typeof window === "undefined") {
    return {
      deviceName: "Web Browser",
      deviceModel: "Unknown Browser",
      osVersion: "Web",
    };
  }

  const ua = navigator.userAgent;
  let browser = "Browser";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Firefox")) browser = "Firefox";

  let os = "Desktop";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Linux")) os = "Linux";

  return {
    deviceName: `${browser} on ${os}`,
    deviceModel: "Web Application",
    osVersion: os,
  };
}

/**
 * Server-authoritative session provisioning via Cloud Function.
 * Atomically enforces the 3-active-device limit.
 */
export async function provisionWebDeviceSession(
  idToken: string,
  organizationId?: string
): Promise<DeviceProvisionResult> {
  const deviceId = getOrCreateWebDeviceId();
  const metadata = getWebDeviceMetadata();

  const payload = {
    data: {
      deviceId,
      deviceName: metadata.deviceName,
      deviceModel: metadata.deviceModel,
      osVersion: metadata.osVersion,
      platform: "web",
      appVersion: "1.1.7+34",
      token: "", // Web FCM token (optional for Milestone 1)
      organizationId: organizationId || "",
      allowMarketingPush: true,
    },
  };

  try {
    const response = await fetch(
      "https://asia-south1-pavtibook-7251a.cloudfunctions.net/provisionDeviceSession",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const result = data.result || {};
      const outcome = result.outcome;
      const activeCount = result.activeCount ?? 0;

      if (outcome === "limitReached") {
        return {
          isAllowed: false,
          isLimitReached: true,
          activeCount,
          errorMessage: "device_limit_reached",
        };
      }

      return {
        isAllowed: true,
        isLimitReached: false,
        activeCount,
      };
    } else {
      const errData = await response.json().catch(() => null);
      const message = errData?.error?.message || "Failed to provision device session.";
      return {
        isAllowed: false,
        isLimitReached: false,
        errorMessage: message,
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error contacting session server.";
    return {
      isAllowed: false,
      isLimitReached: false,
      errorMessage: msg,
    };
  }
}

/**
 * Revoke a remote device session using the authoritative Cloud Function.
 */
export async function revokeRemoteDeviceSession(targetDeviceId: string): Promise<{ success: boolean; message?: string }> {
  const currentDeviceId = getOrCreateWebDeviceId();
  try {
    const { httpsCallable } = await import("firebase/functions");
    const { functions } = await import("./firebase-client");
    const revokeFn = httpsCallable<{ targetDeviceId: string; currentDeviceId: string }, { success: boolean; message?: string }>(
      functions,
      "revokeDeviceSession"
    );
    const res = await revokeFn({ targetDeviceId, currentDeviceId });
    return { success: res.data?.success ?? true, message: res.data?.message };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to revoke device session";
    return { success: false, message: msg };
  }
}

