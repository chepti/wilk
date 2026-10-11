/*
 * App-screen kit. REPLACE/EXTEND PER PROJECT: rebuild the app's real screens from its
 * source (layout, radius, shadows, icons, tab bar, copy). Screens take animation
 * inputs as props (typed text, press amount, reveal fn) so scenes can drive them.
 */
import React from 'react';
import { Img, staticFile } from 'remotion';
import { Wifi, BatteryFull, Signal } from 'lucide-react';
import { C, ui, shadow } from '../theme';
import { Caret } from './type';

export const base: React.CSSProperties = { fontFamily: ui, direction: 'rtl', color: C.text };

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: C.card, borderRadius: 24, boxShadow: shadow, padding: 16, ...style }}>{children}</div>
);

export const StatusBar: React.FC<{ time?: string; dark?: boolean }> = ({ time = '08:00', dark }) => (
  <div style={{ height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 34px 0', direction: 'ltr', fontFamily: ui, fontWeight: 700, fontSize: 16, color: dark ? '#fff' : C.text }}>
    <span>{time}</span>
    <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <Signal size={16} strokeWidth={2.4} />
      <Wifi size={16} strokeWidth={2.4} />
      <BatteryFull size={20} strokeWidth={2} />
    </span>
  </div>
);

export type Tab = { label: string; Icon: React.FC<any>; color: string };
export const TabBar: React.FC<{ tabs: Tab[]; active: number; press?: number }> = ({ tabs, active, press = 0 }) => (
  <div style={{ ...base, position: 'absolute', bottom: 0, left: 0, right: 0, background: C.card, borderRadius: '24px 24px 0 0', boxShadow: '0 -2px 12px rgba(0,0,0,0.07)', padding: '8px 8px 26px', display: 'flex', justifyContent: 'space-around', zIndex: 20 }}>
    {tabs.map((t, i) => (
      <div key={i} style={{ width: 60, height: 60, borderRadius: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: i === active ? t.color : 'transparent', color: i === active ? '#fff' : C.muted, transform: i === active ? `scale(${1 - press * 0.12})` : undefined }}>
        <t.Icon size={23} strokeWidth={2} />
        <span style={{ fontSize: 11.5 }}>{t.label}</span>
      </div>
    ))}
  </div>
);

/** iOS-like notification. icon = file in public/ (the app icon/logo). */
export const Notification: React.FC<{ icon: string; title: string; body: string; time?: string; w?: number }> = ({ icon, title, body, time = 'עכשיו', w = 360 }) => (
  <div style={{ ...base, width: w, background: 'rgba(255,255,255,0.93)', borderRadius: 26, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', boxShadow: '0 18px 40px -10px rgba(16,24,41,0.35)' }}>
    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shadow }}>
      <Img src={staticFile(icon)} style={{ width: 40, objectFit: 'contain' }} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
        <b>{title}</b>
        <span style={{ color: C.muted, fontSize: 12.5 }}>{time}</span>
      </div>
      <div style={{ fontSize: 14.5, lineHeight: 1.35, marginTop: 3 }}>{body}</div>
    </div>
  </div>
);

/** Minimal example screen: a header and a card being typed into. Replace with real screens. */
export const ExampleScreen: React.FC<{ title: string; text: string; caret?: boolean; reveal?: number }> = ({ title, text, caret = true, reveal = 1 }) => (
  <div style={{ ...base, position: 'absolute', inset: 0, background: C.bg }}>
    <StatusBar />
    <div style={{ padding: '8px 20px 16px', fontSize: 22, fontWeight: 700, color: C.primary }}>{title}</div>
    <div style={{ padding: '0 16px', opacity: reveal, transform: `translateY(${(1 - reveal) * 30}px)` }}>
      <Card style={{ minHeight: 260, fontSize: 18, lineHeight: 1.55, padding: 18 }}>
        {text}
        {caret && <Caret h={20} />}
      </Card>
    </div>
  </div>
);
