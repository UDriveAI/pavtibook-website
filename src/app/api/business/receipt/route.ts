import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }
    const firestore = db;

    const body = await req.json();
    const publicId = (body.publicId || "").toString().trim();

    if (!publicId) {
      return NextResponse.json(
        { error: "Public ID is required" },
        { status: 400 }
      );
    }

    // 1. Fetch public link document
    const pubSnap = await firestore.collection("business_public_links").doc(publicId).get();
    if (!pubSnap.exists) {
      return NextResponse.json(
        { error: "Business QR link not found or expired" },
        { status: 404 }
      );
    }

    const pubData = pubSnap.data() || {};
    if (pubData.isActive === false) {
      return NextResponse.json(
        { error: "This Business QR is currently paused or inactive" },
        { status: 403 }
      );
    }

    const orgId = pubData.organizationId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Missing organization binding" },
        { status: 500 }
      );
    }

    // 2. Validate items
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) {
      return NextResponse.json(
        { error: "Please add at least one item to the bill" },
        { status: 400 }
      );
    }

    const validatedItems: Array<{
      name: string;
      quantity: number;
      price: number;
      total: number;
      productId: string | null;
    }> = [];
    let calculatedSubtotal = 0;

    for (const item of rawItems) {
      const name = (item.name || "").toString().trim();
      if (!name) continue;

      const qty = Math.max(0.001, parseFloat(item.quantity) || 1.0);
      let unitPrice = 0.0;

      if (item.productId) {
        // Fetch server catalog price to prevent tampering
        const prodDoc = await firestore
          .collection("business_products")
          .doc(item.productId.toString())
          .get();
        if (prodDoc.exists && prodDoc.data()?.organizationId === orgId) {
          unitPrice = parseFloat(prodDoc.data()?.price) || 0.0;
        } else {
          unitPrice = Math.max(0.0, parseFloat(item.price) || 0.0);
        }
      } else {
        unitPrice = Math.max(0.0, parseFloat(item.price) || 0.0);
      }

      const lineTotal = Math.round(qty * unitPrice * 100) / 100;
      calculatedSubtotal += lineTotal;

      validatedItems.push({
        name,
        quantity: qty,
        price: unitPrice,
        total: lineTotal,
        productId: item.productId ? item.productId.toString() : null,
      });
    }

    if (validatedItems.length === 0) {
      return NextResponse.json(
        { error: "No valid items in the bill" },
        { status: 400 }
      );
    }

    calculatedSubtotal = Math.round(calculatedSubtotal * 100) / 100;

    // 3. GST Calculation
    let gstAmount = 0.0;
    const isGstEnabled = pubData.isGstEnabled === true;
    const gstRate = isGstEnabled ? Math.max(0.0, parseFloat(pubData.gstPercentage) || 0.0) : 0.0;
    if (isGstEnabled && gstRate > 0) {
      gstAmount = Math.round(((calculatedSubtotal * gstRate) / 100) * 100) / 100;
    }
    const grandTotal = Math.round((calculatedSubtotal + gstAmount) * 100) / 100;

    // 4. Customer info
    const customerName = (body.customerName || "Walk-in Customer").toString().trim();
    const rawMobile = (body.customerMobile || "").toString().replace(/\D/g, "");
    const customerMobile = rawMobile.length >= 10 ? rawMobile.slice(-10) : rawMobile;
    const paymentMode = (body.paymentMode || "upi").toString().toLowerCase().trim();
    const transactionRef = (body.transactionRef || "").toString().trim();

    // 5. Atomic receipt creation
    const nowIso = new Date().toISOString();
    const currentYear = new Date().getFullYear();
    const receiptsCol = firestore.collection("receipts");
    const receiptDocRef = receiptsCol.doc();
    const receiptId = receiptDocRef.id;
    const qrCodeValue = `pb_${receiptId.substring(0, Math.min(12, receiptId.length))}_${Date.now().toString(16)}`;

    let createdReceipt: Record<string, unknown> = {};

    await firestore.runTransaction(async (t) => {
      const subRef = firestore.collection("subscriptions").doc(orgId);
      const subSnap = await t.get(subRef);
      const subData = subSnap.exists ? subSnap.data() : {};
      const receiptsUsed = (subData && subData.receiptsUsed) || 0;
      const nextSeq = receiptsUsed + 1;
      const receiptNumber = `PB-BIZ-${currentYear}-${String(nextSeq).padStart(6, "0")}`;

      createdReceipt = {
        id: receiptId,
        organizationId: orgId,
        organization_id: orgId,
        receiptNumber,
        receipt_number: receiptNumber,
        amount: grandTotal,
        subtotal: calculatedSubtotal,
        gstPercentage: isGstEnabled ? gstRate : null,
        gstAmount: isGstEnabled ? gstAmount : null,
        purpose: "Business Bill / खरेदी पावती",
        paymentMode,
        paymentStatus: "initiated", // Honest status: initiated / awaiting merchant confirmation
        status: "initiated",
        pending: true,
        qrCodeValue,
        createdAt: nowIso,
        updatedAt: nowIso,
        donorName: customerName,
        donorMobile: customerMobile,
        donorId: "walk_in",
        collectorName: "Business Self-Checkout",
        collectorRole: "Customer",
        organizationName: pubData.businessName || "PavtiBook Merchant",
        businessName: pubData.businessName || "PavtiBook Merchant",
        isBusinessReceipt: true,
        items: validatedItems,
        transactionRef: transactionRef || null,
        businessPublicId: publicId,
        isDeleted: false,
      };

      t.set(receiptDocRef, createdReceipt);
      t.set(subRef, { receiptsUsed: receiptsUsed + 1, updatedAt: nowIso }, { merge: true });
    });

    return NextResponse.json({
      success: true,
      receipt: createdReceipt,
      verificationUrl: `/receipt/${receiptId}`,
    });
  } catch (error: unknown) {
    console.error("Error creating business receipt:", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
