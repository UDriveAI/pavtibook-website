/**
 * Authentication Helpers for Web Client
 * Preserves Android parity for mobile-to-email resolution.
 */

export async function resolveMobileToEmail(mobile: string): Promise<string | null> {
  const clean = mobile.trim().replace(/\D/g, "");
  if (clean.length < 10) return null;
  const tenDigit = clean.slice(-10);

  try {
    const res = await fetch(
      "https://asia-south1-pavtibook-7251a.cloudfunctions.net/resolveMobileToEmail",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { mobile: tenDigit } }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const result = data.result || data;
      if (result.success && result.email) {
        return result.email.trim();
      }
    }
    return null;
  } catch (err) {
    console.warn("[resolveMobileToEmail] Error resolving mobile:", err);
    return null;
  }
}
