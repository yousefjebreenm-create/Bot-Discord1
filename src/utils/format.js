const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  MediaGalleryBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const { COLORS, EMOJI, BUTTON_EMOJI, EMOJI_URL, BRAND } = require("./ui.js");

// alias للتوافق مع الكود القديم اللي يستخدم YELLOW أو fmt.YELLOW
const YELLOW = COLORS.accent;

function sep(divider = true) {
  return new SeparatorBuilder()
    .setDivider(divider)
    .setSpacing(SeparatorSpacingSize.Small);
}
function txt(content) {
  return new TextDisplayBuilder().setContent(content);
}

function getStaffEmoji(member) {
  const config = require("../../config.js");
  if (!member?.roles?.cache) return "🔧";
  const sortedRoles = [...member.roles.cache.values()]
    .filter((r) => config.roleEmojis?.[r.id])
    .sort((a, b) => b.position - a.position);
  if (sortedRoles.length === 0) return "🔧";
  return config.roleEmojis[sortedRoles[0].id];
}

// ─── توليد كود كابتشا من 4 أرقام ───────────────────────────────
function generateCaptcha() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ─── لوحة التذاكر العامة ────────────────────────────────────────
function ticketPanel(bannerUrl) {
  const c = new ContainerBuilder()
    .setAccentColor(YELLOW)
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems((item) =>
        item.setURL(
          bannerUrl ||
          "https://cdn.discordapp.com/attachments/1445938421032943707/1516779825174544444/2fn9bj1.png?ex=6a33e2ca&is=6a32914a&hm=2d4703a80509efcd0da8446c986fffb31a3f853658b8f4bda3524a21969758ca&",
        ),
      ),
    )
    .addSeparatorComponents(sep())
    .addTextDisplayComponents(
      txt(`> # ${EMOJI.support} ${BRAND.panelTitle}`),
    )
    .addSeparatorComponents(sep())
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          txt(`### ${EMOJI.create} Create —>\n-# لإنشاء تذكرة والتواصل مع الدعم الفني\n-# • اضغط الزر أدناه لفتح تذكرة جديدة\n-# • اشرح مشكلتك بوضوح ليتم مساعدتك بسرعة\n-# • لا تفتح أكثر من تذكرة في نفس الوقت`),
        )
        .setThumbnailAccessory((t) =>
          t.setURL(EMOJI_URL.create),
        ),
    )
    .addSeparatorComponents(sep())
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          txt(`### ${EMOJI.rules} Rules —>\n-# لرؤية قوانين وأنظمة الديسكورد\n-# • يُمنع إساءة استخدام نظام التذاكر\n-# • احترم فريق الدعم في جميع الأوقات\n-# • أي تذكرة مخالفة ستُغلق فوراً`),
        )
        .setThumbnailAccessory((t) =>
          t.setURL(EMOJI_URL.rules),
        ),
    )
    .addSeparatorComponents(sep())
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          txt(`### ${EMOJI.info} Info —>\n-# لرؤية معلومات وأنظمة التذاكر\n-# • أوقات الرد تختلف حسب انشغال الفريق\n-# • تأكد من تفعيل الخاص لاستقبال الردود\n-# • يمكنك إغلاق تذكرتك بكتابة \`-er\` في الخاص`),
        )
        .setThumbnailAccessory((t) =>
          t.setURL(EMOJI_URL.info),
        ),
    )
    .addSeparatorComponents(sep(false))
    .addTextDisplayComponents(
      txt(`-# > \`${BRAND.footerSub}\`\n-# ${BRAND.footer} • Hell Discord`),
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("open_ticket")
          .setLabel("Create")
          .setEmoji(BUTTON_EMOJI.create)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setURL(
            "https://discord.com/channels/1383091595934699640/1454612037798989968",
          )
          .setLabel("Rules")
          .setEmoji(BUTTON_EMOJI.rules)
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setCustomId("ticket_info")
          .setLabel("Info")
          .setEmoji(BUTTON_EMOJI.info)
          .setStyle(ButtonStyle.Secondary),
      ),
    );
  return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ─── DM فتح التذكرة ─────────────────────────────────────────────
function ticketOpenedDM(user, ticketId, issue) {
  const c = new ContainerBuilder()
    .setAccentColor(YELLOW)
    .addTextDisplayComponents(txt(`## ${EMOJI.ticket} تم فتح تذكرتك ${user.username}`))
    .addSeparatorComponents(sep())
    .addTextDisplayComponents(
      txt(`${EMOJI.ticketNum}  رقم التذكرة — \`#${ticketId}\``),
      txt(`-# الحالة: بانتظار الاستلام`),
    )
    .addSeparatorComponents(sep())
    .addTextDisplayComponents(txt(`** ${EMOJI.question}  استفسارك:**`), txt(`> ${issue}`))
    .addSeparatorComponents(sep(false))
    .addTextDisplayComponents(
      txt(`-# ${EMOJI.dm}  راسلنا هنا مباشرةً — للإغلاق اكتب \`-er\``),
    );
  return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ─── رسالة روم التذكرة ──────────────────────────────────────────
function ticketRoomHeader(user, ticketId, issue, channelId) {
  const joined = user.createdAt
    ? `<t:${Math.floor(user.createdAt / 1000)}:R>`
    : "غير معروف";
  const c = new ContainerBuilder()
    .setAccentColor(YELLOW)
    .addTextDisplayComponents(txt(`## ${EMOJI.ticket}  تذكرة جديدة — #${ticketId}`))
    .addSeparatorComponents(sep())
    .addTextDisplayComponents(
      txt(`${EMOJI.user}  **المستخدم** — <@${user.id}>`),
      txt(`${EMOJI.userId}  **المعرّف** — \`${user.id}\``),
      txt(`${EMOJI.ticketNum}  **الحساب** — ${joined}`),
    )
    .addSeparatorComponents(sep())
    .addTextDisplayComponents(txt(`**${EMOJI.question}  الاستفسار:**`), txt(`> ${issue}`))
    .addSeparatorComponents(sep(false))
    .addTextDisplayComponents(
      txt("-# للرد: `-r [الكلام]`  •  للاستلام: اكتب كود الكابتشا أدناه"),
    );
  return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ─── كارد كود الكابتشا للاستلام (نصي — احتياطي) ─────────────────
function captchaCard(code) {
  const c = new ContainerBuilder()
    .setAccentColor(YELLOW)
    .addTextDisplayComponents(
      txt(`## ${EMOJI.ticketNum}  كود الاستلام`),
    )
    .addSeparatorComponents(sep())
    .addTextDisplayComponents(
      txt(`### \`\`\`${code}\`\`\``),
      txt(`-# اكتب هذا الكود في الروم لاستلام التذكرة`),
    )
    .addSeparatorComponents(sep(false))
    .addTextDisplayComponents(
      txt(`-# ${EMOJI.dm}  ${BRAND.footer}`),
    );
  return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ─── كارد كود الكابتشا بصورة حقيقية (الرئيسي) ──────────────────
// ملاحظة: ترجع content نصي عادي لأن files لا تعمل مع IsComponentsV2
function captchaImageCard() {
  return {
    content: [
      `## ${EMOJI.ticketNum}  كود الاستلام`,
      `-# اكتب الكود الظاهر في الصورة أدناه لاستلام التذكرة`,
      `-# ${EMOJI.dm}  ${BRAND.footer}`,
    ].join("\n"),
  };
}

// ─── استلام التذكرة ─────────────────────────────────────────────
function claimedContainer(member) {
  const emoji = getStaffEmoji(member);
  const name = member.displayName || member.user?.username || "الدعم الفني";
  const c = new ContainerBuilder()
    .setAccentColor(YELLOW)
    .addTextDisplayComponents(
      txt(`${EMOJI.claimed}  **تم الاستلام** — ${emoji} **${name}**`),
      txt('-# استخدم `-dr` لترك الاستلام'),
    );
  return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ─── DM إغلاق التذكرة ───────────────────────────────────────────
function ticketClosedDM(ticketId, staffName, reason = '') {
  const c = new ContainerBuilder()
    .setAccentColor(YELLOW)
    .addTextDisplayComponents(txt(`## ${EMOJI.close}  تم إغلاق تذكرتك`))
    .addSeparatorComponents(sep())
    .addTextDisplayComponents(
      txt(`${EMOJI.ticket}  رقم التذكرة — \`#${ticketId}\``),
      txt(`${EMOJI.user}  أُغلقت بواسطة — **${staffName || "الدعم الفني"}**`),
      ...(reason ? [txt(`📝  السبب — ${reason}`)] : []),
    )
    .addSeparatorComponents(sep(false))
    .addTextDisplayComponents(txt("-# قيّم خدمتنا من القائمة أدناه 💙"));
  return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ─── رسالة الإغلاق في الروم ─────────────────────────────────────
function closedRoomMsg(ticketId) {
  const c = new ContainerBuilder()
    .setAccentColor(YELLOW)
    .addTextDisplayComponents(
      txt(`${EMOJI.close}  **تذكرة #${ticketId} مغلقة**`),
      txt("-# سيتم حذف هذا الروم خلال 5 ثواني..."),
    );
  return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ─── رسائل عادية ────────────────────────────────────────────────
function userMessage(user, content) {
  const config = require("../../config.js");
  return `${config.userEmoji || "👤"} **${user.username} : ** ${content}`;
}
function staffMessage(member, content) {
  return `${getStaffEmoji(member)} **${member.displayName || member.user?.username || "الدعم"} : ** ${content}`;
}

// ─── مساعدات ────────────────────────────────────────────────────
function notify(icon, title, desc) {
  return [`${icon}  **${title}**`, desc ? `> ${desc}` : ""]
    .filter(Boolean)
    .join("\n");
}
function error(msg) {
  return `> ${EMOJI.error}  ${msg}`;
}
function success(msg) {
  return `> ${EMOJI.success}  ${msg}`;
}

// ─── لوحة الأدمن ────────────────────────────────────────────────
function adminPanelMain() {
  const c = new ContainerBuilder()
    .setAccentColor(YELLOW)
    .addTextDisplayComponents(txt("## 👑  لوحة تحكم الإدارة"))
    .addSeparatorComponents(sep())
    .addTextDisplayComponents(txt("اختر القسم الذي تريد إدارته:"))
    .addSeparatorComponents(sep(false))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ap_emojis")
          .setLabel("الإيموجيات")
          .setEmoji("✏️")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("ap_roles")
          .setLabel("الرتب")
          .setEmoji("🛡️")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("ap_limits")
          .setLabel("الحدود")
          .setEmoji("🔢")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("ap_channels")
          .setLabel("القنوات")
          .setEmoji("📢")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("ap_staff")
          .setLabel("إحصائيات الستاف")
          .setEmoji("📊")
          .setStyle(ButtonStyle.Secondary),
      ),
    );
  return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ─── رسالة التقييم الاحترافية للسيرفر الرئيسي ──────────────────
function ratingEmbed(user, ticketId, staffMember, rating, comment = '') {
  const stars = "⭐".repeat(rating) + "".repeat(5 - rating);
  const avatarURL = typeof user.displayAvatarURL === 'function'
    ? user.displayAvatarURL({ extension: 'png', size: 64 })
    : user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
      : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) >> 22n) % 6}.png`;

  const c = new ContainerBuilder()
    .setAccentColor(YELLOW)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          txt(`## <:xqrv5hd:1506358845495316695> **Service Feedback**`),
          txt(`> \`CodeX | support System\`\n__**نتشرف بك لتقييم خدمتنا <:Untitled_8:1513737865316667512>**__`)
        )
        .setThumbnailAccessory((t) => t.setURL(avatarURL)),
    )
    .addSeparatorComponents(sep())
    .addTextDisplayComponents(
      txt(`${EMOJI.user}  **User : ** <@${user.id}>`)
    )
    .addSeparatorComponents(sep())
    .addTextDisplayComponents(
      txt(`### ${stars} (${rating}/5)`)
    );

  if (comment) {
    c
      .addSeparatorComponents(sep())
      .addTextDisplayComponents(
        txt(" ### <:Untitled_7:1513737863534084157> Comment\n```" + comment + "```")
      );
  }

  c
    .addSeparatorComponents(sep(false))
    .addTextDisplayComponents(
      txt(`\`${BRAND.footer}\``)
    );

  return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

module.exports = {
  // ── ثوابت التصميم (re-export من ui.js للتوافق) ──
  YELLOW,
  COLORS,
  EMOJI,
  BRAND,
  // ── مساعدات البناء ──
  sep,
  txt,
  getStaffEmoji,
  generateCaptcha,
  // ── الكونتينرات ──
  ticketPanel,
  ticketOpenedDM,
  ticketRoomHeader,
  captchaCard,
  captchaImageCard,
  claimedContainer,
  ticketClosedDM,
  closedRoomMsg,
  // ── رسائل نصية ──
  userMessage,
  staffMessage,
  notify,
  error,
  success,
  adminPanelMain,
  ratingEmbed,
};
