import type { AIEngine } from '../interfaces'
import type { EngineContext, EngineResult, ExecutiveAnalytics } from '../models'

export class ExecutiveAnalyticsEngine implements AIEngine<EngineContext, ExecutiveAnalytics> {
  readonly name = 'ExecutiveAnalyticsEngine'
  execute(context: EngineContext): EngineResult<ExecutiveAnalytics> {
    const todayTasks = context.day.tasks
    const todayScore = todayTasks.length ? Math.round(todayTasks.filter((task) => task.completed).length / todayTasks.length * 100) : 0
    const lastSeven = context.history.slice(-7)
    const productivityTrend = lastSeven.map(({ day }) => day.tasks.length ? Math.round(day.tasks.filter((task) => task.completed).length / day.tasks.length * 100) : 0)
    const weeklyScore = Math.round(productivityTrend.reduce((sum, value) => sum + value, 0) / Math.max(1, productivityTrend.length))
    const totalTasks = context.history.reduce((sum, { day }) => sum + day.tasks.length, 0)
    const completed = context.history.reduce((sum, { day }) => sum + day.tasks.filter((task) => task.completed).length, 0)
    const focusMinutes = context.sessions.reduce((sum, session) => sum + session.minutes, 0) + todayTasks.reduce((sum, task) => sum + task.trackedMinutes, 0)
    const energyDistribution = { baja: 0, media: 0, alta: 0 }
    todayTasks.forEach((task) => { energyDistribution[task.energyLevel ?? 'media'] += task.estimatedMinutes ?? 30 })
    const deepWorkMinutes = todayTasks.filter((task) => task.deepWork || (task.focusRequired ?? 0) >= .75).reduce((sum, task) => sum + task.trackedMinutes, 0)
    const interruptions = Math.max(0, new Set(todayTasks.map((task) => task.context ?? task.category)).size - 1)
    const activeScores = productivityTrend.filter((value) => value > 0)
    const consistency = activeScores.length ? Math.max(0, 100 - (Math.max(...activeScores) - Math.min(...activeScores))) : 0
    const predictionSamples = context.outcomes.filter((outcome) => outcome.realistic !== undefined)
    const predictionAccuracy = predictionSamples.length ? Math.round(predictionSamples.filter((outcome) => outcome.realistic).length / predictionSamples.length * 100) : undefined
    const value = { todayScore, weeklyScore, productivityTrend, focusMinutes, completionRate: totalTasks ? Math.round(completed / totalTasks * 100) : 0, energyDistribution, deepWorkMinutes, interruptions, consistency, predictionAccuracy, learningProgress: Math.min(100, context.outcomes.length * 10) }
    return { value, generatedAt: new Date().toISOString(), provenance: 'ESTIMATED', explanations: ['KPIs calculados exclusivamente con datos registrados.'] }
  }
}
