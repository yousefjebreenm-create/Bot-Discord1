const router  = require('express').Router();
const fetch   = require('node-fetch');           // npm install node-fetch@2
const config  = require('../../src/config');     // عدّل المسار حسب مشروعك

const DISCORD_API   = 'https://discord.com/api/v10';
const REDIRECT_URI  = `${config.dashboardURL}/auth/callback`;   // مثال: http://localhost:3000/auth/callback

const OAUTH_URL =
  `https://discord.com/oauth2/authorize` +
  `?client_id=${config.clientID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=identify`;

/**
 *  GET /auth/login
 *  يحوّل المستخدم إلى صفحة Discord للتسجيل
 */
router.get('/login', (req, res) => {
  res.redirect(OAUTH_URL);
});

/**
 *  GET /auth/callback
 *  Discord يرجع هنا بعد موافقة المستخدم
 */
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect('/auth/login');

  try {
    // ── 1. نبادل الـ code بـ access_token ─────────────────────
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     config.clientID,
        client_secret: config.clientSecret,
        grant_type:    'authorization_code',
        code,
        redirect_uri:  REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('No access token');

    // ── 2. نجيب بيانات المستخدم ───────────────────────────────
    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    // ── 3. نحفظ في الـ session ────────────────────────────────
    req.session.user = {
      id:            userData.id,
      username:      userData.username,
      discriminator: userData.discriminator,
      avatar:        userData.avatar,
    };

    res.redirect('/dashboard');
  } catch (err) {
    console.error('[OAuth] Error:', err);
    res.redirect('/auth/login');
  }
});

/**
 *  GET /auth/logout
 */
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
