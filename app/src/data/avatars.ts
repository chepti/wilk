// תמונות לזיהוי תלמיד — רק דברים שילד יכול לומר בקול ("אני הכדור")

export const AVATARS: { e: string; name: string }[] = [
  { e: '🦁', name: 'אריה' },
  { e: '🐶', name: 'כלב' },
  { e: '🐱', name: 'חתול' },
  { e: '🐢', name: 'צב' },
  { e: '🦋', name: 'פרפר' },
  { e: '🐬', name: 'דולפין' },
  { e: '🐸', name: 'צפרדע' },
  { e: '🦄', name: 'חד־קרן' },
  { e: '🍎', name: 'תפוח' },
  { e: '🍉', name: 'אבטיח' },
  { e: '🍕', name: 'פיצה' },
  { e: '🍦', name: 'גלידה' },
  { e: '⚽', name: 'כדור' },
  { e: '🎈', name: 'בלון' },
  { e: '🚀', name: 'חללית' },
  { e: '🚲', name: 'אופניים' },
  { e: '🌈', name: 'קשת' },
  { e: '⭐', name: 'כוכב' },
  { e: '🌻', name: 'חמנייה' },
  { e: '👑', name: 'כתר' },
];

export const avatarName = (e: string) => AVATARS.find((a) => a.e === e)?.name ?? '';
