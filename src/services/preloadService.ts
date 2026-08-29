/**
 * Intelligent Preloading Service
 * Silently preloads the 2-3 most likely next page bundles in background
 * using `requestIdleCallback` to avoid competing with current page render.
 */

type RouteKey = 
  | 'dashboard' 
  | 'ai_accountant' 
  | 'learning' 
  | 'quizzes' 
  | 'erp_accounting';

// Prediction matrix for next probable routes
const NEXT_ROUTES_PREDICTION: Record<RouteKey, RouteKey[]> = {
  dashboard: ['ai_accountant', 'learning'],
  ai_accountant: ['learning', 'quizzes'],
  learning: ['quizzes', 'ai_accountant'],
  quizzes: ['learning', 'dashboard'],
  erp_accounting: ['dashboard', 'ai_accountant']
};

// Map of route keys to their dynamic import functions
const COMPONENT_IMPORTS: Record<RouteKey, () => Promise<any>> = {
  dashboard: () => Promise.resolve(),
  ai_accountant: () => import('../components/YohanAI'),
  learning: () => import('../components/LearningWorkspace'),
  quizzes: () => import('../components/QuizWorkspace'),
  erp_accounting: () => import('../components/ErpAccountingWorkspace')
};

const preloadedRoutes = new Set<RouteKey>();

function podePrecarregar(): boolean {
  if (typeof window === 'undefined') return false;
  if (!navigator.onLine) return false;

  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;

  return !connection?.saveData && connection?.effectiveType !== 'slow-2g';
}

/**
 * Trigger background preloading for target routes based on current active route.
 */
export function preloadNextLikelyRoutes(currentRoute: string): void {
  if (!podePrecarregar()) return;

  const normKey = currentRoute.toLowerCase() as RouteKey;
  const nextTargets = NEXT_ROUTES_PREDICTION[normKey] || ['learning', 'ai_accountant'];

  const executePreload = () => {
    nextTargets.forEach(target => {
      if (!preloadedRoutes.has(target) && COMPONENT_IMPORTS[target]) {
        preloadedRoutes.add(target);
        COMPONENT_IMPORTS[target]()
          .then(() => {
            if (import.meta.env.DEV) {
              console.debug(`[PreloadService] bundle pré-carregado: ${target}`);
            }
          })
          .catch(err => {
            if (import.meta.env.DEV) {
              console.debug(`[PreloadService] Silent preload failed for ${target}:`, err);
            }
            preloadedRoutes.delete(target); // Allow retry later
          });
      }
    });
  };

  // Use requestIdleCallback if available, fallback to setTimeout with delay
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(executePreload, { timeout: 2500 });
  } else {
    setTimeout(executePreload, 1200);
  }
}
