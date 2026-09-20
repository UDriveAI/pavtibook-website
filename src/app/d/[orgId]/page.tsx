import { notFound } from "next/navigation";
import { db } from "@/lib/firebase";
import DonationClientFlow from "./DonationClientFlow";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ orgId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgId } = await params;
  
  if (!db) {
    return { title: "Smart Donation" };
  }

  try {
    const orgSnap = await db.collection("organizations").doc(orgId).get();
    if (orgSnap.exists) {
      const data = orgSnap.data();
      return {
        title: `Donate to ${data?.name || data?.orgName || "Organization"}`,
        description: "Make a digital donation using Smart Donation QR.",
      };
    }
  } catch {
    // Ignore
  }

  return { title: "Smart Donation QR" };
}

export default async function SmartDonationPage({ params }: Props) {
  const { orgId } = await params;

  if (!db) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">System Error</h2>
          <p className="text-gray-500">Database connection not initialized.</p>
        </div>
      </div>
    );
  }

  try {
    // 1. Fetch organization
    const orgSnap = await db.collection("organizations").doc(orgId).get();
    if (!orgSnap.exists) {
      return notFound();
    }
    const orgData = orgSnap.data() || {};

    // 2. Fetch Smart Donation QR Interest/Activation Status
    const interestSnap = await db.collection("smart_donation_qr_interest").doc(`org_${orgId}`).get();
    const isActivated = interestSnap.exists && interestSnap.data()?.status === "activated";

    // 3. Ensure UPI ID exists
    const upiId = orgData.upiId || orgData.upi_id;

    if (!isActivated || !upiId) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-sm w-full">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">ðŸš«</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Currently Unavailable</h2>
            <p className="text-sm text-gray-500">
              Smart Donation QR is not currently active for this organization, or payment details are missing.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <DonationClientFlow 
          orgId={orgId}
          orgName={orgData.name || orgData.orgName || "Organization"}
          orgType={orgData.type || orgData.orgType || ""}
          logoUrl={orgData.logoUrl || orgData.logo_url || null}
          upiId={upiId}
        />
      </div>
    );

  } catch (error) {
    console.error("Error loading Smart Donation page:", error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 text-sm">Please try scanning the QR code again.</p>
        </div>
      </div>
    );
  }
}
