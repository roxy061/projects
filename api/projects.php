<?php
// api/projects.php - Project CRUD API with Strict Authorization Guard

require_once __DIR__ . '/../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? intval($_GET['id']) : null;
$action = $_GET['action'] ?? '';

// Route handling
if ($method === 'GET') {
    if ($id) {
        getProjectById($id);
    } else {
        getAllProjects();
    }
} elseif ($method === 'POST') {
    if ($action === 'update' && $id) {
        updateProject($id);
    } elseif ($action === 'delete' && $id) {
        deleteProject($id);
    } else {
        createProject();
    }
} elseif ($method === 'PUT' && $id) {
    updateProject($id);
} elseif ($method === 'DELETE' && $id) {
    deleteProject($id);
} else {
    sendJsonResponse(['error' => 'Invalid endpoint or method'], 405);
}

// -------------------------------------------------------------
// 1. GET ALL PROJECTS (Public Access / Guest)
// -------------------------------------------------------------
function getAllProjects() {
    $db = getDBConnection();
    $search   = trim($_GET['search'] ?? '');
    $category = trim($_GET['category'] ?? '');

    $sql = "SELECT p.*, u.full_name AS author_name, u.username AS author_username, u.department AS author_department
            FROM projects p
            JOIN users u ON p.user_id = u.id
            WHERE 1=1";
    $params = [];

    if (!empty($search)) {
        $sql .= " AND (p.title LIKE :search OR p.description LIKE :search OR p.tech_stack LIKE :search OR u.full_name LIKE :search)";
        $params['search'] = "%{$search}%";
    }

    if (!empty($category) && $category !== 'All') {
        $sql .= " AND p.category = :category";
        $params['category'] = $category;
    }

    $sql .= " ORDER BY p.created_at DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $projects = $stmt->fetchAll();

    sendJsonResponse([
        'success'  => true,
        'count'    => count($projects),
        'projects' => $projects
    ]);
}

// -------------------------------------------------------------
// 2. GET SINGLE PROJECT BY ID (Public Access / Guest)
// -------------------------------------------------------------
function getProjectById($id) {
    $db = getDBConnection();
    $stmt = $db->prepare("SELECT p.*, u.full_name AS author_name, u.username AS author_username, u.department AS author_department
                          FROM projects p
                          JOIN users u ON p.user_id = u.id
                          WHERE p.id = :id");
    $stmt->execute(['id' => $id]);
    $project = $stmt->fetch();

    if (!$project) {
        sendJsonResponse(['error' => 'ไม่พบข้อมูลโปรเจกต์นี้'], 404);
    }

    sendJsonResponse(['success' => true, 'project' => $project]);
}

// -------------------------------------------------------------
// 3. CREATE PROJECT (Authenticated Users Only)
// -------------------------------------------------------------
function createProject() {
    $currentUserId = getLoggedInUserId();
    if (!$currentUserId) {
        sendJsonResponse(['error' => 'กรุณาเข้าสู่ระบบก่อนทำการอัปโหลดโปรเจกต์ (Unauthorized)'], 401);
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $title       = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    $category    = trim($input['category'] ?? 'Web Application');
    $tech_stack  = trim($input['tech_stack'] ?? '');
    $github_url  = trim($input['github_url'] ?? '');
    $demo_url    = trim($input['demo_url'] ?? '');
    $image_url   = trim($input['image_url'] ?? '');

    if (empty($title) || empty($description) || empty($tech_stack)) {
        sendJsonResponse(['error' => 'กรุณากรอกชื่อโปรเจกต์ รายละเอียด และ Tech Stack'], 400);
    }

    // Default image if none provided
    if (empty($image_url)) {
        $image_url = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=60';
    }

    $db = getDBConnection();
    $stmt = $db->prepare("INSERT INTO projects (user_id, title, description, category, tech_stack, github_url, demo_url, image_url)
                          VALUES (:user_id, :title, :description, :category, :tech_stack, :github_url, :demo_url, :image_url)");
    $stmt->execute([
        'user_id'     => $currentUserId,
        'title'       => $title,
        'description' => $description,
        'category'    => $category,
        'tech_stack'  => $tech_stack,
        'github_url'  => $github_url ?: null,
        'demo_url'    => $demo_url ?: null,
        'image_url'   => $image_url
    ]);

    $projectId = $db->lastInsertId();

    sendJsonResponse([
        'success' => true,
        'message' => 'เพิ่มโปรเจกต์เรียบร้อยแล้ว',
        'id'      => $projectId
    ], 201);
}

// -------------------------------------------------------------
// 4. UPDATE PROJECT (Strict Authorization Guard)
// -------------------------------------------------------------
function updateProject($id) {
    $currentUserId = getLoggedInUserId();
    if (!$currentUserId) {
        sendJsonResponse(['error' => 'กรุณาเข้าสู่ระบบก่อนแก้ไขโปรเจกต์ (Unauthorized)'], 401);
    }

    $db = getDBConnection();
    
    // Check ownership
    $stmt = $db->prepare("SELECT user_id FROM projects WHERE id = :id");
    $stmt->execute(['id' => $id]);
    $project = $stmt->fetch();

    if (!$project) {
        sendJsonResponse(['error' => 'ไม่พบโปรเจกต์ที่ต้องการแก้ไข'], 404);
    }

    // STRICT AUTHORIZATION GUARD CHECK
    if (intval($project['user_id']) !== intval($currentUserId)) {
        sendJsonResponse([
            'error' => 'ปฏิเสธการเข้าถึง! คุณไม่มีสิทธิ์แก้ไขโปรเจกต์ของสมาชิกท่านอื่น (Strict Authorization Guard Violation)'
        ], 403);
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $title       = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    $category    = trim($input['category'] ?? 'Web Application');
    $tech_stack  = trim($input['tech_stack'] ?? '');
    $github_url  = trim($input['github_url'] ?? '');
    $demo_url    = trim($input['demo_url'] ?? '');
    $image_url   = trim($input['image_url'] ?? '');

    if (empty($title) || empty($description) || empty($tech_stack)) {
        sendJsonResponse(['error' => 'กรุณากรอกข้อมูลสำคัญให้ครบถ้วน'], 400);
    }

    $stmt = $db->prepare("UPDATE projects SET
                            title = :title,
                            description = :description,
                            category = :category,
                            tech_stack = :tech_stack,
                            github_url = :github_url,
                            demo_url = :demo_url,
                            image_url = :image_url
                          WHERE id = :id AND user_id = :user_id");
    $stmt->execute([
        'title'       => $title,
        'description' => $description,
        'category'    => $category,
        'tech_stack'  => $tech_stack,
        'github_url'  => $github_url ?: null,
        'demo_url'    => $demo_url ?: null,
        'image_url'   => $image_url,
        'id'          => $id,
        'user_id'     => $currentUserId
    ]);

    sendJsonResponse([
        'success' => true,
        'message' => 'แก้ไขโปรเจกต์เรียบร้อยแล้ว'
    ]);
}

// -------------------------------------------------------------
// 5. DELETE PROJECT (Strict Authorization Guard)
// -------------------------------------------------------------
function deleteProject($id) {
    $currentUserId = getLoggedInUserId();
    if (!$currentUserId) {
        sendJsonResponse(['error' => 'กรุณาเข้าสู่ระบบก่อนลบโปรเจกต์ (Unauthorized)'], 401);
    }

    $db = getDBConnection();
    
    // Check ownership
    $stmt = $db->prepare("SELECT user_id FROM projects WHERE id = :id");
    $stmt->execute(['id' => $id]);
    $project = $stmt->fetch();

    if (!$project) {
        sendJsonResponse(['error' => 'ไม่พบโปรเจกต์ที่ต้องการลบ'], 404);
    }

    // STRICT AUTHORIZATION GUARD CHECK
    if (intval($project['user_id']) !== intval($currentUserId)) {
        sendJsonResponse([
            'error' => 'ปฏิเสธการเข้าถึง! คุณไม่มีสิทธิ์ลบโปรเจกต์ของสมาชิกท่านอื่น (Strict Authorization Guard Violation)'
        ], 403);
    }

    $stmt = $db->prepare("DELETE FROM projects WHERE id = :id AND user_id = :user_id");
    $stmt->execute(['id' => $id, 'user_id' => $currentUserId]);

    sendJsonResponse([
        'success' => true,
        'message' => 'ลบโปรเจกต์เรียบร้อยแล้ว'
    ]);
}
