// ════════════════════════════════════════════════════════════════
//  نظام اللوق — Hell Ticket (نسخة محسنة بسرعة البرق)
//  الأحداث المهمة فقط — بدون رسائل المحادثة
//  التصميم: EmbedBuilder بنفس أسلوب Shop_Hell
// ════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require('discord.js');
const fs   = require('fs');
const path = require('path');
const { COLORS, BRAND } = require('./ui.js');

const logFile = path.join(__dirname, '../../logs/modmail.log');
if (!fs.existsSync(path.dirname(logFile)))
  fs.mkdirSync(path.dirname(logFile), { recursive: true });

// كاش لقناة اللوق لتجنب الطلبات المتكررة
let logChannelCache = null;

function writeFile(level, msg) {
  // كتابة للملف في الخلفية لتجنب تعطيل الـ Event Loop
  fs.appendFile(logFile, `[${new Date().toISOString()}] [${level}] ${msg}\n`, 'utf8', (err) => {
    if (err) console.error("[LOGGER_FILE_ERR]", err);
  });
}

function getBaghdadTime() {
  return new Date().toLocaleString('ar-IQ', {
    timeZone: 'Asia/Baghdad',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

const TITLES = {
  TICKET_OPEN:        'تذكرة جديدة — قيد الانتظار',
  TICKET_CLAIM:       'تم استلام تذكرة',
  TICKET_CLOSE:       'تم إغلاق تذكرة',
  TICKET_FORCE_CLAIM: 'إلغاء استلام إجباري',
  TICKET_BLOCK:       'تم حظر مستخدم',
  TICKET_UNBLOCK:     'تم رفع الحظر',
  TICKET_RATE:        'تقييم جديد للخدمة',
};

const FOOTERS = {
  TICKET_OPEN:        'نظام التذاكر — تذكرة جديدة بانتظار الاستلام',
  TICKET_CLAIM:       'نظام التذاكر — تم استلام التذكرة من قبل الستاف',
  TICKET_CLOSE:       'نظام التذاكر — تم إغلاق التذكرة وحفظ السجل',
  TICKET_FORCE_CLAIM: 'نظام التذاكر — إلغاء استلام بواسطة الإدارة',
  TICKET_BLOCK:       'نظام الإدارة — تم تطبيق الحظر',
  TICKET_UNBLOCK:     'نظام الإدارة — تم رفع الحظر',
  TICKET_RATE:        'نظام التذاكر — تم استلام تقييم المستخدم',
};

async function sendLog(client, type, fields = [], description = '') {
  // تنفيذ الإرسال في الخلفية لضمان سرعة استجابة البوت للأوامر
  setImmediate(async () => {
    try {
      const config = require('../../config.js');
      
      if (!logChannelCache) {
        logChannelCache = await client.channels.fetch(config.logChannelId).catch(() => null);
      }
      
      if (!logChannelCache) return;

      const embed = new EmbedBuilder()
        .setColor(COLORS.accent)
        .setAuthor({ name: TITLES[type] || type })
        .setTimestamp()
        .setFooter({ text: `${FOOTERS[type] || 'Hell Ticket'} • ${getBaghdadTime()}` });

      if (description) embed.setDescription(description);
      if (fields.length) embed.addFields(fields);

      await logChannelCache.send({ embeds: [embed] }).catch(() => {});
    } catch (e) {
      writeFile('ERROR', `Log failed: ${e.message}`);
    }
  });
}

// ─── الدالة الرئيسية ────────────────────────────────────────────
async function log(client, type, data = {}) {
  writeFile(type, JSON.stringify(data));

  // رسائل المحادثة لا تُرسل للوق
  if (type === 'MESSAGE_USER') return;

  const t = Math.floor(Date.now() / 1000);

  if (type === 'TICKET_OPEN') {
    sendLog(client, type, [
      { name: '<:Untitled_12:1513737758294933586> رقم التذكرة', value: `\`#${data.ticketId}\``,         inline: true  },
      { name: '<:Untitled_2:1513737772861620304> المستخدم',     value: `<@${data.userId}>`,              inline: true  },
      { name: '<:Untitled_21:1513737777093804234> وقت الفتح',   value: `<t:${t}:F>`,                     inline: true  },
      { name: '<:Untitled_6:1513737861323685959> الاستفسار',    value: String(data.issue).slice(0, 200), inline: false },
    ], '> تم استلام **تذكرة جديدة** وهي الآن بانتظار الاستلام من فريق الدعم.');
  }

  else if (type === 'TICKET_CLAIM') {
    sendLog(client, type, [
      { name: '<:Untitled_12:1513737758294933586> رقم التذكرة', value: `\`#${data.ticketId}\``,  inline: true },
      { name: '<:Untitled_2:1513737772861620304> المستخدم',     value: `<@${data.userId}>`,       inline: true },
      { name: '<:Untitled_36:1513737821729325057> المستلم',     value: `<@${data.staffId}>`,      inline: true },
      { name: '<:Untitled_21:1513737777093804234> وقت الاستلام', value: `<t:${t}:F>`,             inline: true },
    ], '> قام أحد أفراد فريق الدعم **باستلام التذكرة** والبدء في التواصل مع المستخدم.');
  }

  else if (type === 'TICKET_CLOSE') {
    sendLog(client, type, [
      { name: '<:Untitled_12:1513737758294933586> رقم التذكرة', value: `\`#${data.ticketId}\``,                    inline: true  },
      { name: '<:Untitled_2:1513737772861620304> المستخدم',     value: `<@${data.userId}>`,                         inline: true  },
      { name: '<:Untitled_11:1513737757078327306> أغلقها',      value: `<@${data.staffId}>`,                        inline: true  },
      { name: '<:Untitled_21:1513737777093804234> وقت الإغلاق', value: `<t:${t}:F>`,                                inline: true  },
      { name: '<:Untitled_7:1513737863534084157> عدد الرسائل',  value: `${data.messageCount}`,                      inline: true  },
      { name: '<:Untitled_21:1513737777093804234> النوع',        value: data.isAutoClose ? '⏱️ تلقائي' : '🔒 يدوي', inline: true  },
    ], '> تم **إغلاق التذكرة** وحفظ سجل المحادثة كاملاً في قناة الترانسكريبت.');
  }

  else if (type === 'TICKET_FORCE_CLAIM') {
    sendLog(client, type, [
      { name: '<:Untitled_12:1513737758294933586> رقم التذكرة', value: `\`#${data.ticketId}\``, inline: true },
      { name: '<:Untitled_2:1513737772861620304> نفّذه',        value: `<@${data.adminId}>`,    inline: true },
      { name: '<:Untitled_21:1513737777093804234> الوقت',       value: `<t:${t}:F>`,            inline: true },
    ], '> قامت الإدارة **بإلغاء الاستلام إجبارياً** وإعادة التذكرة لوضع الانتظار.');
  }

  else if (type === 'TICKET_BLOCK') {
    sendLog(client, type, [
      { name: '<:Untitled_12:1513737758294933586> المحظور',       value: `<@${data.userId}>`,  inline: true },
      { name: '<:Untitled_36:1513737821729325057> بواسطة',       value: `<@${data.staffId}>`, inline: true },
      { name: '<:Untitled_6:1513737861323685959> تاريخ الحظر',  value: `<t:${t}:F>`,         inline: true },
    ], '> تم **حظر مستخدم** من استخدام نظام التذاكر.');
  }

  else if (type === 'TICKET_UNBLOCK') {
    sendLog(client, type, [
      { name: '<:Untitled_36:1513737821729325057> رُفع عنه الحظر', value: `<@${data.userId}>`,  inline: true },
      { name: '<:Untitled_2:1513737772861620304> بواسطة',           value: `<@${data.staffId}>`, inline: true },
      { name: '<:Untitled_21:1513737777093804234> تاريخ الرفع',     value: `<t:${t}:F>`,         inline: true },
    ], '> تم **رفع الحظر** عن المستخدم ويمكنه فتح تذاكر جديدة.');
  }

  else if (type === 'TICKET_RATE') {
    sendLog(client, type, [
      { name: '<:Untitled_12:1513737758294933586> رقم التذكرة', value: `\`#${data.ticketId}\``, inline: true },
      { name: '<:Untitled_36:1513737821729325057> الستاف',      value: `<@${data.staffId}>`,  inline: true },
      { name: '<:xqrv5hd:1506358845495316695> التقييم',        value: `**${data.rating}/5**`, inline: true },
    ], '> قام المستخدم **بتقييم الخدمة** بعد إغلاق التذكرة.');
  }
}

module.exports = { log, writeFile };
