"use server";

import { db } from "@/lib/firebase";
import { checkRateLimit, getClientIp, sanitizeInput, validateMobile, validateEmail } from "@/lib/security";
import { FieldValue } from "firebase-admin/firestore";

export interface ContactSubmission {
  name: string;
  mobile: string;
  email: string;
  subject: string;
  message: string;
  honeypot?: string;
}

export async function submitContactForm(formData: ContactSubmission) {
  try {
    // 1. Honeypot Spam Protection
    if (formData.honeypot && formData.honeypot.trim().length > 0) {
      console.warn("Spam Bot Detected via Honeypot Trigger on Contact form.");
      return { success: true, message: "Contact message saved successfully!" };
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
    const email = sanitizeInput(formData.email);
    const subject = sanitizeInput(formData.subject);
    const message = sanitizeInput(formData.message);

    // Empty input protection
    if (!name || !mobile || !message) {
      return { success: false, message: "Required input fields are empty." };
    }

    // Validate 10-digit Indian Mobile Format
    if (!validateMobile(mobile)) {
      return { success: false, message: "Please enter a valid 10-digit Indian mobile number." };
    }

    // Validate optional email structure
    if (email && !validateEmail(email)) {
      return { success: false, message: "Please enter a valid email address." };
    }

    // 4. Firestore DB Persistence
    if (!db) {
      console.warn("Firestore not configured. Simulating successful local save for contact inquiry.");
      return { success: true, message: "Contact message saved successfully! (Local DB Simulation)" };
    }

    await db.collection("website_contact_requests").add({
      name,
      mobile,
      email: email || null,
      subject,
      message,
      source: "website",
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true, message: "Contact message saved successfully!" };
  } catch (error) {
    console.error("Firestore Error in Contact Form capture:", error);
    return { success: false, message: "An unexpected error occurred. Please try again later." };
  }
}
