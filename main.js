function switchVendorSubTab(tabKey, event) {
    document.querySelectorAll('.subtab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.vendor-content-tab').forEach(tab => tab.style.display = 'none');

    event.target.classList.add('active');
    document.getElementById('subtab-' + tabKey).style.display = 'block';
}
