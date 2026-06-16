# Almoxarifado com Google Sheets

Sistema de login, permissões, estoque em tempo real, logs e analytics financeiro usando uma planilha Google como banco.

## Senha inicial sugerida

Use esta senha no Render para o primeiro administrador:

`Admin@2026-Lm7Q-92Rk`

Login inicial:

- usuário: `admin`
- senha: `Admin@2026-Lm7Q-92Rk`

## Como a planilha funciona

O Render não escreve direto na planilha. Ele envia os dados para um **Google Apps Script**, igual ao tipo de integração usado em muitos quizzes/formulários.

O Apps Script cria e atualiza estas abas:

- `Produtos`
- `Usuarios`
- `Movimentacoes`
- `Logs`
- `Configuracoes`

## Variáveis no Render

No Blueprint do Render, preencha:

- `ADMIN_PASSWORD`: `Admin@2026-Lm7Q-92Rk`
- `GOOGLE_APPS_SCRIPT_URL`: URL do Web App publicado no Apps Script

O `SESSION_SECRET` é gerado pelo próprio Render.

## Criar o Apps Script

1. Abra a planilha.
2. Vá em **Extensões** > **Apps Script**.
3. Apague o código que estiver lá.
4. Cole o conteúdo do arquivo `google-apps-script.gs`.
5. Clique em **Implantar** > **Nova implantação**.
6. Tipo: **App da Web**.
7. Executar como: **Eu**.
8. Quem pode acessar: **Qualquer pessoa**.
9. Clique em **Implantar**.
10. Copie a URL que termina em `/exec`.
11. Cole essa URL no Render em `GOOGLE_APPS_SCRIPT_URL`.

Se você editar o código do Apps Script depois, precisa ir em **Implantar** > **Gerenciar implantações** > editar implantação > **Nova versão**.

## Rodar localmente

```bash
npm install
npm start
```

Sem `GOOGLE_APPS_SCRIPT_URL`, o sistema usa `data/local-db.json` só para desenvolvimento.

## Subir no GitHub e Render

1. Suba estes arquivos para o GitHub.
2. No Render, clique em **New +** > **Blueprint**.
3. Conecte o repositório.
4. O Render vai ler o `render.yaml`.
5. Preencha `ADMIN_PASSWORD` e `GOOGLE_APPS_SCRIPT_URL`.
6. Clique em **Apply**.

O serviço usa:

- Build command: `npm install`
- Start command: `npm start`
- Health check: `/health`
