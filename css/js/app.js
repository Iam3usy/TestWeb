// WORKER BACKEND CONFIGURATION
const WORKER_API_URL = "https://myhubapp.dathalay1.workers.dev/api/catalog";
const STREAM_BASE_URL = "https://myhubapp.dathalay1.workers.dev/stream?file_id=";

// Global Data Stores
let videoData = [];
let modelData = [];
let categoryData = [];

// Google Drive Link ကို Direct Link ပြောင်းပေးသည့် Function
function getDirectDriveLink(url) {
    if (!url) return '';
    const match = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    return url;
}

// 1. Fetch Data From Worker
async function loadDataFromWorker() {
    const urlParams = new URLSearchParams(window.location.search);
    const selectedModel = urlParams.get('model');
    const selectedCategory = urlParams.get('category');
    const pageTitle = document.getElementById('pageTitle') || document.querySelector('.header-title') || document.querySelector('h2');

    if (pageTitle) {
        if (selectedModel) {
            pageTitle.innerText = selectedModel;
        } else if (selectedCategory) {
            pageTitle.innerText = selectedCategory;
        }
    }

    try {
        const response = await fetch(WORKER_API_URL);
        const data = await response.json();

        if (Array.isArray(data)) {
            const validData = data.filter(item => item && typeof item === 'object');

            // Video Data များကို Map လုပ်ခြင်း
            videoData = validData.map(item => {
                let thumb = getDirectDriveLink(item.thumbnail);
                let mImg = getDirectDriveLink(item.model_image || item.modelImage);
                let cImg = getDirectDriveLink(item.category_image || item.categoryImage);

                const rawIsVip = item.is_Vip !== undefined ? item.is_Vip : (item.is_vip !== undefined ? item.is_vip : item.isVip);

                return {
                    title: item.title || '',
                    model: item.model || '',
                    model_name: item.model_name || item.model || '',
                    model_image: mImg,
                    category: item.category || '',
                    category_name: item.category_name || item.category || '',
                    category_image: cImg,
                    views: item.views || 0,
                    thumbnail: thumb || 'https://via.placeholder.com/300x180',
                    file_id: item.file_id || '',
                    stream_url: item.file_id ? `${STREAM_BASE_URL}${item.file_id}` : '',
                    isVip: String(rawIsVip || '').toLowerCase() === 'true'
                };
            });

            // Model Data များကို စုဆောင်းခြင်း
            const customModelMap = new Map();
            videoData.forEach(item => {
                const mName = item.model_name || item.model;
                if (mName) {
                    const models = mName.split(',').map(m => m.trim());
                    models.forEach(m => {
                        if (m && !customModelMap.has(m.toLowerCase())) {
                            const img = (item.model_image && item.model_image.trim() !== '') ? item.model_image : item.thumbnail;
                            customModelMap.set(m.toLowerCase(), { name: m, image: img });
                        }
                    });
                }
            });
            modelData = Array.from(customModelMap.values());

            // Category Data များကို စုဆောင်းခြင်း
            const customCategoryMap = new Map();
            videoData.forEach(item => {
                const cName = item.category_name || item.category;
                if (cName) {
                    const cats = cName.split(',').map(c => c.trim());
                    cats.forEach(c => {
                        if (c && !customCategoryMap.has(c.toLowerCase())) {
                            const img = (item.category_image && item.category_image.trim() !== '') ? item.category_image : item.thumbnail;
                            customCategoryMap.set(c.toLowerCase(), { name: c, image: img });
                        }
                    });
                }
            });
            categoryData = Array.from(customCategoryMap.values());

            // Render Containers
            const modelContainer = document.getElementById('modelContainer') || document.getElementById('model-container');
            const categoryContainer = document.getElementById('categoryContainer') || document.getElementById('category-container');
            const videoContainer = document.getElementById('videoContainer') || document.getElementById('video-container') || document.querySelector('.video-grid');

            if (selectedModel || selectedCategory) {
                if (modelContainer) modelContainer.style.display = 'none';
                if (categoryContainer) categoryContainer.style.display = 'none';
                if (videoContainer) {
                    videoContainer.style.display = 'grid';
                    renderContent();
                }
            } else {
                if (videoContainer) {
                    videoContainer.style.display = 'grid';
                    renderContent();
                }
                if (modelContainer) {
                    modelContainer.style.display = 'grid';
                    renderModels();
                }
                if (categoryContainer) {
                    categoryContainer.style.display = 'grid';
                    renderCategories();
                }
            }
        }
    } catch (error) {
        console.error("Worker Data Fetch Error:", error);
    }
}

// 2. Toggle Sidebar (Side Menu ဖွင့်/ပိတ်)
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar') || document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent') || document.querySelector('.main-content');
    if (sidebar) {
        sidebar.classList.toggle('open');
        sidebar.classList.toggle('closed');
    }
    if (mainContent) {
        mainContent.classList.toggle('expanded');
    }
}

// 3. Open Video Player Modal
function openPlayer(streamUrl) {
    if (!streamUrl) return;
    let modal = document.getElementById('videoModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'videoModal';
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.9); z-index:9999; align-items:center; justify-content:center;';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div id="modalContent" style="position:relative; width:95%; max-width:850px; background:#111; border-radius:8px; overflow:hidden;">
            <button onclick="closePlayer()" style="position:absolute; top:10px; right:15px; background:rgba(0,0,0,0.6); border:none; color:white; font-size:24px; cursor:pointer; z-index:10000; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-xmark"></i></button>
            <div id="skipOverlay" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#fff; font-size:13px; font-weight:600; background:rgba(0,0,0,0.75); padding:6px 14px; border-radius:20px; display:none; pointer-events:none; z-index:9999; backdrop-filter:blur(4px);"></div>
            <video id="my-video" class="video-js vjs-default-skin vjs-big-play-centered" controls autoplay preload="auto" style="width:100%; height:450px;">
                <source src="${streamUrl}" type="application/x-mpegURL">
            </video>
        </div>
    `;

    modal.style.display = 'flex';

    if (window.videojs) {
        if (videojs.getPlayers()['my-video']) videojs.getPlayers()['my-video'].dispose();
        const player = videojs('my-video', {
            autoplay: true, controls: true, responsive: true, fluid: true,
            playbackRates: [0.5, 1, 1.25, 1.5, 2]
        });

        player.ready(function() {
            const videoElement = player.el();
            let lastTapTime = 0;
            videoElement.addEventListener('touchstart', function(e) {
                if (e.target.closest('.vjs-control-bar')) return;
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTapTime;
                if (tapLength < 300 && tapLength > 0) {
                    e.preventDefault();
                    const rect = videoElement.getBoundingClientRect();
                    const touchX = e.touches[0].clientX - rect.left;
                    if (touchX < rect.width / 2) {
                        player.currentTime(Math.max(0, player.currentTime() - 10));
                        showSkipText("◄◄ 10s");
                    } else {
                        player.currentTime(Math.min(player.duration(), player.currentTime() + 10));
                        showSkipText("10s ►►");
                    }
                }
                lastTapTime = currentTime;
            });

            function showSkipText(text) {
                const overlay = document.getElementById('skipOverlay');
                if (overlay) {
                    overlay.innerText = text;
                    overlay.style.display = 'block';
                    setTimeout(() => overlay.style.display = 'none', 800);
                }
            }
        });
    }
}

// 4. Close Player
function closePlayer() {
    const modal = document.getElementById('videoModal');
    if (modal) {
        if (window.videojs && videojs.getPlayers()['my-video']) videojs.getPlayers()['my-video'].dispose();
        modal.style.display = 'none';
        modal.innerHTML = '';
    }
}

// 5. Render Videos
function renderContent() {
    const container = document.getElementById('videoContainer') || document.getElementById('video-container') || document.querySelector('.video-grid');
    if (!container) return;

    container.innerHTML = '';

    const urlParams = new URLSearchParams(window.location.search);
    const selectedModel = urlParams.get('model');
    const selectedCategory = urlParams.get('category');

    let displayData = videoData.filter(v => v.file_id && v.file_id.trim() !== '' && !v.isVip);

    if (selectedModel) {
        displayData = displayData.filter(item => {
            const mTarget = item.model_name || item.model;
            if (!mTarget) return false;
            const models = mTarget.split(',').map(m => m.trim().toLowerCase());
            return models.includes(selectedModel.trim().toLowerCase());
        });
    }

    if (selectedCategory) {
        displayData = displayData.filter(item => {
            const cTarget = item.category_name || item.category;
            if (!cTarget) return false;
            const cats = cTarget.split(',').map(c => c.trim().toLowerCase());
            return cats.includes(selectedCategory.trim().toLowerCase());
        });
    }

    if (displayData.length === 0) {
        container.innerHTML = '<p style="color:#888; text-align:center; padding:40px; width:100%;">ဗီဒီယိုများ မရှိသေးပါခင်ဗျာ။</p>';
        return;
    }

    displayData.forEach(video => {
        container.innerHTML += `
            <div class="video-card" onclick="openPlayer('${video.stream_url}')">
                <div class="thumbnail-box">
                    <video src="${video.thumbnail}" 
                           autoplay 
                           loop 
                           muted 
                           playsinline 
                           style="pointer-events: none;">
                    </video>
                    <span class="view-badge">
                        <i class="fa-solid fa-eye"></i> ${video.views || 0}
                    </span>
                </div>
                <div class="video-info" style="padding: 8px 10px;">
                    <h3 style="font-size: 14px; margin: 0; color: #fff; line-height: 1.3;">${video.title || ''}</h3>
                </div>
            </div>
        `;
    });

    document.querySelectorAll('.thumbnail-box video').forEach(v => {
        v.muted = true;
        v.play().catch(e => console.log(e));
    });
}

// 6. Render Models
function renderModels() {
    const modelContainer = document.getElementById('modelContainer') || document.getElementById('model-container');
    if (!modelContainer) return;

    modelContainer.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; padding: 10px;";
    modelContainer.innerHTML = '';

    if (!modelData || modelData.length === 0) {
        modelContainer.innerHTML = '<p style="color:#888; text-align:center; width:100%;">Model မရှိသေးပါ။</p>';
        return;
    }

    modelData.forEach(m => {
        const displayImg = (m.image && m.image.trim() !== '') ? m.image : 'https://via.placeholder.com/150';

        modelContainer.innerHTML += `
            <a href="model.html?model=${encodeURIComponent(m.name)}" style="display:block; text-decoration:none; background:#1a1a24; border-radius:10px; overflow:hidden; border:1px solid #282836; text-align:center;">
                <div style="width:100%; height:135px; overflow:hidden; background:#000;">
                    <img src="${displayImg}" alt="${m.name}" style="width:100%; height:100%; object-fit:cover; display:block; border-radius:0; border:none;" onerror="this.onerror=null; this.src='https://via.placeholder.com/150';">
                </div>
                <div style="padding:6px 4px;">
                    <span style="font-size:12px; font-weight:600; color:#fff; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.name}</span>
                </div>
            </a>
        `;
    });
}

// 7. Render Categories
function renderCategories() {
    const categoryContainer = document.getElementById('categoryContainer') || document.getElementById('category-container');
    if (!categoryContainer) return;

    categoryContainer.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px; padding: 15px;";
    categoryContainer.innerHTML = '';

    if (!categoryData || categoryData.length === 0) {
        categoryContainer.innerHTML = '<p style="color:#888; text-align:center; width:100%;">Category မရှိသေးပါ။</p>';
        return;
    }

    categoryData.forEach(cat => {
        const displayImg = (cat.image && cat.image.trim() !== '') ? cat.image : 'https://via.placeholder.com/150';

        categoryContainer.innerHTML += `
            <a href="index.html?category=${encodeURIComponent(cat.name)}" style="display:block; text-decoration:none; background:#1a1a24; border-radius:10px; overflow:hidden; border:1px solid #282836; text-align:center;">
                <div style="width:100%; height:135px; overflow:hidden; background:#000;">
                    <img src="${displayImg}" alt="${cat.name}" style="width:100%; height:100%; object-fit:cover; display:block; border-radius:0; border:none;" onerror="this.onerror=null; this.src='https://via.placeholder.com/150';">
                </div>
                <div style="padding:8px 4px;">
                    <span style="font-size:12px; font-weight:600; color:#fff; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${cat.name}</span>
                </div>
            </a>
        `;
    });
}

document.addEventListener("DOMContentLoaded", loadDataFromWorker);
