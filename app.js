// SUPABASE CLIENT INITIALIZATION
const SUPABASE_URL = "https://YOUR_SUPABASE_URL_HERE.supabase.co";
const SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY_HERE";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// STATE MANAGEMENT
let currentUser = null;
let currentPortal = 'customer';
let products = [];
let savedItems = { cart: [], wishlist: [] };
let activeShareBookingId = null;
let currentLanguage = 'hi';

const translations = {
  hi: {
    welcome: "✨ माँ अम्बे ज्वैलर्स — रॉयल कलेक्शन और वेंडर हब",
    menu: "मेन्यू",
    wishlist: "विशलिस्ट",
    tray: "ट्रॉली/ट्रे",
    bookNow: "अभी बुक करें",
    addTray: "ट्रे में जोड़ें",
    removeTray: "ट्रे से हटाएं"
  },
  en: {
    welcome: "✨ Maa Ambe Jewellers — Royal Collection & Vendor Hub",
    menu: "Menu",
    wishlist: "Wishlist",
    tray: "Tray",
    bookNow: "Book Now",
    addTray: "Add to Tray",
    removeTray: "Remove Tray"
  }
};

// INITIALIZATION
window.addEventListener('DOMContentLoaded', async () => {
  await restoreSession();
  await loadCatalogProducts();
  setupRealtimeSubscriptions();
  updateUI();
});

// RESTORE SESSION & SYNC
async function restoreSession() {
  const storedUser = localStorage.getItem('ambe_user');
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
    await syncProfileFromDatabase();
    await loadSavedItems();
  }
}

async function syncProfileFromDatabase() {
  if (!currentUser) return;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
  if (data && !error) {
    currentUser = data;
    localStorage.setItem('ambe_user', JSON.stringify(currentUser));
  }
}

// REALTIME SUBSCRIPTIONS
function setupRealtimeSubscriptions() {
  supabase
    .channel('public-events')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, payload => {
      if (currentUser) {
        if (payload.new && payload.new.customer_id === currentUser.id) {
          showToast(`Booking Update: Status is now ${payload.new.status.toUpperCase()}`);
        }
        if (payload.new && (payload.new.vendor_id === currentUser.id || payload.new.shared_vendor_id === currentUser.id)) {
          showToast(`New/Updated Booking Request Received!`);
          if (currentPortal === 'vendor') loadVendorBookings();
        }
      }
    })
    .subscribe();
}

// PORTAL SWITCHING
function switchPortal(mode) {
  currentPortal = mode;
  document.getElementById('customerPortal').style.display = mode === 'customer' ? 'block' : 'none';
  document.getElementById('vendorPortal').style.display = mode === 'vendor' ? 'block' : 'none';
  document.getElementById('customerSearchBar').style.display = mode === 'customer' ? 'flex' : 'none';
  document.getElementById('customerNavActions').style.display = mode === 'customer' ? 'flex' : 'none';

  document.getElementById('switchCustomerBtn').classList.toggle('active', mode === 'customer');
  document.getElementById('switchVendorBtn').classList.toggle('active', mode === 'vendor');

  if (mode === 'vendor') {
    if (!currentUser || currentUser.role !== 'vendor') {
      showToast("Vendor Account Required! Please Login.");
      openAuthModal();
      return;
    }
    loadVendorDashboard();
  }
}

// AUTH & OTP LOGIC
let generatedOTP = null;
let pendingAuthData = {};

function openAuthModal() {
  document.getElementById('authModal').style.display = 'flex';
  document.getElementById('authPhoneForm').style.display = 'block';
  document.getElementById('authOTPForm').style.display = 'none';
  document.getElementById('authRegisterForm').style.display = 'none';
}

function closeAuthModal() {
  document.getElementById('authModal').style.display = 'none';
}

function toggleAuthFields() {
  const role = document.getElementById('authRoleSelect').value;
  document.getElementById('vendorExtraFields').style.display = role === 'vendor' ? 'block' : 'none';
}

async function handleSendOTP(event) {
  event.preventDefault();
  const phone = document.getElementById('authPhone').value.trim();
  const role = document.getElementById('authRoleSelect').value;

  if (!phone) return alert("Enter Phone Number");

  pendingAuthData = { phone, role };
  
  const { data: existingProfile } = await supabase.from('profiles').select('*').eq('phone_number', phone).single();

  if (existingProfile) {
    pendingAuthData.existingProfile = existingProfile;
  }

  generatedOTP = "123456"; // Standardized test OTP
  alert(`OTP sent to ${phone}. Enter Code: 123456`);

  document.getElementById('authPhoneForm').style.display = 'none';
  document.getElementById('authOTPForm').style.display = 'block';
}

async function handleVerifyOTP(event) {
  event.preventDefault();
  const enteredOTP = document.getElementById('authOTP').value.trim();

  if (enteredOTP !== generatedOTP) return alert("Invalid OTP!");

  if (pendingAuthData.existingProfile) {
    currentUser = pendingAuthData.existingProfile;
    localStorage.setItem('ambe_user', JSON.stringify(currentUser));
    await loadSavedItems();
    updateUI();
    closeAuthModal();
    showToast(`Signed In! Permanent ID: ${currentUser.permanent_member_id}`);
  } else {
    document.getElementById('authOTPForm').style.display = 'none';
    document.getElementById('authRegisterForm').style.display = 'block';
    toggleAuthFields();
  }
}

async function handleCompleteRegistration(event) {
  event.preventDefault();
  const fullName = document.getElementById('regFullName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const zip = document.getElementById('regZip').value.trim();

  const prefix = pendingAuthData.role === 'vendor' ? 'VND' : 'CST';
  const permanentMemberId = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

  const profilePayload = {
    phone_number: pendingAuthData.phone,
    email: email || null,
    full_name: fullName,
    role: pendingAuthData.role,
    permanent_member_id: permanentMemberId,
    zip_code: zip || null,
    shop_name: pendingAuthData.role === 'vendor' ? document.getElementById('regShopName').value : null,
    thaana_area: pendingAuthData.role === 'vendor' ? document.getElementById('regThaana').value : null
  };

  const { data, error } = await supabase.from('profiles').insert([profilePayload]).select().single();

  if (error) return alert("Registration Error: " + error.message);

  currentUser = data;
  localStorage.setItem('ambe_user', JSON.stringify(currentUser));
  updateUI();
  closeAuthModal();
  showToast(`Registered! Member ID: ${currentUser.permanent_member_id}`);
}

function handleSignOut() {
  currentUser = null;
  localStorage.removeItem('ambe_user');
  savedItems = { cart: [], wishlist: [] };
  updateUI();
  switchPortal('customer');
  showToast("Logged out successfully");
}

// CATALOG RENDERING
async function loadCatalogProducts() {
  const { data } = await supabase.from('products').select('*').eq('is_active', true);
  if (data) {
    products = data;
    displayProducts(products);
  }
}

function displayProducts(items) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const lang = translations[currentLanguage];

  items.forEach(p => {
    const isWishlisted = savedItems.wishlist.some(i => i.product_id === p.id);
    const isInCart = savedItems.cart.some(i => i.product_id === p.id);

    grid.innerHTML += `
      <div class="product-card">
        <div class="card-wishlist-icon ${isWishlisted ? 'active-wishlist' : ''}" onclick="toggleSavedItem('${p.id}', 'wishlist')">
          <svg class="icon-svg" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>
        <div class="img-container">
          <img src="${p.primary_image}" class="product-img" alt="${p.name}">
        </div>
        <h3>${p.name}</h3>
        <p class="mudra-tag">Reward: ${p.ambe_mudra_reward} A.Mudra</p>
        <p class="price">₹${Number(p.price).toLocaleString()}</p>
        <div class="card-actions">
          <button class="btn-gold-action" onclick="initiateBooking('${p.id}')">${lang.bookNow}</button>
          <button class="btn-secondary ${isInCart ? 'active-cart' : ''}" onclick="toggleSavedItem('${p.id}', 'cart')">
            ${isInCart ? lang.removeTray : lang.addTray}
          </button>
        </div>
      </div>
    `;
  });
}

// SAVED ITEMS (Cart/Tray & Wishlist)
async function loadSavedItems() {
  if (!currentUser) return;
  const { data } = await supabase.from('user_saved_items').select('*').eq('user_id', currentUser.id);
  if (data) {
    savedItems.cart = data.filter(i => i.type === 'cart');
    savedItems.wishlist = data.filter(i => i.type === 'wishlist');
    updateSavedCounters();
  }
}

async function toggleSavedItem(productId, type) {
  if (!currentUser) {
    showToast("Please login first!");
    openAuthModal();
    return;
  }

  const index = savedItems[type].findIndex(i => i.product_id === productId);

  if (index > -1) {
    const item = savedItems[type][index];
    await supabase.from('user_saved_items').delete().eq('id', item.id);
    savedItems[type].splice(index, 1);
    showToast(`Removed from ${type}`);
  } else {
    const { data } = await supabase.from('user_saved_items').insert([{
      user_id: currentUser.id, product_id: productId, type
    }]).select().single();

    if (data) {
      savedItems[type].push(data);
      showToast(`Added to ${type}`);
    }
  }

  updateSavedCounters();
  displayProducts(products);
}

function updateSavedCounters() {
  document.getElementById('wishlist-count').innerText = savedItems.wishlist.length;
  document.getElementById('tray-count').innerText = savedItems.cart.length;
}

// BOOKING PROCESS WITH AUDIO & TICK
async function initiateBooking(productId) {
  if (!currentUser) {
    showToast("Login required to complete booking!");
    openAuthModal();
    return;
  }

  const product = products.find(p => p.id === productId);
  if (!product) return;

  const halfReward = product.ambe_mudra_reward / 2;
  const bookingCode = 'BK-' + Math.floor(100000 + Math.random() * 900000);

  const sound = document.getElementById('bookingTune');
  if (sound) sound.play().catch(() => {});

  const { error } = await supabase.from('bookings').insert([{
    booking_code: bookingCode,
    customer_id: currentUser.id,
    vendor_id: product.vendor_id,
    product_id: product.id,
    status: 'pending',
    mudra_frozen: halfReward,
    mudra_credited: false
  }]);

  if (error) return alert("Booking Error: " + error.message);

  document.getElementById('bookingSuccessModal').style.display = 'flex';
}

function closeBookingSuccessModal() {
  document.getElementById('bookingSuccessModal').style.display = 'none';
}

// VENDOR DASHBOARD & BOOKINGS
async function loadVendorDashboard() {
  document.getElementById('vendorMudraDisplay').innerText = currentUser.ambe_mudra_balance;
  await loadVendorBookings();
  await loadVendorProducts();
}

async function loadVendorBookings() {
  const { data } = await supabase
    .from('bookings')
    .select('*, products(*), profiles!bookings_customer_id_fkey(*)')
    .or(`vendor_id.eq.${currentUser.id},shared_vendor_id.eq.${currentUser.id}`);

  const container = document.getElementById('vendorBookingList');
  container.innerHTML = '';

  if (!data || data.length === 0) {
    container.innerHTML = '<p>No pending booking requests.</p>';
    return;
  }

  data.forEach(b => {
    container.innerHTML += `
      <div class="booking-card">
        <p><strong>Order ID:</strong> ${b.booking_code}</p>
        <p><strong>Customer Name:</strong> ${b.profiles?.full_name} (${b.profiles?.phone_number})</p>
        <p><strong>Item:</strong> ${b.products?.name} - ₹${b.products?.price}</p>
        <p><strong>Status:</strong> <span class="status-tag ${b.status}">${b.status.toUpperCase()}</span></p>
        
        <div class="vendor-action-btns">
          ${b.status === 'pending' ? `
            <button class="btn-approve" onclick="updateBookingStatus('${b.id}', 'approved')">Approve</button>
            <button class="btn-reject" onclick="updateBookingStatus('${b.id}', 'rejected')">Reject</button>
            <button class="btn-share" onclick="openShareModal('${b.id}')">Share Order</button>
          ` : ''}

          ${b.status === 'approved' ? `
            <button class="btn-gold-action" onclick="markJewelryReady('${b.id}')">Mark Jewelry Ready</button>
          ` : ''}
        </div>
      </div>
    `;
  });
}

async function updateBookingStatus(bookingId, status) {
  await supabase.from('bookings').update({ status }).eq('id', bookingId);
  showToast(`Booking status updated to ${status}`);
  loadVendorBookings();
}

async function markJewelryReady(bookingId) {
  const { data: booking } = await supabase.from('bookings').select('*').eq('id', bookingId).single();

  if (!booking || booking.mudra_credited) return;

  const halfReward = booking.mudra_frozen;
  await supabase.rpc('update_mudra_balance', { target_user_id: booking.customer_id, amount: halfReward });
  await supabase.from('bookings').update({ status: 'ready', mudra_credited: true }).eq('id', bookingId);

  showToast(`Notification Sent! ${halfReward} Mudra credited to Customer.`);
  loadVendorBookings();
}

// VENDOR CATALOG CREATION WITH MUDRA LOCK
async function handleCreateProduct(event) {
  event.preventDefault();
  const name = document.getElementById('prodName').value;
  const category = document.getElementById('prodCategory').value;
  const price = parseFloat(document.getElementById('prodPrice').value);
  const mudra = parseFloat(document.getElementById('prodMudra').value) || 0;
  const image = document.getElementById('prodImage').value;

  if (mudra > currentUser.ambe_mudra_balance) {
    return alert("Insufficient Ambe Mudra Balance!");
  }

  await supabase.rpc('update_mudra_balance', { target_user_id: currentUser.id, amount: -mudra });

  await supabase.from('products').insert([{
    vendor_id: currentUser.id, name, category, price, ambe_mudra_reward: mudra, primary_image: image
  }]);

  await syncProfileFromDatabase();
  closeAddProductModal();
  loadVendorDashboard();
  loadCatalogProducts();
  showToast("Product published & Mudra locked!");
}

async function loadVendorProducts() {
  const { data } = await supabase.from('products').select('*').eq('vendor_id', currentUser.id);
  const grid = document.getElementById('vendorCatalogGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (data) {
    data.forEach(p => {
      grid.innerHTML += `
        <div class="product-card">
          <img src="${p.primary_image}" class="product-img" alt="${p.name}">
          <h3>${p.name}</h3>
          <p>₹${p.price.toLocaleString()}</p>
          <button class="btn-reject" onclick="deleteVendorProduct('${p.id}', ${p.ambe_mudra_reward})">Delete & Refund Mudra</button>
        </div>
      `;
    });
  }
}

async function deleteVendorProduct(productId, mudraReward) {
  await supabase.from('products').delete().eq('id', productId);
  await supabase.rpc('update_mudra_balance', { target_user_id: currentUser.id, amount: mudraReward });
  await syncProfileFromDatabase();
  loadVendorDashboard();
  loadCatalogProducts();
  showToast("Item deleted & Mudra refunded!");
}

// SILENT SHARE ORDER
async function openShareModal(bookingId) {
  activeShareBookingId = bookingId;
  const { data: vendors } = await supabase.from('profiles').select('*').eq('role', 'vendor').neq('id', currentUser.id);
  
  const select = document.getElementById('shareVendorSelect');
  select.innerHTML = vendors.map(v => `<option value="${v.id}">${v.shop_name || v.full_name}</option>`).join('');

  document.getElementById('shareOrderModal').style.display = 'flex';
}

function closeShareOrderModal() {
  document.getElementById('shareOrderModal').style.display = 'none';
}

async function executeShareOrder() {
  const targetVendorId = document.getElementById('shareVendorSelect').value;
  await supabase.from('bookings').update({ shared_vendor_id: targetVendorId }).eq('id', activeShareBookingId);
  closeShareOrderModal();
  showToast("Order shared with vendor silently.");
  loadVendorBookings();
}

// SAVED MODAL DISPLAY
async function openSavedModal(type) {
  if (!currentUser) {
    showToast("Please login first!");
    openAuthModal();
    return;
  }

  document.getElementById('savedModalTitle').innerText = type === 'cart' ? 'Tray / Cart Items' : 'Wishlist Items';
  const list = document.getElementById('savedModalList');
  list.innerHTML = '';

  const itemIds = savedItems[type].map(i => i.product_id);
  const filteredProducts = products.filter(p => itemIds.includes(p.id));

  if (filteredProducts.length === 0) {
    list.innerHTML = '<p>No items saved here.</p>';
  } else {
    filteredProducts.forEach(p => {
      list.innerHTML += `
        <div class="saved-item-row" style="display:flex; justify-size: space-between; align-items:center; margin-bottom:10px;">
          <img src="${p.primary_image}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;">
          <div>
            <h4>${p.name}</h4>
            <p>₹${p.price.toLocaleString()}</p>
          </div>
          <button class="btn-gold-action" onclick="initiateBooking('${p.id}')">Book Now</button>
        </div>
      `;
    });
  }

  document.getElementById('savedModal').style.display = 'flex';
}

function closeSavedModal() { document.getElementById('savedModal').style.display = 'none'; }

// CUSTOMER ORDERS HISTORY
async function showCustomerOrdersModal() {
  if (!currentUser) return openAuthModal();

  const { data } = await supabase.from('bookings').select('*, products(*)').eq('customer_id', currentUser.id);
  
  document.getElementById('savedModalTitle').innerText = 'My Booking Requests';
  const list = document.getElementById('savedModalList');
  list.innerHTML = '';

  if (!data || data.length === 0) {
    list.innerHTML = '<p>No bookings found.</p>';
  } else {
    data.forEach(b => {
      list.innerHTML += `
        <div class="booking-card">
          <p><strong>Order ID:</strong> ${b.booking_code}</p>
          <p><strong>Item:</strong> ${b.products?.name}</p>
          <p><strong>Status:</strong> <span class="status-tag ${b.status}">${b.status.toUpperCase()}</span></p>
        </div>
      `;
    });
  }

  document.getElementById('savedModal').style.display = 'flex';
}

// UTILITIES
function updateUI() {
  if (currentUser) {
    document.getElementById('sidebarUserStatus').innerText = "Logged In";
    document.getElementById('sidebarMemberId').innerText = currentUser.permanent_member_id;
    document.getElementById('sidebarUserName').innerText = currentUser.full_name;
    document.getElementById('sidebarMudra').innerText = currentUser.ambe_mudra_balance;
    document.getElementById('authTriggerBtn').innerText = "My Account";
  } else {
    document.getElementById('sidebarUserStatus').innerText = "Not Logged In";
    document.getElementById('sidebarMemberId').innerText = "--";
    document.getElementById('sidebarUserName').innerText = "--";
    document.getElementById('sidebarMudra').innerText = "0";
    document.getElementById('authTriggerBtn').innerText = "Login / Register";
  }
}

function changeLanguage(lang) {
  currentLanguage = lang;
  document.getElementById('txt-welcome').innerText = translations[lang].welcome;
  document.getElementById('txt-menu').innerText = translations[lang].menu;
  document.getElementById('txt-wishlist').innerText = translations[lang].wishlist;
  document.getElementById('txt-tray').innerText = translations[lang].tray;
  displayProducts(products);
}

function showToast(msg) {
  const toast = document.getElementById('buyer-toast');
  if (toast) {
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
  }
}

function toggleSidebar() { document.get
