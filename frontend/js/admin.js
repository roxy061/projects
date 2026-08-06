/**
 * Department Project Showcase - Admin Layout Customizer JavaScript
 */

const API_BASE = '/api';

let jwtToken = localStorage.getItem('token') || null;
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let layoutItems = [];

// Drag and drop state
let draggedIndex = null;

document.addEventListener('DOMContentLoaded', () => {
  verifyAdminAccess();
  loadAdminLayout();
});

/**
 * Verify if logged-in user is an Admin
 */
function verifyAdminAccess() {
  if (!jwtToken || !currentUser || currentUser.role !== 'admin') {
    alert('Access Denied: You must be logged in as an Administrator to access this page.');
    window.location.href = 'index.html';
  }
}

/**
 * Fetch Layout Structure from API
 */
async function loadAdminLayout() {
  try {
    const res = await fetch(`${API_BASE}/layout`);
    const data = await res.json();

    if (data.success && Array.isArray(data.layout)) {
      layoutItems = data.layout;
      renderDragList();
      updateJsonPreview();
    }
  } catch (error) {
    console.error('Error loading layout:', error);
    showToast('Failed to load layout from backend', 'error');
  }
}

/**
 * Render Drag and Drop List Items
 */
function renderDragList() {
  const container = document.getElementById('drag-container');
  container.innerHTML = '';

  layoutItems.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = `draggable-item glass-card p-4 rounded-xl border ${item.enabled ? 'border-slate-700/80 bg-slate-900/60' : 'border-slate-800/40 bg-slate-950/40 opacity-60'} flex items-center justify-between gap-4`;
    card.draggable = true;
    card.dataset.index = index;

    card.innerHTML = `
      <div class="flex items-center space-x-3 cursor-grab">
        <i class="fa-solid fa-grip-vertical text-slate-500 text-base"></i>
        <span class="w-6 h-6 rounded-md bg-indigo-950 text-indigo-300 font-mono text-xs flex items-center justify-center font-bold">
          ${index + 1}
        </span>
        <div>
          <h4 class="text-sm font-semibold text-white flex items-center gap-2">
            ${escapeHtml(item.name)}
            <span class="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">id: ${escapeHtml(item.id)}</span>
          </h4>
          ${item.title ? `<p class="text-xs text-slate-400 font-light truncate max-w-md">${escapeHtml(item.title)}</p>` : ''}
        </div>
      </div>

      <div class="flex items-center space-x-3">
        ${item.id === 'hero' ? `
          <button onclick="editHeroSettings(${index})" class="text-xs bg-slate-800 hover:bg-slate-700 text-indigo-300 px-2.5 py-1 rounded border border-slate-700 transition" title="แก้ไขข้อความ">
            <i class="fa-solid fa-gear mr-1"></i> ตั้งค่าข้อความ
          </button>
        ` : ''}

        <!-- Toggle Switch -->
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" ${item.enabled ? 'checked' : ''} onchange="toggleSectionState(${index})" class="sr-only peer">
          <div class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
        </label>
      </div>
    `;

    // Attach Drag & Drop Events
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('dragleave', handleDragLeave);
    card.addEventListener('drop', handleDrop);
    card.addEventListener('dragend', handleDragEnd);

    container.appendChild(card);
  });

  updateJsonPreview();
}

/**
 * Drag & Drop Event Handlers
 */
function handleDragStart(e) {
  draggedIndex = parseInt(this.dataset.index, 10);
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  this.classList.add('drag-over');
}

function handleDragLeave() {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');

  const targetIndex = parseInt(this.dataset.index, 10);
  if (draggedIndex === null || draggedIndex === targetIndex) return;

  // Re-order layoutItems array
  const draggedItem = layoutItems.splice(draggedIndex, 1)[0];
  layoutItems.splice(targetIndex, 0, draggedItem);

  renderDragList();
  showToast('สลับลำดับ Section เรียบร้อยแล้ว (อย่าลืมกดบันทึก)', 'info');
}

function handleDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.draggable-item').forEach(item => {
    item.classList.remove('drag-over');
  });
  draggedIndex = null;
}

/**
 * Toggle Section Enable/Disable
 */
function toggleSectionState(index) {
  layoutItems[index].enabled = !layoutItems[index].enabled;
  renderDragList();
}

/**
 * Edit Hero Title/Subtitle Settings
 */
function editHeroSettings(index) {
  const currentTitle = layoutItems[index].title || 'Department Project Showcase';
  const currentSubtitle = layoutItems[index].subtitle || '';

  const newTitle = prompt('ระบุ Title สำหรับ Hero Section:', currentTitle);
  if (newTitle === null) return;

  const newSubtitle = prompt('ระบุ Subtitle สำหรับ Hero Section:', currentSubtitle);
  if (newSubtitle === null) return;

  layoutItems[index].title = newTitle;
  layoutItems[index].subtitle = newSubtitle;

  renderDragList();
  showToast('ปรับแต่งข้อความ Hero เรียบร้อย', 'success');
}

/**
 * Save Layout Configuration via PUT /api/layout
 */
async function saveLayoutConfiguration() {
  try {
    const res = await fetch(`${API_BASE}/layout`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ structure: layoutItems })
    });

    const data = await res.json();

    if (data.success) {
      showToast('บันทึกลำดับ Layout ลงฐานข้อมูลเรียบร้อยแล้ว!', 'success');
      updateJsonPreview();
    } else {
      showToast(data.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
    }
  } catch (error) {
    console.error('Error saving layout:', error);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
  }
}

/**
 * Update JSON Live Preview Box
 */
function updateJsonPreview() {
  const preview = document.getElementById('json-preview');
  if (preview) {
    preview.textContent = JSON.stringify(layoutItems, null, 2);
  }
}

/**
 * Admin Logout
 */
function handleAdminLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

/**
 * Toast Utility
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  let bgClass = 'bg-slate-900 border-slate-700 text-slate-200';
  let iconClass = 'fa-circle-info text-cyan-400';

  if (type === 'success') {
    bgClass = 'bg-slate-900 border-emerald-500/40 text-emerald-300';
    iconClass = 'fa-circle-check text-emerald-400';
  } else if (type === 'error') {
    bgClass = 'bg-slate-900 border-rose-500/40 text-rose-300';
    iconClass = 'fa-triangle-exclamation text-rose-400';
  }

  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl border ${bgClass} shadow-xl text-xs font-medium backdrop-blur transition transform translate-y-2 duration-300`;
  toast.innerHTML = `<i class="fa-solid ${iconClass} text-sm"></i> <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0', '-translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
