export type ThemeMode = 'violet' | 'emerald' | 'light' | 'navy';

export interface ThemeColors {
  mode: ThemeMode;
  name: string;
  bgMain: string;
  bgSidebar: string;
  bgCard: string;
  bgInput: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  accentText: string;
  userBubble: string;
  botBubble: string;
}

export const THEMES: Record<ThemeMode, ThemeColors> = {
  violet: {
    mode: 'violet',
    name: 'Cosmic Violet',
    bgMain: 'bg-[#0b0914]',
    bgSidebar: 'bg-[#120f22]',
    bgCard: 'bg-[#18142e]',
    bgInput: 'bg-[#141026]',
    border: 'border-[#262044]',
    textPrimary: 'text-violet-50',
    textSecondary: 'text-violet-200',
    textMuted: 'text-violet-400/60',
    accent: 'bg-violet-600',
    accentHover: 'hover:bg-violet-500',
    accentText: 'text-violet-400',
    userBubble: 'bg-violet-600 text-white shadow-sm',
    botBubble: 'bg-[#17132d] text-violet-100 border border-[#2d2652] shadow-xs',
  },
  emerald: {
    mode: 'emerald',
    name: 'Emerald Slate',
    bgMain: 'bg-zinc-950',
    bgSidebar: 'bg-zinc-900',
    bgCard: 'bg-zinc-900/80',
    bgInput: 'bg-zinc-900',
    border: 'border-zinc-800',
    textPrimary: 'text-zinc-100',
    textSecondary: 'text-zinc-300',
    textMuted: 'text-zinc-500',
    accent: 'bg-emerald-600',
    accentHover: 'hover:bg-emerald-500',
    accentText: 'text-emerald-400',
    userBubble: 'bg-zinc-800 text-zinc-100 border border-zinc-700/60',
    botBubble: 'bg-zinc-900/60 text-zinc-100 border border-zinc-800/80',
  },
  light: {
    mode: 'light',
    name: 'Clean Minimal',
    bgMain: 'bg-slate-50',
    bgSidebar: 'bg-white',
    bgCard: 'bg-white',
    bgInput: 'bg-white',
    border: 'border-slate-200',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-700',
    textMuted: 'text-slate-400',
    accent: 'bg-violet-600',
    accentHover: 'hover:bg-violet-500',
    accentText: 'text-violet-600',
    userBubble: 'bg-slate-900 text-white',
    botBubble: 'bg-white text-slate-800 border border-slate-200 shadow-xs',
  },
  navy: {
    mode: 'navy',
    name: 'Midnight Navy',
    bgMain: 'bg-[#0a0f1d]',
    bgSidebar: 'bg-[#0e162b]',
    bgCard: 'bg-[#131e3b]',
    bgInput: 'bg-[#0e162b]',
    border: 'border-[#1e2e54]',
    textPrimary: 'text-slate-50',
    textSecondary: 'text-slate-200',
    textMuted: 'text-slate-400',
    accent: 'bg-teal-600',
    accentHover: 'hover:bg-teal-500',
    accentText: 'text-teal-400',
    userBubble: 'bg-teal-600 text-white',
    botBubble: 'bg-[#111b33] text-slate-100 border border-[#1e2d52]',
  },
};
