// Authentic Internet Products Catalog
let products = [
  { id: 1, name: "Royal Solitaire Diamond Ring", category: "women", price: 125000, mudraReward: 50, img: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500" },
  { id: 2, name: "Men's Heritage Gold Kada 24K", category: "men", price: 85000, mudraReward: 35, img: "https://images.unsplash.com/photo-1611591475155-4282fc289e74?w=500" },
  { id: 3, name: "Emerald Cut Platinum Diamond Ring", category: "women", price: 210000, mudraReward: 80, img: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=500" },
  { id: 4, name: "Royal Temple Gold Necklace", category: "women", price: 340000, mudraReward: 120, img: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500" },
  { id: 5, name: "Classic Solid Silver Payal", category: "women", price: 18000, mudraReward: 10, img: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500" },
  { id: 6, name: "Men's Platinum Signet Ring", category: "men", price: 95000, mudraReward: 40, img: "https://images.unsplash.com/photo-1598560917505-59a3ad559071?w=500" }
];

let currentUser = {
  memberId: "",
  name: "",
  contact: "",
  mudraGold: 0,
  mudraSilver: 0,
  wishlist: [],
  tray: [],
  orders: []
};

let developerLogs = [];
let startTime = Date.now();
let pendingBookingProduct = null;

// Initial Setup on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  const savedUser = localStorage.getItem('aura_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
  } else {
    currentUser.memberId = 'AUR-' + Math.floor(100000 + Math.random() * 900000);
    currentUser.name = "Guest Member";
    currentUser.contact = "+91 9876543210";
    localStorage.setItem('aura_user', JSON.stringify(currentUser));
  }
  
  updateUserUI();
  displayProducts(products);
});

function updateUserUI() {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  };
  
  setVal('user-member-id', currentUser.memberId);
  setVal('sidebar-user-name', currentUser.name);
  setVal('profile-id', currentUser.memberId);
  setVal('profile-name', currentUser.name);
  setVal('profile-contact', currentUser.contact);
  setVal('mudra-gold', currentUser.mudraGold);
  setVal('profile-mudra', `${currentUser.mudraGold} Gold`);
  setVal('wishlist-count', currentUser.wishlist ? currentUser.wishlist.length : 0);
  setVal('tray-count', currentUser.tray ? currentUser.tray.length : 0);
}

function displayProducts(items) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;
  
  grid.innerHTML = '';
  items.forEach(p => {
    const isWishlisted = currentUser.wishlist && currentUser.wishlist.includes(p.id);
    grid.innerHTML += `
      <div class="product-card" onclick="openHDView('${p.img}', '${p.name}', ${p.price}, ${p.id}, ${p.mudraReward})">
        <div class="card-wishlist-icon" onclick="event.stopPropagation(); toggleWishlist(${p.id})">
          <svg class="icon-svg ${isWishlisted ? 'active-wishlist' : ''}" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>
        <div class="img-container">
          <img src="${p.img}" class="product-img" alt="${p.name}">
        </div>
        <h3>${p.name}</h3>
        <p class="mudra-tag">Reward: ${p.mudraReward} Mudra Gold</p>
        <p class="price">₹${p.price.toLocaleString()}</p>
        <button class="btn-gold-action" onclick="event.stopPropagation(); initiateBooking(${p.id})">Book Now</button>
        <button class="btn-gold-action" style="background:#444; color:#fff" onclick="event.stopPropagation(); addToCart(${p.id})">Cart</button>
        <button class="btn-gold-action" style="background:#222; color:#D4AF37" onclick="event.stopPropagation(); open3D()">View 3D</button>
      </div>
    `;
  });
}

function openHDView(imgSrc, title, price, id, mudra) {
  pendingBookingProduct = products.find(p => p.id === id);
  document.getElementById('hdModalImage').src = imgSrc;
  document.getElementById('hdModalTitle').innerText = title;
  document.getElementById('hdModalPrice').innerText = `₹${price.toLocaleString()}`;
  document.getElementById('hdModalMudra').innerText = `Reward: ${mudra} Mudra Gold`;
  document.getElementById('modalBookBtn').onclick = () => initiateBooking(id);
  document.getElementById('imageModal').style.display = 'flex';
}

function closeImageModal() {
  document.getElementById('imageModal').style.display = 'none';
}

function toggleWishlist(id) {
  if (!currentUser.wishlist) currentUser.wishlist = [];
  const index = currentUser.wishlist.indexOf(id);
  if (index === -1) {
    currentUser.wishlist.push(id);
    showToast("Added to Wishlist!");
  } else {
    currentUser.wishlist.splice(index, 1);
    showToast("Removed from Wishlist!");
  }
  localStorage.setItem('aura_user', JSON.stringify(currentUser));
  updateUserUI();
  displayProducts(products);
}

function addToCart(id) {
  if (!currentUser.tray) currentUser.tray = [];
  currentUser.tray.push(id);
  localStorage.setItem('aura_user', JSON.stringify(currentUser));
  updateUserUI();
  showToast("Item added to Cart!");
}

function initiateBooking(id) {
  closeImageModal();
  pendingBookingProduct = products.find(p => p.id === id);
  document.getElementById('checkoutProdName').innerText = pendingBookingProduct.name;
  document.getElementById('checkoutProdPrice').innerText = `₹${pendingBookingProduct.price.toLocaleString()}`;
  document.getElementById('checkoutMudraCredit').innerText = pendingBookingProduct.mudraReward / 2;
  
  document.getElementById('checkoutStep1').style.display = 'block';
  document.getElementById('checkoutStep2').style.display = 'none';
  document.getElementById('bookingCheckoutModal').style.display = 'flex';
}

function executeSureBooking() {
  if (!pendingBookingProduct) return;
  
  const halfReward = pendingBookingProduct.mudraReward / 2;
  currentUser.mudraGold += halfReward;
  
  const newOrder = {
    orderId: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
    productName: pendingBookingProduct.name,
    price: pendingBookingProduct.price,
    status: 'Pending Confirmation'
  };
  
  if (!currentUser.orders) currentUser.orders = [];
  currentUser.orders.push(newOrder);
  localStorage.setItem('aura_user', JSON.stringify(currentUser));

  updateUserUI();
  document.getElementById('checkoutStep1').style.display = 'none';
  document.getElementById('checkoutStep2').style.display = 'block';
}

function closeCheckoutModal() {
  document.getElementById('bookingCheckoutModal').style.display = 'none';
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('active');
}

function showUserDetailsModal() {
  document.getElementById('session-time').innerText = Math.round((Date.now() - startTime) / 1000);
  document.getElementById('userModal').style.display = 'flex';
}

function closeUserModal() {
  document.getElementById('userModal').style.display = 'none';
}

function showMyOrdersModal() {
  const container = document.getElementById('ordersListContainer');
  if (!currentUser.orders || currentUser.orders.length === 0) {
    container.innerHTML = "<p style='color:#888;'>No orders requested yet.</p>";
  } else {
    container.innerHTML = currentUser.orders.map(o => `
      <div style="background:#222; padding:10px; margin:8px 0; border-radius:4px; border:1px solid #D4AF37;">
        <p><strong>Order ID:</strong> ${o.orderId}</p>
        <p><strong>Item:</strong> ${o.productName}</p>
        <p><strong>Price:</strong> ₹${o.price.toLocaleString()}</p>
        <p><strong>Status:</strong> ${o.status}</p>
      </div>
    `).join('');
  }
  document.getElementById('myOrdersModal').style.display = 'flex';
}

function closeOrdersModal() {
  document.getElementById('myOrdersModal').style.display = 'none';
}

function openPaymentSection() {
  const container = document.getElementById('selectedItemsList');
  const totalElem = document.getElementById('totalPaymentAmount');
  
  if (!currentUser.tray || currentUser.tray.length === 0) {
    container.innerHTML = "<p style='color:#888;'>Cart is empty.</p>";
    totalElem.innerText = "₹0";
  } else {
    let total = 0;
    const itemsHtml = currentUser.tray.map(id => {
      const item = products.find(p => p.id === id);
      if (!item) return '';
      total += item.price;
      return `<div style="display:flex; justify-between; margin: 4px 0;">
                <span>${item.name}</span>
                <span style="color:#D4AF37;">₹${item.price.toLocaleString()}</span>
              </div>`;
    }).join('');
    
    container.innerHTML = itemsHtml;
    totalElem.innerText = `₹${total.toLocaleString()}`;
  }
  document.getElementById('paymentSectionModal').style.display = 'flex';
}

function closePaymentSection() {
  document.getElementById('paymentSectionModal').style.display = 'none';
}

function proceedToRazorpay() {
  if (!currentUser.tray || currentUser.tray.length === 0) {
    alert("Please add items to cart before checking out!");
    return;
  }
  alert("Redirecting to Razorpay Payment Gateway...");
}

function filterProducts() {
  const val = document.getElementById('searchInput').value.toLowerCase();
  const filtered = products.filter(p => p.name.toLowerCase().includes(val));
  displayProducts(filtered);
}

function sortProducts() {
  const val = document.getElementById('sortPrice').value;
  let sorted = [...products];
  if (val === 'low-high') sorted.sort((a, b) => a.price - b.price);
  if (val === 'high-low') sorted.sort((a, b) => b.price - a.price);
  displayProducts(sorted);
}

function filterCategory(cat) {
  if (cat === 'all') return displayProducts(products);
  const filtered = products.filter(p => p.category === cat);
  displayProducts(filtered);
}

// Interactive 3D Gold Ring Render
function open3D() {
  document.getElementById('3dModal').style.display = 'flex';
  const container = document.getElementById('three-container');
  if (!container) return;
  
  container.innerHTML = '';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / 300, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth || 300, 300);
  container.appendChild(renderer.domElement);

  const geometry = new THREE.TorusGeometry(1, 0.3, 16, 100);
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

function close3DModal() {
  document.getElementById('3dModal').style.display = 'none';
}

function showToast(message) {
  const toast = document.getElementById('buyer-toast');
  if (toast) {
    toast.innerText = message;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 2500);
  }
          }
