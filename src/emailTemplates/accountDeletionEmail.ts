import { EmailTemplateResult } from "./verificationEmail";

export interface AccountDeletionEmailTemplateInput {
  recipientName: string;
  scheduledPermanentDeletionDate: Date;
}

/**
 * Clean and normal account deletion notification without heavy HTML styling or boilerplate.
 */
export function getAccountDeletionEmailTemplate({
  recipientName,
  scheduledPermanentDeletionDate,
}: AccountDeletionEmailTemplateInput): EmailTemplateResult {
  const subject = "Account Deletion Scheduled - Job Hunter";
  const formattedDate = scheduledPermanentDeletionDate.toUTCString();

  const textContent = `Hello ${recipientName},

We received a request to delete your Job Hunter account.

Your account has been deactivated and is scheduled for permanent deletion in 7 days (1 week) on ${formattedDate}.
After this date, your account and associated data will be permanently removed from our database.

If you did not make this request or wish to cancel the deletion, please reach out to our support team immediately before the deletion date.

Best regards,
Job Hunter Team`.trim();

  const htmlContent = `<p>Hello ${recipientName},</p>
<p>We received a request to delete your Job Hunter account.</p>
<p>Your account has been deactivated and is scheduled for permanent deletion in 7 days (1 week) on <strong>${formattedDate}</strong>.</p>
<p>After this date, your account and associated data will be permanently removed from our database.</p>
<p>Best regards,<br>Job Hunter Team</p>`.trim();

  return {
    subject,
    textContent,
    htmlContent,
  };
}
