import { Activity, Bot, CalendarClock, ChartNoAxesCombined, ChevronRight, CircleGauge, Flag, LifeBuoy, Megaphone, Settings, ShieldCheck, Sparkles, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AdminIdentity, AdminSection } from '../models'
import { visibleSections } from '../policies/AdminPolicy'

const navigation: Array<{ id:AdminSection; label:string; icon:typeof Activity }> = [
  {id:'overview',label:'Vista general',icon:CircleGauge},{id:'beta',label:'Beta Manager',icon:Sparkles},
  {id:'users',label:'Usuarios',icon:Users},{id:'flags',label:'Feature Flags',icon:Flag},
  {id:'feedback',label:'Feedback',icon:LifeBuoy},{id:'announcements',label:'Anuncios',icon:Megaphone},
  {id:'errors',label:'Errores',icon:Activity},{id:'activity',label:'Actividad',icon:CalendarClock},
  {id:'analytics',label:'Analytics',icon:ChartNoAxesCombined},{id:'ai',label:'AI Admin',icon:Bot},
  {id:'security',label:'Seguridad',icon:ShieldCheck},{id:'settings',label:'Configuración',icon:Settings},
]

export function AdminShell({identity,section,onSection,children}:{identity:AdminIdentity;section:AdminSection;onSection:(value:AdminSection)=>void;children:ReactNode}) {
  const allowed = visibleSections(identity.role)
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <a href="/admin" className="admin-brand"><span>GM</span><div><strong>Control Center</strong><small>Operations OS</small></div></a>
      <nav aria-label="Administración">{navigation.filter(entry=>allowed.includes(entry.id)).map(({id,label,icon:Icon})=>
        <button key={id} className={section===id?'active':''} onClick={()=>onSection(id)}><Icon size={17}/><span>{label}</span><ChevronRight size={13}/></button>)}</nav>
      <div className="admin-identity"><span>{identity.email.slice(0,2).toUpperCase()}</span><div><strong>{identity.email}</strong><small>{identity.role.replace('_',' ')}</small></div></div>
    </aside>
    <main className="admin-main">{children}</main>
  </div>
}
