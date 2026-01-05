const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Resim Yükleme Ayarları
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, 'resim-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- 1. PATİ ŞEMASI (GÜNCELLENDİ) ---
const patiSchema = new mongoose.Schema({
    ad: String,
    tur: String,
    cins: String,
    yas: String,    // Sayı yerine "2" veya "Bilinmiyor" yazılabilsin diye String yapıldı
    sahip: String,  // Sahibi / Bulan Kişi
    saglik: String,
    resim: String,
    lat: Number,
    lng: Number,
    sonGuncelleme: { type: Date, default: Date.now }
});
const Pati = mongoose.model('Pati', patiSchema);

// --- 2. BESLEME NOKTASI ŞEMASI (GÜNCELLENDİ) ---
const beslemeSchema = new mongoose.Schema({
    yerAdi: String,
    besleyenKisi: String, // Beslemeyi Yapan Gönüllü
    kopekSayisi: Number,
    kediSayisi: Number,
    kusSayisi: Number,    // Kuşlar eklendi
    aciklama: String,
    resim: String,
    lat: Number,
    lng: Number,
    sonGuncelleme: { type: Date, default: Date.now }
});
const Besleme = mongoose.model('Besleme', beslemeSchema);

// --- ROTALAR ---
app.post('/api/kaydet', upload.single('resim'), async (req, res) => {
    try {
        const veri = req.body;
        if(req.file) veri.resim = '/uploads/' + req.file.filename;
        const yeniPati = new Pati(veri);
        await yeniPati.save();
        res.status(201).json({ mesaj: "Kayıt Başarılı!" });
    } catch (error) { res.status(500).json({ mesaj: "Hata" }); }
});

app.post('/api/besleme/kaydet', upload.single('resim'), async (req, res) => {
    try {
        const veri = req.body;
        if(req.file) veri.resim = '/uploads/' + req.file.filename;
        const yeniBesleme = new Besleme(veri);
        await yeniBesleme.save();
        res.status(201).json({ mesaj: "Besleme noktası eklendi!" });
    } catch (error) { res.status(500).json({ mesaj: "Hata" }); }
});

app.get('/api/patiler', async (req, res) => res.json(await Pati.find().sort({ sonGuncelleme: -1 })));
app.get('/api/besleme/listele', async (req, res) => res.json(await Besleme.find().sort({ sonGuncelleme: -1 })));

app.delete('/api/sil/:id', async (req, res) => {
    let s = await Pati.findByIdAndDelete(req.params.id);
    if(!s) await Besleme.findByIdAndDelete(req.params.id);
    res.json({ mesaj: "Silindi" });
});

mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/patiDB")
    .then(() => app.listen(PORT, () => console.log(`🚀 Sunucu http://localhost:${PORT}`)));