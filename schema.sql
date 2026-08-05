-- =========================================================
-- MariaDB Database Schema: projects_db
-- System: Student Project Archive & Showcase System
-- Department of Information Technology (NVC)
-- =========================================================

-- 1. Create Database
CREATE DATABASE IF NOT EXISTS `projects_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `projects_db`;

-- 2. Create User & Grant Privileges (Dedicated DB User for Security)
CREATE USER IF NOT EXISTS 'user_nvc'@'localhost' IDENTIFIED BY 'StrongPass123!';
GRANT ALL PRIVILEGES ON `projects_db`.* TO 'user_nvc'@'localhost';
FLUSH PRIVILEGES;

-- 3. Table: projects (เก็บข้อมูลโปรเจกต์)
CREATE TABLE IF NOT EXISTS `projects` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL COMMENT 'ชื่อโปรเจกต์',
    `level` VARCHAR(50) NOT NULL COMMENT 'ระดับชั้น (ปวช. 1-2, ปวช. 3, ปวส. 1, ปวส. 2)',
    `category` VARCHAR(100) NOT NULL COMMENT 'ประเภทเทคโนโลยี (IoT, Web, Python)',
    `description` TEXT NOT NULL COMMENT 'คำอธิบายวัตถุประสงค์',
    `tags` VARCHAR(255) DEFAULT '' COMMENT 'อุปกรณ์และซอฟต์แวร์ที่ใช้ คั่นด้วยจุลภาค',
    `status` VARCHAR(50) DEFAULT 'Completed' COMMENT 'สถานะงาน (Completed / In Progress)',
    `image_url` TEXT DEFAULT NULL COMMENT 'URL รูปภาพไดอะแกรมหรือตู้คอนโทรล',
    `github_url` TEXT DEFAULT NULL COMMENT 'ลิงก์ GitHub Repository',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: users (เก็บข้อมูลสมาชิกและแอดมิน)
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` VARCHAR(20) DEFAULT 'student' COMMENT 'admin หรือ student',
    `name` VARCHAR(100) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Seed Sample Data (ข้อมูลตัวอย่างเริ่มต้น)
INSERT INTO `users` (`username`, `password_hash`, `role`, `name`) VALUES
('admin', '$2y$10$e0MYzXyjpJS7Pd0RVvHwHe1mN14gN5O2b.qBvU9sQ1W2E3R4T5Y6U', 'admin', 'ผู้ดูแลระบบ IT Admin');

INSERT INTO `projects` (`title`, `level`, `category`, `description`, `tags`, `status`, `image_url`, `github_url`) VALUES
('ระบบคิวและจองคิวบริการซ่อมคอมพิวเตอร์', 'ปวส. 1', 'Web & Database', 'ระบบจองคิวบริการซ่อมอุปกรณ์คอมพิวเตอร์ประจำศูนย์ IT Service', 'PHP, MariaDB, Nginx, Tailwind CSS', 'Completed', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600', 'https://github.com/example/queue-system'),
('ตู้อบเมล่อนอัจฉริยะด้วย ESP32 & IoT', 'ปวช. 3', 'IoT & Embedded Systems', 'โครงงานตู้อบเมล่อนและวัดค่าความชื้นอัตโนมัติ ด้วย ESP32', 'ESP32, Sensor DHT22, MQTT, MariaDB', 'Completed', 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=600', 'https://github.com/example/melon-iot'),
('สคริปต์ตรวจวัดและสำรองข้อมูลเซิร์ฟเวอร์อัตโนมัติ', 'ปวส. 2', 'Python & Automation', 'สคริปต์อัตโนมัติบน Linux ตรวจพอร์ต UFW และ Dump MariaDB', 'Python, Bash, Crontab, MariaDB, UFW', 'Completed', 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=600', 'https://github.com/example/backup-script');
