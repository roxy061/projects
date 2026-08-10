# 🎓 Department Project Showcase (ระบบจัดเก็บและแสดงผลงานโปรเจกต์ภาควิชา)

โปรเจกต์เว็บแอปพลิเคชันแบบ **Full-Stack Single-Page Application (SPA)** สมบูรณ์แบบ สำหรับจัดเก็บ ค้นหา และนำเสนอผลงานวิชาการ/โปรเจกต์ของนิสิตนักศึกษาภาควิชา

---

## 🛠️ Tech Stack & Architecture

- **Backend**: Node.js, Express.js, JWT Authentication, bcryptjs (Password Hashing), Multer (Image Upload), CORS, `mysql2/promise`
- **Database**: MariaDB / MySQL
- **Frontend**: HTML5, Tailwind CSS (Dark Mode: `bg-slate-950`), FontAwesome 6 Icons, Vanilla JavaScript (Fetch API)
- **Architecture**: Responsive Single-Page Application (SPA)

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```
projects/
├── backend/
│   ├── server.js            # Express.js Server & RESTful API Routes
│   ├── database.sql         # SQL DDL & Seed Data (ตาราง users, projects)
│   ├── package.json         # Node.js dependencies
│   ├── .env                 # การตั้งค่าพอร์ต และรหัสผ่านฐานข้อมูล
│   └── uploads/             # โฟลเดอร์จัดเก็บรูปภาพปกที่อัปโหลด
├── frontend/
│   ├── index.html           # หน้าเว็บหลัก SPA (Navbar, Hero, Grid, Modals)
│   └── js/
│       └── app.js           # Logic ทั้งหมดของ Frontend (Fetch API, Auth, CRUD)
└── README.md                # เอกสารคู่มือการใช้งานและพัฒนาต่อ
```

---

## 🚀 ขั้นตอนการเปิดใช้งานใน Visual Studio Code (Setup Instructions)

### 1️⃣ การจัดเตรียมฐานข้อมูล MariaDB / MySQL

1. เปิด **XAMPP Control Panel** (หรือ MySQL Server) แล้วกด **Start** ที่บริการ **MySQL** และ **Apache**
2. เปิดเบราว์เซอร์ไปที่ `http://localhost/phpmyadmin` (หรือเครื่องมือจัดการ MySQL เช่น DBeaver / HeidiSQL)
3. ไปที่เมนู **Import (นำเข้า)**
4. เลือกไฟล์ `backend/database.sql` จากโฟลเดอร์โปรเจกต์ แล้วกด **Go (ปฏิบัติตาม)**
5. ฐานข้อมูลชื่อ `department_projects` พร้อมตาราง `users`, `projects` และข้อมูลตัวอย่างจะถูกสร้างโดยอัตโนมัติ

---

### 2️⃣ การติดตั้ง Dependencies และสั่งรัน Backend Server

1. เปิดโปรเจกต์นี้ใน **Visual Studio Code**
2. เปิด Terminal ใน VS Code (`Ctrl + ~` หรือ `Ctrl + \``)
3. ไปที่โฟลเดอร์ `backend`:
   ```bash
   cd backend
   ```
4. ติดตั้งแพ็กเกจ (ถ้ายังไม่ได้ติดตั้ง):
   ```bash
   npm install
   ```
5. ตรวจสอบไฟล์ `backend/.env` ว่าตรงกับการตั้งค่า MySQL ของคุณหรือไม่:
   ```env
   PORT=5000
   DB_HOST=127.0.0.1
   DB_USER=admin
   DB_PASS=admin123
   DB_NAME=department_projects
   DB_PORT=3306
   JWT_SECRET=department_showcase_super_secret_key_2026
   ```
6. สั่งรันเซิร์ฟเวอร์:
   ```bash
   npm start
   ```
   *หรือสั่งรันโหมดพัฒนา (Auto-reload):*
   ```bash
   npm run dev
   ```

---

### 3️⃣ เข้าใช้งานหน้าเว็บ (Access Web Application)

เปิดเว็บเบราว์เซอร์ไปที่:
👉 **[http://localhost:5000](http://localhost:5000)**

*(ระบบตั้งค่า Static File Serving ชี้ไปยังโฟลเดอร์ `frontend/` ให้เปิดเข้าใช้งานได้โดยตรงทันที)*

---

## 🔑 บัญชีผู้ใช้ทดสอบในระบบ (Seed Test Accounts)

| บทบาท (Role) | ชื่อผู้ใช้ (Username) | รหัสผ่าน (Password) | สิทธิ์การใช้งาน |
| :--- | :--- | :--- | :--- |
| **Admin** (ผู้ดูแลระบบ) | `admin` | `password123` | ดู เพิ่ม แก้ไข และลบได้ทุกผลงานในระบบ |
| **Student** (นักศึกษา 1) | `student1` | `password123` | ดู เพิ่ม และแก้ไข/ลบ ได้เฉพาะผลงานของตนเอง |
| **Student** (นักศึกษา 2) | `student2` | `password123` | ดู เพิ่ม และแก้ไข/ลบ ได้เฉพาะผลงานของตนเอง |

---

## 📌 ฟีเจอร์หลักในระบบ (Key Features)

1. **Sticky Glassmorphism Navbar**: เมนูหลักสไตล์กระจกใส ยึดติดขอบบน พร้อมช่องค้นหาด่วน และเมนูโปรไฟล์
2. **Offline Banner Notification**: แถบแจ้งเตือนสีแดงเตือนลอยด้านบน หากเซิร์ฟเวอร์ Backend (Port 5000) ไม่ได้รันอยู่ พร้อมปุ่มลองเชื่อมต่อใหม่
3. **Hero Section & Dynamic Statistics**: ส่วนต้อนรับพร้อมสรุปสถิติผลงานทั้งหมด จำนวนหมวดหมู่แท็ก และจำนวนผู้สร้างสรรค์
4. **Realtime Search & Tag Filter**: ค้นหาตามชื่อ คำอธิบาย แท็ก และกรองผลงานตามแท็กยอดนิยม (#Web, #IoT, #AI, #Mobile)
5. **Responsive Grid Layout**: การ์ดแสดงโปรเจกต์แบบ 3 คอลัมน์ที่รองรับทั้ง มือถือ แท็บเล็ต และเดสก์ท็อป
6. **JWT Authentication & Permission Guards**:
   - สมัครสมาชิก และเข้าสู่ระบบด้วย JWT Token
   - สิทธิ์ Permission Guard: แสดงปุ่ม `[แก้ไข]` และ `[ลบ]` บนการ์ดเฉพาะผลงานที่เป็นของตนเอง หรือมีสิทธิ์ Admin เท่านั้น
7. **Cover Image Upload & Link Support**: รองรับทั้งการใส่อัปโหลดไฟล์รูปภาพปกผ่าน Multer หรือวาง URL ลิงก์รูปภาพ
8. **Project Details Modal**: ป็อปอัปแสดงรายละเอียดผลงานฉบับเต็ม พร้อมปุ่มลิงก์ไปยัง Live Demo และ GitHub Repository
