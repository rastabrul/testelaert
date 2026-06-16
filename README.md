# Almoxarifado com Google Sheets

Sistema de login, permissões, estoque em tempo real, logs e analytics financeiro usando Google Sheets como banco de dados.

## Senha inicial sugerida

Use esta senha no Render para o primeiro administrador:

`Admin@2026-Lm7Q-92Rk`

Depois do primeiro login, você pode criar/remover vendedores em **Configurações**.

## Abas criadas na planilha

O sistema cria automaticamente estas abas quando tiver acesso de edição:

- `Produtos`
- `Usuarios`
- `Movimentacoes`
- `Logs`
- `Configuracoes`

Use o ID da planilha editável, o trecho entre `/d/` e `/edit` na URL do Google Sheets. O link publicado `/pubhtml` não serve para escrita.

## Variáveis no Render

No serviço do Render, abra **Environment** e preencha:

- `ADMIN_PASSWORD`: `Admin@2026-Lm7Q-92Rk`
- `GOOGLE_SHEET_ID`: ID da planilha editável
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: e-mail da conta de serviço do Google
- `GOOGLE_PRIVATE_KEY`: chave privada da conta de serviço

O `SESSION_SECRET` é gerado pelo próprio Render via `render.yaml`.

## Google Sheets

1. Crie um projeto no Google Cloud.
2. Ative a **Google Sheets API**.
3. Crie uma **Service Account**.
4. Gere uma chave JSON.
5. Compartilhe a planilha com o e-mail da Service Account como **Editor**.
6. Copie do JSON:
   - `client_email` para `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` para `GOOGLE_PRIVATE_KEY`

Se o Render não aceitar quebras de linha na chave, cole com `\n`; o servidor corrige isso ao iniciar.

## Rodar localmente

```bash
npm install
npm start
```

Sem variáveis do Google, o sistema usa `data/local-db.json` apenas para desenvolvimento.

## Subir no GitHub e Render

1. Crie um repositório no GitHub.
2. Suba estes arquivos para o repositório.
3. No Render, clique em **New +** > **Blueprint**.
4. Conecte o repositório.
5. O Render vai ler o `render.yaml`.
6. Preencha as variáveis secretas pedidas.
7. Clique em **Apply**.

O serviço usa:

- Build command: `npm install`
- Start command: `npm start`
- Health check: `/health`
