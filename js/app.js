const WORKER_API_URL = "https://myhubapp.dathalay1.workers.dev/api/catalog";
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

// Data ဆွဲထုတ်ခြင်း
async function loadDataFromWorker() {
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

            checkPageAndRender();
        }
    } catch (err) {
        console.error("Data Load Error:", err);
    }
}

// မျက်နှာပြင်အလိုက် ခွဲထုတ်ပြသခြင်း
function checkPageAndRender() {
    const path = window.location.pathname;
    const container = document.getElementById('videoContainer');
    if (!container) return;

    if (path.includes('vip.html')) {
        // VIP Page စစ်ဆေးခြင်း
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
                <div class="video-card" onclick="openPlayer('${v.stream_url}')">
                    <div class="thumbnail-box">
                        <video src="${v.thumbnail}" autoplay loop muted playsinline></video>
                        <span class="view-badge" style="background:#f1c40f; color:#000;"><i class="fa-solid fa-crown"></i> VIP</span>
                    </div>
                    <div class="video-info"><h3>${v.title}</h3></div>
                </div>
            `;
        });

    } else {
        // Index / Latest Page
        let list = [...videoData].filter(v => !v.isVip);
        list.reverse(); // Latest First

        if (list.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#a4b0be; grid-column:1/-1; padding:30px;">ဗီဒီယို မရှိသေးပါ</p>';
            return;
        }

        container.innerHTML = '';
        list.forEach(v => {
            container.innerHTML += `
                <div class="video-card" onclick="openPlayer('${v.stream_url}')">
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

// Sidebar ဖွင့်/ပိတ်
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// Video Player Modal (Double Tap 10s skip ပါဝင်သည်)
function openPlayer(streamUrl) {
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
                    if ((now - lastTap) < 350 && (now - lastTap) > 0) {
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

// 🌐 Global Session Check (စာမျက်နှာတိုင်းတွင် Login ဝင်ပြီးသားဖြစ်ပါက Menu ကို Account သို့ ပြောင်းရန်)
document.addEventListener("DOMContentLoaded", () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
        const menuList = document.querySelector(".sidebar .menu-list");
        if (menuList) {
            const menuItems = menuList.querySelectorAll("li");
            menuItems.forEach(li => {
                const link = li.querySelector("a");
                if (link && link.getAttribute("href") === "login.html") {
                    link.setAttribute("href", "account.html");
                    link.innerHTML = `<i class="fa-solid fa-user"></i> Account`;
                    li.classList.add("active");
                }
            });
        }
    }
    
    // အကယ်၍ ဗီဒီယို ကွန်တိန်နာ ပါရှိပါက ဒေတာဆွဲရန်
    if (document.getElementById('videoContainer')) {
        loadDataFromWorker();
    }
});
