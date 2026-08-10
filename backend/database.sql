-- ============================================================
-- Database Schema for Department Project Showcase
-- Database: MariaDB / MySQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS `department_projects` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `department_projects`;
SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Table structure for `users`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `projects`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `fullname` VARCHAR(100) NOT NULL,
  `role` ENUM('admin', 'student') NOT NULL DEFAULT 'student',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for `projects`
-- ------------------------------------------------------------
CREATE TABLE `projects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `short_description` TEXT NOT NULL,
  `full_description` LONGTEXT NOT NULL,
  `cover_image` VARCHAR(255) DEFAULT NULL,
  `demo_url` VARCHAR(255) DEFAULT NULL,
  `github_url` VARCHAR(255) DEFAULT NULL,
  `tags` VARCHAR(255) DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_projects_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Seed Data (ข้อมูลเริ่มต้นสำหรับทดสอบ)
-- บัญชีผู้ใช้:
-- 1. Admin: admin / password123
-- 2. Student: student1 / password123
-- 3. Student: student2 / password123
-- ------------------------------------------------------------

INSERT INTO `users` (`id`, `username`, `password`, `fullname`, `role`) VALUES
(1, 'admin', '$2a$10$Yw7.rCHo2Ak6TrOdWDCndeAIBkFOrH32bWCwPeUdfIVAY4KEJHBHW', 'ผู้ดูแลระบบ (Admin User)', 'admin'),
(2, 'student1', '$2a$10$Yw7.rCHo2Ak6TrOdWDCndeAIBkFOrH32bWCwPeUdfIVAY4KEJHBHW', 'สมชาย ใจดี (Student)', 'student'),
(3, 'student2', '$2a$10$Yw7.rCHo2Ak6TrOdWDCndeAIBkFOrH32bWCwPeUdfIVAY4KEJHBHW', 'วิภาวี สุขเสริฐ (Student)', 'student');

INSERT INTO `projects` (`id`, `user_id`, `title`, `short_description`, `full_description`, `cover_image`, `demo_url`, `github_url`, `tags`) VALUES
(1, 2, 'Smart Greenhouse IoT System', 'ระบบฟาร์มอัจฉริยะควบคุมการรดน้ำ อุณหภูมิ และความชื้นผ่านบอร์ด ESP32 และ Mobile App', 'ระบบ Smart Greenhouse IoT เป็นโปรเจกต์จบที่พัฒนาร่วมกับภาควิชาวิศวกรรมคอมพิวเตอร์และเกษตรศาสตร์ โดยใช้บอร์ด ESP32 เชื่อมต่อเซนเซอร์ DHT22, Soil Moisture Sensor ส่งข้อมูลเข้าสู่ MQTT Broker และแสดงผลผ่าน Dashboard บน Mobile App นิสิตสามารถตั้งค่าเวลาการรดน้ำ และรับแจ้งเตือนผ่าน LINE Notify เมื่อความชื้นต่ำเกินไป', 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&w=800&q=80', 'https://smart-greenhouse-demo.example.com', 'https://github.com/student1/smart-greenhouse', 'IoT,Web,Mobile'),

(2, 3, 'AI Chest X-Ray Pneumonia Detection', 'โมเดลปัญญาประดิษฐ์วิเคราะห์ภาพเอ็กซเรย์ปอดเพื่อตรวจหาภาวะปอดบวมด้วย Convolutional Neural Network', 'ระบบตรวจจับภาวะปอดบวมจากภาพเอ็กซเรย์ปอดโดยใช้ Deep Learning (ResNet-50) ซึ่งได้เทรนด้วย Dataset จาก NIH Chest X-ray dataset ความแม่นยำ (Accuracy) อยู่ที่ 94.2% มีเว็บอินเทอร์เฟซพัฒนาด้วย Streamlit และ Python FastAPI ให้แพทย์สามารถอัปโหลดภาพฟิล์มเพื่อประมวลผลและดู Heatmap พื้นที่เสี่ยงได้ในเวลาไม่ถึง 2 วินาที', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80', 'https://ai-xray-demo.example.com', 'https://github.com/student2/ai-xray-detection', 'AI,Python,HealthTech'),

(3, 1, 'Department Project Showcase SPA', 'แพลตฟอร์มจัดเก็บและเผยแพร่ผลงานวิชาการของนิสิตภาควิชาแบบ Full-Stack SPA Web Application', 'ระบบแสดงผลงานและโปรเจกต์ของภาควิชา (Department Project Showcase) สร้างขึ้นเพื่อเป็นศูนย์กลางการจัดเก็บผลงานของนิสิต มีระบบยืนยันตัวตน (JWT Authentication), การจัดการสิทธิ์ผู้ดูแลระบบ (Admin) และเจ้าของผลงาน, ระบบค้นหาเรียลไทม์ และการกรองด้วยแท็ก (Tag Filtering) สไตล์ Dark Theme สวยงามทันสมัย', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80', 'http://localhost:5000', 'https://github.com/admin/department-showcase', 'Web,Node.js,MySQL');
