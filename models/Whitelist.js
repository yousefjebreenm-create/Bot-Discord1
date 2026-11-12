const { Schema, model } = require('mongoose');

/**
 * ══════════════════════════════════════
 *  Whitelist Model — HELL Dashboard Auth
 * ══════════════════════════════════════
 *  يخزن Discord IDs اللي عندهم صلاحية
 *  دخول الداشبورد (غير الأونر)
 */
const whitelistSchema = new Schema({
  discordId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  addedBy: {
    type: String,   // Discord ID للي أضافه
    required: true,
  },
  note: {
    type: String,
    default: '',
    maxlength: 100,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = model('Whitelist', whitelistSchema);
