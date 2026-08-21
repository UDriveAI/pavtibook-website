"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight, QrCode, MessageSquare } from "lucide-react";
import { generateDemoWhatsAppLink } from "@/lib/whatsapp";
import { trackWhatsAppClick } from "@/lib/analytics";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    const checkBanner = () => {
      const isDismissed = localStorage.getItem("pavtibook_banner_dismissed");
      setBannerVisible(!isDismissed);
    };

    checkBanner();
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("promo_banner_toggled", checkBanner);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("promo_banner_toggled", checkBanner);
    };
  }, []);

  const navLinks = [
    { name: "Features", href: "/features" },
    { name: "How It Works", href: "/#how-it-works" },
    { name: "QR Verification", href: "/#qr-verification" },
    { name: "Pricing", href: "/pricing" },
    { name: "FAQ", href: "/#faq" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <header
      className={`fixed left-0 right-0 z-50 transition-all duration-300 ${
        bannerVisible ? "top-[40px] sm:top-[44px]" : "top-0"
      } ${
        isScrolled
          ? "bg-cream-brand/95 backdrop-blur-md shadow-[0_8px_24px_rgba(139,30,45,0.08)] py-2.5 border-b border-maroon/10"
          : "bg-cream-brand/90 backdrop-blur-sm py-3.5 border-b border-maroon/5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/images/Pavati-Book-Logo.png"
              alt="PavtiBook Logo"
              width={180}
              height={48}
              priority
              className="h-10 sm:h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
            />
            <span className="sr-only">PavtiBook - Digital Receipts for Mandals and Trusts</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7">
            {navLinks.map((link) => {
              const isAnchor = link.href.includes("#");
              const isActive = !isAnchor && pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-semibold transition-colors duration-200 ${
                    isActive
                      ? "text-orange-brand font-bold"
                      : "text-neutral-700 hover:text-maroon"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/verify"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-maroon hover:bg-maroon/5 border border-maroon/15 transition-colors duration-200"
            >
              <QrCode className="w-4 h-4 text-maroon" />
              <span>Verify Receipt</span>
            </Link>

            <Link
              href="/request-demo"
              className="inline-flex items-center gap-1.5 bg-maroon hover:bg-maroon-light text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all duration-200 group"
            >
              <span>Request Free Demo</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Mobile Menu Hamburger */}
          <div className="lg:hidden flex items-center gap-2">
            <Link
              href="/verify"
              className="p-1.5 text-maroon hover:bg-maroon/5 rounded-md"
              aria-label="Verify Receipt"
            >
              <QrCode className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-maroon p-2 rounded-lg hover:bg-maroon/5 focus:outline-none transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isOpen && (
        <div className="lg:hidden bg-cream-brand border-b border-maroon/10 animate-in fade-in slide-in-from-top-4 duration-200 shadow-xl">
          <div className="px-5 pt-3 pb-6 space-y-3">
            <div className="space-y-1">
              {navLinks.map((link) => {
                const isAnchor = link.href.includes("#");
                const isActive = !isAnchor && pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`block py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-maroon/10 text-orange-brand font-bold"
                        : "text-neutral-800 hover:bg-maroon/5 hover:text-maroon"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>

            <hr className="border-maroon/10 my-3" />

            <div className="space-y-2.5 pt-1">
              <Link
                href="/request-demo"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-maroon text-white text-sm font-bold shadow-md"
              >
                <span>Request Free Demo</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href={generateDemoWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  trackWhatsAppClick("mobile_nav");
                  setIsOpen(false);
                }}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-emerald-600/30 text-emerald-700 bg-emerald-50/60 text-sm font-bold"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Chat on WhatsApp</span>
              </a>

              <Link
                href="/verify"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-maroon/20 text-maroon text-xs font-bold hover:bg-maroon/5"
              >
                <QrCode className="w-4 h-4" />
                <span>Verify a Receipt Online</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
