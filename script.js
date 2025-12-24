async function fetchData() {
    const urlInput = document.getElementById('urlInput').value.trim();
    const loader = document.getElementById('loader');
    const resultCard = document.getElementById('resultCard');
    const errorMsg = document.getElementById('errorMsg');
    
    // Reset tampilan
    resultCard.style.display = 'none';
    errorMsg.style.display = 'none';
    resultCard.innerHTML = '';

    if (!urlInput) {
        showError("Harap masukkan link video!");
        return;
    }

    loader.style.display = 'block';

    const encodedUrl = encodeURIComponent(urlInput);
    
    // Jalur 1: Lewat Vercel Rewrite (Akan sukses setelah deploy)
    const vercelUrl = `/api/aio?url=${encodedUrl}`;
    
    // Jalur 2: Lewat Public Proxy (Untuk tes lokal/HP jika belum deploy)
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://magma-api.biz.id/download/aio?url=${urlInput}`)}`;

    try {
        // Coba Jalur Vercel dulu
        let response = await fetch(vercelUrl);
        
        // Jika gagal (404/Error), berarti sedang di local/bukan vercel, coba Jalur Proxy
        if (!response.ok) {
            console.warn("Jalur Vercel gagal, mencoba jalur Proxy...");
            response = await fetch(proxyUrl);
        }

        if (!response.ok) throw new Error("Gagal mengambil data dari server.");

        const data = await response.json();
        
        // Cek status dari API aslinya
        if (data.status && data.result) {
            renderResult(data.result);
        } else {
            showError("Video tidak ditemukan atau link bersifat privat.");
        }

    } catch (error) {
        console.error(error);
        showError("Gagal terhubung. Coba deploy ke Vercel agar lebih stabil.");
    } finally {
        loader.style.display = 'none';
    }
}

function renderResult(data) {
    const resultCard = document.getElementById('resultCard');
    
    let title = data.title || "Tidak ada judul";
    let thumbnail = data.thumbnail || "https://via.placeholder.com/150";
    let author = data.author || "Unknown";
    let source = data.source || "Unknown"; 
    
    let buttonsHtml = '';

    // LOGIKA BUTTONS
    if (data.medias) {
        // Filter YouTube (Ambil Video yg ada suaranya & Audio)
        if (source === 'youtube') {
            const videos = data.medias.filter(m => m.type === 'video' && m.is_audio === true);
            const audios = data.medias.filter(m => m.type === 'audio');

            videos.forEach(vid => {
                let label = vid.qualityLabel || vid.quality || 'Video';
                buttonsHtml += createButton(vid.url, `Video ${label}`, 'video');
            });
            // Batasi audio max 2
            audios.slice(0, 2).forEach(aud => {
                buttonsHtml += createButton(aud.url, `Audio`, 'audio');
            });
        } 
        // TikTok & Lainnya
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

    const html = `
        <div class="media-info">
            <img src="${thumbnail}" alt="Thumbnail">
            <div class="info-text">
                <h3>${title}</h3>
                <p><i class="fa-solid fa-user"></i> ${author}</p>
                <p style="margin-top:2px; font-size: 0.7rem; opacity: 0.7; text-transform: uppercase;">via ${source}</p>
            </div>
        </div>
        <div class="download-options">
            ${buttonsHtml}
        </div>
    `;

    resultCard.innerHTML = html;
    resultCard.style.display = 'block';
}

function createButton(url, text, type) {
    let icon = type === 'video' ? 'fa-video' : 'fa-music';
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="dl-btn ${type}">
                <i class="fa-solid ${icon}"></i> ${text}
            </a>`;
}

function showError(msg) {
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.innerText = msg;
    errorMsg.style.display = 'block';
}
