const mongoose = require('mongoose');

// ---------- SCHEMAS ----------
const userSchema = new mongoose.Schema({
  adSoyad: String,
  eposta: { type: String, unique: true },
  sifre: String,
  tel: String,
  resim: String,

  rol: { type: String, enum: ['admin', 'gonullu', 'moderator'], default: 'gonullu' },
  onayli: { type: Boolean, default: true },
  kayitTarihi: { type: Date, default: Date.now },
});
const User = mongoose.model('User', userSchema);

const commentSchema = new mongoose.Schema({
  metin: String,
  resim: String,
  yazar: String,
  yazarId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tarih: { type: Date, default: Date.now },
});

const baseFields = {
  lat: Number,
  lng: Number,
  sonGuncelleme: { type: Date, default: Date.now },
  yorumlar: [commentSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // ownership
};

const patiSchema = new mongoose.Schema({
  ad: String,
  hayvanAdi: String,
  tur: String,
  cins: String,
  yas: String,
  sahip: String,
  saglik: String,
  resim: String,
  ...baseFields,
});
const Pati = mongoose.model('Pati', patiSchema);

const beslemeSchema = new mongoose.Schema({
  yerAdi: String,
  besleyenKisi: String,
  hayvanAdi: String,
  kopekSayisi: Number,
  kediSayisi: Number,
  kusSayisi: Number,
  aciklama: String,
  resim: String,
  ...baseFields,
});
const Besleme = mongoose.model('Besleme', beslemeSchema);

const sikayetSchema = new mongoose.Schema({
  hedefDataset: { type: String, enum: ['pati', 'besleme'], required: true },
  hedefId: { type: mongoose.Schema.Types.ObjectId, required: true },

  sebep: { type: String, default: '' },
  aciklama: { type: String, default: '' },

  olusturanId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  olusturanAd: { type: String, default: '' },

  durum: { type: String, enum: ['open', 'reviewing', 'escalated', 'closed'], default: 'open' },
  moderatorNotu: { type: String, default: '' },

  tarih: { type: Date, default: Date.now }
});
const Sikayet = mongoose.model('Sikayet', sikayetSchema);

module.exports = {
  User,
  Pati,
  Besleme,
  commentSchema,
  Sikayet,
};
