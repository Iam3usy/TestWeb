// --- 1. CONFIGURATION URLs (URL ၃ ခု) ---
const WORKER_API_URL = "https://myhubapp.dathalay1.workers.dev/api/catalog";
const STREAM_BASE_URL = "https://myhubapp.dathalay1.workers.dev/api/stream?file_id=";
const APPS_SCRIPT_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL"; // Google Apps Script URL ကို ဒီမှာထည့်ပါ

// Global Data Stores
let videoData = [];
let modelData = [];
let categoryData = [];

// 2. Fetch Data From Worker
async function loadDataFromWorker() {
    try {
        const response = await fetch(WORKER_API_URL);
        const data = await response.json();
        
        if (Array.isArray(data)) {
            // Sheet schema: category_name, model_name, title, model, category, views, thumbnail, file_id, is_vip, model_image, category_image
            videoData = data.map(v => ({
                category_name: v.category_name,
                model_name: v.model_name,
                title: v.title,
                model: v.model,
                category: v.category,
                views: Number(v.views) || 0,
                thumbnail: v.thumbnail,
                file_id: v.file_id,
                is_vip: v.is_vip === true || v.is_vip === "true" || v.is_vip === "TRUE",
                model_image: v.model_image,
                category_image: v.category_image
            }));

            // နောက်ဆုံးတင်ထားတာ အပေါ်ဆုံးရောက်ရန် (Latest First)
            videoData.reverse();

            processModels();
            processCategories();
            handlePageRouting();
        }
    } catch (error) {
        console.error("Worker Data Fetch Error:", error);
    }
}

// 3. Process Models (A to Z & Count)
function processModels() {
    const map = new Map();
    videoData.forEach(v => {
        if (v.model_name) {
            if (!map.has(v.model_name)) {
                map.set(v.model_name, { name: v.model_name, image: v.model_image || '', count: 0 });
            }
            map.get(v.model_name).count++;
        }
    });
    modelData = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// 4. Process Categories (A to Z & Count)
function processCategories() {
    const map = new Map();
    videoData.forEach(v => {
        if (v.category_name) {
            if (!map.has(v.category_name)) {
                map.set(v.category_name, { name: v.category_name, image: v.category_image || '', count: 0 });
            }
            map.get(v.category_name).count++;
        }
    });
    categoryData = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// 5. Page Routing Handler
function handlePageRouting() {
    const path = window.location.pathname;
    if (path.includes('popular.html')) {
        renderPopularVideos();
    } else if (path.includes('model.html') && typeof renderModelsPage === 'function') {
        renderModelsPage();
    } else if (path.includes('category.html') && typeof renderCategoriesPage === 'function') {
        renderCategoriesPage();
    } else if (path.includes('vip.html') && typeof renderVipPage === 'function') {
        renderVipPage();
    } else if (path.includes('account.html')) {
        loadAccountInfo();
    } else {
        renderLatestVideos(); // index.html
    }
}

// 6. Render Latest Videos (index.html)
function renderLatestVideos() {
    const container = document.getElementById('videoContainer');
    if (!container) return;
    container.innerHTML = '';

    if (videoData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#a4b0be; grid-column:1/-1;">No videos found</p>';
        return;
    }

    videoData.forEach(v => {
        let crown = v.is_vip ? `<span class="crown-badge" style="position:absolute; bottom:8px; left:8px; background:rgba(0,0,0,0.8); padding:3px 6px; border-radius:4px;"><i class="fa-solid fa-crown" style="color:#f1c40f;"></i></span>` : '';
        container.innerHTML += `
            <div class="video-card" onclick="openPlayer('${v.file_id}')">
                <div class="thumbnail-box">
                    <video src="${v.thumbnail}" autoplay loop muted playsinline></video>
                    ${crown}
                    <span class="view-badge"><i class="fa-solid fa-eye"></i> ${v.views}</span>
                </div>
                <div class="video-info">
                    <h3>${v.title}</h3>
                </div>
            </div>
        `;
    });
}

// 7. Render Popular Videos (popular.html)
function renderPopularVideos() {
    const container = document.getElementById('videoContainer');
    if (!container) return;
    container.innerHTML = '';

    let sortedList = [...videoData].sort((a, b) => b.views - a.views);

    sortedList.forEach(v => {
        let crown = v.is_vip ? `<span class="crown-badge" style="position:absolute; bottom:8px; left:8px; background:rgba(0,0,0,0.8); padding:3px 6px; border-radius:4px;"><i class="fa-solid fa-crown" style="color:#f1c40f;"></i></span>` : '';
        container.innerHTML += `
            <div class="video-card" onclick="openPlayer('${v.file_id}')">
                <div class="thumbnail-box">
                    <video src="${v.thumbnail}" autoplay loop muted playsinline></video>
                    ${crown}
                    <span class="view-badge"><i class="fa-solid fa-eye"></i> ${v.views}</span>
                </div>
                <div class="video-info">
                    <h3>${v.title}</h3>
                </div>
            </div>
        `;
    });
}

// 8. Video Player Modal (Full Screen & 15s Skip)
function openPlayer(fileId) {
    if (!fileId) return;
    let streamUrl = STREAM_BASE_URL + fileId;
    
    let modal = document.getElementById('videoModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'videoModal';
        modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:#000; z-index:9999; display:flex; flex-direction:column; justify-content:center; align-items:center;";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <button onclick="closePlayer()" style="position:absolute; top:20px; right:20px; background:none; border:none; color:#fff; font-size:24px; cursor:pointer; z-index:10000;"><i class="fa-solid fa-xmark"></i></button>
        <div style="position:relative; width:100%; max-width:800px;">
            <video id="mainVideoPlayer" class="video-js vjs-big-play-centered" controls preload="auto" autoplay style="width:100%; aspect-ratio:16/9;">
                <source src="${streamUrl}" type="application/x-mpegURL">
            </video>
            <button onclick="skipTime(15)" style="position:absolute; bottom:60px; right:20px; background:rgba(0,0,0,0.6); color:#fff; border:1px solid #fff; padding:6px 12px; border-radius:4px; cursor:pointer; z-index:10001;">+15s <i class="fa-solid fa-forward"></i></button>
        </div>
    `;
    modal.style.display = 'flex';
    
    if (typeof videojs !== 'undefined') {
        videojs('mainVideoPlayer');
    }
}

function closePlayer() {
    let modal = document.getElementById('videoModal');
    if (modal) {
        let player = document.getElementById('mainVideoPlayer');
        if (player && typeof videojs !== 'undefined') {
            videojs(player).dispose();
        }
        modal.style.display = 'none';
        modal.innerHTML = '';
    }
}

function skipTime(seconds) {
    let player = videojs('mainVideoPlayer');
    if (player) {
        player.currentTime(player.currentTime() + seconds);
    }
}

// 9. Login Form Handler (Apps Script သို့ ချိတ်ဆက်ရန်)
async function handleLogin(event) {
    event.preventDefault();
    
    const usernameInput = document.getElementById('usernameInput').value.trim();
    const vipKeyInput = document.getElementById('vipKeyInput').value.trim();
    
    if (!usernameInput || !vipKeyInput) {
        alert('Please fill in all fields');
        return;
    }

    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('device_id', deviceId);
    }

    // Apps Script သို့ ပို့၍ စစ်ဆေးခြင်း (သို့မဟုတ် Local Testing)
    try {
        /* 
        const res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ username: usernameInput, vip_key: vipKeyInput, device_id: deviceId })
        });
        const result = await res.json();
        if(!result.success) { alert(result.message); return; }
        */

        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('username', usernameInput);
        localStorage.setItem('vip_key', vipKeyInput);
        localStorage.setItem('expire_date', '2026-12-31');
        localStorage.setItem('device_id', deviceId);

        window.location.href = 'account.html';
    } catch (err) {
        console.error("Login Error:", err);
        alert("Login failed. Please check connection.");
    }
}

// 10. Load Account Info
function loadAccountInfo() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('accUsername').value = localStorage.getItem('username') || '';
    document.getElementById('accVipKey').value = localStorage.getItem('vip_key') || '';
    document.getElementById('accExpireDate').value = localStorage.getItem('expire_date') || '';
    document.getElementById('accDeviceId').value = localStorage.getItem('device_id') || '';

    const savedAvatar = localStorage.getItem('profile_avatar');
    if (savedAvatar && document.getElementById('profileAvatarImg')) {
        document.getElementById('profileAvatarImg').src = savedAvatar;
    }
}

function changeProfileAvatar(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Img = e.target.result;
            localStorage.setItem('profile_avatar', base64Img);
            document.getElementById('profileAvatarImg').src = base64Img;
        };
        reader.readAsDataURL(file);
    }
}

function handleLogout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('vip_key');
    localStorage.removeItem('expire_date');
    window.location.href = 'login.html';
}

// Toggle Sidebar
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

// Initialize on Load & Dynamic Sidebar Login State
document.addEventListener("DOMContentLoaded", () => {
    loadDataFromWorker();

    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const authItem = document.getElementById('sidebarAuthItem');
    if (isLoggedIn && authItem) {
        authItem.innerHTML = `<a href="account.html"><i class="fa-solid fa-user"></i> Account</a>`;
    }
});
