export interface VerificationEmailTemplateInput {
  recipientName: string;
  verificationLink: string;
}

export interface EmailTemplateResult {
  subject: string;
  textContent: string;
  htmlContent: string;
}

/**
 * Clean and normal verification message without heavy HTML styling or boilerplate.
 */
export function getVerificationEmailTemplate({
  recipientName,
  verificationLink,
}: VerificationEmailTemplateInput): EmailTemplateResult {
  const subject = "Verify Your Email - Job Hunter";

  const textContent = `Hello ${recipientName},

Thank you for registering with Job Hunter.

Please verify your email address by clicking the link below:
${verificationLink}

This verification link will expire in 24 hours. If you did not register for an account, please ignore this message.

Best regards,
Job Hunter Team`.trim();

  const htmlContent = `<p>Hello ${recipientName},</p>
<p>Thank you for registering with Job Hunter.</p>
<p>Please verify your email address by clicking the link below:</p>
<p><a href="${verificationLink}">${verificationLink}</a></p>
<p>This verification link will expire in 24 hours. If you did not register for an account, please ignore this message.</p>
<p>Best regards,<br>Job Hunter Team</p>`.trim();

  return {
    subject,
    textContent,
    htmlContent,
  };
}
