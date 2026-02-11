const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function notifyFeedback(content: string) {
  if (!BOT_TOKEN || !CHAT_ID) return;

  const text = `📬 새 피드백\n\n${content.slice(0, 500)}`;

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text }),
    });
  } catch {
    console.error('[telegram] Failed to send notification');
  }
}
