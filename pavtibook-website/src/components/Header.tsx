"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight, Smartphone } from "lucide-react";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
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
    { name: "Pricing", href: "/pricing" },
    { name: "Contact", href: "/contact" },
    { name: "Download", href: "/download" },
  ];

  return (
    <header
      className={`fixed left-0 right-0 z-50 transition-all duration-300 ${
        bannerVisible ? "top-[40px] sm:top-[44px]" : "top-0"
      } ${
        isScrolled
          ? "bg-cream-brand/95 backdrop-blur-md shadow-md py-3 border-b border-maroon/10"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src={isScrolled ? "/images/Pavati-Book-Logo.png" : "/images/Pavati-Book-Logo-White-Orange.png"}
              alt="PavtiBook Logo"
              width={180}
              height={48}
              priority
              className="h-10 sm:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <span className="sr-only">PavtiBook</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-semibold transition-colors duration-200 ${
                    isScrolled
                      ? isActive
                        ? "text-maroon font-bold"
                        : "text-neutral-700 hover:text-orange-brand"
                      : isActive
                        ? "text-gold-brand font-bold"
                        : "text-white/90 hover:text-gold-brand"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/download"
              className={`flex items-center gap-1.5 text-sm font-semibold transition-colors duration-200 ${
                isScrolled
                  ? "text-maroon hover:text-orange-brand"
                  : "text-white/90 hover:text-gold-brand"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Download App</span>
            </Link>
            <Link
              href="/request-demo"
              className={`text-sm font-bold px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 group ${
                isScrolled
                  ? "bg-maroon hover:bg-maroon-light text-white"
                  : "bg-gold-brand hover:bg-gold-light text-maroon-dark"
              }`}
            >
              <span>Request Free Demo</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`p-1.5 rounded-lg focus:outline-none transition-colors duration-200 ${
                isScrolled
                  ? "text-neutral-700 hover:text-maroon hover:bg-maroon/5"
                  : "text-white/90 hover:text-gold-brand hover:bg-white/10"
              }`}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-cream-brand border-b border-maroon/10 animate-in fade-in slide-in-from-top-5 duration-200">
          <div className="px-4 pt-2 pb-6 space-y-3">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`block py-2.5 px-3 rounded-lg text-base font-semibold transition-colors duration-200 ${
                    isActive
                      ? "bg-maroon/10 text-maroon"
                      : "text-neutral-700 hover:bg-maroon/5 hover:text-maroon"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            <hr className="border-maroon/10 my-3" />
            <div className="space-y-3 px-3">
              <Link
                href="/download"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-maroon/20 text-maroon font-semibold hover:bg-maroon/5 transition-colors duration-200"
              >
                <Smartphone className="w-4 h-4" />
                <span>Download App</span>
              </Link>
              <Link
                href="/request-demo"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-maroon text-white font-bold hover:bg-maroon-light shadow-md transition-colors duration-200"
              >
                <span>Request Free Demo</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
