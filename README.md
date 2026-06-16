# Almoxarifado com Supabase

Sistema de almoxarifado com login, permissoes, produtos, estoque em tempo real, movimentacoes, logs e analytics financeiro. O banco principal agora e o Supabase.

## Primeiro login

No Render, preencha a variavel `ADMIN_PASSWORD` com uma senha forte escolhida por voce.

Login inicial:

- usuario: `admin`
- senha: a senha que voce colocou em `ADMIN_PASSWORD`

Nao salve essa senha no GitHub.

## O que fica salvo no Supabase

O arquivo `supabase-schema.sql` cria estas tabelas:

- `products`: cadastro dos produtos e estoque atual.
- `movements`: entradas, saidas, devolucoes e ajustes.
- `app_users`: usuarios, vendedores e permissoes.
- `app_logs`: tudo que os usuarios fazem no sistema.
- `settings`: configuracoes futuras.
- `financial_summary`: visao de receita, custo e lucro bruto das saidas.

Quando uma saida e registrada, o sistema grava uma linha em `movements` e desconta a quantidade em `products.estoque_atual`.

## Criar o banco no Supabase

1. Crie um projeto em [Supabase](https://supabase.com/).
2. Abra o projeto.
3. Va em **SQL Editor**.
4. Clique em **New query**.
5. Cole todo o conteudo do arquivo `supabase-schema.sql`.
6. Clique em **Run**.
7. Depois va em **Table Editor** e confira as tabelas `products`, `movements`, `app_users`, `app_logs` e `settings`.

## Pegar as chaves do Supabase

No Supabase:

1. Va em **Project Settings**.
2. Abra **API Keys** ou **API**.
3. Copie a **Project URL** para `SUPABASE_URL`.
4. Copie a **Secret key** para `SUPABASE_SERVICE_ROLE_KEY`.

Se o seu painel mostrar chaves antigas, use a chave `service_role` no campo `SUPABASE_SERVICE_ROLE_KEY`.

Nunca coloque essa chave no frontend, no GitHub ou em conversa publica. Ela deve ficar somente nas variaveis secretas do Render.

## Variaveis no Render

No Blueprint do Render, preencha:

- `ADMIN_PASSWORD`: senha forte escolhida por voce
- `SUPABASE_URL`: URL do projeto Supabase, exemplo `https://xxxxx.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: Secret key ou service_role key do Supabase

O `SESSION_SECRET` e gerado pelo proprio Render.

Na tela do Blueprint:

- **Blueprint Name**: pode ser `almoxarifado-supabase`
- **Branch**: `main`
- **Blueprint Path**: deixe `render.yaml`

## Subir no GitHub e Render

1. Suba estes arquivos para o GitHub.
2. No Render, clique em **New +** > **Blueprint**.
3. Conecte o repositorio.
4. O Render vai ler o `render.yaml`.
5. Preencha `ADMIN_PASSWORD`, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
6. Clique em **Apply** ou **Deploy Blueprint**.

O servico usa:

- Build command: `npm install`
- Start command: `npm start`
- Health check: `/health`

## Rodar localmente

Crie um arquivo `.env` com base em `.env.example` e preencha as variaveis.

Depois rode:

```bash
npm install
npm start
```

Sem `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, o sistema usa `data/local-db.json` apenas para teste local.

## Importar produtos antigos

Se voce ja tem produtos em planilha:

1. Exporte a planilha como CSV.
2. No Supabase, abra `products`.
3. Use **Import data from CSV**.
4. Garanta que a coluna `id` esteja preenchida.

Exemplo de `id`: `PROD-001`, `PROD-002`, `PROD-003`.

Para estoque atual, preencha `estoque_atual`. As saidas novas devem ser registradas pelo sistema para criar historico em `movements`.
