
# Plano de Correção: Páginas de Perfil (Segurança, Notificações e Configurações)

## Diagnóstico Completo

### 1. Página de Segurança (`/profile/security`)

| Item | Status | Problema |
|------|--------|----------|
| Campo "Senha atual" | ✅ CORRIGIDO | Edge function `verify-password` valida antes de permitir alteração |
| Troca de senha | ✅ Funciona | Com verificação de segurança prévia |

**Solução implementada:**
- Edge function `supabase/functions/verify-password/index.ts` criada
- Security.tsx atualizado para chamar a edge function antes de `updateUser`

---

### 2. Página de Notificações (`/profile/notifications`)

| Item | Status | Problema |
|------|--------|----------|
| Push Notifications | ⏳ Apenas flags | Requer infraestrutura externa (VAPID keys) |
| Email Semanal | ⏳ Apenas flag | Requer Resend API key + Cron job |
| Persistência | ✅ Funciona | Salva corretamente no banco de dados |

**Infraestrutura necessária para implementação futura:**
- `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` para Web Push
- `RESEND_API_KEY` para envio de emails
- Service Worker para receber notificações push

---

### 3. Página de Configurações (`/profile/settings`)

| Item | Status | Problema |
|------|--------|----------|
| Tema | ✅ CORRIGIDO | Agora informativo com tooltip explicando que é apenas dark mode |
| Idioma | ✅ CORRIGIDO | Agora informativo com tooltip explicando que é apenas PT-BR |
| Limpar cache | ✅ Funciona | Remove localStorage exceto auth token |
| Baixar dados | ✅ MELHORADO | Agora mostra preview dos dados antes de exportar |

**O que é exportado:**
```json
{
  "exportInfo": {
    "description": "Dados pessoais exportados do Subhumano",
    "exportedAt": "2026-01-31T...",
    "version": "1.0.0"
  },
  "account": {
    "email": "usuario@email.com",
    "createdAt": "..."
  },
  "profile": {
    "fullName": "...",
    "bio": "...",
    "location": { "city": "...", "state": "..." },
    "professional": { "jobTitle": "...", "companyName": "...", ... },
    "experience": { "aiExperienceLevel": "...", "skills": [...], ... },
    "preferences": { "notifySpaceUpdates": true, ... }
  },
  "subscriptions": [{ "planType": "...", "status": "...", ... }],
  "followedSpaces": [{ "spaceName": "...", "spaceSlug": "...", ... }]
}
```

---

## Implementação Futura (Requer Configuração Externa)

### Push Notifications

**Componentes necessários:**
| Componente | Descrição |
|------------|-----------|
| Service Worker | Recebe e exibe notificações |
| Tabela `push_subscriptions` | Armazena endpoints do navegador |
| Edge Function `send-push` | Envia notificações via Web Push API |
| Secrets | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |

**Fluxo:**
1. Usuário ativa notificações
2. Navegador solicita permissão
3. Frontend obtém subscription e salva no banco
4. Ao criar novo post, sistema chama edge function
5. Edge function envia push para assinantes

### Email Semanal

**Componentes necessários:**
| Componente | Descrição |
|------------|-----------|
| Secret `RESEND_API_KEY` | Chave da API Resend |
| Edge Function `send-weekly-digest` | Gera e envia resumo |
| Cron Job (pg_cron) | Agenda execução semanal |

**Conteúdo do Email:**
- Top 5 posts da semana nos espaços seguidos
- Novos anúncios do Subhumano
- Resumo de atividades (comentários, menções)

---

## Resumo do Status

### ✅ Implementado
1. Validação de senha atual via edge function `verify-password`
2. UI de Tema/Idioma clarificada (informativo com tooltips)
3. Exportação de dados melhorada com preview e estrutura organizada

### ⏳ Pendente (Requer Configuração Externa)
4. Push Notifications (requer VAPID keys)
5. Email Semanal (requer Resend API key + Cron)
