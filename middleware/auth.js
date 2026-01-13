const { User } = require('../models');

// ---------- AUTH MIDDLEWARE (simple for assignment) ----------
async function requireUser(req, res, next) {
  try {
    const uid = req.header('x-user-id');
    if (!uid) return res.status(401).send('Giriş gerekli (x-user-id eksik).');

    const u = await User.findById(uid);
    if (!u) return res.status(401).send('Kullanıcı bulunamadı.');
    if (u.onayli === false) return res.status(403).send('Hesap onaysız.');

    req.user = u;
    next();
  } catch (e) {
    res.status(500).send('Auth kontrol hatası.');
  }
}

function canWrite(user) {
  return user && (user.rol === 'admin' || user.rol === 'gonullu');
}
function canDeleteAny(user) {
  return user && user.rol === 'admin';
}
function canModerate(user) {
  return user && (user.rol === 'admin' || user.rol === 'moderator');
}
function isOwner(user, doc) {
  if (!user || !doc) return false;

  // Yeni kayıtlar için createdBy
  if (doc.createdBy && String(doc.createdBy) === String(user._id)) return true;

  // Eski kayıtlar için isim üzerinden fallback
  const sahip = doc.sahip || doc.besleyenKisi || '';
  if (sahip && sahip === user.adSoyad) return true;

  return false;
}

module.exports = { requireUser, canWrite, canDeleteAny, canModerate, isOwner };
