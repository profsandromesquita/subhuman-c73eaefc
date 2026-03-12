

# Ajustes na seção "Aprenda fazendo, ao vivo" da Landing

## Arquivo: `src/components/landing/LandingEvents.tsx`

### 1. Aumentar altura da imagem de capa

Atualmente a imagem usa `h-48 sm:h-56`. Multiplicando por ~1.4x:
- `h-48` (192px) → `h-[268px]`
- `sm:h-56` (224px) → `sm:h-[314px]`

Linha 84: trocar `h-48 sm:h-56` por `h-[268px] sm:h-[314px]`.

### 2. Botão "Garantir minha vaga" direto para checkout

O `handleEventClick` (linha 16-31) redireciona para `/login` quando o usuário não está logado. Na landing page pública, o botão deve ir direto para a URL de checkout sem exigir login.

Alterar o `onClick` do botão (linha 149) para abrir `nextEvent.checkout_url` diretamente:
- Se `checkout_url` existir: `window.open(checkout_url, '_blank')` (ou `window.location.href`)
- Se não existir: manter redirecionamento para `/plans`
- Remover a verificação de autenticação para este botão na landing

Opcionalmente, se o usuário estiver logado, ainda injetar `email` e `src` na URL como hoje.

