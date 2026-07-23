const buckets = new Map()
const WINDOW_MS = 60_000
const MAX_REQUESTS = 12
const TIMEOUT_MS = 10_000
const MAX_RETRIES = 1

const schemas = {
  generateBrief: {
    type: 'object', additionalProperties: false,
    required: ['summary', 'insights', 'risks'],
    properties: {
      summary: { type: 'string', maxLength: 500 },
      insights: { type: 'array', maxItems: 5, items: { type: 'string', maxLength: 240 } },
      risks: { type: 'array', maxItems: 5, items: { type: 'string', maxLength: 240 } },
    },
  },
  explainProposal: {
    type: 'object', additionalProperties: false,
    required: ['summary', 'insights'],
    properties: {
      summary: { type: 'string', maxLength: 500 },
      insights: { type: 'array', maxItems: 8, items: { type: 'string', maxLength: 240 } },
    },
  },
  suggestAdjustments: {
    type: 'object', additionalProperties: false,
    required: ['id', 'date', 'completionProbability', 'changes'],
    properties: {
      id: { type: 'string' }, date: { type: 'string' },
      completionProbability: { type: 'number', minimum: 0, maximum: 100 },
      changes: { type: 'array', maxItems: 30, items: { type: 'object' } },
    },
  },
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método no permitido' })
  response.setHeader('Cache-Control', 'no-store')
  try {
    const user = await authenticatedUser(request.headers.authorization)
    if (!user) return response.status(401).json({ error: 'Autenticación requerida' })
    if (!allow(user.id)) return response.status(429).json({ error: 'Límite temporal alcanzado', retryAfterSeconds: 60 })
    if (!process.env.OPENAI_API_KEY) return response.status(503).json({ code: 'local_fallback', error: 'Proveedor remoto no configurado' })
    const { action, payload } = request.body ?? {}
    if (!schemas[action] || !payload || JSON.stringify(payload).length > 60_000) return response.status(400).json({ error: 'Solicitud inválida' })
    const result = await callOpenAI(action, payload, schemas[action])
    console.info(JSON.stringify({ event: 'planner_remote_completed', action, userHash: hashId(user.id), timestamp: new Date().toISOString() }))
    return response.status(200).json(result)
  } catch (error) {
    console.error(JSON.stringify({ event: 'planner_remote_failed', kind: error?.name ?? 'Error', timestamp: new Date().toISOString() }))
    return response.status(502).json({ error: 'El proveedor remoto no pudo responder. Se usará el motor local.' })
  }
}

async function authenticatedUser(authorization) {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''
  const url = process.env.VITE_SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY
  if (!token || !url || !anon) return null
  const result = await fetch(`${url}/auth/v1/user`, { headers: { authorization: `Bearer ${token}`, apikey: anon } })
  return result.ok ? result.json() : null
}

function allow(userId) {
  const now = Date.now()
  const bucket = (buckets.get(userId) ?? []).filter((value) => now - value < WINDOW_MS)
  if (bucket.length >= MAX_REQUESTS) return false
  bucket.push(now); buckets.set(userId, bucket); return true
}

async function callOpenAI(action, payload, schema) {
  const prompt = [
    'Eres el analista de planificación de GM Daily Planner.',
    'No inventes hechos, nombres, clima, sueño ni reuniones.',
    'Usa exclusivamente el JSON recibido. Explica recomendaciones con lenguaje breve en español.',
    'Nunca indiques que un cambio ya fue aplicado.',
    `Operación: ${action}`,
    JSON.stringify(payload),
  ].join('\n')
  let lastError
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const apiResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OPENAI_PLANNER_MODEL || 'gpt-5.6-sol',
          input: prompt,
          text: { format: { type: 'json_schema', name: `gm_${action}`, strict: true, schema } },
          store: false,
        }),
        signal: controller.signal,
      })
      if (!apiResponse.ok) throw new Error(`OpenAI ${apiResponse.status}`)
      const data = await apiResponse.json()
      const text = data.output_text ?? data.output?.flatMap((item) => item.content ?? []).find((item) => item.type === 'output_text')?.text
      const parsed = JSON.parse(text)
      validate(parsed, schema)
      return parsed
    } catch (error) {
      lastError = error
      if (attempt < MAX_RETRIES) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
    } finally { clearTimeout(timeout) }
  }
  throw lastError
}

function validate(value, schema) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Salida inválida')
  for (const key of schema.required ?? []) if (!(key in value)) throw new Error(`Falta ${key}`)
  for (const key of Object.keys(value)) if (schema.additionalProperties === false && !schema.properties[key]) throw new Error(`Propiedad no permitida: ${key}`)
}

function hashId(value) {
  let hash = 2166136261
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return (hash >>> 0).toString(16)
}
