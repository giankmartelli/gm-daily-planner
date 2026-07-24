export const featureFlags = {
  aiFirstPlanner: import.meta.env.VITE_FEATURE_AI_FIRST_PLANNER !== 'false',
  googleCalendar: import.meta.env.VITE_FEATURE_GOOGLE_CALENDAR === 'true',
  outlookCalendar: import.meta.env.VITE_FEATURE_OUTLOOK_CALENDAR === 'true',
} as const
