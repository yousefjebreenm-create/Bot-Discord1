const { deployCommands } = require("../commands/index.js");
const db = require("../database/models.js");

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    console.log(`\x1b[32m[BOT]\x1b[0m Online as ${client.user.tag}`);
    
    // تنفيذ العمليات في الخلفية للسماح للبوت بالبدء فوراً
    setImmediate(async () => {
      // 1. نشر الأوامر
      deployCommands(client.user.id).catch(() => {});

      // 2. تحميل المحظورين للذاكرة (للسرعة)
      const blocked = await db.getAllBlocked().catch(() => []);
      for (const uid of blocked) client.blocked.add(uid);
      console.log(`\x1b[32m[MongoDB]\x1b[0m Loaded ${blocked.length} blocked users.`);

      // 3. تنظيف المحظورين المنتهية مدتهم
      db.cleanExpiredBlocks().then(cleaned => {
        if (cleaned > 0) console.log(`\x1b[33m[MongoDB]\x1b[0m Removed ${cleaned} expired block(s).`);
      }).catch(() => {});

      // 4. تحميل إحصائيات الستاف
      const allStats = await db.getAllStaffStats().catch(() => []);
      for (const s of allStats) {
        client.staffStats.set(s.staffId, {
          claimed: s.claimed,
          closed: s.closed,
          ratings: s.ratings,
        });
      }
      console.log(`\x1b[32m[MongoDB]\x1b[0m Loaded stats for ${allStats.length} staff members.`);

      // 5. استعادة التذاكر النشطة
      const activeTickets = await db.getAllActiveTickets().catch(() => []);
      for (const t of activeTickets) {
        const ticketData = {
          ticketId: t.ticketId,
          userId: t.userId,
          userTag: t.userTag,
          channelId: t.channelId,
          issue: t.issue,
          claimedBy: t.claimedBy,
          messages: [],
          openedAt: t.openedAt,
          closedAt: null,
          status: "open",
        };
        client.tickets.set(t.userId, ticketData);
        client.ticketChans.set(t.channelId, t.userId);
        if (t.claimedBy) client.claimed.set(t.channelId, t.claimedBy);
      }
      console.log(`\x1b[32m[MongoDB]\x1b[0m Restored ${activeTickets.length} active tickets.`);
    });

    // فحص دوري كل دقيقة لرفع حظر المنتهيين تلقائياً
    setInterval(async () => {
      const removed = await db.cleanExpiredBlocks().catch(() => 0);
      if (removed > 0) {
        const current = await db.getAllBlocked().catch(() => []);
        client.blocked.clear();
        for (const uid of current) client.blocked.add(uid);
      }
    }, 60 * 1000);
  },
};
