/**
 * ============================================================
 * Department Project Showcase - Frontend Dynamic Logic (SPA)
 * ============================================================
 * Tech: Vanilla JavaScript (ES6+), Fetch API, LocalStorage
 * v2.0 — Stable, Responsive, Touch-Friendly
 */

// ------------------------------------------------------------
// 1. GLOBAL CONFIGURATION & STATE MANAGEMENT
// ------------------------------------------------------------
const API_BASE_URL = '/api';

let currentUser = null;
let authToken = null;
let allProjects = [];
let activeTag = 'All';
let activeDepartment = 'All';
let searchQuery = '';
let myProjectsOnly = false;
let healthCheckInterval = null;
let isDropdownOpen = false;

// ------------------------------------------------------------
// 2. INITIALIZATION ON DOM READY
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  checkBackendHealth();
  fetchProjects();
  setupSearchListeners();
  setupGlobalEventListeners();

  // Health check polling every 20 seconds
  healthCheckInterval = setInterval(checkBackendHealth, 20000);
});

// Global event listeners for closing dropdowns/modals
function setupGlobalEventListeners() {
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('user-dropdown-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      closeUserDropdown();
    }
  });

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const profileModal = document.getElementById('profile-modal');
      const detailModal = document.getElementById('detail-modal');
      const projectModal = document.getElementById('project-modal');
      const authModal = document.getElementById('auth-modal');

      if (profileModal && !profileModal.classList.contains('hidden')) {
        closeProfileModal();
      } else if (detailModal && !detailModal.classList.contains('hidden')) {
        closeDetailModal();
      } else if (projectModal && !projectModal.classList.contains('hidden')) {
        closeProjectModal();
      } else if (authModal && !authModal.classList.contains('hidden')) {
        closeAuthModal();
      }
      closeUserDropdown();
    }
  });

  // Prevent body scroll when modal is open (stability fix for mobile)
  const observer = new MutationObserver(() => {
    const anyModalOpen = ['auth-modal', 'project-modal', 'detail-modal', 'profile-modal'].some(id => {
      const el = document.getElementById(id);
      return el && !el.classList.contains('hidden');
    });
    document.body.style.overflow = anyModalOpen ? 'hidden' : '';
  });

  ['auth-modal', 'project-modal', 'detail-modal', 'profile-modal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el, { attributes: true, attributeFilter: ['class'] });
  });
}

// User Dropdown (Click-based toggle, replaces hover)
function toggleUserDropdown() {
  const menu = document.getElementById('user-dropdown-menu');
  const chevron = document.getElementById('dropdown-chevron');
  if (!menu) return;

  if (isDropdownOpen) {
    closeUserDropdown();
  } else {
    menu.classList.remove('hidden');
    requestAnimationFrame(() => {
      menu.classList.remove('dropdown-enter');
      menu.classList.add('dropdown-active');
    });
    if (chevron) chevron.style.transform = 'rotate(180deg)';
    isDropdownOpen = true;
  }
}

function closeUserDropdown() {
  const menu = document.getElementById('user-dropdown-menu');
  const chevron = document.getElementById('dropdown-chevron');
  if (!menu || !isDropdownOpen) return;

  menu.classList.remove('dropdown-active');
  menu.classList.add('dropdown-enter');
  setTimeout(() => menu.classList.add('hidden'), 180);
  if (chevron) chevron.style.transform = '';
  isDropdownOpen = false;
}

// ------------------------------------------------------------
// 3. AUTHENTICATION & LOCALSTORAGE ENGINE
// ------------------------------------------------------------
function initAuth() {
  const savedToken = localStorage.getItem('showcase_token');
  const savedUser = localStorage.getItem('showcase_user');

  if (savedToken && savedUser) {
    try {
      authToken = savedToken;
      currentUser = JSON.parse(savedUser);
      updateAuthUI();
    } catch (e) {
      console.error('Failed to parse saved user:', e);
      logout();
    }
  } else {
    updateAuthUI();
  }
}

function updateAuthUI() {
  const loggedOutEl = document.getElementById('auth-logged-out');
  const loggedInEl = document.getElementById('auth-logged-in');

  if (!loggedOutEl || !loggedInEl) return;

  if (currentUser && authToken) {
    loggedOutEl.classList.add('hidden');
    loggedInEl.classList.remove('hidden');

    const fullnameEl = document.getElementById('user-fullname');
    const dropdownEl = document.getElementById('dropdown-username');
    if (fullnameEl) fullnameEl.textContent = currentUser.fullname || currentUser.username;
    if (dropdownEl) dropdownEl.textContent = `@${currentUser.username}`;

    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) {
      if (currentUser.avatar) {
        const avatarUrl = currentUser.avatar.startsWith('/') ? `${API_BASE_URL.replace('/api', '')}${currentUser.avatar}` : currentUser.avatar;
        avatarEl.innerHTML = `<img src="${avatarUrl}" class="w-full h-full object-cover rounded-lg" onerror="this.outerHTML='${(currentUser.fullname || currentUser.username).charAt(0).toUpperCase()}'">`;
      } else {
        avatarEl.textContent = (currentUser.fullname || currentUser.username).charAt(0).toUpperCase();
      }
    }

    const roleBadge = document.getElementById('user-role-badge');
    if (roleBadge) {
      roleBadge.textContent = currentUser.role;
      if (currentUser.role === 'admin') {
        roleBadge.className = 'block text-[9px] text-purple-400 font-mono font-bold uppercase tracking-wider leading-none';
      } else {
        roleBadge.className = 'block text-[9px] text-brand-400 font-mono font-bold uppercase tracking-wider leading-none';
      }
    }
  } else {
    loggedOutEl.classList.remove('hidden');
    loggedInEl.classList.add('hidden');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const usernameInput = document.getElementById('login-username').value.trim();
  const passwordInput = document.getElementById('login-password').value;
  const submitBtn = document.getElementById('login-submit-btn');

  if (!usernameInput || !passwordInput) {
    showToast('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', 'error');
    return;
  }

  // Loading state
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-sm"></i><span>กำลังเข้าสู่ระบบ...</span>';
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordInput })
    });

    const result = await response.json();

    if (result.success) {
      authToken = result.token;
      currentUser = result.user;
      localStorage.setItem('showcase_token', authToken);
      localStorage.setItem('showcase_user', JSON.stringify(currentUser));

      updateAuthUI();
      closeAuthModal();
      showToast(`ยินดีต้อนรับคุณ ${currentUser.fullname}!`, 'success');
      fetchProjects();
    } else {
      showToast(result.message || 'เข้าสู่ระบบไม่สำเร็จ', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อเข้าสู่ระบบได้', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>เข้าสู่ระบบ</span>';
    }
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const username = document.getElementById('register-username').value.trim();
  const fullname = document.getElementById('register-fullname').value.trim();
  const password = document.getElementById('register-password').value;
  const submitBtn = document.getElementById('register-submit-btn');

  if (!username || !fullname || !password) {
    showToast('กรุณากรอกข้อมูลให้ครบทุกช่อง', 'error');
    return;
  }

  if (password.length < 6) {
    showToast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'error');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-sm"></i><span>กำลังสมัครสมาชิก...</span>';
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, fullname, password })
    });

    const result = await response.json();

    if (result.success) {
      authToken = result.token;
      currentUser = result.user;
      localStorage.setItem('showcase_token', authToken);
      localStorage.setItem('showcase_user', JSON.stringify(currentUser));

      updateAuthUI();
      closeAuthModal();
      showToast('สมัครสมาชิกสำเร็จและเข้าสู่ระบบเรียบร้อย!', 'success');
      fetchProjects();
    } else {
      showToast(result.message || 'สมัครสมาชิกไม่สำเร็จ', 'error');
    }
  } catch (error) {
    console.error('Register error:', error);
    showToast('เกิดข้อผิดพลาดในการสมัครสมาชิก', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>ยืนยันการสมัครสมาชิก</span>';
    }
  }
}

function logout() {
  currentUser = null;
  authToken = null;
  localStorage.removeItem('showcase_token');
  localStorage.removeItem('showcase_user');
  myProjectsOnly = false;

  updateAuthUI();
  showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
  fetchProjects();
}

// ------------------------------------------------------------
// 4. BACKEND HEALTH CHECK ENGINE
// ------------------------------------------------------------
async function checkBackendHealth() {
  const offlineBanner = document.getElementById('offline-banner');
  if (!offlineBanner) return;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_BASE_URL}/health`, { 
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      offlineBanner.classList.add('hidden');
    } else {
      offlineBanner.classList.remove('hidden');
    }
  } catch (error) {
    offlineBanner.classList.remove('hidden');
  }
}

// ------------------------------------------------------------
// 5. FETCH & RENDER PROJECTS ENGINE
// ------------------------------------------------------------
async function fetchProjects() {
  const gridContainer = document.getElementById('project-grid');
  const emptyState = document.getElementById('empty-state');

  if (!gridContainer) return;

  try {
    let url = `${API_BASE_URL}/projects?`;
    const params = new URLSearchParams();

    if (searchQuery) params.append('q', searchQuery);
    if (activeTag && activeTag !== 'All') params.append('tag', activeTag);
    if (activeDepartment && activeDepartment !== 'All') params.append('department', activeDepartment);

    url += params.toString();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    const result = await response.json();

    if (result.success) {
      allProjects = result.data || [];
      
      let displayProjects = allProjects;
      if (myProjectsOnly && currentUser) {
        displayProjects = allProjects.filter(p => p.user_id === currentUser.id);
      }

      updateOverviewStats(allProjects);
      renderProjectGrid(displayProjects);
    } else {
      showToast('ไม่สามารถดึงข้อมูลโปรเจกต์ได้', 'error');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      showToast('การเชื่อมต่อหมดเวลา กรุณาลองใหม่', 'error');
    } else {
      console.error('Fetch Projects error:', error);
    }
    if (gridContainer) gridContainer.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
  }
}

function renderProjectGrid(projects) {
  const gridContainer = document.getElementById('project-grid');
  const emptyState = document.getElementById('empty-state');

  if (!gridContainer) return;
  gridContainer.innerHTML = '';

  if (projects.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  projects.forEach(project => {
    const isOwnerOrAdmin = currentUser && (currentUser.role === 'admin' || currentUser.id === project.user_id);
    
    const tagList = project.tags ? project.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const tagBadgesHtml = tagList.map(tag => `
      <span class="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20">
        #${escapeHtml(tag)}
      </span>
    `).join('');

    let deptBadgeHtml = '';
    if (project.department) {
      deptBadgeHtml = `<span class="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm whitespace-nowrap">${escapeHtml(project.department)}</span>`;
    }

    const coverUrl = project.cover_image 
      ? (project.cover_image.startsWith('/') ? `${API_BASE_URL.replace('/api', '')}${project.cover_image}` : project.cover_image)
      : 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80';

    const card = document.createElement('div');
    card.className = 'group glass-card glass-card-hover rounded-xl sm:rounded-2xl overflow-hidden flex flex-col justify-between';
    card.innerHTML = `
      <!-- Cover Image -->
      <div class="relative h-40 sm:h-48 w-full overflow-hidden bg-dark-950">
        <img 
          src="${coverUrl}" 
          alt="${escapeHtml(project.title)}" 
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          onerror="this.src='https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80'"
          loading="lazy"
        >
        <div class="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/20 to-transparent"></div>
        
        <!-- Permission Actions (Edit / Delete) -->
        ${isOwnerOrAdmin ? `
          <div class="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 flex items-center gap-1.5 backdrop-blur-md bg-dark-950/80 p-1 rounded-xl border border-white/10 shadow-lg">
            <button 
              onclick="event.stopPropagation(); openProjectModal('edit', ${project.id})" 
              title="แก้ไขโปรเจกต์"
              class="w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white flex items-center justify-center text-xs transition active:scale-90"
            >
              <i class="fa-solid fa-pen text-[10px]"></i>
            </button>
            <button 
              onclick="event.stopPropagation(); deleteProject(${project.id})" 
              title="ลบโปรเจกต์"
              class="w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white flex items-center justify-center text-xs transition active:scale-90"
            >
              <i class="fa-solid fa-trash text-[10px]"></i>
            </button>
          </div>
        ` : ''}
      </div>

      <!-- Card Body -->
      <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 sm:space-y-4">
        <div class="space-y-2 sm:space-y-2.5">
          <!-- Tags -->
          <div class="flex flex-wrap gap-1.5 items-center">
            ${deptBadgeHtml}
            ${tagBadgesHtml || '<span class="text-[10px] font-mono text-slate-500">#General</span>'}
          </div>

          <!-- Title -->
          <h3 class="font-heading text-sm sm:text-base font-bold text-white group-hover:text-brand-400 transition-colors line-clamp-2 sm:line-clamp-1 tracking-tight leading-snug">
            ${escapeHtml(project.title)}
          </h3>

          <!-- Short Description -->
          <p class="text-xs text-slate-400 leading-relaxed line-clamp-2">
            ${escapeHtml(project.short_description)}
          </p>
        </div>

        <!-- Footer Meta & Detail Button -->
        <div class="pt-3 sm:pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <button 
            type="button"
            onclick="event.stopPropagation(); openProfileModal('${escapeHtml(project.author_username || '')}')" 
            class="flex items-center gap-2 group/author text-left focus:outline-none min-w-0"
            title="ดูโปรไฟล์เจ้าของผลงาน"
          >
            <div class="w-6 h-6 rounded-full bg-dark-800 border border-slate-700 text-brand-400 flex items-center justify-center text-[10px] font-bold font-mono overflow-hidden shrink-0">
              ${(project.author_name || 'U').charAt(0).toUpperCase()}
            </div>
            <span class="text-[11px] font-medium text-slate-300 group-hover/author:text-brand-400 transition truncate">
              ${escapeHtml(project.author_name || 'Anonymous')}
            </span>
          </button>

          <button 
            onclick="openDetailModal(${project.id})" 
            class="px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold bg-dark-800 hover:bg-brand-600 text-slate-200 hover:text-white border border-slate-700 hover:border-brand-500 transition-all duration-200 flex items-center gap-1.5 shrink-0 active:scale-95"
          >
            <span>รายละเอียด</span>
            <i class="fa-solid fa-arrow-right text-[10px] text-brand-400"></i>
          </button>
        </div>
      </div>
    `;

    gridContainer.appendChild(card);
  });
}

function updateOverviewStats(projects) {
  const totalEl = document.getElementById('stat-total-projects');
  const tagsEl = document.getElementById('stat-total-tags');
  const authorsEl = document.getElementById('stat-total-authors');

  if (totalEl) totalEl.textContent = projects.length;

  const tagSet = new Set();
  const authorSet = new Set();

  projects.forEach(p => {
    if (p.tags) {
      p.tags.split(',').forEach(t => tagSet.add(t.trim().toLowerCase()));
    }
    if (p.author_name) authorSet.add(p.author_name);
  });

  if (tagsEl) tagsEl.textContent = tagSet.size;
  if (authorsEl) authorsEl.textContent = authorSet.size;
}

// ------------------------------------------------------------
// 6. SEARCH & TAG FILTERING CONTROLLER
// ------------------------------------------------------------
function setupSearchListeners() {
  const searchInput = document.getElementById('search-input');
  const navSearchInput = document.getElementById('nav-search-input');
  const clearBtn = document.getElementById('clear-search-btn');

  let debounceTimer;

  const handleSearch = (val) => {
    searchQuery = val.trim();
    if (searchInput) searchInput.value = searchQuery;
    if (navSearchInput) navSearchInput.value = searchQuery;

    if (clearBtn) {
      if (searchQuery !== '') {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      updateFilterStatusText();
      fetchProjects();
    }, 350);
  };

  if (searchInput) {
    searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
  }
  if (navSearchInput) {
    navSearchInput.addEventListener('input', (e) => handleSearch(e.target.value));
  }
}

function selectTag(tag) {
  activeTag = tag;
  myProjectsOnly = false;

  const tagButtons = document.querySelectorAll('.tag-filter-btn');
  tagButtons.forEach(btn => {
    if (btn.textContent.includes(tag) || (tag === 'All' && btn.textContent.includes('ทั้งหมด'))) {
      btn.className = 'tag-filter-btn active-tag px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap bg-brand-600 text-white shadow-lg shadow-brand-600/30 border border-brand-500';
    } else {
      btn.className = 'tag-filter-btn px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap bg-dark-900 text-slate-400 border border-slate-800 hover:bg-dark-850 hover:text-slate-200';
    }
  });

  updateFilterStatusText();
  fetchProjects();
}

function selectDepartment(dept) {
  activeDepartment = dept;
  myProjectsOnly = false;
  updateFilterStatusText();
  fetchProjects();
}

function clearSearch() {
  searchQuery = '';
  const searchInput = document.getElementById('search-input');
  const navSearchInput = document.getElementById('nav-search-input');
  const clearBtn = document.getElementById('clear-search-btn');

  if (searchInput) searchInput.value = '';
  if (navSearchInput) navSearchInput.value = '';
  if (clearBtn) clearBtn.classList.add('hidden');

  updateFilterStatusText();
  fetchProjects();
}

function filterMyProjects() {
  if (!currentUser) return;
  myProjectsOnly = true;
  activeTag = 'All';
  activeDepartment = 'All';
  searchQuery = '';
  const deptSelect = document.getElementById('department-filter');
  if (deptSelect) deptSelect.value = 'All';
  updateFilterStatusText();
  fetchProjects();
}

function resetFilters() {
  activeTag = 'All';
  activeDepartment = 'All';
  searchQuery = '';
  myProjectsOnly = false;

  const searchInput = document.getElementById('search-input');
  const navSearchInput = document.getElementById('nav-search-input');
  const clearBtn = document.getElementById('clear-search-btn');
  const deptSelect = document.getElementById('department-filter');

  if (searchInput) searchInput.value = '';
  if (navSearchInput) navSearchInput.value = '';
  if (clearBtn) clearBtn.classList.add('hidden');
  if (deptSelect) deptSelect.value = 'All';

  selectTag('All');
}

function updateFilterStatusText() {
  const statusEl = document.getElementById('filter-status');
  const textEl = document.getElementById('filter-status-text');

  if (!statusEl || !textEl) return;

  let parts = [];
  if (myProjectsOnly) parts.push('ผลงานของฉัน');
  if (activeTag && activeTag !== 'All') parts.push(`แท็ก: #${activeTag}`);
  if (activeDepartment && activeDepartment !== 'All') parts.push(`แผนก: ${activeDepartment}`);
  if (searchQuery) parts.push(`คำค้น: "${searchQuery}"`);

  if (parts.length > 0) {
    textEl.textContent = parts.join(' | ');
    statusEl.classList.remove('hidden');
  } else {
    statusEl.classList.add('hidden');
  }
}

// ------------------------------------------------------------
// 7. PROJECT CRUD OPERATIONS
// ------------------------------------------------------------
async function openProjectModal(mode, projectId = null) {
  if (!currentUser || !authToken) {
    showToast('กรุณาเข้าสู่ระบบก่อนเพิ่มหรือแก้ไขผลงาน', 'error');
    openAuthModal('login');
    return;
  }

  const modal = document.getElementById('project-modal');
  const titleEl = document.getElementById('project-modal-title');
  const form = document.getElementById('project-form');

  if (!modal || !form) return;

  form.reset();
  document.getElementById('project-id').value = '';

  if (mode === 'edit' && projectId) {
    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square text-amber-400"></i><span>แก้ไขข้อมูลผลงานโปรเจกต์</span>`;
    
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`);
      const result = await response.json();

      if (result.success) {
        const p = result.data;
        document.getElementById('project-id').value = p.id;
        document.getElementById('project-title').value = p.title;
        document.getElementById('project-short-desc').value = p.short_description;
        document.getElementById('project-full-desc').value = p.full_description;
        document.getElementById('project-cover-url').value = p.cover_image && !p.cover_image.startsWith('/') ? p.cover_image : '';
        document.getElementById('project-demo-url').value = p.demo_url || '';
        document.getElementById('project-github-url').value = p.github_url || '';
        document.getElementById('project-tags').value = p.tags || '';
        document.getElementById('project-department').value = p.department || '';
      }
    } catch (e) {
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลโปรเจกต์', 'error');
      return;
    }
  } else {
    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-plus-circle text-brand-400"></i><span>เพิ่มผลงานโปรเจกต์ใหม่</span>`;
  }

  modal.classList.remove('hidden');
}

function closeProjectModal() {
  const modal = document.getElementById('project-modal');
  if (modal) modal.classList.add('hidden');
}

async function handleProjectSubmit(event) {
  event.preventDefault();

  const projectId = document.getElementById('project-id').value;
  const title = document.getElementById('project-title').value.trim();
  const short_description = document.getElementById('project-short-desc').value.trim();
  const full_description = document.getElementById('project-full-desc').value.trim();
  const cover_image_url = document.getElementById('project-cover-url').value.trim();
  const fileInput = document.getElementById('project-cover-file');
  const demo_url = document.getElementById('project-demo-url').value.trim();
  const github_url = document.getElementById('project-github-url').value.trim();
  const tags = document.getElementById('project-tags').value.trim();
  const department = document.getElementById('project-department').value;

  const formData = new FormData();
  formData.append('title', title);
  formData.append('short_description', short_description);
  formData.append('full_description', full_description);
  formData.append('cover_image_url', cover_image_url);
  formData.append('demo_url', demo_url);
  formData.append('github_url', github_url);
  formData.append('tags', tags);
  formData.append('department', department);

  if (fileInput && fileInput.files.length > 0) {
    formData.append('cover_image_file', fileInput.files[0]);
  }

  const isEdit = !!projectId;
  const url = isEdit ? `${API_BASE_URL}/projects/${projectId}` : `${API_BASE_URL}/projects`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      showToast(result.message || (isEdit ? 'อัปเดตเรียบร้อย' : 'เพิ่มผลงานเรียบร้อย'), 'success');
      closeProjectModal();
      fetchProjects();
    } else {
      showToast(result.message || 'บันทึกข้อมูลไม่สำเร็จ', 'error');
    }
  } catch (error) {
    console.error('Project submit error:', error);
    showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
  }
}

async function deleteProject(projectId) {
  if (!currentUser || !authToken) return;

  if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผลงานโปรเจกต์นี้ออกจากระบบ?')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const result = await response.json();

    if (result.success) {
      showToast(result.message || 'ลบโปรเจกต์เรียบร้อย', 'success');
      fetchProjects();
    } else {
      showToast(result.message || 'ไม่สามารถลบโปรเจกต์ได้', 'error');
    }
  } catch (error) {
    console.error('Delete project error:', error);
    showToast('เกิดข้อผิดพลาดในการลบโปรเจกต์', 'error');
  }
}

// ------------------------------------------------------------
// 8. PROJECT DETAIL POPUP ENGINE
// ------------------------------------------------------------
async function openDetailModal(projectId) {
  const modal = document.getElementById('detail-modal');
  if (!modal) return;

  try {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`);
    const result = await response.json();

    if (result.success) {
      const p = result.data;

      const coverUrl = p.cover_image 
        ? (p.cover_image.startsWith('/') ? `${API_BASE_URL.replace('/api', '')}${p.cover_image}` : p.cover_image)
        : 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80';

      const coverEl = document.getElementById('detail-cover');
      const titleEl = document.getElementById('detail-title');
      const authorEl = document.getElementById('detail-author');
      const dateEl = document.getElementById('detail-date');
      const descEl = document.getElementById('detail-full-desc');

      if (coverEl) coverEl.src = coverUrl;
      if (titleEl) titleEl.textContent = p.title;
      if (authorEl) authorEl.textContent = `${p.author_name} (@${p.author_username})`;
      
      const deptEl = document.getElementById('detail-department');
      if (deptEl) deptEl.textContent = p.department || '-';

      if (dateEl) dateEl.textContent = new Date(p.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
      if (descEl) descEl.textContent = p.full_description;

      // Tags Badges
      const tagList = p.tags ? p.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const tagsEl = document.getElementById('detail-tags');
      if (tagsEl) {
        tagsEl.innerHTML = tagList.map(tag => `
          <span class="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30">
            #${tag}
          </span>
        `).join('');
      }

      // External Action Links (Demo / GitHub)
      const actionsContainer = document.getElementById('detail-actions');
      if (actionsContainer) {
        actionsContainer.innerHTML = '';

        if (p.demo_url) {
          actionsContainer.innerHTML += `
            <a href="${escapeHtml(p.demo_url)}" target="_blank" rel="noopener noreferrer" class="flex-1 sm:flex-initial px-4 py-3 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 active:scale-95">
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
              <span>เข้าชมระบบสาธิต (Live Demo)</span>
            </a>
          `;
        }

        if (p.github_url) {
          actionsContainer.innerHTML += `
            <a href="${escapeHtml(p.github_url)}" target="_blank" rel="noopener noreferrer" class="flex-1 sm:flex-initial px-4 py-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 active:scale-95">
              <i class="fa-brands fa-github text-sm"></i>
              <span>ซอร์สโค้ด GitHub</span>
            </a>
          `;
        }
      }

      modal.classList.remove('hidden');
    }
  } catch (error) {
    showToast('เกิดข้อผิดพลาดในการโหลดรายละเอียดโปรเจกต์', 'error');
  }
}

function closeDetailModal() {
  const modal = document.getElementById('detail-modal');
  if (modal) modal.classList.add('hidden');
}

// ------------------------------------------------------------
// 9. AUTH MODAL ENGINE & UTILITIES
// ------------------------------------------------------------
function openAuthModal(defaultTab = 'login') {
  switchAuthTab(defaultTab);
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.add('hidden');
}

function switchAuthTab(tab) {
  const loginTabBtn = document.getElementById('tab-login');
  const registerTabBtn = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (!loginTabBtn || !registerTabBtn || !loginForm || !registerForm) return;

  if (tab === 'login') {
    loginTabBtn.className = 'flex-1 py-2.5 text-xs font-semibold text-brand-400 border-b-2 border-brand-500 transition';
    registerTabBtn.className = 'flex-1 py-2.5 text-xs font-semibold text-slate-400 border-b-2 border-transparent hover:text-slate-200 transition';
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  } else {
    registerTabBtn.className = 'flex-1 py-2.5 text-xs font-semibold text-brand-400 border-b-2 border-brand-500 transition';
    loginTabBtn.className = 'flex-1 py-2.5 text-xs font-semibold text-slate-400 border-b-2 border-transparent hover:text-slate-200 transition';
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  }
}

// Toast Alert System
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');

  const bgColors = {
    success: 'bg-emerald-600/90 text-white border-emerald-500',
    error: 'bg-rose-600/90 text-white border-rose-500',
    info: 'bg-brand-600/90 text-white border-brand-500'
  };

  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    info: 'fa-circle-info'
  };

  toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl sm:rounded-2xl border shadow-xl backdrop-blur-md text-xs font-semibold transition duration-300 transform translate-y-2 opacity-0 ${bgColors[type] || bgColors.success}`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.success} text-base"></i>
    <span class="flex-1">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  // Auto Dismiss
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
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

// Unlock Admin Credentials View
function handleUnlockAdmin() {
  const input = document.getElementById('admin-passcode-input');
  const errorEl = document.getElementById('admin-passcode-error');
  const lockedView = document.getElementById('admin-locked-view');
  const unlockedView = document.getElementById('admin-unlocked-view');

  if (!input) return;

  if (input.value.trim() === '140963') {
    if (lockedView) lockedView.classList.add('hidden');
    if (unlockedView) unlockedView.classList.remove('hidden');
    if (errorEl) errorEl.classList.add('hidden');
    showToast('ปลดล็อกข้อมูลบัญชีผู้ดูแลระบบสำเร็จ', 'success');
  } else {
    if (errorEl) {
      errorEl.classList.remove('hidden');
    }
    showToast('รหัสผ่านไม่ถูกต้อง', 'error');
  }
}

// ------------------------------------------------------------
// 10. USER PROFILE ENGINE
// ------------------------------------------------------------
let currentProfileUser = null;

async function openProfileModal(targetUsername = null) {
  const username = targetUsername || (currentUser ? currentUser.username : null);

  if (!username) {
    openAuthModal('login');
    return;
  }

  const modal = document.getElementById('profile-modal');
  if (!modal) return;

  modal.classList.remove('hidden');
  toggleProfileTab('projects');

  try {
    const response = await fetch(`${API_BASE_URL}/users/profile/${encodeURIComponent(username)}`);
    const result = await response.json();

    if (result.success) {
      const profile = result.data.profile;
      const projects = result.data.projects || [];
      currentProfileUser = profile;

      // Populate Header Info
      const fullnameEl = document.getElementById('profile-fullname');
      const usernameEl = document.getElementById('profile-username');
      if (fullnameEl) fullnameEl.textContent = profile.fullname;
      if (usernameEl) usernameEl.textContent = `@${profile.username}`;
      
      const roleBadge = document.getElementById('profile-role-badge');
      if (roleBadge) {
        roleBadge.textContent = profile.role.toUpperCase();
        if (profile.role === 'admin') {
          roleBadge.className = 'absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider bg-purple-600 text-white border border-purple-400 shadow';
        } else {
          roleBadge.className = 'absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider bg-brand-600 text-white border border-brand-400 shadow';
        }
      }

      // Bio
      const bioEl = document.getElementById('profile-bio');
      if (bioEl) bioEl.textContent = profile.bio && profile.bio.trim() !== '' ? profile.bio : 'ยังไม่มีคำอธิบายประวัติย่อ';

      // Avatar
      const avatarContainer = document.getElementById('profile-avatar-container');
      if (avatarContainer) {
        if (profile.avatar) {
          const avatarUrl = profile.avatar.startsWith('/') ? `${API_BASE_URL.replace('/api', '')}${profile.avatar}` : profile.avatar;
          avatarContainer.innerHTML = `<img src="${avatarUrl}" class="w-full h-full object-cover rounded-xl sm:rounded-2xl" onerror="this.outerHTML='${profile.fullname.charAt(0).toUpperCase()}'">`;
        } else {
          avatarContainer.innerHTML = '';
          avatarContainer.textContent = profile.fullname.charAt(0).toUpperCase();
        }
      }

      // Contact & Links
      const emailWrap = document.getElementById('profile-email-wrap');
      const emailLink = document.getElementById('profile-email');
      if (emailWrap && emailLink) {
        if (profile.email) {
          emailLink.textContent = profile.email;
          emailLink.href = `mailto:${profile.email}`;
          emailWrap.classList.remove('hidden');
        } else {
          emailWrap.classList.add('hidden');
        }
      }

      const githubWrap = document.getElementById('profile-github-wrap');
      const githubLink = document.getElementById('profile-github');
      if (githubWrap && githubLink) {
        if (profile.github) {
          githubLink.href = profile.github;
          githubWrap.classList.remove('hidden');
        } else {
          githubWrap.classList.add('hidden');
        }
      }

      const websiteWrap = document.getElementById('profile-website-wrap');
      const websiteLink = document.getElementById('profile-website');
      if (websiteWrap && websiteLink) {
        if (profile.website) {
          websiteLink.href = profile.website;
          websiteWrap.classList.remove('hidden');
        } else {
          websiteWrap.classList.add('hidden');
        }
      }

      // Date & Projects Count
      const joinedEl = document.getElementById('profile-joined-date');
      const countEl = document.getElementById('profile-projects-count');
      if (joinedEl) joinedEl.textContent = new Date(profile.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
      if (countEl) countEl.textContent = projects.length;

      // Edit Button Visibility
      const editBtn = document.getElementById('edit-profile-btn');
      const editTabBtn = document.getElementById('tab-profile-edit');
      const isSelf = currentUser && currentUser.id === profile.id;

      if (editBtn) editBtn.classList.toggle('hidden', !isSelf);
      if (editTabBtn) editTabBtn.classList.toggle('hidden', !isSelf);

      if (isSelf) {
        populateEditProfileForm(profile);
      }

      // Render User's Projects
      renderProfileProjects(projects);

    } else {
      showToast(result.message || 'ไม่สามารถดึงข้อมูลโปรไฟล์ได้', 'error');
      closeProfileModal();
    }
  } catch (error) {
    console.error('Open Profile Error:', error);
    showToast('เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์', 'error');
  }
}

function closeProfileModal() {
  const modal = document.getElementById('profile-modal');
  if (modal) modal.classList.add('hidden');
}

function toggleProfileTab(tab) {
  const projectsTab = document.getElementById('profile-tab-projects');
  const editTab = document.getElementById('profile-tab-edit');
  const projectsBtn = document.getElementById('tab-profile-projects');
  const editBtn = document.getElementById('tab-profile-edit');

  if (!projectsTab || !editTab || !projectsBtn || !editBtn) return;

  if (tab === 'edit') {
    projectsTab.classList.add('hidden');
    editTab.classList.remove('hidden');
    editBtn.className = 'py-2.5 px-3 sm:px-4 text-xs font-semibold text-brand-400 border-b-2 border-brand-500 transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap';
    projectsBtn.className = 'py-2.5 px-3 sm:px-4 text-xs font-semibold text-slate-400 border-b-2 border-transparent hover:text-slate-200 transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap';
  } else {
    editTab.classList.add('hidden');
    projectsTab.classList.remove('hidden');
    projectsBtn.className = 'py-2.5 px-3 sm:px-4 text-xs font-semibold text-brand-400 border-b-2 border-brand-500 transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap';
    editBtn.className = 'py-2.5 px-3 sm:px-4 text-xs font-semibold text-slate-400 border-b-2 border-transparent hover:text-slate-200 transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap';
  }
}

function renderProfileProjects(projects) {
  const gridContainer = document.getElementById('profile-projects-grid');
  const emptyState = document.getElementById('profile-empty-projects');

  if (!gridContainer) return;
  gridContainer.innerHTML = '';

  if (projects.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  projects.forEach(project => {
    const coverUrl = project.cover_image 
      ? (project.cover_image.startsWith('/') ? `${API_BASE_URL.replace('/api', '')}${project.cover_image}` : project.cover_image)
      : 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80';

    const card = document.createElement('div');
    card.className = 'glass-card rounded-xl p-3 sm:p-3.5 flex gap-3 items-center hover:border-brand-500/40 transition cursor-pointer active:scale-[0.98]';
    card.onclick = () => {
      closeProfileModal();
      openDetailModal(project.id);
    };

    card.innerHTML = `
      <img src="${coverUrl}" class="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover bg-dark-950 shrink-0 border border-slate-800" loading="lazy">
      <div class="flex-1 min-w-0">
        <h4 class="text-xs font-bold text-slate-100 truncate">${escapeHtml(project.title)}</h4>
        <p class="text-[11px] text-slate-400 line-clamp-1 mt-0.5">${escapeHtml(project.short_description)}</p>
        <span class="inline-block text-[10px] font-mono text-brand-400 mt-1">#${escapeHtml(project.tags ? project.tags.split(',')[0] : 'Project')}</span>
      </div>
      <i class="fa-solid fa-chevron-right text-xs text-slate-500 pr-1 shrink-0"></i>
    `;

    gridContainer.appendChild(card);
  });
}

function populateEditProfileForm(profile) {
  const fields = {
    'edit-fullname': profile.fullname || '',
    'edit-bio': profile.bio || '',
    'edit-email': profile.email || '',
    'edit-github': profile.github || '',
    'edit-website': profile.website || '',
    'edit-avatar-url': profile.avatar && !profile.avatar.startsWith('/uploads') ? profile.avatar : '',
    'edit-password': ''
  };

  Object.entries(fields).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });

  const fileEl = document.getElementById('edit-avatar-file');
  if (fileEl) fileEl.value = '';
}

async function handleUpdateProfile(event) {
  event.preventDefault();

  if (!authToken) {
    showToast('กรุณาเข้าสู่ระบบก่อนอัปเดตโปรไฟล์', 'error');
    return;
  }

  const formData = new FormData();
  
  const fields = ['fullname', 'bio', 'email', 'github', 'website', 'avatar_url', 'password'];
  const fieldMap = {
    'fullname': 'edit-fullname',
    'bio': 'edit-bio',
    'email': 'edit-email',
    'github': 'edit-github',
    'website': 'edit-website',
    'avatar_url': 'edit-avatar-url',
    'password': 'edit-password'
  };

  fields.forEach(field => {
    const el = document.getElementById(fieldMap[field]);
    const key = field === 'password' ? 'new_password' : field;
    if (el) formData.append(key, el.value.trim());
  });

  const avatarFileEl = document.getElementById('edit-avatar-file');
  if (avatarFileEl && avatarFileEl.files[0]) {
    formData.append('avatar_file', avatarFileEl.files[0]);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/users/profile/me`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      currentUser = result.user;
      if (result.token) authToken = result.token;

      localStorage.setItem('showcase_user', JSON.stringify(currentUser));
      localStorage.setItem('showcase_token', authToken);

      updateAuthUI();
      showToast('อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว!', 'success');
      openProfileModal(currentUser.username);
      fetchProjects();
    } else {
      showToast(result.message || 'ไม่สามารถอัปเดตโปรไฟล์ได้', 'error');
    }
  } catch (error) {
    console.error('Update Profile error:', error);
    showToast('เกิดข้อผิดพลาดในการอัปเดตข้อมูลโปรไฟล์', 'error');
  }
}
