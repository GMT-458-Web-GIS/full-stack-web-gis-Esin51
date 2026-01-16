# 🐾 Pati Takip Sistemi (Web GIS Final Projesi)

**Ders:** Web GIS  
**Ödev Türü:** Final Project  
**Proje Türü:** Full Stack Web GIS Application  
**Canlı Yayın:** AWS üzerinde deploy edilmiştir  

---

## 1. Projenin Amacı

Bu projenin amacı, coğrafi konum tabanlı hayvan (pati) ve besleme noktalarının
harita üzerinde yönetilmesini sağlayan bir Web-GIS uygulaması geliştirmektir.

Uygulama sayesinde kullanıcılar:
- Harita üzerinden konum seçerek kayıt oluşturabilir,
- Mevcut kayıtları güncelleyebilir ve silebilir,
- Kayıtlar üzerine yorum ve görsel ekleyebilir,
- Kayıtları farklı kriterlere göre filtreleyebilir,
- Sistem performansını load ve stress testleri ile analiz edebilir.

---

## 2. Kullanılan Teknolojiler

Backend: Node.js, Express.js  
Frontend: HTML, CSS, JavaScript  
Harita Kütüphanesi: Leaflet.js  
Veritabanı: MongoDB (NoSQL), Mongoose  
Dosya Yükleme: Multer  
API Dokümantasyonu: Swagger (swagger-ui-express, swagger-jsdoc)  
Performans Testi: Artillery  
Hosting: AWS  

---

## 3. Sistem Mimarisi

- İstemci (Browser) → REST API çağrıları
- Node.js + Express → İş mantığı ve API katmanı
- MongoDB → Coğrafi ve coğrafi olmayan veriler
- Leaflet → Harita ve marker görselleştirme

<img width="1895" height="903" alt="Ekran görüntüsü 2026-01-14 171035" src="https://github.com/user-attachments/assets/10c60620-fc79-44cd-b945-6f6447b8df60" />


---

## 4. Kullanıcı Rolleri

Sistemde üç farklı kullanıcı rolü bulunmaktadır:

- **Admin**
  - Tüm kayıtları silebilir ve güncelleyebilir
  - Şikayetleri yönetir
- **Moderator**
  - Şikayetleri görüntüler ve durumlarını günceller
- **Gönüllü**
  - Kendi oluşturduğu kayıtları düzenleyebilir ve silebilir
  - Yorum ekleyebilir

Kayıt sahipliği `createdBy` alanı üzerinden kontrol edilmektedir.

---

## 5. Authentication (Kayıt ve Giriş)

### Kullanıcı Kaydı
- Ad Soyad
- E-posta
- Şifre
- Telefon
- Profil fotoğrafı
- KVKK onayı (zorunlu)

### Kullanıcı Girişi
- E-posta ve şifre ile giriş
- Kullanıcı bilgileri `localStorage` içinde saklanır
- API isteklerinde `x-user-id` header olarak gönderilir

<img width="925" height="903" alt="Ekran görüntüsü 2026-01-14 181444" src="https://github.com/user-attachments/assets/d3297ea0-85ed-4b87-a65b-721f21ea4941" />

---

## 6. NoSQL Database Kullanımı

Projede MongoDB (NoSQL) kullanılmıştır.

Koleksiyonlar:
- users
- patiler
- beslemeler
- sikayetler

NoSQL tercih edilme nedenleri:
- Esnek şema yapısı
- Yorumlar gibi iç içe veri yapılarının kolay yönetimi
- Coğrafi verilerle birlikte ek alanların rahatça tutulabilmesi

<img width="1919" height="668" alt="Ekran görüntüsü 2026-01-14 181644" src="https://github.com/user-attachments/assets/4c7d0979-3cf5-4f3d-9e6d-cfad4d99fa83" />


---

## 7. CRUD Operations (Geographical Point Layer)

### Create
- Pati kaydı oluşturma
- Besleme noktası oluşturma
- Harita üzerinden konum seçimi ile kayıt ekleme

### Read
- Harita üzerinde tüm kayıtların listelenmesi
- Filtrelenmiş kayıtların görüntülenmesi

### Update
- Kayıt bilgilerini güncelleme
- Yorum ekleme (metin ve görsel)
- Güncelleme tarihi otomatik olarak yenilenir

### Delete
- Kullanıcı kendi kayıtlarını silebilir
- Admin tüm kayıtları silebilir

<img width="1902" height="910" alt="Ekran görüntüsü 2026-01-14 171052" src="https://github.com/user-attachments/assets/48a8080d-b71f-4409-880a-ac7bbd8f098a" />
<img width="548" height="694" alt="Ekran görüntüsü 2026-01-14 182938" src="https://github.com/user-attachments/assets/a5e52f1f-065c-465c-873c-d52753be1395" />


---

## 8. Filtreleme (Filtering Geographic Data)

Kullanıcılar harita verilerini şu kriterlere göre filtreleyebilir:

- Veri türü: Pati / Besleme
- Güncellik durumu
  - Yeşil: Son 3 gün içinde güncellenmiş
  - Kırmızı: Uzun süredir güncellenmemiş
- Hayvan türü (Kedi, Köpek, Kuş, Diğer)
- Metin bazlı arama
- Haritanın görünen alanı (Bounding Box)

<img width="903" height="160" alt="Ekran görüntüsü 2026-01-14 181835" src="https://github.com/user-attachments/assets/9563eeaa-5744-4b37-9ec9-fda78f0bb683" />

---

## 9. API Development ve Swagger

Geliştirilen REST API’ler Swagger ile dokümante edilmiştir.

Swagger arayüzü:

- GET: Kayıt listeleme
- POST: Yeni kayıt oluşturma
- PATCH / PUT: Güncelleme
- DELETE: Silme
- Authentication ve şikayet yönetimi

<img width="1919" height="968" alt="Ekran görüntüsü 2026-01-13 032541" src="https://github.com/user-attachments/assets/c12d4cbb-6aa9-40f7-a311-a3cfca45146d" />
<img width="1319" height="874" alt="Ekran görüntüsü 2026-01-13 050420" src="https://github.com/user-attachments/assets/41e70027-2bd0-4ee9-8676-177be14c5c40" />
<img width="1214" height="820" alt="Ekran görüntüsü 2026-01-13 050147" src="https://github.com/user-attachments/assets/172b1a31-2ecd-45ec-adc6-072bef3f59d4" />
<img width="939" height="728" alt="Ekran görüntüsü 2026-01-13 044830" src="https://github.com/user-attachments/assets/19438639-9f5c-4c43-8afc-5530d7295e37" />
<img width="943" height="883" alt="Ekran görüntüsü 2026-01-13 043437" src="https://github.com/user-attachments/assets/bee840d3-372a-44c1-ac35-fd50eb037845" />



---

## 10. Performance Testing (Load & Stress Testing)

Performans testleri Artillery kullanılarak yapılmıştır.

Örnek test komutu:

Ölçülen metrikler:
- Request rate (istek/saniye)
- Ortalama response time
- p95 ve p99 response time
- Başarısız istek sayısı

### Load Test
- Düşük ve orta kullanıcı yükü
- Sistem kararlı çalışmıştır

### Stress Test
- Yüksek kullanıcı yükü
- Response time artışı gözlemlenmiştir

<img width="1169" height="153" alt="Ekran görüntüsü 2026-01-13 225454" src="https://github.com/user-attachments/assets/8c45fb6a-ea9b-4848-9a9d-bca4b4f26733" />
<img width="1313" height="816" alt="Ekran görüntüsü 2026-01-13 223426" src="https://github.com/user-attachments/assets/34b197e4-ba8b-4ca2-9d83-382f527b12ef" />


---

## 11. Performance Monitoring – Indexing Etkisi

### Deneyin Amacı
MongoDB index kullanımının sorgu performansına etkisini gözlemlemek.

### Deney Adımları
1. Index olmadan `/api/kayitlar` sorgusu çalıştırıldı
2. MongoDB index eklendi
3. Aynı sorgular tekrar çalıştırıldı
4. Sonuçlar karşılaştırıldı

MongoDB indexleri B-Tree tabanlıdır.

<img width="1156" height="751" alt="Ekran görüntüsü 2026-01-13 214433" src="https://github.com/user-attachments/assets/42eb0f59-0742-4ca3-a5e0-1c6538cf654f" />
<img width="1191" height="769" alt="Ekran görüntüsü 2026-01-13 214102" src="https://github.com/user-attachments/assets/159e4850-3038-4505-9aa0-c15d1ca08bb6" />


---

## 12. AWS Hosting

Uygulama AWS üzerinde canlıya alınmıştır.

- Backend ve frontend çalışır durumdadır
- Ortam değişkenleri `.env` dosyası ile yönetilmiştir
- Canlı sistem üzerinden erişilebilir ve test edilebilir
- (http://13.53.36.186:3000/)

---

## 13. GeoServer Integration (WMS / WFS)

Bu projede GeoServer entegrasyonu yapılmamıştır.

İleride eklenebilir:
- WMS servisleri
- WFS servisleri

---

## 15. Yapılanlar ve Yapılmayanlar

### Yapılanlar
- Authentication & Authorization
- NoSQL Database kullanımı
- CRUD (Point Layer)
- Filtreleme
- REST API ve Swagger
- Load ve Stress Testing
- Index performans analizi
- AWS Hosting

### Yapılmayanlar
- GeoServer (WMS / WFS)
- Line / Polygon Layer (Bonus)

---

## 16. Sonuç

Bu projede Web GIS uygulamalarında:
- Coğrafi veri yönetimi
- Performans testleri
- Veritabanı indeksleme
- Bulut ortamında yayınlama

konuları uçtan uca uygulanmıştır.


