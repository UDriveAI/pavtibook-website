"use client";

import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase-client";

export interface ExpenseCategory {
  id: string;
  nameEn: string;
  nameMr: string;
  nameHi: string;
  iconName: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    id: "mandap_decoration",
    nameEn: "Mandap and Decoration",
    nameMr: "मंडप व सजावट",
    nameHi: "मंडप व सजावट",
    iconName: "🎪",
  },
  {
    id: "sound_lighting",
    nameEn: "Sound and Lighting",
    nameMr: "ध्वनी व प्रकाश",
    nameHi: "ध्वनि व प्रकाश",
    iconName: "🔊",
  },
  {
    id: "puja_rituals",
    nameEn: "Puja and Rituals",
    nameMr: "पूजा व धार्मिक विधी",
    nameHi: "पूजा व धार्मिक अनुष्ठान",
    iconName: "🪔",
  },
  {
    id: "prasad_catering",
    nameEn: "Prasad and Catering",
    nameMr: "प्रसाद व अन्नदान",
    nameHi: "प्रसाद व भोजन",
    iconName: "🍲",
  },
  {
    id: "printing_stationery",
    nameEn: "Printing and Stationery",
    nameMr: "छपाई व स्टेशनरी",
    nameHi: "प्रिंटिंग व स्टेशनरी",
    iconName: "🖨️",
  },
  {
    id: "transport_fuel",
    nameEn: "Transport and Fuel",
    nameMr: "वाहतूक व प्रवास",
    nameHi: "यातायात व ईंधन",
    iconName: "🚚",
  },
  {
    id: "honorarium_wages",
    nameEn: "Honorarium and Wages",
    nameMr: "मानधन व मजुरी",
    nameHi: "पारिश्रमिक व मजदूरी",
    iconName: "💵",
  },
  {
    id: "repairs_maintenance",
    nameEn: "Repairs and Maintenance",
    nameMr: "दुरुस्ती व देखभाल",
    nameHi: "मरम्मत व रखरखाव",
    iconName: "🛠️",
  },
  {
    id: "other",
    nameEn: "Other Expenses",
    nameMr: "इतर खर्च",
    nameHi: "अन्य खर्च",
    iconName: "📝",
  },
];

export interface ExpenseRecord {
  id: string;
  organizationId: string;
  expenseNumber: string;
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
  paymentMode: string;
  paidTo: string;
  paidToMobile?: string | null;
  billImageUrl?: string | null;
  billImageUrls?: string[];
  notes?: string | null;
  status: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  createdByRole: string;
  editedAt?: string | null;
  editedBy?: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
}

export function normalizeExpensePaymentMode(mode: unknown): string {
  if (!mode) return "cash";
  const m = String(mode).trim().toLowerCase();
  if (m === "cash" || m === "रोख" || m === "नकद") return "cash";
  if (
    m === "upi" ||
    m === "gpay" ||
    m === "phonepe" ||
    m === "paytm" ||
    m === "google pay"
  ) {
    return "upi";
  }
  if (
    m === "bank" ||
    m === "bank transfer" ||
    m === "bank_transfer" ||
    m === "neft" ||
    m === "rtgs" ||
    m === "imps"
  ) {
    return "bank";
  }
  if (m === "cheque" || m === "check" || m === "धनादेश" || m === "चेक")
    return "cheque";
  return "other";
}

export function parseExpenseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === "object" && val !== null && "toDate" in val) {
    try {
      return (val as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  return null;
}

export async function uploadExpenseAttachment(
  file: File,
  orgId: string,
  expenseId: string,
  attachmentId: string
): Promise<string> {
  const path = `organizations/${orgId}/expenses/${expenseId}/attachments/${attachmentId}.jpg`;
  const storageRef = ref(storage, path);
  const metadata = { contentType: file.type || "image/jpeg" };
  const snapshot = await uploadBytes(storageRef, file, metadata);
  return await getDownloadURL(snapshot.ref);
}

export interface CreateExpenseParams {
  organizationId: string;
  title: string;
  category: string;
  amount: number;
  expenseDate: Date;
  paymentMode: string;
  paidTo: string;
  paidToMobile?: string;
  notes?: string;
  files?: File[];
  createdBy: string;
  createdByName: string;
  createdByRole: string;
}

export async function createExpense(
  params: CreateExpenseParams
): Promise<ExpenseRecord> {
  const {
    organizationId,
    title,
    category,
    amount,
    expenseDate,
    paymentMode,
    paidTo,
    paidToMobile,
    notes,
    files = [],
    createdBy,
    createdByName,
    createdByRole,
  } = params;

  if (files.length > 5) {
    throw new Error("Maximum 5 attachments allowed");
  }

  const expenseDocRef = doc(collection(db, "expenses"));
  const expenseId = expenseDocRef.id;

  const cleanUrls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const attachmentId = `attachment_${Date.now()}_${i}`;
    const downloadUrl = await uploadExpenseAttachment(
      file,
      organizationId,
      expenseId,
      attachmentId
    );
    cleanUrls.push(downloadUrl);
  }

  const counterDocRef = doc(db, "counters", `${organizationId}_expenses`);
  const now = new Date();
  const nowIso = now.toISOString();
  const currentYear = now.getFullYear();
  const expenseDateIso = expenseDate.toISOString();
  const normalizedMode = normalizeExpensePaymentMode(paymentMode);

  let generatedExpenseNumber = "";

  await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterDocRef);
    let nextNumber = 1;

    if (counterSnap.exists()) {
      const data = counterSnap.data();
      const current = data?.currentNumber;
      if (typeof current === "number") {
        nextNumber = current + 1;
      }
      transaction.update(counterDocRef, {
        currentNumber: nextNumber,
        updatedAt: serverTimestamp(),
      });
    } else {
      transaction.set(counterDocRef, {
        currentNumber: 1,
        organizationId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      nextNumber = 1;
    }

    generatedExpenseNumber = `EXP-${currentYear}-${String(nextNumber).padStart(6, "0")}`;

    const expenseData: Record<string, unknown> = {
      id: expenseId,
      organizationId,
      expenseNumber: generatedExpenseNumber,
      title: title.trim(),
      category,
      amount,
      expenseDate: expenseDateIso,
      paymentMode: normalizedMode,
      paidTo: paidTo.trim(),
      paidToMobile: paidToMobile?.trim() || null,
      billImageUrl: cleanUrls.length > 0 ? cleanUrls[0] : null,
      billImageUrls: cleanUrls,
      notes: notes?.trim() || null,
      status: "paid",
      createdAt: nowIso,
      createdBy,
      createdByName,
      createdByRole,
      editedAt: null,
      editedBy: null,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      deleteReason: null,
    };

    transaction.set(expenseDocRef, expenseData);
  });

  try {
    await addDoc(collection(db, "activity_logs"), {
      organizationId,
      userId: createdBy,
      userName: createdByName,
      userRole: createdByRole,
      action: "Expense Created",
      details: `Added expense ${generatedExpenseNumber}: ${title.trim()} (Rs ${amount})`,
      timestamp: nowIso,
    });
  } catch (err) {
    console.warn("Failed to write activity log:", err);
  }

  return {
    id: expenseId,
    organizationId,
    expenseNumber: generatedExpenseNumber,
    title: title.trim(),
    category,
    amount,
    expenseDate: expenseDateIso,
    paymentMode: normalizedMode,
    paidTo: paidTo.trim(),
    paidToMobile: paidToMobile?.trim() || null,
    billImageUrl: cleanUrls.length > 0 ? cleanUrls[0] : null,
    billImageUrls: cleanUrls,
    notes: notes?.trim() || null,
    status: "paid",
    createdAt: nowIso,
    createdBy,
    createdByName,
    createdByRole,
    isDeleted: false,
  };
}

export async function voidExpense(
  expenseId: string,
  organizationId: string,
  reason: string,
  user: { uid: string; name: string; role: string }
): Promise<void> {
  const expenseRef = doc(db, "expenses", expenseId);
  const nowIso = new Date().toISOString();

  await updateDoc(expenseRef, {
    isDeleted: true,
    deletedAt: nowIso,
    deletedBy: user.name,
    deleteReason: reason.trim(),
  });

  try {
    await addDoc(collection(db, "activity_logs"), {
      organizationId,
      userId: user.uid,
      userName: user.name,
      userRole: user.role,
      action: "Expense Voided",
      details: `Voided expense ${expenseId}. Reason: ${reason.trim()}`,
      timestamp: nowIso,
    });
  } catch (err) {
    console.warn("Failed to write activity log:", err);
  }
}