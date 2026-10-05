import { config } from "../config";
import {
  getVerificationEmailTemplate,
  getAccountDeletionEmailTemplate,
} from "../emailTemplates";

export interface SendVerificationEmailParams {
  toEmail: string;
  toName?: string | null;
  verificationLink: string;
  apiKey?: string;
  senderEmail?: string;
  senderName?: string;
}

export interface SendAccountDeletionEmailParams {
  toEmail: string;
  toName?: string | null;
  scheduledPermanentDeletionDate: Date;
  apiKey?: string;
  senderEmail?: string;
  senderName?: string;
}

/**
 * Sends an email verification message via Brevo HTTP API.
 * Uses templates defined in src/emailTemplates.
 * Falls back to console logging in development or if Brevo API key is not configured.
 */
export async function sendVerificationEmail({
  toEmail,
  toName,
  verificationLink,
  apiKey = config.brevo.apiKey,
  senderEmail = config.brevo.senderEmail,
  senderName = config.brevo.senderName || "Job Hunter",
}: SendVerificationEmailParams): Promise<{ success: boolean; error?: string }> {
  const recipientName = toName?.trim() || toEmail.split("@")[0];

  const template = getVerificationEmailTemplate({
    recipientName,
    verificationLink,
  });

  // If no API key is provided, log the normal text message to console for development testing
  if (!apiKey || !senderEmail) {
    console.log("[DEV EMAIL SIMULATOR] Brevo API Key not configured.");
    console.log(`To: ${toEmail} (${recipientName})`);
    console.log(`Subject: ${template.subject}`);
    console.log(template.textContent);
    return { success: true };
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: toEmail,
            name: recipientName,
          },
        ],
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Brevo API Error:", response.status, errorBody);
      console.log(`[Email Fallback] Verification Link: ${verificationLink}`);
      return { success: false, error: `Brevo API returned status ${response.status}` };
    }

    console.log(`Verification email dispatched successfully to ${toEmail}`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to dispatch email via Brevo:", err.message);
    console.log(`[Email Fallback] Verification Link: ${verificationLink}`);
    return { success: false, error: err.message };
  }
}

/**
 * Sends an account deletion confirmation email notifying the user of their 7-day scheduled deletion.
 */
export async function sendAccountDeletionEmail({
  toEmail,
  toName,
  scheduledPermanentDeletionDate,
  apiKey = config.brevo.apiKey,
  senderEmail = config.brevo.senderEmail,
  senderName = config.brevo.senderName || "Job Hunter",
}: SendAccountDeletionEmailParams): Promise<{ success: boolean; error?: string }> {
  const recipientName = toName?.trim() || toEmail.split("@")[0];

  const template = getAccountDeletionEmailTemplate({
    recipientName,
    scheduledPermanentDeletionDate,
  });

  if (!apiKey || !senderEmail) {
    console.log("[DEV EMAIL SIMULATOR] Brevo API Key not configured.");
    console.log(`To: ${toEmail} (${recipientName})`);
    console.log(`Subject: ${template.subject}`);
    console.log(template.textContent);
    return { success: true };
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: toEmail,
            name: recipientName,
          },
        ],
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Brevo API Error:", response.status, errorBody);
      return { success: false, error: `Brevo API returned status ${response.status}` };
    }

    console.log(`Account deletion email dispatched successfully to ${toEmail}`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to dispatch email via Brevo:", err.message);
    return { success: false, error: err.message };
  }
}
