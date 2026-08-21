"use client";

import React, { useState } from "react";

interface VerificationResult {
  isValid: boolean;
  receiptNumber?: string;
  donorName?: string;
  donorMobile?: string;
  amount?: number;
  purpose?: string;
  paymentMode?: string;
  paymentStatus?: string;
  date?: string;
  organizationName?: string;
  organizationType?: string;
  isOrganizationVerified?: boolean;
  message?: string;
  error?: boolean;
}

interface Props {
  token: string;
  result: VerificationResult;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function formatAmount(amount?: number): string {
  if (amount === undefined || amount === null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPaymentMode(mode?: string): string {
  if (!mode) return "—";
  const map: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    cheque: "Cheque",
    online: "Online",
    card: "Card",
    bank_transfer: "Bank Transfer",
  };
  return map[mode.toLowerCase()] ?? mode;
}

function formatPaymentStatus(status?: string): string {
  if (!status) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "10px 0",
        borderBottom: "1px solid rgba(139, 30, 45, 0.08)",
        gap: "12px",
      }}
    >
      <span
        style={{
          fontSize: "13px",
          color: "#6B6B6B",
          fontWeight: 500,
          flexShrink: 0,
          minWidth: "110px",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "14px",
          color: "#1A1A1A",
          fontWeight: 600,
          textAlign: "right",
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function VerifyPage({ token, result }: Props) {
  const isValid = result.isValid === true;
  const isError = result.error === true;

  // Feedback state
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackMobile, setFeedbackMobile] = useState("");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackComment.trim()) return;

    setIsSubmitting(true);
    // Log & simulate record
    try {
      const feedbackPayload = {
        token,
        receiptNumber: result.receiptNumber,
        name: feedbackName,
        mobile: feedbackMobile,
        comment: feedbackComment,
        timestamp: new Date().toISOString(),
      };
      console.log("User Verification Feedback:", feedbackPayload);
      if (typeof window !== "undefined") {
        const stored = JSON.parse(localStorage.getItem("pb_verification_feedback") || "[]");
        stored.push(feedbackPayload);
        localStorage.setItem("pb_verification_feedback", JSON.stringify(stored));
      }
    } catch {
      // ignore
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFeedbackComment("");
    }, 600);
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
        padding: "20px 16px 48px",
        fontFamily: "var(--font-sans, Poppins, sans-serif)",
      }}
    >
      {/* Brand Header */}
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <a
          href="https://pavtibook.online"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          <img
            src="/images/Pavati-Book-LogoIcon.png"
            alt="PavtiBook Logo"
            width={38}
            height={38}
            style={{ borderRadius: "8px" }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          <span
            style={{
              fontSize: "20px",
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
            fontSize: "12px",
            color: "#888",
            margin: "3px 0 0",
            fontWeight: 500,
          }}
        >
          Official Receipt Verification
        </p>
      </div>

      {/* ⚠️ Under Development / Beta Disclaimer Note */}
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#FFF8E1",
          border: "1.5px solid #FFE082",
          borderRadius: "12px",
          padding: "12px 14px",
          marginBottom: "16px",
          boxShadow: "0 2px 8px rgba(255, 179, 0, 0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <span style={{ fontSize: "18px", flexShrink: 0 }}>⚙️</span>
          <div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#B78103",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>Beta / Under Active Development</span>
              <span
                style={{
                  background: "#FF8F00",
                  color: "#fff",
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "10px",
                  textTransform: "uppercase",
                }}
              >
                In Progress
              </span>
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "#6D4C41",
                margin: "4px 0 0",
                lineHeight: "1.45",
              }}
            >
              <strong>सूचना:</strong> ही ऑनलाइन पावती पडताळणी प्रणाली सध्या डेव्हलपमेंट आणि टेस्टिंग मोडमध्ये (Beta) आहे. डेटा स्थलांतर (Migration) चालू असल्यामुळे यावरील माहिती तात्पुरती किंवा सॅम्पल स्वरूपातील असू शकते.
            </p>
            <p
              style={{
                fontSize: "11px",
                color: "#8D6E63",
                margin: "4px 0 0",
                lineHeight: "1.4",
              }}
            >
              <em>(Note: This verification feature is currently under active progress. Displayed values may be temporary sample data.)</em>
            </p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#FFFFFF",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(139, 30, 45, 0.10), 0 2px 8px rgba(0,0,0,0.04)",
          border: "1px solid rgba(139, 30, 45, 0.10)",
          overflow: "hidden",
        }}
      >
        {/* Status Header Banner */}
        <div
          style={{
            background: isValid
              ? "linear-gradient(135deg, #2E7D6B 0%, #1B5E50 100%)"
              : isError
              ? "linear-gradient(135deg, #C62828 0%, #8E0000 100%)"
              : "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
            color: "#FFFFFF",
            padding: "24px 20px 20px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
              fontSize: "26px",
              backdropFilter: "blur(4px)",
            }}
          >
            {isValid ? "✓" : isError ? "✕" : "!"}
          </div>
          <h1
            style={{
              fontSize: "19px",
              fontWeight: 700,
              margin: "0 0 4px",
              letterSpacing: "-0.01em",
            }}
          >
            {isValid
              ? "Receipt Verified (पडताळणी पूर्ण)"
              : isError
              ? "Verification Error"
              : "Invalid Receipt"}
          </h1>
          <p
            style={{
              fontSize: "12.5px",
              color: "rgba(255,255,255,0.88)",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {isValid
              ? "This receipt is authentic and registered in PavtiBook."
              : isError
              ? "Verification service is temporarily unavailable. Please try again."
              : "This receipt token could not be found in the PavtiBook registry."}
          </p>
        </div>

        {/* Receipt Details (valid only) */}
        {isValid && (
          <div style={{ padding: "20px 24px 24px" }}>
            {/* Organization badge */}
            <div
              style={{
                background: "#FFF6E8",
                border: "1px solid rgba(139, 30, 45, 0.12)",
                borderRadius: "10px",
                padding: "12px 16px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "20px" }}>🏛️</span>
              <div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#8B1E2D",
                    lineHeight: 1.3,
                  }}
                >
                  {result.organizationName ?? "—"}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#888",
                    marginTop: "2px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  {result.organizationType ?? ""}
                  {result.isOrganizationVerified && (
                    <span
                      style={{
                        background: "#2E7D6B",
                        color: "#fff",
                        fontSize: "10px",
                        fontWeight: 600,
                        borderRadius: "4px",
                        padding: "1px 6px",
                      }}
                    >
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Amount spotlight */}
            <div
              style={{
                textAlign: "center",
                padding: "14px 0",
                marginBottom: "14px",
                borderBottom: "2px dashed rgba(139, 30, 45, 0.12)",
              }}
            >
              <div style={{ fontSize: "12px", color: "#888", fontWeight: 500 }}>
                Amount (देणगी रक्कम)
              </div>
              <div
                style={{
                  fontSize: "30px",
                  fontWeight: 800,
                  color: "#1A1A1A",
                  letterSpacing: "-0.02em",
                  marginTop: "2px",
                }}
              >
                {formatAmount(result.amount)}
              </div>
            </div>

            {/* Receipt Details */}
            <div>
              <DetailRow label="Receipt No. (पावती क्र.)" value={result.receiptNumber ?? "—"} />
              <DetailRow label="Donor (देणगीदार)" value={result.donorName ?? "—"} />
              <DetailRow label="Purpose (कारण)" value={result.purpose ?? "—"} />
              <DetailRow
                label="Payment (पेमेंट)"
                value={`${formatPaymentMode(result.paymentMode)} · ${formatPaymentStatus(result.paymentStatus)}`}
              />
              <DetailRow label="Date (तारीख)" value={formatDate(result.date)} />
            </div>

            {/* Verified seal */}
            <div
              style={{
                marginTop: "18px",
                padding: "10px 14px",
                background: "rgba(46, 125, 107, 0.06)",
                borderRadius: "10px",
                border: "1px solid rgba(46, 125, 107, 0.2)",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "#2E7D6B",
                  fontWeight: 600,
                }}
              >
                🔒 {result.message}
              </span>
            </div>
          </div>
        )}

        {/* Invalid state footer */}
        {!isValid && !isError && (
          <div
            style={{
              padding: "24px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "#888",
                lineHeight: 1.6,
                margin: "0 0 8px",
              }}
            >
              Token scanned:{" "}
              <code
                style={{
                  background: "#F5F5F5",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  wordBreak: "break-all",
                }}
              >
                {token}
              </code>
            </p>
            <p style={{ fontSize: "12px", color: "#AAA", margin: 0 }}>
              If you believe this is an error, contact the issuing organization.
            </p>
          </div>
        )}
      </div>

      {/* 💬 Interactive Feedback / Comment Form Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#FFFFFF",
          borderRadius: "14px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          border: "1px solid rgba(139, 30, 45, 0.12)",
          padding: "18px 20px",
          marginTop: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{ fontSize: "18px" }}>💬</span>
          <h2
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#8B1E2D",
              margin: 0,
            }}
          >
            काही माहिती चुकीची वाटते का? / Report an Issue
          </h2>
        </div>

        <p style={{ fontSize: "12px", color: "#666", lineHeight: 1.45, margin: "0 0 14px" }}>
          जर देणगीदाराचे नाव, रक्कम किंवा तारीख चुकीची दिसत असेल, तर कृपया खाली तुमचा अभिप्राय लिहा जेणेकरून आमची टीम त्यावर काम करू शकेल.
        </p>

        {isSubmitted ? (
          <div
            style={{
              background: "#E8F5E9",
              border: "1px solid #A5D6A7",
              borderRadius: "10px",
              padding: "14px",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "24px" }}>✅</span>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#2E7D32", marginTop: "4px" }}>
              धन्यवाद! तुमचा अभिप्राय नोंदवला गेला आहे.
            </div>
            <p style={{ fontSize: "12px", color: "#4E7055", margin: "4px 0 0" }}>
              Thank you! Our technical team is reviewing the feedback to ensure 100% data accuracy.
            </p>
            <button
              onClick={() => setIsSubmitted(false)}
              style={{
                marginTop: "10px",
                background: "transparent",
                border: "none",
                color: "#2E7D32",
                fontSize: "12px",
                fontWeight: 600,
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              आणखी अभिप्राय द्या / Submit another response
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitFeedback} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                placeholder="तुमचे नाव (Name)"
                value={feedbackName}
                onChange={(e) => setFeedbackName(e.target.value)}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  fontSize: "12.5px",
                  border: "1px solid #DDD",
                  borderRadius: "8px",
                  outline: "none",
                }}
              />
              <input
                type="tel"
                placeholder="मोबाईल (Mobile)"
                value={feedbackMobile}
                onChange={(e) => setFeedbackMobile(e.target.value)}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  fontSize: "12.5px",
                  border: "1px solid #DDD",
                  borderRadius: "8px",
                  outline: "none",
                }}
              />
            </div>

            <textarea
              required
              rows={3}
              placeholder="काय चूक किंवा वेगळे दिसते आहे ते येथे सविस्तर लिहा... (Describe the issue or feedback)"
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "9px 12px",
                fontSize: "12.5px",
                border: "1px solid #DDD",
                borderRadius: "8px",
                outline: "none",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />

            <button
              type="submit"
              disabled={isSubmitting || !feedbackComment.trim()}
              style={{
                background: "#8B1E2D",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                padding: "10px 16px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: isSubmitting || !feedbackComment.trim() ? "not-allowed" : "pointer",
                opacity: isSubmitting || !feedbackComment.trim() ? 0.7 : 1,
                transition: "background 0.2s ease",
              }}
            >
              {isSubmitting ? "नोंदवत आहे..." : "अभिप्राय पाठवा / Submit Feedback"}
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "24px",
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
