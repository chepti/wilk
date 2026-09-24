// עזרים למורים ולהורים — מהעמוד הראשי הישן (chepti.com/wilk)

export const BOOKLET_PDF = 'https://chepti.com/wp-content/uploads/2023/12/%D7%95%D7%99%D7%9C%D7%A7-%D7%93%D7%A4%D7%99-%D7%94%D7%93%D7%A4%D7%A1%D7%94-6.pdf';
export const TEXTS_PDF = 'https://chepti.com/wp-content/uploads/2024/04/%D7%98%D7%A7%D7%A1%D7%98%D7%99%D7%9D-%D7%AA%D7%95%D7%9B%D7%A0%D7%99%D7%AA-%D7%A8%D7%9B%D7%99%D7%A9%D7%AA-%D7%A7%D7%A8%D7%99%D7%90%D7%94-%D7%91%D7%A9%D7%99%D7%98%D7%AA-%D7%95%D7%99%D7%9C%D7%A7.pdf';

/** עמוד בחוברת הכתיבה (7 עמודים, לפי סדר האותיות) לכל תחנה */
export const BOOKLET_PAGE: Record<number, number> = {
  1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 3, 8: 4, 9: 4, 10: 4, 11: 5, 12: 5, 13: 5, 14: 6, 15: 6, 16: 6, 17: 7, 18: 7,
};

/** עמוד בחוברת הטקסטים (17 עמודים, לפי סימוני #) לכל תחנה */
export const TEXTS_PAGE: Record<number, number> = {
  1: 1, 2: 1, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8, 11: 9, 12: 10, 13: 11, 14: 12, 15: 14, 16: 17, 17: 15, 18: 16,
};

export const pdfPage = (url: string, page: number) => `${url}#page=${page}`;

export type ResourceIcon = 'book' | 'print' | 'slides' | 'text' | 'chat' | 'check' | 'pen' | 'video' | 'message';

export interface Resource {
  id: string;
  title: string;
  desc: string;
  icon: ResourceIcon;
  links: { label: string; href: string }[];
  audience: ('teacher' | 'parent')[];
  featured?: boolean;
  /** תמונות תצוגה מקדימה ב-public/previews (tools/make-previews.mjs) */
  previews?: string[];
  /** 'page' = עמוד מודפס לאורך (מוצג כדף), אחרת תמונה רחבה */
  previewKind?: 'page' | 'wide';
}

export const RESOURCES: Resource[] = [
  {
    id: 'booklet', icon: 'print', featured: true, previews: ['booklet-1', 'booklet-2'], previewKind: 'page', audience: ['teacher', 'parent'],
    title: 'חוברת מלווה להדפסה',
    desc: 'תרגול כתיבת האותיות, עם עזרי זכירה לצלילים. שווה להדפיס — החוברת הפיזית עוזרת לארגן את הלמידה, לזכור איפה אנחנו, ומחזקת את תחושת השליטה וההספק.',
    links: [
      { label: 'הורדת החוברת (PDF)', href: BOOKLET_PDF },
      { label: 'צפייה בקנבה', href: 'https://www.canva.com/design/DAF0mFeiQzg/view' },
    ],
  },
  {
    id: 'texts', icon: 'text', previews: ['texts-1'], previewKind: 'page', audience: ['teacher', 'parent'],
    title: 'חוברת טקסטים',
    desc: 'כל הטקסטים שהילדים קוראים לאורך התוכנית, לפי סדר התחנות — לקריאה חוזרת על הדף.',
    links: [{ label: 'הורדת החוברת (PDF)', href: TEXTS_PDF }],
  },
  {
    id: 'slides', icon: 'slides', previews: ['slides'], audience: ['teacher'],
    title: 'מצגת למורה',
    desc: 'אנימציות של האותיות לפי סדר הלמידה בתוכנית (האנימציות אילמות).',
    links: [{ label: 'הצגת המצגת', href: 'https://www.canva.com/design/DAF0magLs4E/view' }],
  },
  {
    id: 'checks', icon: 'check', previews: ['checks'], audience: ['teacher'],
    title: 'ערכת מבדקים',
    desc: 'להערכת ההתקדמות לאורך התוכנית.',
    links: [{ label: 'למבדקים', href: 'https://chepti.com/check/' }],
  },
  {
    id: 'direction', icon: 'pen', previews: ['direction'], audience: ['teacher', 'parent'],
    title: 'תרגול כיוון הכתיבה',
    desc: 'משחק לתרגול כיוון כתיבת האותיות הקטנות.',
    links: [{ label: 'למשחק', href: 'https://www.turtlediary.com/game/write-lowercase-letters.html' }],
  },
  {
    id: 'playlist', icon: 'video', previews: ['playlist'], audience: ['teacher', 'parent'],
    title: 'כל הסרטונים ביוטיוב',
    desc: 'הסרטונים של כל התחנות בפלייליסט אחד.',
    links: [{ label: 'לפלייליסט', href: 'https://www.youtube.com/playlist?list=PLJRbNE3_dNnhs52hJ1CMT-m04DDAIUn9R' }],
  },
  {
    id: 'whatsapp', icon: 'chat', previews: ['whatsapp'], audience: ['teacher', 'parent'],
    title: 'קבוצת ווטסאפ למורים ולמלווים',
    desc: 'לשאול, לקבל טיפים, להציע ולבקש עזרים נוספים.',
    links: [{ label: 'הצטרפות לקבוצה', href: 'https://chat.whatsapp.com/HwsWj1vRqhuBSB5Czek25a' }],
  },
  {
    id: 'feedback', icon: 'message', previews: ['feedback'], audience: ['teacher', 'parent'],
    title: 'משוב',
    desc: 'ספרו לנו מה אהבתם ומה כדאי לשפר.',
    links: [{ label: 'לטופס המשוב', href: 'https://docs.google.com/forms/d/e/1FAIpQLScPKYtQVFOlH-230miljpuw-5dmKPQtYp32OjmeSsP3DsBBbw/viewform' }],
  },
];

export const ABOUT = 'סביבת למידה של הקריאה באנגלית בשיטה של פנינה וילק. הסביבה מסייעת לילדים לקשור בין צורת האות לבין הצליל שלה בעזרת סיפורונים קטנים. תוך זמן קצר הם מצליחים לקרוא מילים פשוטות (CVC), משפטים וסיפורים. השיטה פותחה ע"י פנינה וילק לאורך שנים שבהן לימדה אלפי תלמידים, והיא הופעלה גם בכיתות וגם עם בעלי צרכים מיוחדים.';
export const RIGHTS = 'כל הזכויות שמורות © לפנינה וילק על התכנים ולחפציה בן ארצי על הגרסה הדיגיטלית';
export const FINALE = 'זהו! סיימנו להכיר את כל אותיות ה-ABC ולקרוא אותן במילים פשוטות. בהמשך נלמד לזהות גם צירופים נוספים של אותיות — למשל ch, sh, ea, ai, ou ועוד.';
