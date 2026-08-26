/**
 * Sistema Completo de Personalização Visual, Fundos e Temas - ContaGlobal
 * Gerencia preferências visuais, variáveis CSS no :root, persistência multi-nível e renderização sem flicker.
 */

export type BaseThemeId = 'navy-dark' | 'light-pro' | 'pure-black' | 'deep-blue' | 'dark-green' | 'sunset';

export type PageBackgroundId = 
  | 'grad-navy-violet'
  | 'grad-navy-green'
  | 'grad-navy-cyan'
  | 'grad-navy-orange'
  | 'solid-dark'
  | 'pattern-dots'
  | 'pattern-grid'
  | 'pattern-topo';

export type AccentColorId = 'blue' | 'violet' | 'green' | 'cyan' | 'orange' | 'pink';

export type HaloColorId = 'blue' | 'violet' | 'green' | 'cyan' | 'orange';

export interface AppearancePreferences {
  baseTheme: BaseThemeId;
  pageBackground: PageBackgroundId;
  accentColor: AccentColorId;
  accentHex: string;
  glassIntensity: number; // 0 a 100
  halosEnabled: boolean;
  haloPrimaryColor: HaloColorId;
}

export interface BaseThemeConfig {
  id: BaseThemeId;
  name: string;
  emoji: string;
  description: string;
  previewBg: string;
  isLight: boolean;
  bgCSS: string;
}

export interface PageBgConfig {
  id: PageBackgroundId;
  name: string;
  type: 'gradient' | 'solid' | 'pattern';
  previewCSS: string;
  bgCSS: string;
  bgPatternSVG?: string;
}

export interface AccentConfig {
  id: AccentColorId;
  name: string;
  hex: string;
  hoverHex: string;
  subtleBg: string;
  gradient: string;
  hoverGradient: string;
  ringColor: string;
}

export interface HaloConfig {
  id: HaloColorId;
  name: string;
  hex: string;
  rgba: string;
}

// 1. Temas Base
export const BASE_THEMES: BaseThemeConfig[] = [
  {
    id: 'navy-dark',
    name: 'Navy Escuro',
    emoji: '🌙',
    description: 'Gradiente navy + violeta (padrão oficial)',
    previewBg: 'linear-gradient(135deg, #0A1628 0%, #0F1929 40%, #1A1040 70%, #0A1628 100%)',
    isLight: false,
    bgCSS: 'linear-gradient(135deg, #0A1628 0%, #0F1929 40%, #1A1040 70%, #0A1628 100%)'
  },
  {
    id: 'light-pro',
    name: 'Claro Profissional',
    emoji: '☀️',
    description: 'Fundo #F0F4FA com cards brancos de alta legibilidade',
    previewBg: '#F0F4FA',
    isLight: true,
    bgCSS: '#F0F4FA'
  },
  {
    id: 'pure-black',
    name: 'Preto Neutro',
    emoji: '⬛',
    description: 'Fundo #050A0F escuro e minimalista sem gradiente',
    previewBg: '#050A0F',
    isLight: false,
    bgCSS: '#050A0F'
  },
  {
    id: 'deep-blue',
    name: 'Azul Profundo',
    emoji: '🌊',
    description: 'Gradiente #061428 para #0D2444 marítimo',
    previewBg: 'linear-gradient(135deg, #061428 0%, #0D2444 100%)',
    isLight: false,
    bgCSS: 'linear-gradient(135deg, #061428 0%, #0D2444 100%)'
  },
  {
    id: 'dark-green',
    name: 'Verde Escuro',
    emoji: '🌿',
    description: 'Gradiente #061A0E para #0D2818 equilibrado',
    previewBg: 'linear-gradient(135deg, #061A0E 0%, #0D2818 100%)',
    isLight: false,
    bgCSS: 'linear-gradient(135deg, #061A0E 0%, #0D2818 100%)'
  },
  {
    id: 'sunset',
    name: 'Pôr do Sol',
    emoji: '🌅',
    description: 'Gradiente #1A0A00 para #2D1240 quente',
    previewBg: 'linear-gradient(135deg, #1A0A00 0%, #2D1240 100%)',
    isLight: false,
    bgCSS: 'linear-gradient(135deg, #1A0A00 0%, #2D1240 100%)'
  }
];

// Inline SVG Patterns
const DOTS_SVG = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><circle cx='2' cy='2' r='1' fill='rgba(255,255,255,0.12)'/></svg>`;
const GRID_SVG = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><path d='M 32 0 L 0 0 0 32' fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='0.5'/></svg>`;
const TOPO_SVG = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><path d='M 0 50 Q 25 25 50 50 T 100 50' fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='1'/><path d='M 0 75 Q 25 50 50 75 T 100 75' fill='none' stroke='rgba(255,255,255,0.04)' stroke-width='1'/><path d='M 0 25 Q 25 0 50 25 T 100 25' fill='none' stroke='rgba(255,255,255,0.04)' stroke-width='1'/></svg>`;

// 2. Fundos de Página
export const PAGE_BACKGROUNDS: PageBgConfig[] = [
  {
    id: 'grad-navy-violet',
    name: 'Navy + Violeta',
    type: 'gradient',
    previewCSS: 'linear-gradient(135deg, #0A1628 0%, #0F1929 40%, #1A1040 70%, #0A1628 100%)',
    bgCSS: 'linear-gradient(135deg, #0A1628 0%, #0F1929 40%, #1A1040 70%, #0A1628 100%)'
  },
  {
    id: 'grad-navy-green',
    name: 'Navy + Verde',
    type: 'gradient',
    previewCSS: 'linear-gradient(135deg, #0A1628 0%, #08241A 50%, #051A12 100%)',
    bgCSS: 'linear-gradient(135deg, #0A1628 0%, #08241A 50%, #051A12 100%)'
  },
  {
    id: 'grad-navy-cyan',
    name: 'Navy + Ciano',
    type: 'gradient',
    previewCSS: 'linear-gradient(135deg, #0A1628 0%, #062838 50%, #041B28 100%)',
    bgCSS: 'linear-gradient(135deg, #0A1628 0%, #062838 50%, #041B28 100%)'
  },
  {
    id: 'grad-navy-orange',
    name: 'Navy + Laranja',
    type: 'gradient',
    previewCSS: 'linear-gradient(135deg, #0A1628 0%, #261608 50%, #170E04 100%)',
    bgCSS: 'linear-gradient(135deg, #0A1628 0%, #261608 50%, #170E04 100%)'
  },
  {
    id: 'solid-dark',
    name: 'Sólido Escuro',
    type: 'solid',
    previewCSS: '#0A1628',
    bgCSS: '#0A1628'
  },
  {
    id: 'pattern-dots',
    name: 'Grade Pontilhada',
    type: 'pattern',
    previewCSS: 'radial-gradient(rgba(255,255,255,0.2) 1px, #0A1628 1px)',
    bgCSS: '#0A1628',
    bgPatternSVG: DOTS_SVG
  },
  {
    id: 'pattern-grid',
    name: 'Grade Quadriculada',
    type: 'pattern',
    previewCSS: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, #0A1628 1px)',
    bgCSS: '#0A1628',
    bgPatternSVG: GRID_SVG
  },
  {
    id: 'pattern-topo',
    name: 'Topografia Suave',
    type: 'pattern',
    previewCSS: 'radial-gradient(circle at 50% 50%, rgba(74,144,226,0.15), #0A1628 80%)',
    bgCSS: '#0A1628',
    bgPatternSVG: TOPO_SVG
  }
];

// 3. Cores de Destaque (Accent)
export const ACCENT_COLORS: AccentConfig[] = [
  {
    id: 'blue',
    name: 'Azul',
    hex: '#4A90E2',
    hoverHex: '#5BA3F5',
    subtleBg: 'rgba(74, 144, 226, 0.15)',
    gradient: 'linear-gradient(135deg, #4A90E2 0%, #7C3AED 100%)',
    hoverGradient: 'linear-gradient(135deg, #5BA3F5 0%, #8B4FFF 100%)',
    ringColor: 'rgba(74, 144, 226, 0.25)'
  },
  {
    id: 'violet',
    name: 'Violeta',
    hex: '#7C3AED',
    hoverHex: '#8B5CF6',
    subtleBg: 'rgba(124, 58, 237, 0.15)',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
    hoverGradient: 'linear-gradient(135deg, #8B5CF6 0%, #C084FC 100%)',
    ringColor: 'rgba(124, 58, 237, 0.25)'
  },
  {
    id: 'green',
    name: 'Verde',
    hex: '#2E9E6B',
    hoverHex: '#34D399',
    subtleBg: 'rgba(46, 158, 107, 0.15)',
    gradient: 'linear-gradient(135deg, #2E9E6B 0%, #059669 100%)',
    hoverGradient: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
    ringColor: 'rgba(46, 158, 107, 0.25)'
  },
  {
    id: 'cyan',
    name: 'Ciano',
    hex: '#06B6D4',
    hoverHex: '#22D3EE',
    subtleBg: 'rgba(6, 182, 212, 0.15)',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #0284C7 100%)',
    hoverGradient: 'linear-gradient(135deg, #22D3EE 0%, #38BDF8 100%)',
    ringColor: 'rgba(6, 182, 212, 0.25)'
  },
  {
    id: 'orange',
    name: 'Laranja',
    hex: '#F59E0B',
    hoverHex: '#FBBF24',
    subtleBg: 'rgba(245, 158, 11, 0.15)',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)',
    hoverGradient: 'linear-gradient(135deg, #FBBF24 0%, #F97316 100%)',
    ringColor: 'rgba(245, 158, 11, 0.25)'
  },
  {
    id: 'pink',
    name: 'Rosa',
    hex: '#EC4899',
    hoverHex: '#F472B6',
    subtleBg: 'rgba(236, 72, 153, 0.15)',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
    hoverGradient: 'linear-gradient(135deg, #F472B6 0%, #E11D48 100%)',
    ringColor: 'rgba(236, 72, 153, 0.25)'
  }
];

// 4. Halos Decorativos
export const HALO_COLORS: HaloConfig[] = [
  { id: 'blue', name: 'Azul', hex: '#4A90E2', rgba: 'rgba(74, 144, 226, 0.16)' },
  { id: 'violet', name: 'Violeta', hex: '#7C3AED', rgba: 'rgba(124, 58, 237, 0.14)' },
  { id: 'green', name: 'Verde', hex: '#2E9E6B', rgba: 'rgba(46, 158, 107, 0.14)' },
  { id: 'cyan', name: 'Ciano', hex: '#06B6D4', rgba: 'rgba(6, 182, 212, 0.15)' },
  { id: 'orange', name: 'Laranja', hex: '#F59E0B', rgba: 'rgba(245, 158, 11, 0.14)' }
];

export const DEFAULT_APPEARANCE: AppearancePreferences = {
  baseTheme: 'navy-dark',
  pageBackground: 'grad-navy-violet',
  accentColor: 'blue',
  accentHex: '#4A90E2',
  glassIntensity: 65, // 65% glassmorphism padrão suave
  halosEnabled: true,
  haloPrimaryColor: 'blue'
};

/**
 * Obtém as preferências de aparência guardadas no localStorage
 */
export function loadAppearance(userId?: string): AppearancePreferences {
  if (typeof window === 'undefined') return DEFAULT_APPEARANCE;

  try {
    const key = userId ? `ga:${userId}:appearance` : 'ga:global:appearance';
    let stored = localStorage.getItem(key);
    
    // Fallback para chave global ou genérica
    if (!stored) {
      stored = localStorage.getItem('ga:global:appearance') || localStorage.getItem('ga_appearance_preferences');
    }

    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        baseTheme: parsed.baseTheme || DEFAULT_APPEARANCE.baseTheme,
        pageBackground: parsed.pageBackground || DEFAULT_APPEARANCE.pageBackground,
        accentColor: parsed.accentColor || DEFAULT_APPEARANCE.accentColor,
        accentHex: parsed.accentHex || ACCENT_COLORS.find(a => a.id === parsed.accentColor)?.hex || DEFAULT_APPEARANCE.accentHex,
        glassIntensity: typeof parsed.glassIntensity === 'number' ? parsed.glassIntensity : DEFAULT_APPEARANCE.glassIntensity,
        halosEnabled: parsed.halosEnabled !== undefined ? parsed.halosEnabled : DEFAULT_APPEARANCE.halosEnabled,
        haloPrimaryColor: parsed.haloPrimaryColor || DEFAULT_APPEARANCE.haloPrimaryColor
      };
    }
  } catch (e) {
    console.warn('[ThemeAppearance] Falha ao ler aparência do localStorage:', e);
  }

  return DEFAULT_APPEARANCE;
}

/**
 * Guarda as preferências de aparência no localStorage e dispara evento
 */
export function saveAppearance(prefs: AppearancePreferences, userId?: string): void {
  if (typeof window === 'undefined') return;

  try {
    const payload = JSON.stringify(prefs);
    if (userId) {
      localStorage.setItem(`ga:${userId}:appearance`, payload);
    }
    localStorage.setItem('ga:global:appearance', payload);
    localStorage.setItem('ga_appearance_preferences', payload);
    
    // Atualiza tema dark/light se o tema base for light-pro
    if (prefs.baseTheme === 'light-pro') {
      localStorage.setItem('app_theme', 'light');
      document.documentElement.classList.remove('dark');
    } else {
      localStorage.setItem('app_theme', 'dark');
      document.documentElement.classList.add('dark');
    }

    // Aplica diretamente ao DOM
    applyAppearanceToDOM(prefs);

    // Dispara evento para atualização em tempo real
    window.dispatchEvent(new CustomEvent('ga_appearance_changed', { detail: prefs }));
  } catch (e) {
    console.warn('[ThemeAppearance] Falha ao guardar aparência no localStorage:', e);
  }
}

/**
 * Aplica as propriedades calculadas ao :root e elementos do DOM
 */
export function applyAppearanceToDOM(prefs: AppearancePreferences): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const root = document.documentElement;

  // 1. Accent Color
  const accent = ACCENT_COLORS.find(a => a.id === prefs.accentColor) || ACCENT_COLORS[0];
  root.style.setProperty('--color-accent', accent.hex);
  root.style.setProperty('--color-accent-hover', accent.hoverHex);
  root.style.setProperty('--color-accent-subtle', accent.subtleBg);
  root.style.setProperty('--color-accent-gradient', accent.gradient);
  root.style.setProperty('--color-accent-hover-gradient', accent.hoverGradient);
  root.style.setProperty('--color-accent-ring', accent.ringColor);

  // 2. Glassmorphism calculation (0% a 100%)
  // 0% -> blur 0px, bg solid rgba(10,22,40,0.98), border rgba(255,255,255,0.06)
  // 100% -> blur 32px, bg translúcido rgba(255,255,255,0.08), border rgba(255,255,255,0.18)
  const ratio = Math.max(0, Math.min(100, prefs.glassIntensity)) / 100;
  const blurVal = Math.round(ratio * 30); // 0px to 30px
  const cardBgOpacity = (0.02 + ratio * 0.07).toFixed(3); // 0.02 to 0.09
  const cardBorderOpacity = (0.05 + ratio * 0.10).toFixed(3); // 0.05 to 0.15

  root.style.setProperty('--glass-blur', `${blurVal}px`);
  root.style.setProperty('--glass-card-bg', `rgba(255, 255, 255, ${cardBgOpacity})`);
  root.style.setProperty('--glass-card-border', `rgba(255, 255, 255, ${cardBorderOpacity})`);

  // 3. Base Theme & Page Background
  const theme = BASE_THEMES.find(t => t.id === prefs.baseTheme) || BASE_THEMES[0];
  const bgConfig = PAGE_BACKGROUNDS.find(b => b.id === prefs.pageBackground) || PAGE_BACKGROUNDS[0];

  if (theme.isLight) {
    root.classList.remove('dark');
    root.style.setProperty('--app-bg-gradient', '#F0F4FA');
    root.style.setProperty('--app-bg-pattern', 'none');
  } else {
    root.classList.add('dark');
    
    // Se o tema base for especial (ex: deep-blue, dark-green, sunset, pure-black) e o background for padrão, usa a cor do tema
    let finalBgCSS = bgConfig.bgCSS;
    if (prefs.baseTheme !== 'navy-dark' && prefs.pageBackground === 'grad-navy-violet') {
      finalBgCSS = theme.bgCSS;
    }

    root.style.setProperty('--app-bg-gradient', finalBgCSS);
    if (bgConfig.bgPatternSVG) {
      root.style.setProperty('--app-bg-pattern', `url("${bgConfig.bgPatternSVG}")`);
    } else {
      root.style.setProperty('--app-bg-pattern', 'none');
    }
  }

  // 4. Halos
  const haloConfig = HALO_COLORS.find(h => h.id === prefs.haloPrimaryColor) || HALO_COLORS[0];
  root.style.setProperty('--halo-primary-color', haloConfig.rgba);
  root.style.setProperty('--halo-display', prefs.halosEnabled ? 'block' : 'none');
}

/**
 * Repõe as predefinições de aparência
 */
export function resetAppearance(userId?: string): AppearancePreferences {
  saveAppearance(DEFAULT_APPEARANCE, userId);
  return DEFAULT_APPEARANCE;
}
