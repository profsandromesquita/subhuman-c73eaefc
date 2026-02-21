import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const VAPID_CACHE_KEY = 'vapid-public-key';
const SUBSCRIBED_CACHE_KEY = 'push-subscription-active';

// Converte base64 para Uint8Array (necessário para applicationServerKey)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Busca a VAPID key do backend ou cache
async function getVapidPublicKey(): Promise<string | null> {
  // Primeiro tenta do .env (se estiver configurada)
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (envKey && envKey.trim() !== '') {
    return envKey;
  }

  // Verifica cache no localStorage
  const cached = localStorage.getItem(VAPID_CACHE_KEY);
  if (cached) {
    return cached;
  }

  // Busca do backend
  try {
    console.log('Buscando VAPID key do backend...');
    const { data, error } = await supabase.functions.invoke('get-vapid-public-key');
    
    if (error) {
      console.error('Erro ao invocar get-vapid-public-key:', error);
      return null;
    }

    if (data?.publicKey) {
      // Salva no cache
      localStorage.setItem(VAPID_CACHE_KEY, data.publicKey);
      console.log('VAPID key obtida e cacheada com sucesso');
      return data.publicKey;
    }

    console.error('Resposta sem publicKey:', data);
    return null;
  } catch (e) {
    console.error('Erro ao buscar VAPID key:', e);
    return null;
  }
}

export interface PushNotificationState {
  permission: NotificationPermission;
  isSubscribed: boolean;
  isSupported: boolean;
  loading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    permission: 'default',
    isSubscribed: false,
    isSupported: false,
    loading: true,
    error: null
  });
  
  // Ref para armazenar a VAPID key
  const vapidKeyRef = useRef<string | null>(null);

  // Verifica se o browser suporta push notifications
  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  // Verifica o estado atual da subscription
  const checkSubscription = useCallback(async () => {
    if (!isSupported || !user) {
      setState(prev => ({ ...prev, loading: false, isSupported }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true }));

      // Pré-carregar a VAPID key
      if (!vapidKeyRef.current) {
        vapidKeyRef.current = await getVapidPublicKey();
      }

      // Verificar permissão atual
      const currentPermission = Notification.permission;

      // Verificar cache local primeiro (fallback rápido para evitar flash)
      const cachedSubscribed = localStorage.getItem(SUBSCRIBED_CACHE_KEY) === 'true';
      if (cachedSubscribed && currentPermission === 'granted') {
        setState({
          permission: currentPermission,
          isSubscribed: true,
          isSupported: true,
          loading: false,
          error: null
        });
        return;
      }

      // Verificar se existe subscription no banco (usando limit em vez de maybeSingle)
      // maybeSingle falha quando há múltiplos dispositivos do mesmo usuário
      const { data: existingSubs, error } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      const hasSubscription = !error && existingSubs && existingSubs.length > 0;

      // Atualizar cache local se tiver subscription válida
      if (hasSubscription && currentPermission === 'granted') {
        localStorage.setItem(SUBSCRIBED_CACHE_KEY, 'true');
      } else {
        localStorage.removeItem(SUBSCRIBED_CACHE_KEY);
      }

      setState({
        permission: currentPermission,
        isSubscribed: hasSubscription && currentPermission === 'granted',
        isSupported: true,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Erro ao verificar subscription:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Erro ao verificar status' 
      }));
    }
  }, [user, isSupported]);

  // Registra o service worker e cria subscription
  const subscribe = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isSupported || !user) {
      const msg = 'Push notifications não suportadas';
      setState(prev => ({ ...prev, error: msg }));
      return { success: false, error: msg };
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 1. Buscar VAPID key se ainda não tiver
      if (!vapidKeyRef.current) {
        console.log('[Push] Buscando VAPID key...');
        vapidKeyRef.current = await getVapidPublicKey();
      }

      if (!vapidKeyRef.current) {
        const errorMsg = 'Chave de notificação não configurada. Tente novamente mais tarde.';
        console.error('[Push] VAPID_PUBLIC_KEY não disponível');
        setState(prev => ({ ...prev, loading: false, error: errorMsg }));
        return { success: false, error: errorMsg };
      }

      // 2. Solicitar permissão
      console.log('[Push] Solicitando permissão...');
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== 'granted') {
        const errorMsg = 'Você negou a permissão para notificações';
        setState(prev => ({ ...prev, loading: false, error: errorMsg }));
        return { success: false, error: errorMsg };
      }

      // 3. Registrar Service Worker
      console.log('[Push] Registrando Service Worker...');
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      // Aguardar SW estar pronto
      await navigator.serviceWorker.ready;

      // 4. Criar push subscription
      console.log('[Push] Criando push subscription...');
      const applicationServerKey = urlBase64ToUint8Array(vapidKeyRef.current);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer
      });

      const subscriptionJson = subscription.toJSON();
      
      if (!subscriptionJson.endpoint || !subscriptionJson.keys) {
        throw new Error('Subscription inválida');
      }

      // 5. Salvar no banco de dados
      console.log('[Push] Salvando subscription no banco...');
      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionJson.endpoint,
          p256dh: subscriptionJson.keys.p256dh as string,
          auth: subscriptionJson.keys.auth as string,
          device_info: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language
          }
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (dbError) {
        throw dbError;
      }

      // Atualizar cache local
      localStorage.setItem(SUBSCRIBED_CACHE_KEY, 'true');

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        loading: false,
        error: null
      }));

      console.log('[Push] Subscription ativada com sucesso!');
      return { success: true };
    } catch (error: any) {
      console.error('[Push] Erro ao ativar push:', error);
      
      let errorMessage = 'Erro ao ativar notificações';
      if (error.message?.includes('denied')) {
        errorMessage = 'Permissão negada pelo navegador';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Erro de conexão. Verifique sua internet.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  }, [user, isSupported]);

  // Remove a subscription
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setState(prev => ({ ...prev, loading: true }));

    try {
      // Remover do banco
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      // Tentar remover do browser também
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = await (registration as any).pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      // Limpar cache local
      localStorage.removeItem(SUBSCRIBED_CACHE_KEY);

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        loading: false,
        error: null
      }));

      return true;
    } catch (error: any) {
      console.error('Erro ao desativar push:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Erro ao desativar'
      }));
      return false;
    }
  }, [user]);

  // Verificar estado ao montar/mudar usuário
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    checkSubscription
  };
}
