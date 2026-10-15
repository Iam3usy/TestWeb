const WORKER_API_URL = "https://myhubapp.dathalay1.workers.dev/api/catalog";
const STREAM_BASE_URL = "https://myhubapp.dathalay1.workers.dev/stream?file_id=";

let videoData = [];
let modelData = [];
let categoryData = [];

// Google Drive Link converter
function getDirectDriveLink(url) {
    if (!url) return '';
    const strUrl = String(url).trim();
    if (strUrl.includes('drive.google.com') || strUrl.includes('docs.google.com')) {
        const match = strUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            return `https://lh3.googleusercontent.com/d/${match[1]}`;
        }
    }
    return strUrl;
}

function cleanText(text) {
    if (!text) return '';
    return String(text).replace(/[\r\n]+/g, '').trim();
}

// Main Data Fetcher
async function loadDataFromWorker() {
    try {
        const response = await fetch(WORKER_API_URL);
        const data = await response.json();

        if (Array.isArray(data)) {
            const validData = data.filter(item => item && typeof item === 'object');

            // 1. Process Videos
            videoData = validData.map(item => {
                let thumb = getDirectDriveLink(item.thumbnail);
                const rawIsVip = item.is_Vip !== undefined ? item.is_Vip : (item.is_vip !== undefined ? item.is_vip : item.isVip);

                return {
                    title: cleanText(item.title),
                    model: cleanText(item.model || item.model_name),
                    category: cleanText(item.category || item.category_name),
                    views: Number(item.views) || 0,
                    thumbnail: thumb || 'https://via.placeholder.com/300x180',
                    file_id: cleanText(item.file_id),
                    stream_url: item.file_id ? `${STREAM_BASE_URL}${cleanText(item.file_id)}` : '',
                    isVip: String(rawIsVip || '').toLowerCase() === 'true'
                };
            });

            // 2. Process Models (3 Grid with Count)
            const modelMap = new Map();
            validData.forEach(item => {
                let mName = cleanText(item.model_name || item.model);
                let mImg = getDirectDriveLink(item.model_image);
                let hasVideo = item.file_id && cleanText(item.file_id) !== '';

                if (mName !== '') {
                    mName.split(',').forEach(name => {
                        let cleanName = cleanText(name);
                        let lower = cleanName.toLowerCase();
                        if (!modelMap.has(lower)) {
                            modelMap.set(lower, { name: cleanName, image: mImg, count: 0 });
                        } else if (mImg && !modelMap.get(lower).image) {
                            modelMap.get(lower).image = mImg;
                        }
                        if (hasVideo) modelMap.get(lower).count++;
                    });
                }
            });
            modelData = Array.from(modelMap.values()).sort((a, b) => a.name.localeCompare(b.name));

            // 3. Process Categories (3 Grid with Count)
            const catMap = new Map();
            validData.forEach(item => {
                let cName = cleanText(item.category_name || item.category);
                let cImg = getDirectDriveLink(item.category_image);
                let hasVideo = item.file_id && cleanText(item.file_id) !== '';

                if (cName !== '') {
                    cName.split(',').forEach(name => {
                        let cleanName = cleanText(name);
                        let lower = cleanName.toLowerCase();
                        if (!catMap.has(lower)) {
                            catMap.set(lower, { name: cleanName, image: cImg, count: 0 });
                        } else if (cImg && !catMap.get(lower).image) {
                            catMap.get(lower).image = cImg;
                        }
                        if (hasVideo) catMap.get(lower).count++;
                    });
                }
            });
            categoryData = Array.from(catMap.values()).sort((a, b) => a.name.localeCompare(b.name));

            // Page Routing & Rendering
            routePages();
        }
    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

// Router to handle page rendering
function routePages() {
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const selModel = urlParams.get('model');
    const selCat = urlParams.get('category');
    const titleEl = document.getElementById('pageTitle');

    if (selModel && titleEl) titleEl.innerText = selModel;
    if (selCat && titleEl) titleEl.innerText = selCat;

    if (path.includes('model.html') && !selModel) {
        renderModels();
    } else if (path.includes('category.html') && !selCat) {
        renderCategories();
    } else if (path.includes('popular.html')) {
        renderVideos('popular');
    } else if (path.includes('vip.html')) {
        renderVipVideos();
    } else {
        renderVideos('latest', selModel, selCat);
    }
}

// Render Videos (Latest / Popular / Filtered)
function renderVideos(type, model = null, category = null) {
    const container = document.getElementById('videoContainer');
    if (!container) return;
    container.style.display = 'grid';

    let list = [...videoData].filter(v => v.file_id && !v.isVip);

    if (type === 'popular') {
        list.sort((a, b) => b.views - a.views);
    } else {
        list.reverse(); // Latest first
    }

    if (model) {
        list = list.filter(v => v.model.toLowerCase().includes(model.toLowerCase()));
    }
    if (category) {
        list = list.filter(v => v.category.toLowerCase().includes(category.toLowerCase()));
    }

    if (list.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#a4b0be; grid-column:1/-1; padding:30px;">ဗီဒီယို မရှိသေးပါ</p>';
        return;
    }

    container.innerHTML = '';
    list.forEach(v => {
        container.innerHTML += `
            <div class="video-card" onclick="openPlayer('${v.file_id}', '${v.stream_url}')">
                <div class="thumbnail-box">
                    <video src="${v.thumbnail}" autoplay loop muted playsinline></video>
                    <span class="view-badge"><i class="fa-solid fa-eye"></i> ${v.views}</span>
                </div>
                <div class="video-info">
                    <h3>${v.title}</h3>
                </div>
            </div>
        `;
    });
}

// Render Models (3 Grid)
function renderModels() {
    const container = document.getElementById('modelContainer');
    if (!container) return;
    container.style.display = 'grid';

    if (modelData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#a4b0be; grid-column:1/-1; padding:30px;">Model မရှိသေးပါ။</p>';
        return;
    }

    container.innerHTML = '';
    modelData.forEach(m => {
        let img = m.image || 'https://via.placeholder.com/150';
        container.innerHTML += `
            <a href="model.html?model=${encodeURIComponent(m.name)}" class="item-card">
                <div class="thumb">
                    <img src="${img}" alt="${m.name}" onerror="this.src='https://via.placeholder.com/150'">
                    <span class="view-badge">${m.count}</span>
                </div>
                <div class="info">${m.name}</div>
            </a>
        `;
    });
}

// Render Categories (3 Grid)
function renderCategories() {
    const container = document.getElementById('categoryContainer');
    if (!container) return;
    container.style.display = 'grid';

    if (categoryData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#a4b0be; grid-column:1/-1; padding:30px;">Category မရှိသေးပါ။</p>';
        return;
    }

    container.innerHTML = '';
    categoryData.forEach(c => {
        let img = c.image || 'https://via.placeholder.com/150';
        container.innerHTML += `
            <a href="category.html?category=${encodeURIComponent(c.name)}" class="item-card">
                <div class="thumb">
                    <img src="${img}" alt="${c.name}" onerror="this.src='https://via.placeholder.com/150'">
                    <span class="view-badge">${c.count}</span>
                </div>
                <div class="info">${c.name}</div>
            </a>
        `;
    });
}

// Render VIP Videos
function renderVipVideos() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
        window.location.href = 'login.html';
        return;
    }

    const container = document.getElementById('videoContainer');
    if (!container) return;
    container.style.display = 'grid';

    let vipList = videoData.filter(v => v.isVip && v.file_id);
    if (vipList.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#a4b0be; grid-column:1/-1; padding:30px;">VIP ဗီဒီယို မရှိသေးပါ။</p>';
        return;
    }

    container.innerHTML = '';
    vipList.forEach(v => {
        container.innerHTML += `
            <div class="video-card" onclick="openPlayer('${v.file_id}', '${v.stream_url}')">
                <div class="thumbnail-box">
                    <video src="${v.thumbnail}" autoplay loop muted playsinline></video>
                    <span class="view-badge" style="background:#f1c40f; color:#000;"><i class="fa-solid fa-crown"></i> VIP</span>
                </div>
                <div class="video-info">
                    <h3>${v.title}</h3>
                </div>
            </div>
        `;
    });
}

// Sidebar Toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

// Video Player Modal with Double Tap Seek (-10s / +10s)
function openPlayer(fileId, streamUrl) {
    if (!streamUrl) return;

    let modal = document.getElementById('videoModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'videoModal';
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.95); z-index:9999; align-items:center; justify-content:center;';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="position:relative; width:95%; max-width:800px; background:#111; border-radius:8px; overflow:hidden;">
            <button onclick="closePlayer()" style="position:absolute; top:10px; right:15px; background:rgba(0,0,0,0.7); border:none; color:white; font-size:22px; cursor:pointer; z-index:10000; width:35px; height:35px; border-radius:50%;"><i class="fa-solid fa-xmark"></i></button>
            <div id="playerWrapper" style="position:relative; width:100%;">
                <video id="my-video" class="video-js vjs-default-skin vjs-big-play-centered" controls preload="auto" style="width:100%; aspect-ratio:16/9;">
                    <source src="${streamUrl}" type="application/x-mpegURL">
                </video>
                <div id="seekFeedback" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:white; background:rgba(0,0,0,0.8); padding:6px 14px; border-radius:20px; font-size:14px; font-weight:bold; pointer-events:none; opacity:0; transition:opacity 0.2s; z-index:1000;"></div>
            </div>
        </div>
    `;
    modal.style.display = 'flex';

    if (window.videojs) {
        if (videojs.getPlayers()['my-video']) {
            videojs.getPlayers()['my-video'].dispose();
        }
        let player = videojs('my-video', { autoplay: true, controls: true, fluid: true, html5: { hls: { overrideNative: true } } });

        player.ready(function() {
            let playerBox = document.getElementById('playerWrapper');
            let feedback = document.getElementById('seekFeedback');
            let lastTapTime = 0;

            if (playerBox) {
                playerBox.addEventListener('click', function(e) {
                    let currentTime = new Date().getTime();
                    if ((currentTime - lastTapTime) < 350 && (currentTime - lastTapTime) > 0) {
                        let boxWidth = playerBox.clientWidth;
                        let clickX = e.clientX - playerBox.getBoundingClientRect().left;

                        if (clickX < boxWidth / 2) {
                            player.currentTime(Math.max(0, player.currentTime() - 10));
                            showFeedback("<< -10s");
                        } else {
                            player.currentTime(Math.min(player.duration(), player.currentTime() + 10));
                            showFeedback("+10s >>");
                        }
                    }
                    lastTapTime = currentTime;
                });
            }

            function showFeedback(text) {
                if (!feedback) return;
                feedback.innerText = text;
                feedback.style.opacity = '1';
                setTimeout(() => { feedback.style.opacity = '0'; }, 500);
            }
        });
    }
}

function closePlayer() {
    let modal = document.getElementById('videoModal');
    if (modal) {
        if (window.videojs && videojs.getPlayers()['my-video']) {
            videojs.getPlayers()['my-video'].dispose();
        }
        modal.style.display = 'none';
        modal.innerHTML = '';
    }
}

document.addEventListener("DOMContentLoaded", loadDataFromWorker);
