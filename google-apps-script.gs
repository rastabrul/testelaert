const SHEET_NAME = 'Leads';
const SUBMISSIONS_SHEET_NAME = 'Submissoes';
const CLICKS_SHEET_NAME = 'Cliques';

const HEADERS = [
  'created_at',
  'updated_at',
  'lead_key',
  'nome',
  'telefone',
  'email',
  'submissoes',
  'plano_resultado',
  'ultimo_plano',
  'plano_alternativo',
  'resultado_original',
  'score_resultado',
  'ranking_planos',
  'travas_aplicadas',
  'tags_planos',
  'count_black',
  'count_exames',
  'count_active',
  'count_veloz',
  'count_bitfut',
  'score_black',
  'score_exames',
  'score_active',
  'score_veloz',
  'score_bitfut',
  'score_total_black',
  'score_total_exames',
  'score_total_active',
  'score_total_veloz',
  'score_total_bitfut',
  'respostas',
  'historico',
  'total_cliques',
  'ultimo_clique_tipo',
  'ultimo_clique_plano',
  'ultimo_clique_opcao',
  'ultimo_clique_url',
  'ultimo_clique_at',
  'cliques_links',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'ultima_resposta',
  'caminhos_feitos',
  'todas_respostas'
];

const SUBMISSION_HEADERS = [
  'at',
  'lead_key',
  'nome',
  'telefone',
  'email',
  'plano_resultado',
  'score_resultado',
  'score_black',
  'score_exames',
  'score_active',
  'score_veloz',
  'score_bitfut',
  'ranking_planos',
  'respostas',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term'
];

const CLICK_HEADERS = [
  'at',
  'lead_key',
  'nome',
  'telefone',
  'email',
  'plano_resultado',
  'tipo',
  'plano_clique',
  'opcao_clique',
  'url_clique',
  'scores',
  'respostas',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term'
];

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: 'MIDE Quiz endpoint ativo.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const lead = payload.lead;
    if (!lead || !lead.lead_key) {
      throw new Error('Lead sem lead_key.');
    }

    const sheet = getSheet_();
    const rowIndex = findRowByLeadKey_(sheet, lead.lead_key);
    const values = HEADERS.map((header) => valueForHeader_(lead, header));

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([values]);
    } else {
      sheet.appendRow(values);
    }

    if (payload.action === 'upsertLead') {
      appendSubmission_(payload, lead);
    }
    if (payload.action === 'trackClick') {
      appendClick_(payload, lead);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, row: rowIndex > 0 ? rowIndex : sheet.getLastRow() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheet_() {
  return getNamedSheet_(SHEET_NAME, HEADERS);
}

function getNamedSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  ensureHeaders_(sheet, headers);
  return sheet;
}

function ensureHeaders_(sheet, headers) {
  const existing = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
  const hasHeaders = headers.every((header, index) => existing[index] === header);
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function findRowByLeadKey_(sheet, leadKey) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const keys = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
  for (let index = 0; index < keys.length; index += 1) {
    if (keys[index][0] === leadKey) return index + 2;
  }
  return -1;
}

function valueForHeader_(lead, header) {
  if (header.indexOf('count_') === 0) {
    const plan = header.replace('count_', '');
    return Number((lead.plan_counts || {})[plan] || 0);
  }
  if (header.indexOf('score_total_') === 0) {
    const plan = header.replace('score_total_', '');
    return Number((lead.total_scores || {})[plan] || 0);
  }
  if (header === 'score_resultado') {
    return lead.score_resultado || '';
  }
  if (header.indexOf('score_') === 0) {
    const plan = header.replace('score_', '');
    return Number((lead.last_scores || {})[plan] || 0);
  }
  if (header === 'tags_planos') {
    return (lead.tags_planos || []).join(' | ');
  }
  if (header === 'travas_aplicadas') {
    return (lead.travas_aplicadas || []).join(' | ');
  }
  if (header === 'ranking_planos') {
    return JSON.stringify(lead.ranking_planos || []);
  }
  if (header === 'ultima_resposta') {
    return JSON.stringify(lead.last_answers || lead.ultima_resposta || []);
  }
  if (header === 'respostas') {
    return JSON.stringify(lead.todas_respostas || lead.historico || []);
  }
  if (header === 'historico') {
    return JSON.stringify(lead.historico || []);
  }
  if (header === 'caminhos_feitos') {
    return JSON.stringify(lead.caminhos_feitos || []);
  }
  if (header === 'todas_respostas') {
    return JSON.stringify(lead.todas_respostas || []);
  }
  if (header === 'cliques_links') {
    return JSON.stringify(lead.cliques_links || []);
  }
  return lead[header] || '';
}

function appendSubmission_(payload, lead) {
  const result = payload.result || {};
  const scores = result.scores || lead.last_scores || {};
  const row = SUBMISSION_HEADERS.map((header) => {
    if (header === 'at') return lead.updated_at || new Date().toISOString();
    if (header === 'plano_resultado') return lead.plano_resultado || '';
    if (header === 'score_resultado') return lead.score_resultado || (result.winner || {}).score || '';
    if (header.indexOf('score_') === 0) {
      const plan = header.replace('score_', '');
      return Number(scores[plan] || 0);
    }
    if (header === 'ranking_planos') return JSON.stringify(lead.ranking_planos || result.ranked || []);
    if (header === 'respostas') return JSON.stringify(result.answers || lead.last_answers || []);
    return lead[header] || '';
  });
  getNamedSheet_(SUBMISSIONS_SHEET_NAME, SUBMISSION_HEADERS).appendRow(row);
}

function appendClick_(payload, lead) {
  const click = payload.click || {};
  const row = CLICK_HEADERS.map((header) => {
    if (header === 'at') return click.at || new Date().toISOString();
    if (header === 'plano_resultado') return lead.plano_resultado || '';
    if (header === 'tipo') return click.tipo || '';
    if (header === 'plano_clique') return click.plano || '';
    if (header === 'opcao_clique') return click.opcao || '';
    if (header === 'url_clique') return click.url || '';
    if (header === 'scores') return JSON.stringify(click.scores || {});
    if (header === 'respostas') return JSON.stringify(click.respostas || {});
    return lead[header] || (click.utms || {})[header] || '';
  });
  getNamedSheet_(CLICKS_SHEET_NAME, CLICK_HEADERS).appendRow(row);
}
