import type { Metadata } from "next";
import VerifyPage from "./VerifyPage";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Receipt Verification — ${id}`,
    description: "Verify the authenticity of a PavtiBook digital receipt. Scan & Verify QR receipts issued by Ganesh Mandals, Temple Trusts, and NGOs across India.",
    robots: { index: false, follow: false },
  };
}

interface VerificationResult {
  isValid: boolean;
  receiptNumber?: string;
  donorName?: string;
  donorMobile?: string;
  amount?: number;
  purpose?: string;
  paymentMode?: string;
  paymentStatus?: string;
  date?: string;
  organizationName?: string;
  organizationType?: string;
  isOrganizationVerified?: boolean;
  message?: string;
  error?: boolean;
}

/**
 * Firestore direct fallback for pb_ tokens.
 * Uses FIREBASE_SERVICE_ACCOUNT_JSON (full service account JSON string).
 * This is more reliable than splitting into 3 env vars (avoids private key parsing issues).
 */
async function verifyFromFirestore(token: string): Promise<VerificationResult | null> {
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!saJson) return null;

  try {
    const { initializeApp, cert, getApps, getApp } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");

    const app = getApps().find(a => a.name === "pavtibook-verify") ??
      initializeApp({ credential: cert(JSON.parse(saJson)) }, "pavtibook-verify");

    const db = getFirestore(app);
    const snap = await db
      .collection("receipts")
      .where("qrCodeValue", "==", token)
      .limit(1)
      .get();

    if (snap.empty) return null;

    const data = snap.docs[0].data();
    const receiptNumber = data.receiptNumber || data.receipt_number || "";
    if (!receiptNumber) return null;

    return {
      isValid: true,
      receiptNumber,
      donorName: data.donorName || data.donor_name || undefined,
      donorMobile: data.donorMobile || data.donor_mobile || undefined,
      amount: parseFloat(data.amount ?? data.totalAmount ?? 0) || 0,
      purpose: data.purpose || "General Donation",
      paymentMode: data.paymentMode || data.payment_mode || "cash",
      paymentStatus: data.paymentStatus || data.payment_status || "paid",
      date: data.createdAt || data.created_at || new Date().toISOString(),
      organizationName: data.organizationName || data.organization_name || "PavtiBook Organization",
      organizationType: data.organizationType || data.organization_type || "Ganesh Mandal",
      isOrganizationVerified: false,
      message: "Verified Receipt. This document is authenticated by PavtiBook.",
    };
  } catch (err) {
    console.error("[Verify] Firestore fallback error:", err);
    return null;
  }
}


export default async function Page({ params }: Props) {
  const { id } = await params;

  // Server-side fetch — credentials never exposed to browser
  const backendUrl = process.env.BACKEND_API_URL ?? "https://api.pavtibook.online";

  let result: VerificationResult;

  try {
    const res = await fetch(
      `${backendUrl}/api/public/verify/${encodeURIComponent(id)}`,
      {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      result = { isValid: false, message: "This receipt could not be verified." };
    } else {
      result = await res.json();
    }
  } catch {
    result = { isValid: false, error: true, message: "Verification service temporarily unavailable." };
  }

  // Firestore fallback: pb_ tokens are Flutter Firebase receipts not yet in PostgreSQL
  if (!result.isValid && id.startsWith("pb_")) {
    console.log(`[Verify] PostgreSQL miss for pb_ token — trying Firestore: ${id}`);
    const firestoreResult = await verifyFromFirestore(id);
    if (firestoreResult) {
      console.log(`[Verify] Firestore HIT for ${id} — receipt: ${firestoreResult.receiptNumber}`);
      result = firestoreResult;
    }
  }

  return <VerifyPage token={id} result={result} />;
}

