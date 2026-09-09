# Subir projeto completo para GitHub

## Objetivo
Conectar o projeto atual ao GitHub via integração nativa da Lovable e criar o repositório **APP FRANZEN TEAM** com todo o código-fonte, histórico de versões e configurações.

## Escopo
- Todo o código do projeto (pasta `src/`, configurações, rotas, componentes, funções server, migrações etc.).
- Arquivos de configuração (`vite.config.ts`, `wrangler.jsonc`, `package.json`, `tsconfig.json`, `components.json`, `.env` etc.).
- **Fora do escopo**: dados do banco de dados e arquivos de storage. Esses são exportados separadamente pelo painel Lovable Cloud.

## Passos

1. **Abrir a integração GitHub no editor Lovable**
   - No editor, clicar no menu **Plus (+)** no canto inferior esquerdo da caixa de chat.
   - Selecionar **GitHub → Connect project**.

2. **Autorizar o app da Lovable no GitHub**
   - Na tela de autorização do GitHub, permitir que o app "Lovable" acesse a conta desejada.
   - Aceitar as permissões solicitadas.

3. **Escolher conta/organização**
   - Selecionar a conta pessoal ou organização onde o repositório será criado.

4. **Criar o repositório com o nome definido**
   - Nome: `APP FRANZEN TEAM`
   - Visibilidade: conforme preferência do usuário (público ou privado).
   - Clicar em **Create Repository**.

5. **Aguardar o push inicial**
   - A Lovable fará o push completo do projeto para o novo repositório automaticamente.
   - Aguardar a confirmação de sincronização no editor.

6. **Verificar no GitHub**
   - Acessar o repositório criado no GitHub.
   - Confirmar que todos os arquivos e pastas estão presentes.
   - Verificar se o README, commits iniciais e branches principais foram criados.

7. **Confirmar sincronização bidirecional**
   - A partir da conexão, qualquer alteração feita no editor Lovable será enviada automaticamente para o GitHub.
   - Alterações feitas diretamente no GitHub também sincronizam de volta para a Lovable.

## Pós-condições
- Repositório `APP FRANZEN TEAM` criado e populado com o projeto completo.
- Integração ativa para sincronização contínua.
- URL do repositório disponível para acesso e compartilhamento.

## Notas técnicas
- A integração nativa da Lovable cria um repositório novo; não é possível importar diretamente para um repositório existente.
- Dados do banco (tabelas, registros) e arquivos de storage não são versionados no GitHub. Para backup de dados, usar a exportação do Lovable Cloud.
- O `.env` pode conter variáveis sensíveis; verificar se o repositório será privado caso essas informações devam permanecer protegidas.
