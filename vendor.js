/**
 * SUVARNA JEWELS - Dedicated Vendor & Management Portal Logic
 * File: assets/js/vendor.js
 */

// Supabase Initialisation
const SUPABASE_URL = "https://YOUR_SUPABASE_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('SUVARNA Vendor Management Engine Loaded...');
});

/* ----------------------------------------------------
   1. VENDOR TAB SWITCHING LOGIC
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
   2. SKU INVENTORY & UPLOAD WORKFLOW
---------------------------------------------------- */
function openUploadForm() {
    const formCard = document.getElementById('uploadFormCard');
    formCard.style.display = formCard.style.display === 'none' ? 'block' : 'none';
}

async function submitNewSKU() {
    const title = document.getElementById('skuTitle').value;
    const category = document.getElementById('skuCategory').value;
    const purity = document.getElementById('skuPurity').value;
    const weight = document.getElementById('skuWeight').value;
    const makingCharges = document.getElementById('skuMaking').value;

    if (!title || !weight || !makingCharges) {
        alert("Kripya sabhi zaroori details bharein!");
        return;
    }

    if (supabase) {
        const { data, error } = await supabase
            .from('catalogue')
            .insert([
                {
                    title: title,
                    category: category,
                    purity: purity,
                    weight_grams: parseFloat(weight),
                    making_charges: parseFloat(makingCharges),
                    is_approved: false // Requires Admin verification
                }
            ]);

        if (error) {
            alert("Error uploading SKU: " + error.message);
            return;
        }
    }

    alert(`Naya SKU "${title}" safaltapoorvak upload ho gaya hai. Admin approval ke baad ye Live show hoga!`);
    
    // Clear inputs and close form
    document.getElementById('skuTitle').value = '';
    document.getElementById('skuWeight').value = '';
    document.getElementById('skuMaking').value = '';
    openUploadForm();
}
  
