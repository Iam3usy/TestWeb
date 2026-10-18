const WORKER_API_URL = "https://myhubapp.dathalay1.workers.dev/api/catalog";
const SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbw6lq48q4joTcZWkOblA-gxy-UubGVjIHNaq82_epx6IwbVK5kC_qccJ7QQscismt0sWQ/exec";
const STREAM_BASE_URL = "https://myhubapp.dathalay1.workers.dev/stream?file_id=";

let globalVideoData = [];
let allVideosData = [];

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

// 1. Global Session & Active Menu Check
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
            
            if (href === "login.html" || href === "account.html") {
                if (isLoggedIn === 'true') {
                    link.setAttribute("href", "account.html");
                    link.innerHTML = `<i class="fa-solid fa-user"></i> Account`;
                    if (currentPath.includes("account.html")) li.classList.add("active");
                } else {
                    link.setAttribute("href", "login.html");
                    link.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Login`;
                    if (currentPath.includes("login.html")) li.classList.add("active");
                }
            } else {
                if (href && currentPath.includes(href)) li.classList.add("active");
            }
        });
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent') || document.querySelector('.main-content');
    if (sidebar) sidebar.classList.toggle('open');
    if (mainContent) mainContent.classList.toggle('expanded');
}

function checkVipAccess(silent = false) {
    const isVip = localStorage.getItem('isVip') === 'true' || sessionStorage.getItem('isVip') === 'true' || localStorage.getItem('isLoggedIn') === 'true';
    if (!isVip && !silent) {
        alert("ဤကဏ္ဍကို အသုံးပြုရန် VIP Access (သို့) Login ဝင်ရန် လိုအပ်ပါသည်။");
    }
    return isVip;
}

// 2. Page Router
document.addEventListener("DOMContentLoaded", async () => {
    initSidebarAndSession();
    const path = window.location.pathname;

    if (path.includes('model.html')) {
        await loadModelPageData();
        return;
    }
    if (path.includes('category.html')) {
        await loadCategoryPageData();
        return;
    }
    if (path.includes('search.html')) {
        await loadSearchPageData();
        return;
    }

    const container = document.getElementById('videoContainer');
    if (!container) return;

    try {
        const res = await fetch(WORKER_API_URL);
        const data = await res.json();
        if (Array.isArray(data)) {
            globalVideoData = data.filter(item => item && item.file_id).map(item => ({
                title: cleanText(item.title),
                views: Number(item.views) || 0,
                thumbnail: getDirectDriveLink(item.thumbnail) || '',
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

function renderMainContent(path, container) {
    if (path.includes('vip.html')) {
        if (!localStorage.getItem('isLoggedIn')) {
            window.location.href = 'login.html';
            return;
        }
        let vipList = globalVideoData.filter(v => v.isVip);
        if (vipList.length === 0) {
            container.innerHTML = '<p class="empty-msg">VIP ဗီဒီယို မရှိသေးပါ။</p>';
            return;
        }
        container.innerHTML = '';
        vipList.forEach(v => {
            container.innerHTML += `
                <div class="video-card" onclick="openPlayer('${v.file_id}', '${v.stream_url}')">
                    <div class="thumbnail-box">
                        <video src="${v.thumbnail}" autoplay loop muted playsinline></video>
                        <span class="view-badge vip-badge"><i class="fa-solid fa-crown"></i> VIP</span>
                    </div>
                    <div class="video-info"><h3>${v.title}</h3></div>
                </div>
            `;
        });
    } else {
        let list = [...globalVideoData].filter(v => !v.isVip);
        list.reverse();
        if (list.length === 0) {
            container.innerHTML = '<p class="empty-msg">ဗီဒီယို မရှိသေးပါ</p>';
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

// Model Page
async function loadModelPageData() {
    const urlParams = new URLSearchParams(window.location.search);
    const selectedModel = urlParams.get('model');
    const pageTitle = document.getElementById('pageTitle');
    if (selectedModel && pageTitle) pageTitle.innerText = selectedModel;

    try {
        const response = await fetch(SCRIPT_API_URL);
        const data = await response.json();
        if (Array.isArray(data)) {
            const allVideos = data.map(item => ({
                title: item.title ? String(item.title).trim() : '',
                model_name: item.model_name ? String(item.model_name).trim() : (item.model ? String(item.model).trim() : ''),
                model: item.model ? String(item.model).trim() : '',
                model_image: item.model_image ? String(item.model_image).trim() : '',
                thumbnail: item.thumbnail ? String(item.thumbnail).trim() : '',
                file_id: item.file_id ? String(item.file_id).trim() : '',
                stream_url: item.file_id ? `${STREAM_BASE_URL}${String(item.file_id).trim()}` : '',
                views: item.views || 0
            }));

            if (selectedModel) {
                const mContainer = document.getElementById('modelContainer');
                const vContainer = document.getElementById('videoContainer');
                if (mContainer) mContainer.style.display = 'none';
                if (vContainer) {
                    vContainer.style.display = 'grid';
                    vContainer.className = 'video-grid';
                }
                renderVideosForModel(selectedModel, allVideos);
            } else {
                const vContainer = document.getElementById('videoContainer');
                const mContainer = document.getElementById('modelContainer');
                if (vContainer) vContainer.style.display = 'none';
                if (mContainer) {
                    mContainer.style.display = 'grid';
                    mContainer.className = 'model-grid';
                }
                renderModelsAtoZ(allVideos);
            }
        }
    } catch (err) {
        console.error("Model Fetch Error:", err);
    }
}

function renderModelsAtoZ(videos) {
    const container = document.getElementById('modelContainer');
    if (!container) return;
    container.className = 'model-grid';
    container.style.cssText = "display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 10px !important; padding: 12px !important;";
    container.innerHTML = '';

    const modelMap = new Map();
    videos.forEach(v => {
        let mName = v.model_name || v.model;
        if (mName) {
            mName.split(',').map(n => n.trim()).filter(n => n !== '').forEach(name => {
                let lowerKey = name.toLowerCase().trim();
                if (!modelMap.has(lowerKey)) {
                    modelMap.set(lowerKey, { name, image: v.model_image || '', count: 0 });
                } else {
                    let m = modelMap.get(lowerKey);
                    if ((!m.image || m.image.includes('placeholder')) && v.model_image) m.image = v.model_image;
                }
            });
        }
    });

    videos.forEach(v => {
        let mValue = v.model || v.model_name;
        if (mValue) {
            let vModels = mValue.split(',').map(n => n.trim().toLowerCase()).filter(n => n !== '');
            modelMap.forEach((mObj, lowerKey) => {
                if (vModels.includes(lowerKey)) mObj.count++;
            });
        }
    });

    const modelsList = Array.from(modelMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
    if (modelsList.length === 0) {
        container.innerHTML = '<p class="empty-msg">Model ဒေတာ မရှိသေးပါ။</p>';
        return;
    }

    modelsList.forEach(m => {
        const hasValidImage = m.image && !m.image.includes('placeholder');
        const imageSrc = hasValidImage ? m.image : '';
        container.innerHTML += `
            <a href="model.html?model=${encodeURIComponent(m.name)}" class="model-card">
                <div class="model-img-container">
                    <img src="${imageSrc}" alt="${m.name}" style="width:100%; height:100%; object-fit:cover; display:${imageSrc ? 'block' : 'none'};" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="model-placeholder" style="width:100%; height:100%; background:#222; display:${imageSrc ? 'none' : 'flex'}; align-items:center; justify-content:center; color:#777; font-size:24px;">
                        <i class="fa-solid fa-venus"></i>
                    </div>
                    <span class="video-count-badge"><i class="fa-solid fa-eye"></i> ${m.count}</span>
                </div>
                <div class="model-name">${m.name}</div>
            </a>
        `;
    });
}

function renderVideosForModel(selectedModel, videos) {
    const container = document.getElementById('videoContainer');
    if (!container) return;
    container.innerHTML = '';

    const decodedModel = decodeURIComponent(selectedModel).trim().toLowerCase();
    const matchedVideos = videos.filter(v => {
        let mValue = v.model || v.model_name;
        if (!mValue) return false;
        let vModels = mValue.split(',').map(n => n.trim().toLowerCase());
        return vModels.includes(decodedModel);
    });

    if (matchedVideos.length === 0) {
        container.innerHTML = `<p class="empty-msg" style="grid-column:1/-1; text-align:center; padding:30px;">"${selectedModel}" နှင့် ပတ်သက်သော ဇာတ်ကား မရှိသေးပါ။</p>`;
        return;
    }

    matchedVideos.forEach(v => {
        container.innerHTML += `
            <div class="video-card" onclick="openPlayer('${v.file_id}', '${v.stream_url}')">
                <div class="thumbnail-box">
                    <video src="${v.thumbnail}" autoplay loop muted playsinline style="width:100%; height:100%; object-fit:cover;"></video>
                    <span class="view-badge"><i class="fa-solid fa-eye"></i> ${v.views}</span>
                </div>
                <div class="video-info"><h3>${v.title}</h3></div>
            </div>
        `;
    });
}

// Category Page
async function loadCategoryPageData() {
    const urlParams = new URLSearchParams(window.location.search);
    const selectedCategory = urlParams.get('category');
    const pageTitle = document.getElementById('pageTitle');
    if (selectedCategory && pageTitle) pageTitle.innerText = selectedCategory;

    try {
        const response = await fetch(SCRIPT_API_URL);
        const data = await response.json();
        if (Array.isArray(data)) {
            const allVideos = data.map(item => ({
                title: item.title ? String(item.title).trim() : '',
                category_name: item.category_name ? String(item.category_name).trim() : (item.category ? String(item.category).trim() : ''),
                category: item.category ? String(item.category).trim() : '',
                category_image: item.category_image ? String(item.category_image).trim() : '',
                thumbnail: item.thumbnail ? String(item.thumbnail).trim() : '',
                file_id: item.file_id ? String(item.file_id).trim() : '',
                stream_url: item.file_id ? `${STREAM_BASE_URL}${String(item.file_id).trim()}` : '',
                views: item.views || 0
            }));

            if (selectedCategory) {
                const cContainer = document.getElementById('categoryContainer');
                const vContainer = document.getElementById('videoContainer');
                if (cContainer) cContainer.style.display = 'none';
                if (vContainer) {
                    vContainer.style.display = 'grid';
                    vContainer.className = 'video-grid';
                }
                renderVideosForCategory(selectedCategory, allVideos);
            } else {
                const vContainer = document.getElementById('videoContainer');
                const cContainer = document.getElementById('categoryContainer');
                if (vContainer) vContainer.style.display = 'none';
                if (cContainer) {
                    cContainer.style.display = 'grid';
                    cContainer.className = 'model-grid';
                }
                renderCategoriesAtoZ(allVideos);
            }
        }
    } catch (err) {
        console.error("Category Fetch Error:", err);
    }
}

function renderCategoriesAtoZ(videos) {
    const container = document.getElementById('categoryContainer');
    if (!container) return;
    container.className = 'model-grid';
    container.style.cssText = "display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 10px !important; padding: 12px !important;";
    container.innerHTML = '';

    const categoryMap = new Map();
    videos.forEach(v => {
        let catName = v.category_name || v.category;
        if (catName) {
            catName.split(',').map(n => n.trim()).filter(n => n !== '').forEach(name => {
                let lowerKey = name.toLowerCase().trim();
                if (!categoryMap.has(lowerKey)) {
                    categoryMap.set(lowerKey, { name, image: v.category_image || '', count: 0 });
                } else {
                    let c = categoryMap.get(lowerKey);
                    if ((!c.image || c.image.includes('placeholder')) && v.category_image) c.image = v.category_image;
                }
            });
        }
    });

    videos.forEach(v => {
        let catValue = v.category || v.category_name;
        if (catValue) {
            let vCategories = catValue.split(',').map(n => n.trim().toLowerCase()).filter(n => n !== '');
            categoryMap.forEach((cObj, lowerKey) => {
                if (vCategories.includes(lowerKey)) cObj.count++;
            });
        }
    });

    const categoriesList = Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
    if (categoriesList.length === 0) {
        container.innerHTML = '<p class="empty-msg">Category ဒေတာ မရှိသေးပါ။</p>';
        return;
    }

    categoriesList.forEach(c => {
        const hasValidImage = c.image && !c.image.includes('placeholder');
        const imageSrc = hasValidImage ? c.image : '';
        container.innerHTML += `
            <a href="category.html?category=${encodeURIComponent(c.name)}" class="model-card">
                <div class="model-img-container">
                    <img src="${imageSrc}" alt="${c.name}" style="width:100%; height:100%; object-fit:cover; display:${imageSrc ? 'block' : 'none'};" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="model-placeholder" style="width:100%; height:100%; background:#222; display:${imageSrc ? 'none' : 'flex'}; align-items:center; justify-content:center; color:#777; font-size:24px;">
                        <i class="fa-solid fa-hashtag"></i>
                    </div>
                    <span class="video-count-badge"><i class="fa-solid fa-hashtag"></i> ${c.count}</span>
                </div>
                <div class="model-name">${c.name}</div>
            </a>
        `;
    });
}

function renderVideosForCategory(selectedCategory, videos) {
    const container = document.getElementById('videoContainer');
    if (!container) return;
    container.innerHTML = '';

    const decodedCategory = decodeURIComponent(selectedCategory).trim().toLowerCase();
    const matchedVideos = videos.filter(v => {
        let catValue = v.category || v.category_name;
        if (!catValue) return false;
        let vCategories = catValue.split(',').map(n => n.trim().toLowerCase());
        return vCategories.includes(decodedCategory);
    });

    if (matchedVideos.length === 0) {
        container.innerHTML = `<p class="empty-msg" style="grid-column:1/-1; text-align:center; padding:30px;">"${selectedCategory}" နှင့် ပတ်သက်သော ဇာတ်ကား မရှိသေးပါ။</p>`;
        return;
    }

    matchedVideos.forEach(v => {
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

// Search Page
async function loadSearchPageData() {
    if (!checkVipAccess(true)) {
        const container = document.getElementById('searchContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ff4d4d;">
                    <i class="fa-solid fa-crown" style="font-size: 40px; margin-bottom: 15px;"></i>
                    <p style="font-size: 15px; margin-bottom: 15px;">ရှာဖွေရန် VIP Access လိုအပ်ပါသည်။</p>
                    <a href="login.html" class="vip-login-btn">Login / VIP ဝင်ရန်</a>
                </div>
            `;
        }
        return;
    }

    try {
        const response = await fetch(SCRIPT_API_URL);
        const data = await response.json();
        if (Array.isArray(data)) {
            allVideosData = data.map(item => ({
                title: item.title ? String(item.title).trim() : '',
                model_name: item.model_name ? String(item.model_name).trim() : '',
                model: item.model ? String(item.model).trim() : '',
                model_image: item.model_image ? String(item.model_image).trim() : '',
                category_name: item.category_name ? String(item.category_name).trim() : '',
                category: item.category ? String(item.category).trim() : '',
                category_image: item.category_image ? String(item.category_image).trim() : '',
                thumbnail: item.thumbnail ? String(item.thumbnail).trim() : '',
                file_id: item.file_id ? String(item.file_id).trim() : '',
                stream_url: item.file_id ? `${STREAM_BASE_URL}${String(item.file_id).trim()}` : '',
                views: item.views || 0
            })).filter(item => item.title !== '');
        }
    } catch (err) {
        console.error("Search Fetch Error:", err);
    }
}

function handleSearch() {
    if (!checkVipAccess()) return;
    const queryInput = document.getElementById('searchInput');
    const container = document.getElementById('searchContainer');
    if (!queryInput || !container) return;

    const query = queryInput.value.trim().toLowerCase();
    if (query === '') {
        container.innerHTML = `<p class="empty-msg" style="text-align: center; color: #888; padding: 30px;">ဇာတ်ကားများ ရှာဖွေရန် စာလုံးရိုက်ထည့်ပါ...</p>`;
        return;
    }

    const modelMap = new Map();
    allVideosData.forEach(v => {
        if (v.model_name) {
            v.model_name.split(',').map(n => n.trim()).filter(n => n !== '').forEach(name => {
                let lower = name.toLowerCase();
                if (!modelMap.has(lower)) modelMap.set(lower, { name, image: v.model_image || '', count: 0 });
            });
        }
    });
    allVideosData.forEach(v => {
        if (v.model) {
            let vModels = v.model.split(',').map(n => n.trim().toLowerCase());
            modelMap.forEach((mObj, lowerKey) => { if (vModels.includes(lowerKey)) mObj.count++; });
        }
    });

    const categoryMap = new Map();
    allVideosData.forEach(v => {
        if (v.category_name) {
            v.category_name.split(',').map(n => n.trim()).filter(n => n !== '').forEach(name => {
                let lower = name.toLowerCase();
                if (!categoryMap.has(lower)) categoryMap.set(lower, { name, image: v.category_image || '', count: 0 });
            });
        }
    });
    allVideosData.forEach(v => {
        if (v.category) {
            let vCategories = v.category.split(',').map(n => n.trim().toLowerCase());
            categoryMap.forEach((cObj, lowerKey) => { if (vCategories.includes(lowerKey)) cObj.count++; });
        }
    });

    const matchedModels = Array.from(modelMap.values()).filter(m => m.name.toLowerCase().includes(query));
    const matchedCategories = Array.from(categoryMap.values()).filter(c => c.name.toLowerCase().includes(query));
    const matchedVideos = allVideosData.filter(v => v.title.toLowerCase().includes(query));

    if (matchedModels.length === 0 && matchedCategories.length === 0 && matchedVideos.length === 0) {
        container.innerHTML = `<p class="empty-msg" style="text-align: center; color: #a4b0be; padding: 30px;">"${query}" နှင့် ကိုက်ညီသော ရလဒ် မရှိပါ။</p>`;
        return;
    }

    let htmlContent = '';

        // Model Section (ရှိပြီးသား .model-grid နှင့် .model-card ကို တိုက်ရိုက်သုံးရန်)
    if (matchedModels.length > 0) {
        htmlContent += `<h3 class="search-section-title" style="font-size: 15px; color: var(--primary-color, #e91e63); margin: 15px 0 10px 0; border-bottom: 1px solid var(--border-color, #262626); padding-bottom: 5px;">Model</h3><div class="model-grid">`;
        matchedModels.forEach(m => {
            const hasValidImage = m.image && !m.image.includes('placeholder');
            const imageSrc = hasValidImage ? m.image : '';
            htmlContent += `
                <a href="model.html?model=${encodeURIComponent(m.name)}" class="model-card">
                    <div class="model-img-container">
                        <img src="${imageSrc}" alt="${m.name}" style="display:${imageSrc ? 'block' : 'none'}; width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="model-placeholder" style="display:${imageSrc ? 'none' : 'flex'};"><i class="fa-solid fa-venus"></i></div>
                        <span class="video-count-badge"><i class="fa-solid fa-eye"></i> ${m.count}</span>
                    </div>
                    <div class="model-name">${m.name}</div>
                </a>
            `;
        });
        htmlContent += `</div>`;
    }

    // Category Section (ရှိပြီးသား .model-grid နှင့် .model-card ကို တိုက်ရိုက်သုံးရန်)
    if (matchedCategories.length > 0) {
        htmlContent += `<h3 class="search-section-title" style="font-size: 15px; color: var(--primary-color, #e91e63); margin: 20px 0 10px 0; border-bottom: 1px solid var(--border-color, #262626); padding-bottom: 5px;">Category</h3><div class="model-grid">`;
        matchedCategories.forEach(c => {
            const hasValidImage = c.image && !c.image.includes('placeholder');
            const imageSrc = hasValidImage ? c.image : '';
            htmlContent += `
                <a href="category.html?category=${encodeURIComponent(c.name)}" class="model-card">
                    <div class="model-img-container">
                        <img src="${imageSrc}" alt="${c.name}" style="display:${imageSrc ? 'block' : 'none'}; width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="model-placeholder" style="display:${imageSrc ? 'none' : 'flex'};"><i class="fa-solid fa-hashtag"></i></div>
                        <span class="video-count-badge"><i class="fa-solid fa-hashtag"></i> ${c.count}</span>
                    </div>
                    <div class="model-name">${c.name}</div>
                </a>
            `;
        });
        htmlContent += `</div>`;
    }

    // Video Section (ရှိပြီးသား .video-grid နှင့် .video-card ကို တိုက်ရိုက်သုံးရန်)
    if (matchedVideos.length > 0) {
        htmlContent += `<h3 class="search-section-title" style="font-size: 15px; color: var(--primary-color, #e91e63); margin: 20px 0 10px 0; border-bottom: 1px solid var(--border-color, #262626); padding-bottom: 5px;">Video</h3><div class="video-grid">`;
        matchedVideos.forEach(v => {
            htmlContent += `
                <div class="video-card" onclick="openPlayer('${v.file_id}', '${v.stream_url}')">
                    <div class="thumbnail-box">
                        <video src="${v.thumbnail}" autoplay loop muted playsinline style="width:100%; height:100%; object-fit:cover;"></video>
                        <span class="view-badge"><i class="fa-solid fa-eye"></i> ${v.views}</span>
                    </div>
                    <div class="video-info"><h3>${v.title}</h3></div>
                </div>
            `;
        });
        htmlContent += `</div>`;
    }


    container.innerHTML = htmlContent;
}


// Video Player Modal
function openPlayer(fileId, streamUrl) {
    if (!streamUrl) return;
    let modal = document.getElementById('videoModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'videoModal';
        modal.className = 'video-modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="video-modal-content">
            <button onclick="closePlayer()" class="video-modal-close"><i class="fa-solid fa-xmark"></i></button>
            <div id="playerWrapper" class="player-wrapper">
                <video id="my-video" class="video-js vjs-default-skin vjs-big-play-centered" controls preload="auto">
                    <source src="${streamUrl}" type="application/x-mpegURL">
                </video>
                <div id="seekFeedback" class="seek-feedback"></div>
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
