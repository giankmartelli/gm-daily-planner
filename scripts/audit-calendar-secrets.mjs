import { existsSync,readdirSync,readFileSync,statSync } from 'node:fs'
import { join } from 'node:path'

const roots=['src','public','dist']
const forbidden=[
  'SUPABASE_SERVICE_ROLE_KEY',
  'CALENDAR_TOKEN_ENCRYPTION_KEY',
  'GOOGLE_CALENDAR_CLIENT_SECRET',
  'MICROSOFT_CALENDAR_CLIENT_SECRET',
  'access_token_encrypted',
  'refresh_token_encrypted',
]
const credentialPatterns=[
  /sb_secret_[A-Za-z0-9_-]{20,}/,
  /GOCSPX-[A-Za-z0-9_-]{20,}/,
]
const findings=[]
function visit(path){
  if(!existsSync(path))return
  if(statSync(path).isDirectory()){for(const entry of readdirSync(path))visit(join(path,entry));return}
  const content=readFileSync(path,'utf8')
  for(const name of forbidden)if(content.includes(name))findings.push(`${path}: referencia server-side ${name}`)
  for(const pattern of credentialPatterns)if(pattern.test(content))findings.push(`${path}: valor con formato de credencial`)
}
for(const root of roots)visit(root)
if(findings.length){console.error(findings.join('\n'));process.exit(1)}
console.log('Frontend y bundle sin secretos de calendario ni service role.')
