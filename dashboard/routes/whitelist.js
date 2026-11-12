const router    = require('express').Router();
const Whitelist = require('../../models/Whitelist');
const config    = require('../../src/config');
const { isAuthenticated, isAuthorized } = require('../middleware/auth');

// كل الـ routes تحتاج login + owner فقط يقدر يعدّل الـ whitelist
router.use(isAuthenticated, isAuthorized);

/**
 *  GET /api/whitelist
 *  يرجع كل الـ IDs الموجودة
 */
router.get('/', async (req, res) => {
  try {
    const list = await Whitelist.find().sort({ addedAt: -1 });
    res.json({ success: true, list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

/**
 *  POST /api/whitelist
 *  يضيف ID جديد
 *  body: { discordId, note? }
 */
router.post('/', async (req, res) => {
  // الأونر بس يقدر يضيف
  if (req.session.user.id !== config.ownerID) {
    return res.status(403).json({ success: false, message: 'Owner only' });
  }

  const { discordId, note } = req.body;
  if (!discordId) {
    return res.status(400).json({ success: false, message: 'discordId required' });
  }

  try {
    const entry = await Whitelist.create({
      discordId,
      addedBy: req.session.user.id,
      note: note || '',
    });
    res.json({ success: true, entry });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'ID already whitelisted' });
    }
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

/**
 *  DELETE /api/whitelist/:discordId
 *  يحذف ID من الـ whitelist
 */
router.delete('/:discordId', async (req, res) => {
  // الأونر بس يقدر يحذف
  if (req.session.user.id !== config.ownerID) {
    return res.status(403).json({ success: false, message: 'Owner only' });
  }

  try {
    const result = await Whitelist.deleteOne({ discordId: req.params.discordId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'ID not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

module.exports = router;
