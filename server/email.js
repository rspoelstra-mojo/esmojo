// Alleen gebruiken vanuit servercode; importeer dit bestand nooit in src/.
export const EMAIL_FROM = 'ESMOJO <no-reply@esmojo.nl>';

/** Centraal verzenden via Resend, met een vast afzenderadres. */
export async function sendEmail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY ontbreekt op de server.');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, text, html }),
  });

  if (!response.ok) {
    throw new Error(`Resend kon de e-mail niet verzenden (HTTP ${response.status}).`);
  }
  return response.json();
}
