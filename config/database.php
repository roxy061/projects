<?php
// config/database.php
// Database configuration and PDO Connection setup for MariaDB

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

define('DB_HOST', 'localhost');
define('DB_NAME', 'dept_projects');
define('DB_USER', 'proj_user');
define('DB_PASS', 'SecretPass123!');
define('DB_CHARSET', 'utf8mb4');

function getDBConnection() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // Fallback for XAMPP default root if proj_user is not configured yet locally
            try {
                $dsn = "mysql:host=localhost;dbname=" . DB_NAME . ";charset=utf8mb4";
                $pdo = new PDO($dsn, 'root', '', [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
            } catch (PDOException $ex) {
                sendJsonResponse(['error' => 'Database Connection Failed: ' . $ex->getMessage()], 500);
            }
        }
    }
    return $pdo;
}

function sendJsonResponse($data, $statusCode = 200) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function getLoggedInUserId() {
    return $_SESSION['user_id'] ?? null;
}
