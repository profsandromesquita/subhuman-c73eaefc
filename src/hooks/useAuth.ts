import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { SITE_URL } from '@/lib/constants/site';

export function useAuth() {
  const { user, session, loading } = useAuthContext();

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${SITE_URL}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });
    
    // Detecta se é um cadastro duplicado
    // Quando o email já existe, identities vem vazio
    const isExistingUser = data?.user?.identities?.length === 0;
    
    return { error, isExistingUser };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      // Se a sessão não existir no servidor, força limpeza local
      if (error && (error.message?.includes('Session not found') || error.status === 403)) {
        await supabase.auth.signOut({ scope: 'local' });
        return { error: null };
      }
      
      return { error };
    } catch (e) {
      // Em caso de qualquer erro, força limpeza local
      await supabase.auth.signOut({ scope: 'local' });
      return { error: null };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const redirectUrl = `${SITE_URL}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    return { error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${SITE_URL}/`,
      }
    });
    return { error };
  }, []);

  const resendConfirmationEmail = useCallback(async (email: string) => {
    const redirectUrl = `${SITE_URL}/`;
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  }, []);

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    signInWithGoogle,
    resendConfirmationEmail
  };
}
