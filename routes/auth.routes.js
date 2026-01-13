const { User } = require('../models');

module.exports = function registerAuthRoutes(app, upload) {
  /**
   * @swagger
   * /api/kayit-ol:
   *   post:
   *     summary: Kullanıcı kayıt (selfie + KVKK)
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [adSoyad, eposta, sifre, kvkk, resim]
   *             properties:
   *               adSoyad: { type: string }
   *               eposta: { type: string }
   *               sifre: { type: string }
   *               tel: { type: string }
   *               kvkk: { type: string, example: "on" }
   *               resim: { type: string, format: binary }
   *     responses:
   *       200:
   *         description: Kayıt başarılı
   */
  app.post('/api/kayit-ol', upload.single('resim'), async (req, res) => {
    try {
      if (!req.body.kvkk) {
        return res.status(400).json({ mesaj: 'KVKK şartlarını kabul etmelisiniz.' });
      }
      if (!req.file) return res.status(400).json({ mesaj: 'Lütfen selfie ekleyin.' });

      const yeniUser = new User({
        ...req.body,
        resim: '/uploads/' + req.file.filename,
        onayli: true,
        rol: 'gonullu',
      });

      await yeniUser.save();
      res.json({ mesaj: 'Kayıt başarılı! Giriş yapabilirsiniz.' });
    } catch (e) {
      res.status(500).json({ mesaj: 'E-posta kullanımda olabilir.' });
    }
  });

  /**
   * @swagger
   * /api/giris-yap:
   *   post:
   *     summary: Kullanıcı giriş
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [eposta, sifre]
   *             properties:
   *               eposta: { type: string }
   *               sifre: { type: string }
   *     responses:
   *       200:
   *         description: Kullanıcı bilgileri
   */
  app.post('/api/giris-yap', async (req, res) => {
    try {
      const { eposta, sifre } = req.body;
      const user = await User.findOne({ eposta, sifre });
      if (!user) return res.status(404).send('Hatalı e-posta veya şifre.');

      res.json({
        _id: user._id,
        adSoyad: user.adSoyad,
        eposta: user.eposta,
        tel: user.tel,
        resim: user.resim,
        rol: user.rol,
        onayli: user.onayli,
        kayitTarihi: user.kayitTarihi,
      });
    } catch (e) {
      res.status(500).send('Giriş hatası.');
    }
  });
};
