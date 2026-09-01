/**
 * Lead Notification Service for PavtiBook
 * Handles dispatching instant WhatsApp (Meta Cloud API) and Email notifications
 * to administrators when new demo requests or inquiries are submitted.
 */

export interface DemoLeadPayload {
  passId: string;
  name: string;
  mobile: string;
  orgName: string;
  orgType: string;
  city: string;
  receiptsPerMonth: string;
  demoAccounts?: string;
  submittedAt: string;
}

export interface NotificationResult {
  whatsapp: {
    attempted: boolean;
    success: boolean;
    message?: string;
    error?: string;
  };
  email: {
    attempted: boolean;
    success: boolean;
    message?: string;
    error?: string;
  };
}

/**
 * Formats a given ISO date string into Indian Standard Time (IST) readable format
 */
export function formatToIST(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

/**
 * Builds the standardized WhatsApp lead alert message text
 */
export function buildWhatsAppLeadMessage(lead: DemoLeadPayload): string {
  const formattedTime = formatToIST(lead.submittedAt);
  const accounts = lead.demoAccounts || "Upto 5 Demo Accounts";

  return `🔔 *नवीन PavtiBook Demo नोंदणी प्राप्त झाली!*

📋 *Lead Details (माहिती):*
👤 *नाव (Name):* ${lead.name}
🏛️ *मंडळ / संस्था (Mandal):* ${lead.orgName} (${lead.orgType})
📱 *मोबाईल (Mobile):* +91 ${lead.mobile}
📍 *शहर (City):* ${lead.city}
👥 *खाती / अपेक्षित पावत्या:* ${lead.receiptsPerMonth} (${accounts})
🎫 *Demo Pass ID:* ${lead.passId}
📅 *तारीख व वेळ (IST):* ${formattedTime}

👉 *देणगीदार / मंडळाशी WhatsApp वर बोला:*
https://wa.me/91${lead.mobile}`;
}

/**
 * Builds the standardized Email lead alert HTML content
 */
export function buildEmailLeadHtml(lead: DemoLeadPayload): string {
  const formattedTime = formatToIST(lead.submittedAt);
  const accounts = lead.demoAccounts || "Upto 5 Demo Accounts";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #8B1E2D20; border-radius: 12px; overflow: hidden; background-color: #FFFDF9;">
      <div style="background: linear-gradient(135deg, #8B1E2D 0%, #A32436 100%); color: #FFFFFF; padding: 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px; color: #FFF6E8;">🔔 New PavtiBook Demo Lead</h2>
        <p style="margin: 5px 0 0; font-size: 13px; color: #FFE082;">Pass ID: ${lead.passId}</p>
      </div>

      <div style="padding: 24px; color: #333333; line-height: 1.6;">
        <p style="font-size: 14px; margin-top: 0;">A new Free Demo request has been submitted on <strong>pavtibook.online</strong>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
          <tr style="border-bottom: 1px solid #EEEEEE;">
            <td style="padding: 8px 0; font-weight: bold; color: #666666; width: 40%;">Lead Name (नाव):</td>
            <td style="padding: 8px 0; font-weight: bold; color: #111111;">${lead.name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #EEEEEE;">
            <td style="padding: 8px 0; font-weight: bold; color: #666666;">Organization (मंडळ):</td>
            <td style="padding: 8px 0; font-weight: bold; color: #8B1E2D;">${lead.orgName} (${lead.orgType})</td>
          </tr>
          <tr style="border-bottom: 1px solid #EEEEEE;">
            <td style="padding: 8px 0; font-weight: bold; color: #666666;">Mobile (मोबाईल):</td>
            <td style="padding: 8px 0; font-weight: bold; color: #111111;">
              <a href="tel:+91${lead.mobile}" style="color: #8B1E2D; text-decoration: none;">+91 ${lead.mobile}</a>
              (<a href="https://wa.me/91${lead.mobile}" style="color: #25D366; text-decoration: none; font-weight: bold;">WhatsApp Chat</a>)
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #EEEEEE;">
            <td style="padding: 8px 0; font-weight: bold; color: #666666;">City (शहर):</td>
            <td style="padding: 8px 0; color: #111111;">${lead.city}</td>
          </tr>
          <tr style="border-bottom: 1px solid #EEEEEE;">
            <td style="padding: 8px 0; font-weight: bold; color: #666666;">Expected Receipts:</td>
            <td style="padding: 8px 0; color: #111111;">${lead.receiptsPerMonth} (${accounts})</td>
          </tr>
          <tr style="border-bottom: 1px solid #EEEEEE;">
            <td style="padding: 8px 0; font-weight: bold; color: #666666;">Demo Pass ID:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #E65100;">${lead.passId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #666666;">Submission Time:</td>
            <td style="padding: 8px 0; color: #111111;">${formattedTime}</td>
          </tr>
        </table>

        <div style="text-align: center; margin-top: 24px;">
          <a href="https://wa.me/91${lead.mobile}" style="background-color: #25D366; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
            Contact Lead on WhatsApp (+91 ${lead.mobile})
          </a>
        </div>
      </div>

      <div style="background-color: #F5EFEB; padding: 12px; text-align: center; font-size: 11px; color: #777777; border-top: 1px solid #E0D7D0;">
        PavtiBook Automated Lead System · Confidential Lead Data
      </div>
    </div>
  `;
}

/**
 * Sends a WhatsApp notification to the PavtiBook admin number via Meta Cloud API.
 * Target default: +91 9653333929 (919653333929)
 */
async function sendAdminWhatsAppNotification(lead: DemoLeadPayload): Promise<{ success: boolean; message?: string; error?: string }> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const targetNumber = process.env.ADMIN_WHATSAPP_NUMBER || "919653333929";

  // Clean target number
  const cleanTarget = targetNumber.replace(/[^0-9]/g, "");

  if (!token || !phoneNumberId) {
    console.warn(
      "[WhatsApp Lead Notification] Meta WhatsApp Business API is not configured in environment variables (WHATSAPP_API_TOKEN / WHATSAPP_PHONE_NUMBER_ID). Skipping automated WhatsApp dispatch."
    );
    return {
      success: false,
      error: "Meta WhatsApp Business API credentials not configured (WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID).",
    };
  }

  try {
    const messageBody = buildWhatsAppLeadMessage(lead);
    const apiUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanTarget,
        type: "text",
        text: {
          preview_url: true,
          body: messageBody,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[WhatsApp Lead Notification] Meta API error response:", data);
      return {
        success: false,
        error: data.error?.message || `Meta API HTTP ${response.status}`,
      };
    }

    console.log(`[WhatsApp Lead Notification] Successfully dispatched to +${cleanTarget}. Message ID:`, data.messages?.[0]?.id);
    return {
      success: true,
      message: `WhatsApp message sent successfully (ID: ${data.messages?.[0]?.id || "ok"})`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[WhatsApp Lead Notification] Network/Execution error:", errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Sends a fallback email notification to the configured admin email.
 */
async function sendAdminEmailNotification(lead: DemoLeadPayload): Promise<{ success: boolean; message?: string; error?: string }> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "support@pavtibook.online";
  const resendApiKey = process.env.RESEND_API_KEY;
  const sendgridApiKey = process.env.SENDGRID_API_KEY;

  const subject = `[New Demo Lead] ${lead.name} - ${lead.orgName} (${lead.city}) [${lead.passId}]`;
  const html = buildEmailLeadHtml(lead);

  // 1. Resend API support (if configured)
  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "PavtiBook Leads <notifications@pavtibook.online>",
          to: [adminEmail],
          subject,
          html,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.message || "Resend API error" };
      }
      return { success: true, message: `Email dispatched via Resend (ID: ${data.id})` };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMsg };
    }
  }

  // 2. SendGrid API support (if configured)
  if (sendgridApiKey) {
    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sendgridApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: adminEmail }] }],
          from: { email: process.env.EMAIL_FROM || "notifications@pavtibook.online", name: "PavtiBook Leads" },
          subject,
          content: [{ type: "text/html", value: html }],
        }),
      });

      if (!response.ok) {
        const data = await response.text();
        return { success: false, error: data || "SendGrid API error" };
      }
      return { success: true, message: "Email dispatched via SendGrid" };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMsg };
    }
  }

  // If no email API is configured, log warning
  console.warn(
    `[Email Lead Notification] Email provider API key (RESEND_API_KEY / SENDGRID_API_KEY) not set in environment. Notification to ${adminEmail} skipped.`
  );
  return {
    success: false,
    error: "No email provider configured (RESEND_API_KEY / SENDGRID_API_KEY).",
  };
}

/**
 * Master dispatcher: Dispatches primary WhatsApp alert and backup email notification.
 * Never throws an error so lead capturing remains 100% resilient.
 */
export async function notifyAdminOfNewLead(lead: DemoLeadPayload): Promise<NotificationResult> {
  const result: NotificationResult = {
    whatsapp: { attempted: false, success: false },
    email: { attempted: false, success: false },
  };

  try {
    // 1. Primary WhatsApp Notification
    result.whatsapp.attempted = true;
    const waRes = await sendAdminWhatsAppNotification(lead);
    result.whatsapp.success = waRes.success;
    result.whatsapp.message = waRes.message;
    result.whatsapp.error = waRes.error;
  } catch (err: unknown) {
    result.whatsapp.error = err instanceof Error ? err.message : String(err);
  }

  try {
    // 2. Backup Email Notification
    result.email.attempted = true;
    const emailRes = await sendAdminEmailNotification(lead);
    result.email.success = emailRes.success;
    result.email.message = emailRes.message;
    result.email.error = emailRes.error;
  } catch (err: unknown) {
    result.email.error = err instanceof Error ? err.message : String(err);
  }

  return result;
}
