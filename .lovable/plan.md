
# Plano de Correções: Notificações e Painéis Administrativos

## Diagnóstico Completo

### 1. Notificação "Testando Subhumano"
- **ID:** `e29d20fb-1e21-406e-be39-a7002551c78a`
- **Problema:** Esta notificação foi criada com `user_id = null` (global), então o `UPDATE` para marcar como lida falha pois a condição `.eq("user_id", user.id)` nunca é satisfeita
- **Solução:** Deletar via SQL

### 2. Separação de notificações lidas/não lidas
- Atualmente todas aparecem em uma única lista
- Precisa criar duas seções na UI: "Não lidas" e "Lidas"

### 3. Assinaturas incorretas
As únicas assinaturas pagas confirmadas são:
| Usuário | Email | Plano |
|---------|-------|-------|
| Sandro Costa Mesquita | sandro.mesquita@itia.org.br | monthly |
| Arduino Ceará | contato@arduinoceara.cc | monthly |

Todas as outras são trials ou bugs. Precisa:
- Garantir que apenas essas 2 contam como "Assinaturas Ativas" (pagas)
- Recalcular MRR apenas com planos `monthly` e `yearly`
- Total deve incluir trials + pagantes

### 4. Botões não funcionais (Subscriptions)
Os itens do menu dropdown não têm `onClick`:
```typescript
// Linha 172-176 - SEM FUNCIONALIDADE
<DropdownMenuItem>Ver detalhes</DropdownMenuItem>
<DropdownMenuItem>Alterar plano</DropdownMenuItem>
<DropdownMenuItem className="text-destructive">Cancelar</DropdownMenuItem>
```

### 5. Botões não funcionais (Users)
Mesma situação:
```typescript
// Linha 168-172 - SEM FUNCIONALIDADE
<DropdownMenuItem>Ver perfil</DropdownMenuItem>
<DropdownMenuItem>Editar</DropdownMenuItem>
<DropdownMenuItem className="text-destructive">Desativar</DropdownMenuItem>
```

---

## Plano de Implementação

### Correção 1: Deletar notificação "Testando Subhumano"

**Ação:** Executar SQL para deletar a notificação com ID específico

```sql
DELETE FROM notifications 
WHERE id = 'e29d20fb-1e21-406e-be39-a7002551c78a';
```

### Correção 2: Separar notificações lidas/não lidas

**Arquivo:** `src/pages/Notifications.tsx`

Modificar a renderização da lista para agrupar:

```text
1. Criar variáveis separadas:
   - unreadNotifications = notifications.filter(n => !n.is_read)
   - readNotifications = notifications.filter(n => n.is_read)

2. Adicionar duas seções na UI:
   - Seção "Não lidas" (se houver)
   - Seção "Lidas" (se houver)

3. Cada seção terá seu próprio cabeçalho visual
```

### Correção 3: Ajustar estatísticas de assinaturas

**Arquivo:** `src/pages/admin/Subscriptions.tsx`

Modificar cálculo de stats (linhas 72-86):

```text
1. "Assinaturas Ativas" = contar apenas plan_type IN ('monthly', 'yearly')
2. MRR = somar apenas de plan_type IN ('monthly', 'yearly')
3. "Total" = contar todas (trial + pagantes)

Fórmula MRR corrigida:
- Monthly: R$ 29,90
- Yearly: R$ 299,90 / 12 = R$ 24,99/mês
```

### Correção 4: Implementar funcionalidades do dropdown (Subscriptions)

**Arquivo:** `src/pages/admin/Subscriptions.tsx`

Adicionar:

```text
1. Estado para modais:
   - selectedSubscription (para ações)
   - showDetailsDialog
   - showChangePlanDialog
   - showCancelDialog

2. Funções:
   - handleViewDetails(subscription) - abre modal com detalhes
   - handleChangePlan(subscription) - abre modal para alterar plano
   - handleCancelSubscription(subscription) - confirma e cancela

3. Componentes de modal:
   - Dialog para ver detalhes (informações completas)
   - Dialog para alterar plano (select com opções)
   - AlertDialog para cancelar (confirmação)

4. Atualizar DropdownMenuItems com onClick
```

### Correção 5: Implementar funcionalidades do dropdown (Users)

**Arquivo:** `src/pages/admin/Users.tsx`

Adicionar:

```text
1. Estado para modais:
   - selectedUser
   - showProfileDialog
   - showEditDialog
   - showDeactivateDialog

2. Funções:
   - handleViewProfile(user) - abre modal com perfil completo
   - handleEditUser(user) - abre modal para editar dados
   - handleDeactivateUser(user) - confirma e cancela assinatura

3. Componentes de modal:
   - Dialog para ver perfil (avatar, dados, roles, assinatura)
   - Dialog para editar (form com nome, roles)
   - AlertDialog para desativar (confirmação)

4. Atualizar DropdownMenuItems com onClick
```

---

## Resumo das Alterações

| Arquivo | Mudança |
|---------|---------|
| **SQL** | Deletar notificação "Testando Subhumano" |
| `src/pages/Notifications.tsx` | Separar lista em lidas/não lidas |
| `src/pages/admin/Subscriptions.tsx` | Corrigir stats + implementar modais funcionais |
| `src/pages/admin/Users.tsx` | Implementar modais funcionais |

---

## Resultado Esperado

1. Notificação "Testando Subhumano" removida
2. Notificações organizadas em duas seções visuais
3. Dashboard mostrando:
   - Total: 12 (todas assinaturas)
   - Ativas: 2 (apenas pagantes)
   - MRR: R$ 59,80 (2 x R$ 29,90)
4. Botões "Ver detalhes", "Alterar plano" e "Cancelar" funcionando com modais
5. Botões "Ver perfil", "Editar" e "Desativar" funcionando com modais

---

## Seção Técnica

### Estrutura de dados das assinaturas

As duas assinaturas pagas confirmadas:
```
ID: c3d56db4-f6b4-480d-a9b7-a0ee200d8117
User: Sandro Costa Mesquita (sandro.mesquita@itia.org.br)
Plan: monthly
Expira: 03/03/2026

ID: 3f5eb3a6-7586-41ba-bea8-e6d96a9887fb
User: Arduino Ceará (contato@arduinoceara.cc)
Plan: monthly
Expira: 05/03/2026
```

### Lógica de cálculo MRR

```typescript
const paidPlans = ['monthly', 'yearly'];
const activeCount = data.filter(s => 
  s.status === 'active' && paidPlans.includes(s.plan_type)
).length;

const mrr = data
  .filter(s => s.status === 'active' && paidPlans.includes(s.plan_type))
  .reduce((acc, s) => {
    return acc + (s.plan_type === 'monthly' ? 29.90 : 299.90 / 12);
  }, 0);
```

### Imports necessários para modais

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
```
