<?php
/**
 * REST API & MariaDB PDO Connection Script
 * System: Student Project Archive & Showcase System (Full-Stack)
 */

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. Database Connection
$host = "localhost";
$db_name = "projects_db";
$username = "user_nvc";
$password = "StrongPass123!";

try {
    $pdo = new PDO("mysql:host={$host};dbname={$db_name};charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database connection failed: " . $e->getMessage()]);
    exit();
}

// 2. Route Request Handling
$action = isset($_GET['action']) ? $_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

switch ($action) {
    
    // ==========================================
    // USERS & AUTHENTICATION
    // ==========================================
    case 'register':
        if ($method !== 'POST') { http_response_code(405); exit(); }
        $fullname = $input['fullname'] ?? '';
        $email = $input['email'] ?? '';
        $user = $input['username'] ?? '';
        $pass = $input['password'] ?? '';
        $level = $input['level'] ?? '';

        if (empty($fullname) || empty($email) || empty($user) || empty($pass)) {
            echo json_encode(["status" => "error", "message" => "กรุณากรอกข้อมูลให้ครบถ้วน"]);
            exit();
        }

        try {
            // Check if username or email exists
            $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
            $stmt->execute([$user, $email]);
            if ($stmt->fetch()) {
                echo json_encode(["status" => "error", "message" => "ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว"]);
                exit();
            }

            $hash = password_hash($pass, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO users (fullname, email, username, password_hash, level, role) VALUES (?, ?, ?, ?, ?, 'user')");
            $stmt->execute([$fullname, $email, $user, $hash, $level]);
            
            echo json_encode(["status" => "success", "message" => "สมัครสมาชิกสำเร็จ"]);
        } catch (Exception $e) {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    case 'login':
        if ($method !== 'POST') { http_response_code(405); exit(); }
        $user = $input['username'] ?? '';
        $pass = $input['password'] ?? '';

        try {
            $stmt = $pdo->prepare("SELECT id, fullname, username, password_hash, role, level FROM users WHERE username = ?");
            $stmt->execute([$user]);
            $row = $stmt->fetch();

            if ($row && password_verify($pass, $row['password_hash'])) {
                unset($row['password_hash']); // Don't send hash to client
                echo json_encode(["status" => "success", "user" => $row]);
            } else {
                echo json_encode(["status" => "error", "message" => "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"]);
            }
        } catch (Exception $e) {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    case 'forgot_password':
        if ($method !== 'POST') { http_response_code(405); exit(); }
        $email = $input['email'] ?? '';

        try {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user_row = $stmt->fetch();

            if (!$user_row) {
                echo json_encode(["status" => "error", "message" => "ไม่พบอีเมลนี้ในระบบ"]);
                exit();
            }

            // Generate 6-digit OTP
            $otp = sprintf("%06d", mt_rand(1, 999999));
            $expiry = date('Y-m-d H:i:s', strtotime('+15 minutes'));

            $stmt = $pdo->prepare("UPDATE users SET reset_otp = ?, otp_expiry = ? WHERE email = ?");
            $stmt->execute([$otp, $expiry, $email]);

            // Note: In a real system, send this OTP via email (e.g. PHPMailer).
            // For this local environment, we return it in the JSON response so the user can test.
            echo json_encode([
                "status" => "success", 
                "message" => "ระบบจำลอง: ส่ง OTP ไปที่อีเมลแล้ว", 
                "mock_otp" => $otp 
            ]);

        } catch (Exception $e) {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    case 'reset_password':
        if ($method !== 'POST') { http_response_code(405); exit(); }
        $email = $input['email'] ?? '';
        $otp = $input['otp'] ?? '';
        $new_pass = $input['new_password'] ?? '';

        if (empty($email) || empty($otp) || empty($new_pass)) {
            echo json_encode(["status" => "error", "message" => "ข้อมูลไม่ครบถ้วน"]);
            exit();
        }

        try {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND reset_otp = ? AND otp_expiry > NOW()");
            $stmt->execute([$email, $otp]);
            $user_row = $stmt->fetch();

            if (!$user_row) {
                echo json_encode(["status" => "error", "message" => "รหัส OTP ไม่ถูกต้อง หรือหมดอายุแล้ว"]);
                exit();
            }

            $hash = password_hash($new_pass, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE users SET password_hash = ?, reset_otp = NULL, otp_expiry = NULL WHERE id = ?");
            $stmt->execute([$hash, $user_row['id']]);

            echo json_encode(["status" => "success", "message" => "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว เข้าสู่ระบบได้ทันที"]);

        } catch (Exception $e) {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    // ==========================================
    // SITE SETTINGS (Admin UI Config)
    // ==========================================
    case 'get_settings':
        try {
            $stmt = $pdo->query("SELECT setting_key, setting_value FROM site_settings");
            $settings = [];
            while ($row = $stmt->fetch()) {
                $settings[$row['setting_key']] = $row['setting_value'];
            }
            echo json_encode(["status" => "success", "data" => $settings]);
        } catch (Exception $e) {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    case 'update_settings':
        if ($method !== 'POST') { http_response_code(405); exit(); }
        // Note: In real app, verify admin session token here.
        try {
            $pdo->beginTransaction();
            foreach (['site_title', 'hero_title', 'hero_desc', 'theme'] as $key) {
                if (isset($input[$key])) {
                    $stmt = $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");
                    $stmt->execute([$key, $input[$key], $input[$key]]);
                }
            }
            $pdo->commit();
            echo json_encode(["status" => "success", "message" => "บันทึกการตั้งค่าสำเร็จ"]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    // ==========================================
    // PROJECTS
    // ==========================================
    case 'get_projects':
        // If status parameter is provided, filter by it (e.g., status=approved for public page, status=all for admin)
        $status_filter = $_GET['status'] ?? 'approved';
        
        try {
            if ($status_filter === 'all') {
                $stmt = $pdo->query("SELECT p.*, u.fullname as author_name FROM projects p LEFT JOIN users u ON p.user_id = u.id ORDER BY p.id DESC");
            } else {
                $stmt = $pdo->prepare("SELECT p.*, u.fullname as author_name FROM projects p LEFT JOIN users u ON p.user_id = u.id WHERE p.status = ? ORDER BY p.id DESC");
                $stmt->execute([$status_filter]);
            }
            
            $projects = $stmt->fetchAll();
            
            // Format tags
            foreach ($projects as &$p) {
                $p['tags'] = $p['tags'] ? array_map('trim', explode(',', $p['tags'])) : [];
            }
            
            echo json_encode(["status" => "success", "data" => $projects]);
        } catch (Exception $e) {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    case 'submit_project':
        if ($method !== 'POST') { http_response_code(405); exit(); }
        
        $user_id = isset($input['user_id']) ? intval($input['user_id']) : null;
        $title = $input['title'] ?? '';
        $level = $input['level'] ?? '';
        $category = $input['category'] ?? '';
        $description = $input['description'] ?? '';
        $tags = is_array($input['tags']) ? implode(', ', $input['tags']) : ($input['tags'] ?? '');
        $image_url = $input['image_url'] ?? 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800'; // Default placeholder

        if (empty($title) || empty($level) || empty($category)) {
            echo json_encode(["status" => "error", "message" => "กรุณากรอกข้อมูลให้ครบ"]);
            exit();
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO projects (user_id, title, level, category, description, tags, status, image_url) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)");
            $stmt->execute([$user_id, $title, $level, $category, $description, $tags, $image_url]);
            echo json_encode(["status" => "success", "message" => "ส่งผลงานสำเร็จ รอการอนุมัติจากผู้ดูแลระบบ"]);
        } catch (Exception $e) {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    case 'change_project_status':
        if ($method !== 'POST') { http_response_code(405); exit(); }
        
        $id = isset($input['id']) ? intval($input['id']) : 0;
        $status = $input['status'] ?? ''; // approved or rejected

        if ($id <= 0 || !in_array($status, ['approved', 'rejected'])) {
            echo json_encode(["status" => "error", "message" => "ข้อมูลไม่ถูกต้อง"]);
            exit();
        }

        try {
            $stmt = $pdo->prepare("UPDATE projects SET status = ? WHERE id = ?");
            $stmt->execute([$status, $id]);
            echo json_encode(["status" => "success", "message" => "อัปเดตสถานะโปรเจกต์สำเร็จ"]);
        } catch (Exception $e) {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    case 'delete_project':
        if ($method !== 'POST') { http_response_code(405); exit(); }
        
        $id = isset($input['id']) ? intval($input['id']) : 0;

        if ($id <= 0) {
            echo json_encode(["status" => "error", "message" => "ID ไม่ถูกต้อง"]);
            exit();
        }

        try {
            $stmt = $pdo->prepare("DELETE FROM projects WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(["status" => "success", "message" => "ลบโปรเจกต์สำเร็จ"]);
        } catch (Exception $e) {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(["status" => "error", "message" => "Invalid action"]);
        break;
}
