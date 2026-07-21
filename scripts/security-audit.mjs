const target = process.env.AUDIT_URL
if (!target?.startsWith('https://')) throw new Error('Configura AUDIT_URL con la URL HTTPS desplegada')
const response = await fetch(target, { redirect: 'follow' })
if (!response.ok) throw new Error(`La aplicación respondió ${response.status}`)
const checks = {
  https: response.url.startsWith('https://'),
  contentTypeOptions: response.headers.get('x-content-type-options') === 'nosniff',
  frameProtection: Boolean(response.headers.get('x-frame-options') || response.headers.get('content-security-policy')?.includes('frame-ancestors')),
  referrerPolicy: Boolean(response.headers.get('referrer-policy')),
  permissionsPolicy: Boolean(response.headers.get('permissions-policy')),
  csp: Boolean(response.headers.get('content-security-policy')),
}
const passed = Object.values(checks).filter(Boolean).length
console.log(JSON.stringify({ url: response.url, score: Math.round(passed / Object.keys(checks).length * 100), checks }, null, 2))
if (!checks.https || !checks.contentTypeOptions || !checks.csp) process.exitCode = 1
