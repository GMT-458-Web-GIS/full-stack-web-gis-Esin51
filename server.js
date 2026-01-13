const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Klasör Kontrolü
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Resim Ayarları
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) =>
    cb(null, 'resim-' + Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Pati Takip API',
      version: '1.0.0',
      description: 'Pati Takip Sistemi - GIS & CRUD API',
    },
    servers: [{ url: 'http://localhost:3000' }],
    components: {
      securitySchemes: {
        UserIdHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'x-user-id',
          description: 'Login sonrası localStorage → patiUser._id',
        },
      },
    },
    security: [{ UserIdHeader: [] }],
  },

  // swagger yorumları routes klasöründe duruyor diye bunu düzeltiyoruz
  apis: ['./routes/*.js'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ---------- ROUTES REGISTER ----------
// DİKKAT: routes klasöründeki index.js dosyasını çağırıyoruz
const registerAllRoutes = require('./routes/index');
registerAllRoutes(app, upload);

// ---------- DB ----------
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/patiDB')
  .then(() =>
    app.listen(PORT, () => console.log(`🚀 Sunucu hazır: http://localhost:${PORT}`))
  )
  .catch((err) => console.log('Mongo bağlantı hatası:', err));
