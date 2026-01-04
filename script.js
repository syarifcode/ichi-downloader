/* =========================================
   BAGIAN 1: FETCH DATA (Universal Fix)
   ========================================= */

async function fetchData() {
    const urlInput = document.getElementById('urlInput').value.trim();
    const loader = document.getElementById('loader');
    const resultCard = document.getElementById('resultCard');
    const errorMsg = document.getElementById('errorMsg');
    
    resultCard.style.display = 'none';
    errorMsg.style.display = 'none';
    resultCard.innerHTML = '';

    if (!urlInput) {
        showError("Harap masukkan link video!");
        return;
    }

    loader.style.display = 'block';
    const encodedUrl = encodeURIComponent(urlInput);
    
    // Jalur Vercel (Utama) & Proxy (Cadangan)
    const vercelUrl = `/api/aio?url=${encodedUrl}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://magma-api.biz.id/download/aio?url=${urlInput}`)}`;

    try {
        let response = await fetch(vercelUrl);
        if (!response.ok) {
            console.warn("Jalur Vercel gagal/local, mencoba jalur Proxy...");
            response = await fetch(proxyUrl);
        }

        if (!response.ok) throw new Error("Gagal mengambil data.");
        const data = await response.json();
        
        if (data.status && data.result) {
            renderResult(data.result);
        } else {
            showError("Media tidak ditemukan atau API error.");
        }

    } catch (error) {
        console.error(error);
        showError("Gagal terhubung. Periksa koneksi internet.");
    } finally {
        loader.style.display = 'none';
    }
}

function renderResult(data) {
    const resultCard = document.getElementById('resultCard');
    let title = data.title || "Video Download";
    let thumbnail = data.thumbnail || "https://via.placeholder.com/150";
    let author = data.author || "Unknown";
    let source = data.source || "Social Media"; 
    
    let buttonsHtml = '';

    // KASUS 1: Struktur Lengkap (Ada 'medias') - YouTube/IG/TikTok Lama
    if (data.medias && data.medias.length > 0) {
        if (source === 'youtube') {
            const videos = data.medias.filter(m => m.type === 'video' && m.is_audio === true);
            const audios = data.medias.filter(m => m.type === 'audio');
            videos.forEach(vid => {
                let label = vid.qualityLabel || vid.quality || 'Video';
                buttonsHtml += createButton(vid.url, `Video ${label}`, 'video');
            });
            audios.slice(0, 2).forEach(aud => {
                buttonsHtml += createButton(aud.url, `Audio`, 'audio');
            });
        } else {
            data.medias.forEach(media => {
                let label = "Download";
                let type = "video";
                if (media.quality === 'hd_no_watermark') label = "HD (No WM)";
                else if (media.quality === 'no_watermark') label = "No WM";
                else if (media.extension === 'mp3' || media.type === 'audio') {
                    label = "Audio MP3"; type = "audio";
                }
                buttonsHtml += createButton(media.url, label, type);
            });
        }
    } 
    // KASUS 2: Struktur Simpel (Ada 'download_url') - Link TikTok Baru
    else if (data.download_url) {
        if (title.startsWith("http")) title = "Video TikTok";
        if (source === "Unknown") source = "TikTok";
        buttonsHtml += createButton(data.download_url, "Download Video", "video");
    } 
    else {
        showError("Format data tidak didukung.");
        return;
    }

    const html = `
        <div class="media-info">
            <img src="${thumbnail}" alt="Thumbnail">
            <div class="info-text">
                <h3>${title}</h3>
                <p><i class="fa-solid fa-user"></i> ${author}</p>
                <p style="margin-top:4px; font-size: 0.75rem; opacity: 0.7; text-transform: uppercase;">via ${source}</p>
            </div>
        </div>
        <div class="download-options">${buttonsHtml}</div>
    `;

    resultCard.innerHTML = html;
    resultCard.style.display = 'block';
}

function createButton(url, text, type) {
    let icon = type === 'video' ? 'fa-video' : 'fa-music';
    let fileExt = type === 'video' ? 'mp4' : 'mp3';
    let filename = `ichi-download.${fileExt}`;
    // Panggil fungsi auto-download
    return `<button onclick="downloadMedia(this, '${url}', '${filename}')" class="dl-btn ${type}">
                <i class="fa-solid ${icon}"></i> ${text}
            </button>`;
}

function showError(msg) {
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.innerText = msg;
    errorMsg.style.display = 'block';
}

/* =========================================
   BAGIAN 2: AUTO DOWNLOAD (API VERCEL)
   ========================================= */

async function downloadMedia(btn, url, filename) {
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Proses...`;
    btn.disabled = true;
    btn.style.opacity = "0.7";

    try {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        let downloadUrl;
        
        // JIKA DI VERCEL (Production)
        if (!isLocalhost || window.location.port === "") { 
            downloadUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
            
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            a.setAttribute('download', filename); 
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

        // JIKA DI LOCALHOST (Proxy Fallback)
        } else {
            console.log("Mode Localhost: Menggunakan Proxy");
            downloadUrl = `https://corsproxy.io/?` + encodeURIComponent(url);
            
            const response = await fetch(downloadUrl);
            if (!response.ok) throw new Error("Gagal download via proxy");
            
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.style.display = 'none'; a.href = blobUrl; a.download = filename;
            document.body.appendChild(a); a.click();
            window.URL.revokeObjectURL(blobUrl); document.body.removeChild(a);
        }

        setTimeout(() => {
            btn.innerHTML = `<i class="fa-solid fa-check"></i> Berhasil`;
            setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; btn.style.opacity = "1"; }, 2000);
        }, 1000);

    } catch (error) {
        console.error("Auto download gagal:", error);
        window.open(url, '_blank'); // Fallback tab baru
        btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Manual`;
        setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; btn.style.opacity = "1"; }, 3000);
    }
}

/* =========================================
   BAGIAN 3: POPUP MODAL
   ========================================= */

function openModal() { document.getElementById('infoModal').style.display = 'flex'; }
function closeModal() { document.getElementById('infoModal').style.display = 'none'; }
function closeModalOutside(event) { if (event.target === document.getElementById('infoModal')) closeModal(); }
