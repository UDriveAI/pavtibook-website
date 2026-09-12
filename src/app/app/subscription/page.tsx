"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { useLanguage } from "@/lib/i18n";
import { functions, db } from "@/lib/firebase-client";
import {
  Sparkles,
  Check,
  ShieldCheck,
  History,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Calendar,
  User,
  CheckCircle2,
  Zap,
} from "lucide-react";
import type { RazorpaySuccessResponse, RazorpayFailureResponse } from "@/types/razorpay";

interface SubscriptionDoc {
  plan: string;
  receiptLimit: number | null;
  usersLimit: number;
  autoWhatsAppLimit: number;
  canShareNow: boolean;
  status: string;
  renewalDate?: string | null;
  receiptsUsed?: number;
  usersUsed?: number;
}

interface SubscriptionHistoryItem {
  id: string;
  activatedAt: string;
  amountPaid: number;
  newPlan: string;
  oldPlan: string;
  operator: string;
  status: string;
  razorpayTransactionId?: string;
  razorpayOrderId?: string;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { activeOrg, isOwner, isPresident, isTreasurer } = useOrg();
  const { t } = useLanguage();

  const [currentSub, setCurrentSub] = useState<SubscriptionDoc | null>(null);
  const [history, setHistory] = useState<SubscriptionHistoryItem[]>([]);
  const [, setIsLoading] = useState<boolean>(true);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState<boolean>(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [, setRazorpayLoaded] = useState<boolean>(false);

  const orgId = activeOrg?.id;

  const loadSubscriptionData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Fetch current subscription
      const subRef = doc(db, "subscriptions", orgId);
      const subSnap = await getDoc(subRef);
      if (subSnap.exists()) {
        setCurrentSub(subSnap.data() as SubscriptionDoc);
      } else {
        setCurrentSub({
          plan: "free",
          receiptLimit: 25,
          usersLimit: 1,
          autoWhatsAppLimit: 0,
          canShareNow: true,
          status: "free",
          receiptsUsed: 0,
          usersUsed: 1,
        });
      }

      // 2. Fetch subscription history
      const historyQuery = query(
        collection(db, "subscription_history"),
        where("organizationId", "==", orgId),
        orderBy("activatedAt", "desc")
      );
      const historySnap = await getDocs(historyQuery).catch(() => {
        return getDocs(query(collection(db, "subscription_history"), where("organizationId", "==", orgId)));
      });

      const items: SubscriptionHistoryItem[] = [];
      historySnap.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as SubscriptionHistoryItem);
      });
      items.sort((a, b) => new Date(b.activatedAt).getTime() - new Date(a.activatedAt).getTime());
      setHistory(items);
    } catch (err: unknown) {
      console.error("[SUBSCRIPTION] Error loading subscription data:", err);
      setErrorMessage("Failed to load subscription information.");
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

  // Plan Configurations matching functions/index.js getPlanEntitlements
  const plans = [
    {
      id: "professional_monthly",
      name: t("plan_professional") + " (Monthly)",
      price: 99,
      period: t("monthly_billing"),
      badge: null,
      seats: 3,
      receipts: t("unlimited"),
      whatsapp: "Manual Share Now",
      features: [
        t("feature_team_seats_pro"),
        t("feature_unlimited_receipts"),
        t("feature_unlimited_downloads"),
        t("feature_donor_management"),
        t("feature_ledger_export"),
        t("feature_share_now"),
        t("feature_device_access"),
        t("feature_branding_signatures"),
      ],
    },
    {
      id: "professional_yearly",
      name: t("plan_professional") + " (Annual)",
      price: 999,
      period: t("yearly_billing"),
      badge: t("save_16_badge"),
      seats: 3,
      receipts: t("unlimited"),
      whatsapp: "Manual Share Now",
      features: [
        t("feature_team_seats_pro"),
        t("feature_unlimited_receipts"),
        t("feature_unlimited_downloads"),
        t("feature_donor_management"),
        t("feature_ledger_export"),
        t("feature_share_now"),
        t("feature_device_access"),
        t("feature_branding_signatures"),
        "Save ₹189 / year",
      ],
    },
    {
      id: "premium_monthly",
      name: t("plan_premium") + " (Monthly)",
      price: 199,
      period: t("monthly_billing"),
      badge: t("most_popular_badge"),
      seats: 10,
      receipts: t("unlimited"),
      whatsapp: "1,000 Auto Sends / Mo",
      features: [
        t("feature_team_seats_prem"),
        t("feature_unlimited_receipts"),
        t("feature_unlimited_downloads"),
        t("feature_donor_management"),
        t("feature_ledger_export"),
        t("feature_auto_whatsapp_prem"),
        t("feature_priority_support"),
        t("feature_device_access"),
        t("feature_branding_signatures"),
      ],
    },
    {
      id: "premium_yearly",
      name: t("plan_premium") + " (Annual)",
      price: 1999,
      period: t("yearly_billing"),
      badge: t("best_value_badge"),
      seats: 10,
      receipts: t("unlimited"),
      whatsapp: "1,000 Auto Sends / Mo",
      features: [
        t("feature_team_seats_prem"),
        t("feature_unlimited_receipts"),
        t("feature_unlimited_downloads"),
        t("feature_donor_management"),
        t("feature_ledger_export"),
        t("feature_auto_whatsapp_prem"),
        t("feature_priority_support"),
        t("feature_device_access"),
        t("feature_branding_signatures"),
        "Save ₹389 / year",
      ],
    },
  ];

  const handleCheckout = async (planId: string, amount: number) => {
    if (!orgId || !user) return;
    if (!isOwner && !isPresident && !isTreasurer) {
      setErrorMessage("Only organization Owner, President, or Treasurer can purchase subscriptions.");
      return;
    }

    setIsProcessingCheckout(true);
    setProcessingPlanId(planId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Call Cloud Function: createRazorpayOrder
      const createOrderFn = httpsCallable<
        { amount: number; orgId: string; planName: string },
        { orderId: string; amount: number; currency: string; keyId: string }
      >(functions, "createRazorpayOrder");

      const orderRes = await createOrderFn({
        amount: amount,
        orgId: orgId,
        planName: planId,
      });

      const { orderId, keyId } = orderRes.data;

      if (!orderId || !keyId) {
        throw new Error("Could not create payment order from server.");
      }

      if (typeof window === "undefined" || !window.Razorpay) {
        throw new Error("Razorpay SDK failed to load. Please check internet connection.");
      }

      // 2. Open standard Razorpay Checkout
      const options = {
        key: keyId,
        amount: Math.round(amount * 100),
        currency: "INR",
        name: activeOrg?.name || "PavtiBook",
        description: `PavtiBook Subscription - ${planId}`,
        image: "/images/Pavati-Book-Logo-01.png",
        order_id: orderId,
        handler: async function (response: RazorpaySuccessResponse) {
          setIsProcessingCheckout(true);
          setErrorMessage(null);

          try {
            // 3. Call Cloud Function: verifyRazorpayPayment
            const verifyFn = httpsCallable<
              {
                paymentId: string;
                orderId: string;
                signature: string;
                orgId: string;
                planName: string;
                operatorName: string;
                oldPlan: string;
              },
              { success: boolean; message?: string }
            >(functions, "verifyRazorpayPayment");

            const verifyRes = await verifyFn({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
              orgId: orgId,
              planName: planId,
              operatorName: userData?.name || user.email || "Web User",
              oldPlan: currentSub?.plan || "free",
            });

            if (verifyRes.data.success) {
              setSuccessMessage(t("payment_successful"));
              await loadSubscriptionData();
            } else {
              setErrorMessage("Payment verification returned unsuccessful status.");
            }
          } catch (verifyErr: unknown) {
            console.error("[PAYMENT_VERIFY] Error verifying signature:", verifyErr);
            setErrorMessage("Payment verification error. Please contact PavtiBook support.");
          } finally {
            setIsProcessingCheckout(false);
            setProcessingPlanId(null);
          }
        },
        prefill: {
          name: userData?.name || user.displayName || "",
          email: user.email || "",
          contact: userData?.mobile || user.phoneNumber || "",
        },
        notes: {
          organizationId: orgId,
          planName: planId,
        },
        theme: {
          color: "#8B1E2D",
        },
        modal: {
          ondismiss: function () {
            setIsProcessingCheckout(false);
            setProcessingPlanId(null);
          },
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on("payment.failed", function (resp: RazorpayFailureResponse) {
        console.error("[RAZORPAY_FAILED]", resp.error);
        setErrorMessage(`Payment failed: ${resp.error.description || resp.error.reason || "Transaction cancelled"}`);
        setIsProcessingCheckout(false);
        setProcessingPlanId(null);
      });
      rzpInstance.open();
    } catch (checkoutErr: unknown) {
      console.error("[CHECKOUT_ERR]", checkoutErr);
      const msg = checkoutErr instanceof Error ? checkoutErr.message : "Error initiating checkout";
      setErrorMessage(msg);
      setIsProcessingCheckout(false);
      setProcessingPlanId(null);
    }
  };

  const isCurrentPlan = (planId: string) => {
    if (!currentSub) return false;
    if (currentSub.plan === planId) return true;
    if (planId === "professional_monthly" && currentSub.plan === "monthly") return true;
    if (planId === "professional_yearly" && currentSub.plan === "yearly") return true;
    return false;
  };

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => setRazorpayLoaded(true)}
      />

      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 text-neutral-600 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-neutral-900">{t("subscription_title")}</h1>
              <p className="text-xs text-neutral-500 font-medium">{t("subscription_subtitle")}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-full bg-cream border border-maroon/20 text-xs font-bold text-maroon flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{t("razorpay_secure")}</span>
            </div>
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Active Entitlement Summary Banner */}
        <div className="bg-white rounded-3xl p-6 border border-maroon/10 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                {t("current_plan_label")}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <h2 className="text-2xl font-black text-neutral-900 capitalize">
                  {currentSub?.plan ? currentSub.plan.replace("_", " ") : "Free Starter"}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase tracking-wider">
                  {currentSub?.status || "Active"}
                </span>
              </div>
            </div>

            {currentSub?.renewalDate && (
              <div className="text-left sm:text-right">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Next Renewal
                </span>
                <span className="text-xs font-bold text-neutral-700 mt-1 block">
                  {new Date(currentSub.renewalDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-neutral-100">
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/60">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                {t("receipts_used_label")}
              </span>
              <span className="text-sm font-black text-neutral-900 mt-1 block">
                {currentSub?.receiptLimit === null
                  ? `${currentSub.receiptsUsed ?? 0} / Unlimited`
                  : `${currentSub?.receiptsUsed ?? 0} / ${currentSub?.receiptLimit ?? 25}`}
              </span>
            </div>

            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/60">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                Team Members
              </span>
              <span className="text-sm font-black text-neutral-900 mt-1 block">
                {currentSub?.usersLimit ?? 1} Max Seats
              </span>
            </div>

            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/60">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                Auto WhatsApp
              </span>
              <span className="text-sm font-black text-neutral-900 mt-1 block">
                {currentSub?.autoWhatsAppLimit ?? 0} / Month
              </span>
            </div>

            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/60">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                Device Sessions
              </span>
              <span className="text-sm font-black text-neutral-900 mt-1 block">
                3 Concurrent Devices
              </span>
            </div>
          </div>
        </div>

        {/* Pricing & Upgrade Options Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-neutral-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Available Subscription Plans</span>
            </h2>
            <span className="text-xs font-semibold text-neutral-500">
              Transparent INR Pricing · No Hidden Fees
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((p) => {
              const isActive = isCurrentPlan(p.id);
              const isBusy = isProcessingCheckout && processingPlanId === p.id;

              return (
                <div
                  key={p.id}
                  className={`relative bg-white rounded-3xl p-6 border flex flex-col justify-between transition ${
                    isActive
                      ? "border-maroon shadow-md ring-2 ring-maroon/20"
                      : "border-neutral-200 hover:border-maroon/40 shadow-xs"
                  }`}
                >
                  {p.badge && (
                    <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                      {p.badge}
                    </span>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold text-sm text-neutral-900">{p.name}</h3>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-3xl font-black text-[#8B1E2D]">₹{p.price}</span>
                        <span className="text-xs text-neutral-500 font-semibold">/ {p.period}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-neutral-100 space-y-2.5">
                      {p.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-neutral-700">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-neutral-100">
                    {isActive ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-default"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{t("plan_status_active")}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCheckout(p.id, p.price)}
                        disabled={isProcessingCheckout}
                        className="w-full py-2.5 rounded-2xl bg-[#8B1E2D] hover:bg-maroon-dark text-white text-xs font-bold uppercase tracking-wider shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isBusy ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                            <span>{t("choose_plan")}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Plan Feature Comparison Table */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-neutral-900">{t("plan_feature_comparison")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-neutral-700">
              <thead className="bg-neutral-50 text-[11px] uppercase tracking-wider font-bold text-neutral-500 border-b border-neutral-200">
                <tr>
                  <th className="p-3">{t("feature_column")}</th>
                  <th className="p-3 text-center">Free Starter</th>
                  <th className="p-3 text-center">Professional (₹99 / ₹999)</th>
                  <th className="p-3 text-center">Premium (₹199 / ₹1999)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="p-3 font-semibold">Receipt Generation Limit</td>
                  <td className="p-3 text-center">25 Digital Receipts</td>
                  <td className="p-3 text-center text-emerald-700 font-bold">Unlimited</td>
                  <td className="p-3 text-center text-emerald-700 font-bold">Unlimited</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">Maximum Team Seats</td>
                  <td className="p-3 text-center">1 User</td>
                  <td className="p-3 text-center font-bold">3 Members</td>
                  <td className="p-3 text-center font-bold">10 Members</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">PDF & JPG Downloads</td>
                  <td className="p-3 text-center">Included (25)</td>
                  <td className="p-3 text-center text-emerald-700 font-bold">Unlimited</td>
                  <td className="p-3 text-center text-emerald-700 font-bold">Unlimited</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">Manual WhatsApp Share Now</td>
                  <td className="p-3 text-center">Included</td>
                  <td className="p-3 text-center font-bold">Unlimited</td>
                  <td className="p-3 text-center font-bold">Unlimited</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">Automated Background WhatsApp</td>
                  <td className="p-3 text-center text-neutral-400">-</td>
                  <td className="p-3 text-center text-neutral-400">-</td>
                  <td className="p-3 text-center font-bold text-emerald-700">1,000 / Month</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">Multi-Device Access</td>
                  <td className="p-3 text-center font-bold">3 Devices</td>
                  <td className="p-3 text-center font-bold">3 Devices</td>
                  <td className="p-3 text-center font-bold">3 Devices</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">Custom Branding & Signatures</td>
                  <td className="p-3 text-center font-bold">Included</td>
                  <td className="p-3 text-center font-bold">Included</td>
                  <td className="p-3 text-center font-bold">Included</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Subscription History Section */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#8B1E2D]" />
              <h2 className="text-base font-bold text-neutral-900">{t("subscription_history_title")}</h2>
            </div>
            <span className="text-xs text-neutral-400 font-medium">{history.length} Transactions</span>
          </div>

          {history.length === 0 ? (
            <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
              <p className="text-xs text-neutral-500 font-medium">{t("no_payment_history")}</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {history.map((item) => (
                <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-neutral-900 uppercase">
                        {item.oldPlan} → {item.newPlan}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-neutral-400" />
                        {new Date(item.activatedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-neutral-400" />
                        {item.operator}
                      </span>
                      {item.razorpayTransactionId && (
                        <span className="font-mono text-[10px] text-neutral-400">
                          TxID: {item.razorpayTransactionId}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-sm font-black text-[#8B1E2D]">₹{item.amountPaid}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
