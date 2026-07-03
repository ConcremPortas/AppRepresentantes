// ============================================================================
// Edge Function: admin-reset-senha
// ----------------------------------------------------------------------------
// Permite que um ADMIN redefina a senha de qualquer usuário. Usa service_role.
// (A troca da PRÓPRIA senha pelo usuário comum NÃO passa por aqui — usa
//  supabase.auth.updateUser({ password }) direto no app.)
//
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:
//   supabase functions deploy admin-reset-senha --project-ref <REF_NOVO>
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization') ?? ''
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !caller) return json({ error: 'Não autenticado' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: perfil } = await admin
      .from('concremapprep_usuarios')
      .select('admin')
      .eq('id', caller.id)
      .single()
    if (!perfil?.admin) return json({ error: 'Apenas administradores' }, 403)

    const { id, senha } = await req.json()
    if (!id || !senha) return json({ error: 'id e senha são obrigatórios' }, 400)

    const { error: updErr } = await admin.auth.admin.updateUserById(String(id), {
      password: String(senha),
    })
    if (updErr) return json({ error: updErr.message }, 400)

    return json({ ok: true })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
