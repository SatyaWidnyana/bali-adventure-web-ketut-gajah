import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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
const storage = getStorage(app);

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
    );
}

// ---------------- IMAGE COMPRESSION UTILITY ---------------- //
// Compress image to Base64 string to avoid Firebase Storage billing
function compressImage(file, maxWidth = 800) {
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
                // Compress as JPEG 70% quality to ensure small size (< 100kb usually)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
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

// Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    loginError.textContent = "";
    showLoading();

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            hideLoading();
        })
        .catch((error) => {
            hideLoading();
            loginError.textContent = "Login Failed: " + error.message;
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

// Load Services
async function loadServices() {
    servicesTableBody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    try {
        const q = query(collection(db, "services"), orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        servicesTableBody.innerHTML = "";
        
        if (querySnapshot.empty) {
            servicesTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Belum ada layanan. Silakan klik tombol "Add Service" untuk menambahkan.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            const titleEn = escapeHTML(data.title_en || data.title || "No Title (EN)");
            const descEn = escapeHTML(data.desc_en || data.description || "");
            const tr = document.createElement('tr');
            tr.id = `row-service-${id}`;
            tr.innerHTML = `
                <td><img src="${data.imageUrl || ''}" alt="img" onerror="this.src='https://via.placeholder.com/60x40'"></td>
                <td>${titleEn}</td>
                <td>${descEn.substring(0, 50)}...</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-edit" onclick="editService('${id}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-danger" onclick="deleteService('${id}')"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            servicesTableBody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error loading services: ", error);
        servicesTableBody.innerHTML = '<tr><td colspan="4">Error loading data.</td></tr>';
    }
}

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

        // If file is selected, compress it to base64
        if (fileInput.files.length > 0) {
            imageUrl = await compressImage(fileInput.files[0], 800);
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
                
                row.innerHTML = `
                    <td><img src="${newImg}" alt="img" onerror="this.src='https://via.placeholder.com/60x40'"></td>
                    <td>${titleEn}</td>
                    <td>${descEn.substring(0, 50)}...</td>
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
            tr.innerHTML = `
                <td><img src="${imageUrl || ''}" alt="img" onerror="this.src='https://via.placeholder.com/60x40'"></td>
                <td>${titleEn}</td>
                <td>${descEn.substring(0, 50)}...</td>
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

async function loadPromos() {
    promoGrid.innerHTML = '<p>Loading promos...</p>';
    try {
        const q = query(collection(db, "promos"), orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        promoGrid.innerHTML = "";
        
        if (querySnapshot.empty) {
            promoGrid.innerHTML = '<p>No promos found.</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            const card = document.createElement('div');
            card.className = 'promo-card';
            card.innerHTML = `
                <button class="delete-promo" onclick="deletePromo('${id}', '${data.imagePath || ''}')"><i class="fa-solid fa-trash"></i></button>
                <img src="${escapeHTML(data.imageUrl || '')}" alt="Promo">
                <div class="promo-info">
                    <h4>${escapeHTML(data.title || 'Promo Flyer')}</h4>
                </div>
            `;
            promoGrid.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading promos: ", error);
        promoGrid.innerHTML = '<p>Error loading promos.</p>';
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
        const imageUrl = await compressImage(fileInput.files[0], 800);

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

async function loadMoments() {
    if (!momentGrid) return;
    momentGrid.innerHTML = '<p>Loading moments...</p>';
    try {
        const q = query(collection(db, "moments"), orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        momentGrid.innerHTML = "";
        
        if (querySnapshot.empty) {
            momentGrid.innerHTML = '<p>No moments found.</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            const card = document.createElement('div');
            card.className = 'promo-card';
            card.innerHTML = `
                <button class="delete-promo" onclick="deleteMoment('${id}')"><i class="fa-solid fa-trash"></i></button>
                <img src="${escapeHTML(data.imageUrl || '')}" alt="Moment">
                <div class="promo-info">
                    <h4>${escapeHTML(data.title || 'Guest Photo')}</h4>
                </div>
            `;
            momentGrid.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading moments: ", error);
        momentGrid.innerHTML = '<p>Error loading moments.</p>';
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
        // Compress the image to a square/landscape friendly size
        const imageUrl = await compressImage(fileInput.files[0], 800);

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
            loadMoments();
            hideLoading();
        } catch (error) {
            hideLoading();
            console.error("Error deleting moment: ", error);
        }
    }
};
