<?php
// נקודות קצה לממשק המורה.

require __DIR__ . '/teacher_lib.php';

$a = $_GET['a'] ?? '';
$b = body();
if (isset($_GET['class'])) $b['classId'] = (int)$_GET['class'];

switch ($a) {
    case 'register':       json_out(t_register($b));
    case 'login':          json_out(t_login($b));
    case 'classes':        json_out(['classes' => t_classes(require_teacher())]);
    case 'create_class':   json_out(t_create_class(require_teacher(), $b));
    case 'set_free':       json_out(t_set_free(require_teacher(), $b));
    case 'set_friends':    json_out(t_set_friends(require_teacher(), $b));
    case 'rename_class':   json_out(t_rename_class(require_teacher(), $b));
    case 'delete_student': json_out(t_delete_student(require_teacher(), $b));
    case 'reset_student':  json_out(t_reset_student(require_teacher(), $b));
    case 'heatmap':        json_out(t_heatmap(require_teacher(), $b));
    default:               json_err('פעולה לא מוכרת', 404);
}
