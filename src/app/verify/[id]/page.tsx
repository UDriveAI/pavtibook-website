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

export default async function Page({ params }: Props) {
  const { id } = await params;

  // Server-side fetch — credentials never exposed to browser
  const backendUrl = process.env.BACKEND_API_URL ?? "https://api.pavtibook.online";

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

  return <VerifyPage token={id} result={result} />;
}
