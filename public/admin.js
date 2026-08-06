// public/admin.js - HTML5 Drag & Drop Engine for Admin Layout Customizer

let layoutConfig = [];

document.addEventListener('DOMContentLoaded', () => {
    verifyAdminSession();
});

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    let borderClass = type === 'success' ? 'border-emerald-500' : (type === 'error' ? 'border-rose-500' : 'border-indigo-500');
    let icon = type === 'success' ? 'fa-check-circle text-emerald-400' : (type === 'error' ? 'fa-exclamation-circle text-rose-400' : 'fa-info-circle text-indigo-400');

    toast.className = `flex items-center gap-3 px-4 py-3 bg-slate-900/95 border-l-4 ${borderClass} border-slate-700/80 rounded-xl text-slate-100 text-sm shadow-2xl transition duration-300 min-w-[280px]`;
    toast.innerHTML = `<i class="fas ${icon} text-lg"></i> <span class="flex-1">${escapeHtml(message)}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

function getToken() {
    return localStorage.getItem('token');
}

// 1. Verify Admin Permissions
async function verifyAdminSession() {
    const token = getToken();
    if (!token) {
        showAccessDenied();
        return;
    }

    try {
        const res = await fetch('/api/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok && data.authenticated && data.user.role === 'admin') {
            document.getElementById('admin-panel').classList.remove('hidden');
            document.getElementById('access-denied').classList.add('hidden');
            fetchLayoutConfig();
        } else {
            showAccessDenied();
        }
    } catch (err) {
        showAccessDenied();
    }
}

function showAccessDenied() {
    document.getElementById('admin-panel').classList.add('hidden');
    document.getElementById('access-denied').classList.remove('hidden');
}

function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}

// 2. Fetch Layout Config
async function fetchLayoutConfig() {
    try {
        const res = await fetch('/api/settings/layout');
        const data = await res.json();
        if (data.success && data.layout) {
            layoutConfig = data.layout;
            renderDragList();
        }
    } catch (err) {
        showToast('ไม่สามารถดึงข้อมูลเลย์เอาต์ได้', 'error');
    }
}

// 3. Render Drag-and-Drop UI Cards
function renderDragList() {
    const listElem = document.getElementById('layout-items-list');
    if (!listElem) return;

    listElem.innerHTML = layoutConfig.map((item, index) => `
        <div class="drag-item glass-panel p-4 rounded-xl flex items-center justify-between gap-4 border border-slate-800 hover:border-indigo-500/50"
             draggable="true"
             data-index="${index}">
            <div class="flex items-center gap-3">
                <div class="p-2 text-slate-500 hover:text-indigo-400 text-lg">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <div class="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center">
                    #${index + 1}
                </div>
                <div>
                    <h4 class="font-bold text-white text-sm">${escapeHtml(item.name)}</h4>
                    <span class="text-xs text-slate-400 font-mono">ID: ${escapeHtml(item.id)}</span>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" ${item.enabled ? 'checked' : ''} onchange="toggleSectionEnable(${index})" class="sr-only peer">
                    <div class="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
            </div>
        </div>
    `).join('');

    initDragAndDropListeners();
}

function toggleSectionEnable(index) {
    layoutConfig[index].enabled = !layoutConfig[index].enabled;
    showToast(`อัปเดตสถานะ ${layoutConfig[index].name} เรียบร้อยแล้ว`, 'info');
}

// 4. HTML5 Drag & Drop Event Listeners Setup
function initDragAndDropListeners() {
    const draggables = document.querySelectorAll('.drag-item');
    const container = document.getElementById('layout-items-list');

    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', (e) => {
            draggable.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggable.dataset.index);
        });

        draggable.addEventListener('dragend', () => {
            draggable.classList.remove('dragging');
            reorderConfigArray();
        });
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        const dragging = document.querySelector('.dragging');
        if (!dragging) return;

        if (afterElement == null) {
            container.appendChild(dragging);
        } else {
            container.insertBefore(dragging, afterElement);
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.drag-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function reorderConfigArray() {
    const listItems = document.querySelectorAll('.drag-item');
    const newConfig = [];

    listItems.forEach(item => {
        const oldIndex = parseInt(item.dataset.index);
        newConfig.push(layoutConfig[oldIndex]);
    });

    layoutConfig = newConfig;
    renderDragList();
}

// 5. Save Layout Config to Backend API
async function saveLayoutConfig() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch('/api/settings/layout', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ layout: layoutConfig })
        });

        const result = await res.json();

        if (res.ok && result.success) {
            showToast('บันทึกโครงสร้างหน้าเว็บสำเร็จแล้ว! ผู้ใช้ทุกคนจะเห็นโครงสร้างใหม่ทันที', 'success');
        } else {
            showToast(result.error || 'เกิดข้อผิดพลาดในการบันทึกเลย์เอาต์', 'error');
        }
    } catch (err) {
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}
