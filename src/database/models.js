const mongoose = require("mongoose");

// ─── عداد الترقيم ────────────────────────────────────────────────
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.model("Counter", CounterSchema);

async function getNextTicketId() {
  const doc = await Counter.findByIdAndUpdate(
    "ticket_counter",
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return doc.seq;
}

// ─── إحصائيات الستاف ─────────────────────────────────────────────
const StaffStatsSchema = new mongoose.Schema({
  staffId: { type: String, required: true, unique: true },
  claimed: { type: Number, default: 0 },
  closed: { type: Number, default: 0 },
  ratings: { type: [Number], default: [] },
});
const StaffStats = mongoose.model("StaffStats", StaffStatsSchema);

async function getStaffStats(staffId) {
  const doc = await StaffStats.findOne({ staffId });
  if (!doc) return { claimed: 0, closed: 0, ratings: [] };
  return { claimed: doc.claimed, closed: doc.closed, ratings: doc.ratings };
}

async function incrementClaimed(staffId) {
  await StaffStats.findOneAndUpdate(
    { staffId },
    { $inc: { claimed: 1 } },
    { upsert: true },
  );
}

async function incrementClosed(staffId) {
  await StaffStats.findOneAndUpdate(
    { staffId },
    { $inc: { closed: 1 } },
    { upsert: true },
  );
}

async function addRating(staffId, rating) {
  await StaffStats.findOneAndUpdate(
    { staffId },
    { $push: { ratings: rating } },
    { upsert: true },
  );
}

async function getAllStaffStats() {
  const docs = await StaffStats.find().sort({ closed: -1 });
  return docs.map((d) => ({
    staffId: d.staffId,
    claimed: d.claimed,
    closed: d.closed,
    ratings: d.ratings,
  }));
}

// ─── المحظورون ───────────────────────────────────────────────────
const BlockedSchema = new mongoose.Schema({
  userId:    { type: String, required: true, unique: true },
  blockedBy: { type: String, required: true },
  reason:    { type: String, default: '' },
  duration:  { type: String, default: '' },      // نص للعرض فقط: "1d" أو "دائم"
  expiresAt: { type: Date,   default: null },    // null = حظر دائم
  blockedAt: { type: Date,   default: Date.now },
});
const Blocked = mongoose.model("Blocked", BlockedSchema);

// دالة مساعدة: هل انتهت مدة الحظر؟
function isExpired(doc) {
  if (!doc) return true;
  if (!doc.expiresAt) return false; // دائم
  return new Date() > new Date(doc.expiresAt);
}

async function blockUser(userId, blockedBy, reason = '', duration = '', expiresAt = null) {
  await Blocked.findOneAndUpdate(
    { userId },
    { blockedBy, reason, duration, expiresAt: expiresAt || null, blockedAt: new Date() },
    { upsert: true },
  );
}

async function unblockUser(userId) {
  await Blocked.deleteOne({ userId });
}

// حذف جميع المحظورين المنتهية مدتهم من قاعدة البيانات
async function cleanExpiredBlocks() {
  const result = await Blocked.deleteMany({
    expiresAt: { $ne: null, $lt: new Date() },
  });
  return result.deletedCount;
}

async function isBlocked(userId) {
  const doc = await Blocked.findOne({ userId }).lean();
  if (!doc) return false;
  if (isExpired(doc)) {
    // انتهت المدة → احذفها تلقائياً
    await Blocked.deleteOne({ userId });
    return false;
  }
  return true;
}

async function getBlockedInfo(userId) {
  const doc = await Blocked.findOne({ userId }).lean();
  if (!doc) return null;
  if (isExpired(doc)) {
    await Blocked.deleteOne({ userId });
    return null;
  }
  return doc;
}

async function getAllBlocked() {
  // نُرجع فقط المحظورين الذين لم تنتهِ مدتهم
  const docs = await Blocked.find({
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ],
  });
  return docs.map((d) => d.userId);
}

// ─── كود الكابتشا ─────────────────────────────────────────────
const CaptchaSchema = new mongoose.Schema({
  channelId: { type: String, required: true, unique: true },
  code:      { type: String, required: true },
  createdAt: { type: Date,   default: Date.now, expires: 3600 }, // تنتهي بعد ساعة
});
const Captcha = mongoose.model('Captcha', CaptchaSchema);

async function saveCaptcha(channelId, code) {
  await Captcha.findOneAndUpdate(
    { channelId },
    { code, createdAt: new Date() },
    { upsert: true },
  );
}

async function getCaptcha(channelId) {
  const doc = await Captcha.findOne({ channelId });
  return doc ? doc.code : null;
}

async function deleteCaptcha(channelId) {
  await Captcha.deleteOne({ channelId });
}
const ActiveTicketSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  userTag: { type: String, required: true },
  channelId: { type: String, required: true },
  ticketId: { type: Number, required: true },
  issue: { type: String, default: "" },
  claimedBy: { type: String, default: null },
  openedAt: { type: Number, default: Date.now },
});
const ActiveTicket = mongoose.model("ActiveTicket", ActiveTicketSchema);

async function saveActiveTicket(data) {
  await ActiveTicket.findOneAndUpdate(
    { userId: data.userId },
    {
      userTag: data.userTag,
      channelId: data.channelId,
      ticketId: data.ticketId,
      issue: data.issue,
      claimedBy: data.claimedBy,
      openedAt: data.openedAt,
    },
    { upsert: true },
  );
}

async function deleteActiveTicket(userId) {
  await ActiveTicket.deleteOne({ userId });
}

async function getAllActiveTickets() {
  return ActiveTicket.find();
}
// ─── سجل التذاكر ─────────────────────────────────────────────────
const TicketLogSchema = new mongoose.Schema({
  ticketId: { type: Number, required: true, unique: true },
  userId: { type: String, required: true },
  userTag: { type: String, required: true },
  staffId: { type: String, default: null },
  issue: { type: String, default: "" },
  messages: { type: Number, default: 0 },
  openedAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null },
});
const TicketLog = mongoose.model("TicketLog", TicketLogSchema);

async function logTicketOpen({ ticketId, userId, userTag, issue }) {
  await TicketLog.create({ ticketId, userId, userTag, issue });
}

async function logTicketClose({ ticketId, staffId, messages }) {
  await TicketLog.findOneAndUpdate(
    { ticketId },
    { staffId, messages, closedAt: new Date() },
  );
}

// ─── Whitelist الداشبورد ──────────────────────────────────────────
const WhitelistSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true, trim: true },
  addedBy:   { type: String, required: true },
  note:      { type: String, default: '', maxlength: 100 },
  addedAt:   { type: Date, default: Date.now },
});
const Whitelist = mongoose.model('Whitelist', WhitelistSchema);

async function addToWhitelist(discordId, addedBy, note = '') {
  return Whitelist.findOneAndUpdate(
    { discordId },
    { addedBy, note, addedAt: new Date() },
    { upsert: true, new: true },
  );
}

async function removeFromWhitelist(discordId) {
  return Whitelist.deleteOne({ discordId });
}

async function getWhitelist() {
  return Whitelist.find().sort({ addedAt: -1 }).lean();
}

async function isWhitelisted(discordId) {
  return !!(await Whitelist.findOne({ discordId }));
}

module.exports = {
  getNextTicketId,
  getStaffStats,
  incrementClaimed,
  incrementClosed,
  addRating,
  getAllStaffStats,
  blockUser,
  unblockUser,
  isBlocked,
  getBlockedInfo,
  getAllBlocked,
  cleanExpiredBlocks,
  logTicketOpen,
  logTicketClose,
  saveActiveTicket,
  deleteActiveTicket,
  getAllActiveTickets,
  saveCaptcha,
  getCaptcha,
  deleteCaptcha,
  addToWhitelist,
  removeFromWhitelist,
  getWhitelist,
  isWhitelisted,
};
