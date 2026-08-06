// public/app.js - Frontend SPA Logic with Dynamic Layout Engine

let currentUser = null;
let allProjects = [];
let activeCategory = 'All';

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    fetchLayoutAndApply();
    fetchProjects();

    document.getElementById('search-input')?.addEventListener('input', filterProjects);
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => {
                b.classList.remove('active', 'bg-indigo-600', 'text-white', 'shadow-lg');
                b.classList.add('bg-slate-800/70', 'text-slate-300');
            });
            btn.classList.add('active', 'bg-indigo-600', 'text-white', 'shadow-lg');
            btn.classList.remove('bg-slate-800/70', 'text-slate-300');
            activeCategory = btn.dataset.category || 'All';
            filterProjects();
        });
    });
});

// Toast notification helper
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

// -------------------------------------------------------------
// 1. Dynamic Layout Customizer Fetch & Engine
// -------------------------------------------------------------
async function fetchLayoutAndApply() {
    try {
        const res = await fetch('/api/settings/layout');
        const data = await res.json();
        if (data.success && data.layout) {
            applyDynamicLayout(data.layout);
        }
    } catch (err) {
        console.error('Layout fetch error:', err);
    }
}

function applyDynamicLayout(layoutArray) {
    const container = document.getElementById('dynamic-main-container');
    if (!container) return;

    layoutArray.forEach(item => {
        const sectionElem = document.getElementById(`section-${item.id}`);
        if (sectionElem) {
            if (item.enabled) {
                sectionElem.style.display = '';
                container.appendChild(sectionElem); // Reorders DOM element
            } else {
                sectionElem.style.display = 'none';
            }
        }
    });
}

// -------------------------------------------------------------
// 2. Auth & Session Management
// -------------------------------------------------------------
async function checkSession() {
    const token = getToken();
    if (!token) {
        currentUser = null;
        renderAuthNav();
        return;
    }

    try {
        const res = await fetch('/api/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok && data.authenticated) {
            currentUser = data.user;
        } else {
            localStorage.removeItem('token');
            currentUser = null;
        }
    } catch (err) {
        currentUser = null;
    }
    renderAuthNav();
}

function renderAuthNav() {
    const nav = document.getElementById('auth-nav');
    if (!nav) return;

    if (currentUser) {
        const isAdmin = currentUser.role === 'admin';
        nav.innerHTML = `
            ${isAdmin ? `
                <a href="/admin.html" class="px-3 py-1.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold rounded-xl text-xs flex items-center gap-1.5 hover:bg-purple-500/30 transition">
                    <i class="fas fa-[#a855f7] fa-sliders"></i> Admin Layout Panel
                </a>
            ` : ''}
            <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-full text-xs text-slate-200">
                <i class="fas fa-user-circle text-indigo-400 text-sm"></i>
                <span class="font-semibold">${escapeHtml(currentUser.full_name)}</span>
            </div>
            <button onclick="openProjectModal()" class="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md transition flex items-center gap-1.5">
                <i class="fas fa-plus"></i> <span>เพิ่มโปรเจกต์</span>
            </button>
            <button onclick="handleLogout()" class="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs sm:text-sm transition" title="ออกจากระบบ">
                <i class="fas fa-sign-out-alt"></i>
            </button>
        `;
    } else {
        nav.innerHTML = `
            <button onclick="openAuthModal('login')" class="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs sm:text-sm transition">
                เข้าสู่ระบบ
            </button>
            <button onclick="openAuthModal('register')" class="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md transition">
                สมัครสมาชิก
            </button>
        `;
    }
    renderProjects(allProjects);
}

async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const data = { username: form.username.value, password: form.password.value };

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();

        if (res.ok && result.success) {
            localStorage.setItem('token', result.token);
            currentUser = result.user;
            renderAuthNav();
            closeModal('auth-modal');
            showToast('เข้าสู่ระบบสำเร็จแล้ว!', 'success');
            fetchProjects();
        } else {
            showToast(result.error || 'การเข้าสู่ระบบล้มเหลว', 'error');
        }
    } catch (err) {
        showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        full_name: form.full_name.value,
        username: form.username.value,
        email: form.email.value,
        department: form.department.value,
        password: form.password.value
    };

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();

        if (res.ok && result.success) {
            localStorage.setItem('token', result.token);
            currentUser = result.user;
            renderAuthNav();
            closeModal('auth-modal');
            showToast('สมัครสมาชิกสำเร็จแล้ว!', 'success');
            fetchProjects();
        } else {
            showToast(result.error || 'ไม่สามารถสมัครสมาชิกได้', 'error');
        }
    } catch (err) {
        showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    currentUser = null;
    renderAuthNav();
    showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
    fetchProjects();
}

// -------------------------------------------------------------
// 3. Fetch & Render Projects
// -------------------------------------------------------------
async function fetchProjects() {
    try {
        const res = await fetch('/api/projects');
        const data = await res.json();
        if (data.success) {
            allProjects = data.projects;
            
            const totalStat = document.getElementById('stat-total-projects');
            if (totalStat) totalStat.textContent = allProjects.length;

            filterProjects();
        }
    } catch (err) {
        console.error('Fetch projects error:', err);
    }
}

function filterProjects() {
    const searchVal = document.getElementById('search-input')?.value.toLowerCase().trim() || '';

    const filtered = allProjects.filter(p => {
        const matchesCategory = (activeCategory === 'All' || p.category === activeCategory);
        const matchesSearch = !searchVal || 
            p.title.toLowerCase().includes(searchVal) ||
            p.description.toLowerCase().includes(searchVal) ||
            p.tech_stack.toLowerCase().includes(searchVal) ||
            p.author_name.toLowerCase().includes(searchVal);
            
        return matchesCategory && matchesSearch;
    });

    renderProjects(filtered);
}

function renderProjects(projects) {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    if (projects.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-16 text-slate-400">
                <i class="fas fa-folder-open text-5xl text-slate-700 mb-3"></i>
                <h3 class="text-lg font-semibold text-slate-300">ไม่พบรายการโปรเจกต์</h3>
                <p class="text-xs text-slate-400">ยังไม่มีโปรเจกต์ในหมวดหมู่นี้ หรือลองค้นหาด้วยคำอื่น</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = projects.map(p => {
        const isOwner = currentUser && (parseInt(currentUser.id) === parseInt(p.user_id) || currentUser.role === 'admin');
        const tags = p.tech_stack.split(',').map(t => `<span class="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] rounded font-medium">${escapeHtml(t.trim())}</span>`).join('');
        const authorInitial = p.author_name ? p.author_name.charAt(0).toUpperCase() : 'U';

        return `
            <div class="glass-panel rounded-2xl overflow-hidden flex flex-col hover:-translate-y-1.5 hover:border-indigo-500/40 transition duration-300 group shadow-xl">
                <div class="relative h-48 bg-slate-950 overflow-hidden cursor-pointer" onclick="openDetailModal(${p.id})">
                    <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title)}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" onerror="this.src='https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=60'">
                    <span class="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-purple-400 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                        ${escapeHtml(p.category)}
                    </span>
                </div>

                <div class="p-5 flex-1 flex flex-col justify-between">
                    <div>
                        <h3 class="text-lg font-bold text-white mb-2 cursor-pointer hover:text-indigo-400 transition" onclick="openDetailModal(${p.id})">
                            ${escapeHtml(p.title)}
                        </h3>
                        <p class="text-slate-400 text-xs line-clamp-3 mb-4 leading-relaxed">
                            ${escapeHtml(p.description)}
                        </p>
                        <div class="flex flex-wrap gap-1.5 mb-4">
                            ${tags}
                        </div>
                    </div>

                    <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center">
                                ${authorInitial}
                            </div>
                            <div class="text-[11px]">
                                <div class="font-semibold text-slate-200">${escapeHtml(p.author_name)}</div>
                                <div class="text-slate-400">${escapeHtml(p.author_department)}</div>
                            </div>
                        </div>

                        <div class="flex gap-1.5">
                            <button onclick="openDetailModal(${p.id})" class="p-2 text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700 rounded-lg text-xs transition" title="ดูรายละเอียด">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${isOwner ? `
                                <button onclick="openProjectModal(${p.id})" class="p-2 text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg text-xs transition" title="แก้ไขโปรเจกต์">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="confirmDeleteProject(${p.id})" class="p-2 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-xs transition" title="ลบโปรเจกต์">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// -------------------------------------------------------------
// 4. Project CRUD Handlers
// -------------------------------------------------------------
function openProjectModal(projectId = null) {
    if (!currentUser) {
        showToast('กรุณาเข้าสู่ระบบก่อนจัดการโปรเจกต์', 'error');
        openAuthModal('login');
        return;
    }

    const form = document.getElementById('project-form');
    const titleElem = document.getElementById('project-modal-title');
    form.reset();

    if (projectId) {
        const project = allProjects.find(p => parseInt(p.id) === parseInt(projectId));
        if (project) {
            titleElem.textContent = 'แก้ไขโปรเจกต์';
            document.getElementById('form-project-id').value = project.id;
            document.getElementById('form-title').value = project.title;
            document.getElementById('form-description').value = project.description;
            document.getElementById('form-category').value = project.category;
            document.getElementById('form-tech-stack').value = project.tech_stack;
            document.getElementById('form-github-url').value = project.github_url || '';
            document.getElementById('form-demo-url').value = project.demo_url || '';
            document.getElementById('form-image-url').value = project.image_url || '';
        }
    } else {
        titleElem.textContent = 'อัปโหลด / แชร์โปรเจกต์ใหม่';
        document.getElementById('form-project-id').value = '';
    }

    openModal('project-modal');
}

async function handleProjectSubmit(e) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;

    const form = e.target;
    const formData = new FormData(form);
    const projectId = formData.get('project_id');

    const url = projectId ? `/api/projects/${projectId}` : '/api/projects';
    const method = projectId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const result = await res.json();

        if (res.ok && result.success) {
            showToast(result.message || 'บันทึกโปรเจกต์เรียบร้อยแล้ว', 'success');
            closeModal('project-modal');
            fetchProjects();
        } else {
            showToast(result.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
        }
    } catch (err) {
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}

async function confirmDeleteProject(projectId) {
    const token = getToken();
    const project = allProjects.find(p => parseInt(p.id) === parseInt(projectId));
    if (!project || !token) return;

    if (!confirm(`คุณต้องการลบโปรเจกต์ "${project.title}" ใช่หรือไม่?`)) return;

    try {
        const res = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();

        if (res.ok && result.success) {
            showToast('ลบโปรเจกต์เรียบร้อยแล้ว', 'success');
            fetchProjects();
        } else {
            showToast(result.error || 'เกิดข้อผิดพลาดในการลบโปรเจกต์', 'error');
        }
    } catch (err) {
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}

function openDetailModal(projectId) {
    const project = allProjects.find(p => parseInt(p.id) === parseInt(projectId));
    if (!project) return;

    const body = document.getElementById('detail-modal-body');
    const tags = project.tech_stack.split(',').map(t => `<span class="px-2.5 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs rounded-md font-medium">${escapeHtml(t.trim())}</span>`).join('');

    body.innerHTML = `
        <div class="w-full h-64 rounded-xl overflow-hidden mb-5 bg-slate-950">
            <img src="${escapeHtml(project.image_url)}" class="w-full h-full object-cover">
        </div>
        <div class="flex justify-between items-center mb-3">
            <span class="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-full text-xs font-semibold">
                ${escapeHtml(project.category)}
            </span>
            <span class="text-xs text-slate-400">
                <i class="far fa-calendar-alt mr-1"></i> ${new Date(project.created_at).toLocaleDateString('th-TH')}
            </span>
        </div>
        <h2 class="text-2xl font-bold text-white mb-4">${escapeHtml(project.title)}</h2>
        
        <p class="text-slate-300 text-sm whitespace-pre-line leading-relaxed mb-6">
            ${escapeHtml(project.description)}
        </p>

        <div class="mb-6">
            <div class="text-xs text-slate-400 mb-2 font-semibold">เทคโนโลยีที่ใช้งาน (Tech Stack):</div>
            <div class="flex flex-wrap gap-2">${tags}</div>
        </div>

        <div class="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-sm flex items-center justify-center">
                ${project.author_name ? project.author_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
                <div class="font-bold text-slate-100 text-sm">ผู้สร้างสรรค์: ${escapeHtml(project.author_name)}</div>
                <div class="text-xs text-slate-400">${escapeHtml(project.author_department)}</div>
            </div>
        </div>

        <div class="flex justify-end gap-3">
            ${project.github_url ? `
                <a href="${escapeHtml(project.github_url)}" target="_blank" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition flex items-center gap-2">
                    <i class="fab fa-github text-sm"></i> Repository
                </a>
            ` : ''}
            ${project.demo_url ? `
                <a href="${escapeHtml(project.demo_url)}" target="_blank" class="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl text-xs shadow-lg transition flex items-center gap-2">
                    <i class="fas fa-external-link-alt"></i> Live Demo
                </a>
            ` : ''}
        </div>
    `;

    openModal('detail-modal');
}

// -------------------------------------------------------------
// 5. Modal Helpers
// -------------------------------------------------------------
function openModal(id) {
    document.getElementById(id)?.classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id)?.classList.add('hidden');
}

function openAuthModal(tab = 'login') {
    toggleAuthTab(tab);
    openModal('auth-modal');
}

function toggleAuthTab(tab) {
    const loginSec = document.getElementById('login-section');
    const regSec = document.getElementById('register-section');

    if (tab === 'login') {
        loginSec.classList.remove('hidden');
        regSec.classList.add('hidden');
    } else {
        loginSec.classList.add('hidden');
        regSec.classList.remove('hidden');
    }
}
