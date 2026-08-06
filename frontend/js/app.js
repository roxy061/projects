/**
 * Department Project Showcase - Frontend Application Logic
 */

const API_BASE = '/api';

// Safe LocalStorage Retrieval Wrapper
let jwtToken = localStorage.getItem('token') || null;
let currentUser = null;
try {
  const storedUser = localStorage.getItem('user');
  if (storedUser) currentUser = JSON.parse(storedUser);
} catch (e) {
  console.warn('Invalid user JSON in localStorage, resetting state.');
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  jwtToken = null;
}

// Application State
let layoutStructure = [];
let currentProjects = [];
let availableTags = [];
let currentSearch = '';
let currentTag = '';
let currentPage = 1;
let totalPages = 1;

// Fallback image URL
const DEFAULT_COVER_IMAGE = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1000&auto=format&fit=crop';

// Document Ready Initializer
document.addEventListener('DOMContentLoaded', () => {
  updateUserUI();
  initApp();
});

/**
 * Initialize Showcase Application
 */
async function initApp() {
  await loadTags();
  await loadSiteLayout();
  await loadProjects();
}

/**
 * Update UI Navbar & Badges according to User State & Role
 */
function updateUserUI() {
  const userBadge = document.getElementById('user-badge');
  const displayName = document.getElementById('user-display-name');
  const rolePill = document.getElementById('user-role-pill');
  const btnAdminPanel = document.getElementById('btn-admin-panel');
  const btnCreateProject = document.getElementById('btn-create-project');
  const btnLoginModal = document.getElementById('btn-login-modal');
  const btnLogout = document.getElementById('btn-logout');

  if (jwtToken && currentUser) {
    if (displayName) displayName.textContent = currentUser.full_name || currentUser.username;
    if (rolePill) {
      rolePill.textContent = currentUser.role || 'Member';
      if (currentUser.role === 'admin') {
        rolePill.className = 'bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase';
        if (btnAdminPanel) btnAdminPanel.classList.remove('hidden');
      } else {
        rolePill.className = 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded text-[10px] font-semibold uppercase';
        if (btnAdminPanel) btnAdminPanel.classList.add('hidden');
      }
    }

    if (userBadge) userBadge.classList.remove('hidden');
    if (btnCreateProject) btnCreateProject.classList.remove('hidden');
    if (btnLoginModal) btnLoginModal.classList.add('hidden');
    if (btnLogout) btnLogout.classList.remove('hidden');
  } else {
    if (displayName) displayName.textContent = 'Guest User';
    if (rolePill) {
      rolePill.textContent = 'Guest';
      rolePill.className = 'bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold uppercase';
    }

    if (userBadge) userBadge.classList.remove('hidden');
    if (btnAdminPanel) btnAdminPanel.classList.add('hidden');
    if (btnCreateProject) btnCreateProject.classList.add('hidden');
    if (btnLoginModal) btnLoginModal.classList.remove('hidden');
    if (btnLogout) btnLogout.classList.add('hidden');
  }
}

/**
 * Fetch and Load UI Section Layout Configuration from DB
 */
async function loadSiteLayout() {
  const container = document.getElementById('dynamic-sections');
  try {
    const res = await fetch(`${API_BASE}/layout`);
    const data = await res.json();

    if (data.success && Array.isArray(data.layout)) {
      layoutStructure = data.layout;
      renderLayoutSections(container);
    }
  } catch (error) {
    console.error('Failed to load layout:', error);
    if (container) {
      // Fallback layout if backend connection drops
      layoutStructure = [
        { id: 'hero', name: 'Hero Section', enabled: true, title: 'Department Project Showcase', subtitle: 'คลังรวบรวมและนำเสนอผลงานโปรเจกต์นวัตกรรมประจำภาควิชา' },
        { id: 'stats', name: 'System Statistics', enabled: true },
        { id: 'filter', name: 'Search & Tag Filters', enabled: true },
        { id: 'projects', name: 'Projects Showcase Grid', enabled: true },
        { id: 'about', name: 'Department Info', enabled: true }
      ];
      renderLayoutSections(container);
    }
  }
}

/**
 * Render Dynamic UI Layout Sections based on Layout JSON Order
 */
function renderLayoutSections(container) {
  if (!container) return;
  container.innerHTML = ''; // Clear loader

  layoutStructure.forEach(section => {
    if (!section.enabled) return;

    const sectionEl = document.createElement('section');
    sectionEl.id = `section-${section.id}`;

    switch (section.id) {
      case 'hero':
        sectionEl.innerHTML = createHeroHTML(section);
        break;
      case 'stats':
        sectionEl.innerHTML = createStatsHTML();
        break;
      case 'filter':
        sectionEl.innerHTML = createFilterHTML();
        break;
      case 'projects':
        sectionEl.innerHTML = createProjectsGridHTML();
        break;
      case 'featured':
        sectionEl.innerHTML = createFeaturedHTML();
        break;
      case 'about':
        sectionEl.innerHTML = createAboutHTML();
        break;
      default:
        break;
    }
    container.appendChild(sectionEl);
  });

  // Re-attach event listeners for filters & tags after DOM injection
  attachFilterEventListeners();
}

/**
 * HTML Templates for Dynamic Sections
 */
function createHeroHTML(config) {
  return `
    <div class="relative overflow-hidden rounded-3xl glass-card border border-slate-800 p-8 sm:p-12 text-center my-4">
      <div class="absolute -top-24 -left-24 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-24 -right-24 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
      
      <span class="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs px-3.5 py-1.5 rounded-full font-medium mb-4">
        <i class="fa-solid fa-sparkles text-amber-400"></i> Department Innovation Hub
      </span>

      <h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
        ${escapeHtml(config.title || 'Department Project Showcase')}
      </h1>

      <p class="max-w-2xl mx-auto text-slate-300 text-sm sm:text-base mb-8 font-light leading-relaxed">
        ${escapeHtml(config.subtitle || 'ศูนย์รวบรวมผลงานนวัตกรรม ซอฟต์แวร์ และงานวิจัยเชิงสร้างสรรค์ประจำภาควิชา')}
      </p>

      <div class="flex flex-wrap items-center justify-center gap-4">
        <button onclick="scrollToProjects()" class="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition shadow-lg shadow-indigo-600/30 flex items-center gap-2">
          <i class="fa-solid fa-compass"></i> สำรวจผลงานทั้งหมด
        </button>
        ${!jwtToken ? `
          <button onclick="openAuthModal('register')" class="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-6 py-3 rounded-xl text-sm font-semibold transition flex items-center gap-2">
            <i class="fa-solid fa-user-plus"></i> สมัครสมาชิกเพื่อส่งงาน
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

function createStatsHTML() {
  return `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="glass-card p-5 rounded-2xl border border-slate-800 text-center flex flex-col items-center justify-center">
        <div class="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-lg mb-2">
          <i class="fa-solid fa-folder-closed"></i>
        </div>
        <div id="stat-total-projects" class="text-2xl font-bold text-white">0</div>
        <p class="text-xs text-slate-400 font-light">โปรเจกต์ทั้งหมด</p>
      </div>

      <div class="glass-card p-5 rounded-2xl border border-slate-800 text-center flex flex-col items-center justify-center">
        <div class="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center text-lg mb-2">
          <i class="fa-solid fa-tags"></i>
        </div>
        <div id="stat-total-tags" class="text-2xl font-bold text-white">${availableTags.length || 0}</div>
        <p class="text-xs text-slate-400 font-light">แท็กหมวดหมู่</p>
      </div>

      <div class="glass-card p-5 rounded-2xl border border-slate-800 text-center flex flex-col items-center justify-center">
        <div class="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-lg mb-2">
          <i class="fa-solid fa-shield-check"></i>
        </div>
        <div class="text-2xl font-bold text-white">Verified</div>
        <p class="text-xs text-slate-400 font-light">Quality Standard</p>
      </div>

      <div class="glass-card p-5 rounded-2xl border border-slate-800 text-center flex flex-col items-center justify-center">
        <div class="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center text-lg mb-2">
          <i class="fa-solid fa-user-lock"></i>
        </div>
        <div class="text-2xl font-bold text-white">RBAC</div>
        <p class="text-xs text-slate-400 font-light">Access Protection</p>
      </div>
    </div>
  `;
}

function createFilterHTML() {
  return `
    <div class="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
      <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <!-- Search Input -->
        <div class="relative w-full md:w-96">
          <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3.5 text-slate-400 text-sm"></i>
          <input type="text" id="search-input" value="${escapeHtml(currentSearch)}" placeholder="ค้นหาตามชื่อโปรเจกต์ หรือ คำบรรยาย..." 
            class="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition">
        </div>

        <!-- Filter Status & Reset -->
        <div class="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
          <span id="filter-status-text" class="text-xs text-slate-400 font-light">กำลังแสดงผลงานทั้งหมด</span>
          <button onclick="resetFilters()" class="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition flex items-center gap-1">
            <i class="fa-solid fa-rotate-left"></i> รีเซ็ตตัวกรอง
          </button>
        </div>
      </div>

      <!-- Tag Filters Pills -->
      <div class="pt-2 border-t border-slate-800">
        <p class="text-xs text-slate-400 mb-2 font-medium">คัดกรองตามแท็ก (Filter by Tag):</p>
        <div id="tag-pills-container" class="flex flex-wrap gap-2">
          <!-- Rendered dynamically -->
        </div>
      </div>
    </div>
  `;
}

function createProjectsGridHTML() {
  return `
    <div id="projects-anchor" class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-cubes text-indigo-400"></i> โปรเจกต์ทั้งหมด
        </h2>
        <span id="project-count-badge" class="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
          0 รายการ
        </span>
      </div>

      <!-- Projects Grid Container -->
      <div id="projects-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Rendered dynamically -->
      </div>

      <!-- Pagination Container -->
      <div id="pagination-container" class="flex justify-center items-center space-x-2 pt-6 border-t border-slate-800">
        <!-- Rendered dynamically -->
      </div>
    </div>
  `;
}

function createFeaturedHTML() {
  return `
    <div class="glass-card p-6 sm:p-8 rounded-2xl border border-indigo-500/30 relative overflow-hidden bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-950">
      <div class="flex flex-col md:flex-row items-center gap-6">
        <div class="w-full md:w-1/2 space-y-3">
          <span class="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs px-3 py-1 rounded-full font-bold uppercase inline-flex items-center gap-1.5">
            <i class="fa-solid fa-star"></i> Featured Highlight Project
          </span>
          <h3 class="text-2xl font-bold text-white">Smart Agriculture IoT & AI System</h3>
          <p class="text-slate-300 text-xs sm:text-sm font-light leading-relaxed">
            ระบบฟาร์มอัจฉริยะวิเคราะห์ความชื้นและสภาพอากาศด้วย AI ช่วยลดการสูญเสียน้ำและเพิ่มผลผลิตทางการเกษตรอย่างยั่งยืน
          </p>
          <div class="flex flex-wrap gap-2 pt-2">
            <span class="bg-slate-800 text-indigo-300 text-[11px] px-2.5 py-1 rounded-md border border-slate-700">AI / Machine Learning</span>
            <span class="bg-slate-800 text-cyan-300 text-[11px] px-2.5 py-1 rounded-md border border-slate-700">IoT</span>
            <span class="bg-slate-800 text-emerald-300 text-[11px] px-2.5 py-1 rounded-md border border-slate-700">MariaDB</span>
          </div>
        </div>
        <div class="w-full md:w-1/2 h-48 sm:h-56 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
          <img src="https://images.unsplash.com/photo-1586771107445-d3ca888129ff?q=80&w=1000&auto=format&fit=crop" onerror="this.src='${DEFAULT_COVER_IMAGE}'" class="w-full h-full object-cover hover:scale-105 transition duration-500" alt="Featured">
        </div>
      </div>
    </div>
  `;
}

function createAboutHTML() {
  return `
    <div class="glass-card p-6 sm:p-8 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
      <div class="space-y-2">
        <h3 class="text-lg font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-building-columns text-cyan-400"></i> เกี่ยวกับระบบ showcase ภาควิชา
        </h3>
        <p class="text-xs text-slate-400 max-w-2xl leading-relaxed font-light">
          ระบบจัดเก็บและนำเสนอผลงานภาควิชาได้รับการพัฒนาขึ้นเพื่อเป็นคลังปัญญาและการเผยแพร่ผลงานนวัตกรรมของนักศึกษาและอาจารย์ เพื่อส่งเสริมการเรียนรู้และการแบ่งปันองค์ความรู้ทางเทคโนโลยี
        </p>
      </div>
      <div class="flex items-center space-x-3 shrink-0">
        <a href="https://github.com" target="_blank" class="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-500 transition">
          <i class="fa-brands fa-github text-lg"></i>
        </a>
        <a href="mailto:contact@department.ac.th" class="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-500 transition">
          <i class="fa-solid fa-envelope text-lg"></i>
        </a>
      </div>
    </div>
  `;
}

/**
 * Attach Event Listeners to Filter Controls after Layout Injection
 */
function attachFilterEventListeners() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let timeout = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        currentSearch = e.target.value;
        currentPage = 1;
        loadProjects();
      }, 300);
    });
  }

  renderTagPills();
}

/**
 * Load Available Tags from Backend
 */
async function loadTags() {
  try {
    const res = await fetch(`${API_BASE}/projects/tags/all`);
    const data = await res.json();
    if (data.success && Array.isArray(data.tags)) {
      availableTags = data.tags;
      const statTags = document.getElementById('stat-total-tags');
      if (statTags) statTags.textContent = availableTags.length;
    }
  } catch (error) {
    console.error('Failed to load tags:', error);
  }
}

/**
 * Render Tag Filter Pill Badges
 */
function renderTagPills() {
  const container = document.getElementById('tag-pills-container');
  if (!container) return;

  container.innerHTML = '';

  // "All" Pill
  const allBtn = document.createElement('button');
  allBtn.className = `px-3 py-1 rounded-full text-xs font-medium transition ${
    currentTag === '' 
      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
  }`;
  allBtn.textContent = 'แท็กทั้งหมด';
  allBtn.onclick = () => selectTag('');
  container.appendChild(allBtn);

  // Individual Tag Pills
  availableTags.forEach(tag => {
    const btn = document.createElement('button');
    const isSelected = currentTag === tag.name;
    btn.className = `px-3 py-1 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
      isSelected 
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
        : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
    }`;
    btn.innerHTML = `${escapeHtml(tag.name)} <span class="text-[10px] opacity-70 bg-slate-950 px-1.5 py-0.2 rounded-full">${tag.project_count || 0}</span>`;
    btn.onclick = () => selectTag(tag.name);
    container.appendChild(btn);
  });
}

function selectTag(tagName) {
  currentTag = tagName;
  currentPage = 1;
  renderTagPills();
  loadProjects();
}

function resetFilters() {
  currentSearch = '';
  currentTag = '';
  currentPage = 1;
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
  renderTagPills();
  loadProjects();
}

function resetFiltersAndReload() {
  resetFilters();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToProjects() {
  const anchor = document.getElementById('projects-anchor');
  if (anchor) {
    anchor.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * Fetch & Load Projects from API
 */
async function loadProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="col-span-full py-16 text-center space-y-3">
      <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-xs text-slate-400">กำลังโหลดโปรเจกต์...</p>
    </div>
  `;

  try {
    const queryParams = new URLSearchParams({
      page: currentPage,
      limit: 6,
      search: currentSearch,
      tag: currentTag
    });

    const res = await fetch(`${API_BASE}/projects?${queryParams.toString()}`);
    const data = await res.json();

    if (data.success) {
      currentProjects = data.data || [];
      currentPage = data.pagination.currentPage;
      totalPages = data.pagination.totalPages;

      const totalItems = data.pagination.totalItems;
      const countBadge = document.getElementById('project-count-badge');
      if (countBadge) countBadge.textContent = `${totalItems} รายการ`;

      const statProj = document.getElementById('stat-total-projects');
      if (statProj) statProj.textContent = totalItems;

      renderProjectsGrid(currentProjects);
      renderPagination();
    }
  } catch (error) {
    console.error('Error loading projects:', error);
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-rose-400 text-sm glass-card rounded-2xl border border-rose-500/20">
        <i class="fa-solid fa-triangle-exclamation text-2xl mb-2 block"></i>
        ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ backend ได้ในขณะนี้
      </div>
    `;
  }
}

/**
 * Render Project Cards into Grid
 */
function renderProjectsGrid(projects) {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  if (projects.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center glass-card rounded-2xl border border-slate-800 space-y-3">
        <i class="fa-solid fa-folder-open text-4xl text-slate-600"></i>
        <h3 class="text-base font-semibold text-slate-300">ไม่พบโปรเจกต์ที่ตรงกับเงื่อนไข</h3>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">ลองเปลี่ยนคำค้นหา หรือกดรีเซ็ตตัวกรองเพื่อดูโปรเจกต์ทั้งหมด</p>
        <button onclick="resetFilters()" class="text-xs bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg hover:bg-indigo-600/30 transition">
          รีเซ็ตการค้นหา
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';

  projects.forEach(project => {
    // RBAC Check: Is current user the Owner OR an Admin?
    const isOwner = currentUser && (currentUser.id === project.user_id);
    const isAdmin = currentUser && (currentUser.role === 'admin');
    const canModify = isOwner || isAdmin;

    const card = document.createElement('div');
    card.className = 'glass-card rounded-2xl overflow-hidden border border-slate-800 project-card flex flex-col justify-between';

    const coverUrl = project.cover_image_url || DEFAULT_COVER_IMAGE;

    card.innerHTML = `
      <div>
        <!-- Cover Image -->
        <div class="relative h-48 w-full overflow-hidden bg-slate-900 cursor-pointer" onclick="openDetailModal(${project.id})">
          <img src="${coverUrl}" 
               onerror="this.src='${DEFAULT_COVER_IMAGE}'"
               alt="${escapeHtml(project.title)}" 
               class="w-full h-full object-cover hover:scale-105 transition duration-500">
          <div class="absolute top-3 right-3 bg-slate-950/80 backdrop-blur text-slate-300 text-[10px] px-2.5 py-1 rounded-full border border-slate-700/60 font-medium">
            <i class="fa-regular fa-user mr-1"></i> ${escapeHtml(project.author_name || 'Member')}
          </div>
        </div>

        <!-- Body -->
        <div class="p-5 space-y-3">
          <!-- Tags -->
          <div class="flex flex-wrap gap-1.5">
            ${(project.tags || []).map(t => `<span class="bg-indigo-950/60 text-indigo-300 text-[10px] px-2 py-0.5 rounded border border-indigo-800/40 font-mono">${escapeHtml(t)}</span>`).join('')}
          </div>

          <!-- Title -->
          <h3 class="text-base font-bold text-white hover:text-indigo-400 cursor-pointer transition line-clamp-1" onclick="openDetailModal(${project.id})">
            ${escapeHtml(project.title)}
          </h3>

          <!-- Short Description -->
          <p class="text-slate-400 text-xs line-clamp-2 leading-relaxed font-light">
            ${escapeHtml(project.short_description)}
          </p>
        </div>
      </div>

      <!-- Card Footer Actions -->
      <div class="p-5 pt-0 border-t border-slate-800/60 mt-3 flex items-center justify-between">
        <button onclick="openDetailModal(${project.id})" class="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition flex items-center gap-1">
          รายละเอียด <i class="fa-solid fa-chevron-right text-[10px]"></i>
        </button>

        <div class="flex items-center space-x-2">
          ${canModify ? `
            <button onclick="openProjectModal(${project.id})" class="w-8 h-8 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-xs transition" title="แก้ไข">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button onclick="confirmDeleteProject(${project.id})" class="w-8 h-8 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 flex items-center justify-center text-xs transition" title="ลบ">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

/**
 * Render Pagination Controller
 */
function renderPagination() {
  const container = document.getElementById('pagination-container');
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 text-xs flex items-center justify-center">
      <i class="fa-solid fa-chevron-left"></i>
    </button>
  `;

  for (let p = 1; p <= totalPages; p++) {
    html += `
      <button onclick="changePage(${p})" class="w-8 h-8 rounded-lg text-xs font-semibold ${
        p === currentPage 
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
          : 'bg-slate-900 border border-slate-700 text-slate-400 hover:bg-slate-800'
      }">
        ${p}
      </button>
    `;
  }

  html += `
    <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 text-xs flex items-center justify-center">
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;

  container.innerHTML = html;
}

function changePage(page) {
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  loadProjects();
  scrollToProjects();
}

/**
 * Auth Modal Controls & Submissions
 */
function openAuthModal(tab = 'login') {
  const modal = document.getElementById('modal-auth');
  if (modal) modal.classList.add('active');
  switchAuthTab(tab);
}

function closeAuthModal() {
  const modal = document.getElementById('modal-auth');
  if (modal) modal.classList.remove('active');
}

function switchAuthTab(tab) {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');

  if (tab === 'login') {
    if (tabLogin) tabLogin.className = 'flex-1 py-2 text-center text-sm font-semibold border-b-2 border-indigo-500 text-indigo-400 transition';
    if (tabRegister) tabRegister.className = 'flex-1 py-2 text-center text-sm font-semibold text-slate-400 hover:text-slate-200 border-b-2 border-transparent transition';
    if (formLogin) formLogin.classList.remove('hidden');
    if (formRegister) formRegister.classList.add('hidden');
  } else {
    if (tabRegister) tabRegister.className = 'flex-1 py-2 text-center text-sm font-semibold border-b-2 border-emerald-500 text-emerald-400 transition';
    if (tabLogin) tabLogin.className = 'flex-1 py-2 text-center text-sm font-semibold text-slate-400 hover:text-slate-200 border-b-2 border-transparent transition';
    if (formRegister) formRegister.classList.remove('hidden');
    if (formLogin) formLogin.classList.add('hidden');
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('login-username').value;
  const passwordInput = document.getElementById('login-password').value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordInput })
    });

    const data = await res.json();

    if (data.success) {
      jwtToken = data.token;
      currentUser = data.user;
      localStorage.setItem('token', jwtToken);
      localStorage.setItem('user', JSON.stringify(currentUser));

      showToast(`ยินดีต้อนรับคุณ ${currentUser.full_name}`, 'success');
      closeAuthModal();
      updateUserUI();
      await loadSiteLayout();
      await loadProjects();
    } else {
      showToast(data.message || 'เข้าสู่ระบบไม่สำเร็จ', 'error');
    }
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const fullName = document.getElementById('reg-fullname').value;
  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, username, email, password })
    });

    const data = await res.json();

    if (data.success) {
      jwtToken = data.token;
      currentUser = data.user;
      localStorage.setItem('token', jwtToken);
      localStorage.setItem('user', JSON.stringify(currentUser));

      showToast('ลงทะเบียนสมาชิกสำเร็จ!', 'success');
      closeAuthModal();
      updateUserUI();
      await loadSiteLayout();
      await loadProjects();
    } else {
      showToast(data.message || 'ลงทะเบียนไม่สำเร็จ', 'error');
    }
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการลงทะเบียน', 'error');
  }
}

function handleLogout() {
  jwtToken = null;
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
  updateUserUI();
  loadSiteLayout();
  loadProjects();
}

/**
 * Project Create / Edit Modal Controls & Submissions
 */
async function openProjectModal(projectId = null) {
  if (!jwtToken) {
    openAuthModal('login');
    return;
  }

  const modal = document.getElementById('modal-project-form');
  const titleEl = document.getElementById('modal-project-title');
  const formId = document.getElementById('project-form-id');
  const pTitle = document.getElementById('p-title');
  const pShortDesc = document.getElementById('p-short-desc');
  const pFullDesc = document.getElementById('p-full-desc');
  const pUrlImage = document.getElementById('p-url-image');
  const pFileImage = document.getElementById('p-file-image');
  const pDemoUrl = document.getElementById('p-demo-url');
  const pGithubUrl = document.getElementById('p-github-url');
  const pTags = document.getElementById('p-tags');

  // Reset inputs
  document.getElementById('form-project').reset();
  formId.value = '';
  pFileImage.value = '';

  if (projectId) {
    if (titleEl) titleEl.textContent = 'แก้ไขโปรเจกต์';
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}`);
      const data = await res.json();

      if (data.success) {
        const p = data.project;
        formId.value = p.id;
        pTitle.value = p.title || '';
        pShortDesc.value = p.short_description || '';
        pFullDesc.value = p.full_description || '';
        pUrlImage.value = p.cover_image_url || '';
        pDemoUrl.value = p.demo_url || '';
        pGithubUrl.value = p.github_url || '';
        pTags.value = (p.tags || []).join(', ');
      }
    } catch (err) {
      showToast('ไม่สามารถดึงข้อมูลโปรเจกต์ได้', 'error');
      return;
    }
  } else {
    if (titleEl) titleEl.textContent = 'สร้างโปรเจกต์ใหม่';
  }

  if (modal) modal.classList.add('active');
}

function closeProjectModal() {
  const modal = document.getElementById('modal-project-form');
  if (modal) modal.classList.remove('active');
}

async function handleProjectFormSubmit(e) {
  e.preventDefault();

  const projectId = document.getElementById('project-form-id').value;
  const pTitle = document.getElementById('p-title').value;
  const pShortDesc = document.getElementById('p-short-desc').value;
  const pFullDesc = document.getElementById('p-full-desc').value;
  const pUrlImage = document.getElementById('p-url-image').value;
  const pFileImage = document.getElementById('p-file-image').files[0];
  const pDemoUrl = document.getElementById('p-demo-url').value;
  const pGithubUrl = document.getElementById('p-github-url').value;
  const pTags = document.getElementById('p-tags').value;

  const formData = new FormData();
  formData.append('title', pTitle);
  formData.append('short_description', pShortDesc);
  formData.append('full_description', pFullDesc);
  formData.append('cover_image_url', pUrlImage);
  formData.append('demo_url', pDemoUrl);
  formData.append('github_url', pGithubUrl);
  formData.append('tags', pTags);

  if (pFileImage) {
    formData.append('cover_image', pFileImage);
  }

  const method = projectId ? 'PUT' : 'POST';
  const url = projectId ? `${API_BASE}/projects/${projectId}` : `${API_BASE}/projects`;

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      },
      body: formData
    });

    const data = await res.json();

    if (data.success) {
      showToast(projectId ? 'บันทึกการแก้ไขโปรเจกต์เรียบร้อย!' : 'สร้างโปรเจกต์สำเร็จ!', 'success');
      closeProjectModal();
      await loadTags();
      await loadProjects();
    } else {
      showToast(data.message || 'เกิดข้อผิดพลาดในการบันทึกโปรเจกต์', 'error');
    }
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการบันทึกโปรเจกต์', 'error');
  }
}

/**
 * Open Single Project Detail Modal
 */
async function openDetailModal(projectId) {
  const modal = document.getElementById('modal-project-detail');

  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}`);
    const data = await res.json();

    if (data.success) {
      const p = data.project;

      const coverImg = document.getElementById('detail-cover');
      if (coverImg) {
        coverImg.src = p.cover_image_url || DEFAULT_COVER_IMAGE;
        coverImg.onerror = () => { coverImg.src = DEFAULT_COVER_IMAGE; };
      }

      document.getElementById('detail-title').textContent = p.title;
      document.getElementById('detail-author').textContent = p.author_name || 'Member';
      document.getElementById('detail-date').textContent = `สร้างเมื่อ: ${new Date(p.created_at).toLocaleDateString('th-TH')}`;
      document.getElementById('detail-short-desc').textContent = p.short_description;
      document.getElementById('detail-full-desc').textContent = p.full_description;

      // Tags Badges
      const tagsContainer = document.getElementById('detail-tags');
      if (tagsContainer) {
        tagsContainer.innerHTML = (p.tags || []).map(t => `
          <span class="bg-indigo-600/80 text-white text-[11px] px-2.5 py-0.5 rounded-full border border-indigo-400/30 backdrop-blur font-mono">${escapeHtml(t)}</span>
        `).join('');
      }

      // Demo & GitHub Links
      const demoLink = document.getElementById('detail-demo-link');
      if (demoLink) {
        if (p.demo_url) {
          demoLink.href = p.demo_url;
          demoLink.classList.remove('hidden');
        } else {
          demoLink.classList.add('hidden');
        }
      }

      const githubLink = document.getElementById('detail-github-link');
      if (githubLink) {
        if (p.github_url) {
          githubLink.href = p.github_url;
          githubLink.classList.remove('hidden');
        } else {
          githubLink.classList.add('hidden');
        }
      }

      // Owner Action Bar
      const isOwner = currentUser && (currentUser.id === p.user_id);
      const isAdmin = currentUser && (currentUser.role === 'admin');
      const canModify = isOwner || isAdmin;

      const ownerActions = document.getElementById('detail-owner-actions');
      const btnEdit = document.getElementById('btn-detail-edit');
      const btnDelete = document.getElementById('btn-detail-delete');

      if (canModify && ownerActions) {
        ownerActions.classList.remove('hidden');
        if (btnEdit) btnEdit.onclick = () => { closeDetailModal(); openProjectModal(p.id); };
        if (btnDelete) btnDelete.onclick = () => { closeDetailModal(); confirmDeleteProject(p.id); };
      } else if (ownerActions) {
        ownerActions.classList.add('hidden');
      }

      if (modal) modal.classList.add('active');
    }
  } catch (err) {
    showToast('ไม่สามารถโหลดรายละเอียดโปรเจกต์ได้', 'error');
  }
}

function closeDetailModal() {
  const modal = document.getElementById('modal-project-detail');
  if (modal) modal.classList.remove('active');
}

/**
 * Confirm and Execute Project Deletion
 */
async function confirmDeleteProject(projectId) {
  if (!jwtToken) {
    openAuthModal('login');
    return;
  }

  if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบโปรเจกต์นี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });

    const data = await res.json();

    if (data.success) {
      showToast('ลบโปรเจกต์เรียบร้อยแล้ว', 'success');
      await loadTags();
      await loadProjects();
    } else {
      showToast(data.message || 'ไม่สามารถลบโปรเจกต์ได้', 'error');
    }
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการลบโปรเจกต์', 'error');
  }
}

/**
 * Toast Notification Utility
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

/**
 * Escape HTML Helper for XSS Prevention
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
