const configured = names => names.every(name => Boolean(process.env[name]?.trim()))

export default function handler(_request,response){
  response.setHeader('Cache-Control','no-store')
  return response.status(200).json({
    google: configured(['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','PUBLIC_SITE_URL','CALENDAR_TOKEN_ENCRYPTION_KEY','GOOGLE_CALENDAR_CLIENT_ID','GOOGLE_CALENDAR_CLIENT_SECRET']),
    outlook: configured(['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','PUBLIC_SITE_URL','CALENDAR_TOKEN_ENCRYPTION_KEY','MICROSOFT_CALENDAR_CLIENT_ID','MICROSOFT_CALENDAR_CLIENT_SECRET']),
  })
}
