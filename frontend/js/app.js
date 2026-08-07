// frontend/js/app.js

// --- 1. Dynamic API Base URL Setup ---
const determineApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // If opening via file:// protocol (direct file open)
  if (protocol === 'file:') {
    return 'http://localhost:5000/api';
  }
  
  // If running via Live Server (port 5500, etc) or frontend dev server
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // If the port is not 5000 (meaning it's a separate dev server), point to backend port 5000
    if (window.location.port !== '5000') {
      return 'http://localhost:5000/api';
    }
  }
  
  // Default for production or same-origin deployment
  return '/api';
};

const API_BASE_URL = determineApiBaseUrl();

// --- 2. Global State ---
let state = {
  currentUser: null,
  jwtToken: localStorage.getItem('token') || null,
  projects: [],
  tags: [],
  layout: [],
  pagination: {
    page: 1,
    limit: 9,
    total: 0,
    totalPages: 0
  },
  filters: {
    search: '',
    tag: ''
  }
};

// --- 3. Utility Functions ---
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = { ...options.headers };
  
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (state.jwtToken) {
    headers['Authorization'] = `Bearer ${state.jwtToken}`;
  }

  try {
    const response = await fetch(url, { ...options, headers });
    
    // Handle unauthorized
    if (response.status === 401) {
      logout(false);
      throw new Error('Unauthorized or token expired.');
    }
    
    return response;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

function showToast(message, type = 'success') {
  // Simple toast implementation (can be improved)
  alert(`${type.toUpperCase()}: ${message}`);
}

// --- 4. Authentication ---
async function checkAuth() {
  if (!state.jwtToken) return false;
  
  try {
    const res = await fetchAPI('/auth/me');
    if (res.ok) {
      const data = await res.json();
      state.currentUser = data.user;
      updateAuthUI();
      return true;
    } else {
      logout(false);
      return false;
    }
  } catch (e) {
    return false;
  }
}

function updateAuthUI() {
  const authContainer = document.getElementById('auth-buttons');
  const userMenu = document.getElementById('user-menu');
  const userNameDisplay = document.getElementById('user-name-display');
  const createProjectBtn = document.getElementById('create-project-btn');
  const adminPanelLink = document.getElementById('admin-panel-link');
  
  if (state.currentUser) {
    if (authContainer) authContainer.classList.add('hidden');
    if (userMenu) userMenu.classList.remove('hidden');
    if (userNameDisplay) userNameDisplay.textContent = state.currentUser.name;
    if (createProjectBtn) createProjectBtn.classList.remove('hidden');
    
    if (state.currentUser.role === 'admin') {
      if (adminPanelLink) adminPanelLink.classList.remove('hidden');
    } else {
      if (adminPanelLink) adminPanelLink.classList.add('hidden');
    }
  } else {
    if (authContainer) authContainer.classList.remove('hidden');
    if (userMenu) userMenu.classList.add('hidden');
    if (createProjectBtn) createProjectBtn.classList.add('hidden');
    if (adminPanelLink) adminPanelLink.classList.add('hidden');
  }
}

function logout(showAlert = true) {
  localStorage.removeItem('token');
  state.jwtToken = null;
  state.currentUser = null;
  updateAuthUI();
  fetchProjects(); // Refresh to hide edit/delete buttons
  if (showAlert) showToast('Logged out successfully', 'success');
}

// --- 5. Data Fetching ---
async function fetchLayout() {
  try {
    const res = await fetchAPI('/layout');
    if (res.ok) {
      const data = await res.json();
      state.layout = data.layout;
      renderLayout();
    }
  } catch (e) {
    console.error('Failed to fetch layout');
  }
}

async function fetchTags() {
  try {
    const res = await fetchAPI('/projects/tags');
    if (res.ok) {
      state.tags = await res.json();
      renderTagsFilter();
    }
  } catch (e) {
    console.error('Failed to fetch tags');
  }
}

async function fetchProjects(page = 1) {
  try {
    state.pagination.page = page;
    let url = `/projects?page=${page}&limit=${state.pagination.limit}`;
    if (state.filters.search) url += `&search=${encodeURIComponent(state.filters.search)}`;
    if (state.filters.tag) url += `&tag=${encodeURIComponent(state.filters.tag)}`;
    
    const res = await fetchAPI(url);
    if (res.ok) {
      const data = await res.json();
      state.projects = data.projects;
      state.pagination = data.pagination;
      renderProjects();
      renderPagination();
    }
  } catch (e) {
    console.error('Failed to fetch projects');
  }
}

// --- 6. UI Rendering ---
function renderLayout() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;
  
  // Reorder sections based on layout
  state.layout.forEach(item => {
    if (item.visible) {
      const sectionEl = document.getElementById(`${item.id}-section`);
      if (sectionEl) {
        sectionEl.style.display = 'block';
        mainContent.appendChild(sectionEl); // Moves to end, effectively ordering
      }
    } else {
      const sectionEl = document.getElementById(`${item.id}-section`);
      if (sectionEl) sectionEl.style.display = 'none';
    }
  });
}

function renderTagsFilter() {
  const container = document.getElementById('tags-filter-container');
  if (!container) return;
  
  container.innerHTML = `
    <button class="tag-pill active px-4 py-2 rounded-full border border-slate-700 bg-slate-800 text-sm font-medium hover:bg-slate-700 transition" data-tag="">All</button>
  `;
  
  state.tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = `tag-pill px-4 py-2 rounded-full border border-slate-700 bg-slate-800 text-sm font-medium hover:bg-slate-700 transition`;
    btn.dataset.tag = tag.name;
    btn.textContent = tag.name;
    if (state.filters.tag === tag.name) {
      btn.classList.add('bg-brand-600', 'border-brand-500', 'text-white');
      btn.classList.remove('bg-slate-800', 'border-slate-700');
    }
    container.appendChild(btn);
  });
}

function renderProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  if (state.projects.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center text-slate-400 py-10">No projects found.</div>`;
    return;
  }
  
  state.projects.forEach(project => {
    const card = document.createElement('div');
    card.className = 'project-card bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-brand-500 transition duration-300 flex flex-col group';
    
    // Auth Check for Edit/Delete
    const isOwner = state.currentUser && state.currentUser.id === project.user_id;
    const isAdmin = state.currentUser && state.currentUser.role === 'admin';
    const canEdit = isOwner || isAdmin;
    
    let actionButtons = '';
    if (canEdit) {
      actionButtons = `
        <div class="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition">
          <button class="edit-project-btn bg-blue-600/80 hover:bg-blue-600 text-white p-2 rounded-lg backdrop-blur-sm" data-id="${project.id}" title="Edit">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="delete-project-btn bg-red-600/80 hover:bg-red-600 text-white p-2 rounded-lg backdrop-blur-sm" data-id="${project.id}" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      `;
    }

    const coverUrl = project.cover_image ? `${API_BASE_URL.replace('/api', '')}${project.cover_image}` : 'https://via.placeholder.com/600x400?text=No+Image';

    card.innerHTML = `
      <div class="relative h-48 overflow-hidden">
        <img src="${coverUrl}" alt="${project.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
        ${actionButtons}
      </div>
      <div class="p-5 flex-grow flex flex-col">
        <div class="flex justify-between items-start mb-2">
          <h3 class="text-xl font-bold text-white leading-tight cursor-pointer hover:text-brand-400 view-project-btn" data-id="${project.id}">${project.title}</h3>
        </div>
        <p class="text-slate-400 text-sm mb-4 flex-grow line-clamp-3">${project.description}</p>
        <div class="flex flex-wrap gap-2 mb-4">
          ${(project.tags || []).map(t => `<span class="text-xs bg-slate-800 text-brand-300 px-2 py-1 rounded-md border border-slate-700">${t}</span>`).join('')}
        </div>
        <div class="flex justify-between items-center text-xs text-slate-500 mt-auto pt-4 border-t border-slate-800">
          <span><i class="fa-regular fa-user mr-1"></i> ${project.author_name}</span>
          <span><i class="fa-regular fa-calendar mr-1"></i> ${new Date(project.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderPagination() {
  const container = document.getElementById('pagination-container');
  if (!container) return;
  
  container.innerHTML = '';
  const { page, totalPages } = state.pagination;
  
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `px-3 py-1 rounded-md border transition ${i === page ? 'bg-brand-600 border-brand-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`;
    btn.textContent = i;
    btn.onclick = () => fetchProjects(i);
    container.appendChild(btn);
  }
}

// --- 7. Event Listeners & Modals ---
function setupEventListeners() {
  // Auth Modal
  const loginModal = document.getElementById('login-modal');
  const loginBtn = document.getElementById('login-btn');
  const closeLoginBtn = document.getElementById('close-login-modal');
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');
  const loginForm = document.getElementById('login-form-container');
  const registerForm = document.getElementById('register-form-container');

  if (loginBtn) loginBtn.onclick = () => loginModal.classList.remove('hidden');
  if (closeLoginBtn) closeLoginBtn.onclick = () => loginModal.classList.add('hidden');
  if (showRegister) showRegister.onclick = (e) => { e.preventDefault(); loginForm.classList.add('hidden'); registerForm.classList.remove('hidden'); };
  if (showLogin) showLogin.onclick = (e) => { e.preventDefault(); registerForm.classList.add('hidden'); loginForm.classList.remove('hidden'); };

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.onclick = (e) => { e.preventDefault(); logout(); };

  // Search & Filter
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  
  if (searchBtn) {
    searchBtn.onclick = () => {
      state.filters.search = searchInput.value;
      fetchProjects(1);
    };
  }
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        state.filters.search = searchInput.value;
        fetchProjects(1);
      }
    });
  }

  // Tag Filtering Delegation
  const tagsContainer = document.getElementById('tags-filter-container');
  if (tagsContainer) {
    tagsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('tag-pill')) {
        document.querySelectorAll('.tag-pill').forEach(btn => {
          btn.classList.remove('bg-brand-600', 'border-brand-500', 'text-white');
          btn.classList.add('bg-slate-800', 'border-slate-700');
        });
        e.target.classList.add('bg-brand-600', 'border-brand-500', 'text-white');
        e.target.classList.remove('bg-slate-800', 'border-slate-700');
        
        state.filters.tag = e.target.dataset.tag;
        fetchProjects(1);
      }
    });
  }

  // Project Modal
  const projectModal = document.getElementById('project-modal');
  const closeProjectModal = document.getElementById('close-project-modal');
  const createProjectBtn = document.getElementById('create-project-btn');
  
  if (createProjectBtn) {
    createProjectBtn.onclick = () => {
      document.getElementById('project-form').reset();
      document.getElementById('project-id').value = '';
      document.getElementById('modal-title').textContent = 'Create New Project';
      projectModal.classList.remove('hidden');
    };
  }
  if (closeProjectModal) {
    closeProjectModal.onclick = () => projectModal.classList.add('hidden');
  }

  // Project Actions Delegation (Edit/Delete/View)
  const projectsGrid = document.getElementById('projects-grid');
  if (projectsGrid) {
    projectsGrid.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('.edit-project-btn');
      const deleteBtn = e.target.closest('.delete-project-btn');
      const viewBtn = e.target.closest('.view-project-btn');
      
      if (editBtn) {
        const id = editBtn.dataset.id;
        openEditModal(id);
      } else if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (confirm('Are you sure you want to delete this project?')) {
          await deleteProject(id);
        }
      } else if (viewBtn) {
        // Implement view details if needed, or redirect
        console.log('View project', viewBtn.dataset.id);
      }
    });
  }

  setupForms();
}

function setupForms() {
  // Login Submit
  const loginFormEl = document.getElementById('login-form');
  if (loginFormEl) {
    loginFormEl.onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      
      try {
        const res = await fetchAPI('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (res.ok) {
          localStorage.setItem('token', data.token);
          state.jwtToken = data.token;
          await checkAuth();
          document.getElementById('login-modal').classList.add('hidden');
          showToast('Logged in successfully');
        } else {
          showToast(data.message || 'Login failed', 'error');
        }
      } catch (err) {
        showToast('Network error during login', 'error');
      }
    };
  }

  // Register Submit
  const registerFormEl = document.getElementById('register-form');
  if (registerFormEl) {
    registerFormEl.onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      
      try {
        const res = await fetchAPI('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        
        if (res.ok) {
          showToast('Registration successful! Please login.');
          document.getElementById('show-login').click(); // Switch to login tab
        } else {
          showToast(data.message || 'Registration failed', 'error');
        }
      } catch (err) {
        showToast('Network error during registration', 'error');
      }
    };
  }

  // Project Submit
  const projectForm = document.getElementById('project-form');
  if (projectForm) {
    projectForm.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(projectForm);
      const id = document.getElementById('project-id').value;
      
      // Formatting tags (split by comma)
      const tagsString = formData.get('tags');
      const tagsArray = tagsString.split(',').map(t => t.trim()).filter(t => t);
      
      // We'll append them back or send as is, but formData needs to handle array properly.
      // Easiest is to send the string and let backend handle, or JSON.
      // Our backend handles `tags` if it's JSON or array. Wait, let's send as JSON string if sending multipart?
      // Since it's multipart/form-data, we can just send the string. The backend can parse it.
      
      try {
        let res;
        if (id) {
          // Update
          res = await fetchAPI(`/projects/${id}`, {
            method: 'PUT',
            body: formData // Using FormData for file upload
          });
        } else {
          // Create
          res = await fetchAPI('/projects', {
            method: 'POST',
            body: formData
          });
        }
        
        if (res.ok) {
          document.getElementById('project-modal').classList.add('hidden');
          showToast(`Project ${id ? 'updated' : 'created'} successfully`);
          fetchProjects(state.pagination.page);
          fetchTags();
        } else {
          const data = await res.json();
          showToast(data.message || 'Error saving project', 'error');
        }
      } catch (err) {
        showToast('Network error while saving project', 'error');
      }
    };
  }
}

async function openEditModal(id) {
  try {
    const res = await fetchAPI(`/projects/${id}`);
    if (res.ok) {
      const project = await res.json();
      document.getElementById('project-id').value = project.id;
      document.getElementById('title').value = project.title;
      document.getElementById('description').value = project.description;
      document.getElementById('content').value = project.content;
      document.getElementById('github_url').value = project.github_url || '';
      document.getElementById('demo_url').value = project.demo_url || '';
      document.getElementById('tags').value = (project.tags || []).join(', ');
      
      document.getElementById('modal-title').textContent = 'Edit Project';
      document.getElementById('project-modal').classList.remove('hidden');
    }
  } catch (err) {
    showToast('Failed to load project details', 'error');
  }
}

async function deleteProject(id) {
  try {
    const res = await fetchAPI(`/projects/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Project deleted');
      fetchProjects(state.pagination.page);
    } else {
      const data = await res.json();
      showToast(data.message || 'Error deleting project', 'error');
    }
  } catch (err) {
    showToast('Network error during deletion', 'error');
  }
}

// --- 8. Initialization ---
async function init() {
  await checkAuth();
  await fetchLayout();
  await fetchTags();
  await fetchProjects(1);
  setupEventListeners();
}

// Boot up
document.addEventListener('DOMContentLoaded', init);
