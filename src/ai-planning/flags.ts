export const featureFlags = {
  aiFirstPlanner: import.meta.env.VITE_FEATURE_AI_FIRST_PLANNER !== 'false',
} as const
