/* ==========================================================================
   1. SUPABASE CONFIGURATION
   ========================================================================== */
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co"; // Yahan apna Supabase URL daalein
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY_HERE";     // Yahan apni Anon Key daalein

const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

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

async function initializeUser() {
    if (!supabase) return;
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('member_id', currentUser.memberId)
            .maybeSingle();

        if (!data) {
            const { data: newUser } = await supabase.from('profiles').insert([{
                member_id: currentUser.memberId,
                full_name: currentUser.name,
                contact_number: currentUser.contact,
                mudra_gold_balance: 0,
                mudra_silver_balance: 0
            }]).select().single();
            if (newUser) currentUser.id = newUser.id;
        } else {
            currentUser.id = data.id;
            currentUser.mudraGold = data.mudra_gold_balance || 0;
            currentUser.mudraSilver = data.mudra_silver_balance || 0;
        }
    } catch (err) {
        console.warn("Profile Initialization fallback to local:", err.message);
    }
}

async function loadProductsFromSupabase() {
    const grid = document.getElementById("productGrid");
    if (grid) grid.innerHTML = `<p style="color:#D4AF37; text-align:center; width:100%; grid-column:1/-1;">✨ Loading Royal Collection from Supabase...</p>`;

    if (!supabase) {
        showToast("Supabase CDN not connected.");
        return;
    }

    try {
        const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
            allProducts = data.map(p => ({
                ...p,
                image_url: p.primary_image || p.image_url || 'https://via.placeholder.com/300'
            }));
            filteredProducts = [...allProducts];
            renderProductGrid(filteredProducts);
        } else {
            if (grid) grid.innerHTML = `<p style="color:#ccc; text-align:center; grid-column:1/-1;">No products available in database.</p>`;
        }
    } catch (err) {
        console.error("Supabase Products Fetch Error:", err);
        if (grid) grid.innerHTML = `<p style="color:#ff6b6b; text-align:center; grid-column:1/-1;">Error loading products. Check Project URL / Anon Key.</p>`;
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
            <p style="color:#D4AF37; font-weight:bold; font-size:1.2rem;">₹${Number(prod.price).toLocaleString('en-IN')}</p>
            <p style="color:#28a745; font-size:0.85rem; margin-bottom:10px;">🪙 +${prod.mudra_reward || 0} Mudra Gold Credit</p>
            
            <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
                <button class="btn-gold-action" style="padding:6px 12px; font-size:0.85rem;" onclick="addToTray('${prod.id}')">🛒 Add to Cart</button>
                <button class="btn-gold-action" style="padding:6px 12px; font-size:0.85rem; background:#333;" onclick="toggleWishlist('${prod.id}')">❤️ Wishlist</button>
                <button class="btn-gold-action" style="padding:6px 12px; font-size:0.85rem; background:#004d40;" onclick="open3DModal()">3D View</button>
            </div>
        </div>
    `).join('');
}

function filterProducts() {
    const query = document.getElementById("searchInput").value.toLowerCase();
    filteredProducts = allProducts.filter(p => p.name.toLowerCase().includes(query));
    renderProductGrid(filteredProducts);
}

function filterCategory(cat) {
    if (cat === 'all') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(p => p.category === cat);
    }
    renderProductGrid(filteredProducts);
}

function sortProducts() {
    const val = document.getElementById("sortPrice").value;
    if (val === "low-high") {
        filteredProducts.sort((a, b) => a.price - b.price);
    } else if (val === "high-low") {
        filteredProducts.sort((a, b) => b.price - a.price);
    } else {
        filteredProducts = [...allProducts];
    }
    renderProductGrid(filteredProducts);
}

function addToTray(productId) {
    const prod = allProducts.find(p => p.id == productId);
    if (!prod) return;

    cart.push(prod);
    document.getElementById("tray-count").innerText = cart.length;
    showToast(`Added "${prod.name}" to Cart!`);
}

function toggleWishlist(productId) {
    const prod = allProducts.find(p => p.id == productId);
    if (!prod) return;

    const index = wishlist.findIndex(p => p.id == productId);
    if (index > -1) {
        wishlist.splice(index, 1);
        showToast(`Removed from Wishlist`);
    } else {
        wishlist.push(prod);
        showToast(`Added to Wishlist ❤️`);
    }
    document.getElementById("wishlist-count").innerText = wishlist.length;
}

function openWishlistModal() {
    if (wishlist.length === 0) {
        showToast("Your Wishlist is empty!");
        return;
    }
    alert("Wishlist Items:\n" + wishlist.map(i => "• " + i.name + " - ₹" + i.price).join("\n"));
}

function openImageModal(productId) {
    const prod = allProducts.find(p => p.id == productId);
    if (!prod) return;

    activeProductForBooking = prod;
    document.getElementById("hdModalImage").src = prod.image_url;
    document.getElementById("hdModalTitle").innerText = prod.name;
    document.getElementById("hdModalPrice").innerText = "₹" + Number(prod.price).toLocaleString('en-IN');
    document.getElementById("hdModalMudra").innerText = `🪙 +${prod.mudra_reward || 0} Mudra Gold Credit`;
    
    document.getElementById("modalBookBtn").onclick = () => {
        closeImageModal();
        openCheckoutModal(prod);
    };

    document.getElementById("imageModal").style.display = "block";
}

function closeImageModal() {
    document.getElementById("imageModal").style.display = "none";
}

function openCheckoutModal(prod) {
    activeProductForBooking = prod;
    document.getElementById("checkoutProdName").innerText = prod.name;
    document.getElementById("checkoutProdPrice").innerText = "₹" + Number(prod.price).toLocaleString('en-IN');
    document.getElementById("checkoutMudraCredit").innerText = prod.mudra_reward || 0;
    
    document.getElementById("checkoutStep1").style.display = "block";
    document.getElementById("checkoutStep2").style.display = "none";
    document.getElementById("bookingCheckoutModal").style.display = "block";
}

function closeCheckoutModal() {
    document.getElementById("bookingCheckoutModal").style.display = "none";
}

async function executeSureBooking() {
    if (!activeProductForBooking) return;

    const orderNo = "MAJ-" + Math.floor(100000 + Math.random() * 900000);

    try {
        if (supabase) {
            const { data, error } = await supabase.from('orders').insert([{
                order_number: orderNo,
                user_id: currentUser.id,
                product_id: String(activeProductForBooking.id),
                price: activeProductForBooking.price,
                mudra_credited: activeProductForBooking.mudra_reward || 0,
                status: 'Pending Confirmation'
            }]);

            if (error) throw error;
        }

        currentUser.mudraGold += Number(activeProductForBooking.mudra_reward || 0);
        updateUIHeader();

        document.getElementById("checkoutStep1").style.display = "none";
        document.getElementById("checkoutStep2").style.display = "block";

    } catch (err) {
        console.error("Booking Error:", err);
        showToast("Order save karne mein dikkat aayi: " + err.message);
    }
}

function openPaymentSection() {
    const modal = document.getElementById("paymentSectionModal");
    const list = document.getElementById("selectedItemsList");
    const totalElem = document.getElementById("totalPaymentAmount");

    if (cart.length === 0) {
        list.innerHTML = `<p style="color:#999;">No items in cart</p>`;
        totalElem.innerText = "₹0";
    } else {
        list.innerHTML = cart.map(i => `<div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>${i.name}</span><strong>₹${Number(i.price).toLocaleString('en-IN')}</strong></div>`).join('');
        const total = cart.reduce((sum, item) => sum + Number(item.price), 0);
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

    const totalAmount = cart.reduce((sum, item) => sum + Number(item.price), 0);

    const options = {
        key: "rzp_test_YourTestKeyHere",
        amount: totalAmount * 100,
        currency: "INR",
        name: "Maa Ambe Jewellers",
        description: "Jewelry Purchase Checkout",
        handler: async function (response) {
            showToast("Payment Successful! Payment ID: " + response.razorpay_payment_id);
            cart = [];
            document.getElementById("tray-count").innerText = "0";
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
    document.getElementById("profile-id").innerText = currentUser.memberId;
    document.getElementById("profile-name").innerText = currentUser.name;
    document.getElementById("profile-contact").innerText = currentUser.contact;
    document.getElementById("profile-mudra").innerText = currentUser.mudraGold + " Gold Points";
    document.getElementById("userModal").style.display = "block";
}

function closeUserModal() {
    document.getElementById("userModal").style.display = "none";
}

async function showMyOrdersModal() {
    const container = document.getElementById("ordersListContainer");
    document.getElementById("myOrdersModal").style.display = "block";

    if (!supabase) {
        container.innerHTML = "<p>Supabase client not connected.</p>";
        return;
    }

    container.innerHTML = "Fetching your orders...";

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
                <p><strong>Price:</strong> ₹${Number(ord.price).toLocaleString('en-IN')}</p>
                <p><strong>Status:</strong> <span style="color:#28a745;">${ord.status}</span></p>
            </div>
        `).join('');

    } catch (err) {
        container.innerHTML = `<p style="color:red;">Order Load Error: ${err.message}</p>`;
    }
}

function closeOrdersModal() {
    document.getElementById("myOrdersModal").style.display = "none";
}

function open3DModal() {
    document.getElementById("3dModal").style.display = "block";
    initThreeJS();
}

function close3DModal() {
    document.getElementById("3dModal").style.display = "none";
}

function initThreeJS() {
    const container = document.getElementById("three-container");
    if (!container || container.children.length > 0) return;

    if (typeof THREE === 'undefined') {
        container.innerHTML = "<p style='color:#ccc; text-align:center;'>Three.js library loading...</p>";
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
    setTimeout(() => {
        toast.style.display = "none";
    }, 3000);
}
  
