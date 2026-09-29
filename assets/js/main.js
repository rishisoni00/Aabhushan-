/**
 * SUVARNA JEWELS - Integrated Main Logic
 * File: assets/js/main.js
 */

// Supabase Connection Configuration
const SUPABASE_URL = "https://YOUR_SUPABASE_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('SUVARNA Mobile Application Ready...');
});

/* ----------------------------------------------------
   1. NAVIGATION & TAB SWITCHING
---------------------------------------------------- */
function switchVendorSubTab(tabKey, event) {
    const buttons = document.querySelectorAll('.subtab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    const tabs = document.querySelectorAll('.vendor-content-tab');
    tabs.forEach(tab => tab.style.display = 'none');

    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    const activeTab = document.getElementById('subtab-' + tabKey);
    if (activeTab) {
        activeTab.style.display = 'block';
    }
}

function triggerAction(message) {
    alert(message);
}

/* ----------------------------------------------------
   2. CUSTOMER ACCOUNT CREATION LOGIC
---------------------------------------------------- */
function openSignupModal() {
    document.getElementById('signupModal').style.display = 'block';
}

function closeSignupModal() {
    document.getElementById('signupModal').style.display = 'none';
}

async function handleCustomerRegistration() {
    const fullName = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPass').value;

    if (!fullName || !email || !phone || !password) {
        alert("Kripya sabhi details ko bharein.");
        return;
    }

    if (supabase) {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { full_name: fullName, phone: phone, role: 'CUSTOMER' }
            }
        });

        if (error) {
            alert("Error: " + error.message);
            return;
        }
    }

    alert(`Dhanyawad ${fullName}! Aapka SUVARNA Account safaltapoorvak ban gaya hai.`);
    closeSignupModal();
}

/* ----------------------------------------------------
   3. PURCHASING & PRICE CALCULATION LOGIC
---------------------------------------------------- */
function calculateCheckoutPrice(weightGrams, purity, makingCharge) {
    const goldRate22K = 6500; // Live Rate per Gram
    const goldRate18K = 5400;

    let baseGoldRate = (purity === '18K') ? goldRate18K : goldRate22K;
    
    const totalGoldCost = weightGrams * baseGoldRate;
    const goldGST = totalGoldCost * 0.03;         // 3% GST on Gold
    const makingChargeGST = makingCharge * 0.05;  // 5% GST on Making Charges
    const transitInsurance = 150;

    const grandTotal = totalGoldCost + makingCharge + goldGST + makingChargeGST + transitInsurance;

    return {
        grandTotal: Math.round(grandTotal),
        tokenAmount: Math.round(grandTotal * 0.10) // 10% Reserve Fee
    };
}

function initiateJewelleryPurchase(skuId, purchaseType) {
    // Example Weight & Making charge lookup
    const bill = calculateCheckoutPrice(10.0, '22K', 3000); 
    const payableAmount = (purchaseType === 'TOKEN') ? bill.tokenAmount : bill.grandTotal;

    if (window.Razorpay) {
        const options = {
            "key": "YOUR_RAZORPAY_KEY", 
            "amount": payableAmount * 100, 
            "currency": "INR",
            "name": "SUVARNA Jewels",
            "description": `Payment for SKU ${skuId} (${purchaseType} Mode)`,
            "handler": function (response) {
                alert(`Order Success! Payment ID: ${response.razorpay_payment_id}`);
            },
            "theme": { "color": "#4A0E17" }
        };
        const rzp = new Razorpay(options);
        rzp.open();
    } else {
        alert(`Payment Gateway Demo Mode:\n Payable Amount: ₹${payableAmount.toLocaleString('en-IN')}\n (Type: ${purchaseType})`);
    }
      }
