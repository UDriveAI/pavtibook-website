"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { submitContactForm } from "./actions";
import {
  Phone,
  MessageSquare,
  Mail,
  Clock,
  Send,
  CheckCircle
} from "lucide-react";
import { generateWhatsAppLink, getFormattedWhatsAppDisplay } from "@/lib/whatsapp";
import { trackContactSubmit, trackWhatsAppClick } from "@/lib/analytics";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const displayPhone = getFormattedWhatsAppDisplay();
  const whatsAppLink = generateWhatsAppLink("नमस्कार PavtiBook Team, मला माहिती हवी आहे.");

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    // Mobile validation
    const cleanMobile = mobile.replace(/\s+/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMsg("कृपया वैध १० अंकी मोबाईल नंबर प्रविष्ट करा. (Please enter a valid 10-digit Indian mobile number).");
      setLoading(false);
      return;
    }

    if (!name.trim() || !subject.trim() || !message.trim()) {
      setErrorMsg("कृपया सर्व आवश्यक माहिती भरा. (Please fill in all required fields).");
      setLoading(false);
      return;
    }

    try {
      const res = await submitContactForm({
        name: name.trim(),
        mobile: cleanMobile,
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        honeypot,
      });

      if (res.success) {
        trackContactSubmit();
        setSubmitted(true);
      } else {
        setErrorMsg(res.message || "An error occurred. Please try again.");
      }
    } catch {
      setErrorMsg("Network error. Please try again later or reach us on WhatsApp.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-light font-sans text-neutral-800 flex flex-col justify-between">
      <Header />

      <main className="flex-1 pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-maroon/10 text-maroon text-xs font-bold uppercase tracking-wider">
              Contact & Support (संपर्क)
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-maroon-dark tracking-tight">
              Get in Touch with PavtiBook
            </h1>
            <p className="text-sm md:text-base font-semibold text-neutral-600">
              Have questions about setting up your Mandal, receipt templates, or pricing? We are here to help.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Left Contact Channels */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* WhatsApp Support Card */}
              <a
                href={whatsAppLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsAppClick("contact_page_card")}
                className="block bg-emerald-50 border-2 border-emerald-500/30 p-6 rounded-2xl hover:shadow-md transition-shadow duration-200 group"
              >
                <div className="flex gap-4">
                  <div className="bg-emerald-600 text-white p-3 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-emerald-800 text-base sm:text-lg">Chat on WhatsApp (त्वरित मदत)</h3>
                    <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                      Instant coordination and quick replies from our Mandal setup desk.
                    </p>
                    <p className="text-sm font-bold text-neutral-900 pt-1">
                      {displayPhone}
                    </p>
                  </div>
                </div>
              </a>

              {/* Call Details Card */}
              <div className="bg-white p-6 rounded-2xl border border-maroon/10 shadow-sm space-y-4">
                <div className="flex gap-4">
                  <div className="bg-maroon text-white p-3 rounded-xl shrink-0">
                    <Phone className="w-6 h-6 text-gold-brand" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-maroon-dark text-base">Direct Mobile Support</h3>
                    <p className="text-xs text-neutral-600 font-medium">
                      Call our team for immediate assistance with registration or volunteer logins.
                    </p>
                    <p className="text-sm font-bold text-neutral-900 pt-1">
                      {displayPhone}
                    </p>
                  </div>
                </div>

                <hr className="border-neutral-100" />

                <div className="flex gap-4">
                  <div className="bg-orange-brand/10 text-orange-brand p-3 rounded-xl shrink-0">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-neutral-800 text-sm">Email Support</h3>
                    <p className="text-xs text-neutral-600 font-medium">
                      Send official trust inquiries, proposals, or documents.
                    </p>
                    <p className="text-xs font-bold text-neutral-800 pt-0.5">
                      support@pavtibook.online
                    </p>
                  </div>
                </div>

                <hr className="border-neutral-100" />

                <div className="flex gap-4">
                  <div className="bg-gold-brand/20 text-maroon p-3 rounded-xl shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-neutral-800 text-sm">Support Hours</h3>
                    <p className="text-xs text-neutral-600 font-medium">
                      Monday to Saturday: 9:00 AM – 7:00 PM IST
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      (WhatsApp queries monitored during peak festival seasons)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Contact Form */}
            <div className="lg:col-span-7 bg-white p-7 sm:p-9 rounded-3xl border border-maroon/10 shadow-md">
              {submitted ? (
                <div className="text-center py-12 space-y-4 animate-in fade-in">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-maroon-dark">
                    संदेश प्राप्त झाला! (Message Sent)
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
                    Thank you for reaching out. A PavtiBook specialist will review your request and contact you via phone or WhatsApp within 2 hours.
                  </p>
                  <div className="pt-4">
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setName("");
                        setMobile("");
                        setEmail("");
                        setSubject("");
                        setMessage("");
                      }}
                      className="bg-cream-brand hover:bg-cream-dark text-maroon font-bold text-xs px-6 py-2.5 rounded-xl border border-maroon/20 transition-all cursor-pointer"
                    >
                      Send Another Message
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <h3 className="text-xl font-black text-maroon-dark">
                      Send a Message (संदेश पाठवा)
                    </h3>
                    <p className="text-xs text-neutral-500 font-medium mt-0.5">
                      Fill in your details and our team will get back to you promptly.
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl font-semibold">
                      {errorMsg}
                    </div>
                  )}

                  {/* Honeypot for spam bots */}
                  <input
                    type="text"
                    name="website_honeypot"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    style={{ display: "none" }}
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-neutral-700">
                        Your Name (नाव) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Ramesh Patil"
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:bg-white focus:border-maroon transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-neutral-700">
                        Mobile Number (मोबाईल) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:bg-white focus:border-maroon transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-neutral-700">
                        Email Address (पर्यायी)
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:bg-white focus:border-maroon transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-neutral-700">
                        Subject (विषय) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Mandal Registration / Pricing Inquiry"
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:bg-white focus:border-maroon transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-700">
                      Message / Requirements (संदेश) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please tell us about your Mandal/Trust and what you need help with..."
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:bg-white focus:border-maroon transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-maroon hover:bg-maroon-light disabled:opacity-50 text-white font-bold text-xs sm:text-sm py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {loading ? (
                      <span>Sending... (पाठवत आहे...)</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Message (संदेश पाठवा)</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
