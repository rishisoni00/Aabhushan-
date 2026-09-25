const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentCustomer = JSON.parse(localStorage.getItem('ambe_customer_session')) || null;
let pendingPhone = '';
let wishSet = new Set();
let cartSet = new Set();

document.addEventListener('DOMContentLoaded', async () => {
  updateNavUI();
  await fetchCatalog();
  if (currentCustomer) {
    await syncUserSavedData();
    listenToNotifications();
  }
});

// 1. Permanent ID Generation
function generateCustomerMemberId() {
  return `AUR-${Math.floor(100000 + Math.random() * 900000)}`;
}

// 2. Auth Flow (Phone -> Check -> Signup/Login)
function openAuthModal() { document.getElementById('authModal').style.display = 'flex'; }
function closeAuthModal() { document.getElementById('authModal').style.display = 'none'; }

async function handlePhoneSubmit(e) {
  e.preventDefault();
  pendingPhone = document.getElementById('phoneNumber').value.trim();

  const { data } = await supabase.from('profiles').select('*').eq('phone_number', pendingPhone).single();

  document.getElementById('phoneForm').classList.add('hidden-section');
  if (data) {
    // Returning User -> Permanent ID retained
    document.getElementById('loginForm').classList.remove('hidden-section');
  } else {
    // New User -> Complete Profile
    document.getElementById('signupForm').classList.remove('hidden-section');
  }
}

async function handleCustomerSignup(e) {
  e.preventDefault();
  if (document.getElementById('otpInput').value !== '1234') return alert('Invalid OTP!');

  const memberId = generateCustomerMemberId();
  const profileData = {
    member_id: memberId,
    full_name: document.getElementById('fullName').value,
    phone_number: pendingPhone,
    email: document.getElementById('emailAddr').value || null,
    zip_code: document.getElementById('zipCode').value || null,
    role: 'customer'
  };

  const { data, error } = await supabase.from('profiles').insert([profileData]).select().single();
  if (error) return alert('Signup Failed!');

  currentCustomer = data;
  localStorage.setItem('ambe_customer_session', JSON.stringify(currentCustomer));
  alert(`Welcome! Your Permanent Member ID: ${memberId}`);
  closeAuthModal();
  updateNavUI();
  location.reload();
}

async function handleCustomerLogin(e) {
  e.preventDefault();
  if (document.getElementById('loginOtpInput').value !== '1234') return alert('Invalid OTP!');

  const { data } = await supabase.from('profiles').select('*').eq('phone_number', pendingPhone).single();
  currentCustomer = data;
  localStorage.setItem('ambe_customer_session', JSON.stringify(currentCustomer));
  alert(`Logged in! Member ID: ${currentCustomer.member_id}`);
  closeAuthModal();
  updateNavUI();
  location.reload();
}

// 3. Saved Items (Wishlist & Cart Syncing)
async function toggleWishlist(productId, btn) {
  if (!checkAuth()) return;
  
  if (wishSet.has(productId)) {
    await supabase.from('user_saved_items').delete().match({ member_id: currentCustomer.member_id, product_id: productId, type: 'wishlist' });
    wishSet.delete(productId);
    btn.classList.remove('active');
  } else {
    await supabase.from('user_saved_items').insert([{ member_id: currentCustomer.member_id, product_id: productId, type: 'wishlist' }]);
    wishSet.add(productId);
    btn.classList.add('active');
  }
  document.getElementById('wishCount').innerText = wishSet.size;
}

async function toggleCart(productId, btn) {
  if (!checkAuth()) return;

  if (cartSet.has(productId)) {
    await supabase.from('user_saved_items').delete().match({ member_id: currentCustomer.member_id, product_id: productId, type: 'cart' });
    cartSet.delete(productId);
    btn.innerText = 'Add to Tray 🛒';
  } else {
    await supabase.from('user_saved_items').insert([{ member_id: currentCustomer.member_id, product_id: productId, type: 'cart' }]);
    cartSet.add(productId);
    btn.innerText = 'Remove from Tray ❌';
  }
  document.getElementById('cartCount').innerText = cartSet.size;
}

// 4. Booking System with Gold Notification Tune
async function requestBooking(product) {
  if (!checkAuth()) return;

  const bookingId = `BK-${Date.now()}`;
  const { error } = await supabase.from('bookings').insert([{
    booking_id: bookingId,
    customer_member_id: currentCustomer.member_id,
    vendor_member_id: product.vendor_member_id,
    product_id: product.id,
    product_name: product.product_name,
    price: product.price,
    ambe_mudra_staked: product.ambe_mudra_reward,
    status: 'pending'
  }]);

  if (error) return alert('Booking Request Failed!');

  new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
  showGoldBanner('Request sent! Wait for response to vendor for booking approval.');
}

// 5. Customer Cancellation & Freeze Revert Logic
async function cancelBooking(bookingId) {
  const { data: booking } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
  await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
  
  await supabase.from('notifications').insert([{
    target_member_id: booking.vendor_member_id,
    title: 'Booking Cancelled',
    message: `Customer ${currentCustomer.member_id} cancelled order ${booking.booking_id}. Staked Mudra reverted.`
  }]);
  alert('Booking Cancelled. Frozen Mudra reverted to Vendor.');
  location.reload();
}

// Helpers
function checkAuth() {
  if (!currentCustomer) {
    alert('Please Sign Up / Login first to access this feature!');
    openAuthModal();
    return false;
  }
  return true;
}

function showGoldBanner(msg) {
  const div = document.createElement('div');
  div.className = 'gold-tick-banner';
  div.innerHTML = `✔ ${msg}`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

function updateNavUI() {
  document.getElementById('authBtn').innerText = currentCustomer ? `👤 ${currentCustomer.member_id}` : 'Sign Up / Login';
}

async function syncUserSavedData() {
  const { data } = await supabase.from('user_saved_items').select('*').eq('member_id', currentCustomer.member_id);
  if (data) {
    data.forEach(i => i.type === 'wishlist' ? wishSet.add(i.product_id) : cartSet.add(i.product_id));
    document.getElementById('wishCount').innerText = wishSet.size;
    document.getElementById('cartCount').innerText = cartSet.size;
  }
}

async function fetchCatalog() {
  const { data: products } = await supabase.from('products').select('*');
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';

  if (products) {
    products.forEach(p => {
      grid.innerHTML += `
        <div class="card">
          <button class="heart-btn ${wishSet.has(p.id)?'active':''}" onclick="toggleWishlist('${p.id}', this)">♥</button>
          <img src="${p.main_image_url}" alt="${p.product_name}">
          <h3>${p.product_name}</h3>
          <p>Price: ₹${p.price} | Mudra: ${p.ambe_mudra_reward}</p>
          ${p.image_360_url ? `<a href="${p.image_360_url}" target="_blank">🌀 360° View</a><br><br>` : ''}
          <button class="btn-primary" onclick="toggleCart('${p.id}', this)">${cartSet.has(p.id)?'Remove from Tray ❌':'Add to Tray 🛒'}</button>
          <button class="btn-switch" onclick='requestBooking(${JSON.stringify(p)})'>Book Now 📜</button>
        </div>
      `;
    });
  }
}

function showSection(sec) {
  ['catalogSection', 'wishlistSection', 'cartSection', 'bookingsSection'].forEach(s => document.getElementById(s).classList.add('hidden-section'));
  document.getElementById(`${sec}Section`).classList.remove('hidden-section');
}

function switchToVendorPortal() { window.location.href = 'vendor.html'; }

function listenToNotifications() {
  supabase.channel('customer-notifs')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `target_member_id=eq.${currentCustomer.member_id}` },
    p => alert(`NOTIFICATION: ${p.new.title}\n${p.new.message}`)).subscribe();
}
