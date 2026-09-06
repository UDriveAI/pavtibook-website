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
  isDeleted?: boolean;
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
  logoUrl?: string;
  collectorName?: string;
  panNumber?: string;
  regNumber?: string;
  isOrganizationVerified?: boolean;
  languageCode?: string;
  receiptImageUrl?: string;
  message?: string;
  error?: boolean;
}

/**
 * Firestore direct fallback for pb_ tokens or direct IDs.
 * Uses FIREBASE_SERVICE_ACCOUNT_JSON (full service account JSON string).
 */
async function verifyFromFirestore(token: string): Promise<VerificationResult | null> {
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!saJson) return null;

  try {
    const { initializeApp, cert, getApps } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");

    const app = getApps().find(a => a.name === "pavtibook-verify") ??
      initializeApp({ credential: cert(JSON.parse(saJson)) }, "pavtibook-verify");

    const db = getFirestore(app);
    let snap = await db
      .collection("receipts")
      .where("qrCodeValue", "==", token)
      .limit(1)
      .get();

    if (snap.empty) {
      snap = await db
        .collection("receipts")
        .where("opaqueToken", "==", token)
        .limit(1)
        .get();
    }

    if (snap.empty) {
      snap = await db
        .collection("receipts")
        .where("receiptNumber", "==", token)
        .limit(1)
        .get();
    }

    let data: Record<string, unknown> | null = null;
    if (!snap.empty) {
      data = snap.docs[0].data();
    } else {
      try {
        const docSnap = await db.collection("receipts").doc(token).get();
        if (docSnap.exists) {
          data = docSnap.data() as Record<string, unknown>;
        }
      } catch {
        // ignore
      }
    }

    if (!data) return null;
    const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
    const receiptNumber = str(data.receiptNumber) || str(data.receipt_number) || "";
    if (!receiptNumber) return null;

    const isDeleted = data.isDeleted === true ||
      data.is_deleted === true ||
      data.deletedAt != null ||
      data.deleted_at != null;

    if (isDeleted) {
      return {
        isValid: false,
        isDeleted: true,
        message: "ही पावती सध्या उपलब्ध नाही (This receipt is no longer available / voided).",
      };
    }

    const rawAmount = data.amount ?? data.totalAmount ?? 0;
    const amount = typeof rawAmount === "number" ? rawAmount : (typeof rawAmount === "string" ? parseFloat(rawAmount) : 0);

    return {
      isValid: true,
      isDeleted: false,
      receiptNumber,
      donorName: str(data.donorName) || str(data.donor_name),
      donorMobile: str(data.donorMobile) || str(data.donor_mobile),
      amount: isNaN(amount) ? 0 : amount,
      purpose: str(data.purpose) || "देणगी / वर्गणी",
      paymentMode: str(data.paymentMode) || str(data.payment_mode) || "cash",
      paymentStatus: str(data.paymentStatus) || str(data.payment_status) || "paid",
      date: str(data.createdAt) || str(data.created_at) || new Date().toISOString(),
      organizationName: str(data.organizationName) || str(data.organization_name) || "PavtiBook Trust",
      organizationType: str(data.organizationType) || str(data.organization_type) || "Ganesh Mandal",
      logoUrl: str(data.logoUrl) || str(data.logo_url),
      collectorName: str(data.collectorName) || str(data.createdByName),
      isOrganizationVerified: data.isOrganizationVerified === true,
      languageCode: str(data.languageCode) || str(data.language_code) || "mr",
      receiptImageUrl: str(data.receiptImageUrl) || str(data.receipt_image_url),
      message: "Verified Receipt. This document is authenticated by PavtiBook.",
    };
  } catch (err) {
    console.error("[Verify] Firestore fallback error:", err);
    return null;
  }
}


export default async function Page({ params }: Props) {
  const { id } = await params;

  // 1. Authoritative Firestore check first (bypasses any stale/sample DB cache)
  let result: VerificationResult | null = await verifyFromFirestore(id);

  // 2. If not found in Firestore, fallback to backend PostgreSQL API
  if (!result || (!result.isValid && !result.isDeleted)) {
    const backendUrl = process.env.BACKEND_API_URL ?? "https://api.pavtibook.online";
    try {
      const res = await fetch(
        `${backendUrl}/api/public/verify/${encodeURIComponent(id)}`,
        {
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(6000),
        }
      );

      if (res.ok) {
        const apiData = await res.json();
        if (apiData && apiData.isValid) {
          result = apiData;
        }
      }
    } catch {
      // ignore
    }
  }

  if (!result) {
    result = { isValid: false, message: "This receipt could not be verified." };
  }

  // If receipt is voided/deleted, strictly purge any receipt details from client view
  if (result.isDeleted) {
    result = {
      isValid: false,
      isDeleted: true,
      message: "ही पावती सध्या उपलब्ध नाही (This receipt is no longer available / voided).",
    };
  }

  return <VerifyPage token={id} result={result} />;
}

