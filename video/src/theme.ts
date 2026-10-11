import { loadFont as loadRubik } from '@remotion/google-fonts/Rubik';
import { loadFont as loadVarela } from '@remotion/google-fonts/VarelaRound';
import { loadFont as loadFredoka } from '@remotion/google-fonts/Fredoka';
import { loadFont as loadQuicksand } from '@remotion/google-fonts/Quicksand';

// WILK — English through the Stars. גופנים: כותרות Rubik, ממשק Varela Round (כמו באפליקציה),
// אנגלית Fredoka One (שם המרחב), אותיות כתיבה Quicksand (הגופן של שקפי ה-TRACING).
export const display = loadRubik('normal', { weights: ['500', '700', '800', '900'], subsets: ['hebrew', 'latin'] }).fontFamily;
export const ui = loadVarela('normal', { weights: ['400'], subsets: ['hebrew', 'latin'] }).fontFamily;
export const eng = loadFredoka('normal', { weights: ['600', '700'], subsets: ['latin'] }).fontFamily;
export const letters = loadQuicksand('normal', { weights: ['600', '700'], subsets: ['latin'] }).fontFamily;
export const hand = ui;

// הטוקנים של האפליקציה (styles.css / player.css) + זהב הכוכבים כצבע המוטיב
export const C = {
  bg: '#f4f6fd', // דפי מורה/הורים
  card: '#FFFFFF',
  primary: '#3b5bdb', // הכחול של הממשק והגרפים
  secondary: '#8ea2ff', // שמי לילה בהירים
  accent: '#f5b82e', // זהב הכוכבים — המוטיב
  accent2: '#ffe08a', // זהב בהיר (גרדיאנט הקו)
  text: '#16224a',
  muted: '#6b7590',
  ink: '#0b1330', // שמי הלילה של המפה
  night2: '#16224a',
  paper: '#fbfcff', // ריבוע הכתיבה
  soft1: '#dfe6fb',
  soft2: '#ffe9b8',
  green: '#22a95a',
  orange: '#eb6834',
};

export const shadow = '0 2px 12px rgba(0,0,0,0.07)';
export const bigShadow = '0 50px 90px -24px rgba(5,10,30,0.55), 0 22px 40px -20px rgba(5,10,30,0.45)';
