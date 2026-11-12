const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');

/**
 * يولّد ملف HTML احتياطي بسيط للمحادثة
 */
async function generateTranscript(ticket) {
  const dir = path.join(__dirname, '../../transcripts');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filename = `ticket-${ticket.ticketId}-${Date.now()}.html`;
  const filepath = path.join(dir, filename);

  const messages = (ticket.messages || []).map(m => {
    const time = new Date(m.timestamp).toLocaleString('ar-SA');
    const cls = m.isStaff ? 'staff' : 'user';
    const tag = m.isStaff ? '🛡️' : '👤';
    return `
      <div class="message ${cls}">
        <div class="meta">
          <span class="emoji">${tag}</span>
          <span class="author">${escHtml(m.author)}</span>
          <span class="time">${time}</span>
        </div>
        <div class="content">${escHtml(m.content)}</div>
      </div>`;
  }).join('\n');

  const openedAt  = new Date(ticket.openedAt).toLocaleString('ar-SA');
  const closedAt  = ticket.closedAt ? new Date(ticket.closedAt).toLocaleString('ar-SA') : '—';
  const duration  = ticket.closedAt ? formatDuration(ticket.closedAt - ticket.openedAt) : '—';

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>تذكرة #${ticket.ticketId} — ${escHtml(ticket.userTag)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0e1117; color: #e0e0e0; padding: 24px; direction: rtl; }
    .header { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    .header h1 { font-size: 1.5rem; color: #58a6ff; margin-bottom: 12px; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 12px; }
    .meta-item { background: #0d1117; border: 1px solid #21262d; border-radius: 8px; padding: 10px 14px; font-size: 0.85rem; }
    .meta-item .label { color: #8b949e; font-size: 0.75rem; margin-bottom: 4px; }
    .meta-item .value { color: #c9d1d9; font-weight: 600; }
    .issue-box { background: #161b22; border-right: 3px solid #58a6ff; border-radius: 4px; padding: 12px 16px; margin-bottom: 24px; font-style: italic; color: #c9d1d9; }
    .messages { display: flex; flex-direction: column; gap: 10px; }
    .message { padding: 12px 16px; border-radius: 8px; max-width: 80%; position: relative; }
    .message.user { background: #1c2128; border: 1px solid #30363d; align-self: flex-start; border-right: 3px solid #3fb950; }
    .message.staff { background: #1c2536; border: 1px solid #388bfd33; align-self: flex-end; border-left: 3px solid #58a6ff; }
    .message .meta { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .message .author { font-weight: 700; font-size: 0.85rem; }
    .message.user .author { color: #3fb950; }
    .message.staff .author { color: #58a6ff; }
    .message .time { font-size: 0.72rem; color: #484f58; margin-right: auto; }
    .message .content { font-size: 0.9rem; line-height: 1.5; color: #c9d1d9; }
    .footer { text-align: center; margin-top: 32px; font-size: 0.75rem; color: #484f58; }
    .badge { display: inline-block; background: #21262d; border: 1px solid #30363d; border-radius: 20px; padding: 3px 10px; font-size: 0.75rem; color: #8b949e; margin-left: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋  سجل تذكرة <span class="badge">#${ticket.ticketId}</span></h1>
    <div class="meta-grid">
      <div class="meta-item"><div class="label">المستخدم</div><div class="value">👤  ${escHtml(ticket.userTag)}</div></div>
      <div class="meta-item"><div class="label">وقت الفتح</div><div class="value">📂  ${openedAt}</div></div>
      <div class="meta-item"><div class="label">وقت الإغلاق</div><div class="value">🔒  ${closedAt}</div></div>
      <div class="meta-item"><div class="label">مدة التذكرة</div><div class="value">⏱️  ${duration}</div></div>
      <div class="meta-item"><div class="label">عدد الرسائل</div><div class="value">💬  ${ticket.messages?.length ?? 0}</div></div>
    </div>
  </div>
  <div class="issue-box">📝  <strong>الاستفسار الأصلي:</strong> ${escHtml(ticket.issue)}</div>
  <div class="messages">${messages}</div>
  <div class="footer">تم توليد هذا السجل تلقائياً بواسطة نظام ModMail &nbsp;•&nbsp; تذكرة #${ticket.ticketId} &nbsp;•&nbsp; ${new Date().toLocaleString('ar-SA')}</div>
</body>
</html>`;

  await fs.promises.writeFile(filepath, html, 'utf8');
  return filepath;
}

/**
 * يحاول استخدام discord-html-transcripts لتوليد ترانسكريبت احترافي
 */
async function generateAdvancedTranscript(ticket, channel) {
  const dir = path.join(__dirname, '../../transcripts');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filename = `ticket-${ticket.ticketId}-${Date.now()}.html`;
  const filepath = path.join(dir, filename);

  try {
    const { createTranscript } = require('discord-html-transcripts');
    if (!channel) throw new Error('no channel');

    const attachment = await createTranscript(channel, {
      filename,
      saveImages: false,
      poweredBy: false,
    });

    const buf = attachment.attachment;
    const data = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    await fs.promises.writeFile(filepath, data);
    return filepath;
  } catch (_) {
    return generateTranscript(ticket);
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h} ساعة و${m} دقيقة`;
  if (m > 0) return `${m} دقيقة و${s} ثانية`;
  return `${s} ثانية`;
}

module.exports = { generateTranscript, generateAdvancedTranscript };
