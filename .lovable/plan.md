

# Refatoracao da Pagina de Planos com Abas (Tabs)

## Resumo

Adicionar um Segmented Control (pill-style tabs) no topo da pagina de Planos para separar "Assinaturas" e "Workshops" em duas views distintas, reduzindo o scroll e a carga cognitiva.

## Estrutura das Abas

- **Aba "Assinaturas" (default)**: Banner de Trial Gratuito (se elegivel) + 3 cards de planos (Mensal, Anual, Vitalicio) + botao "Assinar agora" + secao de cupom
- **Aba "Workshops"**: Cards de eventos pagos (workshops/produtos avulsos). Se nao houver eventos, exibir estado vazio com mensagem amigavel

## Detalhes Tecnicos

### Arquivo a editar: `src/pages/Plans.tsx`

1. **Adicionar estado para aba ativa**:
   - `const [activeTab, setActiveTab] = useState<"subscriptions" | "workshops">("subscriptions")`

2. **Criar Segmented Control** (pill-style) logo abaixo do titulo/subtitulo:
   - Container com `bg-card rounded-xl p-1 flex gap-1`
   - Dois botoes ocupando 50% cada (`flex-1`)
   - Botao ativo: `bg-foreground text-background font-semibold rounded-lg`
   - Botao inativo: `text-muted-foreground hover:text-foreground`
   - Touch target minimo garantido com `py-2.5` (44px+)

3. **Renderizacao condicional com animacao**:
   - Envolver cada view em `<AnimatePresence mode="wait">` do Framer Motion
   - Animacao de fade + slide sutil (`opacity: 0, x: 10` para direita, `x: -10` para esquerda)
   - Usar `key={activeTab}` para triggerar a animacao na troca

4. **View "Assinaturas"** (`activeTab === "subscriptions"`):
   - Trial card (se `canStartTrial`)
   - Cards dos 3 planos de assinatura (codigo existente, sem alteracao visual)
   - Botao "Assinar agora"
   - Secao de cupom

5. **View "Workshops"** (`activeTab === "workshops"`):
   - Cards de eventos pagos (codigo existente dos `paidEvents`)
   - Se `paidEvents.length === 0`: estado vazio com icone `GraduationCap` e texto "Nenhum workshop disponivel no momento"

6. **Ocultar aba "Workshops"** se nao existirem eventos pagos:
   - Se `paidEvents.length === 0`, nao renderizar o segmented control (manter layout atual so com assinaturas)
   - Isso evita mostrar uma aba vazia desnecessariamente

7. **Remover divisores textuais** ("ou adquira um produto" / "ou escolha um plano de assinatura") que ficam obsoletos com as abas

### Impacto

- Apenas 1 arquivo editado (`src/pages/Plans.tsx`)
- Nenhuma dependencia nova (usa Framer Motion ja instalado)
- Nenhuma alteracao de banco/backend
- Cards existentes mantidos intactos visualmente
- Estado da aba preservado via `useState` (persiste durante a sessao na pagina)

