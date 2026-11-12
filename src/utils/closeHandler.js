const {
  AttachmentBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextInputBuilder,
  TextInputStyle,
  ModalBuilder,
} = require("discord.js");
const config = require("../../config.js");
const fmt = require("./format.js");
const tm = require("./ticketManager.js");
const { log } = require("./logger.js");
const db = require("../database/models.js");
const { generateAdvancedTranscript } = require("./transcript.js");

async function handleClose(
  client,
  channelId,
  closer,
  ticket,
  isAutoClose = false,
  reason = '',
) {
  // تنظيف التايمر فوراً
  if (client.closeTimers.has(channelId)) {
    clearTimeout(client.closeTimers.get(channelId));
    client.closeTimers.delete(channelId);
  }

  client.replyMode?.delete(channelId);

  // تحديث حالة التذكرة في الذاكرة فوراً (سرعة البرق)
  const userId = client.ticketChans.get(channelId);
  if (!userId) return;
  
  // استخدام tm.closeTicket للتعامل مع الذاكرة والداتابيس بشكل موحد
  // لكن سنقوم ببعض العمليات يدوياً لضمان السرعة
  const closedTicket = client.tickets.get(userId);
  if (!closedTicket) return;

  // حذف من الذاكرة فوراً لمنع أي تداخل
  client.ticketChans.delete(channelId);
  client.claimed.delete(channelId);
  client.tickets.delete(userId);

  // إرسال رسالة الإغلاق وحذف الروم فوراً (بدون انتظار أي شيء آخر)
  const supportGuild = client.guilds.cache.get(config.supportGuildId);
  const channel = supportGuild?.channels.cache.get(channelId);
  
  if (channel) {
    channel.send(fmt.closedRoomMsg(closedTicket.ticketId)).catch(() => {});
    // حذف الروم بعد ثانيتين لضمان وصول الرسالة
    setTimeout(() => channel.delete().catch(() => {}), 2000);
  }

  // ── كل العمليات الثقيلة (DB, DM, Transcript, Log) في الخلفية ────────────────
  setImmediate(async () => {
    try {
      // تحديث DB
      closedTicket.status = 'closed';
      closedTicket.closedAt = Date.now();
      db.deleteActiveTicket(userId).catch(() => {});
      
      // إشعار الداشبورد
      try { const { emitUpdate } = require('../../dashboard/server.js'); emitUpdate('ticket:close', { ticketId: closedTicket.ticketId, channelId }); } catch {}

      const closerName = closer.displayName || closer.username || "الدعم الفني";
      if (closer.id) {
        tm.recordClose(client, closer.id).catch(() => {});
        db.logTicketClose({
          ticketId: closedTicket.ticketId,
          staffId: closer.id,
          messages: closedTicket.messages?.length || 0,
        }).catch(() => {});
      }

      // إرسال DM وتقييم للمستخدم (ModMail Core)
      const userObj = await client.users.fetch(closedTicket.userId).catch(() => null);
      if (userObj) {
        const menu = new StringSelectMenuBuilder()
          .setCustomId(`rate_${closer.id}_${closedTicket.ticketId}`)
          .setPlaceholder("قيّم الخدمة...")
          .addOptions(
            new StringSelectMenuOptionBuilder().setLabel("⭐⭐⭐⭐⭐").setDescription("5/5").setValue("5"),
            new StringSelectMenuOptionBuilder().setLabel("⭐⭐⭐⭐").setDescription("4/5").setValue("4"),
            new StringSelectMenuOptionBuilder().setLabel("⭐⭐⭐").setDescription("3/5").setValue("3"),
            new StringSelectMenuOptionBuilder().setLabel("⭐⭐").setDescription("2/5").setValue("2"),
            new StringSelectMenuOptionBuilder().setLabel("⭐").setDescription("1/5").setValue("1"),
          );
        
        userObj.send(fmt.ticketClosedDM(closedTicket.ticketId, closerName, reason)).catch(() => {});
        userObj.send({
          content: "> قيّم الخدمة من القائمة أدناه:",
          components: [new ActionRowBuilder().addComponents(menu)],
        }).catch(() => {});
      }

      // ترانسكريبت ولوق
      const transcriptPath = await generateAdvancedTranscript(closedTicket, channel).catch(() => null);
      const logCh = supportGuild?.channels.cache.get(config.transcriptChannelId);
      
      if (logCh && transcriptPath) {
        const fileAttachment = new AttachmentBuilder(transcriptPath, { name: `ticket-${closedTicket.ticketId}.html` });
        const sentMsg = await logCh.send({
          content: [
            `## 📄  ترانسكريبت — \`#${closedTicket.ticketId}\``,
            `> 👤  المستخدم: <@${closedTicket.userId}> \`(${closedTicket.userTag})\``,
            `> 🛡️  أُغلقت بواسطة: **${closerName}**`,
            reason ? `> 📝  السبب: ${reason}` : "",
            `> 💬  ${closedTicket.messages?.length ?? 0} رسالة`,
            isAutoClose ? `> ⏱️  إغلاق تلقائي` : "",
          ].filter(Boolean).join("\n"),
          files: [fileAttachment],
        });
        
        const attachment = sentMsg.attachments.first();
        if (attachment) {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel("📥  تحميل السجل").setStyle(ButtonStyle.Link).setURL(attachment.url),
          );
          sentMsg.edit({ components: [row] }).catch(() => {});
        }
      }

      log(client, "TICKET_CLOSE", {
        ticketId: closedTicket.ticketId,
        userId: closedTicket.userId,
        staffId: closer.id,
        messageCount: closedTicket.messages?.length ?? 0,
        isAutoClose,
      });
    } catch (err) {
      console.error("[CLOSE_HANDLER_ERR]", err);
    }
  });
}

module.exports = { handleClose };
