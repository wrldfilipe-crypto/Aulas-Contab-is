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
  | 'admin' 
  | 'erp_accounting';

// Prediction matrix for next probable routes
const NEXT_ROUTES_PREDICTION: Record<RouteKey, RouteKey[]> = {
  dashboard: ['ai_accountant', 'learning', 'erp_accounting'],
  ai_accountant: ['learning', 'admin', 'erp_accounting'],
  learning: ['quizzes', 'ai_accountant', 'erp_accounting'],
  quizzes: ['learning', 'dashboard', 'ai_accountant'],
  admin: ['dashboard', 'ai_accountant'],
  erp_accounting: ['admin', 'dashboard', 'ai_accountant']
};

// Map of route keys to their dynamic import functions
const COMPONENT_IMPORTS: Record<RouteKey, () => Promise<any>> = {
  dashboard: () => Promise.resolve(), // Main dashboard component is in App or StudentDashboardView
  ai_accountant: () => import('../components/AiAccountantSuite'),
  learning: () => import('../components/LearningWorkspace'),
  quizzes: () => import('../components/QuizWorkspace'),
  admin: () => import('../components/AdminDashboard'),
  erp_accounting: () => import('../components/ErpAccountingWorkspace')
};

const preloadedRoutes = new Set<RouteKey>();

/**
 * Trigger background preloading for target routes based on current active route.
 */
export function preloadNextLikelyRoutes(currentRoute: string): void {
  const normKey = currentRoute.toLowerCase() as RouteKey;
  const nextTargets = NEXT_ROUTES_PREDICTION[normKey] || ['learning', 'ai_accountant'];

  const executePreload = () => {
    nextTargets.forEach(target => {
      if (!preloadedRoutes.has(target) && COMPONENT_IMPORTS[target]) {
        preloadedRoutes.add(target);
        COMPONENT_IMPORTS[target]()
          .then(() => {
            console.log(`[PreloadService] Preloaded bundle silently for: ${target}`);
          })
          .catch(err => {
            console.warn(`[PreloadService] Silent preload failed for ${target}:`, err);
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
