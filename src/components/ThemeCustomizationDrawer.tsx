import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Palette, 
  RotateCcw, 
  Check
} from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { 
  AppearancePreferences, 
  BASE_THEMES, 
  PAGE_BACKGROUNDS, 
  ACCENT_COLORS, 
  HALO_COLORS, 
  loadAppearance, 
  saveAppearance, 
  resetAppearance
} from '../lib/themeAppearance';
import { getCurrentUser } from '../lib/db';

interface ThemeCustomizationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isEmbedded?: boolean; // When rendered directly inside UserProfilePanel
}

export const ThemeCustomizationDrawer: React.FC<ThemeCustomizationDrawerProps> = ({
  isOpen,
  onClose,
  isEmbedded = false
}) => {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const userId = currentUser?.userId || (currentUser as any)?.id || 'global';

  const [appearance, setAppearance] = useState<AppearancePreferences>(() => loadAppearance(userId));
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => 
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  // Responsive mobile detector
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen to Escape key to close the drawer
  useEffect(() => {
    if (!isOpen || isEmbedded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEmbedded, onClose]);

  // Sync on mount and listen to external changes
  useEffect(() => {
    const active = loadAppearance(userId);
    setAppearance(active);

    const handleAppearanceEvent = (e: any) => {
      if (e?.detail) {
        setAppearance(e.detail);
      }
    };

    window.addEventListener('ga_appearance_changed', handleAppearanceEvent);
    return () => window.removeEventListener('ga_appearance_changed', handleAppearanceEvent);
  }, [userId]);

  const updatePreference = (partial: Partial<AppearancePreferences>) => {
    const updated: AppearancePreferences = {
      ...appearance,
      ...partial
    };
    
    // Se mudou a cor de destaque por ID, atualiza também o hex
    if (partial.accentColor && !partial.accentHex) {
      const found = ACCENT_COLORS.find(a => a.id === partial.accentColor);
      if (found) updated.accentHex = found.hex;
    }

    setAppearance(updated);
    saveAppearance(updated, userId);

    // Feedback visual suave
    setShowSavedNotification(true);
    setTimeout(() => setShowSavedNotification(false), 1500);
  };

  const handleReset = () => {
    const def = resetAppearance(userId);
    setAppearance(def);
    setShowSavedNotification(true);
    setTimeout(() => setShowSavedNotification(false), 2000);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    // If dragged down by 60px or fast swipe down (>250px/s), close
    if (info.offset.y > 60 || info.velocity.y > 250) {
      onClose();
    }
  };

  const drawerContent = (
    <div className="flex flex-col h-full text-[#E8EDF5] select-none" id="theme-customization-panel-inner">
      {/* Mobile visual drag handle (4px height x 32px width) */}
      {!isEmbedded && isMobile && (
        <div 
          className="w-full flex items-center justify-center pt-2.5 pb-1 shrink-0 cursor-grab active:cursor-grabbing"
          aria-label="Arrastar para baixo para fechar"
        >
          <div 
            style={{
              width: '32px',
              height: '4px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.35)'
            }}
          />
        </div>
      )}

      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.03] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#4A90E2] to-[#7C3AED] flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Palette className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5 truncate">
              <span>Personalização Visual</span>
              {showSavedNotification && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                  Aplicado
                </span>
              )}
            </h3>
            <p className="text-[11px] text-white/55 font-medium truncate">
              Aparência & Estilo do Aplicativo
            </p>
          </div>
        </div>

        {/* ✕ Close button (min-width/height 44px, 50% radius, 20px font-size, accessible touch target) */}
        {!isEmbedded && (
          <button
            type="button"
            id="btn-close-theme-customization"
            onClick={onClose}
            style={{
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            className="text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer shrink-0 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
            aria-label="Fechar painel de personalização"
            title="Fechar (Esc)"
          >
            <span className="leading-none select-none font-sans font-light">✕</span>
          </button>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 custom-scrollbar max-h-[70vh] md:max-h-none" id="customization-drawer-scroll">
        
        {/* SECÇÃO 1 — Tema Base */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
              <span>Secção 1</span>
              <span className="text-white/40">•</span>
              <span>Tema Base</span>
            </label>
            <span className="text-[11px] text-[#4A90E2] font-semibold">
              {BASE_THEMES.find(t => t.id === appearance.baseTheme)?.name}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {BASE_THEMES.map((theme) => {
              const isSelected = appearance.baseTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => updatePreference({ baseTheme: theme.id })}
                  className={`relative p-2.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col gap-2 ${
                    isSelected
                      ? 'border-[#4A90E2] bg-white/[0.09] shadow-lg shadow-blue-500/15 ring-2 ring-[#4A90E2]/30'
                      : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20'
                  }`}
                >
                  {/* Thumbnail Preview */}
                  <div 
                    className="w-full h-10 rounded-xl border border-white/15 shadow-inner relative overflow-hidden flex items-center justify-center"
                    style={{ background: theme.previewBg }}
                  >
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#4A90E2] text-white flex items-center justify-center shadow-md">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-1 truncate">
                      <span>{theme.emoji}</span>
                      <span className="truncate">{theme.name}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* SECÇÃO 2 — Fundo das Páginas */}
        <section className="space-y-3 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
              <span>Secção 2</span>
              <span className="text-white/40">•</span>
              <span>Fundo das Páginas</span>
            </label>
            <span className="text-[11px] text-[#4A90E2] font-semibold">
              {PAGE_BACKGROUNDS.find(b => b.id === appearance.pageBackground)?.name}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {PAGE_BACKGROUNDS.map((bg) => {
              const isSelected = appearance.pageBackground === bg.id;
              return (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => updatePreference({ pageBackground: bg.id })}
                  className={`p-2 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col gap-1.5 ${
                    isSelected
                      ? 'border-[#4A90E2] bg-white/[0.09] ring-2 ring-[#4A90E2]/30 shadow-md'
                      : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20'
                  }`}
                >
                  <div 
                    className="w-full h-8 rounded-lg border border-white/15 relative overflow-hidden flex items-center justify-center"
                    style={{ 
                      background: bg.previewCSS,
                      backgroundImage: bg.bgPatternSVG ? `url("${bg.bgPatternSVG}")` : undefined
                    }}
                  >
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-[#4A90E2] text-white flex items-center justify-center shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-white/90 truncate">
                    {bg.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* SECÇÃO 3 — Cor de Destaque (Accent) */}
        <section className="space-y-3 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
              <span>Secção 3</span>
              <span className="text-white/40">•</span>
              <span>Cor de Destaque (Accent)</span>
            </label>
            <span className="text-[11px] font-mono font-bold" style={{ color: appearance.accentHex }}>
              {ACCENT_COLORS.find(a => a.id === appearance.accentColor)?.name} ({appearance.accentHex})
            </span>
          </div>

          <p className="text-[11px] text-white/55 leading-relaxed">
            Aplicada a botões primários, navegação ativa, foco em inputs, badges e links.
          </p>

          <div className="flex items-center justify-between gap-1.5 pt-1">
            {ACCENT_COLORS.map((accent) => {
              const isSelected = appearance.accentColor === accent.id;
              return (
                <button
                  key={accent.id}
                  type="button"
                  onClick={() => updatePreference({ accentColor: accent.id, accentHex: accent.hex })}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                    isSelected ? 'scale-110 ring-3 ring-white shadow-lg' : 'hover:scale-105 opacity-85 hover:opacity-100'
                  }`}
                  style={{ 
                    backgroundColor: accent.hex,
                    boxShadow: isSelected ? `0 0 16px ${accent.hex}80` : undefined
                  }}
                  title={`${accent.name} (${accent.hex})`}
                >
                  {isSelected && (
                    <Check className="w-4 h-4 text-white stroke-[3] drop-shadow-md" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* SECÇÃO 4 — Intensidade do Glassmorphism */}
        <section className="space-y-3 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
              <span>Secção 4</span>
              <span className="text-white/40">•</span>
              <span>Intensidade Glassmorphism</span>
            </label>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white/10 text-white">
              {appearance.glassIntensity}%
            </span>
          </div>

          <p className="text-[11px] text-white/55 leading-relaxed">
            Ajusta o desfoque de fundo (<span className="font-mono text-white/70">backdrop-filter</span>) e transparência dos cartões.
          </p>

          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={appearance.glassIntensity}
              onChange={(e) => updatePreference({ glassIntensity: Number(e.target.value) })}
              className="w-full h-2 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[#4A90E2]"
            />
            <div className="flex justify-between text-[10px] text-white/40 font-mono">
              <span>0% (Opaco)</span>
              <span>50% (Equilibrado)</span>
              <span>100% (Vidro Total)</span>
            </div>
          </div>
        </section>

        {/* SECÇÃO 5 — Halos Decorativos */}
        <section className="space-y-3 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
              <span>Secção 5</span>
              <span className="text-white/40">•</span>
              <span>Halos Decorativos</span>
            </label>
            
            {/* Switch Toggle */}
            <button
              type="button"
              onClick={() => updatePreference({ halosEnabled: !appearance.halosEnabled })}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 border ${
                appearance.halosEnabled ? 'bg-[#4A90E2] border-[#4A90E2]' : 'bg-white/10 border-white/20'
              }`}
            >
              <div 
                className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                  appearance.halosEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} 
              />
            </button>
          </div>

          <p className="text-[11px] text-white/55 leading-relaxed">
            Halos de luz difusa no canto superior esquerdo e inferior direito proporcionando profundidade.
          </p>

          {appearance.halosEnabled && (
            <div className="space-y-2 pt-1 animate-fade-in">
              <span className="text-[11px] font-bold text-white/70 block">
                Cor do Halo Principal:
              </span>
              <div className="flex items-center gap-2">
                {HALO_COLORS.map((halo) => {
                  const isSelected = appearance.haloPrimaryColor === halo.id;
                  return (
                    <button
                      key={halo.id}
                      type="button"
                      onClick={() => updatePreference({ haloPrimaryColor: halo.id })}
                      className={`flex-1 py-1.5 px-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'border-white text-white shadow-sm'
                          : 'border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                      style={{
                        backgroundColor: isSelected ? halo.hex : 'rgba(255,255,255,0.04)'
                      }}
                    >
                      <span>{halo.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

      </div>

      {/* Footer Reset Action */}
      <div className="p-4 border-t border-white/10 bg-white/[0.02] shrink-0">
        <button
          type="button"
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-bold transition-all cursor-pointer active:scale-98"
          id="btn-reset-theme-appearance"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Repor predefinições</span>
        </button>
      </div>
    </div>
  );

  // If embedded in profile page
  if (isEmbedded) {
    return (
      <div className="w-full max-w-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl overflow-hidden" id="embedded-theme-customizer">
        {drawerContent}
      </div>
    );
  }

  // Floating Drawer / Bottom Sheet Mode (Rendered in Portal to document.body)
  const floatingModal = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay covering entire screen with rgba(0,0,0,0.5) and click-to-close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[9995] backdrop-blur-xs"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            aria-hidden="true"
          />

          {/* Bottom Sheet on Mobile (<768px) with swipe-down-to-close and border-radius: 20px 20px 0 0 */}
          {isMobile ? (
            <motion.aside
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={handleDragEnd}
              className="fixed bottom-0 left-0 right-0 max-h-[88vh] h-auto bg-[#0A1628]/95 backdrop-blur-2xl border-t border-x border-white/15 shadow-2xl z-[9996] flex flex-col touch-pan-y"
              style={{
                borderRadius: '20px 20px 0 0'
              }}
              id="theme-customization-bottom-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Personalização de Aparência"
            >
              {drawerContent}
            </motion.aside>
          ) : (
            /* Side Drawer on Tablet/Desktop (>=768px) */
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="fixed top-0 right-0 bottom-0 w-[340px] max-w-[90vw] bg-[#0A1628]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl z-[9996] flex flex-col"
              id="theme-customization-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Personalização de Aparência"
            >
              {drawerContent}
            </motion.aside>
          )}
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(floatingModal, document.body);
  }

  return floatingModal;
};

export default ThemeCustomizationDrawer;
