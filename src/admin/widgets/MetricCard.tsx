import type { LucideIcon } from 'lucide-react'
export function MetricCard({label,value,detail,icon:Icon}:{label:string;value:string|number;detail:string;icon:LucideIcon}) {
  return <article className="admin-metric"><span><Icon size={17}/></span><p>{label}</p><strong>{value}</strong><small>{detail}</small></article>
}
