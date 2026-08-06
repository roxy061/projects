# 📌 คู่มือการตั้งค่า Server ตามข้อกำหนด (Ubuntu Linux Server Setup Checklist)

เอกสารนี้รวบรวมคำสั่ง Linux, Configuration Files, คำสั่ง SQL และ Shell Scripts ที่พร้อมสำหรับนำไปรันบน Ubuntu Linux Server เพื่อติดตั้งและเปิดให้บริการระบบจัดเก็บโปรเจกต์ประจำแผนก

---

## 🌐 1. โครงสร้างเว็บและโดเมน (Web & VirtualHost - Nginx)

### 1.1 สร้างไดเรกทอรีสำหรับระบบเว็บไซต์
```bash
# สร้างไดเรกทอรีเก็บไฟล์เว็บไซต์ และโฟลเดอร์สำหรับ uploads
sudo mkdir -p /var/www/username/uploads
sudo chown -R www-data:www-data /var/www/username
sudo chmod -R 755 /var/www/username
sudo chmod -R 775 /var/www/username/uploads
```

### 1.2 สร้างไฟล์ Nginx VirtualHost
สร้างไฟล์คอนฟิกที่ `/etc/nginx/conf.d/username.conf`:

```bash
sudo nano /etc/nginx/conf.d/username.conf
```

ใส่เนื้อหา Configuration ด้านล่างนี้ (เปลี่ยน `username.nvc.ac.th` และเวอร์ชัน `php-fpm` ให้ตรงตามเครื่อง Server):

```nginx
# /etc/nginx/conf.d/username.conf

server {
    listen 80;
    listen [::]:80;
    server_name username.nvc.ac.th;

    root /var/www/username;
    index index.php index.html index.htm;

    # Client upload limit (รองรับไฟล์อัปโหลดสูงสุด 50MB)
    client_max_body_size 50M;

    # Logging
    access_log /var/log/nginx/username_access.log;
    error_log /var/log/nginx/username_error.log;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # ประมวลผลไฟล์ PHP ผ่าน PHP-FPM
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock; # ตรวจสอบเวอร์ชัน PHP (เช่น php8.1-fpm หรือ php8.2-fpm)
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # ป้องกันการเข้าถึงไฟล์ซ่อน (.htaccess, .git ฯลฯ)
    location ~ /\.ht {
        deny all;
    }

    # Cache สถิตสำหรับไฟล์ Assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires max;
        log_not_found off;
    }
}
```

### 1.3 ทดสอบคอนฟิกและ Restart Nginx
```bash
# ตรวจสอบความถูกต้องของ Nginx Configuration Syntax
sudo nginx -t

# รีโหลด Nginx เพื่อให้คอนฟิกมีผล
sudo systemctl reload nginx
```

---

## 💾 2. ระบบเว็บไซต์และฐานข้อมูล (MariaDB Setup)

### 2.1 คำสั่ง SQL ในการสร้าง Database, User และการกำหนด Privileges
เรียกใช้งาน MariaDB Shell บน Ubuntu Server:

```bash
sudo mariadb -u root -p
```

รันคำสั่ง SQL ด้านล่างเพื่อสร้าง Database, สิทธิ์ผู้ใช้งาน และ Schema:

```sql
-- 1. สร้าง Database สำหรับโปรเจกต์
CREATE DATABASE IF NOT EXISTS `dept_projects` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- 2. สร้าง User ใหม่ และกำหนด Password ปลอดภัย
CREATE USER IF NOT EXISTS 'proj_user'@'localhost' IDENTIFIED BY 'SecretPass123!';

-- 3. กำหนด Privileges เฉพาะสำหรับฐานข้อมูล dept_projects (Principle of Least Privilege)
GRANT ALL PRIVILEGES ON `dept_projects`.* TO 'proj_user'@'localhost';
FLUSH PRIVILEGES;

-- 4. เข้าใช้งาน Database และสร้างตาราง
USE `dept_projects`;

-- ตาราง users
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

-- ตาราง projects พร้อม Relationship (Foreign Key)
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
```

---

## 🔒 3. ความปลอดภัยและไฟร์วอลล์ (Security & HTTPS)

### 3.1 ตั้งค่า UFW Firewall
เปิดใช้งานเฉพาะพอร์ตที่จำเป็น: 22 (SSH), 80 (HTTP), และ 443 (HTTPS)

```bash
# อนุญาต พอร์ต 22 (SSH)
sudo ufw allow 22/tcp comment 'SSH Access'

# อนุญาต พอร์ต 80 (HTTP)
sudo ufw allow 80/tcp comment 'HTTP Access'

# อนุญาต พอร์ต 443 (HTTPS)
sudo ufw allow 443/tcp comment 'HTTPS Access'

# เปิดใช้งาน UFW Firewall
sudo ufw enable

# ตรวจสอบสถานะการทำงานของไฟร์วอลล์
sudo ufw status verbose
```

### 3.2 ติดตั้ง Certbot และขอรับ SSL Certificate (Let's Encrypt)
ขอรับใบรับรองความปลอดภัย HTTPS สำหรับโดเมน `username.nvc.ac.th`:

```bash
# ติดตั้ง Certbot และ Nginx Plugin
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# ขอรับ SSL Certificate และปรับแต่ง Nginx อัตโนมัติ
sudo certbot --nginx -d username.nvc.ac.th

# ทดสอบระบบ Auto-Renewal ของ Certbot
sudo certbot renew --dry-run
```

---

## ⏰ 4. ระบบสำรองข้อมูลและการดู Log (Backup & Observability)

### 4.1 สร้าง Shell Script สำรองข้อมูล MariaDB (`.sql.gz`)
สร้างโฟลเดอร์สำหรับเก็บไฟล์สำรองข้อมูล และไฟล์ Script:

```bash
# สร้างโฟลเดอร์สำหรับเก็บไฟล์ backup
sudo mkdir -p /var/backups/username/

# สร้างไฟล์สคริปต์สำรองข้อมูล
sudo nano /usr/local/bin/backup-mariadb.sh
```

ใส่เนื้อหา Shell Script ด้านล่างนี้:

```bash
#!/bin/bash
# ============================================================
# MariaDB Auto-Backup Script for Department Project Storage
# ============================================================

# กำหนดค่าตัวแปร
DB_USER="proj_user"
DB_PASS="SecretPass123!"
DB_NAME="dept_projects"
BACKUP_DIR="/var/backups/username"
DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/db_backup_${DB_NAME}_${DATE}.sql.gz"

# สร้างไดเรกทอรีหากยังไม่มี
mkdir -p ${BACKUP_DIR}

# ทำการ Dump และ บีบอัดเป็น .sql.gz
mysqldump -u ${DB_USER} -p"${DB_PASS}" ${DB_NAME} | gzip -9 > ${BACKUP_FILE}

# ลบไฟล์ Backup ที่เก่ากว่า 30 วัน เพื่อประหยัดพื้นที่ดิสก์
find ${BACKUP_DIR} -type f -name "*.sql.gz" -mtime +30 -exec rm -f {} \;

# สรุป Log การทำงาน
echo "[$(date)] Backup completed successfully: ${BACKUP_FILE}" >> /var/log/mariadb-backup.log
```

กำหนดสิทธิ์ Executable ให้กับ Shell Script:

```bash
sudo chmod +x /usr/local/bin/backup-mariadb.sh

# ทดสอบรันสคริปต์ทันที
sudo /usr/local/bin/backup-mariadb.sh

# ตรวจสอบไฟล์ที่ตั้งสำรองไว้
ls -lh /var/backups/username/
```

### 4.2 ตั้งค่า Crontab เพื่อตั้งเวลาสำรองข้อมูลอัตโนมัติ (ทุกวัน เวลา 02:00 น.)
เปิดแก้ไข Crontab ของผู้ดูแลระบบ:

```bash
sudo crontab -e
```

เพิ่มบรรทัดนี้ที่ท้ายไฟล์:

```cron
0 2 * * * /usr/local/bin/backup-mariadb.sh >/dev/null 2>&1
```

---

## 📊 5. การดู Log และตรวจติดตามระบบ (Observability & Debugging)

คำสั่งสำหรับตรวจสอบสถานะและ Logs ของระบบบน Ubuntu Server:

```bash
# ดู Nginx Access Log แบบ Real-time
sudo tail -f /var/log/nginx/username_access.log

# ดู Nginx Error Log
sudo tail -f /var/log/nginx/username_error.log

# ดู Database Backup Log
sudo tail -f /var/log/mariadb-backup.log

# ตรวจสอบสถานะการทำงานของบริการหลัก
sudo systemctl status nginx
sudo systemctl status mariadb
sudo systemctl status php8.1-fpm
```
