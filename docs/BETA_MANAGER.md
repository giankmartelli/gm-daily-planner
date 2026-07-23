# Beta Manager

`beta_invitations` conserva invitaciones, expiración, etiquetas, notas internas y
estado. `user_access_status` separa el acceso operativo de `auth.users`, haciendo
reversible y auditable suspender o reactivar.

Enviar correos, crear usuarios y revocar sesiones requiere Supabase Admin API
desde un backend protegido. Esas acciones permanecen deshabilitadas hasta
configurar `SUPABASE_SERVICE_ROLE_KEY` en Vercel, nunca como variable `VITE_*`.
