## 1. Bug crítico — protocolo nunca chega ao aluno

**Causa:** o `useEffect` de auto-save em `admin.tsx` (linhas 474–496) sempre grava `status: "pending_review"`. Ao abrir um protocolo ativo, o `setTrainingText` muda o estado e 2,5s depois o auto-save rebaixa o protocolo para `pending_review`. Mesmo após clicar "Salvar e liberar", o efeito dispara de novo no reload e reverte.

**Fix:**
- Auto-save só roda se o protocolo carregado for `pending_review` (rascunho). Para `active`/`archived`, nunca regrava.
- Adicionar ref de "carga inicial" para não disparar auto-save logo após `selectUser`.

## 2. Separação total admin × aluno

- Nova rota pública `/admin/login` (e-mail/senha). Rejeita login se o usuário não tem role `admin`.
- Rota `/login` atual rejeita login se o usuário **tem** role `admin` (manda para `/admin/login`).
- Novo layout `/_admin` (substitui acesso atual via `/admin` dentro de `_authenticated`). Não monta `AppSidebar`, `BottomNav`, `OnboardingTour`, `InstallPwaPrompt`. Tem seu próprio shell escuro com sidebar admin.
- `_authenticated` (área aluno) faz `redirect` para `/admin` se o usuário logado é admin.
- Index `/` decide destino conforme role.

## 3. Reformulação do painel admin

Layout minimalista preto/cinza/laranja, sidebar fixa, área principal com cards. Substitui as 15 abas atuais por 5 seções:

1. **Resumo** — KPIs, gráficos, alunos em risco (mantém o `ResumoTab`, refinado).
2. **Alunos** — lista + abre workspace do aluno em página dedicada (`/admin/alunos/$userId`).
3. **Aprovações** — protocolos `pending_review` + análises IA pendentes.
4. **Biblioteca** — exercícios + templates de protocolo.
5. **Configurações** — ranking, notificações broadcast.

### Workspace do aluno (`/admin/alunos/$userId`)
Página única com tabs internas:
- **Visão** — dados, anamnese, calculadoras (TMB Mifflin, GET ajustado, macros configuráveis, %gordura Navy, projeção de evolução).
- **Protocolo** — editor atual + bloco de **justificativas** (campo `rationale` JSON com `summary` + `byItem`).
- **Histórico** — feedbacks, logs, check-ins, mensagens.
- **IA Coach** — chat prescritor (item 4).
- **Progressão** — sugestão de próxima carga por exercício baseada em `workout_logs`.

### Calculadoras (componente `Calculators.tsx`)
- TMB Mifflin-St Jeor + fator atividade + déficit/superávit em % → kcal e macros (g e %).
- %Gordura Navy a partir das circunferências da anamnese.
- Projeção de peso: regressão linear sobre `weekly_feedbacks.weight` últimas 8 semanas, projeta 8 semanas à frente.
- Progressão de carga: para cada exercício logado, média móvel das últimas séries top → sugere +2,5kg / +1 rep conforme RPE médio.

## 4. IA Coach do admin — chat com ferramentas + aplicar como rascunho

Nova server function `adminCoachChat` (streaming AI SDK) com tools:
- `getStudentProfile(userId)` — anamnese completa
- `getRecentFeedback(userId)` — semanais + workout/diet
- `calcMacros(weight, height, age, sex, activity, deficitPct)` 
- `proposeProtocol(userId, rationale)` — gera treino+diet+hormones+rationale e devolve JSON para a UI aplicar
- `applyDraft(userId, training, diet, hormones, rationale)` — `needsApproval`. Cria `pending_review` no banco.

UI: painel lateral de chat no workspace, com botão "Aplicar como rascunho" que confirma o tool call.

### Justificativas (IA explica tudo)
Schema novo `rationale` em `protocols.training` e `protocols.diet`:
```
training.rationale = { summary: string, byDay: [{ name, why }], byExercise: { [exName]: why } }
diet.rationale     = { summary: string, byMeal: [{ name, why }], byFood: { [foodKey]: why } }
```
- Aluno vê resumo + cada item tem botão "por quê?" que abre um popover com a justificativa.
- Admin pode editar livremente os textos.

Atualizar `protocol.functions.ts` `PROTOCOL_SYSTEM_PROMPT` para exigir esse `rationale` na saída.

## 5. Migração de banco

```sql
-- nada de schema (rationale vive dentro dos JSONB existentes)
-- só garantir índice de papel admin já existe (has_role)
```

Nenhuma migração estrutural. Tudo cabe nos JSONB.

## Arquivos principais

```text
src/lib/admin.functions.ts          # corrigir; manter
src/lib/adminCoach.functions.ts     # NOVO — chat com tools
src/lib/calculators.ts              # NOVO — TMB/macros/Navy/projeção
src/lib/protocolRationale.ts        # NOVO — schema + helpers UI
src/routes/admin.login.tsx          # NOVO — login admin separado
src/routes/_admin.tsx               # NOVO — layout admin
src/routes/_admin/index.tsx         # NOVO — Resumo
src/routes/_admin/alunos.tsx        # NOVO — lista
src/routes/_admin/alunos.$userId.tsx# NOVO — workspace
src/routes/_admin/aprovacoes.tsx    # NOVO
src/routes/_admin/biblioteca.tsx    # NOVO
src/routes/_authenticated.tsx       # adicionar redirect se admin
src/routes/login.tsx                # bloquear admin
src/routes/index.tsx                # rotear por role
src/components/admin/AdminSidebar.tsx        # NOVO
src/components/admin/Calculators.tsx         # NOVO
src/components/admin/CoachChat.tsx           # NOVO
src/components/admin/RationalePopover.tsx    # NOVO
src/components/ProtocolPreview.tsx           # mostrar "por quê?" nos itens
src/routes/_authenticated/training.tsx       # botão "por quê?" por exercício
src/routes/_authenticated/diet.tsx           # botão "por quê?" por refeição
src/routes/_authenticated/admin.tsx          # remover (substituído por /_admin)
```

## Plano de execução (3 passos enxutos)

1. **Fix bug + separar login admin/aluno** — pequeno, valor imediato.
2. **Novo layout admin + workspace do aluno + calculadoras** — substitui as 15 abas pelo painel novo.
3. **IA Coach (chat+tools) + justificativas (rationale) em treino/dieta** — atualiza prompt da IA, UI de "por quê?" no aluno e admin.

Pronto para começar pelo passo 1 (bug + separação de login). Confirma?