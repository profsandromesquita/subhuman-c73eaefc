

# Adicionar Preferencia de Personalizacao por IA nas Configuracoes

## Resumo

Adicionar um toggle na pagina `/profile/settings` que permite ao usuario desativar o uso dos seus dados de perfil e interacao pela IA para respostas personalizadas. Por padrao, o toggle vem **ativado** (permitindo personalizacao).

## Alteracoes

### 1. Migracao no banco de dados

Adicionar a coluna `allow_ai_personalization` na tabela `profiles`:

```sql
ALTER TABLE public.profiles
ADD COLUMN allow_ai_personalization boolean NOT NULL DEFAULT true;
```

### 2. Atualizar `src/pages/profile/Settings.tsx`

Adicionar uma nova secao **"Privacidade e IA"** entre "Aparencia" e "Armazenamento" contendo:

- Icone `Robot` (Phosphor Icons)
- Um componente `Switch` (ja existe em `src/components/ui/switch.tsx`)
- Label: "Permitir personalizacao por IA"
- Descricao explicativa: "Quando ativado, a IA usa seus dados de perfil e historico de interacao para entregar respostas e resultados personalizados."
- Estado carregado do perfil do usuario via `useProfile`
- Ao alterar, faz update na tabela `profiles` com feedback via toast

### 3. Atualizar `src/hooks/useProfile.ts`

Adicionar `allow_ai_personalization: boolean` na interface `Profile`.

## Secao tecnica

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | Adicionar coluna `allow_ai_personalization` (boolean, default true) |
| `src/hooks/useProfile.ts` | Adicionar campo na interface Profile |
| `src/pages/profile/Settings.tsx` | Nova secao "Privacidade e IA" com Switch, carregar/salvar preferencia |

A logica de UI segue o padrao existente da pagina: Card com icone + titulo, conteudo interno com Switch e texto descritivo. O estado e gerenciado localmente e sincronizado com o banco ao alternar.

