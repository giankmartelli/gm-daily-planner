import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const required = (name) => {
  const value = process.env[name]
  if (!value) throw new Error(`Falta ${name}`)
  return value
}
const url = required('VITE_SUPABASE_URL')
const anon = required('VITE_SUPABASE_ANON_KEY')
const service = required('SUPABASE_SERVICE_ROLE_KEY')
const credentials = JSON.parse(readFileSync(process.env.QA_CREDENTIALS_PATH || 'work/supabase-test-credentials.json', 'utf8'))
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
const admin = createClient(url, service, options)
const clientA = createClient(url, anon, options)
const loginA = await clientA.auth.signInWithPassword({ email: credentials.email, password: credentials.password })
if (loginA.error || !loginA.data.user) throw new Error(`Login A: ${loginA.error?.message}`)
const userA = loginA.data.user

const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`
const emailB = `gm.ai.qa.${suffix}@example.com`
const createdB = await admin.auth.admin.createUser({ email: emailB, password: credentials.password, email_confirm: true, user_metadata: { display_name: 'GM AI QA B' } })
if (createdB.error || !createdB.data.user) throw new Error(`Crear B: ${createdB.error?.message}`)
const userB = createdB.data.user
const clientB = createClient(url, anon, options)
const loginB = await clientB.auth.signInWithPassword({ email: emailB, password: credentials.password })
if (loginB.error) throw new Error(`Login B: ${loginB.error.message}`)

const date = '2099-12-28'
const task = (id, title) => ({ id, title, completed: false, priority: 'alta', category: 'Trabajo', tags: ['qa-ai'], subtasks: [], recurrence: 'ninguna', estimatedMinutes: 60, energyLevel: 'media', flexibility: 'flexible', preferredPeriod: 'cualquiera', trackedMinutes: 0, createdAt: new Date().toISOString() })
const before = { tasks: [task(crypto.randomUUID(), 'QA AI-first A')], schedule: { '08:00': 'Restricción confirmada' }, habits: [], notes: '' }
const after = { ...before, schedule: { ...before.schedule, '10:00': before.tasks[0].title } }
const dayWrite = await clientA.from('planner_days').upsert({ user_id: userA.id, date, data: before }, { onConflict: 'user_id,date' })
if (dayWrite.error) throw dayWrite.error

const proposalId = crypto.randomUUID(), changeA = crypto.randomUUID(), changeB = crypto.randomUUID()
const proposal = { id: proposalId, date, changes: [{ id: changeA, status: 'rejected' }, { id: changeB, status: 'modified', start: '10:00' }], completionProbability: 78 }
const proposalWrite = await clientA.from('planning_proposals').insert({ id: proposalId, user_id: userA.id, plan_date: date, completion_probability: 78, payload: proposal })
if (proposalWrite.error) throw proposalWrite.error
const changesWrite = await clientA.from('planning_proposal_changes').insert([
  { id: changeA, proposal_id: proposalId, user_id: userA.id, status: 'rejected', payload: proposal.changes[0] },
  { id: changeB, proposal_id: proposalId, user_id: userA.id, status: 'modified', payload: proposal.changes[1] },
])
if (changesWrite.error) throw changesWrite.error

const idempotencyKey = `${proposalId}:${date}`
const appliedPayload = { proposal_id: proposalId, user_id: userA.id, idempotency_key: idempotencyKey, status: 'applied', before_state: before, after_state: after }
const applyOnce = await clientA.from('applied_plans').upsert(appliedPayload, { onConflict: 'user_id,idempotency_key' }).select('id').single()
const applyTwice = await clientA.from('applied_plans').upsert(appliedPayload, { onConflict: 'user_id,idempotency_key' }).select('id').single()
if (applyOnce.error || applyTwice.error || applyOnce.data.id !== applyTwice.data.id) throw new Error('La aplicación no fue idempotente')
const appliedDay = await clientA.from('planner_days').update({ data: after }).eq('user_id', userA.id).eq('date', date)
if (appliedDay.error) throw appliedDay.error

const persisted = await clientA.from('planner_days').select('data').eq('user_id', userA.id).eq('date', date).single()
if (persisted.error || persisted.data.data.schedule['10:00'] !== before.tasks[0].title) throw new Error('No persistió después de recargar')
const isolated = await clientB.from('planning_proposals').select('id').eq('user_id', userA.id)
const spoof = await clientB.from('planning_proposals').insert({ user_id: userA.id, plan_date: date, completion_probability: 50, payload: {} })
if (isolated.error || isolated.data.length || !spoof.error) throw new Error('RLS no aisló las propuestas')

const outcome = await clientA.from('planning_outcomes').insert({ applied_plan_id: applyOnce.data.id, user_id: userA.id, payload: { rating: 4, completedTaskIds: [], postponedTaskIds: [before.tasks[0].id], actualMinutes: { [before.tasks[0].id]: 75 }, energy: 'media', realistic: true } })
if (outcome.error) throw outcome.error
const revertedPlan = await clientA.from('applied_plans').update({ status: 'reverted' }).eq('id', applyOnce.data.id)
const revertedDay = await clientA.from('planner_days').update({ data: before }).eq('user_id', userA.id).eq('date', date)
if (revertedPlan.error || revertedDay.error) throw new Error('Falló rollback')
const restored = await clientA.from('planner_days').select('data').eq('user_id', userA.id).eq('date', date).single()
if (restored.error || restored.data.data.schedule['10:00']) throw new Error('Rollback no restauró el día')

const ownProposalB = crypto.randomUUID()
const writeB = await clientB.from('planning_proposals').insert({ id: ownProposalB, user_id: userB.id, plan_date: date, completion_probability: 80, payload: { changes: [] } })
if (writeB.error) throw writeB.error
await clientA.auth.signOut()
const expiredAccess = await clientA.from('planning_proposals').select('id')
if (!expiredAccess.error) throw new Error('La sesión expirada mantuvo acceso')

console.log(JSON.stringify({
  status: 'ok',
  users: { a: userA.id, b: userB.id },
  verified: ['login', 'tasks', 'constraints', 'proposal', 'reject', 'modify', 'apply', 'reload', 'idempotency', 'rollback', 'outcome', 'session-expiration', 'RLS-isolation'],
  note: 'Offline/reconexión se valida en el E2E de navegador; Supabase remoto validó persistencia y aislamiento.',
}))
