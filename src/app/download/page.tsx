"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { submitDownloadLead } from "./actions";
import {
  Smartphone,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  MessageSquare
} from "lucide-react";
import { generateWhatsAppLink, getFormattedWhatsAppDisplay } from "@/lib/whatsapp";
import { trackDownloadInterest, trackWhatsAppClick } from "@/lib/analytics";

export default function DownloadPage() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [orgName, setOrgName] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const displayPhone = getFormattedWhatsAppDisplay();

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const cleanMobile = mobile.replace(/\s+/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMsg("कृपया वैध १० अंकी मोबाईल नंबर प्रविष्ट करा.");
      setLoading(false);
      return;
    }

    if (!name.trim() || !orgName.trim()) {
      setErrorMsg("कृपया सर्व माहिती भरा.");
      setLoading(false);
      return;
    }

    try {
      const res = await submitDownloadLead({
        name: name.trim(),
        mobile: cleanMobile,
        orgName: orgName.trim(),
        honeypot,
      });

      if (res.success) {
        trackDownloadInterest(orgName);
        setSubmitted(true);
      } else {
        setErrorMsg(res.message || "An error occurred. Please try again.");
      }
    } catch {
      setErrorMsg("Network error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-light font-sans text-neutral-800 flex flex-col justify-between">
      <Header />

      <main className="flex-1 pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* App Store Info */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-brand/10 text-orange-brand text-xs font-bold uppercase tracking-wider">
                  Mobile App Launch (मोबाईल ॲप)
                </span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-maroon-dark tracking-tight leading-tight">
                  Download PavtiBook Mobile App
                </h1>
                <p className="text-xs sm:text-sm text-neutral-600 font-medium leading-relaxed">
                  Manage collections, issue digital receipts, and audit volunteer activity directly from your Android or iOS device in the field.
                </p>
              </div>

              {/* Mocks of App Stores */}
              <div className="space-y-3.5">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="bg-neutral-100 p-2.5 rounded-xl text-neutral-500 shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-neutral-900 text-sm">Google Play Store</h4>
                      <p className="text-xs text-neutral-500">For Android smartphones & tablets.</p>
                    </div>
                  </div>
                  <div className="bg-orange-brand/10 text-orange-brand text-[10px] font-black uppercase px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Coming Soon</span>
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="bg-neutral-100 p-2.5 rounded-xl text-neutral-500 shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-neutral-900 text-sm">Apple App Store</h4>
                      <p className="text-xs text-neutral-500">For iPhone and iPad devices.</p>
                    </div>
                  </div>
                  <div className="bg-orange-brand/10 text-orange-brand text-[10px] font-black uppercase px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Coming Soon</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium bg-cream-brand/50 p-3 rounded-xl border border-maroon/10">
                <AlertCircle className="w-4 h-4 text-orange-brand shrink-0" />
                <span>Register below to get early access APK files and release alerts directly on WhatsApp.</span>
              </div>
            </div>

            {/* Early Access Form */}
            <div className="lg:col-span-6">
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-maroon/10 shadow-md space-y-5">
                
                {submitted ? (
                  <div className="text-center py-10 space-y-4 animate-in fade-in">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-maroon-dark">Early Access Registered!</h3>
                    <p className="text-xs sm:text-sm text-neutral-600 max-w-sm mx-auto font-medium leading-relaxed">
                      Thank you for registering. We will text you on WhatsApp ({mobile}) with the installation link and APK bundle.
                    </p>
                    <div className="pt-2">
                      <a
                        href={generateWhatsAppLink("नमस्कार PavtiBook Team, मी Early Access साठी नाव नोंदवले आहे.")}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackWhatsAppClick("download_success_screen")}
                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Chat on WhatsApp ({displayPhone})</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1 border-b border-neutral-100 pb-3">
                      <h3 className="font-black text-lg text-maroon-dark">
                        Register for Early Access (APK Link)
                      </h3>
                      <p className="text-xs text-neutral-500 font-medium">
                        Fill in your details to receive the direct APK installer bundle.
                      </p>
                    </div>

                    {errorMsg && (
                      <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-semibold border border-red-200">
                        {errorMsg}
                      </div>
                    )}

                    <form onSubmit={handleLeadSubmit} className="space-y-3.5">
                      <div style={{ display: "none" }} aria-hidden="true">
                        <input
                          type="text"
                          name="email_confirm"
                          value={honeypot}
                          onChange={(e) => setHoneypot(e.target.value)}
                          tabIndex={-1}
                          autoComplete="off"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-neutral-700">
                          Your Name (नाव)
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Ramesh Patil"
                          className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:bg-white focus:border-maroon"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-neutral-700">
                          WhatsApp Mobile Number (मोबाईल)
                        </label>
                        <input
                          type="tel"
                          required
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          placeholder="10-digit mobile number"
                          className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:bg-white focus:border-maroon"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-neutral-700">
                          Organization / Mandal Name (मंडळाचे नाव)
                        </label>
                        <input
                          type="text"
                          required
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          placeholder="e.g. Shree Ganesh Mandal"
                          className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:bg-white focus:border-maroon"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-maroon hover:bg-maroon-light disabled:opacity-50 text-white font-bold text-xs sm:text-sm py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
                      >
                        {loading ? (
                          <span>Registering...</span>
                        ) : (
                          <>
                            <span>Register for APK Download Link</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
