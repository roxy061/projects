/**
 * ==========================================================================
 * Department Project Showcase - Main Frontend Application Logic
 * ==========================================================================
 */

// กำหนด API Base URL: 
// ตรวจจับพอร์ตอัตโนมัติ หากรันบน Express โดยตรง (Port 5000) ใช้ '/api' 
// หากรันผ่าน XAMPP Apache หรือเปิดไฟล์ตรง ใช้ 'http://localhost:5000/api'
const API_BASE = (window.location.port === '5000') 
  ? '/api' 
  : 'http://localhost:5000/api';

// 1. อ่านข้อมูล Authentication State จาก LocalStorage อย่างปลอดภัย
let jwtToken = localStorage.getItem('token') || null;
let currentUser = null;
try {
  const storedUser = localStorage.getItem('user');
  if (storedUser) currentUser = JSON.parse(storedUser);
} catch (e) {
  console.warn('เกิดข้อผิดพลาดในการอ่านข้อมูล user จาก localStorage ล้างค่าใหม่:', e);
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  jwtToken = null;
}

// ตัวแปรสถานะส่วนกลางของแอปพลิเคชัน (Global Application State)
let layoutStructure = [];
let currentProjects = [];
let availableTags = [];
let currentSearch = '';
let currentTag = '';
let currentPage = 1;
let totalPages = 1;
let isBackendConnected = false;
let hasShownOfflineToast = false;

// รูปภาพปกสำรอง กรณี URL รูปภาพเสียหรือไม่ถูกระบุ
const DEFAULT_COVER_IMAGE = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1000&auto=format&fit=crop';

// สั่งเริ่มต้นการทำงานเมื่อโหลด DOM ครบถ้วน
document.addEventListener('DOMContentLoaded', () => {
  updateUserUI();
  initApp();
});

/**
 * ฟังก์ชันเริ่มต้นโหลดข้อมูลระบบ (Tags, Layout, Projects)
 */
async function initApp() {
  await loadTags();
  await loadSiteLayout();
  await loadProjects();
}

/**
 * 1. Authentication State & Navbar UI Switcher
 * อัปเดตสถานะปุ่มและ Badge ใน Navbar ตามข้อมูล Token และ User Role ใน localStorage
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
        rolePill.className = 'bg-brand-500/20 text-brand-300 border border-brand-500/30 px-2 py-0.5 rounded text-[10px] font-semibold uppercase';
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
 * 3. Dynamic UI Layout Fetching
 * ดึงลำดับโครงสร้าง UI จาก GET /api/layout และจัดเรียง Section หน้าแรกตามที่ตั้งไว้ใน DB
 */
async function loadSiteLayout() {
  const container = document.getElementById('dynamic-sections');
  try {
    const res = await fetch(`${API_BASE}/layout`);
    const data = await res.json();

    if (data.success && Array.isArray(data.layout)) {
      layoutStructure = data.layout;
      isBackendConnected = true;
      renderLayoutSections(container);
    }
  } catch (error) {
    console.warn('ไม่สามารถดึงข้อมูล Layout จากเซิร์ฟเวอร์:', error.message);
    isBackendConnected = false;

    if (!hasShownOfflineToast) {
      showToast('⚠️ ไม่พบการเชื่อมต่อ Node.js Backend Server (Port 5000)', 'error');
      hasShownOfflineToast = true;
    }

    if (container) {
      // โครงสร้างสำรองกรณีเชื่อมต่อเซิร์ฟเวอร์ไม่ได้
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
 * เรนเดอร์แต่ละ Section เข้าไปยัง dynamic-sections container ตามลำดับ Layout JSON
 */
function renderLayoutSections(container) {
  if (!container) return;
  container.innerHTML = '';

  // แสดงแถบแจ้งเตือนหาก Backend Server ออฟไลน์อยู่
  if (!isBackendConnected) {
    const offlineBanner = document.createElement('div');
    offlineBanner.className = 'glass-card border border-rose-500/40 p-4 rounded-2xl bg-rose-950/30 text-rose-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 mb-6';
    offlineBanner.innerHTML = `
      <div class="flex items-center space-x-3">
        <i class="fa-solid fa-triangle-exclamation text-rose-400 text-xl"></i>
        <div>
          <h4 class="font-bold text-rose-300">ยังไม่ได้เปิดใช้งาน Node.js Server (Backend Port 5000 Offline)</h4>
          <p class="text-[11px] text-rose-300/80 font-mono mt-0.5">กรุณาเปิด Terminal แล้วพิมพ์คำสั่ง: <code class="bg-slate-900 px-2 py-0.5 rounded text-amber-300">cd backend && npm start</code></p>
        </div>
      </div>
      <button onclick="initApp()" class="px-3 py-1.5 bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-white rounded-lg font-semibold shrink-0 transition flex items-center gap-1.5">
        <i class="fa-solid fa-rotate"></i> ลองเชื่อมต่อใหม่
      </button>
    `;
    container.appendChild(offlineBanner);
  }

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

  // ผูก Event Listener สำหรับช่องค้นหาและแท็กหลังจาก injection
  attachFilterEventListeners();
}

/**
 * --------------------------------------------------------------------------
 * HTML Templates สำหรับ Dynamic Layout Sections
 * --------------------------------------------------------------------------
 */
function createHeroHTML(config) {
  return `
    <div class="relative overflow-hidden rounded-3xl glass-card border border-slate-800 p-8 sm:p-12 text-center my-4">
      <div class="absolute -top-24 -left-24 w-72 h-72 bg-brand-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-24 -right-24 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
      
      <span class="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs px-3.5 py-1.5 rounded-full font-medium mb-4">
        <i class="fa-solid fa-sparkles text-amber-400"></i> Department Innovation Hub
      </span>

      <h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
        ${escapeHtml(config.title || 'Department Project Showcase')}
      </h1>

      <p class="max-w-2xl mx-auto text-slate-300 text-sm sm:text-base mb-8 font-light leading-relaxed">
        ${escapeHtml(config.subtitle || 'ศูนย์รวบรวมผลงานนวัตกรรม ซอฟต์แวร์ และงานวิจัยเชิงสร้างสรรค์ประจำภาควิชา')}
      </p>

      <div class="flex flex-wrap items-center justify-center gap-4">
        <button onclick="scrollToProjects()" class="bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition shadow-lg shadow-brand-600/30 flex items-center gap-2">
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
        <div class="w-10 h-10 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center text-lg mb-2">
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
            class="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 transition">
        </div>

        <!-- Filter Status & Reset -->
        <div class="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
          <span id="filter-status-text" class="text-xs text-slate-400 font-light">กำลังแสดงผลงานทั้งหมด</span>
          <button onclick="resetFilters()" class="text-xs text-brand-400 hover:text-brand-300 font-medium transition flex items-center gap-1">
            <i class="fa-solid fa-rotate-left"></i> รีเซ็ตตัวกรอง
          </button>
        </div>
      </div>

      <!-- Tag Filters Pills -->
      <div class="pt-2 border-t border-slate-800">
        <p class="text-xs text-slate-400 mb-2 font-medium">คัดกรองตามแท็ก (Filter by Tag):</p>
        <div id="tag-pills-container" class="flex flex-wrap gap-2">
          <!-- แท็กจะถูกเรนเดอร์ผ่านฟังก์ชัน renderTagPills() -->
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
          <i class="fa-solid fa-cubes text-brand-400"></i> โปรเจกต์ทั้งหมด
        </h2>
        <span id="project-count-badge" class="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
          0 รายการ
        </span>
      </div>

      <!-- Projects Container Grid 3 Columns -->
      <div id="projects-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- รายการ Card จะถูกสร้างที่นี่ -->
      </div>

      <!-- Pagination Container -->
      <div id="pagination-container" class="flex justify-center items-center space-x-2 pt-6 border-t border-slate-800">
        <!-- ปุ่มสลับหน้าจะถูกสร้างที่นี่ -->
      </div>
    </div>
  `;
}

function createFeaturedHTML() {
  return `
    <div class="glass-card p-6 sm:p-8 rounded-2xl border border-brand-500/30 relative overflow-hidden bg-gradient-to-r from-brand-950/40 via-slate-900 to-slate-950">
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
            <span class="bg-slate-800 text-brand-300 text-[11px] px-2.5 py-1 rounded-md border border-slate-700">IoT</span>
            <span class="bg-slate-800 text-cyan-300 text-[11px] px-2.5 py-1 rounded-md border border-slate-700">React</span>
            <span class="bg-slate-800 text-emerald-300 text-[11px] px-2.5 py-1 rounded-md border border-slate-700">ESP32</span>
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
 * --------------------------------------------------------------------------
 * Tag Filtering & Search Listener
 * --------------------------------------------------------------------------
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
 * ดึงข้อมูลรายการแท็กทั้งหมดจาก GET /api/projects/tags/all
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
    console.warn('ไม่สามารถโหลดแท็กได้:', error.message);
  }
}

/**
 * เรนเดอร์ ปุ่มแท็กตัวกรอง (Tag Pills)
 */
function renderTagPills() {
  const container = document.getElementById('tag-pills-container');
  if (!container) return;

  container.innerHTML = '';

  // ปุ่ม "แท็กทั้งหมด"
  const allBtn = document.createElement('button');
  allBtn.className = `px-3 py-1 rounded-full text-xs font-medium transition ${
    currentTag === '' 
      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30' 
      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
  }`;
  allBtn.textContent = 'แท็กทั้งหมด';
  allBtn.onclick = () => selectTag('');
  container.appendChild(allBtn);

  // ปุ่มสำหรับแต่ละแท็กที่มีใน DB
  availableTags.forEach(tag => {
    const btn = document.createElement('button');
    const isSelected = currentTag === tag.name;
    btn.className = `px-3 py-1 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
      isSelected 
        ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30' 
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
 * 4. Project CRUD & Rendering
 * GET /api/projects?search=...&tag=... ดึงรายการโปรเจกต์มาสร้าง Card ใน Grid Container
 */
async function loadProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="col-span-full py-16 text-center space-y-3">
      <div class="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
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
    console.warn('เกิดข้อผิดพลาดในการโหลดโปรเจกต์:', error.message);
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-rose-300 text-xs glass-card rounded-2xl border border-rose-500/20 p-6 space-y-3">
        <i class="fa-solid fa-plug-circle-xmark text-3xl text-rose-400"></i>
        <h4 class="font-bold text-sm text-white">ไม่สามารถดึงข้อมูลโปรเจกต์จาก Backend ได้</h4>
        <p class="text-slate-400 text-xs max-w-md mx-auto">โปรดตรวจสอบว่าได้เปิดคำสั่ง <code class="text-amber-300 bg-slate-900 px-2 py-0.5 rounded font-mono">npm start</code> ในโฟลเดอร์ <code class="text-brand-300 font-mono">projects/backend</code> หรือยัง</p>
      </div>
    `;
  }
}

/**
 * สร้าง Card โปรเจกต์ลงใน Grid 3 คอลัมน์ + เช็กสิทธิ์แสดงปุ่ม [แก้ไข] [ลบ] เฉพาะเจ้าของ/แอดมิน
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
        <button onclick="resetFilters()" class="text-xs bg-brand-600/20 text-brand-300 border border-brand-500/30 px-3 py-1.5 rounded-lg hover:bg-brand-600/30 transition">
          รีเซ็ตการค้นหา
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';

  projects.forEach(project => {
    // RBAC Check: สมาชิกเจ้าของงาน (req.user.id === project.user_id) หรือ Admin
    const isOwner = currentUser && (currentUser.id === project.user_id);
    const isAdmin = currentUser && (currentUser.role === 'admin');
    const canModify = isOwner || isAdmin;

    const card = document.createElement('div');
    card.className = 'glass-card rounded-2xl overflow-hidden border border-slate-800 project-card flex flex-col justify-between';

    let coverUrl = project.cover_image_url || DEFAULT_COVER_IMAGE;
    if (coverUrl.startsWith('/uploads')) {
      const backendOrigin = (window.location.port === '5000') ? '' : 'http://localhost:5000';
      coverUrl = backendOrigin + coverUrl;
    }

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
          <!-- Tags Badges -->
          <div class="flex flex-wrap gap-1.5">
            ${(project.tags || []).map(t => `<span class="bg-brand-950/60 text-brand-300 text-[10px] px-2 py-0.5 rounded border border-brand-800/40 font-mono">${escapeHtml(t)}</span>`).join('')}
          </div>

          <!-- Title -->
          <h3 class="text-base font-bold text-white hover:text-brand-400 cursor-pointer transition line-clamp-1" onclick="openDetailModal(${project.id})">
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
        <button onclick="openDetailModal(${project.id})" class="text-xs text-brand-400 hover:text-brand-300 font-medium transition flex items-center gap-1">
          รายละเอียด <i class="fa-solid fa-chevron-right text-[10px]"></i>
        </button>

        <!-- แสดงปุ่ม [แก้ไข] และ [ลบ] เฉพาะผู้ที่เป็นเจ้าของงาน หรือ Admin เท่านั้น -->
        <div class="flex items-center space-x-2">
          ${canModify ? `
            <button onclick="openProjectModal(${project.id})" class="w-8 h-8 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 flex items-center justify-center text-xs transition" title="แก้ไขโปรเจกต์">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button onclick="confirmDeleteProject(${project.id})" class="w-8 h-8 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 flex items-center justify-center text-xs transition" title="ลบโปรเจกต์">
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
 * เรนเดอร์ปุ่มสลับหน้า Pagination
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
          ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30' 
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
 * 2. Login / Register Handling
 * ยิง POST /api/auth/login และ /api/auth/register พร้อมจัดเก็บ Token และ User Info ลง localStorage
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
    if (tabLogin) tabLogin.className = 'flex-1 py-2 text-center text-sm font-semibold border-b-2 border-brand-500 text-brand-400 transition';
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
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ (Port 5000)', 'error');
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
 * Create & Edit Project Modal Controls (POST /api/projects และ PUT /api/projects/:id)
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

  // ล้างค่าฟอร์มเดิม
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
 * แสดง Modal รายละเอียดโปรเจกต์แบบเต็ม (Project Detail Popup)
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
        let coverUrl = p.cover_image_url || DEFAULT_COVER_IMAGE;
        if (coverUrl.startsWith('/uploads')) {
          const backendOrigin = (window.location.port === '5000') ? '' : 'http://localhost:5000';
          coverUrl = backendOrigin + coverUrl;
        }
        coverImg.src = coverUrl;
        coverImg.onerror = () => { coverImg.src = DEFAULT_COVER_IMAGE; };
      }

      document.getElementById('detail-title').textContent = p.title;
      document.getElementById('detail-author').textContent = p.author_name || 'Member';
      document.getElementById('detail-date').textContent = `สร้างเมื่อ: ${new Date(p.created_at).toLocaleDateString('th-TH')}`;
      document.getElementById('detail-short-desc').textContent = p.short_description;
      document.getElementById('detail-full-desc').textContent = p.full_description;

      // แท็กประจำโปรเจกต์
      const tagsContainer = document.getElementById('detail-tags');
      if (tagsContainer) {
        tagsContainer.innerHTML = (p.tags || []).map(t => `
          <span class="bg-brand-600/80 text-white text-[11px] px-2.5 py-0.5 rounded-full border border-brand-400/30 backdrop-blur font-mono">${escapeHtml(t)}</span>
        `).join('');
      }

      // ลิงก์ Live Demo และ Source Code GitHub
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

      // เช็กสิทธิ์เพื่อแสดงปุ่ม แก้ไข/ลบ ใน Detail Modal
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
 * DELETE /api/projects/:id พร้อม Confirm Dialog และแนบ Bearer Token
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
 * ฟังก์ชันการแจ้งเตือน Toast Notifications
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
 * ฟังก์ชันกรองและเข้ารหัสอักขระพิเศษสำหรับป้องกัน XSS
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
