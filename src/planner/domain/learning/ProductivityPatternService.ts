import type { PlanningObservation, PlanningPreferenceAdjustment, UserProductivityPattern } from '../entities/Planning'

export class ProductivityPatternService {
  analyze(observations:PlanningObservation[]):UserProductivityPattern[]{
    if(observations.length<3)return []
    const patterns:UserProductivityPattern[]=[]
    const completed=observations.filter(item=>item.completed&&item.actualStart)
    const morning=completed.filter(item=>new Date(item.actualStart!).getHours()<12)
    if(morning.length>=3&&morning.length/completed.length>=.6)patterns.push({id:'deep-morning',statement:'Sueles completar mejor las tareas por la mañana.',confidence:Math.round(morning.length/completed.length*100),sampleSize:completed.length,enabled:true,evidence:[`${morning.length} de ${completed.length} tareas completadas comenzaron antes del mediodía.`]})
    const measured=observations.filter(item=>item.actualMinutes)
    const ratio=measured.reduce((sum,item)=>sum+(item.actualMinutes??item.estimatedMinutes)/Math.max(item.estimatedMinutes,1),0)/Math.max(1,measured.length)
    if(measured.length>=3&&ratio>=1.15)patterns.push({id:'duration-underestimate',statement:'Tus tareas suelen necesitar más tiempo del estimado.',confidence:Math.min(95,Math.round(60+measured.length*3)),sampleSize:measured.length,enabled:true,evidence:[`La duración real promedio es ${Math.round((ratio-1)*100)}% mayor.`]})
    return patterns
  }
  proposeAdjustments(patterns:UserProductivityPattern[]):PlanningPreferenceAdjustment[]{
    return patterns.filter(pattern=>pattern.enabled).map(pattern=>pattern.id==='duration-underestimate'
      ? {id:`adjust:${pattern.id}`,field:'preferredTaskLength',previousValue:null,proposedValue:'incrementar 20%',explanation:pattern.statement,status:'proposed'}
      : {id:`adjust:${pattern.id}`,field:'energyProfile.morning',previousValue:null,proposedValue:'alta',explanation:pattern.statement,status:'proposed'})
  }
}
