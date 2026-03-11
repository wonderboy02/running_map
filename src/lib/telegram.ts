const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function notifyFeedback(rating: number, content: string | null) {
  if (!BOT_TOKEN || !CHAT_ID) return;

  const stars = '⭐'.repeat(rating);
  const lines = [`📬 새 피드백\n\n${stars} (${rating}/5)`];
  if (content) lines.push(content.slice(0, 500));
  const text = lines.join('\n\n');

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text }),
    });

    if (!res.ok) {
      console.error('[telegram] API error:', res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.error('[telegram] Failed to send notification:', err);
  }
}
