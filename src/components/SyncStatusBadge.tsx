import { CheckCircle2, CircleAlert, LoaderCircle } from 'lucide-react'
export function SyncStatusBadge({status}:{status:'active'|'expired'|'revoked'|'error'|'disconnected'}){
  const active=status==='active'
  return <span className={`calendar-status ${status}`}>{active?<CheckCircle2 size={12}/>:status==='error'?<CircleAlert size={12}/>:<LoaderCircle size={12}/>} {active?'Conectado':status==='expired'?'Autorización vencida':status==='disconnected'?'Desconectado':'Requiere atención'}</span>
}
