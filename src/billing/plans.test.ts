import { describe, expect, it } from 'vitest'
import { PRODUCT_PLANS } from './plans'

describe('commercial plans', () => {
  it('mantiene Free, Pro y Teams con capacidades acumulativas', () => {
    expect(PRODUCT_PLANS.map((plan) => plan.id)).toEqual(['free', 'pro', 'teams'])
    const [free, pro, teams] = PRODUCT_PLANS
    expect(pro.entitlements).toEqual(expect.arrayContaining(free.entitlements))
    expect(teams.entitlements).toEqual(expect.arrayContaining(pro.entitlements))
    expect(PRODUCT_PLANS.filter((plan) => plan.featured)).toHaveLength(1)
  })
})
