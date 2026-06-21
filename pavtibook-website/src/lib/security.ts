import { headers } from "next/headers";

/**
 * Security & Input Validation Helpers
 * Rate limiting, honeypot protection, and input sanitization.
 */

// In-memory rate limiting storage
// Key: IP Address, Value: Array of timestamps
const rateLimitCache = new Map<string, number[]>();

export async function getClientIp(): Promise<string> {
  const reqHeaders = await headers();
  
  // Vercel or cloud proxy header
  const forwardedFor = reqHeaders.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIp = reqHeaders.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  
  return "127.0.0.1";
}

/**
 * Check if the request exceeds rate limits
 * Limit: 5 submissions per IP per 15 minutes
 */
export function checkRateLimit(ip: string): boolean {
  // TODO: Replace with Upstash Redis before high-scale deployment.
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const limit = 5;

  const timestamps = rateLimitCache.get(ip) || [];
  
  // Filter out timestamps older than the 15-minute window
  const activeTimestamps = timestamps.filter((time) => now - time < windowMs);
  
  if (activeTimestamps.length >= limit) {
    return false; // Rate limit exceeded
  }
  
  activeTimestamps.push(now);
  rateLimitCache.set(ip, activeTimestamps);
  return true; // Allowed
}

/**
 * Sanitize strings to prevent XSS and HTML injections
 */
export function sanitizeInput(val: string): string {
  if (!val) return "";
  return val
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // strip scripts
    .replace(/(<([^>]+)>)/gi, "") // strip HTML tags
    .trim();
}

/**
 * Validates Indian Mobile Format (10 digits starting with 6-9)
 */
export function validateMobile(mobile: string): boolean {
  const clean = mobile.replace(/[\s+()-]+/g, "");
  return /^[6-9]\d{9}$/.test(clean);
}

/**
 * Validates Email Format
 */
export function validateEmail(email: string): boolean {
  if (!email || email.trim() === "") return true; // Optional field check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}
