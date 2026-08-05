<?php
/**
 * REST API & MariaDB PDO Connection Script
 * System: Student Project Archive & Showcase System
 */

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. Database Connection Configuration (Dedicated DB User)
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
    echo json_encode([
        "status" => "error",
        "message" => "Database connection failed: " . $e->getMessage()
    ]);
    exit();
}

// 2. Route Request Handling
$action = isset($_GET['action']) ? $_GET['action'] : 'get_projects';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'get_projects':
        // GET: Fetch all projects
        try {
            $stmt = $pdo->query("SELECT * FROM projects ORDER BY id DESC");
            $projects = $stmt->fetchAll();
            
            // Format tags array
            foreach ($projects as &$p) {
                $p['tags'] = array_map('trim', explode(',', $p['tags']));
            }
            
            echo json_encode(["status" => "success", "data" => $projects]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    case 'save_project':
        // POST: Create or Update Project
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(["status" => "error", "message" => "Method not allowed"]);
            exit();
        }

        $input = json_decode(file_get_contents('php://input'), true);

        $id = isset($input['id']) ? intval($input['id']) : 0;
        $title = $input['title'] ?? '';
        $level = $input['level'] ?? '';
        $category = $input['category'] ?? '';
        $description = $input['description'] ?? '';
        $tags = is_array($input['tags']) ? implode(', ', $input['tags']) : ($input['tags'] ?? '');
        $status = $input['status'] ?? 'Completed';
        $image_url = $input['image_url'] ?? '';
        $github_url = $input['github_url'] ?? '';

        if (empty($title) || empty($level) || empty($category)) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Required fields missing"]);
            exit();
        }

        try {
            if ($id > 0) {
                // Update
                $stmt = $pdo->prepare("UPDATE projects SET title=?, level=?, category=?, description=?, tags=?, status=?, image_url=?, github_url=? WHERE id=?");
                $stmt->execute([$title, $level, $category, $description, $tags, $status, $image_url, $github_url, $id]);
                echo json_encode(["status" => "success", "message" => "Project updated successfully"]);
            } else {
                // Insert
                $stmt = $pdo->prepare("INSERT INTO projects (title, level, category, description, tags, status, image_url, github_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$title, $level, $category, $description, $tags, $status, $image_url, $github_url]);
                echo json_encode(["status" => "success", "message" => "Project created successfully", "id" => $pdo->lastInsertId()]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    case 'delete_project':
        // POST/DELETE: Remove Project
        $input = json_decode(file_get_contents('php://input'), true);
        $id = isset($input['id']) ? intval($input['id']) : 0;

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Invalid ID"]);
            exit();
        }

        try {
            $stmt = $pdo->prepare("DELETE FROM projects WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(["status" => "success", "message" => "Project deleted successfully"]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    case 'login':
        // POST: User Authentication
        $input = json_decode(file_get_contents('php://input'), true);
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';

        if ($username === 'admin' && $password === 'admin123') {
            echo json_encode([
                "status" => "success",
                "user" => [
                    "username" => "admin",
                    "role" => "admin",
                    "name" => "ผู้ดูแลระบบ IT Admin"
                ]
            ]);
        } else {
            http_response_code(401);
            echo json_encode(["status" => "error", "message" => "Invalid credentials"]);
        }
        break;

    default:
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid action"]);
        break;
}
