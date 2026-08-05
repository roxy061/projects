# คู่มือและสคริปต์การตั้งค่าระบบเซิร์ฟเวอร์ (Server Operations Guide)

คู่มือการตั้งค่า Nginx VirtualHost, UFW Firewall, และสคริปต์การสำรองข้อมูล MariaDB อัตโนมัติ สำหรับระบบ **Student Project Archive & Showcase System** บนระบบปฏิบัติการ Linux (Ubuntu / Debian)

---

## 🌐 1. การตั้งค่า Nginx VirtualHost (`/etc/nginx/conf.d/std66001.conf`)

สร้างไฟล์ตั้งค่า Nginx VirtualHost สำหรับ Subdomain ประจำตัวนักศึกษา (เช่น `std66001.nvc.ac.th`) รองรับทั้ง HTTP (Port 80) และ HTTPS SSL (Port 443)

```nginx
# /etc/nginx/conf.d/std66001.conf

# HTTP Server: Redirect all HTTP requests to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name std66001.nvc.ac.th;

    # Redirect to SSL
    return 301 https://$host$request_uri;
}

# HTTPS Server (SSL Enabled 🔒)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name std66001.nvc.ac.th;

    # Web Root Directory & Index Files
    root /var/www/std66001;
    index index.php index.html index.htm;

    # SSL Certificate Paths (Let's Encrypt / Certbot)
    ssl_certificate /etc/letsencrypt/live/std66001.nvc.ac.th/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/std66001.nvc.ac.th/privkey.pem;

    # SSL Security Parameters
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Logging
    access_log /var/log/nginx/std66001_access.log;
    error_log /var/log/nginx/std66001_error.log;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Pass PHP scripts to FastCGI server (PHP-FPM)
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Deny access to hidden files (.htaccess, .git, etc.)
    location ~ /\.ht {
        deny all;
    }
}
```

### คำสั่งสำหรับทดสอบและ Reload Nginx:
```bash
# ตรวจสอบความถูกต้องของไฟล์ Nginx Syntax
sudo nginx -t

# สั่ง Reload Nginx เพื่อเปิดใช้งานคอนฟิกใหม่
sudo systemctl reload nginx
```

---

## 🔒 2. การตั้งค่าไฟร์วอลล์ UFW (UFW Firewall Setup)

เปิดใช้งาน UFW Firewall และอนุญาตเฉพาะพอร์ตที่จำเป็นสำหรับการทำงานของระบบเซิร์ฟเวอร์ (SSH, HTTP, HTTPS)

```bash
# 1. กำหนดนโยบายพื้นฐาน (Deny Incoming, Allow Outgoing)
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 2. อนุญาตพอร์ตจำเป็น 22 (SSH), 80 (HTTP), 443 (HTTPS)
sudo ufw allow 22/tcp comment 'SSH Remote Access'
sudo ufw allow 80/tcp comment 'HTTP Web Port'
sudo ufw allow 443/tcp comment 'HTTPS SSL Web Port'

# 3. เปิดใช้งาน UFW Firewall
sudo ufw enable

# 4. ตรวจสอบสถานะและพอร์ตที่เปิดใช้งาน
sudo ufw status verbose
```

---

## 💾 3. สคริปต์ Bash สำหรับ Auto Backup ฐานข้อมูล MariaDB (`/opt/backup_db.sh`)

สคริปต์อัตโนมัติสำหรับสั่ง `mysqldump` บีบอัดไฟล์ฐานข้อมูลเป็น `.sql.gz` และนำไปจัดเก็บในโฟลเดอร์ `/var/backups/username/` พร้อมการลบไฟล์สำรองที่เก่าเกิน 30 วันอัตโนมัติ

สร้างไฟล์สคริปต์ที่ `/opt/backup_db.sh`:

```bash
#!/bin/bash
# =========================================================
# MariaDB Auto Backup Script
# System: Student Project Archive
# =========================================================

# กำหนดค่าตัวแปร
DB_USER="user_nvc"
DB_PASS="StrongPass123!"
DB_NAME="projects_db"
USERNAME="std66001"
BACKUP_DIR="/var/backups/${USERNAME}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${DATE}.sql.gz"

# 1. สร้างโฟลเดอร์สำหรับเก็บไฟล์แบ็กอัป หากยังไม่มีอยู่
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR"
fi

# 2. ดำเนินการ Dump ฐานข้อมูลและบีบอัดเป็น .sql.gz
echo "[$(date)] Starting MariaDB backup for ${DB_NAME}..."
mysqldump -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" | gzip > "${BACKUP_FILE}"

# 3. ตรวจสอบสถานะการแบ็กอัป
if [ $? -eq 0 ]; then
    echo "[$(date)] Backup successfully created: ${BACKUP_FILE}"
else
    echo "[$(date)] ERROR: Backup failed!" >&2
    exit 1
fi

# 4. ลบไฟล์สำรองข้อมูลที่เก่าเกิน 30 วัน เพื่อประหยัดพื้นที่ดิสก์
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +30 -delete
echo "[$(date)] Cleanup of old backup files completed."
```

### การตั้งค่าสิทธิ์ให้สคริปต์รันได้:
```bash
sudo chmod +x /opt/backup_db.sh
```

---

## ⏰ 4. การตั้งค่า Crontab สำรองข้อมูลอัตโนมัติทุกเที่ยงคืน

ตั้งเวลาคำสั่ง Crontab ให้รันสคริปต์สำรองข้อมูลอัตโนมัติทุกวัน เวลา 00:00 น. (เที่ยงคืน)

เปิดไฟล์ Crontab ของผู้ใช้:
```bash
crontab -e
```

เพิ่มบรรทัดคำสั่งดังต่อไปนี้ลงในไฟล์:

```cron
# =========================================================
# Cron Job: Backup MariaDB Database Daily at Midnight (00:00)
# =========================================================
0 0 * * * /bin/bash /opt/backup_db.sh >> /var/log/db_backup.log 2>&1
```

### ตรวจสอบคำสั่ง Crontab ที่ตั้งไว้:
```bash
crontab -l
```
