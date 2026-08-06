-- ============================================================
-- MariaDB Database Schema & User Setup Script
-- Department Project Storage System (dept_projects)
-- ============================================================

-- 1. Create Database
CREATE DATABASE IF NOT EXISTS `dept_projects` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `dept_projects`;

-- 2. Create DB User & Grant Privileges (dev_user)
CREATE USER IF NOT EXISTS 'dev_user'@'localhost' IDENTIFIED BY 'SecretPass123!';
GRANT ALL PRIVILEGES ON `dept_projects`.* TO 'dev_user'@'localhost';
FLUSH PRIVILEGES;

-- 3. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `department` VARCHAR(100) NOT NULL DEFAULT 'แผนกเทคโนโลยีสารสนเทศ',
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Projects Table (with Foreign Key & CASCADE Delete)
CREATE TABLE IF NOT EXISTS `projects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'Web Application',
  `tech_stack` VARCHAR(255) NOT NULL,
  `github_url` VARCHAR(255) DEFAULT NULL,
  `demo_url` VARCHAR(255) DEFAULT NULL,
  `image_url` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_projects_users` 
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Seed Sample Data (Default password for demo users is 'password123')
INSERT INTO `users` (`id`, `username`, `email`, `password`, `full_name`, `department`) VALUES
(1, 'somchai_dev', 'somchai@nvc.ac.th', '$2a$10$K87x.k8RjB.N8T2o1E7.u.jM5Xh2qR5K3Zg8X3w8Z3w8Z3w8Z3w8Z', 'สมชาย สายโค้ด', 'แผนกเทคโนโลยีสารสนเทศ'),
(2, 'somsri_design', 'somsri@nvc.ac.th', '$2a$10$K87x.k8RjB.N8T2o1E7.u.jM5Xh2qR5K3Zg8X3w8Z3w8Z3w8Z3w8Z', 'สมศรี มีดีไซน์', 'แผนกคอมพิวเตอร์ธุรกิจ')
ON DUPLICATE KEY UPDATE `id`=`id`;

INSERT INTO `projects` (`id`, `user_id`, `title`, `description`, `category`, `tech_stack`, `github_url`, `demo_url`, `image_url`) VALUES
(1, 1, 'ระบบเช็คชื่อนักศึกษาสแกน QR Code', 'ระบบบันทึกเวลาเรียนของนักศึกษาในแผนกผ่านการสแกน QR Code ช่วยลดเวลาเช็คชื่อ และออกรายงานสรุปการขาด ลา มาสาย อัตโนมัติสำหรับอาจารย์ประจำวิชา', 'Web Application', 'Node.js, Express, MariaDB, Tailwind CSS', 'https://github.com/example/qrcode-attendance', 'https://qrcode.nvc.ac.th', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=60'),
(2, 2, 'แอปพลิเคชันแนะนำสถานที่ท่องเที่ยวในจังหวัด', 'แอปพลิเคชันแสดงพิกัดสถานที่ท่องเที่ยว ร้านอาหาร และที่พักแนะนำ พร้อมระบบแสดงแผนที่แบบโต้ตอบและการให้คะแนนรีวิวจากผู้ใช้งาน', 'Mobile Application', 'Flutter, Dart, Firebase', 'https://github.com/example/local-travel-app', 'https://travel.nvc.ac.th', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&auto=format&fit=crop&q=60'),
(3, 1, 'ระบบตรวจจับใบหน้าลงเวลาเข้า-ออกงาน (AI Face Recognition)', 'โปรเจกต์วิจัยประยุกต์ใช้ Computer Vision ในการตรวจจับใบหน้าเพื่อยืนยันตัวตน เชื่อมต่อกับกล้อง IP Camera ประจำแผนก', 'AI & Machine Learning', 'Python, OpenCV, FastAPI, React', 'https://github.com/example/face-recognition-system', NULL, 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=60')
ON DUPLICATE KEY UPDATE `id`=`id`;
