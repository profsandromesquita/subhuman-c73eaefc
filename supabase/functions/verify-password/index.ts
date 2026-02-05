import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyPasswordRequest {
  email: string
  password: string
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password }: VerifyPasswordRequest = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Email e senha são obrigatórios' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create a new Supabase client for this verification
    // We use service role to avoid interfering with user's current session
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    })

    // Attempt to sign in with the provided credentials
    // This validates the password without affecting the user's current session
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.log('Password verification failed:', error.message)
      return new Response(
        JSON.stringify({ valid: false, error: 'Senha atual incorreta' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Password is valid
    console.log('Password verified successfully for:', email)
    return new Response(
      JSON.stringify({ valid: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in verify-password function:', error)
    return new Response(
      JSON.stringify({ valid: false, error: 'Erro interno ao verificar senha' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
