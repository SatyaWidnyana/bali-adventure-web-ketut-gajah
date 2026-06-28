import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Force scroll to top on page reload to avoid jumping
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

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
const db = getFirestore(app);

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

// Validates and sanitizes image URLs to prevent injection
function sanitizeImageUrl(url) {
    if (!url || typeof url !== 'string') return '';
    
    // SECURITY PATCH: Prevent breaking out of HTML attributes
    url = url.replace(/["']/g, ''); 

    // Allow data: URLs (base64 images) and https: URLs only
    if (url.startsWith('data:image/')) return url;
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') return '';
        return url;
    } catch {
        return '';
    }
}

// ============================================================
// WHATSAPP LINK INTEGRITY PROTECTION
// Mencegah hacker mengganti nomor WA via XSS/script injection
// ============================================================
const TRUSTED_WA_NUMBER = '6281246211923';
const TRUSTED_WA_URL = `https://wa.me/${TRUSTED_WA_NUMBER}`;

function verifyWhatsAppLinks() {
    const allWaLinks = document.querySelectorAll('a[href*="wa.me"]');
    allWaLinks.forEach(link => {
        const href = link.getAttribute('href');
        // Check if the WA link points to the trusted number
        if (href && href.includes('wa.me') && !href.includes(TRUSTED_WA_NUMBER)) {
            // ALERT: Nomor WA telah diubah oleh pihak tidak bertanggung jawab!
            console.error('[SECURITY] WhatsApp link tampering detected! Restoring original number.');
            link.setAttribute('href', TRUSTED_WA_URL);
            // Optional: send alert to admin (you can add a webhook here later)
        }
    });
}

// Run integrity check after page loads and periodically
setTimeout(verifyWhatsAppLinks, 2000);
setInterval(verifyWhatsAppLinks, 10000); // Check every 10 seconds

// Protect against DOM manipulation using MutationObserver
const waObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'href') {
            const target = mutation.target;
            if (target.tagName === 'A' && target.href.includes('wa.me') && !target.href.includes(TRUSTED_WA_NUMBER)) {
                console.error('[SECURITY] Live WA link tampering blocked!');
                target.setAttribute('href', TRUSTED_WA_URL);
            }
        }
        // Also check if new nodes are added with wrong WA links
        if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // Element node
                    const links = node.querySelectorAll ? node.querySelectorAll('a[href*="wa.me"]') : [];
                    links.forEach(link => {
                        if (!link.href.includes(TRUSTED_WA_NUMBER)) {
                            link.setAttribute('href', TRUSTED_WA_URL);
                        }
                    });
                }
            });
        }
    }
});
waObserver.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['href'] });

// 1. Smart Navbar Scroll Effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// 1.5 Mobile Menu Logic
const menuToggle = document.getElementById('mobile-menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const mobileLinks = document.querySelectorAll('.mobile-nav-links a, .mobile-book-btn');

if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('open');
        mobileMenu.classList.toggle('open');
        navbar.classList.toggle('menu-active');
    });

    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            menuToggle.classList.remove('open');
            mobileMenu.classList.remove('open');
            navbar.classList.remove('menu-active');
        });
    });
}

// 2. Continuous Marquee Slider Logic
const track = document.getElementById('marqueeTrack');
const wrapper = document.getElementById('marqueeWrapper');
let progress = -1400; // Start in middle
let isDragging = false;
let startX = 0;
let speed = window.innerWidth <= 768 ? 0.2 : 0.4; // Slower on mobile, more elegant movement
let reqId;

function animateMarquee() {
    if (!isDragging) {
        progress += speed; // Move from left to right
        // 5 cards * (260px width + 20px gap) = 1400px
        if (progress >= 0) {
            progress -= 1400;
        } else if (progress <= -2800) {
            progress += 1400;
        }
    }
    track.style.transform = `translate3d(${progress}px, 0, 0)`;
    reqId = requestAnimationFrame(animateMarquee);
}

if (track) animateMarquee();

if (wrapper) {
    wrapper.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.pageX - progress;
        cancelAnimationFrame(reqId);
    });

    wrapper.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        progress = e.pageX - startX;
        track.style.transform = `translate3d(${progress}px, 0, 0)`;
    });

    wrapper.addEventListener('mouseup', () => {
        isDragging = false;
        reqId = requestAnimationFrame(animateMarquee);
    });

    wrapper.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false;
            reqId = requestAnimationFrame(animateMarquee);
        }
    });

    wrapper.addEventListener('touchstart', (e) => {
        isDragging = true;
        startX = e.touches[0].pageX - progress;
        cancelAnimationFrame(reqId);
    });

    wrapper.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        progress = e.touches[0].pageX - startX;
        track.style.transform = `translate3d(${progress}px, 0, 0)`;
    });

    wrapper.addEventListener('touchend', () => {
        isDragging = false;
        reqId = requestAnimationFrame(animateMarquee);
    });
}

// 3. Smooth Fade-In-Up Animations
const observerOptions = {
    root: null,
    rootMargin: '0px 0px -50px 0px', // Trigger slightly before the bottom
    threshold: 0 // Prevents bug on tall elements (like mobile grids) where 15% is taller than the screen
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

const animatedElements = document.querySelectorAll('.animate-on-scroll');
animatedElements.forEach(el => observer.observe(el));

// 4. Bilingual (Language Toggle) Logic
const translations = {
    en: {
        title: "Ketut Gajah Bali | Field Notes from the Island of the Gods",
        navTag: "Transport Service & Adventure",
        navHome: "Home", navStory: "The Story", navJourneys: "Journeys", navMoments: "Moments", navContact: "Contact", navBook: "Book Your Story",
        heroEyebrow: "PRIVATE & PERSONAL JOURNEYS",
        heroTitle: "Awaken Your Soul<br>in <span class=\"highlight\">Bali</span>",
        heroBtn: "Begin Your Journey <i class=\"fa-solid fa-arrow-down\"></i>",
        philosophyEyebrow: "Our Philosophy",
        philosophyTitle: "Beyond the Itinerary,<br>Into the Heart of Bali.",
        philosophyLead: "At Ketut Gajah Bali, we are dedicated to helping travelers experience Bali in a comfortable, safe, and enjoyable way. From reliable transport services to mountain guiding, hiking, snorkeling, diving, and private tours, we provide the support and local expertise needed to make every journey seamless and memorable.",
        philosophyDesc: "With a friendly and experienced local team, we take pride in sharing the beauty of Bali beyond the usual tourist routes. Whether you're seeking adventure, breathtaking landscapes, or simply a stress-free way to explore the island, we're here to help you make the most of your time in Bali.",
        founderName: "Ketut Widiana Yasa", founderRole: "Founder & Local Expert",
        badge1: "YOUR", badge2: "friend", badge3: "IN BALI",
        promoEyebrow: "Special Offers",
        promoTitle: "Latest Promos",

        itineraryEyebrow: "The Itinerary",
        itineraryTitle: "Pick Your Path",
        itineraryDesc: "{count} ways into the island's heart. Swipe to explore each one.",
        slide1Title: "Transport Service",
        slide2Title: "Mountain Guiding",
        slide3Title: "Snorkeling",
        slide4Title: "Diving",
        slide5Title: "Hiking",
        slideDesc: "Discover <i class=\"fa-solid fa-arrow-right\"></i>",
        tportEyebrow: "Stop 01 — Premium Transit",
        tportTitle: "Your Private Sanctuary on Wheels.",
        tportDesc: "Escape the tropical heat and chaotic traffic. Step into a meticulously sanitized, fully air-conditioned vehicle that feels like your own private lounge. From punctual airport pickups to highly personalized 12-hour island explorations, we adapt entirely to your rhythm.",
        tportBtn: "Reserve Your Car <i class=\"fa-brands fa-whatsapp\"></i>",
        snorkEyebrow: "Stop 02 — Into the Deep",
        snorkTitle: "The Underwater Symphony.",
        snorkDesc: "Slip beneath the surface and leave gravity behind. Glide over thriving coral gardens and swim alongside majestic manta rays in waters so clear it feels like flying. We provide top-tier snorkeling gear and expert safety guides, ensuring your underwater encounter is nothing short of magical.",
        snorkBtn: "Dive With Us <i class=\"fa-brands fa-whatsapp\"></i>",
        trekEyebrow: "Stop 03 — Summit Chasers",
        trekTitle: "ABOVE<br>THE<br>CLOUDS.",
        trekDesc: "The world is breathtakingly quiet at 1,717 meters. Challenge yourself with a guided trek up Mount Batur under a blanket of stars. As dawn breaks, witness a golden sunrise piercing through volcanic mist — a spiritual reward paired with a hot breakfast cooked naturally by volcanic steam.",
        trekBtn: "Chase The Sunrise <i class=\"fa-brands fa-whatsapp\"></i>",
        advEyebrow: "Stop 04 — Adrenaline",
        advTitle: "Awaken Your Wild Side.",
        advDesc: "Feel your pulse race as you navigate the thrilling white-water rapids of the Ayung River, or roar through muddy jungle tracks on an ATV. Bali isn't just for relaxing — it's a playground for the bold. We ensure maximum thrills with international safety standards.",
        advBtn: "Book Adventure <i class=\"fa-brands fa-whatsapp\"></i>",
        connEyebrow: "Let's Connect",
        connTitle: "Craft Your Perfect Bali Story.",
        connDesc: "Our travel experts are ready to design an itinerary tailored exactly to your dreams. Reach out anytime.",
        waTitle: "WhatsApp", emailTitle: "Email Us", visitTitle: "Visit Our Office",
        fbTitle: "Facebook", igTitle: "Instagram", openMap: "Open in Google Maps",
        reviewTitle: "Loved your trip with us?", reviewDesc: "Share your story with the world on Google.",
        reviewBtn: "<i class=\"fa-brands fa-google\"></i> Leave a Review",
        momentsEyebrow: "Shared Smiles",
        momentsTitle: "Our Moments",
        footerTag: "\"Your Smile is Our Happiness\"",
        copyText: "&copy; 2026 KETUT GAJAH BALI — ALL RIGHTS RESERVED"
    },
    id: {
        title: "Ketut Gajah Bali | Perjalanan Autentik di Pulau Dewata",
        navTag: "Layanan Transportasi & Petualangan",
        navHome: "Beranda", navStory: "Kisah Kami", navJourneys: "Perjalanan", navMoments: "Momen", navContact: "Kontak", navBook: "Pesan Sekarang",
        heroEyebrow: "PERJALANAN EKSKLUSIF & PRIBADI",
        heroTitle: "Bangkitkan Jiwa Anda<br>di <span class=\"highlight\">Bali</span>",
        heroBtn: "Mulai Perjalanan Anda <i class=\"fa-solid fa-arrow-down\"></i>",
        philosophyEyebrow: "Filosofi Kami",
        philosophyTitle: "Bawa Pulang Cerita,<br>Bukan Sekadar&nbsp;Perjalanan.",
        philosophyLead: "Di Ketut Gajah Bali, kami berkomitmen membantu wisatawan menikmati Bali dengan cara yang nyaman, aman, dan menyenangkan. Mulai dari layanan transportasi, mountain guiding, hiking, snorkeling, diving, hingga private tour, kami siap memberikan pengalaman perjalanan yang lancar dan berkesan dengan dukungan tim lokal yang berpengalaman.",
        philosophyDesc: "Dengan pelayanan yang ramah dan pengetahuan lokal yang baik, kami senang membantu Anda menjelajahi Bali lebih dari sekadar destinasi wisata populer. Baik untuk mencari petualangan, menikmati keindahan alam, maupun berkeliling pulau dengan nyaman, kami siap membantu Anda menciptakan pengalaman yang tak terlupakan selama berada di Bali.",
        founderName: "Ketut Widiana Yasa", founderRole: "Pendiri & Pakar Lokal",
        badge1: "SAHABAT", badge2: "terbaik", badge3: "DI BALI",
        promoEyebrow: "Penawaran Spesial",
        promoTitle: "Promo Terbaru",

        itineraryEyebrow: "Rencana Perjalanan",
        itineraryTitle: "Pilih Rute Anda",
        itineraryDesc: "{count} cara untuk menikmati sisi terbaik Bali. Geser untuk menjelajahi semuanya.",
        slide1Title: "Layanan Transportasi",
        slide2Title: "Pemandu Gunung",
        slide3Title: "Snorkeling",
        slide4Title: "Diving",
        slide5Title: "Hiking",
        slideDesc: "Jelajahi <i class=\"fa-solid fa-arrow-right\"></i>",
        tportEyebrow: "Pemberhentian 01 — Transit Premium",
        tportTitle: "Ruang Santai Pribadi Anda di Atas Roda.",
        tportDesc: "Hindari panas tropis dan kemacetan. Masuklah ke dalam kendaraan ber-AC yang disanitasi secara teliti layaknya ruang tunggu pribadi Anda. Dari penjemputan bandara yang tepat waktu hingga penjelajahan pulau 12 jam yang sangat personal, kami menyesuaikan diri sepenuhnya dengan ritme Anda.",
        tportBtn: "Pesan Mobil Anda <i class=\"fa-brands fa-whatsapp\"></i>",
        snorkEyebrow: "Pemberhentian 02 — Menyelami Kedalaman",
        snorkTitle: "Simfoni Bawah Laut.",
        snorkDesc: "Menyelinaplah ke bawah permukaan dan lepaskan gravitasi. Meluncur di atas taman terumbu karang yang hidup dan berenang berdampingan dengan pari manta yang menawan di perairan sebening kristal. Kami menyediakan peralatan snorkeling kelas atas dan pemandu ahli yang menjamin keamanan Anda.",
        snorkBtn: "Menyelam Bersama <i class=\"fa-brands fa-whatsapp\"></i>",
        trekEyebrow: "Pemberhentian 03 — Pengejar Puncak",
        trekTitle: "DI ATAS<br>AWAN.",
        trekDesc: "Dunia terasa hening yang memesona di ketinggian 1.717 meter. Tantang diri Anda dengan pendakian berpemandu ke Gunung Batur di bawah selimut bintang. Saat fajar menyingsing, saksikan matahari terbit keemasan menembus kabut vulkanis — dipadukan dengan sarapan hangat beruap vulkanik.",
        trekBtn: "Kejar Matahari Terbit <i class=\"fa-brands fa-whatsapp\"></i>",
        advEyebrow: "Pemberhentian 04 — Adrenalin",
        advTitle: "Bangkitkan Sisi Liar Anda.",
        advDesc: "Rasakan detak jantung Anda memacu kencang saat menyusuri jeram Sungai Ayung yang mendebarkan, atau menaklukkan jalur hutan berlumpur di atas ATV. Bali bukan sekadar tempat bersantai — ini adalah taman bermain bagi para pemberani. Keselamatan standar internasional terjamin.",
        advBtn: "Pesan Petualangan <i class=\"fa-brands fa-whatsapp\"></i>",
        connEyebrow: "Mari Terhubung",
        connTitle: "Rangkai Kisah Bali Anda yang Sempurna.",
        connDesc: "Para pakar perjalanan kami siap merancang rencana yang disesuaikan secara presisi dengan impian Anda. Hubungi kami kapan saja.",
        waTitle: "WhatsApp", emailTitle: "Kirim Email", visitTitle: "Kunjungi Kantor",
        fbTitle: "Facebook", igTitle: "Instagram", openMap: "Buka di Google Maps",
        reviewTitle: "Menyukai perjalanan bersama kami?", reviewDesc: "Bagikan kisah Anda kepada dunia melalui Google.",
        reviewBtn: "<i class=\"fa-brands fa-google\"></i> Tulis Ulasan",
        momentsEyebrow: "Senyum Bersama",
        momentsTitle: "Momen Kami",
        footerTag: "\"Senyum Anda adalah Kebahagiaan Kami\"",
        copyText: "&copy; 2026 KETUT GAJAH BALI — HAK CIPTA DILINDUNGI"
    }
};

const langToggleBtn = document.getElementById('langToggleBtn');
const langToggleText = document.getElementById('langToggleText');
const langIcon = document.querySelector('.lang-icon');

// Initialize language from localStorage or default to English
let currentLang = localStorage.getItem('kgb_lang') || 'en';
let globalServiceCount = "...";

function getCountWord(num, lang) {
    const enWords = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen"];
    const idWords = ["Nol", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas", "Dua Belas", "Tiga Belas", "Empat Belas", "Lima Belas"];

    if (lang === 'id') return idWords[num] || num;
    return enWords[num] || num;
}

function applyTranslations(lang) {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            let text = translations[lang][key];
            if (text.includes('{count}')) {
                const countStr = typeof globalServiceCount === 'number' ? getCountWord(globalServiceCount, lang) : globalServiceCount;
                text = text.replace('{count}', `<span style="color: var(--marigold); font-weight: 700; text-transform: capitalize;">${countStr}</span>`);
            }
            el.innerHTML = text;
        }
    });

    // Update Document Title
    if (translations[lang]['title']) {
        document.title = translations[lang]['title'];
    }

    // Update Button UI
    const langIconImg = document.getElementById('langIconImg');
    if (lang === 'id') {
        langToggleText.textContent = "Bahasa";
        if (langIconImg) langIconImg.src = "https://flagcdn.com/id.svg";
    } else {
        langToggleText.textContent = "Language";
        if (langIconImg) langIconImg.src = "https://flagcdn.com/gb.svg";
    }
}

// Initial apply
applyTranslations(currentLang);

// Toggle event listener
langToggleBtn.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'id' : 'en';
    localStorage.setItem('kgb_lang', currentLang);

    // Add a tiny scale effect programmatically for smooth feeling
    langToggleBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        langToggleBtn.style.transform = '';
        applyTranslations(currentLang);
        renderPublicServices(); // Re-render dynamic content when language changes
    }, 150);
});

// ============================================================
// FIREBASE DATA FETCHING (PUBLIC SITE)
// ============================================================

function renderPromosFromData(promosData) {
    const promoSection = document.getElementById('promos');
    const promoGrid = document.getElementById('publicPromosGrid');
    if (!promoSection || !promoGrid) return;

    if (promosData.length > 0) {
        promoSection.style.display = 'block';
        promoGrid.innerHTML = '';
        promosData.forEach((data) => {
            const card = document.createElement('div');
            card.className = 'promo-card-public animate-on-scroll visible';
            card.style.cursor = 'pointer';
            card.onclick = () => openPromoLightbox(data.imageUrl);
            card.innerHTML = `
                <img src="${escapeHTML(data.imageUrl || '')}" alt="Promo Flyer">
                <div class="promo-glass-overlay">
                    <h3>${escapeHTML(data.title || 'Special Promo')}</h3>
                </div>
            `;
            promoGrid.appendChild(card);
        });
    } else {
        promoSection.style.display = 'none';
    }
}

async function loadPublicPromos() {
    // 1. Load from cache instantly
    const cachedData = localStorage.getItem('kgb_cache_promos');
    if (cachedData) {
        try {
            renderPromosFromData(JSON.parse(cachedData));
        } catch (e) {
            console.error('Cache error', e);
        }
    }

    // 2. Fetch fresh data in background
    try {
        const q = query(collection(db, "promos"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        const freshData = [];
        querySnapshot.forEach((docSnap) => {
            freshData.push(docSnap.data());
        });

        // 3. Update if changed
        const freshDataString = JSON.stringify(freshData);
        if (cachedData !== freshDataString) {
            try { localStorage.setItem('kgb_cache_promos', freshDataString); } catch(e) { console.warn("Cache full"); }
            renderPromosFromData(freshData);
        }
    } catch (error) {
        console.error("Error fetching promos: ", error);
    }
}

// ============================================================
// PROMO LIGHTBOX LOGIC
// ============================================================
function openPromoLightbox(imageUrl) {
    const lightbox = document.getElementById('promoLightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    if (lightbox && lightboxImg) {
        // Validate URL before setting as image source
        const safeUrl = sanitizeImageUrl(imageUrl);
        if (!safeUrl) {
            console.error('[SECURITY] Blocked suspicious image URL:', imageUrl);
            return;
        }
        lightboxImg.src = safeUrl;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // prevent background scrolling
    }
}
window.openPromoLightbox = openPromoLightbox; // Expose to global scope for inline onclick

const lightbox = document.getElementById('promoLightbox');
const lightboxOverlay = document.getElementById('lightboxOverlay');
const lightboxClose = document.getElementById('lightboxClose');

const closeLightbox = () => {
    if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
};

if (lightboxOverlay) lightboxOverlay.addEventListener('click', closeLightbox);
if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);

// Fetch on load
loadPublicPromos();
loadPublicServices();

let cachedServices = [];
let isServicesRendered = false;

async function loadPublicServices() {
    // 1. Load from cache instantly
    const cachedData = localStorage.getItem('kgb_cache_services');
    if (cachedData) {
        try {
            cachedServices = JSON.parse(cachedData);
            globalServiceCount = cachedServices.length;
            applyTranslations(currentLang);
            renderPublicServices();
        } catch (e) {
            console.error('Cache error', e);
        }
    }

    // 2. Fetch fresh data in background
    try {
        const q = query(collection(db, "services"), orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);

        const freshServices = [];
        querySnapshot.forEach(docSnap => freshServices.push({ id: docSnap.id, ...docSnap.data() }));
        
        // 3. Update if changed
        const freshDataString = JSON.stringify(freshServices);
        if (cachedData !== freshDataString) {
            cachedServices = freshServices;
            try { localStorage.setItem('kgb_cache_services', freshDataString); } catch(e) { console.warn("Cache full"); }
            
            globalServiceCount = cachedServices.length;
            applyTranslations(currentLang);
            
            isServicesRendered = false; // Force re-render with new data
            renderPublicServices();
        }

    } catch (error) {
        console.error("Error fetching services: ", error);
    }
}

function renderPublicServices() {
    const marqueeTrack = document.getElementById('marqueeTrack');
    const dynamicContainer = document.getElementById('dynamicServicesContainer');
    if (!marqueeTrack || !dynamicContainer || cachedServices.length === 0) return;

    if (isServicesRendered) {
        // Soft update: Only change text content to prevent re-triggering scroll animations
        cachedServices.forEach((data, i) => {
            const title = escapeHTML(currentLang === 'id' ? (data.title_id || data.title_en || data.title) : (data.title_en || data.title));
            const desc = escapeHTML(currentLang === 'id' ? (data.desc_id || data.desc_en || data.description) : (data.desc_en || data.description));
            const stopText = currentLang === 'id' ? 'Kegiatan' : 'Activity';
            const bookText = currentLang === 'id' ? 'Pesan Sekarang' : 'Book Now';
            const consultText = currentLang === 'id' ? 'Konsultasi Gratis? Tanya harga dan detail di sini.' : 'Free Consultation? Ask for price & details here.';
            const exploreText = currentLang === 'id' ? 'Jelajahi' : 'Explore';
            const stopNum = `${stopText} ${String(i + 1).padStart(2, '0')}`;

            // 1. Update Detailed Section
            const section = document.getElementById(`service-${data.id}`);
            if (section) {
                const eyebrow = section.querySelector('.eyebrow');
                const giantText = section.querySelector('.giant-text');
                const p = section.querySelector('p');
                const btn = section.querySelector('.btn-glass-dark');
                const consultEl = section.querySelector('.consult-text');
                
                if (eyebrow) eyebrow.textContent = stopNum;
                if (giantText) giantText.innerHTML = title;
                if (p) p.innerHTML = desc;
                if (btn) btn.innerHTML = `${bookText} <i class=\"fa-brands fa-whatsapp\"></i>`;
                if (consultEl) consultEl.innerHTML = consultText;
            }

            // 2. Update Marquee Cards (Including duplicates)
            const cards = marqueeTrack.querySelectorAll(`.slide-card[data-service-id="${data.id}"]`);
            cards.forEach(card => {
                const h3 = card.querySelector('h3');
                const span = card.querySelector('.glass-text span');
                if (h3) h3.innerHTML = title;
                if (span) span.innerHTML = `${exploreText} <i class=\"fa-solid fa-arrow-right\"></i>`;
            });
        });
        return; // Exit here, no need to rebuild DOM
    }

    // 1. Build Marquee Slider
    const buildSlideCard = (data, i) => {
        const title = escapeHTML(currentLang === 'id' ? (data.title_id || data.title_en || data.title) : (data.title_en || data.title));
        const exploreText = currentLang === 'id' ? 'Jelajahi' : 'Explore';
        return `
            <a href="#service-${data.id}" class="slide-card" data-service-id="${data.id}">
                <img src="${sanitizeImageUrl(data.imageUrl)}" alt="${title}" loading="lazy">
                <div class="glass-overlay">
                    <span class="stop-num">${String(i + 1).padStart(2, '0')}</span>
                    <div class="glass-text">
                        <h3>${title}</h3>
                        <span>${exploreText} <i class="fa-solid fa-arrow-right"></i></span>
                    </div>
                </div>
            </a>
        `;
    };

    let slideCards = cachedServices.map((s, i) => buildSlideCard(s, i)).join('');
    // Duplicate for infinite loop
    marqueeTrack.innerHTML = slideCards + slideCards;

    // 2. Build Detailed Sections (Unified Zig-Zag Layout)
    let detailedSectionsHtml = '';
    cachedServices.forEach((data, i) => {
        const title = escapeHTML(currentLang === 'id' ? (data.title_id || data.title_en || data.title) : (data.title_en || data.title));
        const desc = escapeHTML(currentLang === 'id' ? (data.desc_id || data.desc_en || data.description) : (data.desc_en || data.description));
        const stopText = currentLang === 'id' ? 'Kegiatan' : 'Activity';
        const bookText = currentLang === 'id' ? 'Pesan Sekarang' : 'Book Now';
        const consultText = currentLang === 'id' ? 'Konsultasi Gratis? Tanya harga dan detail di sini.' : 'Free Consultation? Ask for price & details here.';

        const sectionId = `service-${data.id}`;
        const stopNum = `${stopText} ${String(i + 1).padStart(2, '0')}`;
        // If even, normal layout (Image Left, Text Right). If odd, reverse layout.
        const reverseClass = i % 2 !== 0 ? 'reverse' : '';

        detailedSectionsHtml += `
        <section id="${sectionId}" class="unified-service-section">
            <div class="container animate-on-scroll">
                <div class="unified-grid ${reverseClass}">
                    <div class="unified-img">
                        <img src="${sanitizeImageUrl(data.imageUrl)}" alt="${title}" loading="lazy">
                    </div>
                    <div class="unified-content">
                        <span class="eyebrow">${stopNum}</span>
                        <h2 class="giant-text">${title}</h2>
                        <p>${desc}</p>
                        <a href="https://wa.me/6281246211923" class="btn-glass-dark" target="_blank">${bookText} <i class="fa-brands fa-whatsapp"></i></a>
                        <a href="https://wa.me/6281246211923" class="consult-text" target="_blank">${consultText}</a>
                    </div>
                </div>
            </div>
        </section>`;
    });

    dynamicContainer.innerHTML = detailedSectionsHtml;

    // Re-observe new elements for scroll animation
    const newAnimatedElements = dynamicContainer.querySelectorAll('.animate-on-scroll');
    newAnimatedElements.forEach(el => observer.observe(el));
    
    isServicesRendered = true;
}

// ---------------- LOAD PUBLIC MOMENTS ---------------- //
const publicMomentsGrid = document.getElementById('publicMomentsGrid');
const momentsSection = document.getElementById('moments');

function renderMomentsFromData(momentsData) {
    if (!publicMomentsGrid || !momentsSection) return;
    
    if (momentsData.length === 0) {
        momentsSection.style.display = 'none';
        return;
    }

    momentsSection.style.display = 'block';
    publicMomentsGrid.innerHTML = ''; 
    momentsData.forEach((data) => {
        const safeUrl = sanitizeImageUrl(data.imageUrl || '');
        const card = document.createElement('div');
        card.className = 'moment-card';
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => openPromoLightbox(safeUrl));
        const img = document.createElement('img');
        img.src = safeUrl;
        img.alt = escapeHTML(data.title || 'Guest Moment');
        img.loading = 'lazy';
        card.appendChild(img);
        publicMomentsGrid.appendChild(card);
    });
}

async function loadPublicMoments() {
    if (!publicMomentsGrid) return;

    // 1. Load from cache instantly
    const cachedData = localStorage.getItem('kgb_cache_moments');
    if (cachedData) {
        try {
            renderMomentsFromData(JSON.parse(cachedData));
        } catch (e) {
            console.error('Cache error', e);
        }
    }

    // 2. Fetch fresh data in background
    try {
        const q = query(collection(db, "moments"), orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        
        const freshData = [];
        querySnapshot.forEach((docSnap) => {
            freshData.push(docSnap.data());
        });

        // 3. Update if changed
        const freshDataString = JSON.stringify(freshData);
        if (cachedData !== freshDataString) {
            try { localStorage.setItem('kgb_cache_moments', freshDataString); } catch(e) { console.warn("Cache full"); }
            renderMomentsFromData(freshData);
        }
    } catch (error) {
        console.error("Error loading public moments: ", error);
        if (!cachedData) momentsSection.style.display = 'none';
    }
}

// Initial calls
loadPublicMoments();
