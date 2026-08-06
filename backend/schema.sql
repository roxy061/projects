-- Department Project Showcase System Schema (MariaDB / MySQL)

CREATE DATABASE IF NOT EXISTS `department_projects` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `department_projects`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `role` ENUM('member', 'admin') NOT NULL DEFAULT 'member',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS `projects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `short_description` TEXT NOT NULL,
  `full_description` LONGTEXT NOT NULL,
  `cover_image_url` VARCHAR(500) DEFAULT NULL,
  `demo_url` VARCHAR(500) DEFAULT NULL,
  `github_url` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tags Table
CREATE TABLE IF NOT EXISTS `tags` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Project_Tags Table
CREATE TABLE IF NOT EXISTS `project_tags` (
  `project_id` INT NOT NULL,
  `tag_id` INT NOT NULL,
  PRIMARY KEY (`project_id`, `tag_id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Site_Layouts Table
CREATE TABLE IF NOT EXISTS `site_layouts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `layout_name` VARCHAR(50) NOT NULL UNIQUE,
  `structure_json` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed Data
-- Seed Users (Password for both accounts is 'password123')
-- Bcrypt Hash for 'password123': $2a$10$4.oYvS7/9h4h8/h2H7s89.wV3A3hX7KxS0Z6Y3d5e2K4j5X8z0Y6i
INSERT IGNORE INTO `users` (`id`, `username`, `email`, `password_hash`, `full_name`, `role`) VALUES
(1, 'admin', 'admin@department.ac.th', '$2a$10$4.oYvS7/9h4h8/h2H7s89.wV3A3hX7KxS0Z6Y3d5e2K4j5X8z0Y6i', 'ระบบผู้ดูแล (Admin User)', 'admin'),
(2, 'student1', 'student1@department.ac.th', '$2a$10$4.oYvS7/9h4h8/h2H7s89.wV3A3hX7KxS0Z6Y3d5e2K4j5X8z0Y6i', 'สมชาย สายโค้ด (Member User)', 'member');

-- Seed Tags
INSERT IGNORE INTO `tags` (`id`, `name`) VALUES
(1, 'Node.js'),
(2, 'React'),
(3, 'Vue.js'),
(4, 'AI / Machine Learning'),
(5, 'Mobile App'),
(6, 'IoT'),
(7, 'MariaDB / MySQL'),
(8, 'Tailwind CSS');

-- Seed Projects
INSERT IGNORE INTO `projects` (`id`, `user_id`, `title`, `short_description`, `full_description`, `cover_image_url`, `demo_url`, `github_url`) VALUES
(1, 1, 'Smart Agriculture IoT & AI System', 'ระบบฟาร์มอัจฉริยะวิเคราะห์ความชื้นและสภาพอากาศด้วย AI', 'ระบบบริหารจัดการฟาร์มอัจฉริยะที่เชื่อมต่อกับเซ็นเซอร์ IoT เพื่อวัดค่าความชื้น สภาพอากาศ และประมวลผลด้วย AI เพื่อทำนายการรดน้ำต้นไม้อย่างแม่นยำ ช่วยลดการสูญเสียน้ำได้ถึง 35%', 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?q=80&w=1000&auto=format&fit=crop', 'https://demo.smartfarm.example.com', 'https://github.com/example/smart-farm-iot'),
(2, 2, 'Department Project Showcase', 'ระบบเว็บแอปพลิเคชันจัดเก็บและแสดงผลงานโปรเจกต์ของภาควิชา', 'ระบบจัดเก็บผลงานโปรเจกต์นักศึกษาแบบ Full-Stack รองรับการค้นหา คัดกรองแท็ก ระบบสมาชิก RBAC และ Admin Dynamic Drag and Drop Section Layout Builder เพื่อปรับแต่งหน้าแรกได้อย่างยืดหยุ่น', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1000&auto=format&fit=crop', 'http://localhost:5000', 'https://github.com/example/department-project-showcase'),
(3, 2, 'AI Medical Diagnostics Assistant', 'ระบบผู้ช่วยวินิจฉัยภาพถ่ายทางแพทย์ด้วย Deep Learning', 'เครื่องมือช่วยเหลือแพทย์ในการคัดกรองภาพถ่ายเอ็กซเรย์ปอดด้วย Convolutional Neural Networks (CNN) เพิ่มความรวดเร็วและแม่นยำในการคัดกรองเบื้องต้น', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1000&auto=format&fit=crop', 'https://demo.medical-ai.example.com', 'https://github.com/example/medical-ai-diagnostics');

-- Seed Project Tags
INSERT IGNORE INTO `project_tags` (`project_id`, `tag_id`) VALUES
(1, 4), (1, 6), (1, 7),
(2, 1), (2, 7), (2, 8),
(3, 4);

-- Seed Default Site Layout JSON Structure
INSERT IGNORE INTO `site_layouts` (`id`, `layout_name`, `structure_json`) VALUES
(1, 'default', '[
  {"id": "hero", "name": "Hero Section", "enabled": true, "title": "Department Project Showcase", "subtitle": "คลังรวบรวมและนำเสนอผลงานโปรเจกต์นวัตกรรมประจำภาควิชา"},
  {"id": "stats", "name": "System Statistics", "enabled": true},
  {"id": "filter", "name": "Search & Tag Filters", "enabled": true},
  {"id": "projects", "name": "Projects Showcase Grid", "enabled": true},
  {"id": "featured", "name": "Featured Highlights", "enabled": true},
  {"id": "about", "name": "Department Info", "enabled": true}
]');
