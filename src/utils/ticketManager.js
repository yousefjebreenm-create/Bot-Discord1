const db = require('../database/models.js');

// ─── فتح تذكرة ──────────────────────────────────────────────────
async function createTicket(client, { userId, userTag, channelId, issue, ticketId: passedId }) {
  // لو مُرّر من الخارج نستخدمه — وإلا نولّده (fallback)
  const ticketId = passedId ?? await db.getNextTicketId();
  const data = {
    ticketId,
    userId,
    userTag,
    channelId,
    issue,
    claimedBy: null,
    messages: [],
    openedAt: Date.now(),
    closedAt: null,
    status: 'open',
  };
  client.tickets.set(userId, data);
  client.ticketChans.set(channelId, userId);
  await db.saveActiveTicket(data).catch(() => {});
  await db.logTicketOpen({ ticketId, userId, userTag, issue }).catch(() => {});
  return data;
}

function getTicketByUser(client, userId) {
  return client.tickets.get(userId) || null;
}

function getTicketByChannel(client, channelId) {
  const userId = client.ticketChans.get(channelId);
  if (!userId) return null;
  return client.tickets.get(userId) || null;
}

function addMessage(client, userId, { author, content, isStaff }) {
  const ticket = client.tickets.get(userId);
  if (!ticket) return;
  ticket.messages.push({ author, content, isStaff, timestamp: Date.now() });
}

async function claimTicket(client, channelId, staffId) {
  const userId = client.ticketChans.get(channelId);
  if (!userId) return false;
  const ticket = client.tickets.get(userId);
  if (!ticket) return false;
  ticket.claimedBy = staffId;
  client.claimed.set(channelId, staffId);
  // حفظ claimedBy في الداتابيس
  await db.saveActiveTicket(ticket).catch(() => {});
  return true;
}

function countClaimed(client, staffId) {
  let count = 0;
  for (const [, sId] of client.claimed) {
    if (sId === staffId) count++;
  }
  return count;
}

async function closeTicket(client, channelId)  {
  const userId = client.ticketChans.get(channelId);
  if (!userId) return null;
  const ticket = client.tickets.get(userId);
  if (!ticket) return null;
  ticket.status   = 'closed';
  ticket.closedAt = Date.now();
  client.ticketChans.delete(channelId);
  client.claimed.delete(channelId);
  client.tickets.delete(userId);
  await db.deleteActiveTicket(userId).catch(() => {});
  return ticket;
}

async function isBlocked(client, userId) {
  return db.isBlocked(userId);
}

async function getBlockedInfo(userId) {
  return db.getBlockedInfo(userId);
}

async function recordClaim(client, staffId) {
  await db.incrementClaimed(staffId).catch(() => {});
  const s = client.staffStats.get(staffId) || { claimed: 0, closed: 0, ratings: [] };
  s.claimed++;
  client.staffStats.set(staffId, s);
}

async function recordClose(client, staffId) {
  await db.incrementClosed(staffId).catch(() => {});
  const s = client.staffStats.get(staffId) || { claimed: 0, closed: 0, ratings: [] };
  s.closed++;
  client.staffStats.set(staffId, s);
}

async function recordRating(client, staffId, rating) {
  await db.addRating(staffId, rating).catch(() => {});
  const s = client.staffStats.get(staffId) || { claimed: 0, closed: 0, ratings: [] };
  s.ratings.push(rating);
  client.staffStats.set(staffId, s);
}

function getStats(client, staffId) {
  return client.staffStats.get(staffId) || { claimed: 0, closed: 0, ratings: [] };
}

module.exports = {
  createTicket, getTicketByUser, getTicketByChannel,
  addMessage, claimTicket, countClaimed, closeTicket,
  isBlocked, getBlockedInfo, recordClaim, recordClose, recordRating, getStats,
};
