const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentVendor = JSON.parse(localStorage.getItem('ambe_vendor_session')) || null;

document.addEventListener('DOMContentLoaded', async () => {
  if (currentVendor) {
    await refreshVendorProfile();
    await fetchVendorBookings();
    listenToVendorRealtime();
  } else {
    openVendorModal();
  }
});

function openVendorModal() { document.getElementById('vendorModal').style.display = 'flex'; }

async function handleVendorSignup(e) {
  e.preventDefault();
  if (document.getElementById('vOtp').value !== '1234') return alert('Invalid OTP!');

  const phone = document.getElementById('vPhone').value.trim();
  const { data: existing } = await supabase.from('profiles').select('*').eq('phone_number', phone).single();

  if (existing) {
    currentVendor = existing;
  } else {
    const vendorId = `VEN-${Math.floor(100000 + Math.random() * 900000)}`;
    const vendorData = {
      member_id: vendorId,
      full_name: document.getElementById('vName').value,
      phone_number: phone,
      zip_code: document.getElementById('vZip').value,
      thana_kshetra: document.getElementById('vThana').value,
      shop_name: document.getElementById('vShop').value,
      role: 'vendor',
      ambe_mudra_balance: 300
    };

    const { data } = await supabase.from('profiles').insert([vendorData]).select().single();
    currentVendor = data;
  }

  localStorage.setItem('ambe_vendor_session', JSON.stringify(currentVendor));
  alert(`Logged in! Vendor ID: ${currentVendor.member_id}`);
  document.getElementById('vendorModal').style.display = 'none';
  location.reload();
}

// Ambe Mudra Balance Engine (300 -> Catalog Dedication -> Re-credit)
async function handleAddCatalog(e) {
  e.preventDefault();
  const mudraVal = parseInt(document.getElementById('pMudra').value);

  if (currentVendor.ambe_mudra_balance < mudraVal) return alert('Insufficient Ambe Mudra Balance!');

  const productData = {
    vendor_member_id: currentVendor.member_id,
    product_name: document.getElementById('pName').value,
    price: parseFloat(document.getElementById('pPrice').value),
    main_image_url: document.getElementById('pImg').value,
    image_360_url: document.getElementById('p360').value || null,
    ambe_mudra_reward: mudraVal
  };

  await supabase.from('products').insert([productData]);

  // Deduct Mudra from Vendor
  const newBal = currentVendor.ambe_mudra_balance - mudraVal;
  await supabase.from('profiles').update({ ambe_mudra_balance: newBal }).eq('member_id', currentVendor.member_id);
  
  currentVendor.ambe_mudra_balance = newBal;
  localStorage.setItem('ambe_vendor_session', JSON.stringify(currentVendor));
  alert(`Product Listed! ${mudraVal} Mudra Dedicated. Balance Left: ${newBal}`);
  location.reload();
}

// Booking Responses: Approve / Reject / Ready / Share Order
async function respondBooking(bookingId, customerId, action) {
  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId);

  await supabase.from('notifications').insert([{
    target_member_id: customerId,
    title: `Booking ${newStatus.toUpperCase()}`,
    message: `Your booking request (${bookingId}) has been ${newStatus}.`
  }]);

  alert(`Booking ${newStatus}.`);
  fetchVendorBookings();
}

// Jewelry Ready -> Credit Half Mudra to Customer
async function notifyJewelryReady(booking) {
  await supabase.from('bookings').update({ status: 'ready' }).eq('id', booking.id);
  const halfMudra = Math.floor(booking.ambe_mudra_staked / 2);

  const { data: customer } = await supabase.from('profiles').select('ambe_mudra_balance').eq('member_id', booking.customer_member_id).single();
  await supabase.from('profiles').update({ ambe_mudra_balance: customer.ambe_mudra_balance + halfMudra }).eq('member_id', booking.customer_member_id);

  await supabase.from('notifications').insert([{
    target_member_id: booking.customer_member_id,
    title: 'Jewelry Ready!',
    message: `Your order is ready! ${halfMudra} Ambe Mudra credited to your account.`
  }]);

  alert(`Customer notified & ${halfMudra} Ambe Mudra transferred!`);
  fetchVendorBookings();
}

// Hidden Vendor-to-Vendor Order Sharing
async function shareOrder(bookingId) {
  const targetId = prompt('Enter Target Vendor Member ID (e.g., VEN-123456):');
  if (!targetId) return;

  await supabase.from('bookings').update({ shared_vendor_member_id: targetId }).eq('id', bookingId);
  alert('Order secretly shared with Vendor.');
}

async function fetchVendorBookings() {
  const { data: bookings } = await supabase.from('bookings').select('*').or(`vendor_member_id.eq.${currentVendor.member_id},shared_vendor_member_id.eq.${currentVendor.member_id}`);
  const container = document.getElementById('vendorBookingsTable');
  container.innerHTML = '';

  if (bookings) {
    bookings.forEach(b => {
      container.innerHTML += `
        <div style="border-bottom:1px solid #d4af37; padding:10px;">
          <p>Order ID: ${b.booking_id} | Product: ${b.product_name} | Customer ID: ${b.customer_member_id}</p>
          <p>Status: <strong>${b.status}</strong> | Mudra Staked: ${b.ambe_mudra_staked}</p>
          <button onclick="respondBooking('${b.id}', '${b.customer_member_id}', 'approve')">Approve ✔</button>
          <button onclick="respondBooking('${b.id}', '${b.customer_member_id}', 'reject')">Reject ❌</button>
          <button onclick='notifyJewelryReady(${JSON.stringify(b)})'>Jewelry Ready 📦</button>
          <button onclick="shareOrder('${b.id}')">Share Order 🤝</button>
        </div>
      `;
    });
  }
}

async function refreshVendorProfile() {
  const { data } = await supabase.from('profiles').select('*').eq('member_id', currentVendor.member_id).single();
  currentVendor = data;
  localStorage.setItem('ambe_vendor_session', JSON.stringify(currentVendor));
  document.getElementById('vendorMudraDisplay').innerText = `Ambe Mudra Balance: ${currentVendor.ambe_mudra_balance}`;
}

function switchToCustomerPortal() { window.location.href = 'index.html'; }

function listenToVendorRealtime() {
  supabase.channel('vendor-bookings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchVendorBookings()).subscribe();
}
