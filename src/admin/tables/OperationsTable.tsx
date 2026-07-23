import type { OperationalItem } from '../models'
export function OperationsTable({items,empty='Todavía no hay registros.'}:{items:OperationalItem[];empty?:string}) {
  if (!items.length) return <div className="admin-empty"><strong>Todo despejado</strong><p>{empty}</p></div>
  return <div className="admin-table" role="table">{items.map(row=><article key={row.id} role="row"><div><strong>{row.title}</strong><small>{row.detail}</small></div><span>{row.status.replace('_',' ')}</span><time>{row.createdAt ? new Date(row.createdAt).toLocaleDateString('es-ES') : '—'}</time></article>)}</div>
}
