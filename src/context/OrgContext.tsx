"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  writeBatch,
  limit,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../lib/firebase-client";
import { useAuth, OrganizationProfile } from "./AuthContext";

export interface UserMembership {
  membershipId: string;
  organizationId: string;
  organizationName: string;
  role: string;
  joinedAt: string;
  orgData?: OrganizationProfile;
}

export interface InviteData {
  id: string;
  organizationId: string;
  organizationName?: string;
  name: string;
  mobile: string;
  email?: string;
  role: string;
  status: string;
  activationCode?: string;
  activationToken?: string;
  otp?: string;
  expiresAt?: string;
  used?: boolean;
  usedAt?: unknown;
  [key: string]: unknown;
}

export interface RegisterOrgData {
  orgName: string;
  orgType: string;
  adminName: string;
  adminMobile: string;
  adminEmail: string;
  password?: string;
  orgMobile?: string;
  orgEmail?: string;
  contactPerson?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  upiId?: string;
  registrationNumber?: string;
}

export interface OnboardingProfileData {
  upiId: string;
  contactPerson: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  registrationNumber?: string;
}

interface OrgContextType {
  allOrganizations: UserMembership[];
  isLoadingOrgs: boolean;
  activeOrg: OrganizationProfile | null;
  activeRole: string;
  activeOrgId: string | null;
  hasMultipleOrganizations: boolean;
  currentMembership: UserMembership | null;
  isOwner: boolean;
  isPresident: boolean;
  isTreasurer: boolean;
  isMember: boolean;
  refreshOrgs: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<{ success: boolean; error?: string }>;
  registerOrganization: (data: RegisterOrgData) => Promise<{ success: boolean; orgId?: string; error?: string }>;
  updateOnboardingDetails: (orgId: string, data: OnboardingProfileData) => Promise<{ success: boolean; error?: string }>;
  verifyInvitation: (mobile: string, code: string) => Promise<{ success: boolean; invite?: InviteData; error?: string }>;
  activateInvitation: (invite: InviteData, name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

const OrgContext = createContext<OrgContextType>({
  allOrganizations: [],
  isLoadingOrgs: false,
  activeOrg: null,
  activeRole: "member",
  activeOrgId: null,
  hasMultipleOrganizations: false,
  currentMembership: null,
  isOwner: false,
  isPresident: false,
  isTreasurer: false,
  isMember: true,
  refreshOrgs: async () => {},
  switchOrganization: async () => ({ success: false }),
  registerOrganization: async () => ({ success: false }),
  updateOnboardingDetails: async () => ({ success: false }),
  verifyInvitation: async () => ({ success: false }),
  activateInvitation: async () => ({ success: false }),
});

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user, userData, activeOrgId: authActiveOrgId, activeOrgData: authActiveOrgData, activeRole: authActiveRole } = useAuth();
  const [allOrganizations, setAllOrganizations] = useState<UserMembership[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState<boolean>(false);
  const [activeOrg, setActiveOrg] = useState<OrganizationProfile | null>(authActiveOrgData);
  const [activeRole, setActiveRole] = useState<string>(authActiveRole);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(authActiveOrgId);

  // Synchronize with AuthContext
  useEffect(() => {
    setCurrentOrgId(authActiveOrgId);
    setActiveOrg(authActiveOrgData);
    setActiveRole(authActiveRole);
  }, [authActiveOrgId, authActiveOrgData, authActiveRole]);

  // Resolve role matching Android resolveActiveRole exactly
  const resolveActiveRole = useCallback(async (uid: string, orgId: string, orgData?: Record<string, unknown>): Promise<string> => {
    const ownerUid =
      orgData?.ownerUid ||
      orgData?.owner_uid ||
      orgData?.ownerId ||
      orgData?.owner_id ||
      orgData?.adminId ||
      orgData?.createdBy;

    if (ownerUid && String(ownerUid) === uid) {
      return "owner";
    }

    if (userData?.isSoftwareOwner || userData?.is_software_owner) {
      return "owner";
    }

    try {
      // 1. Check doc organization_members/{uid} (used by registerOrganization)
      const memberDocByUid = await getDoc(doc(db, "organization_members", uid));
      if (memberDocByUid.exists()) {
        const d = memberDocByUid.data();
        if (d?.organizationId === orgId && d?.role) {
          return String(d.role).toLowerCase();
        }
      }

      // 2. Check doc organization_members/{uid}_{orgId} (used by invite flow)
      const memberDocComposite = await getDoc(doc(db, "organization_members", `${uid}_${orgId}`));
      if (memberDocComposite.exists()) {
        const d = memberDocComposite.data();
        if (d?.role) {
          return String(d.role).toLowerCase();
        }
      }

      // 3. Fallback query by userId
      const q = query(
        collection(db, "organization_members"),
        where("userId", "==", uid),
        where("organizationId", "==", orgId),
        limit(1)
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const r = querySnap.docs[0].data().role;
        if (r) return String(r).toLowerCase();
      }
    } catch (err) {
      console.warn("[ROLE_RESOLUTION] Error checking role:", err);
    }

    return (userData?.role as string) || "member";
  }, [userData]);

  // Load all organizations for current user (matching Android _loadUserOrganizations)
  const refreshOrgs = useCallback(async () => {
    const uid = user?.uid;
    if (!uid) {
      setAllOrganizations([]);
      return;
    }

    setIsLoadingOrgs(true);
    try {
      const memberships: UserMembership[] = [];
      const seenOrgIds = new Set<string>();

      // 1. Query organization_members where userId == uid
      const membersQuery = query(collection(db, "organization_members"), where("userId", "==", uid));
      const membersSnap = await getDocs(membersQuery);

      for (const mDoc of membersSnap.docs) {
        const mData = mDoc.data();
        const oId = mData.organizationId;
        if (oId && !seenOrgIds.has(String(oId))) {
          seenOrgIds.add(String(oId));
          const oDoc = await getDoc(doc(db, "organizations", String(oId)));
          if (oDoc.exists()) {
            const oData = { id: oDoc.id, ...oDoc.data() } as OrganizationProfile;
            memberships.push({
              membershipId: mDoc.id,
              organizationId: String(oId),
              organizationName: (oData.name || oData.orgName || "Organization") as string,
              role: (mData.role as string) || "member",
              joinedAt: (mData.joinedAt as string) || "",
              orgData: oData,
            });
          }
        }
      }

      // 2. Check user's root document fallback (lastSelectedOrgId / organizationId)
      const userDocRef = doc(db, "users", uid);
      const uSnap = await getDoc(userDocRef);
      if (uSnap.exists()) {
        const uData = uSnap.data();
        const defaultOrgId = uData.lastSelectedOrgId || uData.organization_id || uData.organizationId;
        if (defaultOrgId && !seenOrgIds.has(String(defaultOrgId))) {
          seenOrgIds.add(String(defaultOrgId));
          const oDoc = await getDoc(doc(db, "organizations", String(defaultOrgId)));
          if (oDoc.exists()) {
            const oData = { id: oDoc.id, ...oDoc.data() } as OrganizationProfile;
            memberships.push({
              membershipId: uid,
              organizationId: String(defaultOrgId),
              organizationName: (oData.name || oData.orgName || "Organization") as string,
              role: (uData.role as string) || "owner",
              joinedAt: (uData.createdAt as string) || "",
              orgData: oData,
            });
          }
        }
      }

      setAllOrganizations(memberships);
    } catch (err) {
      console.error("[LOAD_ORGS] Failed to load user organizations:", err);
    } finally {
      setIsLoadingOrgs(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.uid) {
      refreshOrgs();
    } else {
      setAllOrganizations([]);
    }
  }, [user?.uid, refreshOrgs]);

  // Switch organization (matching Android switchOrganization)
  const switchOrganization = useCallback(async (orgId: string): Promise<{ success: boolean; error?: string }> => {
    const uid = user?.uid;
    if (!uid) return { success: false, error: "User not authenticated." };

    try {
      const orgDocRef = doc(db, "organizations", orgId);
      const orgSnap = await getDoc(orgDocRef);
      if (!orgSnap.exists()) {
        return { success: false, error: "Organization not found." };
      }

      const orgData = { id: orgSnap.id, ...orgSnap.data() } as OrganizationProfile;
      const role = await resolveActiveRole(uid, orgId, orgData);

      // Update Firestore user document with lastSelectedOrgId
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, {
        lastSelectedOrgId: orgId,
        organizationId: orgId,
        organization_id: orgId,
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch((e) => {
        console.warn("[SWITCH_ORG] Note updating user doc:", e);
      });

      // Audit Log for organization switch
      try {
        await addDoc(collection(db, "activity_logs"), {
          organizationId: orgId,
          userId: uid,
          userName: userData?.name || "User",
          userRole: role,
          action: "Organization Switched",
          details: `${userData?.name || "User"} switched active organization to ${orgData.name || "Organization"}`,
          timestamp: serverTimestamp(),
        });
      } catch {
        // non-blocking
      }

      setCurrentOrgId(orgId);
      setActiveOrg(orgData);
      setActiveRole(role);
      await refreshOrgs();

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }, [user, userData, resolveActiveRole, refreshOrgs]);

  // Register organization (matching Android registerOrganization)
  const registerOrganization = useCallback(async (regData: RegisterOrgData): Promise<{ success: boolean; orgId?: string; error?: string }> => {
    try {
      let uid = user?.uid;
      const adminEmail = regData.adminEmail.trim();
      const adminMobile = (regData.adminMobile || regData.orgMobile || "").trim();
      const password = regData.password || "";

      // 1. Ensure Firebase Auth User exists
      if (!uid) {
        if (!adminEmail || !password) {
          return { success: false, error: "Admin email and password are required to create an account." };
        }
        const userCred = await createUserWithEmailAndPassword(auth, adminEmail, password);
        uid = userCred.user.uid;
      }

      // 1.2 Mobile uniqueness check
      let cleanMobile = adminMobile.replace(/\D/g, "");
      if (cleanMobile.startsWith("91") && cleanMobile.length > 10) {
        cleanMobile = cleanMobile.substring(2);
      }

      const mobileQuery = query(
        collection(db, "users"),
        where("mobile", "in", [adminMobile, cleanMobile, `+91${cleanMobile}`, `+91 ${cleanMobile}`]),
        limit(1)
      );
      const mobileSnap = await getDocs(mobileQuery);
      if (!mobileSnap.empty && mobileSnap.docs[0].id !== uid) {
        return { success: false, error: "This mobile number is already registered. Please log in." };
      }

      // 2. Create Organization Doc in Firestore
      const orgRef = doc(collection(db, "organizations"));
      const orgId = orgRef.id;

      const orgDocData = {
        id: orgId,
        name: regData.orgName.trim(),
        type: regData.orgType,
        contact_person: (regData.contactPerson || regData.adminName).trim(),
        mobile: (regData.orgMobile || regData.adminMobile).trim(),
        email: (regData.orgEmail || regData.adminEmail).trim(),
        address: regData.address?.trim() || null,
        city: regData.city?.trim() || null,
        state: regData.state?.trim() || "Maharashtra",
        pincode: regData.pincode?.trim() || null,
        upi_id: regData.upiId?.trim() || null,
        registration_number: regData.registrationNumber?.trim() || null,
        logo_url: null,
        is_verified: false,
        subscription_plan: "free_trial",
        ownerUid: uid,
        owner_uid: uid,
        createdAt: serverTimestamp(),
        organizationVersion: 1,
      };

      await setDoc(orgRef, orgDocData);

      // 3. Create/Update User Doc in Firestore
      const userDocRef = doc(db, "users", uid);
      const userDocData = {
        id: uid,
        organization_id: orgId,
        organizationId: orgId,
        lastSelectedOrgId: orgId,
        name: regData.adminName.trim(),
        email: adminEmail,
        mobile: adminMobile,
        role: "owner",
        is_active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userDocRef, userDocData, { merge: true });

      // 4. Create Subscription Doc (matches firestore.rules strictly: plan=free_trial, usersLimit=1, usersUsed=1, receiptsUsed=0)
      const subRef = doc(db, "subscriptions", orgId);
      const subDocData = {
        id: orgId,
        organizationId: orgId,
        plan: "free_trial",
        receiptsUsed: 0,
        receiptLimit: 25,
        usersUsed: 1,
        usersLimit: 1,
        autoWhatsAppLimit: 0,
        canShareNow: true,
        status: "free_trial",
        renewalDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(subRef, subDocData);

      // 5. Create Member Doc in Firestore (doc ID = uid)
      const memberRef = doc(db, "organization_members", uid);
      await setDoc(memberRef, {
        id: uid,
        userId: uid,
        organizationId: orgId,
        name: regData.adminName.trim(),
        mobile: adminMobile,
        role: "owner",
        joinedAt: new Date().toISOString(),
      });

      // Update local state
      setCurrentOrgId(orgId);
      setActiveOrg({ ...orgDocData } as OrganizationProfile);
      setActiveRole("owner");
      await refreshOrgs();

      return { success: true, orgId };
    } catch (err: unknown) {
      console.error("[REGISTER_ORG] Error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }, [user, refreshOrgs]);

  // Update Onboarding Details (matching Android updateOnboardingDetails)
  const updateOnboardingDetails = useCallback(async (orgId: string, data: OnboardingProfileData): Promise<{ success: boolean; error?: string }> => {
    try {
      const orgRef = doc(db, "organizations", orgId);
      await updateDoc(orgRef, {
        upi_id: data.upiId.trim(),
        contact_person: data.contactPerson.trim(),
        address: data.address.trim(),
        city: data.city.trim(),
        state: data.state.trim(),
        pincode: data.pincode.trim(),
        registration_number: data.registrationNumber?.trim() || null,
        updatedAt: serverTimestamp(),
      });

      // Update in local state
      setActiveOrg((prev) => prev ? { ...prev, ...data } : null);
      await refreshOrgs();

      return { success: true };
    } catch (err: unknown) {
      console.error("[UPDATE_ONBOARDING] Error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }, [refreshOrgs]);

  // Phase 1 Join: Validate Invitation
  const verifyInvitation = useCallback(async (mobile: string, code: string): Promise<{ success: boolean; invite?: InviteData; error?: string }> => {
    const mobileInput = mobile.trim();
    const codeInput = code.trim().toUpperCase();

    const cleanMobile = mobileInput.replace(/\D/g, "");
    const tenDigit = cleanMobile.length >= 10 ? cleanMobile.substring(cleanMobile.length - 10) : cleanMobile;
    const formattedWithPlus = `+91${tenDigit}`;

    try {
      // 1. Query pending invitations by mobile
      const qMobile = query(
        collection(db, "organization_invites"),
        where("status", "==", "pending"),
        where("mobile", "in", [tenDigit, formattedWithPlus, mobileInput])
      );
      let candidateDocs = (await getDocs(qMobile)).docs;

      if (candidateDocs.length === 0) {
        // Fallback query by activationCode
        const qCode = query(
          collection(db, "organization_invites"),
          where("status", "==", "pending"),
          where("activationCode", "==", codeInput)
        );
        candidateDocs = (await getDocs(qCode)).docs;
      }

      if (candidateDocs.length === 0) {
        return { success: false, error: "No pending invitation found for the provided details. Please check the code or contact your administrator." };
      }

      // Filter matching invite
      const matchDoc = candidateDocs.find((d) => {
        const dData = d.data();
        const c = String(dData.activationCode || dData.activationToken || dData.otp || "").toUpperCase();
        return c === codeInput;
      });

      if (!matchDoc) {
        return { success: false, error: "Invalid 6-character Activation Code. Please check the invitation details." };
      }

      const inviteData = { id: matchDoc.id, ...matchDoc.data() } as InviteData;

      // Status check
      const status = String(inviteData.status || "pending").toLowerCase();
      const isUsed = inviteData.used === true || inviteData.usedAt != null;

      if (status === "accepted" || status === "activated" || isUsed) {
        return { success: false, error: "Invitation already used." };
      } else if (status === "cancelled" || status === "revoked") {
        return { success: false, error: "This invitation has been cancelled. Please request a new invite from your administrator." };
      } else if (status !== "pending") {
        return { success: false, error: "Invitation is no longer active." };
      }

      // Expiry check
      if (inviteData.expiresAt) {
        const exp = new Date(inviteData.expiresAt);
        if (new Date() > exp) {
          return { success: false, error: "Invitation has expired. Please ask the organization owner to generate a new invitation." };
        }
      }

      return { success: true, invite: inviteData };
    } catch (err: unknown) {
      console.error("[VERIFY_INVITE] Error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }, []);

  // Phase 2 Join: Activate Member Account
  const activateInvitation = useCallback(async (
    invite: InviteData,
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const targetEmail = email.trim();
      const targetName = name.trim();
      let uid: string;

      const currentUser = auth.currentUser;
      if (currentUser && currentUser.email === targetEmail) {
        uid = currentUser.uid;
      } else {
        try {
          const cred = await createUserWithEmailAndPassword(auth, targetEmail, password);
          uid = cred.user.uid;
        } catch (authErr: unknown) {
          const fe = authErr as { code?: string };
          if (fe?.code === "auth/email-already-in-use") {
            try {
              const signCred = await signInWithEmailAndPassword(auth, targetEmail, password);
              uid = signCred.user.uid;
            } catch (signInErr: unknown) {
              const se = signInErr as { code?: string };
              if (se?.code === "auth/wrong-password" || se?.code === "auth/invalid-credential") {
                return { success: false, error: "An account with this email already exists. Please enter your existing password to join this organization." };
              }
              throw signInErr;
            }
          } else {
            throw authErr;
          }
        }
      }

      // Check if already an active member of this organization
      const membershipId = `${uid}_${invite.organizationId}`;
      const existingMemberSnap = await getDoc(doc(db, "organization_members", membershipId));
      if (existingMemberSnap.exists() && existingMemberSnap.data()?.status === "active") {
        return { success: false, error: "You are already an active member of this organization. Please log in directly." };
      }

      // Batch write
      const batch = writeBatch(db);

      // Item 1: User Profile
      const userRef = doc(db, "users", uid);
      batch.set(userRef, {
        id: uid,
        email: targetEmail,
        mobile: invite.mobile,
        name: targetName,
        lastSelectedOrgId: invite.organizationId,
        is_active: true,
        isActive: true,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }, { merge: true });

      // Item 2: Member document
      const memberRef = doc(db, "organization_members", membershipId);
      batch.set(memberRef, {
        id: membershipId,
        userId: uid,
        organizationId: invite.organizationId,
        name: targetName,
        email: targetEmail,
        mobile: invite.mobile,
        role: invite.role,
        status: "active",
        joinedAt: new Date().toISOString(),
      });

      // Item 3: Update Invitation to accepted
      const inviteRef = doc(db, "organization_invites", invite.id);
      batch.update(inviteRef, {
        status: "accepted",
        used: true,
        usedAt: serverTimestamp(),
        activatedAt: new Date().toISOString(),
        activatedByUid: uid,
      });

      // Item 4: Audit log
      const logRef = doc(collection(db, "activity_logs"));
      batch.set(logRef, {
        id: logRef.id,
        organizationId: invite.organizationId,
        userId: uid,
        userName: targetName,
        userRole: invite.role,
        action: "Member Activated",
        details: `Member ${targetName} (${targetEmail}) activated account as ${invite.role.toUpperCase()}`,
        timestamp: new Date().toISOString(),
      });

      await batch.commit();

      // Switch to the joined organization
      await switchOrganization(invite.organizationId);

      return { success: true };
    } catch (err: unknown) {
      console.error("[ACTIVATE_INVITE] Error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }, [switchOrganization]);

    const normalizedRole = (activeRole || "").trim().toLowerCase();
    const isOwner =
      normalizedRole === "owner" ||
      normalizedRole === "admin" ||
      normalizedRole === "superadmin" ||
      (activeOrg?.ownerUid != null && activeOrg.ownerUid === user?.uid) ||
      (userData?.isSoftwareOwner === true);
    const isPresident = normalizedRole === "president";
    const isTreasurer = normalizedRole === "treasurer";
    const isMember =
      normalizedRole === "member" ||
      normalizedRole === "collector" ||
      (!isOwner && !isPresident && !isTreasurer);

    const currentMembership =
      allOrganizations.find((m) => m.organizationId === currentOrgId) || null;

    return (
      <OrgContext.Provider
        value={{
          allOrganizations,
          isLoadingOrgs,
          activeOrg,
          activeRole,
          activeOrgId: currentOrgId,
          hasMultipleOrganizations: allOrganizations.length > 1,
          currentMembership,
          isOwner,
          isPresident,
          isTreasurer,
          isMember,
          refreshOrgs,
          switchOrganization,
          registerOrganization,
          updateOnboardingDetails,
          verifyInvitation,
          activateInvitation,
        }}
      >
        {children}
      </OrgContext.Provider>
    );
}

export function useOrg() {
  return useContext(OrgContext);
}
