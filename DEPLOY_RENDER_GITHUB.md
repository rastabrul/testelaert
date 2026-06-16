# Deploy do Quiz MIDE no GitHub + Render

Este projeto está pronto para rodar no Render a partir de um repositório GitHub.

## 1. Subir para o GitHub

Use a pasta `mide_quiz_site` como raiz do repositório.

```powershell
cd "C:\Users\Usuario\Documents\New project 6\mide_quiz_site"
git init
git add .
git commit -m "Configura quiz MIDE para Render"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

Se você subir a pasta maior `New project 6` inteira, mova este `render.yaml` para a raiz do repositório e configure `rootDir: mide_quiz_site`.

## 2. Configurar Google Sheets

O Render precisa da URL do Apps Script, não do link `pubhtml`.

1. Abra a planilha editável.
2. Vá em Extensões > Apps Script.
3. Cole o conteúdo de `google-apps-script.gs`.
4. Publique como Web App.
5. Copie a URL final `/exec`.

## 3. Criar no Render via Blueprint

Depois que o repositório estiver no GitHub, abra:

```text
https://dashboard.render.com/blueprint/new
```

Ou use o link direto, trocando pelo seu repositório:

```text
https://dashboard.render.com/blueprint/new?repo=https://github.com/SEU_USUARIO/SEU_REPOSITORIO
```

Escolha o repositório do quiz. O Render vai ler `render.yaml` e criar o serviço.

Variável obrigatória no Render:

```text
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/SEU_ID/exec
```

Variáveis já preparadas no `render.yaml`:

```text
NODE_VERSION=20
QUIZ_DATA_DIR=/tmp/mide-quiz-data
```

O envio para Mautic ja esta no codigo do site e usa o formulario `quizmidebrplanos` (`formId=13`). Nao precisa configurar variavel no Render para isso.

Supabase e opcional. Se quiser ativar depois, adicione manualmente no Render:

```text
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
SUPABASE_LEADS_TABLE=quiz_leads
SUPABASE_CLICKS_TABLE=quiz_clicks
```

## 4. Verificar depois do deploy

Abra estes caminhos no domínio do Render:

```text
https://SEU-SERVICO.onrender.com/
https://SEU-SERVICO.onrender.com/api/health
```

O `/api/health` deve responder com `ok: true`.

## 5. Validação opcional com Render CLI

Se tiver o Render CLI instalado e autenticado:

```powershell
render blueprints validate
```

## Observação importante

No Render, arquivos locais são temporários. O salvamento definitivo dos leads deve ser feito pelo Google Sheets via `GOOGLE_APPS_SCRIPT_URL`.
