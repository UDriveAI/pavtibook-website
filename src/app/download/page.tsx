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
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { trackDownloadInterest, trackWhatsAppClick } from "@/lib/analytics";

export default function DownloadPage() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [orgName, setOrgName] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    // Mobile validation
    const cleanMobile = mobile.replace(/\s+/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMsg("Please enter a valid 10-digit Indian mobile number.");
      setLoading(false);
      return;
    }

    if (!name || !orgName) {
      setErrorMsg("Please fill in all fields.");
      setLoading(false);
      return;
    }

    try {
      const res = await submitDownloadLead({
        name,
        mobile: cleanMobile,
        orgName,
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
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* App Store Coming Soon Panels */}
            <div className="lg:col-span-6 space-y-8">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-brand/10 border border-orange-brand/20 text-orange-brand text-xs font-semibold uppercase tracking-wider">
                  Mobile App Launch
                </span>
                <h1 className="text-3xl sm:text-5xl font-black text-maroon-dark tracking-tight leading-tight">
                  Download PavtiBook Mobile App
                </h1>
                <p className="text-sm sm:text-base text-neutral-600 font-medium leading-relaxed">
                  Manage collections, issue receipts, and audit volunteer activity directly from your Android or iOS device in the field.
                </p>
              </div>

              {/* Mocks of App Stores */}
              <div className="space-y-4">
                {/* Google Play Store */}
                <div className="bg-white/80 p-5 rounded-2xl border border-neutral-200 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-4">
                    <div className="bg-neutral-100 p-3 rounded-xl text-neutral-400 shrink-0">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-neutral-800 text-sm sm:text-base">Google Play Store</h4>
                      <p className="text-xs text-neutral-500 font-semibold mt-0.5">For Android tablets & mobile devices.</p>
                    </div>
                  </div>
                  <div className="bg-orange-brand/10 border border-orange-brand/20 text-orange-brand text-[10px] font-black uppercase px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Coming Soon</span>
                  </div>
                </div>

                {/* Apple App Store */}
                <div className="bg-white/80 p-5 rounded-2xl border border-neutral-200 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-4">
                    <div className="bg-neutral-100 p-3 rounded-xl text-neutral-400 shrink-0">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-neutral-800 text-sm sm:text-base">Apple App Store</h4>
                      <p className="text-xs text-neutral-500 font-semibold mt-0.5">For iPhone and iPad devices.</p>
                    </div>
                  </div>
                  <div className="bg-orange-brand/10 border border-orange-brand/20 text-orange-brand text-[10px] font-black uppercase px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Coming Soon</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
                <AlertCircle className="w-4 h-4 text-orange-brand shrink-0" />
                <span>You can register below to get the APK installer file directly upon our release.</span>
              </div>
            </div>

            {/* Early Access Form Panel */}
            <div className="lg:col-span-6">
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-maroon/10 shadow-lg space-y-6">
                
                {submitted ? (
                  <div className="text-center py-12 space-y-4 animate-in fade-in zoom-in-95 duration-350">
                    <div className="w-16 h-16 bg-green-brand/10 text-green-brand rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black text-maroon-dark">Early Access Registered!</h3>
                    <p className="text-xs sm:text-sm text-neutral-600 max-w-sm mx-auto font-medium">
                      Thank you for registering. We will text you on WhatsApp and email you the APK installation link as soon as the package is ready for download.
                    </p>
                    {(() => {
                      const link = generateWhatsAppLink("I want to join the PavtiBook early access WhatsApp Group.");
                      if (link) {
                        return (
                          <div className="pt-2">
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => trackWhatsAppClick("download_success_screen")}
                              className="inline-flex items-center gap-2 bg-green-brand hover:bg-green-light text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                            >
                              <MessageSquare className="w-4 h-4 shrink-0" />
                              <span>Join Early Access WhatsApp Group</span>
                            </a>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    <div className="pt-4">
                      <button
                        onClick={() => setSubmitted(false)}
                        className="text-xs text-maroon hover:text-orange-brand font-bold underline cursor-pointer"
                      >
                        Register another team member
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-lg text-maroon-dark">
                        Register for Early Access
                      </h3>
                      <p className="text-xs text-neutral-500 font-semibold">
                        Fill in your details to receive the direct APK installer bundle before the Play Store launch.
                      </p>
                    </div>

                    {errorMsg && (
                      <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-semibold border border-red-200">
                        {errorMsg}
                      </div>
                    )}

                    <form onSubmit={handleLeadSubmit} className="space-y-4">
                      {/* Honeypot field (spam prevention) */}
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
                      
                      {/* Name */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                          Your Name
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your Name"
                          className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-maroon font-medium"
                        />
                      </div>

                      {/* Mobile */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                          WhatsApp Mobile Number
                        </label>
                        <input
                          type="tel"
                          required
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          placeholder="10-digit mobile number"
                          className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-maroon font-medium"
                        />
                      </div>

                      {/* Organization */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                          Organization / Mandal Name
                        </label>
                        <input
                          type="text"
                          required
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          placeholder="e.g. Lalbaugcha Raja Ganesh Mandal"
                          className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:bg-white focus:border-maroon font-medium"
                        />
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-maroon hover:bg-maroon-light disabled:bg-maroon/50 text-white font-bold text-base py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 mt-2 cursor-pointer"
                      >
                        {loading ? (
                          <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          <>
                            <span>Register for APK Link</span>
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
