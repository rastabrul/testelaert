# MIDE Quiz Site

## Dados capturados

A planilha recebe o lead, UTMs, plano final, plano alternativo, resultado original antes das travas, travas aplicadas, pontuacao final, ranking de planos, pontuacao da ultima inscricao, soma total de score por plano, todas as respostas escolhidas, historico de submissoes e cliques nos links finais.

Se a pessoa voltar e trocar uma resposta antes de enviar o cadastro, vale a ultima escolha enviada. Se ela recomecar, as respostas do quiz atual sao zeradas. Se o mesmo lead fizer o quiz mais de uma vez, o contador `submissoes`, as tags e os `count_` de cada plano continuam acumulando no mesmo registro.

Quando o lead clica em um checkout ou site final, o sistema registra `ultimo_clique_*`, `total_cliques` e `cliques_links`, mantendo o link com UTM e a opcao clicada.

No Google Sheets, o Apps Script cria tres abas:

- `Leads`: uma linha consolidada por lead.
- `Submissoes`: uma linha para cada envio do formulario.
- `Cliques`: uma linha para cada clique em checkout/site final.

O resultado exibido para o usuario usa apenas a ultima inscricao. As colunas `score_total_*` servem so para analise historica.

O formulario tambem envia os dados para o Mautic em segundo plano, usando o form `quizmidebrplanos` (`formId=13`). O codigo manda `quiz_resultado`, `quiz_plano_nome`, `quiz_tag_plano`, `quiz_score_resultado`, `quiz_scores` e `quiz_ranking` como campos extras; para transformar isso em tag real dentro do Mautic, crie campos ocultos com esses aliases e uma acao/campanha que aplique a tag conforme `quiz_tag_plano`, ou use a API do Mautic.

Quiz com 8 perguntas, captacao de lead antes do resultado, pontuacao interna por plano, travas de coerencia, envio ao Mautic e integracao opcional com Google Sheets/Supabase.

## Como rodar localmente

```powershell
cd "C:\Users\Usuario\Documents\New project 6\mide_quiz_site"
node server.js
```

Também deixei um iniciador local em `start-local-server.ps1`, caso prefira abrir pelo PowerShell.

Abra:

- Quiz: `http://localhost:4300`
- Health check: `http://localhost:4300/api/health`

## Deploy GitHub + Render

O projeto está configurado com:

- `render.yaml` para Blueprint do Render.
- `.github/workflows/ci.yml` para validação no GitHub.
- `.env.example` com as variáveis necessárias.
- `DEPLOY_RENDER_GITHUB.md` com o passo a passo.

Use a pasta `mide_quiz_site` como raiz do repositório no GitHub. Depois, crie o serviço no Render via Blueprint e configure `GOOGLE_APPS_SCRIPT_URL` com a URL `/exec` do Apps Script.

## Salvamento de leads

Sem configuração adicional, os leads ficam em:

- `data/leads.json`
- `data/leads.csv`

Se precisar usar outra pasta para os dados, configure `QUIZ_DATA_DIR`.

Para Google Sheets:

1. Abra a planilha editável, não o link publicado `pubhtml`.
2. Vá em Extensões > Apps Script.
3. Cole o conteúdo de `google-apps-script.gs`.
4. Publique como Web App.
5. Configure a URL no ambiente:

```powershell
$env:GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/SEU_ID/exec"
node server.js
```

## Observação

O link `pubhtml` só permite visualizar a planilha publicada. Ele não recebe dados por POST.

Em produção no Render, considere o Google Sheets obrigatório: arquivos locais no servidor são temporários.

## Supabase opcional

Tambem e possivel salvar no Supabase sem deixar de enviar para o Mautic. Configure estas variaveis somente se ja tiver as tabelas criadas:

```powershell
$env:SUPABASE_URL="https://SEU-PROJETO.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="SUA_SERVICE_ROLE_KEY"
$env:SUPABASE_LEADS_TABLE="quiz_leads"
$env:SUPABASE_CLICKS_TABLE="quiz_clicks"
```

As tabelas esperadas usam colunas simples e um `payload` JSON:

- `quiz_leads`: `id`, `lead_key`, `updated_at`, `nome`, `telefone`, `email`, `plano_resultado`, `submissoes`, `total_cliques`, `payload`.
- `quiz_clicks`: `id`, `lead_id`, `lead_key`, `at`, `plano`, `opcao`, `url`, `payload`.
