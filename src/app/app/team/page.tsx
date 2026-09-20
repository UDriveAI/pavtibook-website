"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { useLanguage } from "@/lib/i18n";
import { db, functions } from "@/lib/firebase-client";
import { httpsCallable } from "firebase/functions";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  runTransaction,
  addDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  Users,
  UserPlus,
  Phone,
  Mail,
  Search,
  ArrowUpDown,
  RefreshCw,
  Trash2,
  Share2,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Activity,
  Award,
  X,
} from "lucide-react";

interface MemberDoc {
  id: string;
  userId: string;
  organizationId: string;
  name: string;
  mobile: string;
  email?: string;
  role: string;
  status?: string;
  joinedAt?: string;
  createdAt?: unknown;
  profilePhotoUrl?: string;
  profile_photo_url?: string;
  profilePhotoUrl256?: string;
}

interface InviteDoc {
  id: string;
  organizationId: string;
  organizationName?: string;
  name: string;
  mobile: string;
  email: string;
  role: string;
  activationCode: string;
  activationToken: string;
  otp?: string;
  status: string;
  expiresAt: string;
  createdAt?: unknown;
  createdBy?: string;
}

interface ActivityLogDoc {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  userName?: string;
  userRole?: string;
}

function generateActivationCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateActivationToken(): string {
  const randArr = new Uint8Array(32);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(randArr);
  } else {
    for (let i = 0; i < 32; i++) randArr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(randArr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function TeamManagementPage() {
  const { user, userData } = useAuth();
  const { activeOrg, activeRole, isOwner, isPresident, isTreasurer } = useOrg();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberDoc[]>([]);
  const [invites, setInvites] = useState<InviteDoc[]>([]);
  const [memberStats, setMemberStats] = useState<
    Record<string, { count: number; amount: number }>
  >({});
  const [subscription, setSubscription] = useState<{
    usersLimit: number;
    usersUsed: number;
    plan: string;
  }>({ usersLimit: 1, usersUsed: 1, plan: "free" });

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "role" | "alphabetical"
  >("newest");
  const [activeTab, setActiveTab] = useState<"members" | "invites">("members");

  // Modals state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteMobile, setInviteMobile] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Post-invite success dialog
  const [lastCreatedInvite, setLastCreatedInvite] = useState<{
    name: string;
    mobile: string;
    code: string;
    role: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Activity logs modal
  const [activityModalUser, setActivityModalUser] = useState<{
    name: string;
    userId: string;
  } | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLogDoc[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Role edit modal
  const [roleEditMember, setRoleEditMember] = useState<MemberDoc | null>(null);
  const [newSelectedRole, setNewSelectedRole] = useState<string>("member");
  const [roleUpdating, setRoleUpdating] = useState(false);

  // Remove confirmation modal
  const [removeTarget, setRemoveTarget] = useState<MemberDoc | null>(null);
  const [removing, setRemoving] = useState(false);

  // Transfer ownership modal
  const [transferTarget, setTransferTarget] = useState<MemberDoc | null>(null);
  const [transferring, setTransferring] = useState(false);

  const canManageTeam = isOwner || isPresident || isTreasurer || activeRole === "admin";

  const fetchTeamData = useCallback(async () => {
    if (!activeOrg?.id) return;
    setLoading(true);
    try {
      // 1. Auto-init owner record if missing
      if (user?.uid) {
        const ownerDocRef = doc(db, "organization_members", user.uid);
        const ownerDocSnap = await getDoc(ownerDocRef);
        if (!ownerDocSnap.exists()) {
          const userDocSnap = await getDoc(doc(db, "users", user.uid));
          const uData = userDocSnap.data();
          const uRole = uData?.role || (isOwner ? "owner" : "member");
          await setDoc(ownerDocRef, {
            id: user.uid,
            userId: user.uid,
            organizationId: activeOrg.id,
            name: uData?.name || user.displayName || "Owner",
            mobile: uData?.mobile || "",
            role: uRole === "admin" || uRole === "org_admin" ? "owner" : uRole,
            joinedAt: new Date().toISOString(),
          });
        }
      }

      // 2. Fetch members
      const membersQ = query(
        collection(db, "organization_members"),
        where("organizationId", "==", activeOrg.id)
      );
      const membersSnap = await getDocs(membersQ);
      const loadedMembers: MemberDoc[] = membersSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MemberDoc, "id">),
      }));
      setMembers(loadedMembers);

      // 3. Fetch invites
      const invitesQ = query(
        collection(db, "organization_invites"),
        where("organizationId", "==", activeOrg.id),
        where("status", "==", "pending")
      );
      const invitesSnap = await getDocs(invitesQ);
      const loadedInvites: InviteDoc[] = invitesSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<InviteDoc, "id">),
      }));
      setInvites(loadedInvites);

      // 4. Fetch subscription info
      try {
        const subSnap = await getDoc(doc(db, "subscriptions", activeOrg.id));
        const activeMembersCount = loadedMembers.filter((m) => (m.status || "active") === "active").length;
        if (subSnap.exists()) {
          const subData = subSnap.data();
          setSubscription({
            usersLimit: Number(subData.usersLimit || 1),
            usersUsed: Math.max(Number(subData.usersUsed || 1), Math.max(1, activeMembersCount)),
            plan: subData.plan || "free",
          });
        } else {
          setSubscription({
            usersLimit: 1,
            usersUsed: Math.max(1, activeMembersCount),
            plan: "free",
          });
        }
      } catch (e) {
        console.warn("Error fetching subscription:", e);
      }

      // 5. Fetch member receipt stats
      try {
        const receiptsQ = query(
          collection(db, "receipts"),
          where("organizationId", "==", activeOrg.id)
        );
        const receiptsSnap = await getDocs(receiptsQ);
        const statsMap: Record<string, { count: number; amount: number }> = {};
        receiptsSnap.docs.forEach((d) => {
          const data = d.data();
          const pStatus = (
            data.paymentStatus ||
            data.payment_status ||
            data.status ||
            ""
          )
            .toString()
            .toLowerCase();
          if (pStatus === "cancelled" || pStatus === "canceled") return;

          const collector = data.collectorId || data.createdBy;
          if (!collector) return;

          if (!statsMap[collector]) {
            statsMap[collector] = { count: 0, amount: 0 };
          }
          statsMap[collector].count += 1;
          const amt = Number(data.amount) || 0;
          statsMap[collector].amount += amt;
        });
        setMemberStats(statsMap);
      } catch (e) {
        console.warn("Error fetching member stats:", e);
      }
    } catch (err) {
      console.error("Error loading team data:", err);
    } finally {
      setLoading(false);
    }
  }, [activeOrg?.id, user?.uid, isOwner, user?.displayName]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  // Active Pending Invites Filter (expiresAt > now)
  const activePendingInvites = useMemo(() => {
    const now = new Date();
    return invites.filter((inv) => {
      if (!inv.expiresAt) return false;
      try {
        const exp = new Date(inv.expiresAt);
        return exp > now;
      } catch {
        return false;
      }
    });
  }, [invites]);

  // Filtered and Sorted Members
  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = members.filter((m) => {
      const name = (m.name || "").toLowerCase();
      const mobile = (m.mobile || "").toLowerCase();
      const mRole = (m.role || "").toLowerCase();
      return name.includes(q) || mobile.includes(q) || mRole.includes(q);
    });

    list.sort((a, b) => {
      const parseDate = (val: unknown) => {
        if (!val) return 0;
        if (
          typeof val === "object" &&
          val !== null &&
          "toDate" in val &&
          typeof (val as { toDate: () => Date }).toDate === "function"
        ) {
          return (val as { toDate: () => Date }).toDate().getTime();
        }
        const t = new Date(String(val)).getTime();
        return isNaN(t) ? 0 : t;
      };

      if (sortBy === "newest") {
        return (
          parseDate(b.createdAt || b.joinedAt) -
          parseDate(a.createdAt || a.joinedAt)
        );
      } else if (sortBy === "oldest") {
        return (
          parseDate(a.createdAt || a.joinedAt) -
          parseDate(b.createdAt || b.joinedAt)
        );
      } else if (sortBy === "role") {
        return (a.role || "").localeCompare(b.role || "");
      } else if (sortBy === "alphabetical") {
        return (a.name || "").localeCompare(b.name || "");
      }
      return 0;
    });

    return list;
  }, [members, searchQuery, sortBy]);

  // 1. Handle Create Invite (F33)
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");

    if (!activeOrg?.id) return;
    if (!inviteName.trim() || !inviteMobile.trim() || !inviteEmail.trim()) {
      setInviteError("Please fill in all required fields.");
      return;
    }
    const cleanMobile = inviteMobile.replace(/\D/g, "");
    if (cleanMobile.length !== 10) {
      setInviteError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!inviteEmail.includes("@")) {
      setInviteError("Please enter a valid email address.");
      return;
    }

    // Seat check
    if (subscription.usersUsed >= subscription.usersLimit) {
      setInviteError(t("seat_limit_reached_msg"));
      return;
    }

    // Max 5 pending invites
    if (activePendingInvites.length >= 5) {
      setInviteError(
        "Maximum of 5 active invitations reached. Please cancel or wait for expired invitations."
      );
      return;
    }

    // Duplicate check
    const isMemberDup = members.some(
      (m) =>
        m.mobile === cleanMobile ||
        (m.email && m.email.toLowerCase() === inviteEmail.trim().toLowerCase())
    );
    if (isMemberDup) {
      setInviteError("This mobile or email already belongs to a team member.");
      return;
    }

    const isInviteDup = activePendingInvites.some(
      (inv) =>
        inv.mobile === cleanMobile ||
        inv.email.toLowerCase() === inviteEmail.trim().toLowerCase()
    );
    if (isInviteDup) {
      setInviteError(
        "An active invitation is already pending for this mobile or email."
      );
      return;
    }

    setInviteSubmitting(true);
    try {
      const code = generateActivationCode();
      const token = generateActivationToken();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const inviteDocRef = doc(collection(db, "organization_invites"));
      const inviteData = {
        id: inviteDocRef.id,
        organizationId: activeOrg.id,
        organizationName: activeOrg.name || "PavtiBook",
        name: inviteName.trim(),
        mobile: cleanMobile,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        activationCode: code,
        activationToken: token,
        otp: code,
        status: "pending",
        expiresAt,
        createdAt: serverTimestamp(),
        createdBy: user?.uid || "",
        used: false,
      };

      await setDoc(inviteDocRef, inviteData);

      // Log activity
      await addDoc(collection(db, "activity_logs"), {
        organizationId: activeOrg.id,
        userId: user?.uid || "",
        userName: userData?.name || user?.displayName || "Admin",
        userRole: activeRole || "owner",
        action: "Invite Created",
        details: `Invited ${inviteName.trim()} (${inviteEmail.trim()}) as ${inviteRole.toUpperCase()}`,
        timestamp: new Date().toISOString(),
      });

      setLastCreatedInvite({
        name: inviteName.trim(),
        mobile: cleanMobile,
        code,
        role: inviteRole,
      });

      setIsInviteModalOpen(false);
      setInviteName("");
      setInviteMobile("");
      setInviteEmail("");
      setInviteRole("member");
      await fetchTeamData();
    } catch (err: unknown) {
      console.error("Invite error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setInviteError(msg || "Failed to create invitation.");
    } finally {
      setInviteSubmitting(false);
    }
  };

  // Resend / Refresh Invitation
  const handleResendInvite = async (inv: InviteDoc) => {
    if (!activeOrg?.id) return;
    const confirmResend = window.confirm(
      `Refresh invitation for ${inv.name} and generate a new 10-minute code?`
    );
    if (!confirmResend) return;

    try {
      const newCode = generateActivationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await updateDoc(doc(db, "organization_invites", inv.id), {
        activationCode: newCode,
        otp: newCode,
        expiresAt,
        status: "pending",
        used: false,
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "activity_logs"), {
        organizationId: activeOrg.id,
        userId: user?.uid || "",
        userName: userData?.name || user?.displayName || "Admin",
        userRole: activeRole || "owner",
        action: "Invite Sent",
        details: `Resent invitation to ${inv.name} (${inv.role})`,
        timestamp: new Date().toISOString(),
      });

      alert(`Invitation refreshed! New Code: ${newCode}`);
      await fetchTeamData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("Failed to refresh invitation: " + msg);
    }
  };

  // Cancel Invitation
  const handleCancelInvite = async (inv: InviteDoc) => {
    if (!activeOrg?.id) return;
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel the invitation for ${inv.name}?`
    );
    if (!confirmCancel) return;

    try {
      await deleteDoc(doc(db, "organization_invites", inv.id));

      await addDoc(collection(db, "activity_logs"), {
        organizationId: activeOrg.id,
        userId: user?.uid || "",
        userName: userData?.name || user?.displayName || "Admin",
        userRole: activeRole || "owner",
        action: "Member Removed",
        details: `Cancelled invitation for ${inv.name}`,
        timestamp: new Date().toISOString(),
      });

      await fetchTeamData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("Failed to cancel invitation: " + msg);
    }
  };

  // 2. Role Modification (F34)
  const handleUpdateRole = async () => {
    if (!roleEditMember || !activeOrg?.id) return;
    setRoleUpdating(true);
    try {
      await updateDoc(doc(db, "organization_members", roleEditMember.id), {
        role: newSelectedRole,
        updatedAt: serverTimestamp(),
      });

      // Try updating users doc if target is user
      try {
        if (roleEditMember.userId) {
          await updateDoc(doc(db, "users", roleEditMember.userId), {
            role: newSelectedRole,
          });
        }
      } catch {
        // Users doc update might be restricted by rules to self only
      }

      await addDoc(collection(db, "activity_logs"), {
        organizationId: activeOrg.id,
        userId: user?.uid || "",
        userName: userData?.name || user?.displayName || "Admin",
        userRole: activeRole || "owner",
        action: "Role Modified",
        details: `Changed role of ${roleEditMember.name} to ${newSelectedRole.toUpperCase()}`,
        timestamp: new Date().toISOString(),
      });

      setRoleEditMember(null);
      await fetchTeamData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("Failed to update role: " + msg);
    } finally {
      setRoleUpdating(false);
    }
  };

  // Transfer Ownership (F34)
  const handleTransferOwnership = async () => {
    if (!transferTarget || !activeOrg?.id || !user?.uid) return;
    setTransferring(true);
    try {
      const currentOwnerUserId = user.uid;
      const currentOwnerMembers = members.filter((m) => m.role === "owner");
      const currentOwnerMemberId = currentOwnerMembers[0]?.id || currentOwnerUserId;

      await runTransaction(db, async (tx) => {
        const targetMemberRef = doc(
          db,
          "organization_members",
          transferTarget.id
        );
        const currentOwnerMemberRef = doc(
          db,
          "organization_members",
          currentOwnerMemberId
        );
        const targetUserRef = doc(db, "users", transferTarget.userId);
        const currentOwnerUserRef = doc(db, "users", currentOwnerUserId);

        tx.update(targetMemberRef, { role: "owner" });
        tx.update(currentOwnerMemberRef, { role: "president" });

        tx.update(targetUserRef, { role: "owner" });
        tx.update(currentOwnerUserRef, { role: "president" });

        const logRef = doc(collection(db, "activity_logs"));
        tx.set(logRef, {
          organizationId: activeOrg.id,
          userId: currentOwnerUserId,
          userName: userData?.name || user?.displayName || "Owner",
          userRole: "owner",
          action: "Ownership Transferred",
          details: `Transferred organization ownership to ${transferTarget.name}`,
          timestamp: new Date().toISOString(),
        });
      });

      alert(
        `Ownership successfully transferred to ${transferTarget.name}. Your role is now President.`
      );
      setTransferTarget(null);
      window.location.reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("Failed to transfer ownership: " + msg);
    } finally {
      setTransferring(false);
    }
  };

  // 3. Remove Member (F35)
  const handleRemoveMember = async () => {
    if (!removeTarget || !activeOrg?.id || !user?.uid) return;
    if (removeTarget.userId === user.uid) {
      alert("You cannot remove yourself from the organization.");
      return;
    }

    setRemoving(true);
    try {
      const removeMemberFn = httpsCallable(functions, "removeOrganizationMember");
      await removeMemberFn({
        organizationId: activeOrg.id,
        memberDocId: removeTarget.id,
        targetUserId: removeTarget.userId,
      });

      setRemoveTarget(null);
      await fetchTeamData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("Failed to remove member: " + msg);
    } finally {
      setRemoving(false);
    }
  };

  // View Activity
  const openActivityModal = async (member: MemberDoc) => {
    if (!activeOrg?.id) return;
    setActivityModalUser({ name: member.name, userId: member.userId });
    setLoadingActivity(true);
    try {
      const actQ = query(
        collection(db, "activity_logs"),
        where("organizationId", "==", activeOrg.id),
        where("userId", "==", member.userId),
        orderBy("timestamp", "desc"),
        limit(50)
      );
      const snap = await getDocs(actQ);
      const logs: ActivityLogDoc[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ActivityLogDoc, "id">),
      }));
      setActivityLogs(logs);
    } catch (e) {
      console.warn("Error loading activity logs:", e);
      setActivityLogs([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  const getRoleBadge = (mRole: string) => {
    switch (mRole.toLowerCase()) {
      case "owner":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            {t("role_owner")}
          </span>
        );
      case "president":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-900 border border-purple-300">
            {t("role_president")}
          </span>
        );
      case "treasurer":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-300">
            {t("role_treasurer")}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            {t("role_member")}
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#8B1E2D]" />
            {t("team_management_title")}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{t("team_subtitle")}</p>
        </div>

        {canManageTeam && (
          <button
            onClick={() => {
              setInviteError("");
              setIsInviteModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#8B1E2D] hover:bg-[#721824] text-white font-medium rounded-lg shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            {t("invite_member_btn")}
          </button>
        )}
      </div>

      {/* Seats Usage Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-red-50 text-[#8B1E2D] flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500">{t("seats_usage_label")}</div>
            <div className="text-lg font-bold text-slate-900">
              {subscription.usersUsed} / {subscription.usersLimit} Seats
            </div>
            <div className="text-xs text-slate-400 capitalize">
              Plan: {subscription.plan}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Check className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500">{t("active_members_tab")}</div>
            <div className="text-lg font-bold text-emerald-700">
              {members.length} Active
            </div>
            <div className="text-xs text-slate-400">All registered roles</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500">{t("pending_invites_tab")}</div>
            <div className="text-lg font-bold text-amber-700">
              {activePendingInvites.length} Pending
            </div>
            <div className="text-xs text-slate-400">Expires in 10 mins</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("members")}
          className={`pb-3 font-semibold text-sm transition relative ${
            activeTab === "members"
              ? "text-[#8B1E2D] border-b-2 border-[#8B1E2D]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {t("active_members_tab")} ({members.length})
        </button>
        <button
          onClick={() => setActiveTab("invites")}
          className={`pb-3 font-semibold text-sm transition relative ${
            activeTab === "invites"
              ? "text-[#8B1E2D] border-b-2 border-[#8B1E2D]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {t("pending_invites_tab")} ({activePendingInvites.length})
        </button>
      </div>

      {/* Tab 1: Active Members */}
      {activeTab === "members" && (
        <div className="space-y-4">
          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search member by name, mobile, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]"
              />
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as
                      | "newest"
                      | "oldest"
                      | "role"
                      | "alphabetical"
                  )
                }
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="role">Sort by Role</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </div>
          </div>

          {/* Members List */}
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B1E2D] mb-2" />
              <p className="text-sm">Loading team members...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">No members found</p>
              <p className="text-xs text-slate-500 mt-1">
                Invite your mandal / trust members to manage receipts together.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMembers.map((member) => {
                const stats = memberStats[member.userId] || {
                  count: 0,
                  amount: 0,
                };
                const isCurrent = member.userId === user?.uid;

                return (
                  <div
                    key={member.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 uppercase">
                            {member.name.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900 text-sm">
                                {member.name}
                              </h3>
                              {isCurrent && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                              <Phone className="w-3 h-3" />
                              <span>{member.mobile || "No mobile"}</span>
                            </div>
                          </div>
                        </div>

                        <div>{getRoleBadge(member.role)}</div>
                      </div>

                      {/* Performance Stats */}
                      <div className="grid grid-cols-2 gap-2 mt-4 p-2.5 bg-slate-50 rounded-lg text-xs">
                        <div>
                          <span className="text-slate-500">Receipts Issued:</span>
                          <div className="font-bold text-slate-800">
                            {stats.count}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500">Total Collected:</span>
                          <div className="font-bold text-[#8B1E2D]">
                            ₹{stats.amount.toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Member Actions */}
                    <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between">
                      <button
                        onClick={() => openActivityModal(member)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        Activity
                      </button>

                      {isOwner && !isCurrent && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setRoleEditMember(member);
                              setNewSelectedRole(member.role);
                            }}
                            className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 transition"
                          >
                            {t("change_role_label")}
                          </button>

                          <button
                            onClick={() => setTransferTarget(member)}
                            className="text-xs text-purple-700 hover:text-purple-900 px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 transition"
                            title="Transfer Ownership"
                          >
                            <Award className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setRemoveTarget(member)}
                            className="text-xs text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition"
                            title={t("remove_member_btn")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Pending Invitations */}
      {activeTab === "invites" && (
        <div className="space-y-4">
          {activePendingInvites.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">No pending invitations</p>
              <p className="text-xs text-slate-500 mt-1">
                All invitations have either been accepted or expired.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activePendingInvites.map((inv) => {
                const code = inv.activationCode || inv.otp || "";
                const expiresDate = new Date(inv.expiresAt);
                const expiryString = expiresDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                const shareText = `Namaskar ${inv.name},\nYou are invited to join ${
                  activeOrg?.name || "PavtiBook"
                } on PavtiBook as ${inv.role.toUpperCase()}.\n\nActivation Code: *${code}* (Valid for 10 minutes).\nDownload App: https://pavtibook.com\n\nThank you!`;

                return (
                  <div
                    key={inv.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900 text-sm">
                          {inv.name}
                        </h4>
                        <span className="text-xs bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                        {getRoleBadge(inv.role)}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {inv.mobile}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {inv.email}
                        </span>
                        <span className="flex items-center gap-1 text-amber-700 font-medium">
                          <Clock className="w-3 h-3" /> Expires at {expiryString}
                        </span>
                      </div>

                      {/* Code Banner */}
                      <div className="mt-2.5 inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
                        <span className="text-xs text-slate-500 font-medium">
                          Activation Code:
                        </span>
                        <span className="text-sm font-mono font-bold tracking-widest text-[#8B1E2D]">
                          {code}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(code);
                            alert("Activation Code copied to clipboard!");
                          }}
                          className="text-slate-400 hover:text-slate-700 p-0.5"
                          title="Copy Code"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                      <a
                        href={`https://wa.me/91${inv.mobile}?text=${encodeURIComponent(
                          shareText
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>

                      {canManageTeam && (
                        <>
                          <button
                            onClick={() => handleResendInvite(inv)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                            title="Generate new code (10m)"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            {t("resend_invite_btn")}
                          </button>

                          <button
                            onClick={() => handleCancelInvite(inv)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title={t("cancel_invite_btn")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Invite Member Modal (F33) */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#8B1E2D]" />
                {t("invite_modal_title")}
              </h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t("invitee_name_label")}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patil"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t("invitee_mobile_label")}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit number"
                    value={inviteMobile}
                    onChange={(e) => setInviteMobile(e.target.value)}
                    className="w-full pl-12 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t("invitee_email_label")}
                </label>
                <input
                  type="email"
                  required
                  placeholder="member@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t("invitee_role_label")}
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B1E2D] focus:outline-none bg-white"
                >
                  <option value="president">{t("role_president")}</option>
                  <option value="treasurer">{t("role_treasurer")}</option>
                  <option value="member">{t("role_member")}</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="px-4 py-2 bg-[#8B1E2D] hover:bg-[#721824] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {inviteSubmitting
                    ? t("sending_invite")
                    : t("send_invite_btn")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Invite Success & Code Display */}
      {lastCreatedInvite && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-slate-900 text-lg">
              {t("invite_sent_success")}
            </h3>
            <p className="text-xs text-slate-600">
              Share this activation code with{" "}
              <strong>{lastCreatedInvite.name}</strong>. The code is valid for 10
              minutes.
            </p>

            <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-4 my-2">
              <div className="text-xs text-slate-500 mb-1 uppercase font-semibold">
                {t("invite_code_label")}
              </div>
              <div className="text-3xl font-mono font-bold tracking-widest text-[#8B1E2D]">
                {lastCreatedInvite.code}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(lastCreatedInvite.code);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2500);
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> {t("copy_invite_code")}
                  </>
                )}
              </button>

              <a
                href={`https://wa.me/91${
                  lastCreatedInvite.mobile
                }?text=${encodeURIComponent(
                  `Namaskar ${lastCreatedInvite.name},\nYou are invited to join ${
                    activeOrg?.name || "PavtiBook"
                  } on PavtiBook as ${lastCreatedInvite.role.toUpperCase()}.\n\nActivation Code: *${
                    lastCreatedInvite.code
                  }* (Valid for 10 minutes).\nDownload App: https://pavtibook.com\n\nThank you!`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" /> {t("share_invite_whatsapp")}
              </a>

              <button
                onClick={() => setLastCreatedInvite(null)}
                className="text-xs text-slate-500 hover:text-slate-800 py-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Member Activity Logs */}
      {activityModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Activity for {activityModalUser.name}
              </h3>
              <button
                onClick={() => setActivityModalUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-3">
              {loadingActivity ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Loading activity logs...
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No activity logs recorded for this member.
                </div>
              ) : (
                activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#8B1E2D]">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {log.timestamp
                          ? new Date(log.timestamp).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>
                    <p className="text-slate-600">{log.details}</p>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-end">
              <button
                onClick={() => setActivityModalUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Change Role Modal (F34) */}
      {roleEditMember && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              {t("change_role_label")}: {roleEditMember.name}
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select New Role
              </label>
              <select
                value={newSelectedRole}
                onChange={(e) => setNewSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="president">{t("role_president")}</option>
                <option value="treasurer">{t("role_treasurer")}</option>
                <option value="member">{t("role_member")}</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRoleEditMember(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRole}
                disabled={roleUpdating}
                className="px-4 py-1.5 bg-[#8B1E2D] hover:bg-[#721824] text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                {roleUpdating ? "Updating..." : "Save Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Transfer Ownership Confirmation (F34) */}
      {transferTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
              <Award className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-slate-900 text-center text-lg">
              {t("transfer_ownership_btn")}
            </h3>
            <p className="text-xs text-slate-600 text-center">
              {t("transfer_ownership_confirm_desc")}
            </p>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900 text-center font-medium">
              New Owner: <strong>{transferTarget.name}</strong> ({transferTarget.mobile})
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setTransferTarget(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferOwnership}
                disabled={transferring}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                {transferring
                  ? t("transferring_ownership")
                  : t("transfer_ownership_btn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Remove Member Confirmation (F35) */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-slate-900 text-center text-lg">
              {t("remove_member_confirm_title")}
            </h3>
            <p className="text-xs text-slate-600 text-center">
              {t("remove_member_confirm_desc")}
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 text-center font-medium">
              Member: <strong>{removeTarget.name}</strong> ({removeTarget.mobile})
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRemoveTarget(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveMember}
                disabled={removing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                {removing ? t("removing_member") : t("remove_member_btn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
