const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PLAN_KEYS, plans, questions, leadColumns, calculateResult } = require("./quiz-data");

const PORT = Number(process.env.PORT || 4300);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = process.env.QUIZ_DATA_DIR || path.join(ROOT, "data");
const JSON_PATH = path.join(DATA_DIR, "leads.json");
const CSV_PATH = path.join(DATA_DIR, "leads.csv");
const SHEETS_WEBHOOK_URL = process.env.GOOGLE_APPS_SCRIPT_URL || "";
const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_LEADS_TABLE = process.env.SUPABASE_LEADS_TABLE || "quiz_leads";
const SUPABASE_CLICKS_TABLE = process.env.SUPABASE_CLICKS_TABLE || "quiz_clicks";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(JSON_PATH)) fs.writeFileSync(JSON_PATH, JSON.stringify({ leads: [] }, null, 2), "utf8");
  if (!fs.existsSync(CSV_PATH)) fs.writeFileSync(CSV_PATH, leadColumns.join(",") + "\n", "utf8");
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload), "application/json; charset=utf-8");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Payload muito grande."));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function readLeads() {
  ensureDataFiles();
  try {
    const parsed = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
    return Array.isArray(parsed.leads) ? parsed.leads : [];
  } catch {
    return [];
  }
}

function writeLeads(leads) {
  ensureDataFiles();
  fs.writeFileSync(JSON_PATH, JSON.stringify({ leads }, null, 2), "utf8");
  fs.writeFileSync(CSV_PATH, toCsv(leads), "utf8");
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(leads) {
  const lines = [leadColumns.map(csvEscape).join(",")];
  for (const lead of leads) {
    const row = leadColumns.map((column) => {
      if (column.startsWith("count_")) {
        const plan = column.replace("count_", "");
        return lead.plan_counts?.[plan] || 0;
      }
      if (column.startsWith("score_total_")) {
        const plan = column.replace("score_total_", "");
        return lead.total_scores?.[plan] || 0;
      }
      if (column === "score_resultado") return lead[column] || "";
      if (column.startsWith("score_")) {
        const plan = column.replace("score_", "");
        return lead.last_scores?.[plan] || 0;
      }
      if (column === "tags_planos") return (lead.tags_planos || []).join(" | ");
      if (column === "travas_aplicadas") return (lead.travas_aplicadas || []).join(" | ");
      if (column === "ranking_planos") return JSON.stringify(lead.ranking_planos || []);
      if (column === "ultima_resposta") return JSON.stringify(lead.last_answers || []);
      if (column === "respostas") return JSON.stringify(lead.todas_respostas || lead.historico || []);
      if (column === "historico") return JSON.stringify(lead.historico || []);
      if (column === "caminhos_feitos") return JSON.stringify(lead.caminhos_feitos || []);
      if (column === "todas_respostas") return JSON.stringify(lead.todas_respostas || []);
      if (column === "cliques_links") return JSON.stringify(lead.cliques_links || []);
      return lead[column] || "";
    });
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\n") + "\n";
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function leadKey({ email, telefone }) {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail) return `email:${normalizedEmail}`;
  const phone = normalizePhone(telefone);
  return `phone:${phone}`;
}

function validateLead(lead) {
  const nome = String(lead.nome || "").trim();
  const email = normalizeEmail(lead.email);
  const telefone = normalizePhone(lead.telefone);
  const errors = [];
  if (nome.length < 2) errors.push("Informe o nome.");
  if (telefone.length < 10) errors.push("Informe um WhatsApp válido com DDD.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push("Informe um e-mail válido.");
  return { ok: errors.length === 0, errors, clean: { nome, email, telefone } };
}

function getUtms(payload) {
  const source = payload.utms || {};
  return {
    utm_source: source.utm_source || "",
    utm_medium: source.utm_medium || "",
    utm_campaign: source.utm_campaign || "",
    utm_content: source.utm_content || "",
    utm_term: source.utm_term || "",
  };
}

async function postToSheets(payload) {
  if (!SHEETS_WEBHOOK_URL) return { configured: false };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await response.text();
    return { configured: true, ok: response.ok, status: response.status, body: text.slice(0, 500) };
  } catch (error) {
    return { configured: true, ok: false, error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

function supabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

async function postToSupabase(table, payload, { upsert = false, conflict = "id" } = {}) {
  if (!supabaseConfigured()) return { configured: false };
  const query = upsert ? `?on_conflict=${encodeURIComponent(conflict)}` : "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}${query}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: upsert ? "resolution=merge-duplicates,return=minimal" : "return=minimal",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await response.text();
    return { configured: true, ok: response.ok, status: response.status, body: text.slice(0, 500) };
  } catch (error) {
    return { configured: true, ok: false, error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

function supabaseLeadPayload(record) {
  return {
    id: record.id,
    lead_key: record.lead_key,
    updated_at: record.updated_at,
    nome: record.nome,
    telefone: record.telefone,
    email: record.email,
    plano_resultado: record.plano_resultado,
    submissoes: Number(record.submissoes || 0),
    total_cliques: Number(record.total_cliques || 0),
    payload: record,
  };
}

function supabaseClickPayload(record, click) {
  return {
    id: crypto.randomUUID(),
    lead_id: record.id,
    lead_key: record.lead_key,
    at: click.at,
    plano: click.plano,
    opcao: click.opcao,
    url: click.url,
    payload: click,
  };
}

async function syncLeadToSupabase(record) {
  return postToSupabase(SUPABASE_LEADS_TABLE, supabaseLeadPayload(record), { upsert: true, conflict: "id" });
}

async function syncClickToSupabase(record, click) {
  return postToSupabase(SUPABASE_CLICKS_TABLE, supabaseClickPayload(record, click));
}

function historicalScoreTotals(record) {
  const totals = PLAN_KEYS.reduce((acc, plan) => {
    acc[plan] = 0;
    return acc;
  }, {});
  (record.historico || []).forEach((item) => {
    if (!item?.scores) return;
    PLAN_KEYS.forEach((plan) => {
      totals[plan] += Number(item.scores[plan] || 0);
    });
  });
  return totals;
}

function upsertLead(payload, result) {
  const validation = validateLead(payload.lead || {});
  if (!validation.ok) return { validation };

  const now = new Date().toISOString();
  const utms = getUtms(payload);
  const key = leadKey(validation.clean);
  const leads = readLeads();
  let record = leads.find((lead) => lead.lead_key === key);
  const planKey = result.winner.key;
  const tag = plans[planKey].tag;
  const historyItem = {
    id: crypto.randomUUID(),
    at: now,
    plano: planKey,
    plano_nome: plans[planKey].name,
    plano_alternativo: result.runnerUp?.key || "",
    resultado_original: result.resultadoOriginal || result.originalWinner?.key || planKey,
    travas_aplicadas: result.travasAplicadas || result.locksApplied || [],
    scores: result.scores,
    score_resultado: result.winner.score,
    ranking_planos: result.ranked,
    respostas: result.answers.map((answer) => ({ questionId: answer.questionId, answerId: answer.answerId, answer: answer.answer })),
  };

  if (!record) {
    record = {
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      lead_key: key,
      nome: validation.clean.nome,
      telefone: validation.clean.telefone,
      email: validation.clean.email,
      submissoes: 0,
      tags_planos: [],
      plan_counts: PLAN_KEYS.reduce((acc, plan) => {
        acc[plan] = 0;
        return acc;
      }, {}),
      total_scores: PLAN_KEYS.reduce((acc, plan) => {
        acc[plan] = 0;
        return acc;
      }, {}),
      historico: [],
      ...utms,
    };
    leads.push(record);
  }

  record.updated_at = now;
  record.nome = validation.clean.nome;
  record.telefone = validation.clean.telefone;
  record.email = validation.clean.email;
  record.submissoes = Number(record.submissoes || 0) + 1;
  historyItem.numero = record.submissoes;
  record.plano_resultado = planKey;
  record.ultimo_plano = planKey;
  record.plano_alternativo = result.runnerUp?.key || "";
  record.resultado_original = result.resultadoOriginal || result.originalWinner?.key || planKey;
  record.score_resultado = result.winner.score;
  record.ranking_planos = result.ranked;
  record.travas_aplicadas = result.travasAplicadas || result.locksApplied || [];
  record.last_scores = result.scores;
  record.last_answers = result.answers;
  record.ultima_resposta = result.answers;
  record.tags_planos = [...(record.tags_planos || []), tag];
  record.plan_counts = record.plan_counts || {};
  record.total_scores = record.total_scores || historicalScoreTotals(record);
  PLAN_KEYS.forEach((plan) => {
    record.plan_counts[plan] = Number(record.plan_counts[plan] || 0);
    record.total_scores[plan] = Number(record.total_scores[plan] || 0) + Number(result.scores[plan] || 0);
  });
  record.plan_counts[planKey] += 1;
  record.historico = [...(record.historico || []), historyItem];
  record.caminhos_feitos = (record.historico || [])
    .filter((item) => item?.plano)
    .map((item, index) => ({
      numero: item.numero || index + 1,
      at: item.at,
      plano: item.plano,
      plano_nome: item.plano_nome,
      plano_alternativo: item.plano_alternativo,
      resultado_original: item.resultado_original,
      score_resultado: item.score_resultado,
    }));
  record.todas_respostas = (record.historico || [])
    .filter((item) => item?.respostas)
    .map((item, index) => ({
      numero: item.numero || index + 1,
      at: item.at,
      plano: item.plano,
      plano_nome: item.plano_nome,
      respostas: item.respostas,
      scores: item.scores,
    }));
  Object.assign(record, utms);

  writeLeads(leads);
  return { validation, record, leads };
}

function trackLeadClick(payload) {
  const leadId = String(payload.leadId || "").trim();
  const url = String(payload.url || "").trim();
  if (!leadId || !url) return { ok: false, errors: ["Clique sem lead ou URL."] };

  const leads = readLeads();
  const record = leads.find((lead) => lead.id === leadId);
  if (!record) return { ok: false, errors: ["Lead não encontrado."] };

  const now = new Date().toISOString();
  const click = {
    at: now,
    tipo: String(payload.type || "link"),
    plano: String(payload.plan || record.plano_resultado || ""),
    opcao: String(payload.optionName || ""),
    url,
    scores: payload.scores || record.last_scores || {},
    respostas: payload.answers || {},
    utms: getUtms(payload),
  };

  record.updated_at = now;
  record.total_cliques = Number(record.total_cliques || 0) + 1;
  record.ultimo_clique_tipo = click.tipo;
  record.ultimo_clique_plano = click.plano;
  record.ultimo_clique_opcao = click.opcao;
  record.ultimo_clique_url = click.url;
  record.ultimo_clique_at = click.at;
  record.cliques_links = [...(record.cliques_links || []), click];
  record.historico = [...(record.historico || []), { at: now, tipo: "clique_link_final", clique: click }];

  writeLeads(leads);
  return { ok: true, record, click };
}

function buildStats() {
  const leads = readLeads();
  const totals = PLAN_KEYS.reduce((acc, plan) => {
    acc[plan] = 0;
    return acc;
  }, {});
  let submissions = 0;
  for (const lead of leads) {
    submissions += Number(lead.submissoes || 0);
    PLAN_KEYS.forEach((plan) => {
      totals[plan] += Number(lead.plan_counts?.[plan] || 0);
    });
  }
  return {
    leads: leads.length,
    submissions,
    repeats: leads.filter((lead) => Number(lead.submissoes || 0) > 1).length,
    totals,
    sheetConfigured: Boolean(SHEETS_WEBHOOK_URL),
    csvPath: CSV_PATH,
  };
}

function publicQuiz() {
  return {
    plans,
    questions,
    planKeys: PLAN_KEYS,
    leadColumns,
  };
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  if (["/relatorio", "/relatorio.html", "/report.js"].includes(pathname)) {
    return send(res, 404, "Arquivo não encontrado.", "text/plain; charset=utf-8");
  }
  const fullPath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (fullPath !== PUBLIC_DIR && !fullPath.startsWith(PUBLIC_DIR + path.sep)) {
    return send(res, 403, "Acesso negado.", "text/plain; charset=utf-8");
  }
  fs.readFile(fullPath, (error, data) => {
    if (error) return send(res, 404, "Arquivo não encontrado.", "text/plain; charset=utf-8");
    send(res, 200, data, mimeTypes[path.extname(fullPath)] || "application/octet-stream");
  });
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, {
      ok: true,
      service: "mide-quiz-site",
      sheetsConfigured: Boolean(SHEETS_WEBHOOK_URL),
      supabaseConfigured: supabaseConfigured(),
      uptime: Math.round(process.uptime()),
    });
  }
  if (req.method === "GET" && url.pathname === "/api/quiz") {
    return sendJson(res, 200, publicQuiz());
  }
  if (req.method === "GET" && ["/api/stats", "/api/report"].includes(url.pathname)) {
    return sendJson(res, 404, { ok: false, errors: ["Endpoint não encontrado."] });
  }
  if (req.method === "POST" && url.pathname === "/api/clicks") {
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const tracked = trackLeadClick(payload);
      if (!tracked.ok) return sendJson(res, 400, { ok: false, errors: tracked.errors });
      const sheet = await postToSheets({
        action: "trackClick",
        lead: tracked.record,
        click: tracked.click,
      });
      const supabase = {
        click: await syncClickToSupabase(tracked.record, tracked.click),
        lead: await syncLeadToSupabase(tracked.record),
      };
      return sendJson(res, 200, { ok: true, click: tracked.click, sheet, supabase });
    } catch (error) {
      return sendJson(res, 500, { ok: false, errors: ["Não foi possível registrar o clique."], detail: error.message });
    }
  }
  if (req.method === "POST" && url.pathname === "/api/leads") {
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const result = calculateResult(payload.answers || {});
      if (result.answers.length < questions.length) return sendJson(res, 400, { ok: false, errors: ["Responda todas as perguntas antes de enviar."] });

      const saved = upsertLead(payload, result);
      if (!saved.validation.ok) return sendJson(res, 400, { ok: false, errors: saved.validation.errors });

      const sheetPayload = {
        action: "upsertLead",
        lead: saved.record,
        result,
      };
      const sheet = await postToSheets(sheetPayload);
      const supabase = await syncLeadToSupabase(saved.record);
      return sendJson(res, 200, {
        ok: true,
        result,
        plan: plans[result.winner.key],
        runnerUp: result.runnerUp ? plans[result.runnerUp.key] : null,
        lead: {
          id: saved.record.id,
          submissoes: saved.record.submissoes,
          plan_counts: saved.record.plan_counts,
          tags_planos: saved.record.tags_planos,
          last_scores: saved.record.last_scores,
          total_scores: saved.record.total_scores,
          score_resultado: saved.record.score_resultado,
          ranking_planos: saved.record.ranking_planos,
          historico: saved.record.historico,
          caminhos_feitos: saved.record.caminhos_feitos,
          todas_respostas: saved.record.todas_respostas,
          ultima_resposta: saved.record.ultima_resposta,
        },
        sheet,
        supabase,
      });
    } catch (error) {
      return sendJson(res, 500, { ok: false, errors: ["Não foi possível salvar o lead."], detail: error.message });
    }
  }
  return sendJson(res, 404, { ok: false, errors: ["Endpoint não encontrado."] });
}

ensureDataFiles();

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Quiz MIDE rodando em http://${HOST}:${PORT}`);
  if (!SHEETS_WEBHOOK_URL) {
    console.log("GOOGLE_APPS_SCRIPT_URL não configurado; leads serão salvos apenas em data/leads.csv e data/leads.json.");
  }
});
