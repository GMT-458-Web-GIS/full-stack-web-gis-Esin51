const roleLabel = (rol) => ({
  admin: 'Admin',
  gonullu: 'Gönüllü',
  moderator: 'Moderatör',
  viewer: 'Viewer'
}[rol] || rol);

let mode = 'pati',
    miniMap,
    miniMarker,
    mainMap,
    currentPatiId,
    currentUser = null;

// Filtre state
let activeFilters = {
    dataset: 'all',   // all | pati | besleme
    fresh: 'all',     // all | fresh | old
    tur: 'all',       // all | Kedi | Köpek | Kuş | Diğer
    q: ''             // search
};

// ----------------- HELPERS -----------------
function userHeader() {
    const saved = localStorage.getItem('patiUser');
    if (!saved) return {};
    try {
        const u = JSON.parse(saved);
        if (!u || !u._id) return {};
        return { 'x-user-id': u._id };
    } catch {
        return {};
    }
}

async function apiFetch(url, options = {}) {
    options.headers = options.headers || {};
    // JSON gönderirken Content-Type koru
    const h = userHeader();
    options.headers = { ...options.headers, ...h };
    return fetch(url, options);
}

function isAdmin() { return currentUser && currentUser.rol === 'admin'; }
function isModerator() { return currentUser && currentUser.rol === 'moderator'; }

// ----------------- AUTH -----------------
function toggleAuth(isReg) {
    document.getElementById('register-section').style.display = isReg ? 'block' : 'none';
    document.getElementById('login-section').style.display = isReg ? 'none' : 'block';
}

async function kayitOl() {
    // KVKK kontrolü
    if (!document.getElementById('kvkkCheck').checked) {
        return alert("KVKK şartlarını kabul etmelisiniz.");
    }

    const fd = new FormData();
    fd.append('kvkk', 'on');
    fd.append('adSoyad', document.getElementById('regName').value);
    fd.append('eposta', document.getElementById('regEmail').value);
    fd.append('sifre', document.getElementById('regPass').value);
    fd.append('tel', document.getElementById('regTel').value);

    const selfie = document.getElementById('regSelfie').files[0];
    if (selfie) fd.append('resim', selfie);

    try {
        const res = await fetch('/api/kayit-ol', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        alert(data.mesaj || (res.ok ? "Kayıt başarılı" : "Kayıt hatası"));
        if (res.ok) toggleAuth(false);
    } catch {
        alert("Hata oluştu.");
    }
}

async function girisYap() {
    const res = await fetch('/api/giris-yap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            eposta: document.getElementById('loginEmail').value,
            sifre: document.getElementById('loginPass').value
        })
    });

    if (res.ok) {
        currentUser = await res.json();
        localStorage.setItem('patiUser', JSON.stringify(currentUser));
        checkAuth();
    } else {
        alert("Hatalı giriş.");
    }
}

function checkAuth() {
    const saved = localStorage.getItem('patiUser');
    if (saved) {
        currentUser = JSON.parse(saved);
        document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('user-info').innerText =
  `👤 ${currentUser.adSoyad} (${roleLabel(currentUser.rol)})`;

    }
}
checkAuth();

function logout() {
    localStorage.removeItem('patiUser');
    location.reload();
}

// ----------------- NAV -----------------
function gecLandingSayfasi() {
    document.getElementById('map-page').style.display = 'none';
    document.getElementById('form-page').style.display = 'none';
    document.getElementById('landing-page').style.display = 'flex';
}

function gecFormSayfasi() {
    if (!currentUser) return alert("Giriş yapın!");
    if (isModerator()) return alert("Moderator rolü kayıt ekleyemez (şikayetlere bakar).");

    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('form-page').style.display = 'flex';

    // otomatik doldurma
    document.getElementById('sahip').value = currentUser.adSoyad;
    document.getElementById('besleyenKisi').value = currentUser.adSoyad;

    if (!miniMap) {
        initMiniMap();
    } else {
        const p = miniMarker.getLatLng();
        document.getElementById('lat').value = p.lat;
        document.getElementById('lng').value = p.lng;
    }
    setTimeout(() => miniMap.invalidateSize(), 200);
}

function gecHaritaSayfasi() {
    if (!currentUser) return alert("Giriş yapın!");

    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('form-page').style.display = 'none';
    document.getElementById('map-page').style.display = 'flex';

    if (!mainMap) {
        mainMap = L.map('mainMap').setView([39.9, 32.8], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mainMap);
    }

    setTimeout(() => {
        mainMap.invalidateSize();
        loadMarkers();
    }, 400);
}

// ----------------- MINI MAP -----------------
function turKontrol(el) {
    document.getElementById('turDiger').style.display = el.value === 'Diğer' ? 'block' : 'none';
}

function initMiniMap() {
    miniMap = L.map('miniMap').setView([39.9, 32.8], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(miniMap);

    miniMarker = L.marker([39.9, 32.8], { draggable: true }).addTo(miniMap);

    document.getElementById('lat').value = "39.9";
    document.getElementById('lng').value = "32.8";

    miniMarker.on('dragend', () => {
        const p = miniMarker.getLatLng();
        document.getElementById('lat').value = p.lat;
        document.getElementById('lng').value = p.lng;
    });
}

async function searchAddress() {
    const q = document.getElementById('addressInput').value;
    if (!q) return;

    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`);
    const data = await res.json();

    if (data[0]) {
        const lat = parseFloat(data[0].lat),
            lon = parseFloat(data[0].lon);
        miniMap.setView([lat, lon], 16);
        miniMarker.setLatLng([lat, lon]);
        document.getElementById('lat').value = lat;
        document.getElementById('lng').value = lon;
    } else {
        alert("Adres bulunamadı.");
    }
}

// ----------------- FORM SUBMIT (CREATE) -----------------
document.getElementById('mainForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("Giriş yapın!");
    if (isModerator()) return alert("Moderator rolü kayıt ekleyemez (şikayetlere bakar).");

    const fd = new FormData(e.target);

    let secilenTur = document.getElementById('tur').value;
    if (secilenTur === 'Diğer') secilenTur = document.getElementById('turDiger').value || 'Belirsiz';
    fd.set('tur', secilenTur);

    const url = mode === 'pati' ? '/api/kaydet' : '/api/besleme/kaydet';

    // güvenlik
    if (!fd.get('lat') || !fd.get('lng')) {
        const p = miniMarker.getLatLng();
        fd.set('lat', p.lat);
        fd.set('lng', p.lng);
    }

    const res = await apiFetch(url, { method: 'POST', body: fd });

    if (res.ok) {
        alert("Kaydedildi!");
        document.getElementById('mainForm').reset();

        if (miniMarker) {
            const p = miniMarker.getLatLng();
            document.getElementById('lat').value = p.lat;
            document.getElementById('lng').value = p.lng;
        }

        gecHaritaSayfasi();
    } else {
        const txt = await res.text().catch(() => "");
        alert("Hata: " + (txt || "İşlem başarısız"));
    }
};

// ----------------- FILTER UI -----------------
function applyFilters() {
    activeFilters.dataset = document.getElementById('filterDataset').value;
    activeFilters.fresh = document.getElementById('filterFresh').value;
    activeFilters.tur = document.getElementById('filterTur').value;
    activeFilters.q = (document.getElementById('filterQ').value || '').trim();
    loadMarkers();
}

function resetFilters() {
    document.getElementById('filterDataset').value = 'all';
    document.getElementById('filterFresh').value = 'all';
    document.getElementById('filterTur').value = 'all';
    document.getElementById('filterQ').value = '';
    activeFilters = { dataset: 'all', fresh: 'all', tur: 'all', q: '' };
    loadMarkers();
}

// ----------------- MARKERS (READ + FILTER) -----------------
async function loadMarkers() {
    if (!mainMap) return;

    mainMap.eachLayer(l => { if (l instanceof L.Marker) mainMap.removeLayer(l); });

    // bbox (haritada görünen alan) = geographic filter
    const b = mainMap.getBounds();
    const params = new URLSearchParams({
        dataset: activeFilters.dataset,
        fresh: activeFilters.fresh,
        tur: activeFilters.tur,
        q: activeFilters.q,
        minLat: b.getSouthWest().lat.toString(),
        minLng: b.getSouthWest().lng.toString(),
        maxLat: b.getNorthEast().lat.toString(),
        maxLng: b.getNorthEast().lng.toString(),
    });

    const res = await apiFetch('/api/kayitlar?' + params.toString());

    const list = await res.json();

    list.forEach(item => {
        const lat = parseFloat(item.lat), lng = parseFloat(item.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        const isFresh = (new Date() - new Date(item.sonGuncelleme)) / (1000 * 3600 * 24) <= 3;
        const statusClass = isFresh ? 'marker-fresh' : 'marker-old';
        const imgUrl = item.resim ? item.resim.replace(/\\/g, '/') : '';

        const iconHtml = `<div class="custom-marker ${statusClass}" style="background-image: url('${imgUrl}');"></div>`;
        const icon = L.divIcon({ className: 'c-div', html: iconHtml, iconSize: [50, 65], iconAnchor: [25, 65] });

        const m = L.marker([lat, lng], { icon }).addTo(mainMap);

        m.on('click', () => {
            currentPatiId = item._id;
            document.getElementById('side-panel').style.display = 'block';

            const hayvanAdi = item.hayvanAdi || '';
            const yerIsmi = item.ad || item.yerAdi || "Konum";
            const baslik = hayvanAdi ? `${hayvanAdi} (${yerIsmi})` : yerIsmi;

            const tarih = new Date(item.sonGuncelleme).toLocaleString('tr-TR');
            const googleMapsLink = `https://www.google.com/maps?q=${lat},${lng}`;

            // ownership + role UI (backend zaten zorunlu yapacak)
            const canEditDelete = (currentUser && (currentUser.rol === 'admin' || item._owner === true));

            document.getElementById('panelContent').innerHTML = `
                <h3 style="color:#8d4004; margin:0;">${baslik}</h3>
                <small style="color:#666; display:block; margin-bottom:10px;">Son Güncelleme: ${tarih}</small>
                <a href="${googleMapsLink}" target="_blank" class="btn-maps">📍 Konumu Google Maps'te Aç</a>

                <hr>

                <textarea id="updateText" placeholder="Durum güncellemesi yaz..."></textarea>
                <input type="file" id="updateImg" accept="image/*">
                <button onclick="saveUpdate()" class="btn-save" style="font-size:14px; padding:10px;">Paylaş 🚀</button>

                <hr>

                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button onclick="openEditModal()" class="btn-save"
                        style="display:${canEditDelete ? 'block' : 'none'}; font-size:14px; padding:10px; background:#3498db;">
                        ✏️ Düzenle (PATCH)
                    </button>

                    <button onclick="kayitSil('${item._id}')" class="btn-delete"
                        style="display:${canEditDelete ? 'block' : 'none'}; margin:0;">
                        🗑️ Sil
                    </button>

                    <button onclick="sikayetEt('${item._dataset || 'pati'}','${item._id}')" class="btn-save"
                        style="font-size:14px; padding:10px; background:#e67e22;">
                        🚩 Şikayet Et
                    </button>
                </div>

                <div id="history"></div>
            `;

            // Düzenleme için item’i saklayalım
            window.__selectedItem = item;

            renderComments(item);
        });
    });
}

// ----------------- COMMENTS (UPDATE via POST /api/guncelle kept) -----------------
function renderComments(item) {
    document.getElementById('history').innerHTML = (item.yorumlar || []).reverse().map(y => `
        <div class="comment-box" id="cmt-${y._id}">
            <b>${y.yazar || 'Gönüllü'}</b> <small>${new Date(y.tarih).toLocaleString('tr-TR')}</small><br>
            <span>${y.metin || ''}</span>
            ${y.resim ? `<img src="${y.resim}" class="comment-img">` : ''}

            ${
                (currentUser && (currentUser.rol === 'admin' || y._owner === true))
                    ? `<div class="comment-actions">
                           <button class="action-btn" onclick="yorumDuzenlePrompt('${item._id}','${y._id}', \`${(y.metin || '').replace(/`/g,'\\`')}\`)">Düzenle</button>
                           <button class="action-btn" onclick="yorumSil('${item._id}','${y._id}')">Sil</button>
                       </div>`
                    : ''
            }
        </div>`).join('');
}

async function saveUpdate() {
  if (!currentUser) return alert("Giriş yapın.");

  const fd = new FormData();
  fd.append('id', currentPatiId);
  fd.append('metin', document.getElementById('updateText').value);

  const fileInput = document.getElementById('updateImg');
  if (fileInput.files[0]) fd.append('resim', fileInput.files[0]);

  const res = await apiFetch('/api/guncelle', { method: 'POST', body: fd });

  if (res.ok) {
    const data = await res.json().catch(() => ({}));
    const y = data.yorum;

    // inputları temizle
    document.getElementById('updateText').value = "";
    fileInput.value = "";

    // ✅ yorumu anında ekrana bas (refresh yok)
    if (y) {
      const historyEl = document.getElementById('history');
      const html = `
        <div class="comment-box" id="cmt-${y._id}">
          <b>${y.yazar || 'Gönüllü'}</b>
          <small>${new Date(y.tarih).toLocaleString('tr-TR')}</small><br>
          <span>${y.metin || ''}</span>
          ${y.resim ? `<img src="${y.resim}" class="comment-img">` : ''}
          ${
            (currentUser && (currentUser.rol === 'admin' || (y.yazarId && String(y.yazarId) === String(currentUser._id))))
              ? `<div class="comment-actions">
                   <button class="action-btn"
                     onclick="yorumDuzenlePrompt('${currentPatiId}','${y._id}', \`${(y.metin || '').replace(/`/g,'\\`')}\`)">
                     Düzenle
                   </button>
                   <button class="action-btn"
                     onclick="yorumSil('${currentPatiId}','${y._id}')">
                     Sil
                   </button>
                 </div>`
              : ''
          }
        </div>
      `;
      // en üste ekle
      historyEl.insertAdjacentHTML('afterbegin', html);
    }

    // marker renkleri vb. de güncellensin istiyorsan bunu bırak:
    loadMarkers();

  } else {
    const txt = await res.text().catch(() => "");
    alert("Hata: " + (txt || "Paylaşım başarısız"));
  }
}

async function yorumSil(anaId, yorumId) {
    if (!confirm("Silinsin mi?")) return;

    const res = await apiFetch('/api/yorum-sil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anaId, yorumId })
    });

    if (res.ok) {
        const kutu = document.getElementById(`cmt-${yorumId}`);
        if (kutu) {
            kutu.style.animation = "fadeOut 0.3s forwards";
            setTimeout(() => kutu.remove(), 300);
        }
        loadMarkers();
    } else {
        const txt = await res.text().catch(() => "");
        alert("Yetki/Hata: " + (txt || "Silinemedi"));
    }
}

async function yorumDuzenlePrompt(anaId, yorumId, eskiMetin) {
    const yeniMetin = prompt("Yeni yorum metni:", eskiMetin || "");
    if (yeniMetin === null) return;

    const res = await apiFetch('/api/yorum-duzenle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anaId, yorumId, yeniMetin })
    });

    if (res.ok) {
        loadMarkers();
    } else {
        const txt = await res.text().catch(() => "");
        alert("Yetki/Hata: " + (txt || "Düzenlenemedi"));
    }
}

// ----------------- DELETE (role enforced backend) -----------------
async function kayitSil(id) {
    if (!confirm("Bu kaydı tamamen silmek istediğine emin misin?")) return;

    const res = await apiFetch(`/api/sil/${id}`, { method: 'DELETE' });
    if (res.ok) {
        document.getElementById('side-panel').style.display = 'none';
        loadMarkers();
    } else {
        const txt = await res.text().catch(() => "");
        alert("Yetki/Hata: " + (txt || "Silinemedi"));
    }
}
// ----------------- COMPLAINT (POST /api/sikayet) -----------------
async function sikayetEt(hedefDataset, hedefId) {
    if (!currentUser) return alert("Şikayet etmek için giriş yapın.");

    const sebep = prompt("Şikayet sebebi (örn: yanlış konum, spam, sahte kayıt):", "");
    if (sebep === null) return; // iptal

    const aciklama = prompt("Kısa açıklama (opsiyonel):", "");
    if (aciklama === null) return; // iptal

    const res = await apiFetch('/api/sikayet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            hedefDataset,
            hedefId,
            sebep: sebep || '',
            aciklama: aciklama || ''
        })
    });

    if (res.ok) {
        alert("Şikayet alındı ✅ Teşekkürler.");
    } else {
        const txt = await res.text().catch(() => "");
        alert("Hata: " + (txt || "Şikayet gönderilemedi"));
    }
}

// ----------------- PATCH UPDATE (API requirement) -----------------
function openEditModal() {
    if (!window.__selectedItem) return;
    if (!currentUser) return alert("Giriş yapın.");

    // UI tarafı da kısıt: sadece admin veya owner
    if (!(isAdmin() || (window.__selectedItem && window.__selectedItem._owner === true))) {
        return alert("Bu kaydı sadece ekleyen kişi (veya admin) düzenleyebilir.");
    }

    const it = window.__selectedItem;

    const yeniAd = prompt("Yeni yer/bölge adı (ad/yerAdi):", it.ad || it.yerAdi || "");
    if (yeniAd === null) return;

    const yeniHayvanAdi = prompt("Yeni hayvan adı (opsiyonel):", it.hayvanAdi || "");
    if (yeniHayvanAdi === null) return;

    const yeniLat = prompt("Yeni enlem (lat):", String(it.lat));
    if (yeniLat === null) return;

    const yeniLng = prompt("Yeni boylam (lng):", String(it.lng));
    if (yeniLng === null) return;

    patchKayit(it._id, {
        ad: yeniAd,
        yerAdi: yeniAd,
        hayvanAdi: yeniHayvanAdi,
        lat: parseFloat(yeniLat),
        lng: parseFloat(yeniLng)
    });
}

async function patchKayit(id, payload) {
    const res = await apiFetch(`/api/kayit/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert("Güncellendi (PATCH) ✅");
        loadMarkers();
    } else {
        const txt = await res.text().catch(() => "");
        alert("Yetki/Hata: " + (txt || "Güncellenemedi"));
    }
}

// ----------------- ŞİKAYET -----------------
async function sikayetEt(dataset, id) {
    if (!currentUser) return alert("Şikayet için giriş yapın.");

    const sebep = prompt("Şikayet sebebi (kısa):", "Yanlış konum / yanlış bilgi / kötü niyet");
    if (sebep === null) return;

    const aciklama = prompt("Detay (opsiyonel):", "");
    if (aciklama === null) return;

    const res = await apiFetch('/api/sikayet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            hedefDataset: dataset,
            hedefId: id,
            sebep,
            aciklama
        })
    });

    if (res.ok) {
        alert("Şikayet gönderildi ✅");
    } else {
        const txt = await res.text().catch(() => "");
        alert("Şikayet gönderilemedi: " + (txt || "Hata"));
    }
}

// ----------------- TAB SWITCH -----------------
function sekmeDegis(m) {
    mode = m;
    document.getElementById('patiFields').style.display = m === 'pati' ? 'block' : 'none';
    document.getElementById('beslemeFields').style.display = m === 'besleme' ? 'block' : 'none';
}
document.addEventListener('DOMContentLoaded', () => {
  updateLandingUserUI();
});
