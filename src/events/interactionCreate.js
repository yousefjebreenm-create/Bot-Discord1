const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");

const config = require("../../config.js");
const fmt = require("../utils/format.js");
const tm = require("../utils/ticketManager.js");
const { log } = require("../utils/logger.js");
const dbModels = require("../database/models.js");
const { generateCaptchaImage } = require("../utils/captchaGen.js");

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    // ══ /panel ══════════════════════════════════════════════════
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "panel"
    ) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild))
        return interaction.reply({
          content: fmt.error("ليس لديك صلاحية."),
          flags: MessageFlags.Ephemeral,
        });
      await interaction.channel.send(fmt.ticketPanel());
      return interaction.reply({
        content: fmt.success("تم إرسال اللوحة!"),
        flags: MessageFlags.Ephemeral,
      });
    }

    // ══ /admin-panel ════════════════════════════════════════════
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "admin-panel"
    ) {
      const isAdmin =
        interaction.member.roles.cache.has(config.forceClaimRole) ||
        interaction.member.permissions.has(PermissionFlagsBits.Administrator);
      if (!isAdmin)
        return interaction.reply({
          content: fmt.error("هذا الأمر للإدارة فقط."),
          flags: MessageFlags.Ephemeral,
        });
      const panel = fmt.adminPanelMain();
      return interaction.reply({
        ...panel,
        flags: panel.flags | MessageFlags.Ephemeral,
      });
    }

    // ══ ticket_info ═════════════════════════════════════════════
    if (interaction.isButton() && interaction.customId === "ticket_info") {
      const c = new ContainerBuilder()
        .setAccentColor(fmt.YELLOW)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "## <:emojis22:1489253148760604672>  قوانين التذاكر",
          ),
        )
        .addSeparatorComponents(fmt.sep())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "**R1** — اشرح مشكلتك أو طلبك بشكل واضح ومفصل\n" +
              "**R2** — يمنع فتح أكثر من تذكرة لنفس المشكلة أو الطلب\n" +
              "**R3** — يرجى التحلي بالاحترام وعدم الإساءة للإدارة أو الأعضاء\n" +
              "**R4** — يمنع السبام أو المنشن المتكرر داخل التذكرة\n" +
              "**R5** — يمنع فتح التذاكر للمزاح أو إضاعة وقت فريق الدعم\n" +
              "**R6** — أرفق الأدلة والصور عند الحاجة لتسريع معالجة طلبك\n" +
              "**R7** — يمنع إرسال الروابط أو الملفات المشبوهة داخل التذكرة\n" +
              "**R8** — يرجى الانتظار حتى يتم الرد وعدم تكرار الرسائل باستمرار\n" +
              "**R9** — أي محاولة للتحايل أو تقديم معلومات مضللة قد تؤدي لرفض الطلب\n" +
              "**R10** — يحق للإدارة إغلاق التذكرة بعد حل المشكلة أو عند المخالفة",
          ),
        )
        .addSeparatorComponents(fmt.sep(false))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "-# <:emojis13:1489252924088385619>  Hell | Management Team",
          ),
        );
      return interaction.reply({
        components: [c],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
    }

    // ══ لوحة الأدمن ap_* ════════════════════════════════════════
    if (interaction.isButton() && interaction.customId.startsWith("ap_")) {
      const isAdmin =
        interaction.member?.roles?.cache?.has(config.forceClaimRole) ||
        interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);
      if (!isAdmin)
        return interaction.reply({
          content: fmt.error("غير مصرح."),
          flags: MessageFlags.Ephemeral,
        });

      client.adminSessions = client.adminSessions || new Map();

      if (interaction.customId === "ap_emojis") {
        client.adminSessions.set(interaction.user.id, {
          mode: "emoji",
          channelId: interaction.channelId,
        });
        const c = new ContainerBuilder()
          .setAccentColor(fmt.YELLOW)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## ✏️  إعداد الإيموجيات"),
          )
          .addSeparatorComponents(fmt.sep())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**إيموجي المستخدم:** ${config.userEmoji || "👤"}\n` +
                `**إيموجيات الرتب:**\n` +
                (Object.entries(config.roleEmojis || {})
                  .map(([id, e]) => `> <@&${id}> — ${e}`)
                  .join("\n") || "> لا يوجد"),
            ),
          )
          .addSeparatorComponents(fmt.sep(false))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "-# أرسل:\n`emoji user [إيموجي]`\n`emoji role [role_id] [إيموجي]`",
            ),
          );
        return interaction.reply({
          components: [c],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
      }
      if (interaction.customId === "ap_roles") {
        client.adminSessions.set(interaction.user.id, {
          mode: "role",
          channelId: interaction.channelId,
        });
        const c = new ContainerBuilder()
          .setAccentColor(fmt.YELLOW)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## 🛡️  إعداد الرتب"),
          )
          .addSeparatorComponents(fmt.sep())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**رتب الستاف:**\n${config.staffRoles.map((id) => `> <@&${id}>`).join("\n") || "> لا يوجد"}\n\n` +
                `**رتبة الإدارة:** <@&${config.forceClaimRole}>`,
            ),
          )
          .addSeparatorComponents(fmt.sep(false))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "-# أرسل:\n`role add [role_id]`\n`role remove [role_id]`",
            ),
          );
        return interaction.reply({
          components: [c],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
      }
      if (interaction.customId === "ap_limits") {
        client.adminSessions.set(interaction.user.id, {
          mode: "limit",
          channelId: interaction.channelId,
        });
        const c = new ContainerBuilder()
          .setAccentColor(fmt.YELLOW)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## 🔢  إعداد الحدود"),
          )
          .addSeparatorComponents(fmt.sep())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**أقصى تذاكر لكل ستاف:** ${config.maxClaimedPerStaff}\n` +
                `**وقت الإغلاق التلقائي:** ${config.autoCloseMinutes} دقيقة`,
            ),
          )
          .addSeparatorComponents(fmt.sep(false))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "-# أرسل:\n`limit claimed [رقم]`\n`limit autoclose [دقائق]`",
            ),
          );
        return interaction.reply({
          components: [c],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
      }
      if (interaction.customId === "ap_channels") {
        client.adminSessions.set(interaction.user.id, {
          mode: "channel",
          channelId: interaction.channelId,
        });
        const c = new ContainerBuilder()
          .setAccentColor(fmt.YELLOW)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## 📢  إعداد القنوات"),
          )
          .addSeparatorComponents(fmt.sep())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**اللوق:** <#${config.logChannelId}>\n` +
                `**الترانسكريبت:** <#${config.transcriptChannelId}>\n` +
                `**الكوماندات:** <#${config.staffCommandsChannelId}>\n` +
                `**الكاتيقوري:** \`${config.ticketCategoryId}\``,
            ),
          )
          .addSeparatorComponents(fmt.sep(false))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "-# أرسل:\n`channel log [#ch]`\n`channel transcript [#ch]`\n`channel commands [#ch]`\n`channel category [id]`",
            ),
          );
        return interaction.reply({
          components: [c],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
      }
      if (interaction.customId === "ap_staff") {
        const allStats = [...(client.staffStats?.entries() || [])];
        const statsText =
          allStats.length === 0
            ? "لا توجد إحصائيات بعد."
            : allStats
                .map(([id, s]) => {
                  const avg = s.ratings.length
                    ? (
                        s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length
                      ).toFixed(1)
                    : "-";
                  return `<@${id}>  📂 ${s.claimed}  🔒 ${s.closed}  ⭐ ${avg}`;
                })
                .join("\n");
        const c = new ContainerBuilder()
          .setAccentColor(fmt.YELLOW)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("## 📊  إحصائيات الستاف"),
          )
          .addSeparatorComponents(fmt.sep())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `مستلمة / مغلقة / متوسط التقييم\n\n${statsText}`,
            ),
          );
        return interaction.reply({
          components: [c],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
      }
    }

    // ══ زر فتح التذكرة → Modal ══════════════════════════════════
    if (interaction.isButton() && interaction.customId === "open_ticket") {
      const userId = interaction.user.id;
      
      // التحقق من الحظر من الذاكرة (سرعة البرق)
      if (client.blocked.has(userId)) {
        // إذا كان محظوراً في الذاكرة، نجلب التفاصيل بسرعة
        setImmediate(async () => {
          const info = await tm.getBlockedInfo(userId);
          const reason   = info?.reason   || 'لم يُذكر';
          const duration = info?.duration || 'دائم';
          interaction.reply({
            content: [
              `> <:Untitled_23:1513737780629602464>  **أنت محظور من نظام التذاكر**`,
              `> <:Untitled_7:1513737863534084157>  **السبب:** ${reason}`,
              `> <:Untitled_22:1513737778939297802>  **المدة:** ${duration}`,
            ].join('\n'),
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        });
        return;
      }

      if (tm.getTicketByUser(client, userId))
        return interaction.reply({
          content: fmt.error("لديك تذكرة مفتوحة بالفعل!"),
          flags: MessageFlags.Ephemeral,
        });

      const modal = new ModalBuilder()
        .setCustomId("ticket_modal")
        .setTitle("فتح تذكرة دعم");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("ticket_issue")
            .setLabel("ما هو استفسارك؟")
            .setStyle(TextInputStyle.Paragraph)
            .setMinLength(1)
            .setMaxLength(800)
            .setRequired(true)
            .setPlaceholder("اشرح مشكلتك بالتفصيل..."),
        ),
      );
      return interaction.showModal(modal);
    }

    // ══ Modal Submit → فتح التذكرة ══════════════════════════════
    if (
      interaction.isModalSubmit() &&
      interaction.customId === "ticket_modal"
    ) {
      const userId = interaction.user.id;
      const userTag = interaction.user.username;
      const issue = interaction.fields.getTextInputValue("ticket_issue").trim();

      // فحص سريع من الذاكرة
      if (tm.getTicketByUser(client, userId))
        return interaction.reply({
          content: fmt.error("لديك تذكرة مفتوحة بالفعل."),
          flags: MessageFlags.Ephemeral,
        });

      // رد لحظي (إزالة الـ Thinking تماماً)
      await interaction.reply({
        content: fmt.success("جاري تجهيز تذكرتك..."),
        flags: MessageFlags.Ephemeral
      }).catch(() => {});

      // تنفيذ في الخلفية
      setImmediate(async () => {
        try {
          const supportGuild = client.guilds.cache.get(config.supportGuildId);
          if (!supportGuild) {
            return interaction.editReply({ content: fmt.error("تعذّر الوصول إلى سيرفر الدعم.") }).catch(() => {});
          }

          const nextTicketId = await dbModels.getNextTicketId();
          const channel = await supportGuild.channels.create({
            name: `ticket-${nextTicketId}`,
            type: ChannelType.GuildText,
            parent: config.ticketCategoryId,
            topic: `تذكرة | ${userTag} | ${userId}`,
            permissionOverwrites: [
              {
                id: supportGuild.roles.everyone,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              ...config.staffRoles.map((rId) => ({
                id: rId,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                ],
              })),
            ],
          });

          // إنشاء التذكرة (ذاكرة + داتابيس)
          const ticket = await tm.createTicket(client, {
            userId,
            userTag,
            channelId: channel.id,
            issue,
            ticketId: nextTicketId,
          });

          // ── إرسال DM للمستخدم (ModMail Core) ──
          interaction.user.send(fmt.ticketOpenedDM(interaction.user, nextTicketId, issue)).catch(() => {});

          // ── إرسال رسالة الروم ──
          let code, attachment;
          try {
            ({ code, attachment } = await generateCaptchaImage());
          } catch (capErr) {
            console.error("[CAPTCHA_GEN_ERR]", capErr);
            throw capErr;
          }
          client.captchaCodes.set(channel.id, code);
          await dbModels.saveCaptcha(channel.id, code).catch(() => {});

          // فصل المنشن عن الهيدر لتجنب خطأ Components V2
          await channel.send({ content: `<@&${config.staffRoles[0]}> تذكرة جديدة!` }).catch(() => {});
          
          const roomMsg = await channel.send({
            ...fmt.ticketRoomHeader(interaction.user, nextTicketId, issue, channel.id),
          });

          const captchaMsg = await channel.send({
            ...fmt.captchaImageCard(),
            files: [attachment],
          });
          client.captchaMsgs.set(channel.id, captchaMsg.id);

          // تحديث رد المستخدم برابط الروم (اختياري في ModMail لكنه مفيد للستاف إذا فتحوا تذكرة)
          interaction.editReply({
            content: fmt.success(`تم فتح تذكرتك بنجاح قم بتفقد الرسائل الخاصه بك`),
          }).catch(() => {});

          log(client, "TICKET_OPEN", {
            ticketId: nextTicketId,
            userId,
            userTag,
            issue,
          });
        } catch (err) {
          console.error("[MODMAIL_OPEN_ERR]", err);
          client.tickets.delete(userId); // تنظيف في حال الفشل
          interaction.editReply({
            content: fmt.error("فشل إنشاء التذكرة، يرجى المحاولة لاحقاً."),
          }).catch(() => {});
        }
      });
      return;
    }

    // ══ التقييم ══════════════════════════════════════════════════
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("rate_")) {
      const parts = interaction.customId.split("_");
      const staffId = parts[1];
      const ticketId = parts[2];
      const rating = parseInt(interaction.values[0]);

      // ── منع السبام: فحص إذا قيّم المستخدم هذه التذكرة مسبقاً ──
      client.ratedTickets = client.ratedTickets || new Set();
      const rateKey = `${interaction.user.id}_${ticketId}`;
      if (client.ratedTickets.has(rateKey)) {
        return interaction.reply({
          content: fmt.error("لقد قيّمت هذه التذكرة مسبقاً، لا يمكن التقييم أكثر من مرة."),
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }

      // ── تعطيل السيلكت منيو فوراً لمنع أي نقرات إضافية ──
      const disabledMenu = new StringSelectMenuBuilder()
        .setCustomId(interaction.customId)
        .setPlaceholder("✅ تم إرسال التقييم")
        .setDisabled(true)
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel("⭐⭐⭐⭐⭐").setDescription("5/5").setValue("5"),
          new StringSelectMenuOptionBuilder().setLabel("⭐⭐⭐⭐").setDescription("4/5").setValue("4"),
          new StringSelectMenuOptionBuilder().setLabel("⭐⭐⭐").setDescription("3/5").setValue("3"),
          new StringSelectMenuOptionBuilder().setLabel("⭐⭐").setDescription("2/5").setValue("2"),
          new StringSelectMenuOptionBuilder().setLabel("⭐").setDescription("1/5").setValue("1"),
        );

      // تعديل رسالة التقييم لتعطيل الكومبوننت
      interaction.message.edit({
        components: [new ActionRowBuilder().addComponents(disabledMenu)],
      }).catch(() => {});

      // نفتح Modal لطلب التعليق
      const modal = new ModalBuilder()
        .setCustomId(`ratecomment_${staffId}_${ticketId}_${rating}`)
        .setTitle(`تقييم الخدمة — ${rating}/5`);

      const commentInput = new TextInputBuilder()
        .setCustomId("rateComment")
        .setLabel("تعليقك (اختياري)")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("اكتب تعليقك هنا...")
        .setRequired(false)
        .setMaxLength(500);

      modal.addComponents(new ActionRowBuilder().addComponents(commentInput));
      return interaction.showModal(modal).catch(() => {});
    }

    // ══ استقبال Modal التقييم ════════════════════════════════════
    if (interaction.isModalSubmit() && interaction.customId.startsWith("ratecomment_")) {
      const parts = interaction.customId.split("_");
      const staffId = parts[1];
      const ticketId = parts[2];
      const rating = parseInt(parts[3]);
      const comment = interaction.fields.getTextInputValue("rateComment")?.trim() || "";

      // ── تسجيل التقييم في الذاكرة لمنع التكرار ──
      client.ratedTickets = client.ratedTickets || new Set();
      const rateKey = `${interaction.user.id}_${ticketId}`;
      
      // فحص أخير قبل الحفظ (حماية مزدوجة)
      if (client.ratedTickets.has(rateKey)) {
        return interaction.reply({
          content: fmt.error("لقد قيّمت هذه التذكرة مسبقاً."),
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
      client.ratedTickets.add(rateKey);

      await interaction.reply({
        content: fmt.success(`شكراً لتقييمك (**${rating}/5**)!`),
        flags: 64,
      }).catch(() => {});

      setImmediate(async () => {
        try {
          await tm.recordRating(client, staffId, rating);
          log(client, "TICKET_RATE", { ticketId, staffId, rating, comment });

          // إرسال Container V2 لقناة التقييم المخصصة
          const mainGuild = client.guilds.cache.get(config.mainGuildId);
          const staffMember = await mainGuild?.members.fetch(staffId).catch(() => null);

          const ratingChannel = mainGuild?.channels.cache.get(config.ratingChannelId || "1514002598712315975");
          if (ratingChannel && staffMember) {
            const embed = fmt.ratingEmbed(interaction.user, ticketId, staffMember, rating, comment);
            const commentText = embed._ratingComment;
            delete embed._ratingComment;
            await ratingChannel.send(embed);
            if (commentText) {
              await ratingChannel.send({ content: `\`\`\`\n${commentText}\n\`\`\`` });
            }
          }
        } catch (e) {
          console.error("[RATING_PROCESS_ERR]", e);
        }
      });
    }
  },
};
