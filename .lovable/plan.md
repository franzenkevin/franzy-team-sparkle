# Plano de implementação

## 1. Menu inferior fixo (mobile)
- Novo componente `src/components/BottomNav.tsx` com 6 abas: **Dashboard, Treino, Dieta, Coach IA, Progresso, Perfil**.
- Renderizado dentro do `_authenticated.tsx`, visível apenas em `md:hidden`, fixo no rodapé com safe-area, destaque para rota ativa.
- Sidebar continua para desktop. Mobile ganha padding bottom para não cobrir conteúdo.
- Página `/progress` ganha aba "Feedback" interna agrupando semanal/dieta/diário (sem novas rotas necessárias — links).

## 2. Avaliação corporal por IA (estilo Evolt/Evoria)
- Nova rota `src/routes/_authenticated/body-analysis.tsx`:
  - Upload de 3 fotos (frente/lado/costas) ao bucket `photos`.
  - Campos opcionais: peso atual, altura (puxa do profile).
  - Botão "Analisar com IA".
- Server function `analyzeBody` em `src/lib/body-analysis.functions.ts`:
  - Gera signed URLs das fotos, envia para Lovable AI Gateway (`google/gemini-2.5-pro` — multimodal).
  - Prompt estruturado retornando JSON: `% gordura estimada`, `massa magra estimada`, `simetria`, `pontos fortes`, `pontos fracos` (por grupo muscular), `postura`, `recomendações`.
  - Salva em `ai_analyses` (`kind='body_analysis'`, `status='pending'`) — admin aprova antes do aluno ver (regra já existente).
- Card no dashboard mostra última análise aprovada + botão "Nova análise".
- Admin (aba "Análises IA") já lista pendentes → ganha preview específico com as fotos + JSON formatado.

## 3. Auto-save da anamnese no servidor
- Estender `useDraftAutoSave` com opção `remoteSave` ou criar `useServerDraftAutoSave`.
- Server fn `saveAnamneseDraft` em `anamnese.functions.ts`: faz upsert do payload parcial em `profiles.anamnese_extra->>'draft'` (jsonb), preservando dados já preenchidos.
- Server fn `loadAnamneseDraft` para hidratar ao reabrir.
- Em `onboarding.tsx`: debounce 1.5s → chama servidor; ao concluir, limpa o draft. Mostra "Salvo no servidor HH:MM".
- Mantém também salvamento local como fallback offline.

## 4. Layout admin (inspiração PrimeCoaching)
- Refactor de `src/routes/_authenticated/admin.tsx`:
  - **Coluna esquerda** (lista de alunos): avatar, nome, status (ativo/pendente/atrasado), última atividade, busca no topo.
  - **Header do aluno selecionado**: avatar grande, nome, objetivo, KPIs em cards horizontais (peso atual, % aderência treino, % aderência dieta, dias desde último check-in, próxima ondulação).
  - **Tabs horizontais** com ícones: Perfil, Treino, Dieta, Hormônios, Análises IA, Feedback, Histórico, Preview.
  - **Timeline lateral direita** (desktop xl+): últimos 10 eventos (check-in, feedback, treino logado) em ordem cronológica.
  - Tema escuro com cards `bg-card`, bordas suaves, badges de status coloridos via tokens semânticos do `styles.css`.
  - Mantém todas funcionalidades atuais (editores visuais, auto-save, templates, IA, aprovação).

## Detalhes técnicos
- Sem novas tabelas — usa `ai_analyses`, `photos` bucket e `profiles.anamnese_extra` existentes.
- Sem mudanças no schema; somente código TS/TSX e CSS.
- Lovable AI Gateway para análise corporal (multimodal Gemini 2.5 Pro).
- Reuso de `TrainingEditor`, `DietEditor`, `HormonesEditor`, `ProtocolPreview`, `TemplateLibrary`.

Confirma para eu seguir?