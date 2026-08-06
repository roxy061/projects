# 📚 PROJECT.LOG - คลังจัดเก็บและแสดงผลงานโปรเจกต์นักศึกษา

ระบบ Full-Stack Web Application สำหรับจัดเก็บ ค้นหา และแสดงผลงานโปรเจกต์ของนักศึกษา (Projects Archive & Showcase System) พร้อมระบบสมาชิก, หน้า Dashboard สำหรับแอดมิน, และหน้า Audit ความพร้อมของเซิร์ฟเวอร์

## ✨ ฟีเจอร์หลัก (Key Features)

### 1. ระบบจัดการผู้ใช้ (Authentication & Authorization)
- **ระบบสลับฟอร์ม (Tabs):** ล็อกอินและสมัครสมาชิกในหน้าเดียว (`login.html`)
- **การตรวจสอบข้อมูล:** ตรวจสอบรหัสผ่านตรงกัน, เช็กชื่อผู้ใช้/อีเมลซ้ำแบบ Real-time
- **ระบบกู้คืนบัญชี:** ระบบ OTP ลืมรหัสผ่านผ่านอีเมล
- **Guest Access:** บุคคลทั่วไปสามารถเข้าชมผลงานได้โดยไม่ต้องสมัครสมาชิก

### 2. คลังผลงาน (Archive & Showcase)
- **Real-time Search:** ค้นหาโปรเจกต์จากชื่อ, เทคโนโลยี, และรายละเอียดได้ทันที (`index.html`)
- **Filter System:** กรองตามระดับชั้น (ปวช. - ปวส.) และหมวดหมู่ (IoT, Software)
- **Project Detail Modal:** คลิกการ์ดเพื่อดูรายละเอียดฉบับเต็ม พร้อมรูปภาพและไดอะแกรม
- **Secure Submission:** ระบบยื่นส่งโปรเจกต์เฉพาะผู้ที่ล็อกอินแล้วเท่านั้น (สถานะ Pending)

### 3. ระบบผู้ดูแลระบบ (Admin Dashboard)
- **Project Approval:** แอดมินสามารถอนุมัติ (Approve) หรือปฏิเสธ (Reject/Delete) โปรเจกต์ที่ถูกส่งเข้ามา
- **No-Code UI Configurator:** ปรับเปลี่ยนชื่อแบรนด์, ข้อความ Hero, และธีมสี (Emerald, Cyberpunk, TechBlue) ได้ทันทีโดยไม่ต้องแก้โค้ด

### 4. ระบบเช็กเซิร์ฟเวอร์ (Server Audit)
- หน้า `checklist.html` สำหรับให้คะแนน/ตรวจสอบความพร้อมของเซิร์ฟเวอร์ เช่น Nginx, MariaDB, SSL/UFW, และระบบ Auto Backup

---

## 💻 เทคโนโลยีที่ใช้ (Tech Stack)

- **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript, Lucide Icons
- **Backend:** PHP (API Structure)
- **Database:** MariaDB (MySQL)
- **Architecture:** Client-Server, RESTful-like API, SPA-feel (Single Page Application via Fetch)

---

## 🚀 คู่มือการติดตั้ง (Installation Guide)

### 1. การเตรียมฐานข้อมูล (Database Setup)
1. เปิด XAMPP และ Start `Apache` + `MySQL`
2. เข้าสู่ `http://localhost/phpmyadmin`
3. สร้างฐานข้อมูลใหม่ชื่อ `project_log_db`
4. นำเข้าไฟล์ `schema.sql` (Import) เพื่อสร้างตารางและบัญชีแอดมินเริ่มต้น
   - **บัญชีแอดมินเริ่มต้น:** `admin` / รหัสผ่าน: `password123`

### 2. การตั้งค่า Backend (PHP API)
1. ตรวจสอบไฟล์ `api.php` ว่าการตั้งค่าเชื่อมต่อฐานข้อมูลตรงกับเครื่องของคุณ:
   ```php
   $host = '127.0.0.1';
   $db = 'project_log_db';
   $user = 'root';
   $pass = ''; // เปลี่ยนหากตั้งรหัสผ่านไว้
   ```

### 3. การรันระบบ (Running the Application)
1. นำโฟลเดอร์โปรเจกต์ทั้งหมดไปวางไว้ใน `C:\xampp\htdocs\projects\`
2. เปิดเว็บเบราว์เซอร์ไปที่ `http://localhost/projects/login.html`
3. สามารถทดลองเข้าใช้งานในฐานะบุคคลทั่วไป, สมัครสมาชิกใหม่, หรือล็อกอินด้วยบัญชีแอดมินได้ทันที

---

## 🗂️ โครงสร้างไฟล์ (File Structure)

- `login.html` - หน้าต่างเข้าสู่ระบบและสมัครสมาชิก
- `index.html` - หน้าหลักสำหรับแสดงผล ค้นหา กรอง และส่งโปรเจกต์
- `admin.html` - แดชบอร์ดผู้ดูแลระบบ จัดการการอนุมัติและตั้งค่า UI
- `checklist.html` - หน้าตรวจสอบเซิร์ฟเวอร์ (Audit)
- `api.php` - สมองหลักฝั่งหลังบ้าน (Backend API) รองรับทุก Request
- `schema.sql` - ไฟล์โครงสร้างฐานข้อมูล
- `server_config_examples.md` - ตัวอย่างโค้ดการทำ Nginx Reverse Proxy & CORS

---
*พัฒนาเพื่อเป็นระบบจัดการผลงานวิชาการและโปรเจกต์จบที่สมบูรณ์แบบ* 🎓
