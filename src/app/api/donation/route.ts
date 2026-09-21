import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    if (!db) {
      throw new Error("Firebase Admin not initialized.");
    }

    const body = await request.json();
    const { orgId, amount, donorName, donorMobile } = body;

    if (!orgId || !amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    if (!donorMobile || !/^[0-9]{10}$/.test(donorMobile)) {
      return NextResponse.json({ error: "Valid 10-digit mobile number is required" }, { status: 400 });
    }

    const orgRef = db.collection("organizations").doc(orgId);
    const subRef = db.collection("subscriptions").doc(orgId);

    const result = await db.runTransaction(async (transaction) => {
      const orgSnap = await transaction.get(orgRef);
      if (!orgSnap.exists) {
        throw new Error("Organization not found");
      }
      const orgData = orgSnap.data() || {};

      const subSnap = await transaction.get(subRef);
      const subData = subSnap.exists ? subSnap.data() : {};
      
      const receiptsUsed = typeof subData?.receiptsUsed === "number" ? subData.receiptsUsed : 0;
      const monthlyReceiptsUsed = typeof subData?.monthlyReceiptsUsed === "number" ? subData.monthlyReceiptsUsed : 0;
      
      const firestore = db;
      if (!firestore) throw new Error("Firestore not initialized");

      const interestSnap = await transaction.get(firestore.collection("smart_donation_qr_interest").doc(`org_${orgId}`));
      if (!interestSnap.exists || interestSnap.data()?.status !== "activated") {
        throw new Error("Smart Donation QR is not activated for this organization.");
      }

      const currentYear = new Date().getFullYear();
      const nowIso = new Date().toISOString();

      // Create donor record logic (simplified)
      const donorsCol = firestore.collection("donors");
      const donorDocRef = donorsCol.doc();
      transaction.set(donorDocRef, {
        organizationId: orgId,
        name: donorName || "Anonymous Donor",
        mobile: donorMobile || "",
        totalDonated: amount,
        donationCount: 1,
        receiptCount: 1,
        firstDonationDate: nowIso,
        lastDonationDate: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      const receiptsCol = firestore.collection("receipts");
      const receiptDocRef = receiptsCol.doc();
      const receiptId = receiptDocRef.id;
      const nextSeq = receiptsUsed + 1;
      const receiptNumber = `PB-SD-${currentYear}-${String(nextSeq).padStart(6, "0")}`;
      const qrCodeValue = `pb_${receiptId.substring(0, 12)}_${Date.now().toString(16)}`;

      const createdReceiptData = {
        id: receiptId,
        organizationId: orgId,
        organization_id: orgId,
        templateId: orgData.templateId || orgData.template_id || "default",
        donorId: donorDocRef.id,
        donor_id: donorDocRef.id,
        collectorId: "smart_donation_qr",
        collector_id: "smart_donation_qr",
        receiptNumber: receiptNumber,
        receipt_number: receiptNumber,
        amount: Number(amount),
        purpose: "Smart Donation (Direct UPI)",
        paymentMode: "UPI",
        payment_mode: "UPI",
        paymentMethod: "UPI",
        paymentStatus: "pending",
        payment_status: "pending",
        qrCodeValue: qrCodeValue,
        qr_code_value: qrCodeValue,
        createdAt: nowIso,
        created_at: nowIso,
        updatedAt: nowIso,
        updated_at: nowIso,
        donorName: donorName || "Anonymous Donor",
        donor_name: donorName || "Anonymous Donor",
        donorMobile: donorMobile || "",
        donor_mobile: donorMobile || "",
        donorEmail: "",
        donor_email: "",
        donorAddress: "",
        donor_address: "",
        collectorName: "Smart QR",
        collectorRole: "System",
        organizationName: orgData.name || orgData.orgName || "Organization",
        organizationLogoUrl: orgData.logoUrl || orgData.logo_url || null,
        customStampUrl: orgData.stampUrl || orgData.stamp_url || null,
        signatureUrl: orgData.signatureUrl || orgData.signature_url || null,
        headerLogoUrl: orgData.headerLogoUrl || null,
        leftSideImageUrl: orgData.leftImageUrl || null,
        rightSideImageUrl: orgData.rightImageUrl || null,
        footerText: orgData.footerText || null,
        createdBy: "smart_donation_qr",
        createdByName: "Smart QR",
        createdByRole: "System",
        createdByMobile: "",
        status: "pending",
        pending: true,
        paidAt: null,
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        deleteReason: null,
      };

      transaction.set(receiptDocRef, createdReceiptData);

      transaction.set(subRef, {
        id: orgId,
        organizationId: orgId,
        receiptsUsed: receiptsUsed + 1,
        monthlyReceiptsUsed: monthlyReceiptsUsed + 1,
        updatedAt: nowIso,
      }, { merge: true });

      const activityLogRef = firestore.collection("activity_logs").doc();
      transaction.set(activityLogRef, {
        organizationId: orgId,
        userId: "smart_donation_qr",
        userName: "Smart QR Donor",
        userRole: "Donor",
        action: "Donation Initiated",
        details: `Smart Donation QR Receipt ${receiptNumber} generated for ₹${amount} (Pending)`,
        timestamp: nowIso,
      });

      return { receiptId, receiptNumber };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Donation API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
