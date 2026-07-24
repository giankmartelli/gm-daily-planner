import type { PlannerTaskV3 } from './PlannerTypes'

export type DependencyAnalysis = {
  orderedIds: string[]
  blockedIds: string[]
  missingDependencies: Record<string, string[]>
  cycles: string[][]
}

export class DependencyGraph {
  analyze(tasks: PlannerTaskV3[]): DependencyAnalysis {
    const byId = new Map(tasks.map((task) => [task.id, task]))
    const completed = new Set(tasks.filter((task) => task.completed).map((task) => task.id))
    const missingDependencies: Record<string, string[]> = {}
    const indegree = new Map(tasks.map((task) => [task.id, 0]))
    const outgoing = new Map(tasks.map((task) => [task.id, [] as string[]]))
    for (const task of tasks) {
      for (const dependency of task.dependencies ?? []) {
        if (!byId.has(dependency)) (missingDependencies[task.id] ??= []).push(dependency)
        else if (!completed.has(dependency)) {
          indegree.set(task.id, indegree.get(task.id)! + 1)
          outgoing.get(dependency)!.push(task.id)
        }
      }
    }
    const queue = tasks.filter((task) => indegree.get(task.id) === 0).map((task) => task.id).sort()
    const orderedIds: string[] = []
    while (queue.length) {
      const id = queue.shift()!
      orderedIds.push(id)
      for (const dependent of outgoing.get(id)!) {
        indegree.set(dependent, indegree.get(dependent)! - 1)
        if (indegree.get(dependent) === 0) queue.push(dependent)
      }
      queue.sort()
    }
    const cycleIds = tasks.map((task) => task.id).filter((id) => !orderedIds.includes(id))
    const cycles = cycleIds.length ? [cycleIds] : []
    const blockedIds = tasks.filter((task) =>
      Boolean(missingDependencies[task.id]?.length) ||
      cycleIds.includes(task.id) ||
      (task.dependencies ?? []).some((id) => byId.get(id)?.completed !== true),
    ).map((task) => task.id)
    return { orderedIds, blockedIds, missingDependencies, cycles }
  }
}
