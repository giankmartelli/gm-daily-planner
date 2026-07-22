import { animations } from './animations'
import { colors } from './colors'
import { radius } from './radius'
import { shadows } from './shadows'
import { spacing } from './spacing'
import { typography } from './typography'

export const tokens = { colors, spacing, radius, typography, animations, shadows } as const
export type DesignTokens = typeof tokens

export { animations, colors, radius, shadows, spacing, typography }
