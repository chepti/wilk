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
    $quality = isset($b['quality']) ? max(0.0, min(1.0, (float)$b['quality'])) : null;
    $db = db();
    $db->prepare('INSERT INTO slide_results (student_id, unit_id, slide, kind, correct, wrong, seconds, quality) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
       ->execute([$sid, $unit, $slide, substr((string)($b['kind'] ?? ''), 0, 20),
                  $clamp($b['correct'] ?? 0), $clamp($b['wrong'] ?? 0), max(0, min(3600, (int)($b['seconds'] ?? 0))), $quality]);

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
    if (isset($b['stars'])) {
        // שומרים את התוצאה הטובה ביותר — שיפור מעלה, ניסיון חלש לא מוריד
        // CAST — PDO קושר כמחרוזת, ובהשוואה של SQLite מחרוזת תמיד "גדולה" ממספר
        $db->prepare('UPDATE positions SET stars = MAX(stars, CAST(? AS INTEGER)) WHERE student_id = ? AND unit_id = ?')
           ->execute([max(0, min(5, (int)$b['stars'])), $sid, $unit]);
    }
    touch_student($sid);
    json_out(['ok' => true]);
}

// כניסה לתחנה: מונה אנונימי לכל האתר, ולתלמיד מחובר — גם אצלו
case 'visit': {
    $b = body();
    $unit = substr((string)($b['unitId'] ?? ''), 0, 20);
    if (!preg_match('/^u\d{1,3}$/', $unit)) json_err('תחנה לא תקינה');
    $db = db();
    $db->prepare("INSERT INTO unit_plays (unit_id, day, n) VALUES (?, date('now'), 1)
        ON CONFLICT(unit_id, day) DO UPDATE SET n = n + 1")->execute([$unit]);
    $sid = parse_token(bearer(), 's');
    if ($sid !== null) {
        $db->prepare("INSERT INTO positions (student_id, unit_id, visits, updated_at) VALUES (?, ?, 1, datetime('now'))
            ON CONFLICT(student_id, unit_id) DO UPDATE SET visits = visits + 1")->execute([$sid, $unit]);
        touch_student($sid);
    }
    json_out(['ok' => true]);
}

// סה"כ כניסות לכל תחנה (ציבורי)
case 'plays': {
    $rows = db()->query('SELECT unit_id, SUM(n) AS n FROM unit_plays GROUP BY unit_id')->fetchAll(PDO::FETCH_ASSOC);
    $out = [];
    foreach ($rows as $r) $out[$r['unit_id']] = (int)$r['n'];
    json_out(['plays' => $out ?: new stdClass()]);
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
    $fn = db()->prepare('SELECT c.free_nav, c.show_friends, s.look FROM classes c JOIN students s ON s.class_id = c.id WHERE s.id = ?');
    $fn->execute([$sid]);
    $r = $fn->fetch(PDO::FETCH_ASSOC) ?: [];
    json_out(student_progress($sid) + [
        'freeNav' => (bool)($r['free_nav'] ?? 0),
        'showFriends' => (bool)($r['show_friends'] ?? 0),
        'look' => ($r['look'] ?? '') !== '' ? json_decode($r['look'], true) : null,
    ]);
}

// שמירת דמות השודד: {look: {base, items[]}}
case 'look': {
    $sid = require_student();
    $look = body()['look'] ?? null;
    if (!is_array($look)) json_err('דמות לא תקינה');
    $clean = [
        'base' => max(0, min(20, (int)($look['base'] ?? 0))),
        'items' => array_values(array_slice(array_filter((array)($look['items'] ?? []), fn($x) => is_string($x) && preg_match('/^[a-z]{2,12}$/', $x)), 0, 8)),
    ];
    db()->prepare('UPDATE students SET look = ? WHERE id = ?')->execute([json_encode($clean), $sid]);
    json_out(['ok' => true, 'look' => $clean]);
}

// יעד כיתתי משותף: סך הכוכבים (הטובים ביותר) של כל הכיתה מול יעד. שיתוף, לא תחרות.
case 'class': {
    $sid = require_student();
    $db = db();
    $st = $db->prepare('SELECT c.id, c.name FROM classes c JOIN students s ON s.class_id = c.id WHERE s.id = ?');
    $st->execute([$sid]);
    $cls = $st->fetch(PDO::FETCH_ASSOC);
    if (!$cls) json_err('כיתה לא נמצאה', 404);
    $n = $db->prepare('SELECT COUNT(*) FROM students WHERE class_id = ?');
    $n->execute([(int)$cls['id']]);
    $students = (int)$n->fetchColumn();
    $s = $db->prepare('SELECT COALESCE(SUM(p.stars), 0) FROM positions p JOIN students s ON s.id = p.student_id WHERE s.class_id = ?');
    $s->execute([(int)$cls['id']]);
    $stars = (int)$s->fetchColumn();
    // יעד מדורג: כל 15 כוכבים לתלמיד בממוצע נפתח אוצר כיתתי (עד 6 אוצרות — 90 כוכבים לתלמיד)
    $step = max(20, $students * 15);
    $goal = (intdiv($stars, $step) + 1) * $step;
    json_out(['name' => $cls['name'], 'students' => $students, 'stars' => $stars, 'goal' => $goal, 'step' => $step, 'treasures' => intdiv($stars, $step)]);
}

// חברים לכיתה על המפה — רק אם המורה הפעילה. שם פרטי + דמות + תחנה. בלי אימוג'י (הוא הסיסמה) ובלי ציונים.
case 'classmates': {
    $sid = require_student();
    $db = db();
    $st = $db->prepare('SELECT c.id, c.show_friends FROM classes c JOIN students s ON s.class_id = c.id WHERE s.id = ?');
    $st->execute([$sid]);
    $cls = $st->fetch(PDO::FETCH_ASSOC);
    if (!$cls || !(int)$cls['show_friends']) json_out(['enabled' => false, 'friends' => []]);
    $st = $db->prepare('SELECT id, nickname, look FROM students WHERE class_id = ? AND id != ?');
    $st->execute([(int)$cls['id'], $sid]);
    $out = [];
    $pos = $db->prepare('SELECT unit_id, completed, updated_at FROM positions WHERE student_id = ? ORDER BY updated_at DESC');
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $s) {
        $pos->execute([(int)$s['id']]);
        $rows = $pos->fetchAll(PDO::FETCH_ASSOC);
        if (!$rows) continue;
        // התחנה שבה נמצא/ת: האחרונה שלא הושלמה, אחרת האחרונה שנגעו בה
        $open = array_values(array_filter($rows, fn($r) => !(int)$r['completed']));
        $unit = ($open[0] ?? $rows[0])['unit_id'];
        $out[] = [
            'name' => $s['nickname'],
            'look' => $s['look'] !== '' ? json_decode($s['look'], true) : null,
            'unit' => $unit,
        ];
    }
    json_out(['enabled' => true, 'friends' => $out]);
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
