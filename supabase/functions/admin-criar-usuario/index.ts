// ============================================================================
// Edge Function: admin-criar-usuario
// ----------------------------------------------------------------------------
// Cria um usuário no Supabase Auth (auth.users) e o perfil correspondente em
// concremapprep_usuarios. Usa service_role — NUNCA exponha isso no frontend.
//
// Segurança: só executa se o CHAMADOR for admin (validado pelo JWT + perfil).
//
// Secrets necessários (já presentes no runtime de Edge Functions do Supabase):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:
//   supabase functions deploy admin-criar-usuario --project-ref <REF_NOVO>
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

    // 1) Identificar o chamador pelo JWT enviado no header Authorization
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !caller) return json({ error: 'Não autenticado' }, 401)

    // 2) Cliente admin (service_role) — ignora RLS
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 3) Verificar que o chamador é admin
    const { data: perfil } = await admin
      .from('concremapprep_usuarios')
      .select('admin')
      .eq('id', caller.id)
      .single()
    if (!perfil?.admin) return json({ error: 'Apenas administradores' }, 403)

    // 4) Validar payload
    const { nome, email, senha, admin: isAdmin = false, operador = false } = await req.json()
    if (!nome || !email || !senha) {
      return json({ error: 'nome, email e senha são obrigatórios' }, 400)
    }
    const emailNorm = String(email).toLowerCase().trim()

    // 5) Criar em auth.users (e-mail já confirmado para login imediato)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: emailNorm,
      password: String(senha),
      email_confirm: true,
      user_metadata: { nome },
    })
    if (createErr || !created?.user) {
      // e-mail duplicado e afins
      return json({ error: createErr?.message ?? 'Falha ao criar usuário' }, 400)
    }

    // 6) Criar o perfil no portal (mesmo id de auth.users)
    const { error: perfilErr } = await admin
      .from('concremapprep_usuarios')
      .insert({
        id: created.user.id,
        nome,
        email: emailNorm,
        admin: !!isAdmin,
        operador: !!operador,
        ativo: true,
      })
    if (perfilErr) {
      // rollback do auth.users para não deixar usuário órfão
      await admin.auth.admin.deleteUser(created.user.id)
      return json({ error: 'Falha ao criar perfil: ' + perfilErr.message }, 400)
    }

    return json({ id: created.user.id, ok: true })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
