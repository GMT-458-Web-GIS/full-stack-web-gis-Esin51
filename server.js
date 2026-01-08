const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Klasör Kontrolü (Yoksa oluşturur)
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Resim Yükleme Ayarları
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, 'resim-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Public klasörünü dışarı aç

// --- VERİTABANI ŞEMALARI ---

// 1. KULLANICI ŞEMASI
const userSchema = new mongoose.Schema({
    adSoyad: String, 
    eposta: { type: String, unique: true }, 
    sifre: String, 
    tel: String, 
    resim: String,
    onayli: { type: Boolean, default: true },
    kayitTarihi: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// 2. YORUM ŞEMASI (Alt Şema)
const commentSchema = new mongoose.Schema({ 
    metin: String, 
    resim: String, 
    yazar: String, 
    tarih: { type: Date, default: Date.now } 
});

// 3. PATİ ŞEMASI (Hayvan Adı Eklendi)
const patiSchema = new mongoose.Schema({
    ad: String,          // Bölge/Konum genel ismi
    hayvanAdi: String,   // Hayvanın özel ismi (Boncuk, Pamuk vb.)
    tur: String, 
    cins: String, 
    yas: String, 
    sahip: String, 
    saglik: String, 
    resim: String,       // Resim yolu (/uploads/...)
    lat: Number, 
    lng: Number, 
    sonGuncelleme: { type: Date, default: Date.now },
    yorumlar: [commentSchema]
});
const Pati = mongoose.model('Pati', patiSchema);

// 4. BESLEME NOKTASI ŞEMASI
const beslemeSchema = new mongoose.Schema({
    yerAdi: String, besleyenKisi: String, kopekSayisi: Number, kediSayisi: Number, kusSayisi: Number,
    aciklama: String, resim: String, lat: Number, lng: Number, 
    sonGuncelleme: { type: Date, default: Date.now },
    yorumlar: [commentSchema]
});
const Besleme = mongoose.model('Besleme', beslemeSchema);

// --- ROTALAR (API) ---

// KULLANICI KAYDI
app.post('/api/kayit-ol', upload.single('resim'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ mesaj: "Lütfen selfie ekleyin." });
        const yeniUser = new User({
            ...req.body,
            resim: '/uploads/' + req.file.filename,
            onayli: true
        });
        await yeniUser.save();
        res.json({ mesaj: "Kayıt başarılı! Giriş yapabilirsiniz." });
    } catch (e) { res.status(500).json({ mesaj: "E-posta kullanımda olabilir." }); }
});

// KULLANICI GİRİŞİ
app.post('/api/giris-yap', async (req, res) => {
    try {
        const { eposta, sifre } = req.body;
        const user = await User.findOne({ eposta, sifre }); 
        if (!user) return res.status(404).send("Hatalı e-posta veya şifre.");
        res.json(user);
    } catch (e) { res.status(500).send("Giriş hatası."); }
});

// PATİ KAYDETME
app.post('/api/kaydet', upload.single('resim'), async (req, res) => {
    try {
        const veri = req.body;
        if(req.file) veri.resim = '/uploads/' + req.file.filename;
        veri.lat = parseFloat(veri.lat); veri.lng = parseFloat(veri.lng);
        // hayvanAdi HTML formundan geldiği için otomatik kaydedilir
        await new Pati(veri).save();
        res.status(201).json({ mesaj: "Başarılı" });
    } catch (e) { res.status(500).send(e); }
});

// BESLEME NOKTASI KAYDETME
app.post('/api/besleme/kaydet', upload.single('resim'), async (req, res) => {
    try {
        const veri = req.body;
        if(req.file) veri.resim = '/uploads/' + req.file.filename;
        veri.lat = parseFloat(veri.lat); veri.lng = parseFloat(veri.lng);
        await new Besleme(veri).save();
        res.status(201).json({ mesaj: "Başarılı" });
    } catch (e) { res.status(500).send(e); }
});

// LİSTELEME
app.get('/api/patiler', async (req, res) => res.json(await Pati.find().sort({ sonGuncelleme: -1 })));
app.get('/api/besleme/listele', async (req, res) => res.json(await Besleme.find().sort({ sonGuncelleme: -1 })));

// GÜNCELLEME / YORUM EKLEME
app.post('/api/guncelle', upload.single('resim'), async (req, res) => {
    try {
        const { id, metin, yazar } = req.body;
        const yeniYorum = { metin, yazar, tarih: new Date() };
        if(req.file) yeniYorum.resim = '/uploads/' + req.file.filename;

        let hedef = await Pati.findById(id) || await Besleme.findById(id);
        if(hedef) {
            hedef.yorumlar.push(yeniYorum);
            hedef.sonGuncelleme = new Date();
            await hedef.save();
            res.json({ mesaj: "Eklendi", yorum: hedef.yorumlar[hedef.yorumlar.length - 1] });
        } else { res.status(404).send("Kayıt yok"); }
    } catch (e) { res.status(500).send(e); }
});

// SİLME İŞLEMLERİ (Yorum ve Kayıt)
app.post('/api/yorum-sil', async (req, res) => {
    try {
        const { anaId, yorumId } = req.body;
        let hedef = await Pati.findById(anaId) || await Besleme.findById(anaId);
        if(hedef) {
            hedef.yorumlar.pull({ _id: yorumId });
            await hedef.save();
            res.json({ mesaj: "Yorum silindi" });
        }
    } catch(e) { res.status(500).send("Hata"); }
});

app.post('/api/yorum-duzenle', async (req, res) => {
    try {
        const { anaId, yorumId, yeniMetin } = req.body;
        let hedef = await Pati.findById(anaId) || await Besleme.findById(anaId);
        if(hedef) {
            const yorum = hedef.yorumlar.id(yorumId);
            if(yorum) { yorum.metin = yeniMetin; await hedef.save(); res.json({ mesaj: "Düzenlendi" }); }
        }
    } catch(e) { res.status(500).send("Hata"); }
});

app.delete('/api/sil/:id', async (req, res) => {
    let s = await Pati.findByIdAndDelete(req.params.id);
    if(!s) await Besleme.findByIdAndDelete(req.params.id);
    res.json({ mesaj: "Silindi" });
});

// Acil Silme Rotası (Eğer gerekirse kullan diye bıraktım)
app.get('/api/acil-sil', async (req, res) => {
    try {
        await User.deleteOne({ eposta: 'esinnguclu@hotmail.com' });
        res.send("<h1>Kullanıcı Silindi ✅</h1>");
    } catch (err) { res.send("Hata: " + err); }
});

mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/patiDB")
    .then(() => app.listen(PORT, () => console.log(`🚀 Sunucu hazır: http://localhost:${PORT}`)));