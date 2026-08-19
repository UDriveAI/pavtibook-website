"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifySearchPage() {
  const [tokenId, setTokenId] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tokenId.trim();
    if (!clean) return;
    router.push(`/verify/${encodeURIComponent(clean)}`);
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(160deg, #FFF6E8 0%, #FFFBF5 60%, #FFF0D8 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "32px 16px 48px",
        fontFamily: "var(--font-sans, Poppins, sans-serif)",
      }}
    >
      {/* Brand Header */}
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
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

      {/* Main Search Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#FFFFFF",
          borderRadius: "18px",
          boxShadow: "0 8px 32px rgba(139, 30, 45, 0.08), 0 2px 8px rgba(0,0,0,0.03)",
          border: "1px solid rgba(139, 30, 45, 0.12)",
          padding: "28px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "rgba(139, 30, 45, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: "26px",
          }}
        >
          🔍
        </div>

        <h1
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#1A1A1A",
            margin: "0 0 8px",
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
            margin: "0 0 20px",
          }}
        >
          पावती नंबर किंवा QR टोकन टाकून पावतीची सत्यता (Authenticity) तपासा.
          <br />
          <span style={{ fontSize: "12px", color: "#888" }}>
            (Enter Receipt Number or Token to verify the receipt.)
          </span>
        </p>

        <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            type="text"
            required
            placeholder="उदा. PB-2026-000050 किंवा QR टोकन"
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
            marginTop: "20px",
            padding: "10px 14px",
            background: "#FFF8E1",
            borderRadius: "8px",
            border: "1px solid #FFE082",
            fontSize: "11.5px",
            color: "#795548",
            lineHeight: 1.4,
          }}
        >
          💡 <strong>टीप:</strong> पावतीवरील QR कोड स्कॅन केल्यास पावती आपोआप उघडते.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "32px",
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
