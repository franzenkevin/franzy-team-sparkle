# Reestruturação do Painel Admin (estilo Prime Coaching)

Vou reorganizar todo o `/admin` para o layout das screenshots: **sidebar fixa à esquerda + área central com lista de alunos** e, ao clicar em um aluno, **uma página de detalhe com abas horizontais** (Progresso, Anamnese, Dietas, Treinos, Feedbacks, Fotos, Notas, IA).

## 1. Nova estrutura de rotas

```text
src/routes/_authenticated/admin.tsx               -> layout com AdminSidebar + Outlet
src/routes/_authenticated/admin.index.tsx         -> Resumo (dashboard)
src/routes/_authenticated/admin.clients.tsx       -> Lista de alunos (filtros + cards)
src/routes/_authenticated/admin.clients.$id.tsx   -> Detalhe do aluno (header + tabs)
src/routes/_authenticated/admin.library.tsx       -> Bibliotecas (templates de treino/dieta)
src/routes/_authenticated/admin.tools.tsx         -> Ferramentas (calculadoras, coach IA global)
src/routes/_authenticated/admin.settings.tsx      -> Minha conta
```

A página atual `admin.tsx` (tabs Resumo/Pendências/Clientes/Coach) será quebrada nessas rotas.

## 2. AdminSidebar (`src/components/admin/AdminSidebar.tsx`)

Sidebar persistente baseada no shadcn `Sidebar`, igual às screenshots:
- Resumo
- Clientes (ativo por padrão, com sub-itens: Todos, Pendentes de aprovação, Fotos novas)
- Bibliotecas
- Ferramentas (Calculadoras, Coach IA)
- Minha conta

Colapsável (`collapsible="icon"`), com `SidebarTrigger` no header.

## 3. Lista de alunos (`admin.clients.tsx`)

Cards por aluno com:
- Avatar + nome + email + telefone
- Badges de status: Anamnese / Fotos / Treino / Dieta / Cardio
- Dias restantes do plano
- Filtros no topo: Status, Prontidão, Anamnese, Fotos, Ordenação

Click no card → navega para `admin.clients.$id`.

## 4. Detalhe do aluno (`admin.clients.$id.tsx`)

**Header azul** (igual screenshot Prime): avatar grande, nome, email copiável, badges (idade, altura, peso, plano, dias restantes), botões de ação rápida (mensagem, histórico, link, e-mail, agendar).

**Tabs horizontais** abaixo do header:

| Aba | Componente | Função |
|---|---|---|
| Progresso | `<StudentProgress />` | Cards de métricas + gráfico de peso (existente em progress.tsx adaptado) |
| Anamnese | `<StudentAnamnese />` | Visualiza respostas + 4 fotos (frente/lat dir/lat esq/costas) |
| Avaliações | `<StudentAssessments />` | Histórico de medidas/avaliações |
| Dietas | `<DietEditor />` + lista de prescrições | Já existe — usar em modo embarcado |
| Treinos | `<TrainingEditor />` + lista | Já existe |
| Hormônios | `<HormonesEditor />` | Já existe |
| Feedbacks | `<StudentFeedbacks />` | Semanais + dieta + treino + mensal, com aprovação de análise IA |
| Fotos | `<StudentPhotos />` | Galeria de evolução |
| Notas | `<StudentNotes />` | Notas internas do coach |
| IA Coach | `<CoachChat />` | Chat IA específico desse aluno (já existe `adminCoachChat`) |

Cada aba carrega só seus dados (lazy). Edições salvam direto via server fn existente.

## 5. Reaproveitamento

Tudo que já existe é reusado:
- `CoachChat`, `TrainingEditor`, `DietEditor`, `HormonesEditor`, `Calculators`, `TemplateLibrary`, `ResumoTab`
- Server fns: `adminCoachChat`, `adminGenerateBodyAnalysis`, etc.

Sem reescrever lógica — só nova **casca de navegação** + componentes finos de aba.

## 6. Detalhes técnicos

- Layout: `SidebarProvider` envolve `admin.tsx`; `<AppSidebar>` do aluno é **não** renderizado em rotas admin (já tratado em `_authenticated.tsx`).
- Mobile: sidebar vira off-canvas via `SidebarTrigger`; tabs do detalhe rolam horizontalmente.
- Roteamento: usar `<Link to="/admin/clients/$id" params={{ id }}>` tipado.
- Tabs: shadcn `<Tabs>` com `value` sincronizado a `?tab=` na URL (deep link).

## 7. Escopo desta entrega

Vou entregar a **estrutura completa de navegação + lista + detalhe com todas as abas**, conectando os editores existentes. As abas "Avaliações", "Notas" e "Fotos" entrarão com a UI básica (lista + uploader/textarea) ligada às tabelas existentes; refinamentos visuais ficam para iterações.

Aprova que eu siga?
