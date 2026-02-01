import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const VAPID_CACHE_KEY = 'vapid-public-key';

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

      // Verificar se existe subscription no banco
      const { data: existingSub } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      setState({
        permission: currentPermission,
        isSubscribed: !!existingSub && currentPermission === 'granted',
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
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) {
      setState(prev => ({ ...prev, error: 'Push notifications não suportadas' }));
      return false;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 1. Buscar VAPID key se ainda não tiver
      if (!vapidKeyRef.current) {
        vapidKeyRef.current = await getVapidPublicKey();
      }

      if (!vapidKeyRef.current) {
        const errorMsg = 'Chave de notificação não configurada. Tente novamente mais tarde.';
        console.error('VAPID_PUBLIC_KEY não disponível');
        setState(prev => ({ ...prev, loading: false, error: errorMsg }));
        return false;
      }

      // 2. Solicitar permissão
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== 'granted') {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Você negou a permissão para notificações' 
        }));
        return false;
      }

      // 3. Registrar Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      // Aguardar SW estar pronto
      await navigator.serviceWorker.ready;

      // 4. Criar push subscription
      const applicationServerKey = urlBase64ToUint8Array(vapidKeyRef.current);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer
      });

      const subscriptionJson = subscription.toJSON();
      
      if (!subscriptionJson.endpoint || !subscriptionJson.keys) {
        throw new Error('Subscription inválida');
      }

      // 5. Salvar no banco de dados
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

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        loading: false,
        error: null
      }));

      return true;
    } catch (error: any) {
      console.error('Erro ao ativar push:', error);
      
      let errorMessage = 'Erro ao ativar notificações';
      if (error.message?.includes('denied')) {
        errorMessage = 'Permissão negada pelo navegador';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Erro de conexão. Verifique sua internet.';
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      return false;
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
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

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
