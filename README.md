# English through the Stars — WILK

18 היחידות שנבנו בזמנו ב-Jigzi, כאפליקציה עצמאית בדומיין שלנו — בלי התחברות גוגל ובלי תלות בפלטפורמה.

| | |
|---|---|
| **אתר** | https://chepti.com/wilk/ (בדיקה: https://chepti.com/wilk-beta/) |
| **שיטה** | פנינה וילק — English through the Stars (הספר והשיטה האנלוגית, הגרסה הדיגיטלית באישורה) |
| **יוצרת** | חפציה בן ארצי · [חולמים תקשוב](https://chepti.com) |
| **משוב** | chepti@gmail.com |

## מה יש כאן

- **נגן נאמן למקור**: כל 222 השקפים — שער, סרטון, הקשה ושמיעה, מצא את התשובה, גרירה, חידון קלפים, התאמה, זיכרון, כרטיסיות, פוסטר — מצוירים מהנתונים המקוריים של Jigzi באותה במה (1920×1080), אותן ערכות עיצוב, גופנים, צלילי משוב והקלטות.
- **תלמידים**: קוד כיתה (6 ספרות) + שם פרטי + תמונה (אימוג'י עם שם — "אני הכדור"), או משחק בלי כיתה (נשמר במכשיר). ממשיכים בדיוק מהשקף שבו עצרו.
- **מורים**: כיתות, קישור הצטרפות, מסלול חופשי/הדרגתי, **מפת חום** לפי אות/צליל (שליטה בניסיון ראשון) ולפי תחנה (איפה כל תלמיד עצר).
- **סוכנים**: `api/?action=help` · `state` · `ops`, `llms.txt`, `AGENT.md`.

## מבנה

```
WILK/
├── archive/            ← גיבוי מלא מ-Jigzi (json/ בגיט; media/ ו-ui/ לא — כבדים)
│   ├── json/           JSON של כל ג'יג וכל שקף, כפי שהגיע מה-API
│   ├── media/          1,359 קבצי מדיה (ההקלטות, תמונות, רקעים) — 315MB
│   └── ui/             ערכות עיצוב, גופנים, צלילי משוב של Jigzi
├── tools/
│   ├── archive.ps1         הורדת הארכיון (API ציבורי של Jigzi)
│   ├── fetch-ui.mjs        ערכות עיצוב + גופנים בשימוש → app/public/ui
│   ├── build-content.mjs   ארכיון → app/public/content/u*.json + media/*.webp|mp3
│   └── JIGZI-FORMAT.md     מפרט הפורמט וההתנהגות (מקוד המקור של Jigzi)
├── app/                ← Vite + React + TS
│   └── src/
│       ├── engine/     Stage (במה, מדבקות, אזורי מגע), ערכות, גאומטריה, חוזה נגן
│       ├── games/      TappingBoard, FindAnswer, DragDrop, Cards (Quiz/Matching/Memory/Flashcards), Design (Cover/Poster/Video)
│       └── views/      Landing, Join, StarMap, PlayView, Teacher
└── api/                ← PHP + SQLite (~/wilk_data/wilk.db)
    ├── student.php  teacher.php  index.php (שכבת סוכנים)
    └── db.php  teacher_lib.php  (חסומים לגישה ישירה)
```

## בנייה ופריסה

```powershell
node tools/build-content.mjs      # אחרי שינוי בארכיון
node tools/fetch-ui.mjs
cd app; npm run build             # /wilk/
# גרסת בדיקה:  $env:WILK_BASE='/wilk-beta/'; npm run build
scp -r -F "T:\.ssh\config" dist/* hostinger:~/public_html/wilk/
scp -r -F "T:\.ssh\config" ..\api hostinger:~/public_html/wilk/
```

תיקיית `public_html/wilk/` גוברת על עמוד הוורדפרס `/wilk` (שנשאר במקומו — אפשר לחזור אליו במחיקת התיקייה).

## הערות

- **זכויות תמונות**: ההקלטות והתמונות שהועלו הן שלנו. תמונות מספריית Jigzi (Global) ותמונות רשת (Web) נשמרו בארכיון — כדאי לבדוק/להחליף בהדרגה.
- **שליטה** = הצלחה בניסיון הראשון; שקפי הקשה וכרטיסיות הם חשיפה ולא נספרים.
- שיוך לצליל: לפי המילה/השאלה (מילה שמתחילה ב-c → c), אחרת לכל צלילי היחידה.
