/* =========================================
   BAGIAN 1: LOGIKA DOWNLOAD (Vercel & Proxy)
   ========================================= */

async function fetchData() {
    const urlInput = document.getElementById('urlInput').value.trim();
    const loader = document.getElementById('loader');
    const resultCard = document.getElementById('resultCard');
    const errorMsg = document.getElementById('errorMsg');
    
    // Reset tampilan saat tombol ditekan
    resultCard.style.display = 'none';
    errorMsg.style.display = 'none';
    resultCard.innerHTML = '';

    if (!urlInput) {
        showError("Harap masukkan link video!");
        return;
    }

    loader.style.display = 'block';

    const encodedUrl = encodeURIComponent(urlInput);
    
    // Jalur 1: Lewat Vercel Rewrite (Akan sukses setelah deploy ke Vercel)
    const vercelUrl = `/api/aio?url=${encodedUrl}`;
    
    // Jalur 2: Lewat Public Proxy (Untuk tes lokal/HP jika belum deploy)
    // Menggunakan allorigins sebagai cadangan agar tidak kena blokir CORS di local
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://magma-api.biz.id/download/aio?url=${urlInput}`)}`;

    try {
        // Coba Jalur Vercel dulu
        let response = await fetch(vercelUrl);
        
        // Jika gagal (404/Error), berarti sedang di local/bukan vercel, otomatis coba Jalur Proxy
        if (!response.ok) {
            console.warn("Jalur Vercel gagal/local, mencoba jalur Proxy...");
            response = await fetch(proxyUrl);
        }

        if (!response.ok) throw new Error("Gagal mengambil data dari server.");

        const data = await response.json();
        
        // Cek status dari API aslinya
        if (data.status && data.result) {
            renderResult(data.result);
        } else {
            showError("Media tidak ditemukan. Pastikan link benar atau tidak di-private.");
        }

    } catch (error) {
        console.error(error);
        showError("Gagal terhubung. Coba periksa koneksi internet Anda.");
    } finally {
        loader.style.display = 'none';
    }
}

function renderResult(data) {
    const resultCard = document.getElementById('resultCard');
    
    // Ambil data, jika kosong pakai default
    let title = data.title || "Tidak ada judul";
    let thumbnail = data.thumbnail || "https://via.placeholder.com/150";
    let author = data.author || "Unknown";
    let source = data.source || "Unknown"; 
    
    let buttonsHtml = '';

    // LOGIKA PEMBUATAN TOMBOL
    if (data.medias) {
        // Khusus YouTube (Filter Video ada suara & Audio)
        if (source === 'youtube') {
            const videos = data.medias.filter(m => m.type === 'video' && m.is_audio === true);
            const audios = data.medias.filter(m => m.type === 'audio');

            // Render tombol video
            videos.forEach(vid => {
                let label = vid.qualityLabel || vid.quality || 'Video';
                buttonsHtml += createButton(vid.url, `Video ${label}`, 'video');
            });
            
            // Render tombol audio (batasi max 2 agar tidak kepanjangan)
            audios.slice(0, 2).forEach(aud => {
                buttonsHtml += createButton(aud.url, `Audio`, 'audio');
            });
        } 
        // TikTok, IG, FB, Spotify
        else {
            data.medias.forEach(media => {
                let label = "Download";
                let type = "video";

                if (media.quality === 'hd_no_watermark') label = "HD (No WM)";
                else if (media.quality === 'no_watermark') label = "No WM";
                else if (media.extension === 'mp3' || media.type === 'audio') {
                    label = "Audio MP3";
                    type = "audio";
                }
                
                buttonsHtml += createButton(media.url, label, type);
            });
        }
    }

    // Template HTML untuk Kartu Hasil
    const html = `
        <div class="media-info">
            <img src="${thumbnail}" alt="Thumbnail">
            <div class="info-text">
                <h3>${title}</h3>
                <p><i class="fa-solid fa-user"></i> ${author}</p>
                <p style="margin-top:4px; font-size: 0.75rem; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px;">via ${source}</p>
            </div>
        </div>
        <div class="download-options">
            ${buttonsHtml}
        </div>
    `;

    resultCard.innerHTML = html;
    resultCard.style.display = 'block';
}

// Helper untuk membuat elemen tombol HTML
function createButton(url, text, type) {
    let icon = type === 'video' ? 'fa-video' : 'fa-music';
    // rel="noopener noreferrer" penting untuk keamanan saat buka tab baru
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="dl-btn ${type}">
                <i class="fa-solid ${icon}"></i> ${text}
            </a>`;
}

function showError(msg) {
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.innerText = msg;
    errorMsg.style.display = 'block';
}


/* =========================================
   BAGIAN 2: LOGIKA POPUP INFO (MODAL)
   ========================================= */

// Fungsi Buka Modal (Dipanggil saat klik ikon 'i')
function openModal() {
    document.getElementById('infoModal').style.display = 'flex';
}

// Fungsi Tutup Modal (Dipanggil saat klik tombol 'X')
function closeModal() {
    document.getElementById('infoModal').style.display = 'none';
}

// Fungsi Tutup Modal (Dipanggil saat klik area gelap di luar kotak)
function closeModalOutside(event) {
    if (event.target === document.getElementById('infoModal')) {
        closeModal();
    }
}
