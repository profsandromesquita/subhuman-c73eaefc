

# Plano: Modal de Confirmação de Trial + Visibilidade Melhorada

## Problema Identificado

Na página de planos atual:

| Problema | Impacto |
|----------|---------|
| Opção de trial escondida no final da página | Usuários não veem a opção gratuita |
| Link de "7 dias grátis" em texto pequeno e cinza | Passa despercebido |
| Botão "voltar" leva direto para outra página | Usuário fica em loop sem saber do trial |
| Nenhum modal de confirmação | Não há "última chance" antes de sair |

### Estado Atual do Trial (linha 258-267)

```text
╔═══════════════════════════════════════════════════════════════╗
║  [Planos pagos chamando atenção]                              ║
║  [Botão "Assinar agora" em destaque]                          ║
║  ─────────────────────────────────────────────────────────────║
║  Prefiro testar grátis por 7 dias →   ← Texto pequeno, cinza  ║
╚═══════════════════════════════════════════════════════════════╝
```

## Solução Proposta

### 1. Card de Trial em Destaque (ANTES dos planos pagos)

Mover a opção de trial para o topo e transformá-la em um card visualmente atrativo:

```text
╔═══════════════════════════════════════════════════════════════╗
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │  🎁 GRÁTIS                                              │  ║
║  │  Teste por 7 dias                                       │  ║
║  │  Acesso completo sem cartão de crédito                  │  ║
║  │  [────────── Começar período gratuito ──────────]       │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  ─── ou escolha um plano ───                                  ║
║                                                               ║
║  [Card Mensal]  [Card Anual]                                  ║
╚═══════════════════════════════════════════════════════════════╝
```

### 2. Modal de Confirmação ao Clicar em Voltar

Quando o usuário clicar no botão de voltar e puder usar o trial (`status === 'none'`), mostrar um modal perguntando se ele não quer experimentar grátis:

```text
╔═══════════════════════════════════════════════════════════════╗
║              🎁 Espera! Que tal testar grátis?               ║
║                                                               ║
║  Você pode experimentar o Subhumano por 7 dias               ║
║  completamente grátis, sem precisar informar                 ║
║  nenhum dado de cartão de crédito.                           ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │           Quero meus 7 dias grátis                      │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║                                                               ║
║                   Não, voltar para a home                     ║
╚═══════════════════════════════════════════════════════════════╝
```

## Arquivos a Modificar/Criar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/TrialOfferModal.tsx` | **Criar** | Modal de confirmação do trial |
| `src/pages/Plans.tsx` | **Modificar** | Interceptar botão voltar + redesenhar layout |

## Implementação Detalhada

### 1. Criar TrialOfferModal.tsx

Um novo componente modal que será exibido quando o usuário tentar sair da página de planos:

**Conteúdo do Modal:**
- Ícone de presente (Gift) animado
- Título: "Espera! Que tal testar grátis?"
- Descrição explicando os benefícios do trial
- Destaque: "Sem cartão de crédito"
- Botão primário: "Quero meus 7 dias grátis"
- Link secundário: "Não, voltar para a home"

**Props do componente:**
- `isOpen`: boolean para controlar visibilidade
- `onClose`: callback para fechar o modal
- `onConfirmTrial`: callback para iniciar o trial
- `isLoading`: boolean para estado de carregamento

### 2. Modificar Plans.tsx

**2.1 - Interceptar navegação de volta:**

Ao invés de usar `<Link to={backDestination}>`, converter para um botão que:
- Verifica se `canStartTrial` é true (usuário pode usar trial)
- Se sim, abre o modal de confirmação
- Se não (já tem assinatura), navega normalmente

**2.2 - Redesenhar seção de trial:**

Mover o card de trial para ANTES dos planos pagos com:
- Badge "GRÁTIS" em destaque
- Título "Teste por 7 dias"
- Subtítulo "Acesso completo sem cartão de crédito"
- Botão grande e visível "Começar período gratuito"
- Separador visual "ou escolha um plano"

**2.3 - Estado do modal:**

Adicionar estados para controlar o modal:
- `showTrialModal`: boolean para abrir/fechar
- Handler para o botão de voltar
- Handler para confirmar o trial via modal

## Fluxo de Navegação

```text
Usuário na página /plans
        │
        ▼
Clica no botão "Voltar"
        │
        ├── status === 'none' (pode usar trial)
        │   │
        │   ▼
        │   Abre modal "Quer testar grátis?"
        │   │
        │   ├── Clica "Quero 7 dias grátis"
        │   │   │
        │   │   ▼
        │   │   Inicia trial → Navega para /home
        │   │
        │   └── Clica "Não, voltar"
        │       │
        │       ▼
        │       Fecha modal → Navega para /home
        │
        └── status !== 'none' (já tem/teve assinatura)
            │
            ▼
            Navega normalmente para /home
```

## Seção Técnica

### Componente TrialOfferModal

```typescript
interface TrialOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmTrial: () => void;
  isLoading: boolean;
}
```

Usará os componentes Dialog existentes do projeto para manter consistência visual.

### Interceptação do Botão Voltar

```typescript
const handleBackClick = () => {
  if (canStartTrial) {
    setShowTrialModal(true);
  } else {
    navigate(backDestination);
  }
};
```

### Estrutura do Card de Trial em Destaque

O card terá:
- Borda com destaque (ex: `border-green-500/50`)
- Badge flutuante "GRÁTIS"
- Gradiente sutil de fundo
- Ícone de presente (Gift) com animação

### Benefícios da Implementação

1. **Visibilidade do Trial**: Card em destaque no topo da página
2. **Última Chance**: Modal captura usuários que iriam sair
3. **Transparência**: Deixa claro que não precisa de cartão
4. **UX Melhorada**: Usuário não fica "preso" em loop
5. **Conversão**: Aumenta chances de conversão para trial

