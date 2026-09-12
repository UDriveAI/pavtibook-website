"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "./firebase-client";
import { useAuth } from "../context/AuthContext";
import { useOrg } from "../context/OrgContext";

export interface DashboardStats {
  total: number;
  today: number;
  monthly: number;
  yearly: number;
  cash: number;
  upi: number;
  bank: number;
  cheque: number;
  other: number;
  pending: number;
  totalReceiptsCount: number;
  todayReceiptsCount: number;
  monthReceiptsCount: number;
  deliveredReceiptsCount: number;
  pendingReceiptsCount: number;
  donorsCount: number;
  totalDonors: number;
}

export interface ReceiptItem {
  id: string;
  organizationId: string;
  receiptNumber: string;
  amount: number;
  purpose: string;
  paymentMode: string;
  paymentStatus: string;
  createdAt: string;
  donorName?: string;
  donorMobile?: string;
  collectorName?: string;
  collectorId?: string;
  collectorRole?: string;
  createdBy?: string;
  createdByName?: string;
  createdByRole?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deleteReason?: string;
}

export interface MemberPerformance {
  uid: string;
  name: string;
  role: string;
  total: number;
  todayAmt: number;
  monthAmt: number;
  count: number;
  pendingCount: number;
  lastReceipt?: Date | null;
}

export function normalizePaymentMode(mode: unknown): string {
  if (!mode) return "other";
  const m = String(mode).trim().toLowerCase();
  if (m === "cash" || m === "रोख" || m === "नकद") return "cash";
  if (
    m === "upi" ||
    m === "gpay" ||
    m === "phonepe" ||
    m === "paytm" ||
    m === "google pay" ||
    m === "phone pe"
  )
    return "upi";
  if (
    m === "bank" ||
    m === "bank transfer" ||
    m === "bank_transfer" ||
    m === "neft" ||
    m === "rtgs" ||
    m === "imps" ||
    m === "बँक हस्तांतरण" ||
    m === "बैंक ट्रांसफर"
  )
    return "bank";
  if (m === "cheque" || m === "check" || m === "धनादेश" || m === "चेक")
    return "cheque";
  if (m === "other" || m === "इतर" || m === "अन्य") return "other";
  return "other";
}

export function normalizePaymentStatus(status: unknown): string {
  if (!status) return "paid";
  const s = String(status).trim().toLowerCase();
  if (s === "paid" || s === "completed" || s === "success" || s === "यशस्वी")
    return "paid";
  if (s === "pending" || s === "प्रलंबित") return "pending";
  if (s === "cancelled" || s === "रद्द") return "cancelled";
  return s;
}

export function parseReceiptDateTime(createdAtVal: unknown): Date | null {
  if (!createdAtVal) return null;
  if (createdAtVal instanceof Date) return createdAtVal;
  if (
    typeof createdAtVal === "object" &&
    createdAtVal !== null &&
    "toDate" in createdAtVal &&
    typeof (createdAtVal as { toDate: () => Date }).toDate === "function"
  ) {
    return (createdAtVal as { toDate: () => Date }).toDate();
  }
  if (typeof createdAtVal === "string") {
    const d = new Date(createdAtVal);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function useDashboardData() {
  const { user } = useAuth();
  const { activeOrgId, currentMembership, isOwner, isPresident, isTreasurer, isMember } = useOrg();

  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    today: 0,
    monthly: 0,
    yearly: 0,
    cash: 0,
    upi: 0,
    bank: 0,
    cheque: 0,
    other: 0,
    pending: 0,
    totalReceiptsCount: 0,
    todayReceiptsCount: 0,
    monthReceiptsCount: 0,
    deliveredReceiptsCount: 0,
    pendingReceiptsCount: 0,
    donorsCount: 0,
    totalDonors: 0,
  });

  const [allReceipts, setAllReceipts] = useState<ReceiptItem[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<ReceiptItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<MemberPerformance[]>([]);
  const [myPerformance, setMyPerformance] = useState<{
    todayAmt: number;
    monthAmt: number;
    totalAmt: number;
    pendingCount: number;
  }>({
    todayAmt: 0,
    monthAmt: 0,
    totalAmt: 0,
    pendingCount: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeOrgId) {
      setStats({
        total: 0,
        today: 0,
        monthly: 0,
        yearly: 0,
        cash: 0,
        upi: 0,
        bank: 0,
        cheque: 0,
        other: 0,
        pending: 0,
        totalReceiptsCount: 0,
        todayReceiptsCount: 0,
        monthReceiptsCount: 0,
        deliveredReceiptsCount: 0,
        pendingReceiptsCount: 0,
        donorsCount: 0,
        totalDonors: 0,
      });
      setAllReceipts([]);
      setRecentReceipts([]);
      setTeamMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Fetch total donors count
    const fetchDonorsCount = async () => {
      try {
        const donorsColl = collection(db, "donors");
        const qDonors = query(donorsColl, where("organizationId", "==", activeOrgId));
        const snap = await getCountFromServer(qDonors);
        const count = snap.data().count;
        setStats((prev) => ({ ...prev, donorsCount: count, totalDonors: count }));
      } catch (err) {
        console.warn("Could not fetch donors count:", err);
      }
    };
    fetchDonorsCount();

    const receiptsColl = collection(db, "receipts");
    const qReceipts = query(receiptsColl, where("organizationId", "==", activeOrgId));

    const unsubscribe = onSnapshot(
      qReceipts,
      (snapshot) => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const normalizedRole = (currentMembership?.role || "").trim().toLowerCase();
        const isOwnerRole =
          isOwner ||
          normalizedRole === "admin" ||
          normalizedRole === "owner" ||
          normalizedRole === "president" ||
          normalizedRole === "treasurer" ||
          normalizedRole === "superadmin" ||
          normalizedRole === "software_owner";

        let total = 0;
        let today = 0;
        let monthly = 0;
        let yearly = 0;
        let cash = 0;
        let upi = 0;
        let bank = 0;
        let cheque = 0;
        let other = 0;
        let pending = 0;

        let totalReceipts = 0;
        let todayReceipts = 0;
        let monthReceipts = 0;
        let deliveredReceipts = 0;
        let pendingReceipts = 0;

        const rawList: ReceiptItem[] = [];

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const isDeleted =
            data.isDeleted === true ||
            data.is_deleted === true ||
            data.deletedAt != null ||
            data.deleted_at != null;

          let createdAtStr = "";
          if (data.createdAt?.toDate) {
            createdAtStr = data.createdAt.toDate().toISOString();
          } else if (typeof data.createdAt === "string") {
            createdAtStr = data.createdAt;
          } else if (data.created_at?.toDate) {
            createdAtStr = data.created_at.toDate().toISOString();
          } else if (typeof data.created_at === "string") {
            createdAtStr = data.created_at;
          }

          const receipt: ReceiptItem = {
            id: docSnap.id,
            organizationId: data.organizationId || data.organization_id || activeOrgId,
            receiptNumber: data.receiptNumber || data.receipt_number || "",
            amount: typeof data.amount === "number" ? data.amount : Number(data.amount || 0),
            purpose: data.purpose || "",
            paymentMode: normalizePaymentMode(data.paymentMode || data.payment_mode || data.paymentMethod),
            paymentStatus: normalizePaymentStatus(data.paymentStatus || data.payment_status || data.status),
            createdAt: createdAtStr,
            donorName: data.donorName || data.donor_name,
            donorMobile: data.donorMobile || data.donor_mobile,
            collectorName: data.collectorName || data.collector_name,
            collectorId: data.collectorId || data.collector_id,
            collectorRole: data.collectorRole || data.collector_role,
            createdBy: data.createdBy || data.created_by,
            createdByName: data.createdByName || data.created_by_name,
            createdByRole: data.createdByRole || data.created_by_role,
            isDeleted,
            deletedAt: data.deletedAt || data.deleted_at,
            deleteReason: data.deleteReason || data.delete_reason,
          };

          rawList.push(receipt);

          if (isDeleted) return;
          if (receipt.paymentStatus === "cancelled") return;

          const createdByUid = receipt.createdBy || receipt.collectorId || "";
          const collectorUid = receipt.collectorId || "";
          const myUid = user?.uid || "";

          // Member dashboard only aggregates member's own receipts
          if (!isOwnerRole && createdByUid !== myUid && collectorUid !== myUid) {
            return;
          }

          const parsedDate = parseReceiptDateTime(receipt.createdAt);
          let isToday = false;
          let isMonth = false;
          let isYear = false;

          if (parsedDate) {
            isToday =
              parsedDate.getFullYear() === now.getFullYear() &&
              parsedDate.getMonth() === now.getMonth() &&
              parsedDate.getDate() === now.getDate();
            isMonth =
              parsedDate.getFullYear() === now.getFullYear() &&
              parsedDate.getMonth() === now.getMonth();
            isYear = parsedDate.getFullYear() === now.getFullYear();

            if (isToday) todayReceipts++;
            if (isMonth) monthReceipts++;
          }

          if (receipt.paymentStatus === "paid") {
            deliveredReceipts++;
            total += receipt.amount;
            totalReceipts++;

            if (receipt.paymentMode === "cash") cash += receipt.amount;
            else if (receipt.paymentMode === "upi") upi += receipt.amount;
            else if (receipt.paymentMode === "bank") bank += receipt.amount;
            else if (receipt.paymentMode === "cheque") cheque += receipt.amount;
            else other += receipt.amount;

            if (parsedDate) {
              if (isToday) today += receipt.amount;
              if (isMonth) monthly += receipt.amount;
              if (isYear) yearly += receipt.amount;
            }
          } else if (receipt.paymentStatus === "pending") {
            pendingReceipts++;
            pending += receipt.amount;
          }
        });

        // Sort raw receipts descending by createdAt
        rawList.sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        });

        setAllReceipts(rawList);

        // Recent 5 receipts scoped to user's permissions
        const myUid = user?.uid || "";
        const recent = rawList
          .filter(
            (r) =>
              isOwner ||
              isPresident ||
              isTreasurer ||
              r.createdBy === myUid ||
              r.collectorId === myUid
          )
          .slice(0, 5);
        setRecentReceipts(recent);

        // Member performance calculations for non-owners
        let myTodayAmt = 0;
        let myMonthAmt = 0;
        let myTotalAmt = 0;
        let myPendingCount = 0;

        rawList.forEach((r) => {
          if (r.collectorId === myUid && r.paymentStatus !== "cancelled") {
            const d = parseReceiptDateTime(r.createdAt);
            if (d && d >= startOfToday) myTodayAmt += r.amount;
            if (d && d >= startOfMonth) myMonthAmt += r.amount;
            if (r.paymentStatus === "paid") myTotalAmt += r.amount;
            if (r.paymentStatus === "pending") myPendingCount++;
          }
        });

        setMyPerformance({
          todayAmt: myTodayAmt,
          monthAmt: myMonthAmt,
          totalAmt: myTotalAmt,
          pendingCount: myPendingCount,
        });

        // Team performance calculations for owners/presidents
        const byMember: Record<string, MemberPerformance> = {};
        rawList.forEach((r) => {
          if (r.paymentStatus === "cancelled") return;
          const cid = r.collectorId || r.createdBy || "unknown";
          if (!byMember[cid]) {
            byMember[cid] = {
              uid: cid,
              name: r.collectorName || r.createdByName || "Unknown",
              role: r.collectorRole || r.createdByRole || "",
              total: 0,
              todayAmt: 0,
              monthAmt: 0,
              count: 0,
              pendingCount: 0,
              lastReceipt: null,
            };
          }

          const d = parseReceiptDateTime(r.createdAt);
          byMember[cid].count++;

          if (r.paymentStatus === "paid") {
            byMember[cid].total += r.amount;
            if (d && d >= startOfToday) byMember[cid].todayAmt += r.amount;
            if (d && d >= startOfMonth) byMember[cid].monthAmt += r.amount;
          } else if (r.paymentStatus === "pending") {
            byMember[cid].pendingCount++;
          }

          if (d) {
            const prev = byMember[cid].lastReceipt;
            if (!prev || d > prev) {
              byMember[cid].lastReceipt = d;
            }
          }
        });

        const sortedTeam = Object.values(byMember).sort((a, b) => b.total - a.total);
        setTeamMembers(sortedTeam);

        setStats((prev) => ({
          ...prev,
          total,
          today,
          monthly,
          yearly,
          cash,
          upi,
          bank,
          cheque,
          other,
          pending,
          totalReceiptsCount: totalReceipts,
          todayReceiptsCount: todayReceipts,
          monthReceiptsCount: monthReceipts,
          deliveredReceiptsCount: deliveredReceipts,
          pendingReceiptsCount: pendingReceipts,
        }));

        setIsLoading(false);
      },
      (err) => {
        console.error("Firestore onSnapshot error:", err);
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeOrgId, currentMembership, isOwner, isPresident, isTreasurer, isMember, user?.uid]);

  return {
    stats,
    allReceipts,
    recentReceipts,
    teamMembers,
    myPerformance,
    isLoading,
    error,
  };
}