"use server";

import { db } from "@/lib/firebase";
import { checkRateLimit, getClientIp, sanitizeInput, validateMobile } from "@/lib/security";
import { FieldValue } from "firebase-admin/firestore";

export interface DownloadSubmission {
  name: string;
  mobile: string;
  orgName: string;
  honeypot?: string;
}

export async function submitDownloadLead(formData: DownloadSubmission) {
  try {
    // 1. Honeypot Spam Protection
    if (formData.honeypot && formData.honeypot.trim().length > 0) {
      console.warn("Spam Bot Detected via Honeypot Trigger on Download Form.");
      return { success: true, message: "Download lead recorded successfully!" };
    }

    // 2. Rate Limiting Protection (Max 5 submissions per 15 minutes)
    const ip = await getClientIp();
    const isAllowed = checkRateLimit(ip);
    if (!isAllowed) {
      return {
        success: false,
        message: "You have exceeded the maximum request limit. Please try again after 15 minutes.",
      };
    }

    // 3. Input Validation & Sanitization
    const name = sanitizeInput(formData.name);
    const mobile = formData.mobile.replace(/[\s+()-]+/g, "");
    const organization = sanitizeInput(formData.orgName);

    // Empty input protection
    if (!name || !mobile || !organization) {
      return { success: false, message: "Required input fields are empty." };
    }

    // Validate 10-digit Indian Mobile Format
    if (!validateMobile(mobile)) {
      return { success: false, message: "Please enter a valid 10-digit Indian mobile number." };
    }

    // 4. Firestore DB Persistence
    if (!db) {
      console.warn("Firestore not configured. Simulating successful local save for download lead.");
      return { success: true, message: "Download lead recorded successfully! (Local DB Simulation)" };
    }

    await db.collection("website_download_requests").add({
      name,
      mobile,
      organization,
      source: "website",
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true, message: "Download lead recorded successfully!" };
  } catch (error) {
    console.error("Firestore Error in Download Form capture:", error);
    return { success: false, message: "An unexpected error occurred. Please try again later." };
  }
}
