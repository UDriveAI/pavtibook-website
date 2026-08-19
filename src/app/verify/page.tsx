"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function VerifySearchPage() {
  const [tokenId, setTokenId] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const router = useRouter();
  const html5QrCodeRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  const handleNavigate = (rawId: string) => {
    let clean = rawId.trim();
    if (!clean) return;

    // Handle full URLs pasted or scanned
    if (clean.includes("/verify/")) {
      clean = clean.split("/verify/")[1].split("?")[0].split("#")[0];
    } else if (clean.includes("/v/")) {
      clean = clean.split("/v/")[1].split("?")[0].split("#")[0];
    } else if (clean.includes("/receipt/")) {
      clean = clean.split("/receipt/")[1].split("?")[0].split("#")[0];
    }

    if (clean) {
      router.push(`/verify/${encodeURIComponent(clean)}`);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleNavigate(tokenId);
  };

  const startScanner = async () => {
    setScanError(null);
    setIsScanning(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const qrScanner = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = qrScanner;

      const config = { fps: 10, qrbox: { width: 240, height: 240 } };

      await qrScanner.start(
        { facingMode: "environment" },
        config,
        (decodedText: string) => {
          stopScanner();
          handleNavigate(decodedText);
        },
        () => {
          // ignore frame errors
        }
      );
    } catch (err: unknown) {
      console.error("Camera scanner error:", err);
      setScanError("कॅमेरा सुरू करता आला नाही. कृपया ब्राऊझरला कॅमेरा परवानगी (Allow Camera) द्या किंवा खाली पावती नंबर टाईप करा.");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn("Scanner stop warning:", e);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(160deg, #FFF6E8 0%, #FFFBF5 60%, #FFF0D8 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "24px 16px 48px",
        fontFamily: "var(--font-sans, Poppins, sans-serif)",
      }}
    >
      {/* Brand Header */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <a
          href="https://pavtibook.online"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "10px" }}
        >
          <img
            src="/images/Pavati-Book-LogoIcon.png"
            alt="PavtiBook Logo"
            width={44}
            height={44}
            style={{ borderRadius: "10px" }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          <span
            style={{
              fontSize: "24px",
              fontWeight: 800,
              color: "#8B1E2D",
              letterSpacing: "-0.02em",
            }}
          >
            PavtiBook
          </span>
        </a>
        <p
          style={{
            fontSize: "13px",
            color: "#777",
            margin: "4px 0 0",
            fontWeight: 500,
          }}
        >
          Official Digital Receipt Verification
        </p>
      </div>

      {/* Main Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#FFFFFF",
          borderRadius: "18px",
          boxShadow: "0 8px 32px rgba(139, 30, 45, 0.08), 0 2px 8px rgba(0,0,0,0.03)",
          border: "1px solid rgba(139, 30, 45, 0.12)",
          padding: "24px 20px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#1A1A1A",
            margin: "0 0 6px",
            letterSpacing: "-0.01em",
          }}
        >
          पावती पडताळणी (Receipt Verification)
        </h1>

        <p
          style={{
            fontSize: "13px",
            color: "#666",
            lineHeight: 1.5,
            margin: "0 0 18px",
          }}
        >
          कॅमेऱ्याने QR स्कॅन करा किंवा पावती नंबर टाकून सत्यता तपासा.
        </p>

        {/* 📷 Live Camera QR Scanner Viewport */}
        {isScanning ? (
          <div style={{ marginBottom: "20px" }}>
            <div
              id="qr-reader"
              style={{
                width: "100%",
                borderRadius: "12px",
                overflow: "hidden",
                border: "2px solid #8B1E2D",
              }}
            />
            <button
              onClick={stopScanner}
              style={{
                marginTop: "12px",
                background: "#C62828",
                color: "#FFF",
                border: "none",
                borderRadius: "8px",
                padding: "8px 18px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ✕ कॅमेरा बंद करा (Cancel Camera)
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: "20px" }}>
            <button
              onClick={startScanner}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #2E7D6B 0%, #1B5E50 100%)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "12px",
                padding: "14px 20px",
                fontSize: "15px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                boxShadow: "0 4px 14px rgba(46, 125, 107, 0.25)",
                transition: "transform 0.1s ease",
              }}
            >
              <span style={{ fontSize: "20px" }}>📷</span>
              <span>कॅमेऱ्याने QR स्कॅन करा (Scan with Camera)</span>
            </button>
          </div>
        )}

        {scanError && (
          <div
            style={{
              padding: "10px 14px",
              background: "#FFEBEE",
              color: "#C62828",
              borderRadius: "8px",
              fontSize: "12px",
              marginBottom: "16px",
              textAlign: "left",
            }}
          >
            ⚠️ {scanError}
          </div>
        )}

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            margin: "18px 0",
            gap: "10px",
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "#E0E0E0" }} />
          <span style={{ fontSize: "12px", color: "#999", fontWeight: 600 }}>किंवा (OR)</span>
          <div style={{ flex: 1, height: "1px", background: "#E0E0E0" }} />
        </div>

        {/* Manual Input Form */}
        <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            type="text"
            placeholder="उदा. PB-2026-000050 किंवा टोकन"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 16px",
              fontSize: "14px",
              border: "1.5px solid #E0E0E0",
              borderRadius: "10px",
              outline: "none",
              textAlign: "center",
              fontWeight: 600,
              color: "#1A1A1A",
            }}
          />

          <button
            type="submit"
            disabled={!tokenId.trim()}
            style={{
              background: "#8B1E2D",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "10px",
              padding: "12px 20px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: tokenId.trim() ? "pointer" : "not-allowed",
              opacity: tokenId.trim() ? 1 : 0.6,
              transition: "background 0.2s ease",
            }}
          >
            पावती तपासा (Verify Receipt)
          </button>
        </form>

        <div
          style={{
            marginTop: "18px",
            padding: "10px 14px",
            background: "#FFF8E1",
            borderRadius: "8px",
            border: "1px solid #FFE082",
            fontSize: "11.5px",
            color: "#795548",
            lineHeight: "1.4",
            textAlign: "left",
          }}
        >
          💡 <strong>माहिती:</strong> मोबाईल कॅमेऱ्याने पावतीचा QR कोड स्कॅन केल्यास थेट पावती उघडते.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "28px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "12px", color: "#AAA", margin: "0 0 4px" }}>
          Powered by
        </p>
        <a
          href="https://pavtibook.online"
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#8B1E2D",
            textDecoration: "none",
          }}
        >
          PavtiBook
        </a>
        <p style={{ fontSize: "11px", color: "#CCC", marginTop: "4px" }}>
          Digital Receipt & Collection Management System
        </p>
      </div>
    </main>
  );
}
