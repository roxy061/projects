// assets/js/app.js - Frontend Logic for Department Project Storage System

let currentUser = null;
let allProjects = [];
let activeCategory = 'All';

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    fetchProjects();

    // Event Listeners
    document.getElementById('search-input')?.addEventListener('input', filterProjects);
    
    // Category tabs click
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
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
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';

    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Escaping HTML helper for security
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

// -------------------------------------------------------------
// 1. Auth & Session Management
// -------------------------------------------------------------
async function checkSession() {
    try {
        const res = await fetch('api/auth.php?action=me');
        const data = await res.json();
        
        if (data.authenticated && data.user) {
            currentUser = data.user;
            renderAuthUI(true);
        } else {
            currentUser = null;
            renderAuthUI(false);
        }
    } catch (err) {
        console.error('Session check error:', err);
    }
}

function renderAuthUI(isLoggedIn) {
    const authNav = document.getElementById('auth-nav-container');
    if (!authNav) return;

    if (isLoggedIn) {
        authNav.innerHTML = `
            <div class="user-badge">
                <i class="fas fa-user-circle"></i>
                <span>${escapeHtml(currentUser.full_name)}</span>
            </div>
            <button onclick="openProjectModal()" class="btn btn-primary btn-sm">
                <i class="fas fa-plus"></i> เพิ่มโปรเจกต์
            </button>
            <button onclick="handleLogout()" class="btn btn-secondary btn-sm">
                <i class="fas fa-sign-out-alt"></i> ออกจากระบบ
            </button>
        `;
    } else {
        authNav.innerHTML = `
            <button onclick="openAuthModal('login')" class="btn btn-secondary btn-sm">
                <i class="fas fa-sign-in-alt"></i> เข้าสู่ระบบ
            </button>
            <button onclick="openAuthModal('register')" class="btn btn-primary btn-sm">
                <i class="fas fa-user-plus"></i> สมัครสมาชิก
            </button>
        `;
    }
    // Re-render project cards to update Edit/Delete buttons ownership
    renderProjects(allProjects);
}

async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        username: form.username.value,
        password: form.password.value
    };

    try {
        const res = await fetch('api/auth.php?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();

        if (res.ok && result.success) {
            currentUser = result.user;
            renderAuthUI(true);
            closeModal('auth-modal');
            showToast('เข้าสู่ระบบสำเร็จแล้ว!', 'success');
            fetchProjects();
        } else {
            showToast(result.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ', 'error');
        }
    } catch (err) {
        showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        username: form.username.value,
        email: form.email.value,
        password: form.password.value,
        full_name: form.full_name.value,
        department: form.department.value
    };

    try {
        const res = await fetch('api/auth.php?action=register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();

        if (res.ok && result.success) {
            currentUser = result.user;
            renderAuthUI(true);
            closeModal('auth-modal');
            showToast('สมัครสมาชิกและเข้าสู่ระบบเรียบร้อย!', 'success');
            fetchProjects();
        } else {
            showToast(result.error || 'ไม่สามารถสมัครสมาชิกได้', 'error');
        }
    } catch (err) {
        showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    }
}

async function handleLogout() {
    try {
        await fetch('api/auth.php?action=logout');
        currentUser = null;
        renderAuthUI(false);
        showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
        fetchProjects();
    } catch (err) {
        showToast('เกิดข้อผิดพลาดในการออกจากระบบ', 'error');
    }
}

// -------------------------------------------------------------
// 2. Fetch & Render Projects
// -------------------------------------------------------------
async function fetchProjects() {
    try {
        const res = await fetch('api/projects.php');
        const data = await res.json();
        if (data.success) {
            allProjects = data.projects;
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
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>ไม่พบรายการโปรเจกต์</h3>
                <p>ยังไม่มีโปรเจกต์ในหมวดหมู่นี้ หรือลองค้นหาด้วยคำอื่น</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = projects.map(p => {
        const isOwner = currentUser && parseInt(currentUser.id) === parseInt(p.user_id);
        const tags = p.tech_stack.split(',').map(t => `<span class="tech-tag">${escapeHtml(t.trim())}</span>`).join('');
        const authorInitial = p.author_name ? p.author_name.charAt(0).toUpperCase() : 'U';

        return `
            <div class="project-card">
                <div class="card-img-wrapper" onclick="openDetailModal(${p.id})">
                    <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title)}" class="card-img" onerror="this.src='https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=60'">
                    <span class="category-badge">${escapeHtml(p.category)}</span>
                </div>
                <div class="card-body">
                    <h3 class="card-title" onclick="openDetailModal(${p.id})" style="cursor:pointer;">${escapeHtml(p.title)}</h3>
                    <p class="card-desc">${escapeHtml(p.description)}</p>
                    <div class="tech-tags">${tags}</div>
                    
                    <div class="card-footer">
                        <div class="author-info">
                            <div class="author-avatar">${authorInitial}</div>
                            <div>
                                <div style="font-weight:600; color:#fff;">${escapeHtml(p.author_name)}</div>
                                <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(p.author_department)}</div>
                            </div>
                        </div>

                        <div class="card-actions">
                            <button onclick="openDetailModal(${p.id})" class="btn btn-secondary btn-sm" title="ดูรายละเอียด">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${isOwner ? `
                                <button onclick="openProjectModal(${p.id})" class="btn btn-secondary btn-sm" title="แก้ไขโปรเจกต์" style="color:#a855f7;">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="confirmDeleteProject(${p.id})" class="btn btn-danger btn-sm" title="ลบโปรเจกต์">
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
// 3. Project CRUD Handlers (With Authorization Guard Verification)
// -------------------------------------------------------------
function openProjectModal(projectId = null) {
    if (!currentUser) {
        showToast('กรุณาเข้าสู่ระบบก่อนทำการจัดการโปรเจกต์', 'error');
        openAuthModal('login');
        return;
    }

    const modal = document.getElementById('project-modal');
    const form = document.getElementById('project-form');
    const titleElem = document.getElementById('project-modal-title');

    form.reset();

    if (projectId) {
        const project = allProjects.find(p => parseInt(p.id) === parseInt(projectId));
        if (project) {
            titleElem.textContent = 'แก้ไขโปรเจกต์ของคุณ';
            form.project_id.value = project.id;
            form.title.value = project.title;
            form.description.value = project.description;
            form.category.value = project.category;
            form.tech_stack.value = project.tech_stack;
            form.github_url.value = project.github_url || '';
            form.demo_url.value = project.demo_url || '';
            form.image_url.value = project.image_url || '';
        }
    } else {
        titleElem.textContent = 'อัปโหลด / แชร์โปรเจกต์ใหม่';
        form.project_id.value = '';
    }

    openModal('project-modal');
}

async function handleProjectSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const projectId = form.project_id.value;

    const data = {
        title: form.title.value,
        description: form.description.value,
        category: form.category.value,
        tech_stack: form.tech_stack.value,
        github_url: form.github_url.value,
        demo_url: form.demo_url.value,
        image_url: form.image_url.value
    };

    const url = projectId ? `api/projects.php?action=update&id=${projectId}` : 'api/projects.php';
    const method = 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (res.ok && result.success) {
            showToast(result.message || 'บันทึกโปรเจกต์เรียบร้อยแล้ว', 'success');
            closeModal('project-modal');
            fetchProjects();
        } else {
            // Check for strict authorization error (403 Forbidden)
            if (res.status === 403) {
                showToast(`[Security Alert] ${result.error}`, 'error');
            } else {
                showToast(result.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
            }
        }
    } catch (err) {
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย', 'error');
    }
}

async function confirmDeleteProject(projectId) {
    const project = allProjects.find(p => parseInt(p.id) === parseInt(projectId));
    if (!project) return;

    if (!confirm(`คุณต้องการลบโปรเจกต์ "${project.title}" ใช่หรือไม่?`)) {
        return;
    }

    try {
        const res = await fetch(`api/projects.php?action=delete&id=${projectId}`, {
            method: 'POST'
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

    const modal = document.getElementById('detail-modal');
    const body = document.getElementById('detail-modal-body');

    const tags = project.tech_stack.split(',').map(t => `<span class="tech-tag">${escapeHtml(t.trim())}</span>`).join('');

    body.innerHTML = `
        <div style="width:100%; height:240px; border-radius:12px; overflow:hidden; margin-bottom:1.25rem;">
            <img src="${escapeHtml(project.image_url)}" style="width:100%; height:100%; object-fit:cover;">
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <span class="category-badge" style="position:static;">${escapeHtml(project.category)}</span>
            <span style="font-size:0.85rem; color:var(--text-muted);">
                <i class="far fa-calendar-alt"></i> ${new Date(project.created_at).toLocaleDateString('th-TH')}
            </span>
        </div>
        <h2 style="font-size:1.6rem; color:#fff; margin-bottom:1rem;">${escapeHtml(project.title)}</h2>
        
        <p style="color:var(--text-sub); font-size:0.98rem; white-space:pre-line; margin-bottom:1.5rem;">
            ${escapeHtml(project.description)}
        </p>

        <div style="margin-bottom:1.5rem;">
            <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.4rem;">เทคโนโลยีที่ใช้งาน (Tech Stack):</div>
            <div class="tech-tags">${tags}</div>
        </div>

        <div style="background:rgba(15, 23, 42, 0.6); padding:1rem; border-radius:10px; border:1px solid var(--border-glass); margin-bottom:1.5rem; display:flex; align-items:center; gap:0.75rem;">
            <div class="author-avatar" style="width:36px; height:36px; font-size:1rem;">
                ${project.author_name ? project.author_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
                <div style="font-weight:700; color:#fff;">ผู้สร้างสรรค์: ${escapeHtml(project.author_name)}</div>
                <div style="font-size:0.82rem; color:var(--text-muted);">${escapeHtml(project.author_department)}</div>
            </div>
        </div>

        <div style="display:flex; gap:0.75rem; justify-content:flex-end;">
            ${project.github_url ? `
                <a href="${escapeHtml(project.github_url)}" target="_blank" class="btn btn-secondary">
                    <i class="fab fa-github"></i> Repository
                </a>
            ` : ''}
            ${project.demo_url ? `
                <a href="${escapeHtml(project.demo_url)}" target="_blank" class="btn btn-primary">
                    <i class="fas fa-external-link-alt"></i> ทดลองใช้งาน Live Demo
                </a>
            ` : ''}
        </div>
    `;

    openModal('detail-modal');
}

// -------------------------------------------------------------
// 4. Modal Open/Close Controls
// -------------------------------------------------------------
function openModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
}

function openAuthModal(tab = 'login') {
    const modal = document.getElementById('auth-modal');
    const loginForm = document.getElementById('login-form-container');
    const regForm = document.getElementById('register-form-container');
    const title = document.getElementById('auth-modal-title');

    if (tab === 'login') {
        title.textContent = 'เข้าสู่ระบบสมาชิก';
        loginForm.style.display = 'block';
        regForm.style.display = 'none';
    } else {
        title.textContent = 'สมัครสมาชิกใหม่';
        loginForm.style.display = 'none';
        regForm.style.display = 'block';
    }

    openModal('auth-modal');
}
