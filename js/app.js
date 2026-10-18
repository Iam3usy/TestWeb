const WORKER_API_URL = "https://myhubapp.dathalay1.workers.dev/api/catalog";
const MODEL_API_URL = "https://script.google.com/macros/s/AKfycbw6lq48q4joTcZWkOblA-gxy-UubGVjIHNaq82_epx6IwbVK5kC_qccJ7QQscismt0sWQ/exec";
const STREAM_BASE_URL = "https://myhubapp.dathalay1.workers.dev/stream?file_id=";

let videoData = [];

// Google Drive Link ကို Thumbnail အတွက် တိုက်ရိုက်ပြောင်းရန်
function getDirectDriveLink(url) {
    if (!url) return '';
    const str = String(url).trim();
    if (str.includes('drive.google.com') || str.includes('docs.google.com')) {
        const match = str.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    return str;
}

function cleanText(text) {
    return text ? String(text).replace(/[\r\n]+/g, '').trim() : '';
}

// 🌐 1. Global Session & Active Menu Check (စာမျက်နှာတိုင်းအတွက် Menu နှင့် Login အခြေအနေကို ထိန်းချုပ်ခြင်း)
function initSidebarAndSession() {
    const currentPath = window.location.pathname;
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    
    const menuList = document.querySelector(".sidebar .menu-list");
    if (menuList) {
        const menuItems = menuList.querySelectorAll("li");
        
        menuItems.forEach(li => {
            li.classList.remove("active");

            const link = li.querySelector("a");
            if (!link) return;
            
            const href = link.getAttribute("href");
            
            // Login / Account မီနူး စစ်ဆေးခြင်း
            if (href === "login.html" || href === "account.html") {
                if (isLoggedIn === 'true') {
                    link.setAttribute("href", "account.html");
                    link.innerHTML = `<i class="fa-solid fa-user"></i> Account`;
                    if (currentPath.includes("account.html")) {
                        li.classList.add("active");
                    }
                } else {
                    link.setAttribute("href", "login.html");
                    link.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Login`;
                    if (currentPath.includes("login.html")) {
                        li.classList.add("active");
                    }
                }
            } 
            // တခြား မီနူးများအတွက် Active စစ်ဆေးခြင်း
            else {
                if (href && currentPath.includes(href)) {
                    li.classList.add("active");
                }
            }
        });
    }
}

// Sidebar ဖွင့်/ပိတ်
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent') || document.querySelector('.main-content');
    if (sidebar) sidebar.classList.toggle('open');
    if (mainContent) mainContent.classList.toggle('expanded');
}

// 🌐 2. Page အလိုက် Data ဆွဲခြင်းနှင့် Render လုပ်ခြင်း
document.addEventListener("DOMContentLoaded", async () => {
    // ပထမဦးစွာ Sidebar နှင့် Session ကို စစ်ဆေးပါ
    initSidebarAndSession();

    const path = window.location.pathname;

    // A. Model Page အတွက် သီးသန့် လုပ်ဆောင်ချက်
    if (path.includes('model.html')) {
        await loadModelPageData();
        return;
    }

    // B. တခြား Page များ (Index, VIP စသည်ဖြင့်) အတွက် ဗီဒီယို ဒေတာဆွဲခြင်း
    const container = document.getElementById('videoContainer');
    if (!container) return;

    try {
        const res = await fetch(WORKER_API_URL);
        const data = await res.json();

        if (Array.isArray(data)) {
            videoData = data.filter(item => item && item.file_id).map(item => ({
                title: cleanText(item.title),
                views: Number(item.views) || 0,
                thumbnail: getDirectDriveLink(item.thumbnail) || 'https://via.placeholder.com/300x180',
                file_id: cleanText(item.file_id),
                stream_url: `${STREAM_BASE_URL}${cleanText(item.file_id)}`,
                isVip: String(item.is_Vip || item.is_vip || '').toLowerCase() === 'true'
            }));

            renderMainContent(path, container);
        }
    } catch (err) {
        console.error("Data Load Error:", err);
    }
});

// Main Content (Index / VIP) များကို ခွဲထုတ်ပြသခြင်း
function renderMainContent(path, container) {
    if (path.includes('vip.html')) {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (!isLoggedIn) {
            window.location.href = 'login.html';
            return;
        }

        let vipList = videoData.filter(v => v.isVip);
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
                    <div class="video-info"><h3>${v.title}</h3></div>
                </div>
            `;
        });
    } else {
        let list = [...videoData].filter(v => !v.isVip);
        list.reverse();

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
                    <div class="video-info"><h3>${v.title}</h3></div>
                </div>
            `;
        });
    }
}

// C. Model Page အတွက် ဒေတာနှင့် Card များကို တည်ဆောက်ခြင်း
async function loadModelPageData() {
    const urlParams = new URLSearchParams(window.location.search);
    const selectedModel = urlParams.get('model');
    const pageTitle = document.getElementById('pageTitle');

    if (selectedModel && pageTitle) {
        pageTitle.innerText = selectedModel;
    }

    try {
        const response = await fetch(MODEL_API_URL);
        const data = await response.json();

        if (Array.isArray(data)) {
            const allVideos = data.map(item => ({
                title: item.title ? String(item.title).trim() : '',
                model_name: item.model_name ? String(item.model_name).trim() : '',
                model: item.model ? String(item.model).trim() : '',
                model_image: item.model_image ? String(item.model_image).trim() : '',
                thumbnail: item.thumbnail ? String(item.thumbnail).trim() : '',
                file_id: item.file_id ? String(item.file_id).trim() : '',
                stream_url: item.file_id ? `${STREAM_BASE_URL}${String(item.file_id).trim()}` : '',
                views: item.views || 0
            }));

            if (selectedModel) {
                const modelContainer = document.getElementById('modelContainer');
                const videoContainer = document.getElementById('videoContainer');
                if (modelContainer) modelContainer.style.display = 'none';
                if (videoContainer) videoContainer.style.display = 'grid';
                renderVideosForModel(selectedModel, allVideos);
            } else {
                const modelContainer = document.getElementById('modelContainer');
                const videoContainer = document.getElementById('videoContainer');
                if (videoContainer) videoContainer.style.display = 'none';
                if (modelContainer) modelContainer.style.display = 'grid';
                renderModelsAtoZ(allVideos);
            }
        }
    } catch (err) {
        console.error("Model Fetch Error:", err);
        const mContainer = document.getElementById('modelContainer');
        if (mContainer) {
            mContainer.innerHTML = '<p style="color:#ff4d4d; text-align:center; padding:30px; width:100%;">ဒေတာဆွဲယူရာတွင် အမှားအယွင်းရှိသည်။</p>';
        }
    }
}

// 1. A to Z Model Cards (ပုံမပေါ်ပါက Female Icon ဖြင့် အစားထိုးပြသရန် ပြင်ဆင်ထားသည်)
function renderModelsAtoZ(videos) {
    const container = document.getElementById('modelContainer');
    if (!container) return;

    container.style.cssText = "display: grid !important; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)) !important; gap: 10px !important; padding: 15px !important;";
    container.innerHTML = '';

    const modelMap = new Map();

    videos.forEach(v => {
        if (v.model_name) {
            let names = v.model_name.split(',').map(n => n.trim()).filter(n => n !== '');
            names.forEach(name => {
                let lowerKey = name.toLowerCase().trim();
                if (!modelMap.has(lowerKey)) {
                    modelMap.set(lowerKey, {
                        name: name,
                        image: v.model_image || '',
                        count: 0
                    });
                } else {
                    let m = modelMap.get(lowerKey);
                    if ((!m.image || m.image.includes('placeholder')) && v.model_image) {
                        m.image = v.model_image;
                    }
                }
            });
        }
    });

    videos.forEach(v => {
        if (v.model) {
            let vModels = v.model.split(',').map(n => n.trim().toLowerCase()).filter(n => n !== '');
            modelMap.forEach((mObj, lowerKey) => {
                if (vModels.includes(lowerKey)) {
                    mObj.count++;
                }
            });
        }
    });

    const modelsList = Array.from(modelMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
    );

    if (modelsList.length === 0) {
        container.innerHTML = '<p style="color:#888; text-align:center; padding:40px; width:100%; grid-column:1/-1;">Model ဒေတာ မရှိသေးပါ။</p>';
        return;
    }

    modelsList.forEach(m => {
        const imageSrc = m.image && !m.image.includes('placeholder') ? m.image : '';

        container.innerHTML += `
            <a href="model.html?model=${encodeURIComponent(m.name)}" class="video-card" style="text-decoration:none !important; display:flex !important; flex-direction:column !important; background:var(--card-bg, #141414) !important; border-radius:8px !important; overflow:hidden !important; border:1px solid var(--border-color, #262626) !important;">
                <div class="thumbnail-box" style="position:relative !important; width:100% !important; height:130px !important; background:#111 !important; overflow:hidden !important; display:flex !important; align-items:center; justify-content:center;">
                    <img src="${imageSrc}" alt="${m.name}" style="width:100% !important; height:100% !important; object-fit:cover !important; display:${imageSrc ? 'block' : 'none'} !important;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div style="display:${imageSrc ? 'none' : 'flex'}; position:absolute; top:0; left:0; width:100%; height:100%; align-items:center; justify-content:center; color:var(--primary-color, #ff3366); font-size:35px; background:#111;">
                        <i class="fa-solid fa-venus"></i>
                    </div>
                    <span class="view-badge" style="position:absolute !important; bottom:4px !important; right:4px !important; background:rgba(0,0,0,0.7) !important; color:#fff !important; font-size:10px !important; padding:2px 5px !important; border-radius:4px !important;">${m.count}</span>
                </div>
                <div class="video-info" style="padding:8px 5px !important; text-align:center !important; overflow:hidden !important;">
                    <h3 style="font-size:11px !important; margin:0 !important; color:#fff !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; width:100% !important;">${m.name}</h3>
                </div>
            </a>
        `;
    });
}

// 2. Model နှိပ်လိုက်လျှင် သက်ဆိုင်ရာ ဇာတ်ကားများကို ပြသခြင်း
function renderVideosForModel(selectedModel, videos) {
    const container = document.getElementById('videoContainer');
    if (!container) return;

    container.style.cssText = "display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; padding: 15px !important;";
    container.innerHTML = '';

    const decodedModel = decodeURIComponent(selectedModel).trim().toLowerCase();

    const matchedVideos = videos.filter(v => {
        if (!v.model) return false;
        let vModels = v.model.split(',').map(n => n.trim().toLowerCase());
        return vModels.includes(decodedModel);
    });

    if (matchedVideos.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#a4b0be; width:100%; grid-column:1/-1; padding:30px;">"${selectedModel}" နှင့် ပတ်သက်သော ဇာတ်ကား မရှိသေးပါ။</p>`;
        return;
    }

    matchedVideos.forEach(v => {
        const thumbContent = v.thumbnail 
            ? `<video src="${v.thumbnail}" autoplay loop muted playsinline style="width:100%; height:100%; object-fit:cover; display:block;"></video>` 
            : `<div style="width:100%; height:100%; background:#000;"></div>`;

        container.innerHTML += `
            <div class="video-card" onclick="openPlayer('${v.file_id}', '${v.stream_url}')" style="background:var(--card-bg, #141414); border-radius:8px; overflow:hidden; border:1px solid var(--border-color, #262626); cursor:pointer; display:flex; flex-direction:column;">
                <div class="thumbnail-box" style="position:relative; width:100%; aspect-ratio:16/9; background:#000; overflow:hidden;">
                    ${thumbContent}
                    <span class="view-badge" style="position:absolute; bottom:6px; right:6px; background:rgba(0,0,0,0.7); color:#ff3366; font-size:11px; padding:2px 6px; border-radius:4px; display:flex; align-items:center; gap:4px;">
                        <i class="fa-solid fa-eye" style="font-size:10px;"></i> ${v.views}
                    </span>
                </div>
                <div class="video-info" style="padding:10px 8px;">
                    <h3 style="font-size:12px; font-weight:600; color:#fff; margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${v.title}</h3>
                </div>
            </div>
        `;
    });
}

// D. Video Player Modal (Double Tap 10s skip ပါဝင်သည်)
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
            <button onclick="closePlayer()" style="position:absolute; top:10px; right:15px; background:rgba(0,0,0,0.7); border:none; color:white; font-size:20px; cursor:pointer; z-index:10000; width:35px; height:35px; border-radius:50%;"><i class="fa-solid fa-xmark"></i></button>
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
        if (videojs.getPlayers()['my-video']) videojs.getPlayers()['my-video'].dispose();
        let player = videojs('my-video', { autoplay: true, controls: true, fluid: true, html5: { hls: { overrideNative: true } } });

        player.ready(function() {
            let box = document.getElementById('playerWrapper');
            let fb = document.getElementById('seekFeedback');
            let lastTap = 0;
            if (box) {
                box.addEventListener('click', function(e) {
                    let now = new Date().getTime();
                    if ((now - lastTag) < 350 && (now - lastTag) > 0) { // Fix typo if needed
                        let w = box.clientWidth;
                        let x = e.clientX - box.getBoundingClientRect().left;
                        if (x < w / 2) {
                            player.currentTime(Math.max(0, player.currentTime() - 10));
                            showFb("<< -10s");
                        } else {
                            player.currentTime(Math.min(player.duration(), player.currentTime() + 10));
                            showFb("+10s >>");
                        }
                    }
                    lastTap = now;
                });
            }
            function showFb(txt) {
                if (!fb) return;
                fb.innerText = txt;
                fb.style.opacity = '1';
                setTimeout(() => { fb.style.opacity = '0'; }, 500);
            }
        });
    }
}

function closePlayer() {
    let modal = document.getElementById('videoModal');
    if (modal) {
        if (window.videojs && videojs.getPlayers()['my-video']) videojs.getPlayers()['my-video'].dispose();
        modal.style.display = 'none';
        modal.innerHTML = '';
    }
}
