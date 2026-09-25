/* ==========================================================================
   1. SUPABASE CONFIGURATION
   ========================================================================== */
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co"; // Yahan apna Supabase URL daalein
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY_HERE";     // Yahan apni Anon Key daalein

const supabase = (window.supabase && SUPABASE_URL.includes("supabase.co")) 
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
    : null;

/* ==========================================================================
   2. GLOBAL STATE MANAGEMENT
   ========================================================================== */
let allProducts = [];
let filteredProducts = [];
let cart = [];
let wishlist = [];
let currentUser = {
    id: null,
    memberId: "MAJ-" + Math.floor(100000 + Math.random() * 900000),
    name: "Royal Valued Customer",
    contact: "+91 9876543210",
    mudraGold: 0,
    mudraSilver: 0
};
let activeProductForBooking = null;
let sessionSeconds = 0;

/* ==========================================================================
   3. APP INITIALIZATION & SUPABASE FETCH
   ========================================================================== */
document.addEventListener("DOMContentLoaded", async () => {
    startSessionTimer();
    await initializeUser();
    await loadProductsFromSupabase();
    updateUIHeader();
});

function startSessionTimer() {
    setInterval(() => {
        sessionSeconds++;
        const timerElem = document.getElementById("session-time");
        if (timerElem) timerElem.innerText = sessionSeconds;
    }, 1000);
}

// Profile Initialization with Database Sync
async function initializeUser() {
    if (!supabase) return;
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('member_id', currentUser.memberId)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            const { data: newUser, error: insertErr } = await supabase
                .from('profiles')
                .insert([{
                    member_id: currentUser.memberId,
                    full_name: currentUser.name,
                    contact_number: currentUser.contact,
                    mudra_gold_balance: 0,
                    mudra_silver_balance: 0
                }])
                .select()
                .single();

            if (insertErr) throw insertErr;
            if (newUser) currentUser.id = newUser.id;
        } else {
            currentUser.id = data.id;
            currentUser.mudraGold = Number(data.mudra_gold_balance) || 0;
            currentUser.mudraSilver = Number(data.mudra_silver_balance) || 0;
        }
    } catch (err) {
        console.warn("Profile Sync Fallback to Local State:", err.message);
    }
}

// Fetch Products from Supabase
async function loadProductsFromSupabase() {
    const grid = document.getElementById("productGrid");
    if (grid) grid.innerHTML = `<p style="color:#D4AF37; text-align:center; width:100%; grid-column:1/-1;">✨ Loading Royal Collection from Supabase...</p>`;

    if (!supabase) {
        if (grid) grid.innerHTML = `<p style="color:#ff6b6b; text-align:center; grid-column:1/-1;">Supabase URL/Key Not Configured in app.js.</p>`;
        return;
    }

    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
            allProducts = data.map(p => ({
                ...p,
                image_url: p.primary_image || p.image_url || 'https://via.placeholder.com/300?text=Royal+Jewelry',
                mudra_reward: Number(p.mudra_reward) || 0,
                price: Number(p.price) || 0
            }));
            filteredProducts = [...allProducts];
            renderProductGrid(filteredProducts);
        } else {
            if (grid) grid.innerHTML = `<p style="color:#ccc; text-align:center; grid-column:1/-1;">No products available in database.</p>`;
        }
    } catch (err) {
        console.error("Supabase Products Fetch Error:", err);
        if (grid) grid.innerHTML = `<p style="color:#ff6b6b; text-align:center; grid-column:1/-1;">Error loading products. Check Database RLS/Keys.</p>`;
    }
}

/* ==========================================================================
   4. PRODUCT RENDERING & INTERACTION
   ========================================================================== */
function renderProductGrid(products) {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = `<p style="color:#ccc; text-align:center; grid-column:1/-1;">No products found matching your criteria.</p>`;
        return;
    }

    grid.innerHTML = products.map(prod => `
        <div class="product-card" style="background:#181818; border:1px solid #333; border-radius:10px; padding:15px; text-align:center; position:relative;">
            <img src="${prod.image_url}" alt="${prod.name}" onclick="openImageModal('${prod.id}')" style="width:100%; height:200px; object-fit:cover; border-radius:8px; cursor:pointer;">
            <h3 style="color:#fff; margin:10px 0 5px; font-size:1.1rem;">${prod.name}</h3>
            <p style="color:#D4AF37; font-weight:bold; font-size:1.2rem;">₹${prod.price.toLocaleString('en-IN')}</p>
            <p style="color:#28a745; font-size:0.85rem; margin-bottom:10px;">🪙 +${prod.mudra_reward} Mudra Gold Credit</p>
            
            <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
                <button class="btn-gold-action" style="padding:6px 12px; font-size:0.85rem;" onclick="addToTray('${prod.id}')">🛒 Add to Cart</button>
                <button class="btn-gold-action" style="padding:6px 12px; font-size:0.85rem; background:#333;" onclick="toggleWishlist('${prod.id}')">❤️ Wishlist</button>
                <button class="btn-gold-action" style="padding:6px 12px; font-size:0.85rem; background:#004d40;" onclick="open3DModal()">3D View</button>
            </div>
        </div>
    `).join('');
}

/* ==========================================================================
   5. SEARCH, SORT & CATEGORY FILTERS
   ========================================================================== */
function filterProducts() {
    const searchInput = document.getElementById("searchInput");
    const query = searchInput ? searchInput.value.toLowerCase() : "";
    filteredProducts = allProducts.filter(p => p.name.toLowerCase().includes(query));
    renderProductGrid(filteredProducts);
}

function filterCategory(cat) {
    if (cat === 'all') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(p => String(p.category).toLowerCase() === String(cat).toLowerCase());
    }
    renderProductGrid(filteredProducts);
}

function sortProducts() {
    const sortElem = document.getElementById("sortPrice");
    const val = sortElem ? sortElem.value : "";
    
    if (val === "low-high") {
        filteredProducts.sort((a, b) => a.price - b.price);
    } else if (val === "high-low") {
        filteredProducts.sort((a, b) => b.price - a.price);
    } else {
        filteredProducts = [...allProducts];
    }
    renderProductGrid(filteredProducts);
}

/* ==========================================================================
   6. CART & WISHLIST SYSTEM
   ========================================================================== */
function addToTray(productId) {
    const prod = allProducts.find(p => String(p.id) === String(productId));
    if (!prod) return;

    cart.push(prod);
    const trayElem = document.getElementById("tray-count");
    if (trayElem) trayElem.innerText = cart.length;
    showToast(`Added "${prod.name}" to Cart!`);
}

function toggleWishlist(productId) {
    const prod = allProducts.find(p => String(p.id) === String(productId));
    if (!prod) return;

    const index = wishlist.findIndex(p => String(p.id) === String(productId));
    if (index > -1) {
        wishlist.splice(index, 1);
        showToast(`Removed from Wishlist`);
    } else {
        wishlist.push(prod);
        showToast(`Added to Wishlist ❤️`);
    }
    const wishElem = document.getElementById("wishlist-count");
    if (wishElem) wishElem.innerText = wishlist.length;
}

function openWishlistModal() {
    if (wishlist.length === 0) {
        showToast("Your Wishlist is empty!");
        return;
    }
    alert("Wishlist Items:\n" + wishlist.map(i => "• " + i.name + " - ₹" + i.price.toLocaleString('en-IN')).join("\n"));
}

/* ==========================================================================
   7. MODALS & BOOKING EXECUTION (SUPABASE ORDER + PROFILE SYNC)
   ========================================================================== */
function openImageModal(productId) {
    const prod = allProducts.find(p => String(p.id) === String(productId));
    if (!prod) return;

    activeProductForBooking = prod;
    const imgElem = document.getElementById("hdModalImage");
    const titleElem = document.getElementById("hdModalTitle");
    const priceElem = document.getElementById("hdModalPrice");
    const mudraElem = document.getElementById("hdModalMudra");

    if (imgElem) imgElem.src = prod.image_url;
    if (titleElem) titleElem.innerText = prod.name;
    if (priceElem) priceElem.innerText = "₹" + prod.price.toLocaleString('en-IN');
    if (mudraElem) mudraElem.innerText = `🪙 +${prod.mudra_reward} Mudra Gold Credit`;
    
    const bookBtn = document.getElementById("modalBookBtn");
    if (bookBtn) {
        bookBtn.onclick = () => {
            closeImageModal();
            openCheckoutModal(prod);
        };
    }

    const modal = document.getElementById("imageModal");
    if (modal) modal.style.display = "block";
}

function closeImageModal() {
    const modal = document.getElementById("imageModal");
    if (modal) modal.style.display = "none";
}

function openCheckoutModal(prod) {
    activeProductForBooking = prod;
    
    const nameElem = document.getElementById("checkoutProdName");
    const priceElem = document.getElementById("checkoutProdPrice");
    const mudraElem = document.getElementById("checkoutMudraCredit");

    if (nameElem) nameElem.innerText = prod.name;
    if (priceElem) priceElem.innerText = "₹" + prod.price.toLocaleString('en-IN');
    if (mudraElem) mudraElem.innerText = prod.mudra_reward;
    
    const step1 = document.getElementById("checkoutStep1");
    const step2 = document.getElementById("checkoutStep2");
    const modal = document.getElementById("bookingCheckoutModal");

    if (step1) step1.style.display = "block";
    if (step2) step2.style.display = "none";
    if (modal) modal.style.display = "block";
}

function closeCheckoutModal() {
    const modal = document.getElementById("bookingCheckoutModal");
    if (modal) modal.style.display = "none";
}

// Booking Execution (Saves to Orders & Updates Profile Mudra Balance)
async function executeSureBooking() {
    if (!activeProductForBooking) return;

    const orderNo = "MAJ-" + Math.floor(100000 + Math.random() * 900000);

    try {
        if (supabase) {
            // 1. Save Order
            const { error: orderError } = await supabase.from('orders').insert([{
                order_number: orderNo,
                user_id: currentUser.id,
                product_id: String(activeProductForBooking.id),
                price: activeProductForBooking.price,
                mudra_credited: activeProductForBooking.mudra_reward,
                status: 'Pending Confirmation'
            }]);

            if (orderError) throw orderError;

            // 2. Update Profile Balance in DB
            const updatedGoldBalance = currentUser.mudraGold + activeProductForBooking.mudra_reward;
            if (currentUser.id) {
                await supabase.from('profiles').update({
                    mudra_gold_balance: updatedGoldBalance
                }).eq('id', currentUser.id);
            }
        }

        currentUser.mudraGold += activeProductForBooking.mudra_reward;
        updateUIHeader();

        const step1 = document.getElementById("checkoutStep1");
        const step2 = document.getElementById("checkoutStep2");

        if (step1) step1.style.display = "none";
        if (step2) step2.style.display = "block";

    } catch (err) {
        console.error("Booking Error:", err);
        showToast("Booking Save Error: " + err.message);
    }
}

/* ==========================================================================
   8. PAYMENT & CHECKOUT (RAZORPAY INTEGRATION)
   ========================================================================== */
function openPaymentSection() {
    const modal = document.getElementById("paymentSectionModal");
    const list = document.getElementById("selectedItemsList");
    const totalElem = document.getElementById("totalPaymentAmount");

    if (!list || !totalElem) return;

    if (cart.length === 0) {
        list.innerHTML = `<p style="color:#999;">No items in cart</p>`;
        totalElem.innerText = "₹0";
    } else {
        list.innerHTML = cart.map(i => `<div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>${i.name}</span><strong>₹${i.price.toLocaleString('en-IN')}</strong></div>`).join('');
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        totalElem.innerText = "₹" + total.toLocaleString('en-IN');
    }

    if (modal) modal.style.display = "block";
}

function closePaymentSection() {
    const modal = document.getElementById("paymentSectionModal");
    if (modal) modal.style.display = "none";
}

function proceedToRazorpay() {
    if (cart.length === 0) {
        showToast("Please add items to cart before checkout!");
        return;
    }

    const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

    const options = {
        key: "rzp_test_YourTestKeyHere",
        amount: totalAmount * 100,
        currency: "INR",
        name: "Maa Ambe Jewellers",
        description: "Jewelry Purchase Checkout",
        handler: async function (response) {
            showToast("Payment Successful! Payment ID: " + response.razorpay_payment_id);
            cart = [];
            const trayElem = document.getElementById("tray-count");
            if (trayElem) trayElem.innerText = "0";
            closePaymentSection();
        },
        prefill: {
            name: currentUser.name,
            contact: currentUser.contact
        },
        theme: {
            color: "#700000"
        }
    };

    if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
    } else {
        showToast("Razorpay SDK fail to load.");
    }
}

/* ==========================================================================
   9. CUSTOMER DASHBOARD & ORDERS MODAL
   ========================================================================== */
function toggleSidebar() {
    const sb = document.getElementById("sidebar");
    if (sb) sb.classList.toggle("active");
}

function updateUIHeader() {
    const idElem = document.getElementById("user-member-id");
    const nameElem = document.getElementById("sidebar-user-name");
    const goldElem = document.getElementById("mudra-gold");
    const silverElem = document.getElementById("mudra-silver");

    if (idElem) idElem.innerText = currentUser.memberId;
    if (nameElem) nameElem.innerText = currentUser.name;
    if (goldElem) goldElem.innerText = currentUser.mudraGold;
    if (silverElem) silverElem.innerText = currentUser.mudraSilver;
}

function showUserDetailsModal() {
    const pId = document.getElementById("profile-id");
    const pName = document.getElementById("profile-name");
    const pContact = document.getElementById("profile-contact");
    const pMudra = document.getElementById("profile-mudra");
    const modal = document.getElementById("userModal");

    if (pId) pId.innerText = currentUser.memberId;
    if (pName) pName.innerText = currentUser.name;
    if (pContact) pContact.innerText = currentUser.contact;
    if (pMudra) pMudra.innerText = currentUser.mudraGold + " Gold Points";
    if (modal) modal.style.display = "block";
}

function closeUserModal() {
    const modal = document.getElementById("userModal");
    if (modal) modal.style.display = "none";
}

async function showMyOrdersModal() {
    const container = document.getElementById("ordersListContainer");
    const modal = document.getElementById("myOrdersModal");
    if (modal) modal.style.display = "block";

    if (!container) return;

    if (!supabase) {
        container.innerHTML = "<p style='color:#ff6b6b;'>Supabase client not configured.</p>";
        return;
    }

    container.innerHTML = "<p style='color:#D4AF37;'>Fetching your orders...</p>";

    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!orders || orders.length === 0) {
            container.innerHTML = "<p style='color:#ccc;'>No orders placed yet.</p>";
            return;
        }

        container.innerHTML = orders.map(ord => `
            <div style="background:#222; border:1px solid #444; border-radius:6px; padding:10px; margin-bottom:10px;">
                <p><strong style="color:#D4AF37;">Order ID:</strong> ${ord.order_number}</p>
                <p><strong>Amount:</strong> ₹${Number(ord.price).toLocaleString('en-IN')}</p>
                <p><strong>Mudra Earned:</strong> 🪙 +${ord.mudra_credited || 0}</p>
                <p><strong>Status:</strong> <span style="color:#28a745;">${ord.status}</span></p>
            </div>
        `).join('');

    } catch (err) {
        container.innerHTML = `<p style="color:red;">Order Load Error: ${err.message}</p>`;
    }
}

function closeOrdersModal() {
    const modal = document.getElementById("myOrdersModal");
    if (modal) modal.style.display = "none";
}

/* ==========================================================================
   10. 3D VIEW & UTILITIES
   ========================================================================== */
function open3DModal() {
    const modal = document.getElementById("3dModal");
    if (modal) modal.style.display = "block";
    initThreeJS();
}

function close3DModal() {
    const modal = document.getElementById("3dModal");
    if (modal) modal.style.display = "none";
}

function initThreeJS() {
    const container = document.getElementById("three-container");
    if (!container || container.children.length > 0) return;

    if (typeof THREE === 'undefined') {
        container.innerHTML = "<p style='color:#ccc; text-align:center; padding-top:20px;'>Three.js library loading...</p>";
        return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / 300, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    renderer.setSize(container.clientWidth, 300);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.TorusGeometry(1, 0.2, 16, 100);
    const material = new THREE.MeshBasicMaterial({ color: 0xD4AF37, wireframe: true });
    const ring = new THREE.Mesh(geometry, material);
    scene.add(ring);

    camera.position.z = 3;

    function animate() {
        requestAnimationFrame(animate);
        ring.rotation.x += 0.01;
        ring.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    animate();
}

function showToast(msg) {
    const toast = document.getElementById("buyer-toast");
    if (!toast) return;
    toast.innerText = msg;
    toast.style.display = "block";
    setTimeout(()
