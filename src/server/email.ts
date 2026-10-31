import 'server-only';

/**
 * Sends the password reset email through Resend's HTTP API when
 * RESEND_API_KEY is configured. Without it (local development), the link is
 * logged to the server console instead. Production deployments must set
 * RESEND_API_KEY and EMAIL_FROM for password reset to reach users.
 */
export async function sendPasswordResetEmail(to: string, link: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') console.warn('[email] RESEND_API_KEY not set; password reset email not sent.');
    else console.info(`[email] Password reset link for ${to}: ${link}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? 'GameHub <noreply@example.com>',
      to,
      subject: 'Reset your GameHub password',
      text: `Someone asked to reset the password for your GameHub account.\n\nReset it here (valid for 1 hour): ${link}\n\nIf this wasn't you, ignore this email.`,
    }),
  });
  if (!res.ok) console.error('[email] Resend error', res.status, await res.text().catch(() => ''));
}
