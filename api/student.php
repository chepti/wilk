<?php
// נקודות קצה לתלמיד: הצטרפות בקוד, דיווח שקף, שמירת מיקום, שליפת התקדמות.

require __DIR__ . '/db.php';

$a = $_GET['a'] ?? '';

switch ($a) {

case 'join': {
    $b = body();
    $code = preg_replace('/\D+/', '', (string)($b['code'] ?? ''));
    $nick = trim((string)($b['nickname'] ?? ''));
    $emoji = trim((string)($b['emoji'] ?? ''));
    if ($code === '' || $nick === '') json_err('חסר קוד כיתה או שם');
    if ($emoji === '') json_err('בחרו תמונה — היא הסיסמה הקטנה שלכם');
    if (mb_strlen($nick) > 30) json_err('השם ארוך מדי');
    $db = db();
    $st = $db->prepare('SELECT id, name, free_nav FROM classes WHERE code = ?');
    $st->execute([$code]);
    $cls = $st->fetch(PDO::FETCH_ASSOC);
    if (!$cls) json_err('קוד הכיתה לא נמצא — בדקו עם המורה');

    $classId = (int)$cls['id'];
    $st = $db->prepare('SELECT id, emoji FROM students WHERE class_id = ? AND nickname = ?');
    $st->execute([$classId, $nick]);
    $existing = $st->fetch(PDO::FETCH_ASSOC);
    if ($existing) {
        if ($existing['emoji'] !== '' && $existing['emoji'] !== $emoji) {
            json_err('השם הזה כבר קיים בכיתה עם תמונה אחרת. אם זה אתם — בחרו את התמונה שבחרתם בפעם הראשונה, ואם לא — בחרו שם אחר', 409);
        }
        $sid = (int)$existing['id'];
    } else {
        $db->prepare("INSERT INTO students (class_id, nickname, emoji, last_seen) VALUES (?, ?, ?, datetime('now'))")
           ->execute([$classId, $nick, $emoji]);
        $sid = (int)$db->lastInsertId();
    }
    json_out([
        'token' => make_token('s', $sid),
        'classId' => $classId,
        'className' => $cls['name'],
        'freeNav' => (bool)$cls['free_nav'],
    ]);
}

// דיווח סיום שקף: {unitId, slide, kind, correct, wrong, seconds, skills:{c:{c,w}}, next, total}
case 'result': {
    $sid = require_student();
    $b = body();
    $unit = substr((string)($b['unitId'] ?? ''), 0, 20);
    $slide = (int)($b['slide'] ?? -1);
    if ($unit === '' || $slide < 0) json_err('דיווח לא תקין');
    $clamp = fn($v) => max(0, min(500, (int)$v));
    $db = db();
    $db->prepare('INSERT INTO slide_results (student_id, unit_id, slide, kind, correct, wrong, seconds) VALUES (?, ?, ?, ?, ?, ?, ?)')
       ->execute([$sid, $unit, $slide, substr((string)($b['kind'] ?? ''), 0, 20),
                  $clamp($b['correct'] ?? 0), $clamp($b['wrong'] ?? 0), max(0, min(3600, (int)($b['seconds'] ?? 0)))]);

    $skills = $b['skills'] ?? [];
    if (is_array($skills)) {
        $up = $db->prepare("INSERT INTO skill_stats (student_id, skill, correct, wrong, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            ON CONFLICT(student_id, skill) DO UPDATE SET
                correct = correct + excluded.correct,
                wrong = wrong + excluded.wrong,
                updated_at = datetime('now')");
        foreach ($skills as $skill => $e) {
            if (!is_string($skill) || !preg_match('/^[a-z]{1,4}$/', $skill)) continue;
            $c = $clamp($e['c'] ?? 0);
            $w = $clamp($e['w'] ?? 0);
            if ($c === 0 && $w === 0) continue;
            $up->execute([$sid, $skill, $c, $w]);
        }
    }
    save_position($sid, $unit, (int)($b['next'] ?? $slide + 1), (int)($b['total'] ?? 0));
    touch_student($sid);
    json_out(['ok' => true]);
}

// שמירת מיקום בלבד (מעבר לשקף בלי ניקוד — סרטון, שער)
case 'position': {
    $sid = require_student();
    $b = body();
    $unit = substr((string)($b['unitId'] ?? ''), 0, 20);
    if ($unit === '') json_err('דיווח לא תקין');
    save_position($sid, $unit, (int)($b['slide'] ?? 0), (int)($b['total'] ?? 0));
    touch_student($sid);
    json_out(['ok' => true]);
}

case 'progress': {
    $sid = require_student();
    touch_student($sid);
    $fn = db()->prepare('SELECT c.free_nav FROM classes c JOIN students s ON s.class_id = c.id WHERE s.id = ?');
    $fn->execute([$sid]);
    json_out(student_progress($sid) + ['freeNav' => (bool)($fn->fetchColumn() ?: 0)]);
}

default:
    json_err('פעולה לא מוכרת', 404);
}

function save_position(int $sid, string $unit, int $slide, int $total): void {
    $slide = max(0, $slide);
    $done = ($total > 0 && $slide >= $total) ? 1 : 0;
    db()->prepare("INSERT INTO positions (student_id, unit_id, slide, furthest, completed, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(student_id, unit_id) DO UPDATE SET
            slide = excluded.slide,
            furthest = MAX(furthest, excluded.furthest),
            completed = MAX(completed, excluded.completed),
            updated_at = datetime('now')")
        ->execute([$sid, $unit, $done ? 0 : $slide, $slide, $done]);
}
