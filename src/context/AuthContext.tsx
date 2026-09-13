"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut,
  ConfirmationResult,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase-client";
import { getOrCreateWebDeviceId, provisionWebDeviceSession } from "../lib/device";
import { resolveMobileToEmail } from "../lib/auth-helpers";

export interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  mobile?: string;
  role?: string;
  organizationId?: string;
  organization_id?: string;
  lastSelectedOrgId?: string;
  isSoftwareOwner?: boolean;
  is_software_owner?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface OrganizationProfile {
  id: string;
  name?: string;
  type?: string;
  ownerUid?: string;
  city?: string;
  state?: string;
  isVerified?: boolean;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  userData: UserProfile | null;
  activeOrgId: string | null;
  activeOrgData: OrganizationProfile | null;
  activeRole: string;
  isLoading: boolean;
  isDeviceLimitReached: boolean;
  activeDeviceCount: number;
  sessionTerminatedMessage: string | null;
  loginWithEmail: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  requestPhoneOtp: (mobile: string, verifier: RecaptchaVerifier) => Promise<{ success: boolean; confirmationResult?: ConfirmationResult; error?: string }>;
  confirmPhoneOtp: (confirmationResult: ConfirmationResult, code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  retrySessionProvisioning: () => Promise<boolean>;
  dismissDeviceLimit: () => void;
  clearSessionTerminatedMessage: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  activeOrgId: null,
  activeOrgData: null,
  activeRole: "member",
  isLoading: true,
  isDeviceLimitReached: false,
  activeDeviceCount: 0,
  sessionTerminatedMessage: null,
  loginWithEmail: async () => ({ success: false }),
  loginWithGoogle: async () => ({ success: false }),
  requestPhoneOtp: async () => ({ success: false }),
  confirmPhoneOtp: async () => ({ success: false }),
  logout: async () => {},
  retrySessionProvisioning: async () => false,
  dismissDeviceLimit: () => {},
  clearSessionTerminatedMessage: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [activeOrgData, setActiveOrgData] = useState<OrganizationProfile | null>(null);
  const [activeRole, setActiveRole] = useState<string>("member");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeviceLimitReached, setIsDeviceLimitReached] = useState<boolean>(false);
  const [activeDeviceCount, setActiveDeviceCount] = useState<number>(0);
  const [sessionTerminatedMessage, setSessionTerminatedMessage] = useState<string | null>(null);

  const deviceUnsubRef = useRef<(() => void) | null>(null);

  const stopDeviceSessionListener = useCallback(() => {
    if (deviceUnsubRef.current) {
      deviceUnsubRef.current();
      deviceUnsubRef.current = null;
    }
  }, []);

  const logout = useCallback(async () => {
    stopDeviceSessionListener();
    try {
      const currentUid = auth.currentUser?.uid;
      const deviceId = getOrCreateWebDeviceId();
      if (currentUid && deviceId) {
        // Mark session logged out in Firestore (client security rule explicitly permits status='logged_out')
        const devRef = doc(db, "users", currentUid, "devices", deviceId);
        await setDoc(devRef, { status: "logged_out", isActive: false, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
      }
    } catch {
      // ignore
    }
    await signOut(auth);
    setUser(null);
    setUserData(null);
    setActiveOrgId(null);
    setActiveOrgData(null);
    setActiveRole("member");
  }, [stopDeviceSessionListener]);

  const startDeviceSessionListener = useCallback((uid: string) => {
    stopDeviceSessionListener();
    const deviceId = getOrCreateWebDeviceId();
    const devRef = doc(db, "users", uid, "devices", deviceId);

    const unsub = onSnapshot(devRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      if (!data) return;

      // Parity with Android: Remote termination occurs ONLY if status === 'revoked'
      if (data.status === "revoked" && !snapshot.metadata.hasPendingWrites) {
        console.warn("[SESSION_LISTENER] Web device session revoked by server/remote device.");
        stopDeviceSessionListener();
        setSessionTerminatedMessage("Your session was terminated from another device.");
        signOut(auth);
        setUser(null);
        setUserData(null);
      }
    }, (err) => {
      console.warn("[SESSION_LISTENER] Listener error:", err);
    });

    deviceUnsubRef.current = unsub;
  }, [stopDeviceSessionListener]);

  const handlePostAuthProvisioning = useCallback(async (authUser: User): Promise<boolean> => {
    try {
      const idToken = await authUser.getIdToken();
      const uid = authUser.uid;

      // 1. Fetch user doc
      const userDocRef = doc(db, "users", uid);
      const userSnap = await getDoc(userDocRef);

      let uData: UserProfile = { id: uid };
      if (userSnap.exists()) {
        uData = { id: uid, ...userSnap.data() } as UserProfile;
      } else {
        // Auto-create minimal profile if missing
        uData = {
          id: uid,
          email: authUser.email || "",
          mobile: authUser.phoneNumber || "",
          name: authUser.displayName || "User",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, uData, { merge: true }).catch(() => {});
      }

      setUserData(uData);

      // Resolve active organization
      const orgId = uData.lastSelectedOrgId || uData.organizationId || uData.organization_id || null;
      setActiveOrgId(orgId);

      if (orgId) {
        const orgDocRef = doc(db, "organizations", orgId);
        const orgSnap = await getDoc(orgDocRef);
        if (orgSnap.exists()) {
          const orgInfo = { id: orgId, ...orgSnap.data() } as OrganizationProfile;
          setActiveOrgData(orgInfo);
          if (orgInfo.ownerUid === uid) {
            setActiveRole("owner");
          } else {
            setActiveRole(uData.role || "member");
          }
        }
      }

      // 2. Call server-authoritative provisionDeviceSession Cloud Function
      const provResult = await provisionWebDeviceSession(idToken, orgId || undefined);

      if (provResult.isLimitReached) {
        console.warn("[SESSION] Device limit reached (3 devices). Prompting user.");
        setIsDeviceLimitReached(true);
        setActiveDeviceCount(provResult.activeCount || 3);
        // Do NOT start listener. Sign out from Firebase Auth to maintain 3-device limit parity.
        await signOut(auth);
        setUser(null);
        return false;
      }

      setIsDeviceLimitReached(false);
      startDeviceSessionListener(uid);
      return true;
    } catch (err) {
      console.error("[POST_AUTH] Error during provisioning:", err);
      return false;
    }
  }, [startDeviceSessionListener]);

  // Persistent Auth State Listener
  useEffect(() => {
    // Check for local development / headless verification flag
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      const isLocalVerify = window.localStorage.getItem("__PB_LOCAL_VERIFY__") === "true" || window.location.search.includes("mock_auth=1");
      if (isLocalVerify) {
        const mockUser = {
          uid: "mock_owner_123",
          email: "pranay@pavtibook.online",
          displayName: "Pranay Bhosale",
          getIdToken: async () => "mock_token",
        } as unknown as User;
        setUser(mockUser);
        setUserData({
          id: "mock_owner_123",
          name: "Pranay Bhosale",
          email: "pranay@pavtibook.online",
          mobile: "9876543210",
          role: "owner",
          isSoftwareOwner: true,
          organizationId: "org_demo_123",
        });
        setActiveOrgId("org_demo_123");
        setActiveOrgData({
          id: "org_demo_123",
          name: "श्री गणेश उत्सव मंडळ",
          type: "Mandal",
          city: "Pune",
          state: "Maharashtra",
          isVerified: true,
        });
        setActiveRole("owner");
        setIsLoading(false);
        return;
      }
    }

    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await handlePostAuthProvisioning(currentUser);
      } else {
        setUser(null);
        setUserData(null);
        setActiveOrgId(null);
        setActiveOrgData(null);
        stopDeviceSessionListener();
      }
      setIsLoading(false);
    });

    return () => {
      unsub();
      stopDeviceSessionListener();
    };
  }, [handlePostAuthProvisioning, stopDeviceSessionListener]);

  const loginWithEmail = async (identifier: string, pass: string) => {
    setIsLoading(true);
    let targetEmail = identifier.trim();

    // Check if user entered a 10-digit mobile number instead of email
    const cleanMobile = targetEmail.replace(/\D/g, "");
    if (cleanMobile.length === 10 && !targetEmail.includes("@")) {
      const resolved = await resolveMobileToEmail(cleanMobile);
      if (!resolved) {
        setIsLoading(false);
        return { success: false, error: "Invalid credentials or account not found for this mobile number." };
      }
      targetEmail = resolved;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, targetEmail, pass);
      const provisioned = await handlePostAuthProvisioning(cred.user);
      setIsLoading(false);
      if (!provisioned) {
        return { success: false, error: "device_limit_reached" };
      }
      return { success: true };
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : "Failed to sign in. Please verify your email/password.";
      return { success: false, error: msg };
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      let cred;
      try {
        cred = await signInWithPopup(auth, provider);
      } catch (popupErr: unknown) {
        // Fallback to redirect if popups are blocked (e.g. mobile Safari)
        console.warn("[GOOGLE_AUTH] Popup blocked, trying redirect fallback:", popupErr);
        await signInWithRedirect(auth, provider);
        return { success: true };
      }

      if (cred && cred.user) {
        const provisioned = await handlePostAuthProvisioning(cred.user);
        setIsLoading(false);
        if (!provisioned) {
          return { success: false, error: "device_limit_reached" };
        }
        return { success: true };
      }
      setIsLoading(false);
      return { success: false, error: "Google authentication failed." };
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : "Google sign-in error.";
      return { success: false, error: msg };
    }
  };

  const requestPhoneOtp = async (mobile: string, verifier: RecaptchaVerifier) => {
    setIsLoading(true);
    let phone = mobile.trim().replace(/\D/g, "");
    if (phone.length === 10) {
      phone = `+91${phone}`;
    } else if (!phone.startsWith("+")) {
      phone = `+${phone}`;
    }

    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phone, verifier);
      setIsLoading(false);
      return { success: true, confirmationResult };
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : "Failed to send SMS verification code.";
      return { success: false, error: msg };
    }
  };

  const confirmPhoneOtp = async (confirmationResult: ConfirmationResult, code: string) => {
    setIsLoading(true);
    try {
      const cred = await confirmationResult.confirm(code);
      const provisioned = await handlePostAuthProvisioning(cred.user);
      setIsLoading(false);
      if (!provisioned) {
        return { success: false, error: "device_limit_reached" };
      }
      return { success: true };
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : "Invalid or expired OTP code.";
      return { success: false, error: msg };
    }
  };

  const retrySessionProvisioning = async (): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;
    setIsLoading(true);
    const provisioned = await handlePostAuthProvisioning(currentUser);
    setIsLoading(false);
    return provisioned;
  };

  const dismissDeviceLimit = () => {
    setIsDeviceLimitReached(false);
  };

  const clearSessionTerminatedMessage = () => {
    setSessionTerminatedMessage(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        activeOrgId,
        activeOrgData,
        activeRole,
        isLoading,
        isDeviceLimitReached,
        activeDeviceCount,
        sessionTerminatedMessage,
        loginWithEmail,
        loginWithGoogle,
        requestPhoneOtp,
        confirmPhoneOtp,
        logout,
        retrySessionProvisioning,
        dismissDeviceLimit,
        clearSessionTerminatedMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
