import { jsPDF } from "jspdf";
import { ExpenseRecord, EXPENSE_CATEGORIES } from "./expenseService";

export interface ReceiptRecordForLedger {
  id: string;
  receiptNumber: string;
  donorName: string;
  amount: number;
  purpose: string;
  paymentMode: string;
  paymentStatus: string;
  createdAt: string;
  isDeleted?: boolean;
}

export interface LedgerEntry {
  date: Date;
  dateStr: string;
  type: "credit" | "debit";
  particulars: string;
  category?: string | null;
  creditAmount: number;
  debitAmount: number;
  paymentMode: string;
  reference: string;
  partyName: string;
  notes?: string | null;
  attachmentCount: number;
  originalObject: ReceiptRecordForLedger | ExpenseRecord;
}

export interface BuildLedgerOptions {
  receipts: ReceiptRecordForLedger[];
  expenses: ExpenseRecord[];
  typeFilter?: "all" | "credit" | "debit";
  categoryFilter?: string;
  paymentModeFilter?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  search?: string;
  lang?: "en" | "mr" | "hi";
}

export function buildLedger(options: BuildLedgerOptions): LedgerEntry[] {
  const {
    receipts,
    expenses,
    typeFilter = "all",
    categoryFilter,
    paymentModeFilter,
    startDate,
    endDate,
    search,
    lang = "en",
  } = options;

  const entries: LedgerEntry[] = [];

  // 1. Process Receipts -> CREDIT
  if (typeFilter === "all" || typeFilter === "credit") {
    for (const r of receipts) {
      if (r.paymentStatus === "cancelled" || r.isDeleted) continue;

      if (
        paymentModeFilter &&
        r.paymentMode.toLowerCase() !== paymentModeFilter.toLowerCase()
      ) {
        continue;
      }

      // If category filter is active, exclude receipt rows (category applies to expenses)
      if (categoryFilter && categoryFilter.trim().length > 0) {
        continue;
      }

      const date = new Date(r.createdAt);
      if (startDate && date < startDate) continue;
      if (endDate && date > endDate) continue;

      if (search && search.trim().length > 0) {
        const q = search.trim().toLowerCase();
        const matchRef = r.receiptNumber.toLowerCase().includes(q);
        const matchParty = (r.donorName || "").toLowerCase().includes(q);
        const matchPart = (r.purpose || "").toLowerCase().includes(q);
        if (!matchRef && !matchParty && !matchPart) continue;
      }

      const dStr = `${String(date.getDate()).padStart(2, "0")}/${String(
        date.getMonth() + 1
      ).padStart(2, "0")}/${date.getFullYear()}`;

      entries.push({
        date,
        dateStr: dStr,
        type: "credit",
        particulars: r.purpose || "Collection / Receipt",
        category: null,
        creditAmount: r.amount || 0,
        debitAmount: 0,
        paymentMode: r.paymentMode,
        reference: r.receiptNumber,
        partyName: r.donorName || "Anonymous Donor",
        notes: null,
        attachmentCount: 0,
        originalObject: r,
      });
    }
  }

  // 2. Process Expenses -> DEBIT
  if (typeFilter === "all" || typeFilter === "debit") {
    for (const e of expenses) {
      if (e.isDeleted || e.status !== "paid") continue;

      if (categoryFilter && e.category !== categoryFilter) {
        continue;
      }

      if (
        paymentModeFilter &&
        e.paymentMode.toLowerCase() !== paymentModeFilter.toLowerCase()
      ) {
        continue;
      }

      const date = new Date(e.expenseDate || e.createdAt);
      if (startDate && date < startDate) continue;
      if (endDate && date > endDate) continue;

      if (search && search.trim().length > 0) {
        const q = search.trim().toLowerCase();
        const matchRef = (e.expenseNumber || "").toLowerCase().includes(q);
        const matchParty = (e.paidTo || "").toLowerCase().includes(q);
        const matchPart = (e.title || "").toLowerCase().includes(q);
        const matchMobile = (e.paidToMobile || "").includes(q);
        if (!matchRef && !matchParty && !matchPart && !matchMobile) continue;
      }

      const dStr = `${String(date.getDate()).padStart(2, "0")}/${String(
        date.getMonth() + 1
      ).padStart(2, "0")}/${date.getFullYear()}`;

      const catObj = EXPENSE_CATEGORIES.find((c) => c.id === e.category);
      let catName = catObj?.nameEn || e.category;
      if (lang === "mr" && catObj?.nameMr) catName = catObj.nameMr;
      if (lang === "hi" && catObj?.nameHi) catName = catObj.nameHi;

      entries.push({
        date,
        dateStr: dStr,
        type: "debit",
        particulars: e.title,
        category: catName,
        creditAmount: 0,
        debitAmount: e.amount || 0,
        paymentMode: e.paymentMode,
        reference: e.expenseNumber,
        partyName: e.paidTo,
        notes: e.notes || null,
        attachmentCount: e.billImageUrls ? e.billImageUrls.length : e.billImageUrl ? 1 : 0,
        originalObject: e,
      });
    }
  }

  // Chronological sorting: newest first (tiebreaker on reference)
  entries.sort((a, b) => {
    const diff = b.date.getTime() - a.date.getTime();
    if (diff !== 0) return diff;
    return b.reference.localeCompare(a.reference);
  });

  return entries;
}

export function calculateLedgerTotals(entries: LedgerEntry[]) {
  let totalCredit = 0;
  let totalDebit = 0;

  for (const e of entries) {
    totalCredit += e.creditAmount;
    totalDebit += e.debitAmount;
  }

  return {
    totalCredit,
    totalDebit,
    netBalance: totalCredit - totalDebit,
  };
}

function escapeCsvField(val: string): string {
  if (
    val.includes(",") ||
    val.includes('"') ||
    val.includes("\n") ||
    val.includes("\r")
  ) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/**
 * Generate CSV with UTF-8 BOM (\uFEFF) for Excel Marathi/Hindi support
 */
export function exportLedgerCsv(
  entries: LedgerEntry[],
  orgName: string = "PavtiBook Organization",
  periodLabel: string = "All Time"
): void {
  const rows: string[] = [];
  rows.push(`Organization:,${escapeCsvField(orgName)}`);
  rows.push(`Period:,${escapeCsvField(periodLabel)}`);
  rows.push(`Generated At:,${new Date().toLocaleString()}`);
  rows.push("");
  rows.push(
    "Date,Type,Particulars,Category,Credit (Rs),Debit (Rs),Payment Mode,Reference No,Party / Payee / Donor,Attachments,Notes"
  );

  for (const e of entries) {
    const typeLabel = e.type === "credit" ? "Credit (Income)" : "Debit (Expense)";
    const catLabel = e.category || "-";
    const creditStr = e.creditAmount > 0 ? e.creditAmount.toFixed(2) : "0.00";
    const debitStr = e.debitAmount > 0 ? e.debitAmount.toFixed(2) : "0.00";
    const notesStr = e.notes || "";

    rows.push(
      [
        escapeCsvField(e.dateStr),
        escapeCsvField(typeLabel),
        escapeCsvField(e.particulars),
        escapeCsvField(catLabel),
        creditStr,
        debitStr,
        escapeCsvField(e.paymentMode.toUpperCase()),
        escapeCsvField(e.reference),
        escapeCsvField(e.partyName),
        e.attachmentCount,
        escapeCsvField(notesStr),
      ].join(",")
    );
  }

  const csvContent = "\uFEFF" + rows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ledger_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download high-quality printable PDF of Credit-Debit Ledger via jsPDF
 */
export function exportLedgerPdf(
  entries: LedgerEntry[],
  orgName: string = "PavtiBook Organization",
  periodLabel: string = "All Time"
): void {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const totals = calculateLedgerTotals(entries);

  // Title & Header
  doc.setFontSize(18);
  doc.setTextColor(139, 30, 45); // #8B1E2D
  doc.text(orgName, 40, 40);

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(`Credit-Debit Ledger Report (${periodLabel})`, 40, 58);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 40, 72);

  // Summary Metrics
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(
    `Total Credit: Rs ${totals.totalCredit.toLocaleString("en-IN")}   |   Total Debit: Rs ${totals.totalDebit.toLocaleString(
      "en-IN"
    )}   |   Net Balance: Rs ${totals.netBalance.toLocaleString("en-IN")}`,
    40,
    92
  );

  const headers = [
    { title: "Date", x: 45, w: 55 },
    { title: "Type", x: 100, w: 45 },
    { title: "Particulars", x: 145, w: 155 },
    { title: "Category", x: 300, w: 90 },
    { title: "Credit (Rs)", x: 390, w: 65, align: "right" as const },
    { title: "Debit (Rs)", x: 455, w: 65, align: "right" as const },
    { title: "Mode", x: 525, w: 45 },
    { title: "Ref No", x: 570, w: 85 },
    { title: "Party / Payee", x: 655, w: 145 },
  ];

  let currentY = 110;
  const pageHeight = 595;
  const leftMargin = 40;
  const tableWidth = 762;
  const rowHeight = 18;

  const renderHeader = (y: number) => {
    doc.setFillColor(139, 30, 45); // #8B1E2D
    doc.rect(leftMargin, y, tableWidth, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);

    headers.forEach((h) => {
      if (h.align === "right") {
        doc.text(h.title, h.x + h.w - 5, y + 13, { align: "right" });
      } else {
        doc.text(h.title, h.x, y + 13);
      }
    });
  };

  renderHeader(currentY);
  currentY += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  const truncate = (text: string, maxLen: number) => {
    if (!text) return "-";
    return text.length > maxLen ? text.slice(0, maxLen - 2) + ".." : text;
  };

  entries.forEach((e, idx) => {
    if (currentY + rowHeight > pageHeight - 40) {
      doc.addPage();
      currentY = 40;
      renderHeader(currentY);
      currentY += 20;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(leftMargin, currentY, tableWidth, rowHeight, "F");
    }

    // Border line below row
    doc.setDrawColor(235, 238, 242);
    doc.line(leftMargin, currentY + rowHeight, leftMargin + tableWidth, currentY + rowHeight);

    doc.setTextColor(30, 41, 59);
    doc.text(e.dateStr, 45, currentY + 12);

    // Type badge
    if (e.type === "credit") {
      doc.setTextColor(21, 128, 61); // emerald-700
      doc.text("Credit", 100, currentY + 12);
    } else {
      doc.setTextColor(185, 28, 28); // red-700
      doc.text("Debit", 100, currentY + 12);
    }

    doc.setTextColor(30, 41, 59);
    doc.text(truncate(e.particulars, 30), 145, currentY + 12);
    doc.text(truncate(e.category || "-", 18), 300, currentY + 12);

    // Credit Amount
    if (e.creditAmount > 0) {
      doc.setTextColor(21, 128, 61);
      doc.text(e.creditAmount.toLocaleString("en-IN"), 390 + 60, currentY + 12, { align: "right" });
    } else {
      doc.setTextColor(160, 160, 160);
      doc.text("-", 390 + 60, currentY + 12, { align: "right" });
    }

    // Debit Amount
    if (e.debitAmount > 0) {
      doc.setTextColor(185, 28, 28);
      doc.text(e.debitAmount.toLocaleString("en-IN"), 455 + 60, currentY + 12, { align: "right" });
    } else {
      doc.setTextColor(160, 160, 160);
      doc.text("-", 455 + 60, currentY + 12, { align: "right" });
    }

    doc.setTextColor(50, 50, 50);
    doc.text(e.paymentMode.toUpperCase(), 525, currentY + 12);
    doc.text(truncate(e.reference, 14), 570, currentY + 12);
    doc.text(truncate(e.partyName, 26), 655, currentY + 12);

    currentY += rowHeight;
  });

  // Totals Row
  if (currentY + 24 > pageHeight - 30) {
    doc.addPage();
    currentY = 40;
  }

  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(leftMargin, currentY, tableWidth, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text("TOTAL", 45, currentY + 14);

  doc.setTextColor(21, 128, 61);
  doc.text(`Rs ${totals.totalCredit.toLocaleString("en-IN")}`, 390 + 60, currentY + 14, { align: "right" });

  doc.setTextColor(185, 28, 28);
  doc.text(`Rs ${totals.totalDebit.toLocaleString("en-IN")}`, 455 + 60, currentY + 14, { align: "right" });

  doc.setTextColor(139, 30, 45);
  doc.text(`NET BALANCE: Rs ${totals.netBalance.toLocaleString("en-IN")}`, 525, currentY + 14);

  doc.save(`ledger_${Date.now()}.pdf`);
}