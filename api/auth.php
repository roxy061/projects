<?php
// api/auth.php - Handles Register, Login, Logout, and Session Status

require_once __DIR__ . '/../config/database.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'register':
        handleRegister();
        break;
    case 'login':
        handleLogin();
        break;
    case 'logout':
        handleLogout();
        break;
    case 'me':
        handleMe();
        break;
    default:
        sendJsonResponse(['error' => 'Invalid auth action'], 400);
}

function handleRegister() {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $username   = trim($input['username'] ?? '');
    $email      = trim($input['email'] ?? '');
    $password   = trim($input['password'] ?? '');
    $full_name  = trim($input['full_name'] ?? '');
    $department = trim($input['department'] ?? 'แผนกเทคโนโลยีสารสนเทศ');

    if (empty($username) || empty($email) || empty($password) || empty($full_name)) {
        sendJsonResponse(['error' => 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง'], 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJsonResponse(['error' => 'รูปแบบอีเมลไม่ถูกต้อง'], 400);
    }

    if (strlen($password) < 6) {
        sendJsonResponse(['error' => 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'], 400);
    }

    $db = getDBConnection();

    // Check existing username or email
    $stmt = $db->prepare("SELECT id FROM users WHERE username = :username OR email = :email");
    $stmt->execute(['username' => $username, 'email' => $email]);
    if ($stmt->fetch()) {
        sendJsonResponse(['error' => 'ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานไปแล้ว'], 409);
    }

    // Hash password securely
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $db->prepare("INSERT INTO users (username, email, password, full_name, department) VALUES (:username, :email, :password, :full_name, :department)");
    $stmt->execute([
        'username'   => $username,
        'email'      => $email,
        'password'   => $hashedPassword,
        'full_name'  => $full_name,
        'department' => $department
    ]);

    $newUserId = $db->lastInsertId();

    // Log the user in immediately
    $_SESSION['user_id']    = $newUserId;
    $_SESSION['username']   = $username;
    $_SESSION['full_name']  = $full_name;
    $_SESSION['department'] = $department;

    sendJsonResponse([
        'success' => true,
        'message' => 'สมัครสมาชิกและเข้าสู่ระบบเรียบร้อยแล้ว',
        'user'    => [
            'id'         => $newUserId,
            'username'   => $username,
            'full_name'  => $full_name,
            'department' => $department
        ]
    ]);
}

function handleLogin() {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $username = trim($input['username'] ?? '');
    $password = trim($input['password'] ?? '');

    if (empty($username) || empty($password)) {
        sendJsonResponse(['error' => 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'], 400);
    }

    $db = getDBConnection();
    $stmt = $db->prepare("SELECT * FROM users WHERE username = :username OR email = :username LIMIT 1");
    $stmt->execute(['username' => $username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        sendJsonResponse(['error' => 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'], 401);
    }

    $_SESSION['user_id']    = $user['id'];
    $_SESSION['username']   = $user['username'];
    $_SESSION['full_name']  = $user['full_name'];
    $_SESSION['department'] = $user['department'];

    sendJsonResponse([
        'success' => true,
        'message' => 'เข้าสู่ระบบสำเร็จ',
        'user'    => [
            'id'         => $user['id'],
            'username'   => $user['username'],
            'full_name'  => $user['full_name'],
            'department' => $user['department']
        ]
    ]);
}

function handleLogout() {
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();

    sendJsonResponse(['success' => true, 'message' => 'ออกจากระบบเรียบร้อยแล้ว']);
}

function handleMe() {
    if (isset($_SESSION['user_id'])) {
        sendJsonResponse([
            'authenticated' => true,
            'user' => [
                'id'         => $_SESSION['user_id'],
                'username'   => $_SESSION['username'],
                'full_name'  => $_SESSION['full_name'],
                'department' => $_SESSION['department']
            ]
        ]);
    } else {
        sendJsonResponse(['authenticated' => false, 'user' => null]);
    }
}
