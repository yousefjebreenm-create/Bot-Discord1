const {
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ContainerBuilder,
  MessageFlags,
} = require("discord.js");
const config = require("../../config.js");
const fmt = require("../utils/format.js");
const tm = require("../utils/ticketManager.js");
const { log } = require("../utils/logger.js");
const { handleClose } = require("../utils/closeHandler.js");
const db = require("../database/models.js");
const { generateCaptchaImage } = require("../utils/captchaGen.js");

function parseTime(str) {
  const match = str?.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const n = parseInt(match[1]);
  return (
    { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2].toLowerCase()] * n
  );
}

// ─── إرسال كابتشا جديد للروم (صورة حقيقية) ────────────────────
async function sendNewCaptcha(client, channelId) {
  const guild = client.guilds.cache.get(config.supportGuildId);
  const channel = guild?.channels.cache.get(channelId);
  if (!channel) return;

  // حذف الكابتشا القديم في الخلفية
  client.captchaMsgs = client.captchaMsgs || new Map();
  const oldMsgId = client.captchaMsgs.get(channelId);
  if (oldMsgId) {
    channel.messages.fetch(oldMsgId).then(m => m.delete().catch(() => {})).catch(() => {});
  }

  const { code, attachment } = await generateCaptchaImage();
  client.captchaCodes = client.captchaCodes || new Map();
  client.captchaCodes.set(channelId, code);
  db.saveCaptcha(channelId, code).catch(() => {});

  const captchaMsg = await channel.send({
    ...fmt.captchaImageCard(),
    files: [attachment],
  });
  client.captchaMsgs.set(channelId, captchaMsg.id);
}

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot) return;

    // ══ رسائل الخاص (DM ↔ Room Relay) ══════════════════════════════
    if (message.channel.type === ChannelType.DM) {
      const userId = message.author.id;
      
      // فحص سريع من الذاكرة
      if (client.blocked.has(userId)) return;

      const ticket = tm.getTicketByUser(client, userId);
      if (!ticket) {
        return message.channel.send({
          content: fmt.notify("📬", "لا توجد تذكرة مفتوحة", "توجه إلى السيرفر واضغط زر **فتح تذكرة**."),
        });
      }

      // أمر الإغلاق من الخاص
      if (message.content.trim() === "-er") {
        message.channel.send({ content: fmt.notify("<:Untitled_11:1513737757078327306>", "جاري إغلاق تذكرتك...", "") });
        handleClose(client, ticket.channelId, message.author, ticket, false);
        return;
      }

      // إلغاء التايمر إذا وجد
      if (client.closeTimers.has(ticket.channelId)) {
        clearTimeout(client.closeTimers.get(ticket.channelId));
        client.closeTimers.delete(ticket.channelId);
        const guild = client.guilds.cache.get(config.supportGuildId);
        const ch = guild?.channels.cache.get(ticket.channelId);
        if (ch) ch.send({ content: fmt.notify("🔄", "تم إلغاء الإغلاق التلقائي", `<@${userId}> رد على التذكرة.`) });
      }

      // ريلاي الرسالة (بسرعة البرق - بالتوازي)
      const guild = client.guilds.cache.get(config.supportGuildId);
      const channel = guild?.channels.cache.get(ticket.channelId);
      if (!channel) return;

      if (message.content || message.attachments.size > 0) {
        const display = fmt.userMessage(message.author, message.content || "");
        const files = [...message.attachments.values()].map(a => a.url);

        // إرسال للروم وللمستخدم في نفس الوقت
        Promise.all([
          channel.send({ content: display, files: files.length ? [files[0]] : [] }).catch(() => {}),
          message.channel.send({ content: display, files: files.length ? [files[0]] : [] }).catch(() => {})
        ]);

        // إذا كان هناك أكثر من مرفق، نرسل البقية كروابط لضمان السرعة
        if (files.length > 1) {
          for (let i = 1; i < files.length; i++) {
            channel.send({ content: `> <:Untitled_18:1513737769837400186> **مرفق إضافي:** ${files[i]}` }).catch(() => {});
          }
        }

        tm.addMessage(client, userId, {
          author: message.author.username,
          content: message.content || "[مرفق]",
          isStaff: false,
        });
      }
      return;
    }

    // ══ رسائل السيرفر ═══════════════════════════════════════════
    if (message.channel.type !== ChannelType.GuildText) return;

    // ── نظام البلوك ─────────────────────
    if (message.channel.id === config.staffCommandsChannelId) {
      const member = message.member;
      const isAdmin = member?.roles?.cache?.has(config.forceClaimRole) || member?.permissions?.has(8n);
      const content = message.content.trim();

      if (content.startsWith("-sfb")) {
        // تنفيذ في الخلفية لسرعة الرد
        setImmediate(async () => {
          if (!config.staffRoles.some((r) => member.roles.cache.has(r)) && !isAdmin) return;
          
          const topMatch = content.match(/^-sfb\s+#(\d+)$/i);
          if (topMatch) {
            const topN = Math.min(parseInt(topMatch[1]), 100);
            const allStats = await db.getAllStaffStats().catch(() => []);
            const sorted = allStats.sort((a, b) => b.closed - a.closed).slice(0, topN);
            if (sorted.length === 0) return;

            const lines = sorted.map((s, i) => {
              const avg = s.ratings.length ? (s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length).toFixed(1) : "-";
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `**#${i + 1}**`;
              return `${medal}  <@${s.staffId}>  •  📂 ${s.claimed}  🔒 ${s.closed}  ⭐ ${avg}`;
            });

            const embed = new EmbedBuilder()
              .setColor(fmt.COLORS.accent)
              .setTitle(`<:Untitled_12:1513737758294933586>  توب ${topN} — نظام التذاكر`)
              .setDescription(lines.join("\n"))
              .setFooter({ text: fmt.BRAND.footer });

            message.channel.send({ embeds: [embed] });
          } else {
            const stats = tm.getStats(client, message.author.id);
            const avg = stats.ratings.length ? (stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length).toFixed(1) : "-";
            const embed = new EmbedBuilder()
              .setColor(fmt.COLORS.accent)
              .setTitle(`<:Untitled_12:1513737758294933586>  إحصائياتي — ${message.author.username}`)
              .addFields(
                { name: "<:Untitled_27:1513737796076966022>  مستلمة", value: `${stats.claimed}`, inline: true },
                { name: "<:Untitled_11:1513737757078327306>  مغلقة", value: `${stats.closed}`, inline: true },
                { name: "<:xqrv5hd:1506358845495316695>  التقييم", value: `${avg}/5`, inline: true }
              )
              .setFooter({ text: fmt.BRAND.footer });
            message.channel.send({ embeds: [embed] });
          }
        });
        return message.delete().catch(() => {});
      }

      if (isAdmin && (content.startsWith("-block ") || content.startsWith("-unblock "))) {
        // معالجة البلوك (نفس المنطق الأصلي لكن مع حذف الرسالة فوراً)
        message.delete().catch(() => {});
        // ... (تكملة منطق البلوك في الخلفية)
        setImmediate(async () => {
           if (content.startsWith("-block ")) {
             const parts = content.match(/^-block\s+(\d{17,19})\s+(.+?)\s+(\d+[smhd])$/i) || content.match(/^-block\s+(\d{17,19})\s+(.+)$/);
             if (!parts) return message.channel.send({ content: fmt.error("صيغة خاطئة.") });
             const targetId = parts[1];
             const reason = parts[2];
             const duration = parts.length === 4 ? parts[3] : "دائم";
             const expiresAt = parts.length === 4 ? new Date(Date.now() + parseTime(duration)) : null;
             
             client.blocked.add(targetId);
             db.blockUser(targetId, member.id, reason, duration, expiresAt).catch(() => {});
             message.channel.send({ content: fmt.success(`تم حظر \`${targetId}\`.`) });
             log(client, "TICKET_BLOCK", { userId: targetId, staffId: member.id, reason, duration });
           } else {
             const targetId = content.split(" ")[1]?.trim();
             client.blocked.delete(targetId);
             db.unblockUser(targetId).catch(() => {});
             message.channel.send({ content: fmt.success(`تم رفع الحظر عن \`${targetId}\`.`) });
             log(client, "TICKET_UNBLOCK", { userId: targetId, staffId: member.id });
           }
        });
        return;
      }
    }

    // ── أوامر الروم ───────────────────────────────────────────
    const ticket = tm.getTicketByChannel(client, message.channel.id);
    if (!ticket) return;

    const content = message.content.trim();
    const member = message.member;
    const isStaff = config.staffRoles.some((r) => member.roles.cache.has(r));
    const isAdmin = member.roles.cache.has(config.forceClaimRole) || member.permissions.has(8n);
    if (!isStaff && !isAdmin) return;

    // كابتشا الاستلام
    let captchaCode = client.captchaCodes.get(message.channel.id);
    if (!captchaCode) {
      captchaCode = await db.getCaptcha(message.channel.id).catch(() => null);
      if (captchaCode) client.captchaCodes.set(message.channel.id, captchaCode);
    }

    if (!ticket.claimedBy && captchaCode && content.toUpperCase() === captchaCode.toUpperCase()) {
      if (tm.countClaimed(client, member.id) >= config.maxClaimedPerStaff) {
        return message.reply({ content: fmt.error("وصلت للحد الأقصى.") }).then(m => setTimeout(() => m.delete(), 3000));
      }
      message.delete().catch(() => {});
      
      ticket.claimedBy = member.id;
      client.claimed.set(message.channel.id, member.id);
      db.saveActiveTicket(ticket).catch(() => {});
      tm.recordClaim(client, member.id);
      
      // تنظيف الكابتشا
      const captchaMsgId = client.captchaMsgs.get(message.channel.id);
      if (captchaMsgId) message.channel.messages.fetch(captchaMsgId).then(m => m.delete().catch(() => {})).catch(() => {});
      client.captchaCodes.delete(message.channel.id);
      db.deleteCaptcha(message.channel.id).catch(() => {});

      message.channel.send(fmt.claimedContainer(member));
      log(client, "TICKET_CLAIM", { ticketId: ticket.ticketId, userId: ticket.userId, staffId: member.id });
      return;
    }

    // الردود (-r, -a, replyMode)
    const isReply = content.startsWith("-r ") || content === "-r";
    const isAnon = content.startsWith("-a ") || content === "-a";
    const replyModeOn = client.replyMode?.get(message.channel.id);

    if (isReply || isAnon || (replyModeOn && !content.startsWith("-"))) {
      const claimedBy = ticket.claimedBy || client.claimed?.get(message.channel.id);
      if (!claimedBy && !isAdmin) return message.reply({ content: fmt.error("استلم التذكرة أولاً.") });
      if (claimedBy !== member.id && !isAdmin) return;

      const text = isReply || isAnon ? content.slice(3).trim() : content;
      if (!text && message.attachments.size === 0) return;

      const display = isAnon ? `**Hidden admin :** ${text}` : fmt.staffMessage(member, text);
      const files = [...message.attachments.values()].map(a => a.url);

      // إرسال للمستخدم في الخلفية لسرعة استجابة الروم
      setImmediate(async () => {
        try {
          const u = await client.users.fetch(ticket.userId);
          await u.send({ content: display, files: files.length ? [files[0]] : [] }).catch(() => {});
        } catch (e) {}
      });

      message.channel.send({ content: display, files: files.length ? [files[0]] : [] });
      message.delete().catch(() => {});
      
      tm.addMessage(client, ticket.userId, {
        author: isAnon ? "Hidden Admin" : (member.displayName || member.user.username),
        content: text || "[مرفق]",
        isStaff: true,
      });
      return;
    }

    // أوامر الإغلاق وتغيير الاسم
    if (content === "-dr" || content === "-fdr") {
       message.delete().catch(() => {});
       client.claimed?.delete(message.channel.id);
       client.replyMode?.delete(message.channel.id);
       ticket.claimedBy = null;
       message.channel.send({ content: fmt.notify("🔄", "تم ترك الاستلام", `<@${member.id}> ترك التذكرة.`) });
       sendNewCaptcha(client, message.channel.id);
       return;
    }

    if (content === "-fr") {
      return handleClose(client, message.channel.id, member, ticket, false);
    }

    if (content.startsWith("-cr")) {
      const timeArg = content.split(" ")[1];
      const ms = timeArg ? parseTime(timeArg) : null;
      if (!ms) return handleClose(client, message.channel.id, member, ticket, false);
      
      message.delete().catch(() => {});
      message.channel.send({ content: fmt.notify("⏱️", "وقت الإغلاق", `ستُغلق بعد **${timeArg}**.`) });
      const timer = setTimeout(() => handleClose(client, message.channel.id, member, ticket, true), ms);
      client.closeTimers.set(message.channel.id, timer);
      return;
    }
    
    if (content.startsWith("-name ")) {
      const newName = content.slice(6).trim().toLowerCase().replace(/\s+/g, "-");
      if (newName) {
        message.channel.setName(newName).catch(() => {});
        message.channel.send({ content: fmt.success(`تم تغيير الاسم إلى: \`${newName}\``) });
        message.delete().catch(() => {});
      }
      return;
    }
  },
};
