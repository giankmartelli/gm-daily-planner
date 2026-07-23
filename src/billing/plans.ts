export type PlanId = 'free' | 'pro' | 'teams'
export type PlanEntitlement =
  | 'core_planning'
  | 'offline'
  | 'focus'
  | 'advanced_planner'
  | 'advanced_reports'
  | 'calendar_connections'
  | 'team_workspaces'
  | 'admin_controls'

export type ProductPlan = {
  id: PlanId
  name: string
  priceMonthly: number | null
  description: string
  featured?: boolean
  entitlements: PlanEntitlement[]
  features: string[]
}

export const PRODUCT_PLANS: readonly ProductPlan[] = [
  {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    description: 'Para construir un sistema diario claro y sostenible.',
    entitlements: ['core_planning', 'offline', 'focus'],
    features: ['Tareas, agenda y hábitos', 'Calendario y foco', 'PWA y modo offline', 'Sincronización personal'],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 8,
    description: 'Para profesionales que quieren optimizar cada semana.',
    featured: true,
    entitlements: ['core_planning', 'offline', 'focus', 'advanced_planner', 'advanced_reports', 'calendar_connections'],
    features: ['Todo en Free', 'Planner AI avanzado', 'Informes y exportaciones', 'Conexiones de calendario'],
  },
  {
    id: 'teams',
    name: 'Teams',
    priceMonthly: null,
    description: 'Para equipos que necesitan claridad compartida sin vigilancia.',
    entitlements: ['core_planning', 'offline', 'focus', 'advanced_planner', 'advanced_reports', 'calendar_connections', 'team_workspaces', 'admin_controls'],
    features: ['Todo en Pro', 'Espacios compartidos', 'Controles de administración', 'Soporte de incorporación'],
  },
] as const

export interface BillingGateway {
  createCheckout(plan: Exclude<PlanId, 'free'>, userId: string): Promise<{ checkoutUrl: string }>
  openPortal(userId: string): Promise<{ portalUrl: string }>
}

export const billingAvailability = {
  enabled: import.meta.env.VITE_BILLING_ENABLED === 'true',
  reason: 'Los cobros están desactivados hasta completar revisión fiscal, webhooks y pruebas de recuperación.',
} as const
