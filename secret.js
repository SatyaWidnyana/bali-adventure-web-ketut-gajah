import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase Configuration from User
const firebaseConfig = {
  apiKey: "AIzaSyC85tXoyPhEp7AcaBlLE9fVc3I23SqexKQ",
  authDomain: "bali-adventure-web-gajah-1.firebaseapp.com",
  projectId: "bali-adventure-web-gajah-1",
  storageBucket: "bali-adventure-web-gajah-1.firebasestorage.app",
  messagingSenderId: "318121455924",
  appId: "1:318121455924:web:4a1b16da1ebd01f4dd7561"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

// Navigation
const navItems = document.querySelectorAll('.nav-menu li');
const contentSections = document.querySelectorAll('.content-section');

// Loading Indicator (Simple implementation)
function showLoading() {
    let overlay = document.querySelector('.loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        document.body.appendChild(overlay);
    }
    overlay.classList.add('active');
}
function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.classList.remove('active');
}

// ---------------- SECURITY UTILITY ---------------- //
// Escapes HTML special characters to prevent XSS attacks
function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    ).replace(/\n/g, '<br>');
}

// ---------------- IMAGE COMPRESSION UTILITY ---------------- //
// Compress image to Base64 string heavily to avoid QuotaExceededError
function compressImage(file, maxWidth = 400) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                // Compress as JPEG 50% quality to ensure extremely small size (10kb - 20kb)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                resolve(dataUrl);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

// ---------------- AUTHENTICATION ---------------- //
// Listen to auth state
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.style.display = 'none';
        dashboardScreen.style.display = 'flex';
        loadServices();
        loadPromos();
        loadMoments();
    } else {
        loginScreen.style.display = 'flex';
        dashboardScreen.style.display = 'none';
    }
});

// ---------------- BRUTE FORCE PROTECTION ---------------- //
let loginAttempts = 0;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes
let lockoutUntil = 0;

// Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Check if account is locked
    const now = Date.now();
    if (now < lockoutUntil) {
        const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
        loginError.textContent = `Terlalu banyak percobaan login. Coba lagi dalam ${remainingSeconds} detik.`;
        return;
    }
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    loginError.textContent = "";
    showLoading();

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            hideLoading();
            loginAttempts = 0; // Reset on success
        })
        .catch((error) => {
            hideLoading();
            loginAttempts++;
            
            if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
                lockoutUntil = Date.now() + LOCKOUT_DURATION;
                loginError.textContent = "Terlalu banyak percobaan login. Akun terkunci selama 5 menit.";
                loginAttempts = 0;
            } else {
                // Generic error message — JANGAN tampilkan error asli Firebase
                // untuk mencegah email enumeration attack
                loginError.textContent = `Email atau password salah. (Percobaan ${loginAttempts}/${MAX_LOGIN_ATTEMPTS})`;
            }
            
            // Log the real error to console only (for debugging)
            console.error("Auth error code:", error.code);
        });
});

// Logout
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener('click', () => {
        signOut(auth);
    });
}

// Mobile Menu Toggle
const adminMenuToggle = document.getElementById('adminMenuToggle');
const sidebar = document.querySelector('.sidebar');
if (adminMenuToggle && sidebar) {
    adminMenuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
}

// ---------------- NAVIGATION ---------------- //
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        const target = item.getAttribute('data-target');
        contentSections.forEach(sec => {
            sec.style.display = sec.id === `${target}Section` ? 'block' : 'none';
        });

        // Close sidebar on mobile after clicking
        if (window.innerWidth <= 768 && sidebar) {
            sidebar.classList.remove('open');
        }
    });
});

// ---------------- SERVICES CRUD ---------------- //
const serviceModal = document.getElementById('serviceModal');
const serviceForm = document.getElementById('serviceForm');
const servicesTableBody = document.getElementById('servicesTableBody');

document.getElementById('addServiceBtn').addEventListener('click', () => {
    serviceForm.reset();
    document.getElementById('serviceId').value = "";
    document.getElementById('serviceModalTitle').textContent = "Add New Service";
    serviceModal.classList.add('active');
});

document.getElementById('closeServiceModal').addEventListener('click', () => {
    serviceModal.classList.remove('active');
});

function renderServicesTable(querySnapshotOrArray, isArray = false) {
    servicesTableBody.innerHTML = "";
    if (isArray ? querySnapshotOrArray.length === 0 : querySnapshotOrArray.empty) {
        servicesTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Belum ada layanan. Silakan klik tombol "Add Service" untuk menambahkan.</td></tr>';
        return;
    }
    
    const items = isArray ? querySnapshotOrArray : [];
    if (!isArray) {
        querySnapshotOrArray.forEach((docSnap) => {
            items.push({ id: docSnap.id, ...docSnap.data() });
        });
    }

    items.forEach(data => {
        const id = data.id;
        const titleEn = escapeHTML(data.title_en || data.title || "No Title (EN)");
        const descEn = escapeHTML(data.desc_en || data.description || "");
        const safeId = escapeHTML(id);
        const tr = document.createElement('tr');
        tr.id = `row-service-${safeId}`;
        tr.innerHTML = `
            <td><img src="${escapeHTML(data.imageUrl || '')}" alt="img" onerror="this.src='https://via.placeholder.com/60x40'"></td>
            <td>${titleEn}</td>
            <td>${descEn.substring(0, 50)}...</td>
            <td>
                <div class="action-btns">
                    <button class="btn-edit" data-service-id="${safeId}"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-danger" data-delete-id="${safeId}"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        servicesTableBody.appendChild(tr);
    });
    return items;
}

// Load Services
async function loadServices() {
    const cachedData = localStorage.getItem('kgb_admin_services');
    if (cachedData) {
        try {
            renderServicesTable(JSON.parse(cachedData), true);
        } catch(e) {}
    } else {
        servicesTableBody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    }

    try {
        const q = query(collection(db, "services"), orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        const freshItems = renderServicesTable(querySnapshot);
        // Cache the fresh data
        try { localStorage.setItem('kgb_admin_services', JSON.stringify(freshItems)); } catch(e) { console.warn("Cache full"); }
    } catch (error) {
        console.error("Error loading services: ", error);
        if (!cachedData) servicesTableBody.innerHTML = '<tr><td colspan="4">Error loading data.</td></tr>';
    }
}

// Delegated event listeners for service buttons (replaces inline onclick for security)
servicesTableBody.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-edit[data-service-id]');
    const deleteBtn = e.target.closest('.btn-danger[data-delete-id]');
    
    if (editBtn) {
        const id = editBtn.dataset.serviceId;
        if (id) window.editService(id);
    }
    if (deleteBtn) {
        const id = deleteBtn.dataset.deleteId;
        if (id) window.deleteService(id);
    }
});

// Add or Edit Service
serviceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    
    const id = document.getElementById('serviceId').value;
    const titleEn = document.getElementById('serviceTitleEn').value;
    const titleId = document.getElementById('serviceTitleId').value;
    const descEn = document.getElementById('serviceDescEn').value;
    const descId = document.getElementById('serviceDescId').value;
    const fileInput = document.getElementById('serviceImage');

    try {
        let imageUrl = null;

        // If file is selected, compress it heavily to base64
        if (fileInput.files.length > 0) {
            imageUrl = await compressImage(fileInput.files[0], 400);
        }

        const serviceData = {
            title_en: titleEn,
            title_id: titleId,
            desc_en: descEn,
            desc_id: descId,
            updatedAt: serverTimestamp()
        };

        if (imageUrl) {
            serviceData.imageUrl = imageUrl;
        }

        if (id) {
            // Update existing
            await updateDoc(doc(db, "services", id), serviceData);
            
            // Instantly update DOM row instead of reloading entire database
            const row = document.getElementById(`row-service-${id}`);
            if (row) {
                // If there's a new image, use it. Otherwise, keep old image
                const oldImg = row.querySelector('img').src;
                const newImg = imageUrl ? imageUrl : oldImg;
                
                const safeTitleEn = escapeHTML(titleEn);
                const safeDescEn = escapeHTML(descEn);
                const safeImg = escapeHTML(newImg);

                row.innerHTML = `
                    <td><img src="${safeImg}" alt="img" onerror="this.src='https://via.placeholder.com/60x40'"></td>
                    <td>${safeTitleEn}</td>
                    <td>${safeDescEn.substring(0, 50)}...</td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-edit" onclick="editService('${id}')"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn-danger" onclick="deleteService('${id}')"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                `;
            }
        } else {
            // Add new
            serviceData.createdAt = serverTimestamp();
            const docRef = await addDoc(collection(db, "services"), serviceData);
            
            // Instantly append new row
            const tr = document.createElement('tr');
            tr.id = `row-service-${docRef.id}`;
            const safeTitleEn = escapeHTML(titleEn);
            const safeDescEn = escapeHTML(descEn);
            const safeImg = escapeHTML(imageUrl || '');

            tr.innerHTML = `
                <td><img src="${safeImg}" alt="img" onerror="this.src='https://via.placeholder.com/60x40'"></td>
                <td>${safeTitleEn}</td>
                <td>${safeDescEn.substring(0, 50)}...</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-edit" onclick="editService('${docRef.id}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-danger" onclick="deleteService('${docRef.id}')"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            // Remove the "Belum ada layanan" message if it exists
            if (servicesTableBody.querySelector('td[colspan="4"]')) {
                servicesTableBody.innerHTML = '';
            }
            servicesTableBody.appendChild(tr);
        }

        serviceModal.classList.remove('active');
        hideLoading();
    } catch (error) {
        console.error("Error saving service: ", error);
        alert("Error saving service. Make sure Firestore rules allow writes.");
        hideLoading();
    }
});

// Expose edit/delete to global scope for inline onclick handlers
window.editService = async (id) => {
    try {
        showLoading();
        // Fetch ONLY the specific document instead of the whole collection
        const docRef = doc(db, "services", id);
        const docSnap = await getDoc(docRef);
        let data = null;
        if (docSnap.exists()) {
            data = docSnap.data();
        }
        hideLoading();

        if (data) {
            document.getElementById('serviceId').value = id;
            document.getElementById('serviceTitleEn').value = data.title_en || data.title || '';
            document.getElementById('serviceTitleId').value = data.title_id || '';
            document.getElementById('serviceDescEn').value = data.desc_en || data.description || '';
            document.getElementById('serviceDescId').value = data.desc_id || '';
            document.getElementById('serviceModalTitle').textContent = "Edit Service";
            serviceModal.classList.add('active');
        }
    } catch (error) {
        hideLoading();
        console.error("Error fetching service details: ", error);
    }
};

window.deleteService = async (id) => {
    if (confirm("Are you sure you want to delete this service?")) {
        try {
            showLoading();
            await deleteDoc(doc(db, "services", id));
            // Instantly remove row from DOM
            const row = document.getElementById(`row-service-${id}`);
            if (row) row.remove();
            
            // If table is empty now, show message
            if (servicesTableBody.children.length === 0) {
                servicesTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Belum ada layanan. Silakan klik tombol "Add Service" untuk menambahkan.</td></tr>';
            }
            hideLoading();
        } catch (error) {
            hideLoading();
            console.error("Error deleting service: ", error);
            alert("Error deleting service.");
        }
    }
};

// ---------------- PROMOS CRUD ---------------- //
const promoModal = document.getElementById('promoModal');
const promoForm = document.getElementById('promoForm');
const promoGrid = document.getElementById('promoGrid');

document.getElementById('addPromoBtn').addEventListener('click', () => {
    promoForm.reset();
    promoModal.classList.add('active');
});
document.getElementById('closePromoModal').addEventListener('click', () => {
    promoModal.classList.remove('active');
});

function renderPromosGrid(querySnapshotOrArray, isArray = false) {
    promoGrid.innerHTML = "";
    if (isArray ? querySnapshotOrArray.length === 0 : querySnapshotOrArray.empty) {
        promoGrid.innerHTML = '<p>No promos found.</p>';
        return;
    }

    const items = isArray ? querySnapshotOrArray : [];
    if (!isArray) {
        querySnapshotOrArray.forEach((docSnap) => {
            items.push({ id: docSnap.id, ...docSnap.data() });
        });
    }

    items.forEach(data => {
        const id = data.id;
        const card = document.createElement('div');
        card.className = 'promo-card';
        card.innerHTML = `
            <button class="delete-promo" data-delete-id="${id}"><i class="fa-solid fa-trash"></i></button>
            <img src="${escapeHTML(data.imageUrl || '')}" alt="Promo">
            <div class="promo-info">
                <h4>${escapeHTML(data.title || 'Promo')}</h4>
            </div>
        `;
        promoGrid.appendChild(card);
    });
    return items;
}

promoGrid.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-promo[data-delete-id]');
    if (deleteBtn) {
        const id = deleteBtn.dataset.deleteId;
        if (id) window.deletePromo(id);
    }
});

async function loadPromos() {
    const cachedData = localStorage.getItem('kgb_admin_promos');
    if (cachedData) {
        try {
            renderPromosGrid(JSON.parse(cachedData), true);
        } catch(e) {}
    } else {
        promoGrid.innerHTML = '<p>Loading promos...</p>';
    }

    try {
        const q = query(collection(db, "promos"), orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        const freshItems = renderPromosGrid(querySnapshot);
        try { localStorage.setItem('kgb_admin_promos', JSON.stringify(freshItems)); } catch(e) { console.warn("Cache full"); }
    } catch (error) {
        console.error("Error loading promos: ", error);
        if (!cachedData) promoGrid.innerHTML = '<p>Error loading promos.</p>';
    }
}

promoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    
    const title = document.getElementById('promoTitle').value;
    const fileInput = document.getElementById('promoImage');

    if (fileInput.files.length === 0) {
        alert("Please select an image!");
        hideLoading();
        return;
    }

    try {
        const imageUrl = await compressImage(fileInput.files[0], 400);

        await addDoc(collection(db, "promos"), {
            title: title,
            imageUrl: imageUrl,
            createdAt: serverTimestamp()
        });

        promoModal.classList.remove('active');
        loadPromos();
        hideLoading();
    } catch (error) {
        console.error("Error uploading promo: ", error);
        alert("Error uploading promo.");
        hideLoading();
    }
});

window.deletePromo = async (id) => {
    if (confirm("Are you sure you want to delete this promo?")) {
        try {
            showLoading();
            await deleteDoc(doc(db, "promos", id));
            localStorage.removeItem('kgb_admin_promos');
            loadPromos();
            hideLoading();
        } catch (error) {
            hideLoading();
            console.error("Error deleting promo: ", error);
        }
    }
};

// ---------------- MOMENTS CRUD ---------------- //
const momentModal = document.getElementById('momentModal');
const momentForm = document.getElementById('momentForm');
const momentGrid = document.getElementById('momentGrid');

document.getElementById('addMomentBtn').addEventListener('click', () => {
    momentForm.reset();
    momentModal.classList.add('active');
});
document.getElementById('closeMomentModal').addEventListener('click', () => {
    momentModal.classList.remove('active');
});

function renderMomentsGrid(querySnapshotOrArray, isArray = false) {
    momentGrid.innerHTML = "";
    if (isArray ? querySnapshotOrArray.length === 0 : querySnapshotOrArray.empty) {
        momentGrid.innerHTML = '<p>No moments found.</p>';
        return;
    }

    const items = isArray ? querySnapshotOrArray : [];
    if (!isArray) {
        querySnapshotOrArray.forEach((docSnap) => {
            items.push({ id: docSnap.id, ...docSnap.data() });
        });
    }

    items.forEach(data => {
        const id = data.id;
        const card = document.createElement('div');
        card.className = 'promo-card';
        card.innerHTML = `
            <button class="delete-promo" data-delete-id="${id}"><i class="fa-solid fa-trash"></i></button>
            <img src="${escapeHTML(data.imageUrl || '')}" alt="Moment">
            <div class="promo-info">
                <h4>${escapeHTML(data.title || 'Guest Photo')}</h4>
            </div>
        `;
        momentGrid.appendChild(card);
    });
    return items;
}

momentGrid.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-promo[data-delete-id]');
    if (deleteBtn) {
        const id = deleteBtn.dataset.deleteId;
        if (id) window.deleteMoment(id);
    }
});

async function loadMoments() {
    if (!momentGrid) return;
    const cachedData = localStorage.getItem('kgb_admin_moments');
    if (cachedData) {
        try {
            renderMomentsGrid(JSON.parse(cachedData), true);
        } catch(e) {}
    } else {
        momentGrid.innerHTML = '<p>Loading moments...</p>';
    }

    try {
        const q = query(collection(db, "moments"), orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        const freshItems = renderMomentsGrid(querySnapshot);
        try { localStorage.setItem('kgb_admin_moments', JSON.stringify(freshItems)); } catch(e) { console.warn("Cache full"); }
    } catch (error) {
        console.error("Error loading moments: ", error);
        if (!cachedData) momentGrid.innerHTML = '<p>Error loading moments.</p>';
    }
}

momentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    
    const title = document.getElementById('momentTitle').value;
    const fileInput = document.getElementById('momentImage');

    if (fileInput.files.length === 0) {
        alert("Please select a photo!");
        hideLoading();
        return;
    }

    try {
        const imageUrl = await compressImage(fileInput.files[0], 400);

        await addDoc(collection(db, "moments"), {
            title: title,
            imageUrl: imageUrl,
            createdAt: serverTimestamp()
        });

        momentModal.classList.remove('active');
        loadMoments();
        hideLoading();
    } catch (error) {
        console.error("Error uploading moment: ", error);
        alert("Error uploading moment.");
        hideLoading();
    }
});

window.deleteMoment = async (id) => {
    if (confirm("Are you sure you want to delete this moment?")) {
        try {
            showLoading();
            await deleteDoc(doc(db, "moments", id));
            localStorage.removeItem('kgb_admin_moments');
            loadMoments();
            hideLoading();
        } catch (error) {
            hideLoading();
            console.error("Error deleting moment: ", error);
        }
    }
};
