<?php
// פעולות מורה משותפות — לממשק המורה (teacher.php) ולשכבת הסוכנים (index.php).

require_once __DIR__ . '/db.php';

// קוד כיתה = 6 ספרות (קל לילדים; בלי אפס בהתחלה כדי שלא ייעלם בהעתקה)
function gen_code(PDO $db): string {
    for ($i = 0; $i < 40; $i++) {
        $code = (string)random_int(100000, 999999);
        $st = $db->prepare('SELECT 1 FROM classes WHERE code = ?');
        $st->execute([$code]);
        if (!$st->fetch()) return $code;
    }
    json_err('לא הצלחנו ליצור קוד ייחודי', 500);
    exit;
}

function t_register(array $b): array {
    $name = trim((string)($b['name'] ?? ''));
    $email = strtolower(trim((string)($b['email'] ?? '')));
    $pass = (string)($b['password'] ?? '');
    if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) json_err('שם ואימייל תקין נדרשים');
    if (strlen($pass) < 6) json_err('סיסמה קצרה מדי (לפחות 6 תווים)');
    $db = db();
    $st = $db->prepare('SELECT id FROM teachers WHERE email = ?');
    $st->execute([$email]);
    if ($st->fetch()) json_err('כתובת האימייל כבר רשומה — נסו להתחבר');
    $db->prepare('INSERT INTO teachers (name, email, pass_hash) VALUES (?, ?, ?)')
       ->execute([$name, $email, password_hash($pass, PASSWORD_DEFAULT)]);
    return ['token' => make_token('t', (int)$db->lastInsertId()), 'name' => $name, 'email' => $email];
}

function t_login(array $b): array {
    $email = strtolower(trim((string)($b['email'] ?? '')));
    $pass = (string)($b['password'] ?? '');
    $st = db()->prepare('SELECT id, name, pass_hash FROM teachers WHERE email = ?');
    $st->execute([$email]);
    $t = $st->fetch(PDO::FETCH_ASSOC);
    if (!$t || !$t['pass_hash'] || !password_verify($pass, $t['pass_hash'])) {
        json_err('אימייל או סיסמה שגויים', 401);
    }
    return ['token' => make_token('t', (int)$t['id']), 'name' => $t['name'], 'email' => $email];
}

function class_row(array $r): array {
    return [
        'id' => (int)$r['id'],
        'name' => $r['name'],
        'code' => $r['code'],
        'freeNav' => (bool)$r['free_nav'],
        'showFriends' => (bool)($r['show_friends'] ?? 0),
        'students' => (int)($r['students'] ?? 0),
    ];
}

/** חברים על המפה: מפעילים / מכבים לכיתה (ברירת מחדל בכיתה חדשה: מופעל) */
function t_set_friends(int $tid, array $b): array {
    $c = t_find_class($tid, $b);
    $on = !empty($b['on']) ? 1 : 0;
    db()->prepare('UPDATE classes SET show_friends = ? WHERE id = ?')->execute([$on, $c['id']]);
    return ['ok' => true, 'classId' => (int)$c['id'], 'showFriends' => (bool)$on];
}

function t_classes(int $tid): array {
    $st = db()->prepare('SELECT c.id, c.name, c.code, c.free_nav, c.show_friends,
            (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS students
        FROM classes c WHERE c.teacher_id = ? ORDER BY c.id DESC');
    $st->execute([$tid]);
    return array_map('class_row', $st->fetchAll(PDO::FETCH_ASSOC));
}

function t_create_class(int $tid, array $b): array {
    $name = trim((string)($b['name'] ?? ''));
    if ($name === '') json_err('חסר שם כיתה');
    $db = db();
    $code = gen_code($db);
    // חברים על המפה — מופעל כברירת מחדל בכיתה חדשה (המורה יכולה לכבות)
    $db->prepare('INSERT INTO classes (teacher_id, name, code, show_friends) VALUES (?, ?, ?, 1)')->execute([$tid, $name, $code]);
    return ['id' => (int)$db->lastInsertId(), 'name' => $name, 'code' => $code, 'freeNav' => true, 'showFriends' => true, 'students' => 0];
}

/** איתור כיתה של המורה לפי id / קוד / חלק מהשם. בהתנגשות — רשימת מועמדים */
function t_find_class(int $tid, array $b): array {
    $db = db();
    if (!empty($b['classId']) || !empty($b['id'])) {
        $st = $db->prepare('SELECT * FROM classes WHERE id = ? AND teacher_id = ?');
        $st->execute([(int)($b['classId'] ?? $b['id']), $tid]);
        $r = $st->fetch(PDO::FETCH_ASSOC);
        if (!$r) json_err('כיתה לא נמצאה', 404);
        return $r;
    }
    $m = trim((string)($b['match'] ?? $b['code'] ?? ''));
    if ($m === '') json_err('חסר classId או match');
    $st = $db->prepare('SELECT * FROM classes WHERE teacher_id = ? AND (code = ? OR name LIKE ?)');
    $st->execute([$tid, $m, '%' . $m . '%']);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    if (count($rows) === 1) return $rows[0];
    if (!$rows) json_err("לא נמצאה כיתה שמתאימה ל-\"$m\"", 404);
    json_err('נמצאו כמה כיתות — ציינו classId', 409, ['candidates' => array_map('class_row', $rows)]);
    exit;
}

function t_find_student(int $classId, array $b): array {
    $db = db();
    if (!empty($b['studentId'])) {
        $st = $db->prepare('SELECT * FROM students WHERE id = ? AND class_id = ?');
        $st->execute([(int)$b['studentId'], $classId]);
        $r = $st->fetch(PDO::FETCH_ASSOC);
        if (!$r) json_err('תלמיד לא נמצא', 404);
        return $r;
    }
    $m = trim((string)($b['student'] ?? ''));
    if ($m === '') json_err('חסר studentId או student');
    $st = $db->prepare('SELECT * FROM students WHERE class_id = ? AND nickname LIKE ?');
    $st->execute([$classId, '%' . $m . '%']);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $r) if ($r['nickname'] === $m) return $r;
    if (count($rows) === 1) return $rows[0];
    if (!$rows) json_err("לא נמצא תלמיד שמתאים ל-\"$m\"", 404);
    json_err('נמצאו כמה תלמידים — ציינו studentId', 409, ['candidates' => array_map(
        fn($r) => ['id' => (int)$r['id'], 'nickname' => $r['nickname'], 'emoji' => $r['emoji']], $rows)]);
    exit;
}

function t_set_free(int $tid, array $b): array {
    $c = t_find_class($tid, $b);
    $free = !empty($b['free']) ? 1 : 0;
    db()->prepare('UPDATE classes SET free_nav = ? WHERE id = ?')->execute([$free, $c['id']]);
    return ['ok' => true, 'classId' => (int)$c['id'], 'freeNav' => (bool)$free];
}

function t_rename_class(int $tid, array $b): array {
    $c = t_find_class($tid, $b);
    $name = trim((string)($b['name'] ?? ''));
    if ($name === '') json_err('חסר שם חדש');
    db()->prepare('UPDATE classes SET name = ? WHERE id = ?')->execute([$name, $c['id']]);
    return ['ok' => true, 'classId' => (int)$c['id'], 'name' => $name];
}

function t_delete_student(int $tid, array $b): array {
    $c = t_find_class($tid, $b);
    $s = t_find_student((int)$c['id'], $b);
    db()->prepare('DELETE FROM students WHERE id = ?')->execute([$s['id']]);
    return ['ok' => true, 'deleted' => ['id' => (int)$s['id'], 'nickname' => $s['nickname']]];
}

/** איפוס התקדמות של תלמיד ביחידה אחת (unitId) או בכולן */
function t_reset_student(int $tid, array $b): array {
    $c = t_find_class($tid, $b);
    $s = t_find_student((int)$c['id'], $b);
    $db = db();
    $unit = (string)($b['unitId'] ?? '');
    if ($unit !== '') {
        $db->prepare('DELETE FROM positions WHERE student_id = ? AND unit_id = ?')->execute([$s['id'], $unit]);
        $db->prepare('DELETE FROM slide_results WHERE student_id = ? AND unit_id = ?')->execute([$s['id'], $unit]);
    } else {
        foreach (['positions', 'slide_results', 'skill_stats'] as $t) {
            $db->prepare("DELETE FROM $t WHERE student_id = ?")->execute([$s['id']]);
        }
    }
    return ['ok' => true, 'studentId' => (int)$s['id'], 'unitId' => $unit ?: 'all'];
}

/** מפת חום: כל תלמיד + שליטה לפי צליל + מיקום בכל יחידה */
function t_heatmap(int $tid, array $b): array {
    $c = t_find_class($tid, $b);
    $st = db()->prepare('SELECT id, nickname, emoji, last_seen FROM students WHERE class_id = ? ORDER BY nickname');
    $st->execute([$c['id']]);
    $out = [];
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $s) {
        $p = student_progress((int)$s['id']);
        $out[] = [
            'id' => (int)$s['id'],
            'nickname' => $s['nickname'],
            'emoji' => $s['emoji'],
            'lastSeen' => $s['last_seen'],
        ] + $p;
    }
    return ['class' => class_row($c), 'students' => $out];
}
