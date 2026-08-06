<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Department Project Hub - ระบบจัดเก็บและแชร์โปรเจกต์ประจำแผนก</title>
    <meta name="description" content="ศูนย์กลางจัดเก็บ แสดงผลงาน และแชร์โปรเจกต์ซอฟต์แวร์สำหรับคนในแผนก รองรับการสืบค้นและบริหารจัดการโปรเจกต์">
    
    <!-- Google Fonts & FontAwesome -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Custom Style System -->
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

    <!-- Sticky Navigation Bar -->
    <nav class="navbar">
        <a href="index.php" class="brand">
            <i class="fas fa-cubes"></i>
            <span>Dept Project Hub</span>
        </a>
        <div class="nav-controls" id="auth-nav-container">
            <!-- Rendered dynamically by app.js -->
            <button onclick="openAuthModal('login')" class="btn btn-secondary btn-sm">
                <i class="fas fa-sign-in-alt"></i> เข้าสู่ระบบ
            </button>
            <button onclick="openAuthModal('register')" class="btn btn-primary btn-sm">
                <i class="fas fa-user-plus"></i> สมัครสมาชิก
            </button>
        </div>
    </nav>

    <!-- Main Content Container -->
    <main class="container">
        
        <!-- Hero Section -->
        <section class="hero">
            <h1>ศูนย์รวมผลงาน & โปรเจกต์ประจำแผนก</h1>
            <p>คลังจัดเก็บข้อมูลระบบ แอปพลิเคชัน และผลงานนวัตกรรมของบุคลากรและนักศึกษาเพื่อการแลกเปลี่ยนเรียนรู้</p>
        </section>

        <!-- Search & Filter Controls -->
        <section class="filter-bar">
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" id="search-input" placeholder="ค้นหาตามชื่อโปรเจกต์, Tech Stack หรือชื่อผู้พัฒนา...">
            </div>

            <div class="category-tabs">
                <button class="tab-btn active" data-category="All">ทั้งหมด</button>
                <button class="tab-btn" data-category="Web Application">Web Application</button>
                <button class="tab-btn" data-category="Mobile Application">Mobile Application</button>
                <button class="tab-btn" data-category="AI & Machine Learning">AI & Machine Learning</button>
                <button class="tab-btn" data-category="IoT & Embedded">IoT & Embedded</button>
            </div>
        </section>

        <!-- Projects Grid -->
        <section class="projects-grid" id="projects-grid">
            <!-- Dynamic project cards loaded via AJAX -->
        </section>

    </main>

    <!-- Toast Alerts Container -->
    <div id="toast-container"></div>

    <!-- ============================================================
         MODAL 1: Authentication (Login / Register)
         ============================================================ -->
    <div class="modal-backdrop" id="auth-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title" id="auth-modal-title">เข้าสู่ระบบสมาชิก</h3>
                <button class="close-btn" onclick="closeModal('auth-modal')">&times;</button>
            </div>

            <!-- Login Form -->
            <div id="login-form-container">
                <form onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label for="login-username">ชื่อผู้ใช้งาน (Username) หรือ อีเมล</label>
                        <input type="text" name="username" id="login-username" class="form-control" required placeholder="เช่น somchai_dev">
                    </div>
                    <div class="form-group">
                        <label for="login-password">รหัสผ่าน (Password)</label>
                        <input type="password" name="password" id="login-password" class="form-control" required placeholder="••••••••">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center;">
                        <i class="fas fa-sign-in-alt"></i> ยืนยันเข้าสู่ระบบ
                    </button>
                </form>
                <p style="margin-top:1rem; font-size:0.88rem; color:var(--text-muted); text-align:center;">
                    ยังไม่มีบัญชีสมาชิก? <a href="#" onclick="openAuthModal('register')" style="color:var(--primary);">สมัครสมาชิกที่นี่</a>
                </p>
            </div>

            <!-- Register Form -->
            <div id="register-form-container" style="display:none;">
                <form onsubmit="handleRegister(event)">
                    <div class="form-group">
                        <label for="reg-fullname">ชื่อ-นามสกุล</label>
                        <input type="text" name="full_name" id="reg-fullname" class="form-control" required placeholder="เช่น นายสมชาย สายโค้ด">
                    </div>
                    <div class="form-group">
                        <label for="reg-username">ชื่อผู้ใช้งาน (Username)</label>
                        <input type="text" name="username" id="reg-username" class="form-control" required placeholder="ภาษาอังกฤษ เช่น somchai_dev">
                    </div>
                    <div class="form-group">
                        <label for="reg-email">อีเมล (Email)</label>
                        <input type="email" name="email" id="reg-email" class="form-control" required placeholder="somchai@nvc.ac.th">
                    </div>
                    <div class="form-group">
                        <label for="reg-department">แผนก / สาขาวิชา</label>
                        <select name="department" id="reg-department" class="form-control">
                            <option value="แผนกเทคโนโลยีสารสนเทศ">แผนกเทคโนโลยีสารสนเทศ</option>
                            <option value="แผนกคอมพิวเตอร์ธุรกิจ">แผนกคอมพิวเตอร์ธุรกิจ</option>
                            <option value="แผนกอิเล็กทรอนิกส์">แผนกอิเล็กทรอนิกส์</option>
                            <option value="แผนกไฟฟ้ากำลัง">แผนกไฟฟ้ากำลัง</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="reg-password">รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)</label>
                        <input type="password" name="password" id="reg-password" class="form-control" required minlength="6" placeholder="••••••••">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center;">
                        <i class="fas fa-user-plus"></i> ยืนยันการสมัครสมาชิก
                    </button>
                </form>
                <p style="margin-top:1rem; font-size:0.88rem; color:var(--text-muted); text-align:center;">
                    มีบัญชีอยู่แล้ว? <a href="#" onclick="openAuthModal('login')" style="color:var(--primary);">เข้าสู่ระบบ</a>
                </p>
            </div>
        </div>
    </div>

    <!-- ============================================================
         MODAL 2: Add / Edit Project Form
         ============================================================ -->
    <div class="modal-backdrop" id="project-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title" id="project-modal-title">อัปโหลด / แชร์โปรเจกต์ใหม่</h3>
                <button class="close-btn" onclick="closeModal('project-modal')">&times;</button>
            </div>
            
            <form id="project-form" onsubmit="handleProjectSubmit(event)">
                <input type="hidden" name="project_id" id="form-project-id">
                
                <div class="form-group">
                    <label for="proj-title">ชื่อโปรเจกต์ / ระบบงาน *</label>
                    <input type="text" name="title" id="proj-title" class="form-control" required placeholder="เช่น ระบบบริหารจัดการคลังอุปกรณ์">
                </div>

                <div class="form-group">
                    <label for="proj-category">หมวดหมู่โปรเจกต์ *</label>
                    <select name="category" id="proj-category" class="form-control" required>
                        <option value="Web Application">Web Application</option>
                        <option value="Mobile Application">Mobile Application</option>
                        <option value="AI & Machine Learning">AI & Machine Learning</option>
                        <option value="IoT & Embedded">IoT & Embedded</option>
                        <option value="Other">อื่นๆ</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="proj-desc">รายละเอียดโปรเจกต์ *</label>
                    <textarea name="description" id="proj-desc" class="form-control" required placeholder="อธิบายวัตถุประสงค์ ฟีเจอร์เด่น และการใช้งานของโปรเจกต์..."></textarea>
                </div>

                <div class="form-group">
                    <label for="proj-tech">Tech Stack (คั่นด้วยเครื่องหมายจุลภาค ,) *</label>
                    <input type="text" name="tech_stack" id="proj-tech" class="form-control" required placeholder="เช่น PHP, MariaDB, Vue.js, TailwindCSS">
                </div>

                <div class="form-group">
                    <label for="proj-github">GitHub Repository URL (ถ้ามี)</label>
                    <input type="url" name="github_url" id="proj-github" class="form-control" placeholder="https://github.com/username/repository">
                </div>

                <div class="form-group">
                    <label for="proj-demo">Live Demo / Website URL (ถ้ามี)</label>
                    <input type="url" name="demo_url" id="proj-demo" class="form-control" placeholder="https://myproject.nvc.ac.th">
                </div>

                <div class="form-group">
                    <label for="proj-image">URL รูปภาพตัวอย่าง / Cover Image</label>
                    <input type="url" name="image_url" id="proj-image" class="form-control" placeholder="https://images.unsplash.com/photo-1517694712202-14dd9538aa97">
                </div>

                <div style="display:flex; gap:0.75rem; justify-content:flex-end; margin-top:1.5rem;">
                    <button type="button" onclick="closeModal('project-modal')" class="btn btn-secondary">ยกเลิก</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> บันทึกข้อมูล
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- ============================================================
         MODAL 3: View Project Details
         ============================================================ -->
    <div class="modal-backdrop" id="detail-modal">
        <div class="modal-content" style="max-width:680px;">
            <div class="modal-header">
                <h3 class="modal-title">รายละเอียดโปรเจกต์</h3>
                <button class="close-btn" onclick="closeModal('detail-modal')">&times;</button>
            </div>
            <div id="detail-modal-body">
                <!-- Rendered dynamically -->
            </div>
        </div>
    </div>

    <!-- JavaScript Application Logic -->
    <script src="assets/js/app.js"></script>
</body>
</html>
