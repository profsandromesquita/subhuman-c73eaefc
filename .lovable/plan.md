
# Plano de Correção: Layout do Chat IA

## Problemas Identificados

### 1. Input escondido pela barra de navegação
O container do chat usa `h-[calc(100vh-80px)]` e não considera a altura real da BottomNav (64px + safe-area-bottom). A área de input fica "colada" na parte inferior do container, sendo coberta pela navegação fixa.

### 2. Logo ausente no header
O header mostra apenas o ícone do robô. O usuário deseja ver a logo do Subhumano posicionada acima do ícone.

---

## Solução Proposta

### Arquivo a Modificar
`src/pages/AIAssistant.tsx`

### Mudanças

**1. Ajustar altura do container principal**
- Alterar de `h-[calc(100vh-80px)]` para uma altura que considere a safe-area
- Usar `h-[calc(100dvh-64px-env(safe-area-inset-bottom))]` ou simplificar com classes flex

**2. Adicionar padding inferior na área de input**
- Aplicar `pb-safe` ou padding fixo para garantir que o input fique visível acima da BottomNav

**3. Adicionar a logo do Subhumano no header**
- Importar o componente `Logo`
- Posicionar a logo (tamanho "sm") acima ou ao lado do ícone do robô no header

---

## Implementação Detalhada

### Header Atualizado

```text
┌─────────────────────────────────────┐
│  [Logo sm]                          │
│  [Robot Icon] Subhumano IA    [🗑️]  │
│              Especialista em...     │
└─────────────────────────────────────┘
```

### Layout do Container

```text
┌─────────────────────────────────────┐
│ Header (fixo no topo)               │
├─────────────────────────────────────┤
│                                     │
│ Área de mensagens (flex-1 scroll)   │
│                                     │
├─────────────────────────────────────┤
│ Input Area                          │
│ ┌─────────────────────┐ ┌──┐        │
│ │ Digite sua pergunta │ │➤ │        │
│ └─────────────────────┘ └──┘        │
│ ← pb-safe ou pb-20 →                │
├─────────────────────────────────────┤
│ [BottomNav - fora do container]     │
└─────────────────────────────────────┘
```

---

## Código das Mudanças

### 1. Importar Logo
```typescript
import { Logo } from "@/components/Logo";
```

### 2. Ajustar container principal (linha 39)
```typescript
// De:
<div className="flex flex-col h-[calc(100vh-80px)] max-w-lg mx-auto">

// Para:
<div className="flex flex-col h-[calc(100dvh-64px)] max-w-lg mx-auto pb-safe">
```
- `100dvh` considera a viewport dinâmica (melhor em mobile)
- `64px` é a altura da BottomNav
- `pb-safe` adiciona padding para safe-area-bottom

### 3. Ajustar área de input (linha 143)
```typescript
// De:
<div className="px-4 py-3 border-t border-border bg-background">

// Para:
<div className="px-4 py-3 pb-20 border-t border-border bg-background">
```
- `pb-20` garante espaço suficiente acima da navegação

### 4. Adicionar logo no header (linhas 43-50)
```typescript
<div className="flex items-center gap-3">
  <div className="flex flex-col items-center gap-1">
    <Logo size="sm" />
    <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
      <Robot className="w-5 h-5 text-foreground" weight="fill" />
    </div>
  </div>
  <div>
    <h1 className="text-lg font-semibold text-foreground">Subhumano IA</h1>
    <p className="text-xs text-muted-foreground">Especialista em modelos de IA</p>
  </div>
</div>
```

---

## Resultado Esperado

- O campo de input ficará totalmente visível acima da barra de navegação inferior
- A logo do Subhumano aparecerá no header, acima do ícone do robô
- O layout respeitará as safe-areas em dispositivos com notch/Dynamic Island
