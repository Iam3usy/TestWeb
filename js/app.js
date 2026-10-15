Const WORKER_API_URL = "https://myhubapp.dathalay1.workers.dev/api/catalog";
const STREAM_BASE_URL = "https://myhubapp.dathalay1.workers.dev/stream?file_id=";

let videoData = [];
let modelData = [];
let categoryData = [];

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

async function loadDataFromWorker() {
    const isVipPage = window.location.pathname.includes('vip.html');

    // VIP Page ဖြစ်ပါက Login ရှိမရှိ စစ်ဆေးပြီး VIP ဗီဒီယိုများကို သီးသန့်ဆွဲထုတ်မည်
    if (isVipPage) {
        const isVip = localStorage.getItem('isVip');
        const username = localStorage.getItem('username');

        if (!isVip || !username) {
            window.location.href = 'login.html';
            return;
        }

        const welcomeUser = document.getElementById('welcomeUser');
        if (welcomeUser) welcomeUser.innerText = username;

        loadVipVideosFromJS();
        return;
    }

    // ပုံမှန် Public Page များအတွက်
    const urlParams = new URLSearchParams(window.location.search);
    const selectedModel = urlParams.get('model');
    const selectedCategory = urlParams.get('category');
    const pageTitle = document.getElementById('pageTitle') || document.querySelector('.header-title') || document.querySelector('h2');

    if (pageTitle) {
        if (selectedModel) pageTitle.innerText = selectedModel;
        else if (selectedCategory) pageTitle.innerText = selectedCategory;
    }

    try {
        const response = await fetch(WORKER_API_URL);
        const data = await response.json();

        if (Array.isArray(data)) {
            const validData = data.filter(item => item && typeof item === 'object');

            videoData = validData.filter(item => item.file_id && cleanText(item.file_id) !== '').map(item => {
                let thumb = getDirectDriveLink(item.thumbnail);
                const rawIsVip = item.is_Vip !== undefined ? item.is_Vip : (item.is_vip !== undefined ? item.is_vip : item.isVip);

                return {
                    title: cleanText(item.title),
                    model: cleanText(item.model),
                    model_name: cleanText(item.model_name),
                    category: cleanText(item.category),
                    category_name: cleanText(item.category_name),
                    views: item.views || 0,
                    thumbnail: thumb || 'https://via.placeholder.com/300x180',
                    file_id: cleanText(item.file_id),
                    stream_url: item.file_id ? `${STREAM_BASE_URL}${cleanText(item.file_id)}` : '',
                    isVip: String(rawIsVip || '').toLowerCase() === 'true'
                };
            });

            const modelMap = new Map();
            validData.forEach(item => {
                let rawModels = cleanText(item.model_name || item.model);
                let img = getDirectDriveLink(item.model_image || item.modelImage);
                let hasVideo = item.file_id && cleanText(item.file_id) !== '';
                if (rawModels !== '') {
                    let models = rawModels.split(',').map(m => cleanText(m)).filter(m => m !== '');
                    models.forEach(name => {
                        let lowerName = name.toLowerCase();
                        if (!modelMap.has(lowerName)) {
                            modelMap.set(lowerName, { name: name, image: img, count: 0 });
                        } else if (img && !modelMap.get(lowerName).image) {
                            modelMap.get(lowerName).image = img;
                        }
                        if (hasVideo) modelMap.get(lowerName).count++;
                    });
                }
            });
            modelData = Array.from(modelMap.values());

            const catMap = new Map();
            validData.forEach(item => {
                let catNameField = cleanText(item.category_name);
                let img = getDirectDriveLink(item.category_image || item.categoryImage);

                if (catNameField !== '') {
                    let cats = catNameField.split(',').map(c => cleanText(c)).filter(c => c !== '');
                    cats.forEach(name => {
                        let lowerName = name.toLowerCase();
                        if (!catMap.has(lowerName)) {
                            catMap.set(lowerName, { name: name, image: img, count: 0 });
                        } else if (img && !catMap.get(lowerName).image) {
                            catMap.get(lowerName).image = img;
                        }
                    });
                }
            });

            videoData.forEach(video => {
                if (video.category) {
                    let videoCats = video.category.split(',').map(c => cleanText(c).toLowerCase()).filter(c => c !== '');
                    videoCats.forEach(lowerCatName => {
                        if (catMap.has(lowerCatName)) {
                            catMap.get(lowerCatName).count++;
                        }
                    });
                }
            });

            categoryData = Array.from(catMap.values());

            const modelContainer = document.getElementById('modelContainer') || document.getElementById('model-container');
            const categoryContainer = document.getElementById('categoryContainer') || document.getElementById('category-container');
            const videoContainer = document.getElementById('videoContainer') || document.getElementById('video-container') || document.querySelector('.video-grid');

            if (selectedModel || selectedCategory) {
                if (modelContainer) modelContainer.style.display = 'none';
                if (categoryContainer) categoryContainer.style.display = 'none';
                if (videoContainer) {
                    renderContent();
                }
            } else if (window.location.pathname.includes('model.html')) {
                if (videoContainer) videoContainer.style.display = 'none';
                if (categoryContainer) categoryContainer.style.display = 'none';
                if (modelContainer) {
                    modelContainer.style.display = 'grid';
                    renderModelsDirect();
                }
            } else if (window.location.pathname.includes('category.html')) {
                if (videoContainer) videoContainer.style.display = 'none';
                if (modelContainer) modelContainer.style.display = 'none';
                if (categoryContainer) {
                    categoryContainer.style.display = 'grid';
                    renderCategoriesDirect();
                }
            } else {
                if (modelContainer) modelContainer.style.display = 'none';
                if (categoryContainer) categoryContainer.style.display = 'none';
                if (videoContainer) {
                    renderContent();
                }
            }
        }
    } catch (error) {
        console.error("Worker Data Fetch Error:", error);
    }
}

// VIP ဗီဒီယိုများကို ဂျာဗားစคစ်သက်သက်ဖြင့် ဆွဲထုတ်ဖော်ပြခြင်း
async function loadVipVideosFromJS() {
    try {
        const response = await fetch(WORKER_API_URL);
        const data = await response.json();

        const container = document.getElementById('vipVideoContainer');
        if (!container) return;
        container.innerHTML = '';

        if (Array.isArray(data)) {
            let vipVideos = data.filter(item => {
                const rawIsVip = item.is_Vip !== undefined ? item.is_Vip : (item.is_vip !== undefined ? item.is_vip : item.isVip);
                return item.file_id && cleanText(item.file_id) !== '' && (rawIsVip === true || String(rawIsVip).trim().toLowerCase() === 'true');
            });

            if (vipVideos.length === 0) {
                container.innerHTML = '<p class="empty-msg">No VIP Videos Available</p>';
                return;
            }

            vipVideos.forEach(video => {
                let thumb = getDirectDriveLink(video.thumbnail);
                let streamUrl = `${STREAM_BASE_URL}${cleanText(video.file_id)}`;
                let title = cleanText(video.title);

                container.innerHTML += `
                    <div class="video-card" onclick="openPlayer('${video.file_id}', '${streamUrl}')">
                        <div class="thumbnail-box">
                            <video src="${thumb}" autoplay loop muted playsinline></video>
                            <span class="view-badge">
                                <i class="fa-solid fa-crown" style="color: #f1c40f;"></i> VIP
                            </span>
                        </div>
                        <div class="video-info">
                            <h3>${title}</h3>
                        </div>
                    </div>
                `;
            });
        }
    } catch (error) {
        console.error("VIP Data Load Error:", error);
    }
            }
function renderModelsDirect() {
    const container = document.getElementById('modelContainer') || document.getElementById('model-container');
    if (!container) return;

    // minmax ကို 75px လို့ပေးလိုက်ရင် ဖုန်းမှာ ၃ ကတ်တိတိဆံ့ပြီး Desktop မှာ screen ကျယ်လာရင် အကွက်တွေ အလိုအလျောက် တိုးလာပါမယ်
    container.style.cssText = "display: grid !important; grid-template-columns: repeat(auto-fill, minmax(75px, 1fr)) !important; gap: 8px !important; padding: 10px !important;";
    container.innerHTML = '';

    if (modelData.length === 0) {
        container.innerHTML = '<p style="color:#888; text-align:center; padding:40px; width:100%; grid-column: 1 / -1;">Model မရှိသေးပါ။</p>';
        return;
    }

    modelData.forEach(model => {
        const displayImg = (model.image && model.image !== '') ? model.image : 'https://via.placeholder.com/150';
        container.innerHTML += `
            <a href="model.html?model=${encodeURIComponent(model.name)}" class="video-card" style="text-decoration:none !important; display:flex !important; flex-direction:column !important; background:var(--card-bg) !important; border-radius:8px !important; overflow:hidden !important; border:1px solid var(--border-color) !important;">
                <div class="thumbnail-box" style="position:relative !important; width:100% !important; height:110px !important; background:#000 !important; overflow:hidden !important;">
                    <img src="${displayImg}" alt="${model.name}" style="width:100% !important; height:100% !important; object-fit:cover !important; display:block !important;" onerror="this.onerror=null; this.src='https://via.placeholder.com/150';">
                    <span class="view-badge" style="position:absolute !important; bottom:4px !important; right:4px !important; background:rgba(0,0,0,0.7) !important; color:#fff !important; font-size:9px !important; padding:2px 4px !important; border-radius:3px !important;">${model.count}</span>
                </div>
                <div class="video-info" style="padding:5px 3px !important; text-align:center !important; overflow:hidden !important;">
                    <h3 style="font-size:10px !important; margin:0 !important; color:#fff !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; width:100% !important;">${model.name}</h3>
                </div>
            </a>
        `;
    });
}

function renderCategoriesDirect() {
    const container = document.getElementById('categoryContainer') || document.getElementById('category-container');
    if (!container) return;

    container.style.cssText = "display: grid !important; grid-template-columns: repeat(auto-fill, minmax(75px, 1fr)) !important; gap: 8px !important; padding: 10px !important;";
    container.innerHTML = '';

    if (categoryData.length === 0) {
        container.innerHTML = '<p style="color:#888; text-align:center; padding:40px; width:100%; grid-column: 1 / -1;">Category မရှိသေးပါ။</p>';
        return;
    }

    categoryData.forEach(cat => {
        const displayImg = (cat.image && cat.image !== '') ? cat.image : 'https://via.placeholder.com/150';
        container.innerHTML += `
            <a href="index.html?category=${encodeURIComponent(cat.name)}" class="video-card" style="text-decoration:none !important; display:flex !important; flex-direction:column !important; background:var(--card-bg) !important; border-radius:8px !important; overflow:hidden !important; border:1px solid var(--border-color) !important;">
                <div class="thumbnail-box" style="position:relative !important; width:100% !important; height:110px !important; background:#000 !important; overflow:hidden !important;">
                    <img src="${displayImg}" alt="${cat.name}" style="width:100% !important; height:100% !important; object-fit:cover !important; display:block !important;" onerror="this.onerror=null; this.src='https://via.placeholder.com/150';">
                    <span class="view-badge" style="position:absolute !important; bottom:4px !important; right:4px !important; background:rgba(0,0,0,0.7) !important; color:#fff !important; font-size:9px !important; padding:2px 4px !important; border-radius:3px !important;">${cat.count}</span>
                </div>
                <div class="video-info" style="padding:5px 3px !important; text-align:center !important; overflow:hidden !important;">
                    <h3 style="font-size:10px !important; margin:0 !important; color:#fff !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; width:100% !important;">${cat.name}</h3>
                </div>
            </a>
        `;
    });
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar') || document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent') || document.querySelector('.main-content');
    if (sidebar) {
        sidebar.classList.toggle('open');
        sidebar.classList.toggle('closed');
        sidebar.classList.toggle('active');
    }
    if (mainContent) {
        mainContent.classList.toggle('expanded');
    }
}

function openPlayer(fileId, streamUrl) {
    if (!streamUrl) return;

    if (fileId) {
        fetch(WORKER_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_id: fileId })
        }).catch(err => console.error("View increment error:", err));
    }

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
            <div id="playerWrapper" style="position:relative; width:100%;">
                <video id="my-video" class="video-js vjs-default-skin vjs-big-play-centered" controls preload="auto" style="width:100%; aspect-ratio:16/9;">
                    <source src="${streamUrl}" type="application/x-mpegURL">
                </video>
                <!-- Double Tap Visual Feedback -->
                <div id="seekFeedback" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:white; background:rgba(0,0,0,0.8); padding:8px 16px; border-radius:20px; font-size:16px; font-weight:bold; pointer-events:none; opacity:0; transition:opacity 0.2s; z-index:1000;"></div>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    
    if (window.videojs) {
        if (videojs.getPlayers()['my-video']) {
            videojs.getPlayers()['my-video'].dispose();
        }
        let player = videojs('my-video', {
            autoplay: true,
            controls: true,
            fluid: true,
            html5: {
                hls: { overrideNative: true }
            }
        });

        // Double Tap to Skip Logic
        player.ready(function() {
            let playerBox = document.getElementById('playerWrapper');
            let feedback = document.getElementById('seekFeedback');
            let lastTapTime = 0;
            let feedbackTimeout;

            if (playerBox) {
                playerBox.addEventListener('click', function(e) {
                    let currentTime = new Date().getTime();
                    let tapLength = currentTime - lastTapTime;
                    
                    if (tapLength < 350 && tapLength > 0) {
                        let boxWidth = playerBox.clientWidth;
                        let clickX = e.clientX - playerBox.getBoundingClientRect().left;

                        if (clickX < boxWidth / 2) {
                            player.currentTime(Math.max(0, player.currentTime() - 10));
                            showFeedback("<< -10s");
                        } else {
                            player.currentTime(Math.min(player.duration(), player.currentTime() + 10));
                            showFeedback("+10s >>");
                        }
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    lastTapTime = currentTime;
                });
            }

            function showFeedback(text) {
                if (!feedback) return;
                feedback.innerText = text;
                feedback.style.opacity = '1';
                clearTimeout(feedbackTimeout);
                feedbackTimeout = setTimeout(() => {
                    feedback.style.opacity = '0';
                }, 500);
            }
        });
    }
}

function closePlayer() {
    const modal = document.getElementById('videoModal');
    if (modal) {
        if (window.videojs && videojs.getPlayers()['my-video']) videojs.getPlayers()['my-video'].dispose();
        modal.style.display = 'none';
        modal.innerHTML = '';
    }
}

function renderContent() {
    const container = document.getElementById('videoContainer') || document.getElementById('video-container') || document.querySelector('.video-grid');
    if (!container) return;
    
    container.style.cssText = "display: flex !important; flex-direction: column !important; gap: 20px !important; max-width: 650px !important; margin: 0 auto !important; padding: 15px !important;";
    container.innerHTML = '';

    const urlParams = new URLSearchParams(window.location.search);
    const selectedModel = urlParams.get('model');
    const selectedCategory = urlParams.get('category');

    let displayData = videoData.filter(v => v.file_id && v.file_id.trim() !== '' && !v.isVip);

    if (selectedModel) {
        displayData = displayData.filter(item => {
            const targetModel = item.model ? item.model : item.model_name;
            if (!targetModel) return false;
            const models = targetModel.split(',').map(m => cleanText(m).toLowerCase());
            return models.includes(cleanText(selectedModel).toLowerCase());
        });
    }

    if (selectedCategory) {
        displayData = displayData.filter(item => {
            const targetCat = item.category ? item.category : item.category_name;
            if (!targetCat) return false;
            const cats = targetCat.split(',').map(c => cleanText(c).toLowerCase());
            return cats.includes(cleanText(selectedCategory).toLowerCase());
        });
    }

    if (displayData.length === 0) {
        container.innerHTML = '<p class="empty-msg">No Videos for this Content</p>';
        return;
    }

    displayData.forEach(video => {
        container.innerHTML += `
            <div class="video-card" onclick="openPlayer('${video.file_id}', '${video.stream_url}')">
                <div class="thumbnail-box">
                    <video src="${video.thumbnail}" autoplay loop muted playsinline></video>
                    <span class="view-badge">
                        <i class="fa-solid fa-eye"></i> ${video.views || 0}
                    </span>
                </div>
                <div class="video-info">
                    <h3>${video.title || ''}</h3>
                </div>
            </div>
        `;
    });
}

document.addEventListener("DOMContentLoaded", loadDataFromWorker);


 
