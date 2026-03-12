

# Remover botão "Convidado" dos cards de evento live

## Mudança

Remover o bloco que renderiza o botão "Convidado" (linhas 158-163) no componente `ActionButtons` em `src/pages/Events.tsx`. O botão "Participar" já cobre a necessidade de acesso ao Meet.

Também remover a referência a `canBeGuestOnPodcast` da desestruturação em `useEventActions` e `ActionButtons`, e a importação do ícone `Microphone` (se não for usado em outro lugar).

### Arquivo: `src/pages/Events.tsx`
- Remover linhas 158-163 (bloco do botão Convidado)
- Limpar referências não utilizadas de `canBeGuestOnPodcast` e `Microphone`

