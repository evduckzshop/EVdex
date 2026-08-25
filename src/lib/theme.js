// Single source of truth for the app palette.
// Every page/component imports this instead of redeclaring its own `C`.
// (Also re-exported from components/ui/FormComponents for existing imports.)

export const C = {
  bg: '#111318',
  surface: '#1E293B', surface2: '#162032', surface3: '#0F172A',
  border: 'rgba(255,255,255,.07)', border2: 'rgba(255,255,255,.13)',
  text: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
  accent: '#2563EB', accent2: '#3B82F6',
  green: '#10B981', red: '#F87171', amber: '#F59E0B',
  gold: '#F59E0B', diamond: '#A78BFA',
}

// Customer tier chrome — used by the portal and by staff-facing customer views.
export const TIER_COLORS = {
  bronze:  { bg: 'rgba(205,127,50,.12)', text: '#CD7F32', border: 'rgba(205,127,50,.3)' },
  silver:  { bg: 'rgba(192,192,192,.12)', text: '#C0C0C0', border: 'rgba(192,192,192,.3)' },
  gold:    { bg: 'rgba(245,158,11,.12)', text: '#F59E0B', border: 'rgba(245,158,11,.3)' },
  diamond: { bg: 'rgba(167,139,250,.12)', text: '#A78BFA', border: 'rgba(167,139,250,.3)' },
}
