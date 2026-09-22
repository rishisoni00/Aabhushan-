// Product data updated to match image images and rewards
const products = [
  {
    id: 1,
    name: "Royal Diamond Solitaire",
    description: "Royal Diamond Solitaire, onliar description ...", // Example placeholder from image text
    category: "women",
    price: 125000,
    mudraReward: 50,
    // safe placeholder matching the diamond look from image
    img: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 2,
    name: "Men's Solid Gold Kada",
    description: "Men's Solid Gold Kada is any ceroist...", // Example placeholder
    category: "men",
    price: 85000,
    mudraReward: 30,
    // safe placeholder matching gold ring/cada look from image
    img: "https://images.unsplash.com/photo-1611591475155-4282fc289e74?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 3,
    name: "Emerald Cut Platinum Ring",
    description: "Emerald Cut Platinum Ring, Emerald Cut platinum ring, ihamord cerem...", // Example placeholder
    category: "women",
    price: 210000,
    mudraReward: 80,
    // safe placeholder matching emerald/green ring look from image
    img: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?q=80&w=600&auto=format&fit=crop"
  }
];

let currentUser = {
  memberId: "AUR-128756", // Updated to match image image sidebar
  name: "Rishi Sharma", // Updated to match image image sidebar
  mudraGold: 150, // Updated to match image image sidebar
  mudraSilver: 80, // Updated to match image image sidebar
  wishlist: [],
  orders: []
};
// Replace executeSureBooking in Customer app.js with this:
function executeSureBooking() {
  const halfReward = pendingBookingProduct.mudraReward / 2;
  currentUser.mudraGold += halfReward;
  
  const newBooking = {
    memberId: currentUser.memberId,
    customerName: currentUser.name,
    productName: pendingBookingProduct.name,
    price: pendingBookingProduct.price,
    mudraReward: pendingBookingProduct.mudraReward,
    status: 'Pending',
    timestamp: new Date().toISOString()
  };

  // Push into localStorage for Vendor connection
  let currentRequests = JSON.parse(localStorage.getItem('customer_bookings')) || [];
  currentRequests.unshift(newBooking);
  localStorage.setItem('customer_bookings', JSON.stringify(currentRequests));

  document.getElementById('checkoutStep1').style.display = 'none';
  document.getElementById('checkoutStep2').style.display = 'block';

  logDeveloperEvent(`BOOKING: User ${currentUser.memberId} requested ${pendingBookingProduct.name}. Sync sent to Vendor Dashboard.`);
}

// State to track developer analytics from TURN 1
let developerLogs = [];
let startTime = Date.now();
let activeInspectedProduct = null;
let inspectionStartTime = null;
let pendingBookingProduct = null;

// Initialization
window.addEventListener('DOMContentLoaded', () => {
  // Setup display per Turn 1 logic
  displayProducts(products);
});



// Display Products
function displayProducts(items) {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';
  items.forEach(p => {
    // Handling description parsing/shortening from data
    const descText = p.description ? p.description : "";
    const displayDesc = descText.length > 50 ? descText.substring(0, 47) + "..." : descText;

    grid.innerHTML += `
      <div class="product-card" onclick="openHDView('${p.img}', '${p.name}', ${p.price}, ${p.id}, ${p.mudraReward})">
        <!-- TURN 1 fixed Wishlist Icon -->
        <div class="card-wishlist-icon" onclick="event.stopPropagation(); toggleWishlist(${p.id})">
          <svg class="icon-svg ${currentUser.wishlist.includes(p.id) ? 'active-wishlist' : ''}" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#D4AF37"/>
          </svg>
        </div>
        <div class="img-container">
          <img src="${p.img}" class="product-img" alt="${p.name}">
        </div>
        <h3>${p.name}</h3>
        <p class="mudra-tag" style="font-size: 0.7rem; color: #aaa; font-style: italic;">${displayDesc}</p>
        <p class="price">₹${p.price.toLocaleString()}</p>
        <p class="mudra-tag">Reward: ${p.mudraReward} Mudra Gold</p>
        <button class="btn-gold-action" onclick="event.stopPropagation(); initiateBooking(${p.id})">Book Now</button>
        <button class="btn-gold-action" style="background:#444; color:#fff" onclick="event.stopPropagation()">Tray</button>
      </div>
    `;
  });
}

// TURN 1 Analytics and inspection functions
function startInspectingProduct(id) {
  if (activeInspectedProduct !== null) recordTimeSpent(activeInspectedProduct);
  activeInspectedProduct = id;
  inspectionStartTime = Date.now();
}

function recordTimeSpent(id) {
  if (inspectionStartTime) {
    const elapsed = Math.round((Date.now() - inspectionStartTime) / 1000);
    logDeveloperEvent(`ANALYTICS: Member ${currentUser.memberId} spent ${elapsed}s on Product ${id}`);
  }
}

// HD Image View from TURN 1 - modified to open image modal
function openHDView(imgSrc, title, price, id, mudra) {
  startInspectingProduct(id);
  pendingBookingProduct = products.find(p => p.id === id); // used for booking reference
  document.getElementById('hdModalImage').src = imgSrc;
  document.getElementById('hdModalTitle').innerText = title;
  document.getElementById('hdModalPrice').innerText = `₹${price.toLocaleString()}`;
  document.getElementById('hdModalMudra').innerText = `Reward: ${mudra} Mudra Gold`;
  document.getElementById('modalBookBtn').onclick = () => initiateBooking(id); // booking button reference
  document.getElementById('imageModal').style.display = 'flex';
}

function closeImageModal() {
  if (activeInspectedProduct !== null) {
    recordTimeSpent(activeInspectedProduct);
    activeInspectedProduct = null;
  }
  document.getElementById('imageModal').style.display = 'none';
}

function toggleWishlist(id) {
  const index = currentUser.wishlist.indexOf(id);
  if (index === -1) {
    currentUser.wishlist.push(id);
  } else {
    currentUser.wishlist.splice(index, 1);
  }
  displayProducts(products); // re-render to update icon color
}

// Booking Checkout functions from TURN 1 fix
function initiateBooking(id) {
  closeImageModal(); // close image modal if booking from there
  pendingBookingProduct = products.find(p => p.id === id);
  document.getElementById('checkoutProdName').innerText = pendingBookingProduct.name;
  document.getElementById('checkoutProdPrice').innerText = `₹${pendingBookingProduct.price.toLocaleString()}`;
  document.getElementById('checkoutMudraCredit').innerText = pendingBookingProduct.mudraReward / 2;
  
  document.getElementById('checkoutStep1').style.display = 'block';
  document.getElementById('checkoutStep2').style.display = 'none';
  document.getElementById('bookingCheckoutModal').style.display = 'flex';
}

function executeSureBooking() {
  const halfReward = pendingBookingProduct.mudraReward / 2;
  currentUser.mudraGold += halfReward;
  
  // Dummy order object for Turn 1 structure
  const newOrder = {
    orderId: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
    productName: pendingBookingProduct.name,
    price: pendingBookingProduct.price,
    status: 'Pending Confirmation'
  };
  currentUser.orders.push(newOrder);

  // Re-render display if needed or just confirmation, matching image flow
  document.getElementById('checkoutStep1').style.display = 'none';
  document.getElementById('checkoutStep2').style.display = 'block';

  logDeveloperEvent(`BOOKING: User ${currentUser.memberId} requested ${pendingBookingProduct.name}. Credit: ${halfReward} Mudra`);
}

function closeCheckoutModal() {
  document.getElementById('bookingCheckoutModal').style.display = 'none';
}

// Developer Analytics Log from TURN 1 fix
function logDeveloperEvent(msg) {
  const time = new Date().toLocaleTimeString();
  developerLogs.unshift(`[${time}] ${msg}`);
  const logContainer = document.getElementById('developerAnalyticsLog');
  if (logContainer) {
    logContainer.innerHTML = developerLogs.map(l => `<div>${l}</div>`).join('');
  }
}

// Sidebar logic adapted for TURN 2 fix structure
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    // mobile slide logic per TURN 2 CSS structure
    sidebar.classList.toggle('active');
  } else {
    // desktop logic from TURN 1 - just show hide, or structure manages it
  }
}

// Category filter adapted for Turn 2 image focus
function filterProducts() {
  const val = document.getElementById('searchInput').value.toLowerCase();
  const filtered = products.filter(p => p.name.toLowerCase().includes(val));
  displayProducts(filtered);
}

function filterCategory(cat) {
  if (cat === 'all') return displayProducts(products);
  const filtered = products.filter(p => p.category === cat);
  displayProducts(filtered);
}

// TURN 1 Live Users simulation
setInterval(() => {
  const liveUsers = Math.floor(Math.random() * (160 - 110 + 1)) + 110;
  document.getElementById('live-users').innerText = liveUsers;
}, 3000);

// TURN 1 3D logic
function open3D() {
  document.getElementById('3dModal').style.display = 'flex';
  const container = document.getElementById('three-container');
  container.innerHTML = '';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, 300);
  container.appendChild(renderer.domElement);

  const geometry = new THREE.TorusGeometry(1, 0.4, 16, 100);
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
