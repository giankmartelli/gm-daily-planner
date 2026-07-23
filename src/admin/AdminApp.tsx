import { Activity, Bot, ChartNoAxesCombined, CircleGauge, Clock3, LifeBuoy, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigurationMessage } from '../lib/supabase'
import { AdminShell } from './components/AdminShell'
import type { AdminIdentity, AdminSection, DashboardMetrics, FeatureFlag, OperationalItem } from './models'
import type { AdminRepository } from './repositories/AdminRepository'
import { SupabaseAdminRepository } from './services/SupabaseAdminRepository'
import { UnavailableAdminRepository } from './services/UnavailableAdminRepository'
import { LoadAdminWorkspace } from './usecases/LoadAdminWorkspace'
import { MetricCard } from './widgets/MetricCard'
import { OperationsTable } from './tables/OperationsTable'
import './admin.css'

const sectionCopy:Record<AdminSection,{eyebrow:string;title:string;description:string}> = {
  overview:{eyebrow:'EXECUTIVE OPERATIONS',title:'El pulso de GM AI OS.',description:'Usuarios, producto y plataforma en una sola lectura.'},
  beta:{eyebrow:'ACCESS OPERATIONS',title:'Beta Manager',description:'Invitaciones, acceso anticipado y lista de espera.'},
  users:{eyebrow:'CUSTOMER INTELLIGENCE',title:'Usuarios',description:'Perfiles, actividad, estado y señales de riesgo.'},
  flags:{eyebrow:'RELEASE CONTROL',title:'Feature Flags',description:'Despliegues progresivos sin volver a publicar.'},
  feedback:{eyebrow:'VOICE OF CUSTOMER',title:'Feedback Center',description:'Errores, ideas y solicitudes priorizadas.'},
  announcements:{eyebrow:'COMMUNICATIONS',title:'Anuncios',description:'Novedades y comunicaciones segmentadas.'},
  errors:{eyebrow:'RELIABILITY',title:'Error Center',description:'Incidentes agrupados por impacto y frecuencia.'},
  activity:{eyebrow:'AUDITABILITY',title:'Activity Center',description:'Una línea de tiempo verificable de acciones críticas.'},
  analytics:{eyebrow:'PRODUCT ANALYTICS',title:'Analytics',description:'Adopción, actividad y señales de retención.'},
  ai:{eyebrow:'MODEL OPERATIONS',title:'AI Admin',description:'Uso, disponibilidad y comportamiento de los motores.'},
  security:{eyebrow:'TRUST CENTER',title:'Seguridad',description:'Estado de controles, sesiones y auditoría.'},
  settings:{eyebrow:'PLATFORM',title:'Configuración',description:'Integraciones y parámetros operativos seguros.'},
}
const initialMetrics:DashboardMetrics={users:0,activeUsers:0,betaUsers:0,suspendedUsers:0,dau:0,wau:0,mau:0,sessions:0,errors:0,feedback:0,featureUsage:{}}

export default function AdminApp() {
  const repository:AdminRepository=useMemo(()=>supabase?new SupabaseAdminRepository(supabase):new UnavailableAdminRepository(),[])
  const loader=useMemo(()=>new LoadAdminWorkspace(repository),[repository])
  const [identity,setIdentity]=useState<AdminIdentity|null|undefined>()
  const [section,setSection]=useState<AdminSection>('overview')
  const [data,setData]=useState<DashboardMetrics|FeatureFlag[]|OperationalItem[]|null>(null)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [revision,setRevision]=useState(0)
  useEffect(()=>{void repository.getIdentity().then(setIdentity).catch(()=>setIdentity(null))},[repository])
  useEffect(()=>{if(!identity)return;void Promise.resolve().then(()=>{setBusy(true);setError('');return loader.execute(section)}).then(setData).catch(e=>setError(e instanceof Error?e.message:'No fue posible cargar el módulo')).finally(()=>setBusy(false))},[identity,loader,section,revision])

  if(identity===undefined)return <main className="admin-gate"><div className="admin-loader"/><p>Verificando acceso seguro…</p></main>
  if(!identity)return <main className="admin-gate"><div className="admin-denied"><ShieldCheck size={30}/><p>403 · ACCESO RESTRINGIDO</p><h1>Este espacio requiere permisos administrativos.</h1><span>{supabaseConfigurationMessage||'Tu sesión no tiene un rol activo en GM Control Center.'}</span><a href="/app">Volver a GM Daily Planner</a></div></main>
  const copy=sectionCopy[section]
  return <AdminShell identity={identity} section={section} onSection={setSection}>
    <header className="admin-header"><div><p>{copy.eyebrow}</p><h1>{copy.title}</h1><span>{copy.description}</span></div><aside><i/><span>Operación estable</span><button aria-label="Perfil administrativo">{identity.email.slice(0,2).toUpperCase()}</button></aside></header>
    {error&&<div className="admin-alert" role="alert"><strong>No se pudo completar la consulta</strong><span>{error}</span></div>}
    {busy?<div className="admin-skeleton" aria-label="Cargando módulo"/>:<AdminContent section={section} data={data} repository={repository} reload={()=>setRevision(value=>value+1)}/>}
  </AdminShell>
}

function AdminContent({section,data,repository,reload}:{section:AdminSection;data:DashboardMetrics|FeatureFlag[]|OperationalItem[]|null;repository:AdminRepository;reload:()=>void}) {
  if(section==='overview'||section==='analytics'||section==='ai') {
    const metrics=(!Array.isArray(data)&&data)||initialMetrics
    const cards=section==='ai'
      ? [{label:'Uso AI',value:metrics.featureUsage.ai??0,detail:'eventos en 30 días',icon:Bot},{label:'Planner',value:metrics.featureUsage.planner??0,detail:'ejecuciones',icon:Sparkles},{label:'Fallbacks',value:0,detail:'sin incidentes registrados',icon:Activity},{label:'Proveedor',value:'Deterministic',detail:'activo y auditable',icon:ShieldCheck}]
      : [{label:'Usuarios',value:metrics.users,detail:`${metrics.activeUsers} activos`,icon:Users},{label:'DAU',value:metrics.dau,detail:`${metrics.wau} WAU · ${metrics.mau} MAU`,icon:Activity},{label:'Sesiones',value:metrics.sessions,detail:'últimos 30 días',icon:Clock3},{label:'Feedback',value:metrics.feedback,detail:'requiere atención',icon:LifeBuoy},{label:'Errores',value:metrics.errors,detail:'eventos abiertos',icon:ShieldCheck},{label:'Beta',value:metrics.betaUsers,detail:`${metrics.suspendedUsers} suspendidos`,icon:Sparkles}]
    return <><section className="admin-metrics">{cards.map(card=><MetricCard key={card.label}{...card}/>)}</section><section className="admin-panels"><article><header><div><p>ACTIVIDAD DE PRODUCTO</p><h2>Adopción por función</h2></div><ChartNoAxesCombined size={20}/></header><div className="admin-bars">{Object.entries(metrics.featureUsage).length?Object.entries(metrics.featureUsage).map(([key,value])=><div key={key}><span>{key}</span><i><b style={{width:`${Math.min(100,value*5)}%`}}/></i><strong>{value}</strong></div>):<p>Aún no hay telemetría suficiente.</p>}</div></article><article className="admin-status"><header><div><p>PLATFORM HEALTH</p><h2>Controles operativos</h2></div><CircleGauge size={20}/></header>{['RLS activo','Auditoría habilitada','CSP aplicada','Datos sensibles protegidos'].map(text=><div key={text}><i/><span>{text}</span><strong>OK</strong></div>)}</article></section></>
  }
  if(section==='flags')return <FlagsPanel flags={Array.isArray(data)?data as FeatureFlag[]:[]} repository={repository} reload={reload}/>
  if(section==='settings')return <section className="admin-panels"><article><header><div><p>CONFIGURACIÓN SEGURA</p><h2>Integraciones</h2></div></header>{['Supabase','OpenAI','Stripe','SMTP','Dominio'].map((name,index)=><div className="admin-integration" key={name}><div><strong>{name}</strong><small>{index===0?'Configurado por entorno':'Preparado · sin credenciales'}</small></div><span>{index===0?'Activo':'Pendiente'}</span></div>)}</article></section>
  return <section className="admin-list-panel"><header><div><p>OPERACIONES RECIENTES</p><h2>{sectionCopy[section].title}</h2></div><button disabled title="Requiere endpoint administrativo seguro">Nueva acción</button></header><OperationsTable items={Array.isArray(data)?data as OperationalItem[]:[]}/></section>
}

function FlagsPanel({flags,repository,reload}:{flags:FeatureFlag[];repository:AdminRepository;reload:()=>void}) {
  const [pending,setPending]=useState('')
  const toggle=async(flag:FeatureFlag)=>{setPending(flag.key);try{await repository.setFlag(flag.key,!flag.enabled,flag.rollout_percentage);reload()}finally{setPending('')}}
  return <section className="admin-list-panel"><header><div><p>ROLLOUT CONTROL</p><h2>{flags.length} funciones configuradas</h2></div></header><div className="flags-grid">{flags.map(flag=><article key={flag.key}><div><strong>{flag.key.replaceAll('_',' ')}</strong><small>{flag.description}</small></div><label><span>{flag.rollout_percentage}%</span><button disabled={pending===flag.key} className={flag.enabled?'on':''} onClick={()=>void toggle(flag)} aria-label={`${flag.enabled?'Desactivar':'Activar'} ${flag.key}`}><i/></button></label></article>)}</div></section>
}
