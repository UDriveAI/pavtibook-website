"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import {
  Smartphone,
  CheckCircle,
  XCircle,
  ArrowRight,
  TrendingUp,
  FileText,
  MessageSquare,
  Users,
  Clock,
  ShieldCheck,
  Share2,
  FileDown,
  UserCheck,
  Award,
  RefreshCw,
  Search,
  ChevronDown,
  HelpCircle,
  QrCode,
  Sparkles,
  Shield,
  Layers,
  X,
  Menu,
  Bell,
  Home as HomeIcon,
  PlusCircle,
  Settings as SettingsIcon,
  Wifi,
  Battery
} from "lucide-react";
import { generateDemoWhatsAppLink, getFormattedWhatsAppDisplay } from "@/lib/whatsapp";
import { trackWhatsAppClick } from "@/lib/analytics";

// Interactive Screen Topics for Product Carousel
const screenshotTopics = [
  {
    id: "receipt",
    title: "Instant Receipt Creation",
    subtitle: "पावती निर्मिती",
    desc: "Auto-fills donor profiles by 10-digit phone number, records Cash or direct UPI, and issues serial receipts in 3 seconds.",
    color: "bg-orange-brand"
  },
  {
    id: "preview",
    title: "Traditional Receipt Preview",
    subtitle: "पारंपारिक पावती",
    desc: "Renders authentic cultural receipts with Devanagari headers, custom trust logos, treasurer signature, and cryptographic QR token.",
    color: "bg-gold-brand"
  },
  {
    id: "dashboard",
    title: "Collection Dashboard",
    subtitle: "डॅशबोर्ड आणि आकडेवारी",
    desc: "Real-time summary of today's total collections, Cash vs. UPI split, donor count, and active collection activity.",
    color: "bg-maroon"
  },
  {
    id: "donors",
    title: "Donor Directory (CRM)",
    subtitle: "देणगीदार नोंदणी",
    desc: "Search, filter, and track historical contributions of every community supporter across festival seasons.",
    color: "bg-emerald-600"
  },
  {
    id: "pending",
    title: "Pending Collection Tracker",
    subtitle: "प्रलंबित वर्गणी",
    desc: "Track promised donations (vargani) with scheduled due dates and dispatch polite WhatsApp reminder alerts.",
    color: "bg-maroon-dark"
  }
];

function renderMockScreen(id: string) {
  switch (id) {
    case "receipt":
      return (
        <div className="space-y-2 text-[7.5px] animate-in fade-in duration-300 font-sans pb-2">
          {/* Header Action Banner */}
          <div className="bg-gradient-to-r from-maroon/15 via-orange-brand/10 to-gold-brand/15 p-2 rounded-xl border border-maroon/20 flex justify-between items-center shadow-2xs">
            <div>
              <p className="font-black text-maroon text-[9px]">New Collection Entry</p>
              <p className="text-[6px] text-neutral-600 font-bold devanagari">नवीन पावती नोंदणी व वाटप</p>
            </div>
            <span className="text-[7px] bg-maroon text-white font-black px-2 py-0.5 rounded-md shadow-2xs">
              PB-2026-000141
            </span>
          </div>

          {/* Donor Mobile Input with Auto-Found Badge */}
          <div className="space-y-0.5">
            <div className="flex justify-between items-center px-0.5">
              <label className="text-[6.5px] font-black text-neutral-700 uppercase tracking-wider">
                Donor Mobile (मोबाईल) *
              </label>
              <span className="text-[6px] text-emerald-800 bg-emerald-100 font-bold px-1.5 py-0.2 rounded-full">
                Auto-Found Profile ✓
              </span>
            </div>
            <div className="flex bg-white border border-neutral-300 rounded-lg p-1.5 items-center justify-between shadow-2xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[8px]">🇮🇳</span>
                <span className="text-neutral-500 font-bold text-[7px] border-r border-neutral-200 pr-1">+91</span>
                <span className="font-extrabold text-neutral-900 text-[8px]">98234 56789</span>
              </div>
              <span className="text-[6px] text-maroon font-bold bg-maroon/5 px-1 py-0.5 rounded">Change</span>
            </div>
          </div>

          {/* Donor Name */}
          <div className="space-y-0.5">
            <label className="text-[6.5px] font-black text-neutral-700 uppercase tracking-wider px-0.5">
              Donor Full Name (देणगीदाराचे नाव) *
            </label>
            <div className="bg-white border border-neutral-300 rounded-lg p-1.5 text-neutral-900 font-black text-[8px] shadow-2xs flex items-center justify-between">
              <span>Shri. Rameshwar V. Patil</span>
              <span className="text-[6px] text-neutral-400 font-medium">Flat 402, Sai Sadan</span>
            </div>
          </div>

          {/* Amount & Quick Suggestion Chips */}
          <div className="space-y-1 bg-white p-2 rounded-xl border border-neutral-200 shadow-2xs">
            <div className="flex justify-between items-center">
              <label className="text-[6.5px] font-black text-neutral-700 uppercase tracking-wider">
                Donation Amount (रक्कम ₹) *
              </label>
              <span className="text-[6px] text-emerald-700 font-bold">0% Gateway Commission</span>
            </div>
            <div className="bg-neutral-50 border border-maroon/30 rounded-lg p-1.5 text-maroon font-black text-[11px] flex items-center justify-between">
              <span>₹ 1,001.00</span>
              <span className="text-[6px] text-neutral-500 font-normal">One Thousand One Only</span>
            </div>
            {/* Quick Amount Suggestion Chips */}
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              {[
                { a: "+₹101", sel: false },
                { a: "+₹501", sel: false },
                { a: "+₹1,001", sel: true },
                { a: "+₹2,100", sel: false }
              ].map((chip, i) => (
                <div
                  key={i}
                  className={`text-center py-0.5 rounded text-[6.5px] font-black border transition-all ${
                    chip.sel
                      ? "bg-maroon text-white border-maroon shadow-2xs"
                      : "bg-neutral-50 text-neutral-700 border-neutral-200"
                  }`}
                >
                  {chip.a}
                </div>
              ))}
            </div>
          </div>

          {/* Purpose & Payment Mode Grid */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="space-y-0.5">
              <label className="text-[6.5px] font-black text-neutral-700 uppercase tracking-wider px-0.5">
                Purpose (कारण)
              </label>
              <div className="bg-white border border-neutral-300 rounded-lg p-1 text-neutral-800 text-[7px] font-bold truncate shadow-2xs">
                Ganpati Vargani 2026
              </div>
            </div>
            <div className="space-y-0.5">
              <label className="text-[6.5px] font-black text-neutral-700 uppercase tracking-wider px-0.5">
                Payment Mode
              </label>
              <div className="grid grid-cols-2 gap-0.5 bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-[6.5px]">
                <div className="bg-white text-maroon font-black text-center py-0.5 rounded shadow-2xs">
                  UPI ✓
                </div>
                <div className="text-neutral-600 font-bold text-center py-0.5">
                  Cash
                </div>
              </div>
            </div>
          </div>

          {/* Volunteer Collector Stamp */}
          <div className="flex justify-between items-center bg-cream-brand/30 px-2 py-1 rounded-lg border border-maroon/10 text-[6px] text-neutral-600 font-medium">
            <span>Collector: <strong>Rahul Patil (Treasurer)</strong></span>
            <span>Date: <strong>18 Aug 2026</strong></span>
          </div>

          {/* Action Buttons */}
          <div className="pt-0.5 space-y-1">
            <div className="bg-gradient-to-r from-orange-brand to-orange-light text-white font-black py-2 rounded-xl text-center text-[8px] shadow-md flex items-center justify-center gap-1.5 tracking-wider uppercase">
              <Share2 className="w-2.5 h-2.5 shrink-0" />
              <span>Generate & Share on WhatsApp</span>
            </div>
          </div>
        </div>
      );

    case "preview":
      return (
        <div className="space-y-1.5 text-[6px] leading-tight animate-in fade-in duration-300 font-sans pb-2">
          {/* Header Action Bar */}
          <div className="flex justify-between items-center px-1 pb-1 border-b border-maroon/10">
            <span className="font-black text-maroon text-[7.5px]">Official Voucher View</span>
            <div className="flex gap-1">
              <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[5.5px] font-bold">WhatsApp Sent ✓</span>
              <span className="bg-neutral-800 text-white px-1.5 py-0.5 rounded text-[5.5px] font-bold">PDF Ready</span>
            </div>
          </div>

          {/* Authentic Traditional Receipt Card */}
          <div className="bg-[#FFFDF9] traditional-border p-2.5 shadow-md relative text-neutral-800 rounded-sm space-y-1">
            {/* Watermark/Stamp */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] border-2 border-dashed border-emerald-600/50 text-emerald-700/70 font-black text-[8.5px] px-2 py-0.5 uppercase tracking-widest pointer-events-none select-none z-10 devanagari">
              पावती पूर्ण / PAID
            </div>

            {/* Religious Header */}
            <div className="text-center text-[6px] font-black text-maroon devanagari tracking-wide">
              ॥ श्री गणेश प्रसन्न ॥
            </div>

            {/* Trust Title */}
            <div className="text-center font-black text-maroon-dark text-[7.5px] tracking-tight">
              LALBAUGCHA RAJA GANESH UTSAV MANDAL
            </div>
            <div className="text-center text-[5px] text-neutral-500 font-semibold">
              Reg. No: F-12345/Mumbai · Lalbaug Market, Mumbai 400012
            </div>
            
            <hr className="border-maroon/20 my-0.5" />

            {/* Serial & Date */}
            <div className="flex justify-between font-black text-neutral-800 text-[6px]">
              <span>No: <strong className="text-maroon font-black">PB-2026-000136</strong></span>
              <span>Date: 18 August 2026</span>
            </div>

            {/* Donor Fields */}
            <div className="space-y-0.5 text-neutral-700 font-medium bg-cream-brand/20 p-1.5 rounded border border-maroon/5 text-[5.5px]">
              <div>Received with thanks from (देणगीदाराचे नाव):</div>
              <div className="font-black text-neutral-900 border-b border-dashed border-neutral-300 pb-0.5 text-[6.5px]">
                Shri. Rameshwar V. Patil
              </div>
              <div>The sum of Rupees (अक्षरी रक्कम):</div>
              <div className="font-black text-neutral-900 border-b border-dashed border-neutral-300 pb-0.5 text-[6px]">
                One Thousand One Rupees Only
              </div>
              <div className="flex justify-between items-center pt-0.5 text-[5.5px]">
                <div>Purpose: <span className="font-bold text-neutral-800">Ganesh Vargani</span></div>
                <div>Mode: <span className="font-bold text-emerald-800">UPI (Direct Bank)</span></div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="flex justify-between items-end pt-1">
              <div className="bg-maroon/10 border border-maroon text-maroon px-1.5 py-0.5 font-black text-[8px] rounded shadow-2xs">
                ₹ 1,001.00 /-
              </div>
              
              {/* QR Code Verification Block */}
              <div className="text-center">
                <div className="w-6 h-6 border border-neutral-300 p-0.5 flex items-center justify-center bg-white rounded shadow-2xs mx-auto">
                  <QrCode className="w-full h-full text-neutral-900" />
                </div>
                <span className="text-[4.5px] font-bold text-neutral-500 mt-0.5 block">Scan to Verify</span>
              </div>

              <div className="text-right text-[5px] text-neutral-600">
                <div className="font-black text-neutral-900 text-[6px]">Rahul S. Patil</div>
                <div className="text-neutral-500 italic">Treasurer / खजिनदार</div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="grid grid-cols-2 gap-1 pt-1">
            <div className="bg-emerald-600 text-white font-bold py-1 rounded-lg text-center text-[6.5px] shadow-sm flex items-center justify-center gap-1">
              <MessageSquare className="w-2 h-2" />
              <span>Share on WhatsApp</span>
            </div>
            <div className="bg-neutral-800 text-white font-bold py-1 rounded-lg text-center text-[6.5px] shadow-sm flex items-center justify-center gap-1">
              <FileDown className="w-2 h-2" />
              <span>Download PDF</span>
            </div>
          </div>
        </div>
      );

    case "dashboard":
      return (
        <div className="space-y-2 text-[7px] animate-in fade-in duration-300 font-sans pb-2">
          {/* Greeting Header */}
          <div className="flex justify-between items-center px-0.5">
            <div>
              <h4 className="font-black text-neutral-900 text-[9.5px]">Namaste, Rahul 🙏</h4>
              <p className="text-[6px] text-neutral-500 font-bold">Lalbaugcha Raja Ganesh Mandal</p>
            </div>
            <span className="text-[5.5px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <span>●</span> Online
            </span>
          </div>

          {/* Hero Red Action Card (Flutter Large Action) */}
          <div className="bg-gradient-to-r from-maroon to-maroon-dark text-white p-2 rounded-xl flex items-center gap-2 shadow-md border border-maroon-light/20">
            <div className="w-7 h-7 rounded-lg bg-white/15 border border-gold-brand/80 flex items-center justify-center text-gold-brand font-black text-base shrink-0">
              +
            </div>
            <div className="flex-1">
              <p className="font-black text-[8.5px] leading-tight tracking-wide">Add New Collection</p>
              <p className="text-[5.5px] text-cream-brand/80 font-medium">Create instant digital receipt & share</p>
            </div>
            <span className="text-gold-brand text-[10px] font-bold">→</span>
          </div>

          {/* Total Collections Card */}
          <div className="bg-white p-2 rounded-xl border border-neutral-200 shadow-2xs space-y-1.5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[6px] text-neutral-500 font-black uppercase tracking-wider">Total Collections (एकूण वर्गणी)</p>
                <h4 className="text-base font-black text-neutral-900">₹ 2,45,500</h4>
              </div>
              <div className="p-1 rounded-lg bg-orange-brand/10 text-orange-brand">
                <TrendingUp className="w-3 h-3" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 pt-1 border-t border-neutral-100 text-[6.5px]">
              <div className="bg-emerald-50/80 p-1 rounded-lg border border-emerald-100">
                <p className="text-neutral-500 text-[5.5px] font-bold">Cash (रोख जमा)</p>
                <p className="font-black text-emerald-900 text-[7.5px]">₹ 85,000</p>
              </div>
              <div className="bg-purple-50/80 p-1 rounded-lg border border-purple-100">
                <p className="text-neutral-500 text-[5.5px] font-bold">UPI (बँक जमा)</p>
                <p className="font-black text-purple-900 text-[7.5px]">₹ 1,60,500</p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-1 text-center">
            <div className="bg-white p-1 rounded-lg border border-neutral-100 shadow-2xs">
              <p className="text-[5.5px] text-neutral-500 font-bold">Donors</p>
              <p className="text-[8px] font-black text-neutral-900">856</p>
            </div>
            <div className="bg-white p-1 rounded-lg border border-neutral-100 shadow-2xs">
              <p className="text-[5.5px] text-neutral-500 font-bold">Receipts</p>
              <p className="text-[8px] font-black text-neutral-900">1,245</p>
            </div>
            <div className="bg-white p-1 rounded-lg border border-neutral-100 shadow-2xs">
              <p className="text-[5.5px] text-orange-brand font-bold">Pending</p>
              <p className="text-[8px] font-black text-orange-brand">₹ 48,000</p>
            </div>
          </div>

          {/* Recent Receipts List */}
          <div className="bg-white p-1.5 rounded-xl border border-neutral-200 shadow-2xs space-y-1">
            <div className="flex justify-between items-center text-[6px] font-bold text-neutral-500 px-0.5">
              <span>RECENT RECEIPTS (ताज्या पावत्या)</span>
              <span className="text-maroon font-bold">View All</span>
            </div>
            {[
              { name: "Snehal S. Deshmukh", mode: "UPI", amt: "₹ 5,000", time: "2m ago" },
              { name: "Amit R. Kadam", mode: "Cash", amt: "₹ 1,001", time: "15m ago" },
              { name: "Mahesh Kirana Store", mode: "UPI", amt: "₹ 2,500", time: "1h ago" }
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-0.5 border-b border-neutral-50 last:border-0 text-[6.5px]">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-maroon/10 text-maroon font-black flex items-center justify-center text-[5.5px]">
                    {item.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900">{item.name}</p>
                    <p className="text-[5px] text-neutral-400">{item.mode} · {item.time}</p>
                  </div>
                </div>
                <span className="font-black text-emerald-700 text-[7px]">{item.amt}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "donors":
      return (
        <div className="space-y-1.5 text-[7px] animate-in fade-in duration-300 font-sans pb-2">
          {/* Top Info */}
          <div className="flex justify-between items-center px-0.5">
            <div>
              <h4 className="font-black text-neutral-900 text-[9.5px]">Donor Directory CRM</h4>
              <p className="text-[6px] text-neutral-500 font-semibold">856 Registered Community Supporters</p>
            </div>
            <span className="text-[6px] bg-maroon text-white font-bold px-1.5 py-0.5 rounded-full">
              Export CSV
            </span>
          </div>

          {/* Search Box & Filters */}
          <div className="space-y-1">
            <div className="bg-white p-1 rounded-lg border border-neutral-300 flex items-center justify-between text-[6.5px] shadow-2xs">
              <div className="flex items-center gap-1 text-neutral-400">
                <Search className="w-2.5 h-2.5 text-neutral-400" />
                <span>Search by Name, Mobile, Flat...</span>
              </div>
              <span className="text-neutral-400 text-[5.5px]">Filter ⚙</span>
            </div>

            {/* Category Chips */}
            <div className="flex gap-1 text-[6px]">
              <span className="bg-maroon text-white px-2 py-0.5 rounded-full font-bold shadow-2xs">All (856)</span>
              <span className="bg-white text-neutral-700 px-2 py-0.5 rounded-full font-bold border border-neutral-200">VIP (42)</span>
              <span className="bg-white text-neutral-700 px-2 py-0.5 rounded-full font-bold border border-neutral-200">Sponsors</span>
            </div>
          </div>

          {/* Detailed Donor Cards */}
          <div className="space-y-1">
            {[
              { n: "Kiran R. Deshmukh", p: "+91 98332 11223", a: "₹ 25,000", c: "3 Receipts", vip: true, addr: "B-12 Sai Sadan" },
              { n: "Rajesh S. Thorat", p: "+91 98455 66778", a: "₹ 5,001", c: "2 Receipts", vip: false, addr: "Shop #4 Market Rd" },
              { n: "Anjali M. Kadam", p: "+91 97665 44332", a: "₹ 2,500", c: "1 Receipt", vip: false, addr: "Flat 101 Om Niwas" },
              { n: "Vikram G. Shinde", p: "+91 99201 88442", a: "₹ 11,000", c: "4 Receipts", vip: true, addr: "Shivaji Chowk" }
            ].map((item, i) => (
              <div key={i} className="bg-white p-1.5 rounded-lg border border-neutral-200 flex justify-between items-center shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <div className={`w-5 h-5 rounded-full font-black flex items-center justify-center text-[6.5px] ${item.vip ? "bg-gold-brand/20 text-orange-brand border border-gold-brand" : "bg-maroon/10 text-maroon"}`}>
                    {item.n[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="font-black text-neutral-900 text-[7px]">{item.n}</p>
                      {item.vip && (
                        <span className="bg-gold-brand/20 text-orange-brand font-black text-[5px] px-1 py-0.2 rounded">VIP</span>
                      )}
                    </div>
                    <p className="text-[5.5px] text-neutral-500">{item.p} · {item.addr}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-emerald-700 text-[7.5px] block">{item.a}</span>
                  <span className="text-[5px] text-neutral-400">{item.c}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "pending":
      return (
        <div className="space-y-1.5 text-[7px] animate-in fade-in duration-300 font-sans pb-2">
          {/* Header */}
          <div className="flex justify-between items-center px-0.5">
            <div>
              <h4 className="font-black text-neutral-900 text-[9.5px]">Pending Vargani Tracker</h4>
              <p className="text-[6px] text-neutral-500 font-semibold">Track promised contributions & sponsors</p>
            </div>
            <span className="text-[6px] bg-orange-brand/15 text-orange-brand font-black px-1.5 py-0.5 rounded-full">
              8 Pending
            </span>
          </div>

          {/* Pending Overview Card */}
          <div className="bg-gradient-to-r from-orange-brand/10 to-gold-brand/15 p-1.5 rounded-xl border border-orange-brand/20 flex justify-between items-center">
            <div>
              <p className="text-[5.5px] text-neutral-600 font-bold uppercase">Total Pending Amount</p>
              <h4 className="text-xs font-black text-orange-brand">₹ 48,000</h4>
            </div>
            <div className="text-right text-[5.5px] text-neutral-600">
              <p className="font-bold text-neutral-800">4 Due This Week</p>
              <p className="text-emerald-700 font-semibold">1-Click Reminders</p>
            </div>
          </div>

          {/* Detailed Pending Cards */}
          <div className="space-y-1">
            {[
              { n: "Shree Ganesh Jewellers", p: "Santosh Jeweller", a: "₹ 21,000", d: "Due Tomorrow", overdue: false },
              { n: "Mahesh Kirana Store", p: "Mahesh Shah", a: "₹ 5,000", d: "Overdue by 2 Days", overdue: true },
              { n: "Shiv Krupa Developers", p: "Ajit Patil", a: "₹ 15,000", d: "Due 25 Aug", overdue: false },
              { n: "Ambika Sweet Mart", p: "Pravin Purohit", a: "₹ 7,000", d: "Due 28 Aug", overdue: false }
            ].map((item, i) => (
              <div key={i} className="bg-white p-1.5 rounded-xl border border-neutral-200 shadow-2xs space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-black text-neutral-900 text-[7.5px]">{item.n}</h5>
                    <p className="text-[5.5px] text-neutral-500">{item.p}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-neutral-900 text-[7.5px] block">{item.a}</span>
                    <span className={`text-[5px] font-bold px-1 py-0.2 rounded ${item.overdue ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-800"}`}>
                      {item.d}
                    </span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex justify-end gap-1 pt-0.5 border-t border-neutral-100">
                  <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded text-[5.5px] font-bold flex items-center gap-0.5 border border-emerald-200">
                    <MessageSquare className="w-2 h-2" /> Remind
                  </span>
                  <span className="bg-maroon text-white px-1.5 py-0.5 rounded text-[5.5px] font-bold">
                    Collect Now
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}

export default function Home() {
  const [activeScreenIndex, setActiveScreenIndex] = useState(0);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [activeFeatureTab, setActiveFeatureTab] = useState<"receipts" | "donors" | "collections" | "management">("receipts");

  const displayPhone = getFormattedWhatsAppDisplay();

  const faqs = [
    {
      q: "PavtiBook म्हणजे काय आणि हे कोणासाठी आहे? (What is PavtiBook?)",
      a: "PavtiBook हे गणेशोत्सव मंडळे, नवरात्र उत्सव, मंदिर ट्रस्ट, सामाजिक संस्था आणि गृहनिर्माण संस्थांसाठी बनवलेले डिजिटल पावती व देणगी व्यवस्थापन ॲप आहे. पारंपारिक कागदी पावत्यांऐवजी मोबाईलवरून थेट पावती तयार करून देणगीदाराच्या WhatsApp वर त्वरित पाठवता येते."
    },
    {
      q: "पावती देणगीदाराच्या WhatsApp वर कशी जाते? (WhatsApp Receipt Sharing)",
      a: "पावती बनवल्यावर ॲप आपोआप अधिकृत डिझाइनची PDF तयार करतो. 'WhatsApp वर शेअर करा' वर क्लिक करताच पावती थेट देणगीदाराच्या WhatsApp वर एका सेकंदात पाठवली जाते."
    },
    {
      q: "पावतीची QR कोडद्वारे पडताळणी कशी होते? (QR Verification)",
      a: "प्रत्येक पावतीवर एक सुरक्षित युनिक QR कोड असतो. कोणताही देणगीदार किंवा नागरिक तो QR कोड मोबाईल कॅमेऱ्याने स्कॅन करून pavtibook.online वर पावतीची खरी रक्कम, नाव आणि तारीख तपासू शकतो."
    },
    {
      q: "प्रलंबित वर्गणी (Pending Vargani) ट्रॅक करता येते का?",
      a: "होय! ज्या देणगीदारांनी किंवा दुकानांनी नंतर वर्गणी देण्याचे आश्वासन दिले आहे, त्यांच्या नोंदी 'Pending' म्हणून नोंदवता येतात आणि योग्य दिवशी त्यांना WhatsApp वर स्मरणपत्र (Reminder) पाठवता येते."
    },
    {
      q: "एकाच वेळी अनेक कार्यकर्ते (Volunteers) पावती फाडू शकतात का?",
      a: "होय. एका मंडळासाठी अध्यक्ष, खजिनदार आणि अनेक कार्यकर्त्यांचे स्वतंत्र लॉग इन बनवता येतात. प्रत्येक कार्यकर्त्याने जमा केलेली रक्कम डॅशबोर्डवर स्वतंत्रपणे दिसते."
    },
    {
      q: "UPI पेमेंट थेट आमच्या ट्रस्टच्या बँक खात्यात जमा होते का?",
      a: "होय. PavtiBook मध्ये मंडळाचा स्वतःचा UPI ID सेट केला जातो. देणगीदाराने QR स्कॅन केल्यावर पैसे थेट मंडळाच्या बँक खात्यात जमा होतात, यामध्ये कोणताही मध्यस्थ किंवा कमिशन नसते."
    },
    {
      q: "पावतीवर आमचा लोगो, नाव आणि सही टाकता येते का?",
      a: "होय. Template Settings मधून मंडळाचा अधिकृत लोगो, नाव, पत्ता आणि खजिनदारांची डिजिटल सही पावतीवर आपोआप सेट करता येते."
    },
    {
      q: "माझा डेटा सुरक्षित राहील का? फोन बदलला तर?",
      a: "सर्व डेटा एन्क्रिप्टेड क्लाउड सर्व्हरवर सुरक्षित साठवला जातो. तुम्ही नवा फोन घेतला किंवा ॲप पुन्हा इन्स्टॉल केले तरी तुमचा सर्व हिशोब आणि देणगीदारांची यादी सुरक्षित राहते."
    }
  ];

  return (
    <div className="min-h-screen bg-cream-light font-sans text-neutral-800 flex flex-col justify-between">
      <Header />

      {/* 1. HERO SECTION */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 bg-gradient-to-b from-maroon to-[#A32436] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none bg-[radial-gradient(#FFF6E8_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: Value Proposition */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-gold-brand text-xs font-bold shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-gold-brand" />
                <span>भारतातील गणेश मंडळे, उत्सव समिती आणि ट्रस्टसाठी नंबर १ डिजिटल पावती ॲप</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-cream-brand leading-[1.1]">
                  PavtiBook — Digital Trust for Indian Collections
                </h1>
                <p className="text-base sm:text-xl text-cream-brand/90 font-medium leading-snug">
                  वर्गणी घेतल्याबरोबर पावती थेट देणगीदाराच्या WhatsApp वर. कागदी पावत्यांचे नुकसान आणि हिशोबातील चुका कायमच्या थांबवा.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs sm:text-sm text-cream-brand/90 font-medium">
                <div className="flex items-center gap-2 justify-center lg:justify-start">
                  <CheckCircle className="w-4 h-4 text-gold-brand shrink-0" />
                  <span>१००% थेट बँक खात्यात (0% Commission UPI)</span>
                </div>
                <div className="flex items-center gap-2 justify-center lg:justify-start">
                  <CheckCircle className="w-4 h-4 text-gold-brand shrink-0" />
                  <span>QR कोडद्वारे पावतीची ऑनलाइन पडताळणी</span>
                </div>
                <div className="flex items-center gap-2 justify-center lg:justify-start">
                  <CheckCircle className="w-4 h-4 text-gold-brand shrink-0" />
                  <span>पारंपारिक मराठी/हिंदी पावती टेम्पलेट्स</span>
                </div>
                <div className="flex items-center gap-2 justify-center lg:justify-start">
                  <CheckCircle className="w-4 h-4 text-gold-brand shrink-0" />
                  <span>सर्व कार्यकर्त्यांचा एकाच डॅशबोर्डवर हिशोब</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                <Link
                  href="/request-demo"
                  className="w-full sm:w-auto bg-orange-brand hover:bg-orange-light text-white font-bold text-sm sm:text-base px-8 py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Request Free Demo</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>

                <a
                  href={generateDemoWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackWhatsAppClick("hero_whatsapp_primary")}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base px-6 py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span>Chat on WhatsApp ({displayPhone})</span>
                </a>
              </div>

              <div className="pt-2 flex items-center justify-center lg:justify-start gap-2 text-xs text-cream-brand/80">
                <QrCode className="w-3.5 h-3.5 text-gold-brand" />
                <span>Have a physical receipt to verify?</span>
                <Link href="/verify" className="text-gold-brand font-bold underline hover:text-white transition-colors">
                  Verify Receipt Online →
                </Link>
              </div>
            </div>

            {/* Right: Interactive Phone Preview Mockup */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="relative w-full max-w-[320px] aspect-[9/18.5] bg-neutral-950 rounded-[44px] p-2.5 shadow-2xl border-4 border-neutral-800 select-none flex flex-col">
                
                {/* Dynamic Island Notch */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-neutral-900 rounded-full z-30 flex items-center justify-between px-2">
                  <div className="w-2 h-2 rounded-full bg-neutral-800" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                {/* Inner Screen Canvas */}
                <div className="relative w-full h-full bg-cream-light rounded-[36px] overflow-hidden flex flex-col border border-neutral-700">
                  
                  {/* Top Status Bar */}
                  <div className="bg-maroon text-white pt-5 pb-1 px-4 flex justify-between items-center text-[8px] font-black shrink-0 border-b border-maroon-dark">
                    <span className="tracking-wider">9:41</span>
                    <div className="flex items-center gap-1.5 text-white/90">
                      <Wifi className="w-2.5 h-2.5" />
                      <span className="text-[7px]">5G</span>
                      <Battery className="w-3 h-3 text-emerald-400" />
                    </div>
                  </div>

                  {/* Top App Bar */}
                  <div className="bg-maroon text-white py-1.5 px-3 flex justify-between items-center text-[9px] font-bold shrink-0 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <Menu className="w-3.5 h-3.5 text-white cursor-pointer" />
                      <span className="font-black text-cream-brand tracking-wide text-[10px]">PavtiBook</span>
                    </div>
                    <span className="text-gold-brand text-[7.5px] font-bold devanagari">॥ श्री गणेश प्रसन्न ॥</span>
                    <div className="flex items-center gap-1.5">
                      <Bell className="w-3 h-3 text-white/80" />
                      <div className="w-4 h-4 rounded-full bg-gold-brand text-maroon font-black text-[7px] flex items-center justify-center shadow-xs">
                        RP
                      </div>
                    </div>
                  </div>

                  {/* Scrollable Screen Content */}
                  <div className="flex-1 p-2.5 overflow-y-auto no-scrollbar bg-cream-brand/10">
                    {renderMockScreen(screenshotTopics[activeScreenIndex].id)}
                  </div>

                  {/* Bottom Navigation Bar */}
                  <div className="bg-white border-t border-neutral-200 px-2 py-1 flex justify-around items-center shrink-0 shadow-xs">
                    {[
                      { icon: <HomeIcon className="w-3.5 h-3.5" />, label: "Home", id: "dashboard", idx: 2 },
                      { icon: <PlusCircle className="w-3.5 h-3.5" />, label: "Receipt", id: "receipt", idx: 0 },
                      { icon: <FileText className="w-3.5 h-3.5" />, label: "Voucher", id: "preview", idx: 1 },
                      { icon: <Users className="w-3.5 h-3.5" />, label: "Donors", id: "donors", idx: 3 },
                      { icon: <Clock className="w-3.5 h-3.5" />, label: "Pending", id: "pending", idx: 4 }
                    ].map((tab) => {
                      const isActive = activeScreenIndex === tab.idx;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveScreenIndex(tab.idx)}
                          className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
                            isActive ? "text-maroon font-black" : "text-neutral-400 font-medium"
                          }`}
                        >
                          {tab.icon}
                          <span className="text-[5.5px]">{tab.label}</span>
                          {isActive && <span className="w-1 h-1 rounded-full bg-maroon" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Bottom Home Indicator */}
                  <div className="h-2 w-full flex items-center justify-center bg-white shrink-0">
                    <div className="w-16 h-0.5 bg-neutral-300 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Screen Pills */}
              <div className="flex flex-wrap justify-center gap-1.5 mt-3 max-w-sm">
                {screenshotTopics.map((topic, idx) => (
                  <button
                    key={topic.id}
                    onClick={() => setActiveScreenIndex(idx)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                      activeScreenIndex === idx
                        ? "bg-gold-brand text-maroon-dark shadow-sm scale-105"
                        : "bg-white/15 text-cream-brand hover:bg-white/25"
                    }`}
                  >
                    {topic.subtitle}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. BEFORE VS AFTER */}
      <section className="py-16 md:py-20 bg-cream-brand/30 border-y border-maroon/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-brand/10 text-orange-brand text-xs font-bold uppercase tracking-wider">
              Traditional vs Digital
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-maroon-dark tracking-tight">
              कागदी पावत्यांचा त्रास संपवा — डिजिटल विश्वासाचा नवा अनुभव
            </h2>
            <p className="text-xs sm:text-base text-neutral-600 font-medium">
              पारंपारिक पावती पुस्तकांमधील चुका, पावत्या हरवणे आणि वार्षिक हिशोबातील ताण यावर PavtiBook चा आधुनिक उपाय.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-red-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-red-900">कागदी पावती पुस्तके (Paper Receipts)</h3>
                  <p className="text-xs text-red-600 font-semibold">हिशोबातील त्रुटी व वेळ वाया</p>
                </div>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-neutral-700">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold mt-0.5">✕</span>
                  <span>पावती पुस्तके पावसात भिजणे, हरवणे किंवा फाटण्याची भीती.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold mt-0.5">✕</span>
                  <span>देणगीदाराची माहिती, अक्षरी रक्कम लिहिण्यात कार्यकर्त्यांचा वेळ खर्च.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold mt-0.5">✕</span>
                  <span>उत्सवानंतर ५०-१०० पावती पुस्तकांचा ताळमेळ बसवताना हिशोबात घोळ.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold mt-0.5">✕</span>
                  <span>कोणी किती वर्गणी दिली याचा जुना रेकॉर्ड शोधणे अशक्य.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-emerald-200 shadow-sm space-y-4 ring-1 ring-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-emerald-950">PavtiBook डिजिटल प्रणाली (Digital)</h3>
                  <p className="text-xs text-emerald-700 font-semibold">१००% अचूक, सुरक्षित व पारदर्शक</p>
                </div>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-neutral-700">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                  <span>पावती थेट देणगीदाराच्या WhatsApp वर PDF स्वरूपात पोहोचते.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                  <span>मोबाईल नंबरवरून देणगीदाराचे नाव व पत्ता आपोआप भरले जाते.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                  <span>कॅश आणि UPI चा रिअल-टाइम हिशोब १-क्लिकमध्ये Excel/CSV स्वरूपात.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                  <span>QR कोडद्वारे पावती खरी असल्याची खात्री कोणीही करू शकते.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. DEDICATED QR VERIFICATION TRUST SECTION */}
      <section id="verification-trust" className="py-16 md:py-24 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-brand/30 text-maroon-dark text-xs font-bold uppercase tracking-wider">
              100% Anti-Fraud Protection
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-maroon-dark tracking-tight">
              Cryptographic QR Verification — पारदर्शकतेची १००% हमी
            </h2>
            <p className="text-xs sm:text-base text-neutral-600 font-medium">
              प्रत्येक पावतीवर अद्वितीय QR कोड असतो. कोणताही देणगीदार तो स्कॅन करून पावतीची खरी रक्कम व अधिकृतता तपासू शकतो.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "१",
                title: "पावती निर्मिती",
                desc: "कार्यकर्ता ॲपमध्ये पावती बनवतो, ज्यावर युनिक १६-अंकी टोकन आणि QR कोड आपोआप छापला जातो."
              },
              {
                step: "२",
                title: "WhatsApp वर वितरण",
                desc: "पावतीची अधिकृत PDF एका सेकंदात देणगीदाराच्या WhatsApp नंबरवर पोहोचते."
              },
              {
                step: "३",
                title: "मोबाईल कॅमेरा स्कॅन",
                desc: "देणगीदार किंवा समिती सदस्य कोणत्याही मोबाईल कॅमेऱ्याने किंवा Google Lens ने QR स्कॅन करतात."
              },
              {
                step: "४",
                title: "थेट सत्यता पडताळणी",
                desc: "वेबसाइटवर पावतीचा क्रमांक, खरी देणगी रक्कम, देणगीदाराचे नाव आणि ट्रस्टचा अधिकृत शिक्का दिसतो."
              }
            ].map((st, i) => (
              <div key={i} className="bg-cream-light p-6 rounded-3xl border border-maroon/10 space-y-3 text-center relative shadow-xs">
                <div className="w-10 h-10 rounded-2xl bg-maroon text-gold-brand font-black text-lg flex items-center justify-center mx-auto shadow-sm">
                  {st.step}
                </div>
                <h3 className="font-extrabold text-base text-maroon-dark">{st.title}</h3>
                <p className="text-xs text-neutral-600 font-medium leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-maroon/5 via-cream-brand/50 to-orange-brand/10 p-6 sm:p-8 rounded-3xl border border-maroon/15 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-black text-lg text-maroon-dark">
                तुमच्याकडे PavtiBook ची पावती आहे का?
              </h4>
              <p className="text-xs sm:text-sm text-neutral-600 font-medium">
                पावती नंबर टाकून किंवा कॅमेऱ्याने स्कॅन करून सत्यता पडताळून पहा.
              </p>
            </div>
            <Link
              href="/verify"
              className="bg-maroon hover:bg-maroon-light text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0"
            >
              <QrCode className="w-4 h-4" />
              <span>Verify Receipt Now</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. FEATURE ARCHITECTURE */}
      <section id="features" className="py-16 md:py-24 bg-cream-brand/20 scroll-mt-20 border-t border-maroon/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-brand/10 text-orange-brand text-xs font-bold uppercase tracking-wider">
              Product Capabilities
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-maroon-dark tracking-tight">
              भारतीय उत्सवांसाठी खास विकसित वैशिष्ट्ये
            </h2>
            <p className="text-xs sm:text-base text-neutral-600 font-medium">
              पारंपारिक संस्कृती आणि अत्याधुनिक तंत्रज्ञान यांचा मिलाफ.
            </p>
          </div>

          <div className="flex justify-center">
            <div className="flex flex-wrap justify-center gap-2 p-1.5 bg-white/80 rounded-2xl border border-maroon/10 shadow-xs">
              {[
                { id: "receipts", label: "डिजिटल पावत्या (Receipts)" },
                { id: "donors", label: "देणगीदार CRM (Donors)" },
                { id: "collections", label: "UPI व वर्गणी (Collections)" },
                { id: "management", label: "कार्यकर्ते व सुरक्षा (Team)" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFeatureTab(tab.id as "receipts" | "donors" | "collections" | "management")}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeFeatureTab === tab.id
                      ? "bg-maroon text-white shadow-md scale-105"
                      : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {activeFeatureTab === "receipts" && [
              { t: "Devanagari Sanskrit Headers", d: "Preset headers like '॥ श्री गणेश प्रसन्न ॥' and regional festival titles for cultural authenticity.", i: <FileText className="w-5 h-5 text-maroon" /> },
              { t: "Instant WhatsApp Sharing", d: "One-click share dialogue triggers WhatsApp with the formatted receipt PDF attached directly.", i: <Share2 className="w-5 h-5 text-emerald-600" /> },
              { t: "PDF & JPG Output", d: "Download high-resolution PDFs for printing or lightweight JPGs optimized for mobile messaging.", i: <FileDown className="w-5 h-5 text-orange-brand" /> },
              { t: "Deity Watermarks & Logos", d: "Upload custom trust logos, treasurer digital signatures, and optional deity background watermarks.", i: <Award className="w-5 h-5 text-gold-brand" /> }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-maroon/10 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                <div className="p-2.5 rounded-xl bg-cream-brand/60 w-fit">{item.i}</div>
                <h3 className="font-bold text-base text-maroon-dark">{item.t}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">{item.d}</p>
              </div>
            ))}

            {activeFeatureTab === "donors" && [
              { t: "Auto-Fill by Mobile Number", d: "Typing an existing donor's phone number instantly fills their name, address, and past donation history.", i: <Users className="w-5 h-5 text-maroon" /> },
              { t: "Lifetime Contribution History", d: "Track how much each donor contributed across previous festival years for personalized thanks.", i: <TrendingUp className="w-5 h-5 text-emerald-600" /> },
              { t: "VIP & Sponsor Filtering", d: "Segment major commercial sponsors from regular household vargani for targeted coordination.", i: <Award className="w-5 h-5 text-orange-brand" /> },
              { t: "One-Click CSV Export", d: "Export clean donor contact directories to Excel or CSV for festival invitations and AGM reporting.", i: <FileDown className="w-5 h-5 text-gold-brand" /> }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-maroon/10 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                <div className="p-2.5 rounded-xl bg-cream-brand/60 w-fit">{item.i}</div>
                <h3 className="font-bold text-base text-maroon-dark">{item.t}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">{item.d}</p>
              </div>
            ))}

            {activeFeatureTab === "collections" && [
              { t: "Direct UPI (Zero Commission)", d: "Generates P2P UPI QR codes. Payments land directly in trust's bank account with no middleman fees.", i: <Smartphone className="w-5 h-5 text-maroon" /> },
              { t: "Cash vs. UPI Realtime Split", d: "Dashboard automatically calculates cash in hand vs. digital bank deposits throughout collection drives.", i: <TrendingUp className="w-5 h-5 text-emerald-600" /> },
              { t: "Pending Vargani Reminders", d: "Schedule promised donations with target dates and dispatch friendly WhatsApp reminders in 1 click.", i: <Clock className="w-5 h-5 text-orange-brand" /> },
              { t: "Multi-Day Collection Charts", d: "View hourly and daily collection trends to allocate volunteers to high-density areas efficiently.", i: <Layers className="w-5 h-5 text-gold-brand" /> }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-maroon/10 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                <div className="p-2.5 rounded-xl bg-cream-brand/60 w-fit">{item.i}</div>
                <h3 className="font-bold text-base text-maroon-dark">{item.t}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">{item.d}</p>
              </div>
            ))}

            {activeFeatureTab === "management" && [
              { t: "Multi-Volunteer Logins", d: "Assign separate mobile accounts to volunteers. Every receipt records which volunteer accepted the money.", i: <UserCheck className="w-5 h-5 text-maroon" /> },
              { t: "Role-Based Permissions", d: "Presidents and Treasurers view full settings, while field collectors only generate and view their own receipts.", i: <Shield className="w-5 h-5 text-emerald-600" /> },
              { t: "Tamper-Proof Sequential Numbers", d: "System generates automated serials (e.g. PB-2026-000050) ensuring no duplicate or missing pages.", i: <ShieldCheck className="w-5 h-5 text-orange-brand" /> },
              { t: "Automatic Cloud Backup", d: "All records are securely encrypted and backed up continuously. Access from any phone or desktop browser.", i: <RefreshCw className="w-5 h-5 text-gold-brand" /> }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-maroon/10 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                <div className="p-2.5 rounded-xl bg-cream-brand/60 w-fit">{item.i}</div>
                <h3 className="font-bold text-base text-maroon-dark">{item.t}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>

          <div className="text-center pt-6">
            <Link
              href="/features"
              className="inline-flex items-center gap-1.5 text-maroon font-bold text-sm hover:text-orange-brand transition-colors"
            >
              <span>Explore all in-depth features on the Features page</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. APP SCREENSHOTS GALLERY (INSPECT THE APP INTERFACES) */}
      <section id="screenshots" className="py-16 md:py-24 bg-white scroll-mt-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: Screen Selectors & Explanations */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-brand/10 text-orange-brand text-xs font-bold uppercase tracking-wider">
                  Live App Previews (ॲपचे पडदे)
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-maroon-dark tracking-tight">
                  Inspect the App Interfaces
                </h2>
                <p className="text-sm sm:text-base text-neutral-600 font-medium leading-relaxed">
                  PavtiBook is optimized for ultra-fast operation in crowded festival pandals. Select any screen below to inspect the actual interface.
                </p>
              </div>

              {/* Screen Tab Buttons */}
              <div className="space-y-3">
                {screenshotTopics.map((topic, index) => {
                  const isSelected = galleryIndex === index;
                  return (
                    <button
                      key={topic.id}
                      onClick={() => setGalleryIndex(index)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-maroon/5 border-maroon shadow-sm ring-1 ring-maroon/20"
                          : "bg-white border-neutral-200 hover:border-maroon/30 hover:bg-cream-brand/20"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-bold ${isSelected ? "text-maroon" : "text-neutral-800"}`}>
                            {topic.title}
                          </h4>
                          <span className="text-xs text-orange-brand font-bold devanagari">
                            ({topic.subtitle})
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 font-medium">
                          {topic.desc}
                        </p>
                      </div>
                      <span className={`w-3 h-3 rounded-full shrink-0 ml-3 ${isSelected ? "bg-maroon" : "bg-neutral-300"}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Phone Mockup Canvas with Zoom Action */}
            <div className="lg:col-span-6 flex flex-col items-center gap-5">
              <div
                onClick={() => {
                  setLightboxIndex(galleryIndex);
                  setLightboxOpen(true);
                }}
                className="relative w-full max-w-[320px] aspect-[9/18.5] bg-neutral-950 rounded-[44px] p-2.5 shadow-2xl border-4 border-neutral-800 cursor-zoom-in hover:scale-[1.02] transition-all duration-300 group flex flex-col"
              >
                {/* Speaker Notch */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-neutral-900 rounded-full z-30 flex items-center justify-between px-2">
                  <div className="w-2 h-2 rounded-full bg-neutral-800" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                {/* Inner Phone Screen */}
                <div className="relative w-full h-full bg-cream-light rounded-[36px] overflow-hidden flex flex-col border border-neutral-700 select-none">
                  
                  {/* Status Bar */}
                  <div className="bg-maroon text-white pt-5 pb-1 px-4 flex justify-between items-center text-[8px] font-black shrink-0 border-b border-maroon-dark">
                    <span className="tracking-wider">9:41</span>
                    <div className="flex items-center gap-1.5 text-white/90">
                      <Wifi className="w-2.5 h-2.5" />
                      <span className="text-[7px]">5G</span>
                      <Battery className="w-3 h-3 text-emerald-400" />
                    </div>
                  </div>

                  {/* Top App Bar */}
                  <div className="bg-maroon text-white py-1.5 px-3 flex justify-between items-center text-[9px] font-bold shrink-0 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <Menu className="w-3.5 h-3.5 text-white" />
                      <span className="font-black text-cream-brand tracking-wide text-[10px]">PavtiBook</span>
                    </div>
                    <span className="text-gold-brand text-[7.5px] font-bold devanagari">॥ श्री गणेश प्रसन्न ॥</span>
                    <div className="flex items-center gap-1.5">
                      <Bell className="w-3 h-3 text-white/80" />
                      <div className="w-4 h-4 rounded-full bg-gold-brand text-maroon font-black text-[7px] flex items-center justify-center shadow-xs">
                        RP
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Rendered Content */}
                  <div className="flex-1 p-2.5 overflow-y-auto no-scrollbar bg-cream-brand/10">
                    {renderMockScreen(screenshotTopics[galleryIndex].id)}
                  </div>

                  {/* Bottom Navigation Bar */}
                  <div className="bg-white border-t border-neutral-200 px-2 py-1 flex justify-around items-center shrink-0 shadow-xs">
                    {[
                      { icon: <HomeIcon className="w-3.5 h-3.5" />, label: "Home", id: "dashboard", idx: 2 },
                      { icon: <PlusCircle className="w-3.5 h-3.5" />, label: "Receipt", id: "receipt", idx: 0 },
                      { icon: <FileText className="w-3.5 h-3.5" />, label: "Voucher", id: "preview", idx: 1 },
                      { icon: <Users className="w-3.5 h-3.5" />, label: "Donors", id: "donors", idx: 3 },
                      { icon: <Clock className="w-3.5 h-3.5" />, label: "Pending", id: "pending", idx: 4 }
                    ].map((tab) => {
                      const isActive = galleryIndex === tab.idx;
                      return (
                        <button
                          key={tab.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setGalleryIndex(tab.idx);
                          }}
                          className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
                            isActive ? "text-maroon font-black" : "text-neutral-400 font-medium"
                          }`}
                        >
                          {tab.icon}
                          <span className="text-[5.5px]">{tab.label}</span>
                          {isActive && <span className="w-1 h-1 rounded-full bg-maroon" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Phone Bottom Home Indicator */}
                  <div className="h-2 w-full flex items-center justify-center bg-white shrink-0">
                    <div className="w-16 h-0.5 bg-neutral-300 rounded-full" />
                  </div>
                </div>

                {/* Hover Zoom Overlay */}
                <div className="absolute inset-0 bg-maroon/20 opacity-0 group-hover:opacity-100 rounded-[44px] transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                  <div className="bg-white/95 text-maroon text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5" />
                    <span>Click to Zoom Preview</span>
                  </div>
                </div>
              </div>

              {/* Slide Indicators */}
              <div className="flex gap-2">
                {screenshotTopics.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setGalleryIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      galleryIndex === idx ? "w-7 bg-maroon" : "w-2 bg-neutral-300 hover:bg-neutral-400"
                    }`}
                    aria-label={`Go to screenshot ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS */}
      <section id="how-it-works" className="py-16 md:py-24 bg-cream-brand/20 scroll-mt-20 border-t border-maroon/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-brand/10 text-orange-brand text-xs font-bold uppercase tracking-wider">
              Simple 4-Step Process
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-maroon-dark tracking-tight">
              कसे कार्य करते PavtiBook?
            </h2>
            <p className="text-xs sm:text-base text-neutral-600 font-medium">
              अवघ्या २ मिनिटांत ॲप सुरू करा आणि पहिल्याच दिवसापासून पारदर्शक हिशोब ठेवा.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "१",
                title: "नोंदणी व मंडळ सेटअप",
                desc: "ॲप डाउनलोड करा, मंडळाचे नाव, लोगो आणि खजिनदारांची सही अपलोड करा."
              },
              {
                step: "२",
                title: "कार्यकर्ते जोडा",
                desc: "वर्गणी गोळा करणाऱ्या कार्यकर्त्यांचे स्वतंत्र मोबाईल नंबर जोडून त्यांना परवानग्या द्या."
              },
              {
                step: "३",
                title: "वर्गणी जमा व थेट पावती",
                desc: "देणगीदाराचा नंबर टाका, कॅश किंवा UPI द्वारे देणगी स्वीकारा आणि WhatsApp वर पावती पाठवा."
              },
              {
                step: "४",
                title: "१-क्लिक ऑडिट अहवाल",
                desc: "उत्सवाच्या कोणत्याही दिवशी एका क्लिकमध्ये संपूर्ण हिशोबाचा Excel/CSV अहवाल डाउनलोड करा."
              }
            ].map((st, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-maroon/10 space-y-3 text-center shadow-xs">
                <div className="w-10 h-10 rounded-2xl bg-orange-brand text-white font-black text-lg flex items-center justify-center mx-auto shadow-sm">
                  {st.step}
                </div>
                <h3 className="font-extrabold text-base text-maroon-dark">{st.title}</h3>
                <p className="text-xs text-neutral-600 font-medium leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. PRICING */}
      <section id="pricing" className="py-16 md:py-24 bg-white scroll-mt-20 border-t border-maroon/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-brand/30 text-maroon-dark text-xs font-bold uppercase tracking-wider">
              Transparent Pricing
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-maroon-dark tracking-tight">
              पारदर्शक आणि परवडणारे दर
            </h2>
            <p className="text-xs sm:text-base text-neutral-600 font-medium">
              कोणतीही छुपी फी नाही. शून्य टक्के कमिशन.
            </p>
          </div>

          <div className="flex justify-center items-center gap-3">
            <span className={`text-xs sm:text-sm font-bold ${billingPeriod === "monthly" ? "text-maroon" : "text-neutral-500"}`}>
              Monthly (मासिक)
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "yearly" : "monthly")}
              className="w-12 h-6 bg-maroon rounded-full p-1 transition-colors relative cursor-pointer"
              aria-label="Toggle billing frequency"
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  billingPeriod === "yearly" ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-xs sm:text-sm font-bold ${billingPeriod === "yearly" ? "text-maroon" : "text-neutral-500"}`}>
              Yearly (वार्षिक) <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full ml-1">Save ~16%</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-cream-light p-8 rounded-3xl border border-maroon/15 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black text-maroon-dark">Professional</h3>
                    <p className="text-xs text-neutral-600 font-medium">लहान व मध्यम मंडळे आणि समित्यांसाठी</p>
                  </div>
                  <span className="bg-maroon/10 text-maroon font-bold text-xs px-2.5 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-maroon-dark">
                    {billingPeriod === "monthly" ? "₹99" : "₹999"}
                  </span>
                  <span className="text-xs text-neutral-500 font-medium">
                    /{billingPeriod === "monthly" ? "month" : "year"}
                  </span>
                </div>

                <ul className="space-y-2.5 text-xs text-neutral-700 font-medium pt-2 border-t border-maroon/10">
                  <li className="flex items-center gap-2">✓ अमर्यादित डिजिटल पावत्या (Unlimited Receipts)</li>
                  <li className="flex items-center gap-2">✓ देणगीदारांच्या WhatsApp वर PDF पाठवा</li>
                  <li className="flex items-center gap-2">✓ QR कोडद्वारे सत्यता पडताळणी</li>
                  <li className="flex items-center gap-2">✓ डायरेक्ट UPI QR कोड (0% कमिशन)</li>
                  <li className="flex items-center gap-2">✓ देणगीदार डिरेक्टरी आणि सर्च</li>
                  <li className="flex items-center gap-2">✓ Excel / CSV अहवाल डाउनलोड</li>
                </ul>
              </div>

              <Link
                href="/request-demo"
                className="w-full bg-maroon hover:bg-maroon-light text-white font-bold text-xs sm:text-sm py-3 rounded-xl shadow-md transition-all text-center block"
              >
                Choose Professional
              </Link>
            </div>

            <div className="bg-white p-8 rounded-3xl border-2 border-orange-brand shadow-lg space-y-6 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-orange-brand text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl">
                Advanced Multi-Team
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-black text-maroon-dark">Premium</h3>
                  <p className="text-xs text-neutral-600 font-medium">मोठी गणेश मंडळे, विश्वस्त ट्रस्ट आणि संस्था</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-maroon-dark">
                    {billingPeriod === "monthly" ? "₹199" : "₹1,999"}
                  </span>
                  <span className="text-xs text-neutral-500 font-medium">
                    /{billingPeriod === "monthly" ? "month" : "year"}
                  </span>
                </div>

                <ul className="space-y-2.5 text-xs text-neutral-700 font-medium pt-2 border-t border-neutral-100">
                  <li className="flex items-center gap-2 font-bold text-neutral-900">✓ Professional मधील सर्व वैशिष्ट्ये</li>
                  <li className="flex items-center gap-2">✓ अमर्यादित कार्यकर्ते लॉग इन (Multi-User)</li>
                  <li className="flex items-center gap-2">✓ प्रलंबित वर्गणी व्यवस्थापन व रिमाइंडर्स</li>
                  <li className="flex items-center gap-2">✓ ऑटो WhatsApp सेंड (दरमहा १,००० संदेश)</li>
                  <li className="flex items-center gap-2">✓ प्रायोरिटी व्हॉट्सॲप व फोन सपोर्ट</li>
                  <li className="flex items-center gap-2">✓ कस्टम ट्रस्ट ब्रँडिंग व सही वॉटरमार्क</li>
                </ul>
              </div>

              <Link
                href="/request-demo"
                className="w-full bg-orange-brand hover:bg-orange-light text-white font-bold text-xs sm:text-sm py-3 rounded-xl shadow-md transition-all text-center block"
              >
                Choose Premium
              </Link>
            </div>
          </div>

          <div className="text-center pt-2">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 text-maroon font-bold text-sm hover:text-orange-brand transition-colors"
            >
              <span>See full pricing feature matrix & interactive UPI simulator</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 8. FAQ ACCORDION */}
      <section id="faq" className="py-16 md:py-24 bg-cream-light scroll-mt-20 border-t border-maroon/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-brand/10 text-orange-brand text-xs font-bold uppercase tracking-wider">
              Frequently Asked Questions
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-maroon-dark tracking-tight">
              नेहमी विचारले जाणारे प्रश्न (FAQ)
            </h2>
            <p className="text-xs sm:text-base text-neutral-600 font-medium">
              तुमच्या मनातील सर्व प्रश्नांची उत्तरे येथे मिळतील.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-maroon/10 overflow-hidden shadow-xs transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left p-4 sm:p-5 flex justify-between items-center gap-4 cursor-pointer"
                  >
                    <span className="font-extrabold text-xs sm:text-sm text-neutral-900 leading-snug">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-maroon shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-neutral-600 font-medium leading-relaxed border-t border-neutral-100 pt-3 animate-in fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. BOTTOM DEMO & WHATSAPP CTA */}
      <section className="py-16 md:py-20 bg-maroon text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-brand/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gold-brand/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative space-y-6">
          <h2 className="text-3xl md:text-5xl font-black text-cream-brand leading-tight">
            Ready to Digitize Your Collections?
          </h2>
          <p className="text-sm md:text-lg text-cream-brand/85 max-w-2xl mx-auto font-medium">
            Join hundreds of Ganesh Mandals, Temple Trusts, and NGOs across Maharashtra and India. Schedule a free demo call with our support specialists.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/request-demo"
              className="w-full sm:w-auto bg-orange-brand hover:bg-orange-light text-white font-bold text-sm sm:text-base px-8 py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group"
            >
              <span>Book Free Demo</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>

            <a
              href={generateDemoWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick("bottom_banner_whatsapp")}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base px-7 py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>WhatsApp: {displayPhone}</span>
            </a>
          </div>
        </div>
      </section>

      {/* LIGHTBOX MODAL PREVIEW */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 bg-white/15 hover:bg-white/25 text-white rounded-full p-2.5 transition-colors cursor-pointer"
            aria-label="Close Preview"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="relative bg-white rounded-3xl overflow-hidden max-w-3xl w-full grid grid-cols-1 md:grid-cols-12 shadow-2xl border border-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="md:col-span-6 bg-neutral-950 p-6 flex flex-col items-center justify-center min-h-[440px]">
              <div className="relative w-full max-w-[260px] aspect-[9/18.5] bg-neutral-900 rounded-[38px] p-2 shadow-xl border-4 border-neutral-800">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-neutral-900 rounded-full z-20 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-neutral-800 ml-auto mr-2" />
                </div>

                <div className="relative w-full h-full bg-cream-light rounded-[30px] overflow-hidden flex flex-col border border-neutral-700">
                  <div className="bg-maroon text-white pt-4 pb-1.5 px-3 flex justify-between items-center text-[7.5px] font-bold shrink-0">
                    <span>PavtiBook</span>
                    <div className="flex items-center gap-0.5">
                      <Smartphone className="w-2 h-2" />
                      <span>॥ श्री गणेश प्रसन्न ॥</span>
                    </div>
                  </div>

                  <div className="flex-1 p-2.5 overflow-y-auto no-scrollbar bg-cream-brand/10 select-none">
                    {renderMockScreen(screenshotTopics[lightboxIndex].id)}
                  </div>
                  
                  <div className="h-3 w-full flex items-center justify-center bg-white shrink-0">
                    <div className="w-14 h-0.5 bg-neutral-300 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between bg-cream-brand/20">
              <div className="space-y-4">
                <span className="text-[10px] bg-maroon/10 text-maroon font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Interface Preview {lightboxIndex + 1} of {screenshotTopics.length}
                </span>
                
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-maroon-dark">
                    {screenshotTopics[lightboxIndex].title}
                  </h3>
                  <p className="text-xs text-orange-brand font-bold uppercase tracking-wider mt-0.5">
                    {screenshotTopics[lightboxIndex].subtitle}
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-medium">
                  {screenshotTopics[lightboxIndex].desc}
                </p>

                <div className="bg-white p-4 rounded-xl border border-maroon/10 space-y-2 text-xs text-neutral-700 font-semibold shadow-xs">
                  <p className="text-neutral-500 font-bold">Key Benefits (महत्त्वाचे फायदे):</p>
                  <ul className="space-y-1 text-neutral-600 font-medium">
                    <li className="flex items-center gap-1.5">✓ Ultra-fast mobile workflow for field volunteers</li>
                    <li className="flex items-center gap-1.5">✓ Zero manual calculation errors</li>
                    <li className="flex items-center gap-1.5">✓ Automated backup to secure encrypted database</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-neutral-200 mt-6">
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setLightboxIndex(
                        (lightboxIndex - 1 + screenshotTopics.length) % screenshotTopics.length
                      )
                    }
                    className="bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 p-2 rounded-lg transition-colors cursor-pointer"
                    aria-label="Previous screenshot"
                  >
                    ←
                  </button>
                  <button
                    onClick={() =>
                      setLightboxIndex((lightboxIndex + 1) % screenshotTopics.length)
                    }
                    className="bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 p-2 rounded-lg transition-colors cursor-pointer"
                    aria-label="Next screenshot"
                  >
                    →
                  </button>
                </div>

                <button
                  onClick={() => setLightboxOpen(false)}
                  className="bg-maroon hover:bg-maroon-light text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
