const { User, Pati, Besleme, Sikayet } = require('../models');
const { requireUser, canWrite, canDeleteAny, isOwner } = require('../middleware/auth');

module.exports = function registerKayitRoutes(app, upload) {
  // ---------------- CREATE ----------------
  app.post('/api/kaydet', requireUser, upload.single('resim'), async (req, res) => {
    try {
      if (!canWrite(req.user)) return res.status(403).send('Bu işlem için yetkiniz yok.');

      const veri = req.body;
      if (req.file) veri.resim = '/uploads/' + req.file.filename;

      veri.lat = parseFloat(veri.lat) || 39.93;
      veri.lng = parseFloat(veri.lng) || 32.85;

      veri.createdBy = req.user._id;
      if (!veri.sahip) veri.sahip = req.user.adSoyad;

      await new Pati(veri).save();
      res.status(201).json({ mesaj: 'Başarılı' });
    } catch (e) {
      res.status(500).send(String(e));
    }
  });

  app.post('/api/besleme/kaydet', requireUser, upload.single('resim'), async (req, res) => {
    try {
      if (!canWrite(req.user)) return res.status(403).send('Bu işlem için yetkiniz yok.');

      const veri = req.body;
      if (req.file) veri.resim = '/uploads/' + req.file.filename;

      if (veri.ad && !veri.yerAdi) veri.yerAdi = veri.ad;

      veri.lat = parseFloat(veri.lat) || 39.93;
      veri.lng = parseFloat(veri.lng) || 32.85;

      veri.createdBy = req.user._id;
      if (!veri.besleyenKisi) veri.besleyenKisi = req.user.adSoyad;

      await new Besleme(veri).save();
      res.status(201).json({ mesaj: 'Başarılı' });
    } catch (e) {
      res.status(500).send(String(e));
    }
  });

  // ---------------- READ (legacy endpoints) ----------------
  app.get('/api/patiler', async (req, res) => res.json(await Pati.find().sort({ sonGuncelleme: -1 })));
  app.get('/api/besleme/listele', async (req, res) => res.json(await Besleme.find().sort({ sonGuncelleme: -1 })));

  // ---------------- READ (filtered spatial + ownership flags) ----------------
  app.get('/api/kayitlar', async (req, res) => {
    try {
      const {
        dataset = 'all',
        fresh = 'all',
        tur = 'all',
        q = '',
        minLat,
        minLng,
        maxLat,
        maxLng,
      } = req.query;

      const bboxOn = [minLat, minLng, maxLat, maxLng].every((v) => v !== undefined);
      const bboxQuery = bboxOn
        ? {
            lat: { $gte: parseFloat(minLat), $lte: parseFloat(maxLat) },
            lng: { $gte: parseFloat(minLng), $lte: parseFloat(maxLng) },
          }
        : {};

      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 3600 * 1000);

      const freshQuery =
        fresh === 'fresh'
          ? { sonGuncelleme: { $gte: threeDaysAgo } }
          : fresh === 'old'
          ? { sonGuncelleme: { $lt: threeDaysAgo } }
          : {};

      const qTrim = String(q || '').trim();
      const textQuery = qTrim
        ? {
            $or: [
              { ad: { $regex: qTrim, $options: 'i' } },
              { yerAdi: { $regex: qTrim, $options: 'i' } },
              { hayvanAdi: { $regex: qTrim, $options: 'i' } },
              { besleyenKisi: { $regex: qTrim, $options: 'i' } },
              { sahip: { $regex: qTrim, $options: 'i' } },
            ],
          }
        : {};

      const patiTurQuery = tur !== 'all' ? { tur } : {};

      const filterPati = { ...bboxQuery, ...freshQuery, ...textQuery, ...patiTurQuery };
      const filterBesleme = { ...bboxQuery, ...freshQuery, ...textQuery };

      let patiler = [];
      let beslemeler = [];

      if (dataset === 'all' || dataset === 'pati') {
        patiler = await Pati.find(filterPati).sort({ sonGuncelleme: -1 }).lean();
        patiler = patiler.map((x) => ({ ...x, _dataset: 'pati' }));
      }

      if (dataset === 'all' || dataset === 'besleme') {
        beslemeler = await Besleme.find(filterBesleme).sort({ sonGuncelleme: -1 }).lean();
        beslemeler = beslemeler.map((x) => ({ ...x, _dataset: 'besleme' }));
      }

      // ownership flags for UI
      const uid = req.header('x-user-id');
      let user = null;
      if (uid) user = await User.findById(uid);

      const attachOwner = (doc) => {
        if (!user) return doc;

        const owner = isOwner(user, doc);

        const yorumlar = (doc.yorumlar || []).map((y) => ({
          ...y,
          _owner:
            user.rol === 'admin' ||
            (y.yazarId && String(y.yazarId) === String(user._id)) ||
            (y.yazar && y.yazar === user.adSoyad),
        }));

        return { ...doc, _owner: owner, yorumlar };
      };

      const out = [...patiler.map(attachOwner), ...beslemeler.map(attachOwner)].sort(
        (a, b) => new Date(b.sonGuncelleme) - new Date(a.sonGuncelleme)
      );

      res.json(out);
    } catch (e) {
      res.status(500).send('Filtreleme hatası.');
    }
  });

  // ---------------- COMMENTS: ADD ----------------
  app.post('/api/guncelle', requireUser, upload.single('resim'), async (req, res) => {
    try {
      if (!canWrite(req.user)) return res.status(403).send('Bu işlem için yetkiniz yok.');

      const { id, metin } = req.body;

      const yeniYorum = {
        metin,
        tarih: new Date(),
        yazar: req.user.adSoyad,
        yazarId: req.user._id,
      };
      if (req.file) yeniYorum.resim = '/uploads/' + req.file.filename;

      const hedef = (await Pati.findById(id)) || (await Besleme.findById(id));
      if (!hedef) return res.status(404).send('Kayıt yok');

      hedef.yorumlar.push(yeniYorum);
      hedef.sonGuncelleme = new Date();
      await hedef.save();

      res.json({ mesaj: 'Eklendi', yorum: hedef.yorumlar[hedef.yorumlar.length - 1] });
    } catch (e) {
      res.status(500).send(String(e));
    }
  });

  // ---------------- COMMENTS: DELETE (BU EKSİKTİ) ----------------
  app.post('/api/yorum-sil', requireUser, async (req, res) => {
    try {
      const { anaId, yorumId } = req.body;

      const hedef = (await Pati.findById(anaId)) || (await Besleme.findById(anaId));
      if (!hedef) return res.status(404).send('Kayıt yok');

      const yorum = hedef.yorumlar.id(yorumId);
      if (!yorum) return res.status(404).send('Yorum yok');

      const owner =
        (yorum.yazarId && String(yorum.yazarId) === String(req.user._id)) ||
        (yorum.yazar && yorum.yazar === req.user.adSoyad);

      if (!(canDeleteAny(req.user) || owner)) return res.status(403).send('Yorum silme yetkiniz yok.');

      hedef.yorumlar.pull({ _id: yorumId });
      await hedef.save();

      res.json({ mesaj: 'Yorum silindi' });
    } catch (e) {
      res.status(500).send('Hata');
    }
  });

  // ---------------- COMMENTS: EDIT (BU DA EKSİKTİ) ----------------
  app.post('/api/yorum-duzenle', requireUser, async (req, res) => {
    try {
      const { anaId, yorumId, yeniMetin } = req.body;

      const hedef = (await Pati.findById(anaId)) || (await Besleme.findById(anaId));
      if (!hedef) return res.status(404).send('Kayıt yok');

      const yorum = hedef.yorumlar.id(yorumId);
      if (!yorum) return res.status(404).send('Yorum yok');

      const owner =
        (yorum.yazarId && String(yorum.yazarId) === String(req.user._id)) ||
        (yorum.yazar && yorum.yazar === req.user.adSoyad);

      if (!(canDeleteAny(req.user) || owner)) return res.status(403).send('Yorum düzenleme yetkiniz yok.');

      yorum.metin = yeniMetin;
      await hedef.save();

      res.json({ mesaj: 'Düzenlendi' });
    } catch (e) {
      res.status(500).send('Hata');
    }
  });

  // ---------------- COMPLAINT: CREATE ----------------
  app.post('/api/sikayet', requireUser, async (req, res) => {
    try {
      const { hedefDataset, hedefId, sebep = '', aciklama = '' } = req.body;

      if (!hedefDataset || !hedefId) return res.status(400).send('hedefDataset ve hedefId zorunlu.');
      if (!['pati', 'besleme'].includes(hedefDataset)) return res.status(400).send('hedefDataset geçersiz.');

      const hedefDoc = hedefDataset === 'pati' ? await Pati.findById(hedefId) : await Besleme.findById(hedefId);
      if (!hedefDoc) return res.status(404).send('Şikayet edilecek kayıt yok.');

      const s = new Sikayet({
        hedefDataset,
        hedefId,
        sebep,
        aciklama,
        olusturanId: req.user._id,
        olusturanAd: req.user.adSoyad,
        durum: 'open',
        tarih: new Date(),
      });

      await s.save();
      res.status(201).json({ mesaj: 'Şikayet oluşturuldu', sikayet: s });
    } catch (e) {
      res.status(500).send('Şikayet oluşturma hatası.');
    }
  });

  // ---------------- COMPLAINT: LIST ----------------
  app.get('/api/sikayetler', requireUser, async (req, res) => {
    try {
      if (!(req.user && (req.user.rol === 'admin' || req.user.rol === 'moderator'))) {
        return res.status(403).send('Bu işlem için yetkiniz yok.');
      }

      const { durum } = req.query;
      const filter = durum ? { durum } : {};

      const list = await Sikayet.find(filter).sort({ tarih: -1 }).lean();
      res.json(list);
    } catch (e) {
      res.status(500).send('Şikayet listeleme hatası.');
    }
  });

  // ---------------- COMPLAINT: UPDATE ----------------
  app.patch('/api/sikayet/:id', requireUser, async (req, res) => {
    try {
      if (!(req.user && (req.user.rol === 'admin' || req.user.rol === 'moderator'))) {
        return res.status(403).send('Bu işlem için yetkiniz yok.');
      }

      const { id } = req.params;
      const s = await Sikayet.findById(id);
      if (!s) return res.status(404).send('Şikayet yok');

      if (req.body.durum !== undefined) {
        const allowedDurum = ['open', 'reviewing', 'escalated', 'closed'];
        if (!allowedDurum.includes(req.body.durum)) return res.status(400).send('durum geçersiz.');
        s.durum = req.body.durum;
      }

      if (req.body.moderatorNotu !== undefined) s.moderatorNotu = req.body.moderatorNotu;

      await s.save();
      res.json({ mesaj: 'Şikayet güncellendi', sikayet: s });
    } catch (e) {
      res.status(500).send('Şikayet güncelleme hatası.');
    }
  });

  // ---------------- UPDATE RECORD (PATCH/PUT) ----------------
  app.patch('/api/kayit/:id', requireUser, async (req, res) => {
    try {
      if (!canWrite(req.user)) return res.status(403).send('Bu işlem için yetkiniz yok.');

      const id = req.params.id;
      let doc = await Pati.findById(id);
      let model = 'pati';
      if (!doc) {
        doc = await Besleme.findById(id);
        model = 'besleme';
      }
      if (!doc) return res.status(404).send('Kayıt yok');

      if (!(canDeleteAny(req.user) || isOwner(req.user, doc))) {
        return res.status(403).send('Bu kaydı güncelleme yetkiniz yok.');
      }

      const allowed = ['ad', 'yerAdi', 'hayvanAdi', 'tur', 'yas', 'sahip', 'besleyenKisi', 'aciklama', 'lat', 'lng'];

      for (const k of allowed) {
        if (req.body[k] !== undefined) doc[k] = req.body[k];
      }

      if (req.body.lat !== undefined) doc.lat = parseFloat(req.body.lat);
      if (req.body.lng !== undefined) doc.lng = parseFloat(req.body.lng);

      if (model === 'besleme') {
        if (doc.ad && !doc.yerAdi) doc.yerAdi = doc.ad;
        if (req.body.ad !== undefined) doc.yerAdi = req.body.ad;
      }

      doc.sonGuncelleme = new Date();
      await doc.save();

      res.json({ mesaj: 'PATCH OK', kayit: doc });
    } catch (e) {
      res.status(500).send('PATCH hatası');
    }
  });

  app.put('/api/kayit/:id', requireUser, async (req, res) => {
    try {
      if (!canWrite(req.user)) return res.status(403).send('Bu işlem için yetkiniz yok.');

      const id = req.params.id;
      let doc = await Pati.findById(id);
      let model = 'pati';
      if (!doc) {
        doc = await Besleme.findById(id);
        model = 'besleme';
      }
      if (!doc) return res.status(404).send('Kayıt yok');

      if (!(canDeleteAny(req.user) || isOwner(req.user, doc))) {
        return res.status(403).send('Bu kaydı güncelleme yetkiniz yok.');
      }

      doc.lat = parseFloat(req.body.lat) || doc.lat;
      doc.lng = parseFloat(req.body.lng) || doc.lng;

      if (model === 'pati') {
        doc.ad = req.body.ad ?? doc.ad;
        doc.hayvanAdi = req.body.hayvanAdi ?? doc.hayvanAdi;
        doc.tur = req.body.tur ?? doc.tur;
        doc.yas = req.body.yas ?? doc.yas;
        doc.sahip = req.body.sahip ?? doc.sahip;
      } else {
        doc.yerAdi = req.body.yerAdi ?? doc.yerAdi;
        doc.hayvanAdi = req.body.hayvanAdi ?? doc.hayvanAdi;
        doc.besleyenKisi = req.body.besleyenKisi ?? doc.besleyenKisi;
        doc.aciklama = req.body.aciklama ?? doc.aciklama;
      }

      doc.sonGuncelleme = new Date();
      await doc.save();

      res.json({ mesaj: 'PUT OK', kayit: doc });
    } catch (e) {
      res.status(500).send('PUT hatası');
    }
  });

  // ---------------- DELETE RECORD ----------------
  app.delete('/api/sil/:id', requireUser, async (req, res) => {
    try {
      const id = req.params.id;

      let doc = await Pati.findById(id);
      let isPati = true;
      if (!doc) {
        doc = await Besleme.findById(id);
        isPati = false;
      }
      if (!doc) return res.status(404).send('Kayıt yok');

      if (!(canDeleteAny(req.user) || isOwner(req.user, doc))) {
        return res.status(403).send('Bu kaydı silme yetkiniz yok.');
      }

      if (isPati) await Pati.findByIdAndDelete(id);
      else await Besleme.findByIdAndDelete(id);

      res.json({ mesaj: 'Silindi' });
    } catch (e) {
      res.status(500).send('Silme hatası');
    }
  });

  // (senin acil-sil route’unu aynen bıraktım)
  app.get('/api/acil-sil', async (req, res) => {
    try {
      await User.deleteOne({ eposta: 'esinnguclu@hotmail.com' });
      res.send('Kullanıcı Silindi');
    } catch (err) {
      res.send('Hata: ' + err);
    }
  });
};
