<?php
// שכבת סוכנים: ?action=help (בלי סיסמה) · login · state · ops
// אימות: Authorization: Bearer <token> | X-Key: <token> | ?key=<token>  (הטוקן מתקבל מ-login)

require __DIR__ . '/teacher_lib.php';

$action = $_GET['action'] ?? 'help';

function units_catalog(): array {
    $f = __DIR__ . '/units.json';
    return file_exists($f) ? (json_decode((string)file_get_contents($f), true) ?: []) : [];
}

/** פעולות שמותרות ב-ops — שם → פונקציה(tid, args) */
function op_table(): array {
    return [
        'create_class'   => fn($t, $a) => t_create_class($t, $a),
        'rename_class'   => fn($t, $a) => t_rename_class($t, $a),
        'set_free'       => fn($t, $a) => t_set_free($t, $a),
        'heatmap'        => fn($t, $a) => t_heatmap($t, $a),
        'delete_student' => fn($t, $a) => t_delete_student($t, $a),
        'reset_student'  => fn($t, $a) => t_reset_student($t, $a),
    ];
}

switch ($action) {

case 'help':
    json_out([
        'app' => 'WILK — English through the Stars (מסע האותיות באנגלית)',
        'url' => 'https://chepti.com/wilk/',
        'auth' => 'POST ?action=login {"email","password"} → token. Then send header "Authorization: Bearer <token>" or "X-Key: <token>" or ?key=<token>. Tokens last 365 days.',
        'actions' => [
            'help'  => 'GET — this document. No auth.',
            'login' => 'POST {"email":"...","password":"..."} → {"token","name","email"}',
            'state' => 'GET — compact snapshot: your classes, and per student: units done (unit → best stars 0–5), where they stopped, weakest sounds. Optional &class=<id|code|name part>.',
            'plays' => 'GET student.php?a=plays — public: total unit entries on the site since the move from Jigzi.',
            'ops'   => 'POST {"ops":[{"op":"<name>", ...args}]} — runs each op, returns per-op {ok, result|error}. Ops never abort each other.',
        ],
        'ops' => [
            'create_class'   => ['args' => ['name' => 'string'], 'example' => ['op' => 'create_class', 'name' => 'ג׳2']],
            'rename_class'   => ['args' => ['match|classId' => 'class', 'name' => 'new name'], 'example' => ['op' => 'rename_class', 'match' => 'ג׳2', 'name' => 'ג׳2 — 2026']],
            'set_free'       => ['args' => ['match|classId' => 'class', 'free' => 'bool — true: all units open; false: units unlock in order'], 'example' => ['op' => 'set_free', 'match' => '123456', 'free' => false]],
            'heatmap'        => ['args' => ['match|classId' => 'class'], 'note' => 'full per-student detail (positions, per-slide first try, skills)'],
            'delete_student' => ['args' => ['match|classId' => 'class', 'student|studentId' => 'nickname (or part)'], 'example' => ['op' => 'delete_student', 'match' => 'ג׳2', 'student' => 'נועה']],
            'reset_student'  => ['args' => ['match|classId' => 'class', 'student|studentId' => 'nickname', 'unitId' => 'optional, e.g. "u3"; omit to reset all']],
        ],
        'matching' => '"match" finds a class by 6-digit code or part of its name; "student" finds by nickname. Ambiguous → HTTP 409 with "candidates".',
        'skills' => 'Skills are lowercase letters or sound patterns (c, a, ck, qu, ow...). mastery = correct / (correct + wrong) on first tries.',
        'units' => units_catalog(),
        'studentFlow' => 'Students join at https://chepti.com/wilk/#/join/<code> with a first name + a picture (emoji). No student data is writable via this API except delete/reset.',
    ]);

case 'login':
    json_out(t_login(body()));

case 'state': {
    $tid = require_teacher();
    $classes = t_classes($tid);
    if (isset($_GET['class'])) {
        $one = t_find_class($tid, ['match' => (string)$_GET['class'], 'classId' => ctype_digit((string)$_GET['class']) && strlen((string)$_GET['class']) < 6 ? (int)$_GET['class'] : 0]);
        $classes = [class_row($one + ['students' => 0])];
    }
    $units = units_catalog();
    $out = [];
    foreach ($classes as $c) {
        $hm = t_heatmap($tid, ['classId' => $c['id']]);
        $students = [];
        foreach ($hm['students'] as $s) {
            $done = [];
            $current = null;
            foreach ((array)$s['positions'] as $u => $p) {
                if ($p['completed']) $done[$u] = $p['stars'];
                elseif (!$current || $p['at'] > $current['at']) $current = ['unit' => $u, 'slide' => $p['slide'], 'at' => $p['at']];
            }
            $weak = [];
            foreach ((array)$s['skills'] as $k => $v) {
                $n = $v['c'] + $v['w'];
                if ($n >= 3) $weak[$k] = round($v['c'] / $n, 2);
            }
            asort($weak);
            $students[] = [
                'name' => $s['nickname'] . ' ' . $s['emoji'],
                'lastSeen' => $s['lastSeen'],
                'unitsDone' => $done ?: new stdClass(),   // unit → best stars (0–5)
                'stoppedAt' => $current ? $current['unit'] . '#' . ($current['slide'] + 1) : null,
                'weakest' => array_slice($weak, 0, 3, true) ?: new stdClass(),
            ];
        }
        $out[] = ['id' => $c['id'], 'name' => $c['name'], 'code' => $c['code'], 'freeNav' => $c['freeNav'], 'students' => $students];
    }
    json_out(['units' => count($units), 'classes' => $out]);
}

case 'ops': {
    $tid = require_teacher();
    $ops = body()['ops'] ?? null;
    if (!is_array($ops)) json_err('שלחו {"ops":[...]}');
    $table = op_table();
    $results = [];
    foreach ($ops as $i => $op) {
        $name = is_array($op) ? (string)($op['op'] ?? '') : '';
        if (!isset($table[$name])) { $results[] = ['i' => $i, 'op' => $name, 'ok' => false, 'error' => 'unknown op']; continue; }
        // json_err בתוך פעולה עוצר את הסקריפט — לוכדים את הפלט כדי שפעולה אחת לא תפיל את השאר
        $results[] = run_op($i, $name, $table[$name], $tid, $op);
    }
    json_out(['results' => $results]);
}

default:
    json_err('פעולה לא מוכרת — נסו ?action=help', 404);
}

/** מריץ פעולה בתהליך-משנה לוגי: json_err זורק, אנחנו לוכדים */
function run_op(int $i, string $name, callable $fn, int $tid, array $args): array {
    $GLOBALS['__op_mode'] = true;
    try {
        return ['i' => $i, 'op' => $name, 'ok' => true, 'result' => $fn($tid, $args)];
    } catch (OpError $e) {
        return ['i' => $i, 'op' => $name, 'ok' => false, 'error' => $e->getMessage()] + ($e->extra ? $e->extra : []);
    } catch (Throwable $e) {
        return ['i' => $i, 'op' => $name, 'ok' => false, 'error' => 'server error'];
    } finally {
        $GLOBALS['__op_mode'] = false;
    }
}
