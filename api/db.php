<?php
// תשתית משותפת: SQLite, סכימה, טוקנים, עזרי JSON.

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');

function json_out(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** שגיאה בתוך ?action=ops — נלכדת ומדווחת לפעולה הבודדת */
class OpError extends Exception {
    public array $extra;
    public function __construct(string $msg, array $extra = []) { parent::__construct($msg); $this->extra = $extra; }
}

function json_err(string $msg, int $status = 400, array $extra = []): void {
    if (!empty($GLOBALS['__op_mode'])) throw new OpError($msg, $extra);
    json_out(['error' => $msg] + $extra, $status);
}

function body(): array {
    $raw = file_get_contents('php://input');
    $d = json_decode($raw ?: '', true);
    return is_array($d) ? $d : [];
}

/** תיקיית נתונים: מחוץ ל-public_html אם אפשר, אחרת תת-תיקייה חסומה */
function data_dir(): string {
    $outside = realpath(__DIR__ . '/../../..');
    $candidates = [];
    if ($outside && is_writable($outside)) {
        $candidates[] = $outside . '/wilk_data';
    }
    $candidates[] = __DIR__ . '/data';
    foreach ($candidates as $dir) {
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        if (is_dir($dir) && is_writable($dir)) {
            $ht = $dir . '/.htaccess';
            if (!file_exists($ht)) {
                @file_put_contents($ht, "Require all denied\n");
            }
            return $dir;
        }
    }
    json_err('אין תיקיית נתונים זמינה בשרת', 500);
    exit;
}

function db(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;
    $pdo = new PDO('sqlite:' . data_dir() . '/wilk.db');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA journal_mode = WAL');
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec("CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        pass_hash TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL REFERENCES teachers(id),
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        free_nav INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        nickname TEXT NOT NULL,
        emoji TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_seen TEXT,
        UNIQUE(class_id, nickname)
    )");
    // תוצאה של שקף אחד (הטובה נשמרת בנפרד — כאן היסטוריה מלאה)
    $pdo->exec("CREATE TABLE IF NOT EXISTS slide_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        unit_id TEXT NOT NULL,
        slide INTEGER NOT NULL,
        kind TEXT NOT NULL DEFAULT '',
        correct INTEGER NOT NULL DEFAULT 0,
        wrong INTEGER NOT NULL DEFAULT 0,
        seconds INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )");
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_results_student ON slide_results(student_id, unit_id)');
    // איפה התלמיד עצר בכל יחידה
    $pdo->exec("CREATE TABLE IF NOT EXISTS positions (
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        unit_id TEXT NOT NULL,
        slide INTEGER NOT NULL DEFAULT 0,
        furthest INTEGER NOT NULL DEFAULT 0,
        completed INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (student_id, unit_id)
    )");
    // שליטה לפי אות / צליל (c, a, ck, qu...)
    $pdo->exec("CREATE TABLE IF NOT EXISTS skill_stats (
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        skill TEXT NOT NULL,
        correct INTEGER NOT NULL DEFAULT 0,
        wrong INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (student_id, skill)
    )");
    return $pdo;
}

function secret(): string {
    $f = data_dir() . '/secret.key';
    if (!file_exists($f)) {
        file_put_contents($f, bin2hex(random_bytes(32)));
        @chmod($f, 0600);
    }
    return trim((string)file_get_contents($f));
}

/** טוקן חתום: role:id:expiry:hmac */
function make_token(string $role, int $id, int $days = 365): string {
    $exp = time() + $days * 86400;
    $payload = "$role:$id:$exp";
    return $payload . ':' . hash_hmac('sha256', $payload, secret());
}

function parse_token(?string $token, string $expectRole): ?int {
    if (!$token) return null;
    $parts = explode(':', $token);
    if (count($parts) !== 4) return null;
    [$role, $id, $exp, $sig] = $parts;
    if ($role !== $expectRole) return null;
    if ((int)$exp < time()) return null;
    $payload = "$role:$id:$exp";
    if (!hash_equals(hash_hmac('sha256', $payload, secret()), $sig)) return null;
    return (int)$id;
}

/** טוקן מכותרת Authorization: Bearer, כותרת X-Key, או ?key= (לסוכנים) */
function bearer(): ?string {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($h === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) {
            if (strtolower($k) === 'authorization') { $h = $v; break; }
        }
    }
    if (preg_match('/Bearer\s+(.+)/i', $h, $m)) return trim($m[1]);
    if (!empty($_SERVER['HTTP_X_KEY'])) return trim($_SERVER['HTTP_X_KEY']);
    if (!empty($_GET['key'])) return trim((string)$_GET['key']);
    return null;
}

function require_teacher(): int {
    $id = parse_token(bearer(), 't');
    if ($id === null) json_err('יש להתחבר מחדש', 401);
    return $id;
}

function require_student(): int {
    $id = parse_token(bearer(), 's');
    if ($id === null) json_err('החיבור פג — היכנסו שוב עם קוד הכיתה', 401);
    return $id;
}

function touch_student(int $sid): void {
    db()->prepare("UPDATE students SET last_seen = datetime('now') WHERE id = ?")->execute([$sid]);
}

/** מצב מלא של תלמיד: מיקומים, תוצאה טובה לכל שקף, שליטה לפי צליל */
function student_progress(int $sid): array {
    $db = db();
    $pos = [];
    $st = $db->prepare('SELECT unit_id, slide, furthest, completed, updated_at FROM positions WHERE student_id = ?');
    $st->execute([$sid]);
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $pos[$r['unit_id']] = [
            'slide' => (int)$r['slide'], 'furthest' => (int)$r['furthest'],
            'completed' => (bool)$r['completed'], 'at' => $r['updated_at'],
        ];
    }
    // לכל שקף: האם נפתר, והניסיון הראשון (הכי מלמד על שליטה)
    $slides = [];
    $st = $db->prepare('SELECT unit_id, slide, correct, wrong FROM slide_results WHERE student_id = ? ORDER BY id');
    $st->execute([$sid]);
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $k = $r['unit_id'] . ':' . $r['slide'];
        if (!isset($slides[$k])) $slides[$k] = ['c' => (int)$r['correct'], 'w' => (int)$r['wrong'], 'n' => 0];
        $slides[$k]['n']++;
    }
    $skills = [];
    $st = $db->prepare('SELECT skill, correct, wrong FROM skill_stats WHERE student_id = ?');
    $st->execute([$sid]);
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $skills[$r['skill']] = ['c' => (int)$r['correct'], 'w' => (int)$r['wrong']];
    }
    return [
        'positions' => $pos ?: new stdClass(),
        'slides' => $slides ?: new stdClass(),
        'skills' => $skills ?: new stdClass(),
    ];
}
