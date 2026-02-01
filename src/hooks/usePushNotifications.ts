import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// VAPID public key - será substituída pela chave real do ambiente
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

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

    if (!VAPID_PUBLIC_KEY) {
      console.error('VAPID_PUBLIC_KEY não configurada');
      setState(prev => ({ ...prev, error: 'Configuração incompleta' }));
      return false;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 1. Solicitar permissão
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== 'granted') {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Permissão negada' 
        }));
        return false;
      }

      // 2. Registrar Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      // Aguardar SW estar pronto
      await navigator.serviceWorker.ready;

      // 3. Criar push subscription
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer
      });

      const subscriptionJson = subscription.toJSON();
      
      if (!subscriptionJson.endpoint || !subscriptionJson.keys) {
        throw new Error('Subscription inválida');
      }

      // 4. Salvar no banco de dados
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
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Erro ao ativar notificações'
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
