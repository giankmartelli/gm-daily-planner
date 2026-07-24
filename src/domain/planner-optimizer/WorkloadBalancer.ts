import type { PlannedTask } from '../planner-engine'

const energyRank = { muy_baja: 0, baja: 1, media: 2, alta: 3, muy_alta: 4 }

export class WorkloadBalancer {
  balance(tasks: PlannedTask[], maximumConsecutiveHighEnergy: number): PlannedTask[] {
    const remaining = [...tasks]
    const result: PlannedTask[] = []
    let highRun = 0
    while (remaining.length) {
      const needsRecovery = highRun >= maximumConsecutiveHighEnergy
      let index = needsRecovery ? remaining.findIndex((task) => energyRank[task.energyRequired] <= 2) : 0
      if (index < 0) index = 0
      const [task] = remaining.splice(index, 1)
      result.push(task)
      highRun = energyRank[task.energyRequired] >= 3 ? highRun + 1 : 0
    }
    return result
  }
}
