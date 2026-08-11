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
  `bio` TEXT DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `github` VARCHAR(255) DEFAULT NULL,
  `website` VARCHAR(255) DEFAULT NULL,
  `avatar` VARCHAR(255) DEFAULT NULL,
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
  `department` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_projects_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Seed Data (ข้อมูลเริ่มต้นสำหรับทดสอบ)
-- บัญชีผู้ใช้:
-- 1. Admin: admin / password123
-- ------------------------------------------------------------

INSERT INTO `users` (`id`, `username`, `password`, `fullname`, `role`) VALUES
(1, 'admin', '$2a$10$Yw7.rCHo2Ak6TrOdWDCndeAIBkFOrH32bWCwPeUdfIVAY4KEJHBHW', 'ผู้ดูแลระบบ (Admin User)', 'admin');

INSERT INTO `projects` (`id`, `user_id`, `title`, `short_description`, `full_description`, `cover_image`, `demo_url`, `github_url`, `tags`, `department`) VALUES
(1, 1, 'Department Project Showcase SPA', 'แพลตฟอร์มจัดเก็บและเผยแพร่ผลงานวิชาการของนิสิตภาควิชาแบบ Full-Stack SPA Web Application', 'ระบบแสดงผลงานและโปรเจกต์ของภาควิชา (Department Project Showcase) สร้างขึ้นเพื่อเป็นศูนย์กลางการจัดเก็บผลงานของนิสิต มีระบบยืนยันตัวตน (JWT Authentication), การจัดการสิทธิ์ผู้ดูแลระบบ (Admin) และเจ้าของผลงาน, ระบบค้นหาเรียลไทม์ และการกรองด้วยแท็ก (Tag Filtering) สไตล์ Dark Theme สวยงามทันสมัย', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80', 'http://localhost:5000', 'https://github.com/admin/department-showcase', 'Web,Node.js,MySQL', 'IT');

