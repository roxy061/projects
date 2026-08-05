-- =========================================================
-- MariaDB Database Schema: projects_db
-- System: Student Project Archive & Showcase System
-- =========================================================

CREATE DATABASE IF NOT EXISTS `projects_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `projects_db`;

CREATE USER IF NOT EXISTS 'user_nvc'@'localhost' IDENTIFIED BY 'StrongPass123!';
GRANT ALL PRIVILEGES ON `projects_db`.* TO 'user_nvc'@'localhost';
FLUSH PRIVILEGES;

-- Table: site_settings (Config UI)
CREATE TABLE IF NOT EXISTS `site_settings` (
    `setting_key` VARCHAR(50) PRIMARY KEY,
    `setting_value` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: users (เก็บข้อมูลสมาชิกและแอดมิน)
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `fullname` VARCHAR(100) NOT NULL,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `level` VARCHAR(50) DEFAULT NULL COMMENT 'ระดับชั้น (ปวช. 3, ปวส. 1, ฯลฯ)',
    `role` ENUM('user', 'admin') DEFAULT 'user' COMMENT 'user หรือ admin',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: projects (เก็บข้อมูลโปรเจกต์)
CREATE TABLE IF NOT EXISTS `projects` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT DEFAULT NULL,
    `title` VARCHAR(255) NOT NULL COMMENT 'ชื่อโปรเจกต์',
    `level` VARCHAR(50) NOT NULL COMMENT 'ระดับชั้น',
    `category` VARCHAR(100) NOT NULL COMMENT 'ประเภทเทคโนโลยี',
    `description` TEXT NOT NULL COMMENT 'คำอธิบายวัตถุประสงค์',
    `tags` VARCHAR(255) DEFAULT '' COMMENT 'แท็ก (คั่นด้วยจุลภาค)',
    `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT 'สถานะงาน',
    `image_url` TEXT DEFAULT NULL COMMENT 'URL รูปภาพ',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Seed Initial Data

-- Password is 'admin123'
INSERT IGNORE INTO `users` (`id`, `fullname`, `username`, `password_hash`, `role`) VALUES
(1, 'ผู้ดูแลระบบ IT Admin', 'admin', '$2y$10$e0MYzXyjpJS7Pd0RVvHwHe1mN14gN5O2b.qBvU9sQ1W2E3R4T5Y6U', 'admin');

-- Seed Settings
INSERT IGNORE INTO `site_settings` (`setting_key`, `setting_value`) VALUES
('site_title', 'PROJECT.LOG'),
('hero_title', 'คลังเก็บผลงานโปรเจกต์'),
('hero_desc', 'ค้นหาและสืบค้นผลงานโปรเจกต์ ของนักศึกษาระดับ ปวช. และ ปวส. แผนกเทคโนโลยีสารสนเทศ'),
('theme', 'emerald');

-- Seed Demo Project
INSERT IGNORE INTO `projects` (`id`, `user_id`, `title`, `level`, `category`, `description`, `tags`, `status`, `image_url`) VALUES
(1, NULL, 'ตู้อบเมล่อนอัจฉริยะ (Smart Melon Farm)', 'ปวช. 3 (โครงงาน)', 'IoT & Hardware', 'ระบบควบคุมอุณหภูมิและความชื้นในโรงเรือนปลูกเมล่อนอัตโนมัติ สั่งการพัดลมและปั๊มน้ำผ่านบอร์ดไมโครคอนโทรลเลอร์ ดูข้อมูลแบบ Real-time บน Dashboard', 'ESP32, DHT22 Sensor, MQTT, C++, Relay Module', 'approved', 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800'),
(2, NULL, 'ระบบยืม-คืนอุปกรณ์ห้องปฏิบัติการ', 'ปวส. 1', 'Software & Automation', 'เว็บแอปพลิเคชันสำหรับจัดการการยืมและคืนอุปกรณ์ IT ของนักศึกษา มีระบบสแกน QR Code และสรุปรายงานการใช้งาน', 'Next.js, Tailwind CSS, Node.js, PostgreSQL', 'pending', 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800');
