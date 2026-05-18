
## Escopo

Reformar o app do aluno para ficar igual ao Evoria nos pontos pedidos, adicionar análise corporal IA (mascarada como manual no admin) e arrumar o admin responsivo.

---

## 1. App do aluno

### 1.1 Treino — registro de cargas estilo Evoria
- Em `src/routes/_authenticated/training.tsx`:
  - Adicionar bloco "Descrição do treino" no topo de cada dia: mostrar `day.rationale` (já existe) + `day.name`, `day.weekday`, observações gerais.
  - Para cada exercício, expor um **card de séries** com colunas: Set | Carga (kg) | Reps | RPE | ✓. Linhas pré-preenchidas com a última sessão (já temos `previousSets`). Botão "+ série" e "− série".
  - Manter aquecimento, mas separar visualmente das séries válidas.
  - Botão "Salvar série" por linha + "Concluir exercício" que dispara timer de descanso (já existe).
  - Exibir histórico curto inline ("última: 4×10 @ 60kg").

### 1.2 Bottom nav — 5 ícones
- Atualizar `src/components/BottomNav.tsx` para: **Home / Treino / Dieta / Hormônios / Feedback** (remover Coach IA e Progresso/Perfil da barra; manter no sidebar).
- Grid passa de `grid-cols-6` para `grid-cols-5`.

### 1.3 Hormônios + Feedback
- Já existe `/_authenticated/hormones`. Manter.
- Criar `/_authenticated/feedback` como hub: cards para "Feedback semanal", "Feedback de dieta", "Análise mensal" (rotas já existem).

### 1.4 Dieta estilo Evoria + suplementos
- Em `src/routes/_authenticated/diet.tsx`:
  - Render por refeição com alimentos, gramas, macros, **opções de substituição** (já no schema).
  - Bloco "Suplementos" lendo `diet.supplements: [{ name, dose, timing, notes }]` com cards.
  - Bloco "Termogênicos / pré-treino" se presente.
  - Bloco "Observações da dieta" (`diet.notes`).
- Estender o `DietEditor` admin para editar `supplements`.

### 1.5 Anamnese — fotos em 4 ângulos
- Em `src/routes/_authenticated/onboarding.tsx` (passo "Fotos do físico"):
  - Substituir 3 uploads por **4**: Frente, Lateral direita, Lateral esquerda, Costas.
- Adicionar coluna `photo_side_left_url` em `profiles` (migration). As atuais `photo_side_url` viram "lateral direita".

### 1.6 Remover análise corporal IA do aluno
- Esconder o gerador IA em `/_authenticated/body-analysis` para alunos; aluno só visualiza conteúdo aprovado pelo coach (status `approved` em `ai_analyses`). Nenhuma menção a "IA" na UI do aluno — chamar de "Análise do coach".

---

## 2. App do admin

### 2.1 Análise corporal IA (mascarada)
- Quando aluno completa anamnese ou envia feedback com fotos, o admin vê botão "Gerar análise" que chama `adminGenerateBodyAnalysis` (já existe). Resultado vai em editor de texto rico/textarea + "Aprovar & liberar" → status `approved` em `ai_analyses`.
- No app do aluno aparece como análise do coach.
- Adicionar painel de "Análises pendentes" no admin Resumo.

### 2.2 Editor de treino responsivo
- `src/components/admin/TrainingEditor.tsx`: ajustar grids para empilhar em mobile (`grid-cols-1 sm:grid-cols-2 md:grid-cols-4`), aumentar áreas de toque, mover botões de mover/excluir para uma linha própria em telas estreitas.
- Mesma revisão em `DietEditor` e `HormonesEditor`.
- Reduzir padding lateral em mobile no admin shell.

---

## 3. Banco

Migration:
- `ALTER TABLE profiles ADD COLUMN photo_side_left_url text;`
- Renomear conceito: `photo_side_url` = lateral direita (sem rename SQL, só convenção).
- Adicionar índice ou nada extra.

Schema do protocolo (`diet` jsonb) ganha campo opcional `supplements: []` — sem migration, só convenção.

---

## 4. Arquivos a editar/criar

**Editar:** `src/components/BottomNav.tsx`, `src/routes/_authenticated/training.tsx`, `src/routes/_authenticated/diet.tsx`, `src/routes/_authenticated/onboarding.tsx`, `src/routes/_authenticated/body-analysis.tsx`, `src/components/admin/TrainingEditor.tsx`, `src/components/admin/DietEditor.tsx`, `src/components/admin/HormonesEditor.tsx`, `src/routes/_authenticated/admin.tsx`.

**Criar:** `src/routes/_authenticated/feedback.tsx` (hub).

**Migration:** adicionar `photo_side_left_url` em profiles.

---

## Fora de escopo (a não ser que peça)
- Trocar bottom nav para incluir Perfil (fica no sidebar/header).
- Refazer scoring de IA, RAG, etc.
- Mudar autenticação.

Confirma para eu seguir?
