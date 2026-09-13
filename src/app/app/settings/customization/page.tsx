"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { useLanguage } from "@/lib/i18n";
import { db, storage } from "@/lib/firebase-client";
import {
  ArrowLeft,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building,
  Eye,
  PenTool,
  Stamp,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { TraditionalReceipt, ReceiptData, OrganizationData } from "@/components/receipt/TraditionalReceipt";

export default function ReceiptCustomizationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeOrg, isOwner, isPresident, isTreasurer } = useOrg();
  const { t } = useLanguage();

  const orgId = activeOrg?.id;

  // Form State
  const [orgName, setOrgName] = useState<string>("");
  const [registrationNumber, setRegistrationNumber] = useState<string>("");
  const [topGreeting, setTopGreeting] = useState<string>("।। श्री गणेशाय नमः ।।");
  const [headerSubtitle, setHeaderSubtitle] = useState<string>("");
  const [receiptPrefix, setReceiptPrefix] = useState<string>("PB");
  const [footerNote, setFooterNote] = useState<string>("आपल्या मोलाच्या देणगीबद्दल धन्यवाद!");
  const [address, setAddress] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");
  const [orgMobile, setOrgMobile] = useState<string>("");
  const [orgEmail, setOrgEmail] = useState<string>("");

  // Branding URLs
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [stampUrl, setStampUrl] = useState<string>("");

  // Committee Signatures (F39)
  const [presidentName, setPresidentName] = useState<string>("");
  const [presidentSignatureUrl, setPresidentSignatureUrl] = useState<string>("");
  const [treasurerName, setTreasurerName] = useState<string>("");
  const [treasurerSignatureUrl, setTreasurerSignatureUrl] = useState<string>("");
  const [secretaryName, setSecretaryName] = useState<string>("");
  const [secretarySignatureUrl, setSecretarySignatureUrl] = useState<string>("");

  // UI States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Hidden File Inputs
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const stampInputRef = useRef<HTMLInputElement | null>(null);
  const presSigInputRef = useRef<HTMLInputElement | null>(null);
  const treasSigInputRef = useRef<HTMLInputElement | null>(null);
  const secSigInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const orgRef = doc(db, "organizations", orgId);
      const snap = await getDoc(orgRef);
      if (snap.exists()) {
        const data = snap.data();
        setOrgName(data.name || data.orgName || "");
        setRegistrationNumber(data.registrationNumber || data.registration_number || "");
        setTopGreeting(data.topGreeting || "।। श्री गणेशाय नमः ।।");
        setHeaderSubtitle(data.headerSubtitle || data.subtitle || "");
        setReceiptPrefix(data.receiptPrefix || data.receipt_prefix || "PB");
        setFooterNote(data.footerText || data.footer_note || "आपल्या मोलाच्या देणगीबद्दल धन्यवाद!");
        setAddress(data.address || "");
        setCity(data.city || "");
        setState(data.state || "Maharashtra");
        setPincode(data.pincode || "");
        setOrgMobile(data.mobile || data.orgMobile || "");
        setOrgEmail(data.email || data.orgEmail || "");

        setLogoUrl(data.logoUrl || data.logo_url || "");
        setStampUrl(data.stampUrl || data.customStampUrl || data.stamp_url || "");

        setPresidentName(data.president_name || data.presidentName || "");
        setPresidentSignatureUrl(data.president_signature_url || data.presidentSignatureUrl || "");
        setTreasurerName(data.treasurer_name || data.treasurerName || "");
        setTreasurerSignatureUrl(data.treasurer_signature_url || data.treasurerSignatureUrl || "");
        setSecretaryName(data.secretary_name || data.secretaryName || "");
        setSecretarySignatureUrl(data.secretary_signature_url || data.secretarySignatureUrl || "");
      }
    } catch (err) {
      console.error("[CUSTOMIZATION] Error loading organization details:", err);
      setStatusMessage({ type: "error", text: "Failed to load branding information." });
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Image Upload Handler to Firebase Storage
  const handleUpload = async (field: "logo" | "stamp" | "president_sig" | "treasurer_sig" | "secretary_sig", file: File) => {
    if (!orgId) return;
    setUploadingField(field);
    setStatusMessage(null);

    try {
      const ext = file.name.split(".").pop() || "png";
      const timestamp = Date.now();
      const storagePath = `organizations/${orgId}/branding/${field}_${timestamp}.${ext}`;
      const storageReference = ref(storage, storagePath);

      await uploadBytes(storageReference, file);
      const downloadUrl = await getDownloadURL(storageReference);

      // Auto-update Firestore immediately for the image upload (exact parity with Android)
      const updates: Record<string, string | null> = {};
      if (field === "logo") {
        setLogoUrl(downloadUrl);
        updates.logoUrl = downloadUrl;
        updates.logo_url = downloadUrl;
      } else if (field === "stamp") {
        setStampUrl(downloadUrl);
        updates.stampUrl = downloadUrl;
        updates.customStampUrl = downloadUrl;
        updates.stamp_url = downloadUrl;
      } else if (field === "president_sig") {
        setPresidentSignatureUrl(downloadUrl);
        updates.presidentSignatureUrl = downloadUrl;
        updates.president_signature_url = downloadUrl;
      } else if (field === "treasurer_sig") {
        setTreasurerSignatureUrl(downloadUrl);
        updates.treasurerSignatureUrl = downloadUrl;
        updates.treasurer_signature_url = downloadUrl;
      } else if (field === "secretary_sig") {
        setSecretarySignatureUrl(downloadUrl);
        updates.secretarySignatureUrl = downloadUrl;
        updates.secretary_signature_url = downloadUrl;
      }

      await updateDoc(doc(db, "organizations", orgId), updates);
      setStatusMessage({ type: "success", text: "Image uploaded successfully!" });
    } catch (err: unknown) {
      console.error("[UPLOAD_ERROR]", err);
      const msg = err instanceof Error ? err.message : "Failed to upload image.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setUploadingField(null);
    }
  };

  const handleRemoveImage = async (field: "logo" | "stamp" | "president_sig" | "treasurer_sig" | "secretary_sig") => {
    if (!orgId) return;
    setStatusMessage(null);

    try {
      const updates: Record<string, null> = {};
      if (field === "logo") {
        setLogoUrl("");
        updates.logoUrl = null;
        updates.logo_url = null;
      } else if (field === "stamp") {
        setStampUrl("");
        updates.stampUrl = null;
        updates.customStampUrl = null;
        updates.stamp_url = null;
      } else if (field === "president_sig") {
        setPresidentSignatureUrl("");
        updates.presidentSignatureUrl = null;
        updates.president_signature_url = null;
      } else if (field === "treasurer_sig") {
        setTreasurerSignatureUrl("");
        updates.treasurerSignatureUrl = null;
        updates.treasurer_signature_url = null;
      } else if (field === "secretary_sig") {
        setSecretarySignatureUrl("");
        updates.secretarySignatureUrl = null;
        updates.secretary_signature_url = null;
      }

      await updateDoc(doc(db, "organizations", orgId), updates);
      setStatusMessage({ type: "success", text: "Image removed." });
    } catch (err: unknown) {
      console.error("[REMOVE_ERROR]", err);
      setStatusMessage({ type: "error", text: "Failed to remove image." });
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    if (!isOwner && !isPresident && !isTreasurer) {
      setStatusMessage({ type: "error", text: "Only Owner, President, or Treasurer can modify branding." });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const orgRef = doc(db, "organizations", orgId);
      await updateDoc(orgRef, {
        name: orgName.trim(),
        registrationNumber: registrationNumber.trim(),
        topGreeting: topGreeting.trim(),
        headerSubtitle: headerSubtitle.trim(),
        receiptPrefix: receiptPrefix.trim().toUpperCase(),
        footerText: footerNote.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        mobile: orgMobile.trim(),
        email: orgEmail.trim(),
        president_name: presidentName.trim(),
        presidentName: presidentName.trim(),
        treasurer_name: treasurerName.trim(),
        treasurerName: treasurerName.trim(),
        secretary_name: secretaryName.trim(),
        secretaryName: secretaryName.trim(),
        updatedAt: new Date().toISOString(),
      });

      setStatusMessage({ type: "success", text: t("customization_saved_success") });
    } catch (err: unknown) {
      console.error("[SAVE_CUSTOMIZATION_ERR]", err);
      const msg = err instanceof Error ? err.message : "Failed to save customization details.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsSaving(false);
    }
  };

  // Sample Receipt Data for Live Preview
  const previewReceipt: ReceiptData = {
    id: "SAMPLE-9901",
    receiptNumber: `${receiptPrefix || "PB"}-2026-0001`,
    donorName: "आनंद शांताराम पाटील (Anand S. Patil)",
    donorMobile: "9876543210",
    donorAddress: city || "पुणे, महाराष्ट्र",
    amount: 5001,
    purpose: "उत्सव देणगी व महाप्रसाद वर्गणी",
    paymentMode: "UPI",
    paymentStatus: "PAID",
    createdAt: new Date().toISOString(),
    collectorName: user?.displayName || user?.email || "कार्यालय प्रतिनिधी",
    collectorRole: "खजिनदार (Treasurer)",
  };

  const previewOrg: OrganizationData = {
    name: orgName || "श्री गणेश उत्सव मंडळ",
    registrationNumber: registrationNumber || "E-12345/PUNE/2026",
    address: address || "मुख्य रस्ता",
    city: city || "पुणे",
    state: state || "महाराष्ट्र",
    pincode: pincode || "411002",
    logoUrl: logoUrl,
    stampUrl: stampUrl,
    presidentName: presidentName,
    presidentSignatureUrl: presidentSignatureUrl,
    treasurerName: treasurerName,
    treasurerSignatureUrl: treasurerSignatureUrl,
    secretaryName: secretaryName,
    secretarySignatureUrl: secretarySignatureUrl,
    footerText: footerNote,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={logoInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleUpload("logo", e.target.files[0]);
        }}
      />
      <input
        type="file"
        ref={stampInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleUpload("stamp", e.target.files[0]);
        }}
      />
      <input
        type="file"
        ref={presSigInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleUpload("president_sig", e.target.files[0]);
        }}
      />
      <input
        type="file"
        ref={treasSigInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleUpload("treasurer_sig", e.target.files[0]);
        }}
      />
      <input
        type="file"
        ref={secSigInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleUpload("secretary_sig", e.target.files[0]);
        }}
      />

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
            <h1 className="text-2xl font-black text-neutral-900">{t("customization_title")}</h1>
            <p className="text-xs text-neutral-500 font-medium">{t("customization_subtitle")}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveAll}
            disabled={isSaving || isLoading}
            className="px-5 py-2.5 rounded-2xl bg-[#8B1E2D] hover:bg-maroon-dark text-white text-xs font-bold uppercase tracking-wider shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t("saving_customization")}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-amber-300" />
                <span>{t("save_customization_btn")}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Alerts */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Grid: Settings Form (Left) & Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Customization Controls */}
        <div className="lg:col-span-6 space-y-6">
          <form onSubmit={handleSaveAll} className="space-y-6">
            {/* 1. Trust & Organization Details */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-[#8B1E2D]" />
                <span>{t("org_branding_heading")}</span>
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. श्री गणेश उत्सव मंडळ"
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon text-sm font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-neutral-700 block mb-1">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      placeholder="e.g. E-12345/PUNE"
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-700 block mb-1">
                      {t("receipt_prefix_label")}
                    </label>
                    <input
                      type="text"
                      value={receiptPrefix}
                      onChange={(e) => setReceiptPrefix(e.target.value.toUpperCase())}
                      placeholder="e.g. PB"
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon text-sm font-semibold uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-neutral-700 block mb-1">
                      {t("top_greeting_label")}
                    </label>
                    <input
                      type="text"
                      value={topGreeting}
                      onChange={(e) => setTopGreeting(e.target.value)}
                      placeholder="e.g. ।। श्री गणेशाय नमः ।। "
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-700 block mb-1">
                      {t("header_subtitle_label")}
                    </label>
                    <input
                      type="text"
                      value={headerSubtitle}
                      onChange={(e) => setHeaderSubtitle(e.target.value)}
                      placeholder="e.g. सार्वजनिक उत्सव व ट्रस्ट"
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon text-sm font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    {t("footer_note_label")}
                  </label>
                  <input
                    type="text"
                    value={footerNote}
                    onChange={(e) => setFooterNote(e.target.value)}
                    placeholder="e.g. आपल्या मोलाच्या देणगीबद्दल धन्यवाद!"
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon text-sm font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* 2. Official Logo & Stamp Uploads */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Stamp className="w-4 h-4 text-[#8B1E2D]" />
                <span>Logo & Trust Stamp</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Logo Upload Card */}
                <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/50 space-y-3">
                  <span className="text-xs font-bold text-neutral-700 block">
                    {t("logo_upload_title")}
                  </span>
                  <div className="h-24 rounded-xl border border-dashed border-neutral-300 bg-white flex items-center justify-center overflow-hidden">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain p-2" />
                    ) : (
                      <span className="text-[11px] text-neutral-400 font-medium">No Logo Uploaded</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={uploadingField === "logo"}
                      onClick={() => logoInputRef.current?.click()}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-white border border-neutral-200 hover:border-maroon text-[11px] font-bold text-neutral-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {uploadingField === "logo" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-maroon" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-maroon" />
                      )}
                      <span>Upload</span>
                    </button>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImage("logo")}
                        className="p-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Remove Logo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Stamp Upload Card */}
                <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/50 space-y-3">
                  <span className="text-xs font-bold text-neutral-700 block">
                    {t("stamp_upload_title")}
                  </span>
                  <div className="h-24 rounded-xl border border-dashed border-neutral-300 bg-white flex items-center justify-center overflow-hidden">
                    {stampUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={stampUrl} alt="Stamp" className="max-h-full max-w-full object-contain p-2" />
                    ) : (
                      <span className="text-[11px] text-neutral-400 font-medium">No Stamp Uploaded</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={uploadingField === "stamp"}
                      onClick={() => stampInputRef.current?.click()}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-white border border-neutral-200 hover:border-maroon text-[11px] font-bold text-neutral-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {uploadingField === "stamp" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-maroon" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-maroon" />
                      )}
                      <span>Upload</span>
                    </button>
                    {stampUrl && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImage("stamp")}
                        className="p-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Remove Stamp"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Committee Signatures (F39 Strict Parity) */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-[#8B1E2D]" />
                  <span>{t("signatures_title")}</span>
                </h2>
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                  President · Treasurer · Secretary
                </span>
              </div>

              <div className="space-y-4">
                {/* President Signature */}
                <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/40 space-y-3">
                  <span className="text-xs font-bold text-neutral-800 block">
                    {t("president_signature")}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
                        {t("signatory_name_label")}
                      </label>
                      <input
                        type="text"
                        value={presidentName}
                        onChange={(e) => setPresidentName(e.target.value)}
                        placeholder="e.g. श्री रमेश जोशी (अध्यक्ष)"
                        className="w-full px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-maroon"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
                        Digital Signature Image
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-24 bg-white border border-neutral-200 rounded-lg flex items-center justify-center overflow-hidden">
                          {presidentSignatureUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={presidentSignatureUrl} alt="Pres Sig" className="max-h-full max-w-full object-contain" />
                          ) : (
                            <span className="text-[9px] text-neutral-400">None</span>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={uploadingField === "president_sig"}
                          onClick={() => presSigInputRef.current?.click()}
                          className="py-1.5 px-3 rounded-lg bg-white border border-neutral-200 text-xs font-bold text-neutral-700 hover:border-maroon transition cursor-pointer"
                        >
                          {uploadingField === "president_sig" ? "Uploading..." : "Upload"}
                        </button>
                        {presidentSignatureUrl && (
                          <button
                            type="button"
                            onClick={() => handleRemoveImage("president_sig")}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Treasurer Signature */}
                <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/40 space-y-3">
                  <span className="text-xs font-bold text-neutral-800 block">
                    {t("treasurer_signature")}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
                        {t("signatory_name_label")}
                      </label>
                      <input
                        type="text"
                        value={treasurerName}
                        onChange={(e) => setTreasurerName(e.target.value)}
                        placeholder="e.g. श्री विठ्ठल तांबडे (कोषाध्यक्ष)"
                        className="w-full px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-maroon"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
                        Digital Signature Image
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-24 bg-white border border-neutral-200 rounded-lg flex items-center justify-center overflow-hidden">
                          {treasurerSignatureUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={treasurerSignatureUrl} alt="Treas Sig" className="max-h-full max-w-full object-contain" />
                          ) : (
                            <span className="text-[9px] text-neutral-400">None</span>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={uploadingField === "treasurer_sig"}
                          onClick={() => treasSigInputRef.current?.click()}
                          className="py-1.5 px-3 rounded-lg bg-white border border-neutral-200 text-xs font-bold text-neutral-700 hover:border-maroon transition cursor-pointer"
                        >
                          {uploadingField === "treasurer_sig" ? "Uploading..." : "Upload"}
                        </button>
                        {treasurerSignatureUrl && (
                          <button
                            type="button"
                            onClick={() => handleRemoveImage("treasurer_sig")}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Secretary Signature */}
                <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/40 space-y-3">
                  <span className="text-xs font-bold text-neutral-800 block">
                    {t("secretary_signature")}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
                        {t("signatory_name_label")}
                      </label>
                      <input
                        type="text"
                        value={secretaryName}
                        onChange={(e) => setSecretaryName(e.target.value)}
                        placeholder="e.g. श्री सचिन मोरे (सचिव)"
                        className="w-full px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-maroon"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
                        Digital Signature Image
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-24 bg-white border border-neutral-200 rounded-lg flex items-center justify-center overflow-hidden">
                          {secretarySignatureUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={secretarySignatureUrl} alt="Sec Sig" className="max-h-full max-w-full object-contain" />
                          ) : (
                            <span className="text-[9px] text-neutral-400">None</span>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={uploadingField === "secretary_sig"}
                          onClick={() => secSigInputRef.current?.click()}
                          className="py-1.5 px-3 rounded-lg bg-white border border-neutral-200 text-xs font-bold text-neutral-700 hover:border-maroon transition cursor-pointer"
                        >
                          {uploadingField === "secretary_sig" ? "Uploading..." : "Upload"}
                        </button>
                        {secretarySignatureUrl && (
                          <button
                            type="button"
                            onClick={() => handleRemoveImage("secretary_sig")}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Contact & Address Details */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#8B1E2D]" />
                <span>Contact & Address Details</span>
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">Street Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. शनिवार पेठ, मंदिर परिसर"
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-maroon"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-bold text-neutral-700 block mb-1">City / Village</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Pune"
                      className="w-full px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-maroon"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-700 block mb-1">State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Maharashtra"
                      className="w-full px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-maroon"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-700 block mb-1">Pincode</label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="411030"
                      className="w-full px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-maroon"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-xs font-bold text-neutral-700 block mb-1">
                      Official Mobile Number
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                      <input
                        type="tel"
                        value={orgMobile}
                        onChange={(e) => setOrgMobile(e.target.value)}
                        placeholder="9876543210"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-maroon"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-700 block mb-1">
                      Official Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                      <input
                        type="email"
                        value={orgEmail}
                        onChange={(e) => setOrgEmail(e.target.value)}
                        placeholder="trust@example.com"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-maroon"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Live Interactive Traditional Receipt Preview */}
        <div className="lg:col-span-6 sticky top-20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#8B1E2D]" />
              <h2 className="text-sm font-bold text-neutral-900">{t("live_receipt_preview")}</h2>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Live Real-Time Rendering
            </span>
          </div>

          <div className="p-4 bg-neutral-100 rounded-3xl border border-neutral-200/80 shadow-inner overflow-hidden">
            <TraditionalReceipt
              receipt={previewReceipt}
              organization={previewOrg}
              languageCode={(activeOrg as { languageCode?: string })?.languageCode || "mr"}
            />
          </div>

          <p className="text-[11px] text-neutral-500 text-center font-medium">
            This live preview shows exactly how digital receipts, WhatsApp cards, and PDF receipts will look for your donors.
          </p>
        </div>
      </div>
    </div>
  );
}
