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
  MapPin,
  Send,
  CheckCircle
} from "lucide-react";
import { generateWhatsAppLink } from "@/lib/whatsapp";
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

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    // Basic mobile validation
    const cleanMobile = mobile.replace(/\s+/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMsg("Please enter a valid 10-digit Indian mobile number.");
      setLoading(false);
      return;
    }

    if (!name || !subject || !message) {
      setErrorMsg("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    try {
      const res = await submitContactForm({
        name,
        mobile: cleanMobile,
        email,
        subject,
        message,
        honeypot,
      });

      if (res.success) {
        trackContactSubmit();
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <h1 className="text-3xl md:text-5xl font-black text-maroon-dark tracking-tight">
              Get in Touch with PavtiBook
            </h1>
            <p className="text-sm md:text-base font-semibold text-neutral-600 uppercase tracking-wider">
              Have questions about template setups or pricing? Our team is here to assist.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Contact Channels Panel */}
            <div className="lg:col-span-5 space-y-6">
              
              {(() => {
                const link = generateWhatsAppLink("Hello PavtiBook Team, I have a question about setting up my trust.");
                if (link) {
                  return (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackWhatsAppClick("contact_page_card")}
                      className="block bg-green-brand/5 border-2 border-green-brand/20 p-6 rounded-2xl hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex gap-4">
                        <div className="bg-green-brand text-white p-3 rounded-xl shrink-0">
                          <MessageSquare className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-extrabold text-green-brand text-base sm:text-lg">Chat on WhatsApp</h3>
                          <p className="text-xs text-neutral-600 font-semibold leading-relaxed">
                            Instant coordination and quick replies from our trust setup desk. Available 24/7.
                          </p>
                          <p className="text-sm font-bold text-neutral-800 pt-1">+91 99305 33929</p>
                        </div>
                      </div>
                    </a>
                  );
                }
                return (
                  <div className="block bg-neutral-105 border-2 border-neutral-200 p-6 rounded-2xl cursor-not-allowed select-none">
                    <div className="flex gap-4">
                      <div className="bg-neutral-300 text-neutral-500 p-3 rounded-xl shrink-0">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-neutral-500 text-base">WhatsApp Not Configured</h3>
                        <p className="text-xs text-neutral-400 font-semibold">
                          WhatsApp support is temporarily unavailable.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Call Details Card */}
              <div className="bg-white p-6 rounded-2xl border border-maroon/10 shadow-sm space-y-4">
                <div className="flex gap-4">
                  <div className="bg-maroon text-white p-3 rounded-xl shrink-0">
                    <Phone className="w-6 h-6 text-gold-brand" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-maroon-dark text-base">Direct Mobile Support</h3>
                    <p className="text-xs text-neutral-600 font-medium">
                      Call our team directly for immediate assistance with registration or volunteers.
                    </p>
                    <p className="text-sm font-bold text-neutral-800 pt-1">+91 99305 33929</p>
                  </div>
                </div>

                <hr className="border-neutral-100" />

                <div className="flex gap-4">
                  <div className="bg-orange-brand/10 text-orange-brand p-3 rounded-xl shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-neutral-800 text-sm">Working Hours</h3>
                    <p className="text-xs text-neutral-600 font-medium">
                      Monday to Saturday
                    </p>
                    <p className="text-xs font-bold text-neutral-800">
                      9:00 AM - 7:00 PM IST
                    </p>
                  </div>
                </div>

                <hr className="border-neutral-100" />

                <div className="flex gap-4">
                  <div className="bg-gold-brand/10 text-gold-brand p-3 rounded-xl shrink-0">
                    <Mail className="w-6 h-6 text-maroon" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-neutral-800 text-sm">Email Support</h3>
                    <p className="text-xs text-neutral-600 font-medium">
                      Send official trust documents or queries to our email address.
                    </p>
                    <p className="text-xs font-bold text-neutral-850">
                      support@pavtibook.online
                    </p>
                  </div>
                </div>
              </div>

              {/* Office Location Card */}
              <div className="bg-white p-6 rounded-2xl border border-maroon/10 shadow-sm flex gap-4">
                <div className="bg-neutral-100 p-3 rounded-xl shrink-0 text-neutral-500">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-neutral-800 text-sm font-sans">Office Address</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                    Plot No. 171, Sector 21, Kamothe, Panvel – 410209
                  </p>
                </div>
              </div>

            </div>

            {/* Contact Form Panel */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-maroon/10 shadow-lg">
              {submitted ? (
                <div className="text-center py-12 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 bg-green-brand/10 text-green-brand rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-850">Message Sent!</h3>
                  <p className="text-sm text-neutral-600 max-w-md mx-auto font-medium">
                    Thank you for writing to PavtiBook. We have received your query and will reply via email or call within 24 hours.
                  </p>
                  {(() => {
                    const link = generateWhatsAppLink("Hello PavtiBook Team, I just submitted a contact form message. I'd like to follow up.");
                    if (link) {
                      return (
                        <div className="pt-2">
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackWhatsAppClick("contact_success_screen")}
                            className="inline-flex items-center gap-2 bg-green-brand hover:bg-green-light text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                          >
                            <MessageSquare className="w-4 h-4 shrink-0" />
                            <span>Talk To PavtiBook On WhatsApp</span>
                          </a>
                        </div>
                      );
                    }
                    return null;
                  })()}
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
                      className="text-xs text-maroon hover:text-orange-brand font-bold underline cursor-pointer"
                    >
                      Send another message
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <h3 className="font-extrabold text-lg text-maroon-dark border-b border-neutral-100 pb-3">
                    Send General Message
                  </h3>

                  {errorMsg && (
                    <div className="bg-red-50 text-red-650 p-3 rounded-lg text-xs font-semibold border border-red-200">
                      {errorMsg}
                    </div>
                  )}

                  <form onSubmit={handleContactSubmit} className="space-y-4">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your Name"
                          className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white focus:border-maroon font-medium"
                        />
                      </div>
                      
                      {/* Mobile */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                          Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          placeholder="10-digit number"
                          className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white focus:border-maroon font-medium"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white focus:border-maroon font-medium"
                      />
                    </div>

                    {/* Subject */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Inquiring about 80G custom receipts"
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white focus:border-maroon font-semibold text-neutral-800"
                      />
                    </div>

                    {/* Message */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide">
                        Message <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Detail your question here..."
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white focus:border-maroon font-medium"
                      />
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-maroon hover:bg-maroon-light disabled:bg-maroon/50 text-white font-bold text-base py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <span>Send Message</span>
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
