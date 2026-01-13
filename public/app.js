let mode = 'pati',
    miniMap,
    miniMarker,
    mainMap,
    currentPatiId,
    currentUser = null;

// ---------- AUTH ----------
function toggleAuth(isReg) {
    document.getElementById('register-section').style.display = isReg ? 'block' : 'none';
    document.getElementById('login-section').style.display = isReg ? 'none' : 'block';
}

async function kayitOl() {
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
        const data = await res.json();
        alert(data.mesaj || "İşlem tamamlandı");
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
        document.getElementById('user-info').innerText = `👤 ${currentUser.adSoyad}`;
    }
}
checkAuth();

function logout() {
    localStorage.removeItem('patiUser');
    location.reload();
}

// ---------- NAV ----------
function gecLandingSayfasi() {
    document.getElementById('map-page').style.display = 'none';
    document.getElementById('form-page').style.display = 'none';
    document.getElementById('landing-page').style.display = 'flex';
}

function gecFormSayfasi() {
    if (!currentUser) return alert("Giriş yapın!");

    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('form-page').style.display = 'flex';

    document.getElementById('sahip').value = currentUser.adSoyad;
    document.getElementById('besleyenKisi').value = currentUser.adSoyad;

    if (!miniMap) initMiniMap();
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

// ---------- FORM / MAP ----------
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

    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}`);
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

// ---------- FORM SUBMIT ----------
document.getElementById('mainForm').onsubmit = async (e) => {
    e.preventDefault();

    const fd = new FormData(e.target);
    let tur = document.getElementById('tur').value;
    if (tur === 'Diğer') tur = document.getElementById('turDiger').value || 'Belirsiz';
    fd.set('tur', tur);

    const url = mode === 'pati' ? '/api/kaydet' : '/api/besleme/kaydet';

    const res = await fetch(url, { method: 'POST', body: fd });

    if (res.ok) {
        alert("Kaydedildi!");
        e.target.reset();
        gecHaritaSayfasi();
    } else {
        alert("Hata oluştu.");
    }
};

// ---------- MARKERS ----------
async function loadMarkers() {
    mainMap.eachLayer(l => { if (l instanceof L.Marker) mainMap.removeLayer(l); });

    const [p, b] = await Promise.all([
        fetch('/api/patiler').then(r => r.json()),
        fetch('/api/besleme/listele').then(r => r.json())
    ]);

    [...p, ...b].forEach(item => {
        const lat = parseFloat(item.lat),
              lng = parseFloat(item.lng);
        if (isNaN(lat)) return;

        const fresh = (new Date() - new Date(item.sonGuncelleme)) / 86400000 <= 3;
        const cls = fresh ? 'marker-fresh' : 'marker-old';
        const img = item.resim ? item.resim.replace(/\\/g, '/') : '';

        const icon = L.divIcon({
            html: `<div class="custom-marker ${cls}" style="background-image:url('${img}')"></div>`,
            iconSize: [50, 65],
            iconAnchor: [25, 65]
        });

        const m = L.marker([lat, lng], { icon }).addTo(mainMap);

        m.on('click', () => {
            currentPatiId = item._id;
            document.getElementById('side-panel').style.display = 'block';

            const baslik = item.hayvanAdi ? `${item.hayvanAdi} (${item.ad || item.yerAdi})` : (item.ad || item.yerAdi);
            const tarih = new Date(item.sonGuncelleme).toLocaleString('tr-TR');

            document.getElementById('panelContent').innerHTML = `
                <h3>${baslik}</h3>
                <small>Son Güncelleme: ${tarih}</small>
                <hr>
                <textarea id="updateText"></textarea>
                <input type="file" id="updateImg">
                <button onclick="saveUpdate()">Paylaş</button>
                <div id="history"></div>
            `;
            renderComments(item);
        });
    });
}

function renderComments(item) {
    document.getElementById('history').innerHTML =
        (item.yorumlar || []).reverse().map(y => `
            <div class="comment-box" id="cmt-${y._id}">
                <b>${y.yazar}</b> ${new Date(y.tarih).toLocaleString('tr-TR')}<br>
                ${y.metin}
            </div>
        `).join('');
}

async function saveUpdate() {
    const fd = new FormData();
    fd.append('id', currentPatiId);
    fd.append('metin', document.getElementById('updateText').value);
    fd.append('yazar', currentUser.adSoyad);

    const img = document.getElementById('updateImg').files[0];
    if (img) fd.append('resim', img);

    const res = await fetch('/api/guncelle', { method: 'POST', body: fd });
    if (res.ok) loadMarkers();
}

function sekmeDegis(m) {
    mode = m;
    document.getElementById('patiFields').style.display = m === 'pati' ? 'block' : 'none';
    document.getElementById('beslemeFields').style.display = m === 'besleme' ? 'block' : 'none';
}
