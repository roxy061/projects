# 📌 คู่มือการตั้งค่า Ubuntu Server สำหรับ Node.js (Express) + MariaDB + PM2 + Nginx

เอกสารนี้รวบรวมคำสั่ง Linux Command แบบจับมือทำที่สมบูรณ์ สำหรับการ Deploy แอปพลิเคชันระบบจัดเก็บโปรเจกต์ประจำแผนก บน **Ubuntu Server 22.04 / 24.04 LTS**

---

## 🌐 1. โครงสร้างเว็บ โดเมน และ PM2 (Web, VirtualHost & Service)

### 1.1 สร้างไดเรกทอรีแอปพลิเคชันและเตรียมสิทธิ์
```bash
# 1. สร้างโฟลเดอร์โปรเจกต์ที่ /var/www/username-app/
sudo mkdir -p /var/www/username-app/uploads
sudo chown -R $USER:$USER /var/www/username-app
sudo chmod -R 775 /var/www/username-app/uploads

# 2. คัดลอกซอร์สโค้ดทั้งหมดเข้ามาที่โฟลเดอร์นี้
cd /var/www/username-app

# 3. ติดตั้ง Node.js (v20 LTS) และ PM2 Process Manager (หากยังไม่ได้ติดตั้ง)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 4. ติดตั้ง NPM Dependencies ตาม package.json
npm install
```

### 1.2 สั่งงาน PM2 (Process Manager) เพื่อรัน Node.js เป็น Background Service
```bash
# สั่ง PM2 ให้เริ่มต้นรัน server.js
pm2 start server.js --name "username-app"

# ตั้งค่าให้ PM2 สตาร์ตแอปพลิเคชันให้อัตโนมัติทุกครั้งเมื่อ Server Reboot
pm2 startup
# (คัดลอกคำสั่งที่ PM2 แสดงขึ้นมาวางใน Terminal เพื่อยืนยันสิทธิ์ sudo)

# บันทึกสถานะกระบวนการปัจจุบันของ PM2
pm2 save

# ตรวจสอบสถานะการทำงาน
pm2 status
```

### 1.3 สร้าง Nginx VirtualHost Reverse Proxy (`/etc/nginx/conf.d/username.conf`)
สร้างไฟล์คอนฟิก Nginx:

```bash
sudo nano /etc/nginx/conf.d/username.conf
```

ใส่เนื้อหา Configuration สำหรับทำ Reverse Proxy ไปยัง `http://127.0.0.1:3000`:

```nginx
# /etc/nginx/conf.d/username.conf

server {
    listen 80;
    listen [::]:80;
    server_name username.nvc.ac.th;

    # ปรับขนาดการอัปโหลดไฟล์สูงสุด (50MB)
    client_max_body_size 50M;

    # Nginx Logging
    access_log /var/log/nginx/username_access.log;
    error_log /var/log/nginx/username_error.log;

    # Reverse Proxy ไปยัง Node.js Express App (พอร์ต 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static file routing ปลายทางโฟลเดอร์ uploads
    location /uploads/ {
        alias /var/www/username-app/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

ทดสอบและสั่งรีโหลด Nginx:

```bash
# ตรวจสอบไวยากรณ์ไฟล์คอนฟิก Nginx
sudo nginx -t

# รีโหลด Nginx เพื่อเริ่มใช้งาน
sudo systemctl reload nginx
```

---

## 💾 2. ระบบเว็บไซต์และฐานข้อมูล (MariaDB Import)

### 2.1 รันไฟล์ `schema.sql` เข้า MariaDB
รันสคริปต์ SQL เพื่อสร้าง Database, DB User, Tables และ Seed Data:

```bash
# รันไฟล์ schema.sql ด้วยบัญชี root ของ MariaDB
sudo mariadb -u root -p < /var/www/username-app/schema.sql
```

หรือสามารถนำเข้าผ่าน MariaDB Shell โดยตรง:

```bash
sudo mariadb -u root -p
```
```sql
SOURCE /var/www/username-app/schema.sql;
```

---

## 🔒 3. ความปลอดภัยและไฟร์วอลล์ (Security & HTTPS)

### 3.1 ตั้งค่า UFW Firewall
เปิดอนุญาตเฉพาะพอร์ต 22 (SSH), 80 (HTTP), และ 443 (HTTPS):

```bash
# อนุญาต พอร์ต 22 (SSH)
sudo ufw allow 22/tcp comment 'SSH'

# อนุญาต พอร์ต 80 (HTTP)
sudo ufw allow 80/tcp comment 'HTTP'

# อนุญาต พอร์ต 443 (HTTPS)
sudo ufw allow 443/tcp comment 'HTTPS'

# เปิดใช้งาน UFW Firewall
sudo ufw enable

# ตรวจสอบสถานะไฟร์วอลล์
sudo ufw status verbose
```

### 3.2 ติดตั้ง SSL/HTTPS ด้วย Certbot (Let's Encrypt)
```bash
# ติดตั้ง Certbot และ Nginx Plugin
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# ขอรับ SSL Certificate สำหรับพอร์ต 443
sudo certbot --nginx -d username.nvc.ac.th

# ทดสอบระบบ Auto-Renew
sudo certbot renew --dry-run
```

---

## ⏰ 4. ระบบสำรองข้อมูลและการดู Log (Backup & Observability)

### 4.1 Shell Script สำรองข้อมูล MariaDB (`.sql.gz`)
สร้างโฟลเดอร์และไฟล์ Shell Script:

```bash
sudo mkdir -p /var/backups/username/
sudo nano /usr/local/bin/backup-mariadb.sh
```

วางเนื้อหา Shell Script ด้านล่างนี้:

```bash
#!/bin/bash
# ============================================================
# MariaDB Auto-Backup Script for Node.js App
# ============================================================

DB_USER="proj_user"
DB_PASS="SecretPass123!"
DB_NAME="dept_projects"
BACKUP_DIR="/var/backups/username"
DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/db_backup_${DB_NAME}_${DATE}.sql.gz"

mkdir -p ${BACKUP_DIR}

# Dump & Compress
mysqldump -u ${DB_USER} -p"${DB_PASS}" ${DB_NAME} | gzip -9 > ${BACKUP_FILE}

# ลบไฟล์ Backup เก่าเกิน 30 วัน
find ${BACKUP_DIR} -type f -name "*.sql.gz" -mtime +30 -exec rm -f {} \;

echo "[$(date)] Backup completed successfully: ${BACKUP_FILE}" >> /var/log/mariadb-backup.log
```

มอบสิทธิ์ Executable:

```bash
sudo chmod +x /usr/local/bin/backup-mariadb.sh

# ทดสอบรันสคริปต์ทันที
sudo /usr/local/bin/backup-mariadb.sh
```

### 4.2 ตั้งค่า Crontab (รันสคริปต์ทุกวัน เวลา 02:00 น.)
```bash
sudo crontab -e
```

เพิ่มบรรทัดนี้ลงท้ายไฟล์:

```cron
0 2 * * * /usr/local/bin/backup-mariadb.sh >/dev/null 2>&1
```

### 4.3 คำสั่งสำหรับดู Logs ของ Nginx และ PM2
```bash
# 1. ดู Logs ของ PM2 (Node.js Application Logs)
pm2 logs username-app
pm2 logs --lines 100

# 2. ดู Logs ของ Nginx Web Server
sudo tail -f /var/log/nginx/username_access.log
sudo tail -f /var/log/nginx/username_error.log

# 3. ดู Log สรุปการสำรองข้อมูล MariaDB
sudo tail -f /var/log/mariadb-backup.log
```
