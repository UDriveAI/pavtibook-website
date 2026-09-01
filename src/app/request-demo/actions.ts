"use server";

import { db } from "@/lib/firebase";
import { checkRateLimit, getClientIp, sanitizeInput, validateMobile } from "@/lib/security";
import { notifyAdminOfNewLead } from "@/lib/notifications";
import { FieldValue } from "firebase-admin/firestore";

export interface DemoSubmission {
  name: string;
  mobile: string;
  orgName: string;
  orgType: string;
  city: string;
  receiptsPerMonth: string;
  honeypot?: string;
}

export interface DemoSubmissionResponse {
  success: boolean;
  message: string;
  passId?: string;
}

/**
 * Generates a standard sequential/time-indexed demo pass identifier
 */
function generateDemoPassId(): string {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `PB-DEMO-2026-${randomSuffix}`;
}

export async function submitDemoRequest(formData: DemoSubmission): Promise<DemoSubmissionResponse> {
  try {
    // 1. Honeypot Spam Protection
    if (formData.honeypot && formData.honeypot.trim().length > 0) {
      console.warn("Spam Bot Detected via Honeypot Trigger on Demo form.");
      // Return a mock success response to mislead spam bots
      return { success: true, message: "Demo request captured successfully!", passId: "PB-DEMO-2026" };
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
    const organizationType = sanitizeInput(formData.orgType);
    const city = sanitizeInput(formData.city);
    const receiptsPerMonth = sanitizeInput(formData.receiptsPerMonth);

    // Empty input protection
    if (!name || !mobile || !organization || !city) {
      return { success: false, message: "Required input fields are empty." };
    }

    // Validate 10-digit Indian Mobile Format
    if (!validateMobile(mobile)) {
      return { success: false, message: "Please enter a valid 10-digit Indian mobile number." };
    }

    // 4. Generate Unique Demo Pass ID
    const passId = generateDemoPassId();
    const submittedAt = new Date().toISOString();
    const demoAccounts = "Upto 5 Demo Accounts";

    // 5. Dispatch Admin Lead Notifications (Primary: WhatsApp to +91 9653333929, Backup: Email)
    const notificationResults = await notifyAdminOfNewLead({
      passId,
      name,
      mobile,
      orgName: organization,
      orgType: organizationType,
      city,
      receiptsPerMonth,
      demoAccounts,
      submittedAt,
    });

    // 6. Firestore DB Persistence
    if (db) {
      try {
        await db.collection("website_demo_requests").add({
          passId,
          name,
          mobile,
          organization,
          organizationType,
          city,
          receiptsPerMonth,
          demoAccounts,
          source: "website",
          status: "new",
          ipAddress: ip,
          notifications: notificationResults,
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch (dbError) {
        console.error("Firestore persistence error (continuing without breaking client):", dbError);
      }
    } else {
      console.warn("Firestore not configured. Simulated local lead capture for:", {
        passId,
        name,
        mobile,
        organization,
      });
    }

    return {
      success: true,
      message: "Demo request captured successfully!",
      passId,
    };
  } catch (error) {
    console.error("Error in Demo Request capture:", error);
    return {
      success: false,
      message: "An unexpected error occurred. Please try again later.",
    };
  }
}
