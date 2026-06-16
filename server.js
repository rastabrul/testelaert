const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const express = require("express");

const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || crypto.randomBytes(10).toString("base64url");
const COOKIE_NAME = "almox_session";
const USE_APPS_SCRIPT = Boolean(process.env.GOOGLE_APPS_SCRIPT_URL);
const USE_SHEETS_API = !USE_APPS_SCRIPT && Boolean(
  process.env.GOOGLE_SHEET_ID &&
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
  process.env.GOOGLE_PRIVATE_KEY
);

const TABLES = {
  products: {
    title: "Produtos",
    headers: [
      "id",
      "nome",
      "sku",
      "categoria",
      "localizacao",
      "estoqueInicial",
      "estoqueMinimo",
      "precoCusto",
      "precoVenda",
      "ativo",
      "criadoEm",
      "atualizadoEm"
    ]
  },
  users: {
    title: "Usuarios",
    headers: [
      "id",
      "nome",
      "usuario",
      "senhaHash",
      "papel",
      "permissoes",
      "ativo",
      "criadoEm",
      "atualizadoEm"
    ]
  },
  movements: {
    title: "Movimentacoes",
    headers: [
      "id",
      "tipo",
      "produtoId",
      "quantidade",
      "custoUnitario",
      "vendaUnitario",
      "usuarioId",
      "vendedorId",
      "os",
      "observacao",
      "criadoEm"
    ]
  },
  logs: {
    title: "Logs",
    headers: [
      "id",
      "usuarioId",
      "usuarioNome",
      "acao",
      "entidade",
      "entidadeId",
      "detalhes",
      "ip",
      "criadoEm"
    ]
  },
  settings: {
    title: "Configuracoes",
    headers: ["chave", "valor", "atualizadoEm"]
  }
};

const PERMISSIONS = {
  dashboard: "Dashboard",
  products: "Ver produtos",
  manageProducts: "Editar produtos",
  movements: "Ver movimentações",
  registerOutput: "Registrar saída",
  registerInput: "Registrar entrada/devolução",
  settings: "Configurações",
  finance: "Analytics financeiro",
  logs: "Logs"
};

const ROLE_PRESETS = {
  admin: fullPermissions(),
  vendedor: {
    dashboard: true,
    products: true,
    manageProducts: false,
    movements: true,
    registerOutput: true,
    registerInput: false,
    settings: false,
    finance: false,
    logs: false
  },
  estoque: {
    dashboard: true,
    products: true,
    manageProducts: true,
    movements: true,
    registerOutput: true,
    registerInput: true,
    settings: false,
    finance: false,
    logs: false
  }
};

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

let store;

async function main() {
  store = USE_APPS_SCRIPT ? new AppsScriptStore() : USE_SHEETS_API ? new SheetsStore() : new LocalStore();
  await store.init();
  await ensureAdminUser();

  if (!process.env.ADMIN_PASSWORD) {
    console.log(`Senha inicial do admin gerada: ${ADMIN_PASSWORD}`);
  }
  if (!USE_APPS_SCRIPT && !USE_SHEETS_API) {
    console.log("Google Sheets não configurado. Usando data/local-db.json para desenvolvimento.");
  }

  registerRoutes();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Almoxarifado rodando na porta ${PORT}`);
  });
}

function registerRoutes() {
  app.get("/health", (_req, res) => res.json({ ok: true, storage: storageMode() }));

  app.get("/api/session", async (req, res) => {
    const user = await readUserFromRequest(req);
    res.json({ user: user ? publicUser(user) : null, permissions: PERMISSIONS });
  });

  app.post("/api/login", async (req, res) => {
    const username = clean(req.body.usuario || req.body.username);
    const password = String(req.body.senha || req.body.password || "");
    const users = await getUsers();
    const user = users.find((entry) => entry.usuario.toLowerCase() === username.toLowerCase() && entry.ativo);

    if (!user || !verifyPassword(password, user.senhaHash)) {
      await writeLog(req, null, "login_falhou", "Usuarios", username, { usuario: username });
      return res.status(401).json({ message: "Usuário ou senha inválidos." });
    }

    res.setHeader("Set-Cookie", serializeCookie(COOKIE_NAME, signSession(user.id), {
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 12
    }));
    await writeLog(req, user, "login", "Usuarios", user.id);
    res.json({ user: publicUser(user) });
  });

  app.post("/api/logout", requireAuth, async (req, res) => {
    await writeLog(req, req.user, "logout", "Usuarios", req.user.id);
    res.setHeader("Set-Cookie", serializeCookie(COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0
    }));
    res.json({ ok: true });
  });

  app.get("/api/bootstrap", requireAuth, async (req, res) => {
    const [products, movements] = await Promise.all([getProducts(), getMovements()]);
    const inventory = buildInventory(products, movements);
    const response = {
      user: publicUser(req.user),
      permissions: PERMISSIONS,
      products: inventory.map((product) => publicProduct(product, req.user)),
      movements: movements
        .slice()
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
        .slice(0, 160)
        .map((movement) => publicMovement(movement, inventory, req.user)),
      summary: buildSummary(inventory, movements, req.user),
      storage: storageMode()
    };

    if (isAdmin(req.user)) {
      response.users = (await getUsers()).map(publicUser);
      response.logs = (await getLogs()).slice(-250).reverse();
    }

    res.json(response);
  });

  app.post("/api/products", requireAuth, requirePermission("manageProducts"), async (req, res) => {
    const products = await getProducts();
    const payload = normalizeProduct(req.body);
    if (!payload.nome) return res.status(400).json({ message: "Informe o nome do produto." });
    payload.id = makeId("PROD");
    payload.criadoEm = now();
    payload.atualizadoEm = payload.criadoEm;
    products.push(payload);
    await saveProducts(products);
    await writeLog(req, req.user, "produto_criado", "Produtos", payload.id, { nome: payload.nome });
    res.status(201).json({ product: publicProduct({ ...payload, estoqueAtual: payload.estoqueInicial }, req.user) });
  });

  app.put("/api/products/:id", requireAuth, requirePermission("manageProducts"), async (req, res) => {
    const products = await getProducts();
    const index = products.findIndex((product) => product.id === req.params.id);
    if (index < 0) return res.status(404).json({ message: "Produto não encontrado." });

    const updated = {
      ...products[index],
      ...normalizeProduct(req.body),
      id: products[index].id,
      criadoEm: products[index].criadoEm,
      atualizadoEm: now()
    };
    if (!updated.nome) return res.status(400).json({ message: "Informe o nome do produto." });
    products[index] = updated;
    await saveProducts(products);
    await writeLog(req, req.user, "produto_atualizado", "Produtos", updated.id, { nome: updated.nome });
    res.json({ product: publicProduct({ ...updated, estoqueAtual: 0 }, req.user) });
  });

  app.delete("/api/products/:id", requireAuth, requirePermission("manageProducts"), async (req, res) => {
    const products = await getProducts();
    const index = products.findIndex((product) => product.id === req.params.id);
    if (index < 0) return res.status(404).json({ message: "Produto não encontrado." });
    products[index].ativo = false;
    products[index].atualizadoEm = now();
    await saveProducts(products);
    await writeLog(req, req.user, "produto_desativado", "Produtos", req.params.id);
    res.json({ ok: true });
  });

  app.post("/api/movements", requireAuth, async (req, res) => {
    const tipo = clean(req.body.tipo || "saida");
    if (!["entrada", "saida", "devolucao", "ajuste"].includes(tipo)) {
      return res.status(400).json({ message: "Tipo de movimentação inválido." });
    }
    if (tipo === "saida" && !hasPermission(req.user, "registerOutput")) {
      return res.status(403).json({ message: "Sem permissão para registrar saída." });
    }
    if (tipo !== "saida" && !hasPermission(req.user, "registerInput")) {
      return res.status(403).json({ message: "Sem permissão para registrar entrada ou devolução." });
    }

    const products = await getProducts();
    const movements = await getMovements();
    const inventory = buildInventory(products, movements);
    const product = inventory.find((entry) => entry.id === clean(req.body.produtoId));
    const quantidade = Math.abs(toNumber(req.body.quantidade));

    if (!product || !product.ativo) return res.status(404).json({ message: "Produto não encontrado." });
    if (!quantidade) return res.status(400).json({ message: "Informe uma quantidade válida." });
    if (tipo === "saida" && product.estoqueAtual < quantidade) {
      return res.status(409).json({ message: "Estoque insuficiente para esta saída." });
    }

    const movement = {
      id: makeId("MOV"),
      tipo,
      produtoId: product.id,
      quantidade,
      custoUnitario: isAdmin(req.user) ? toNumber(req.body.custoUnitario || product.precoCusto) : product.precoCusto,
      vendaUnitario: isAdmin(req.user) ? toNumber(req.body.vendaUnitario || product.precoVenda) : product.precoVenda,
      usuarioId: req.user.id,
      vendedorId: clean(req.body.vendedorId || req.user.id),
      os: clean(req.body.os),
      observacao: clean(req.body.observacao),
      criadoEm: now()
    };

    movements.push(movement);
    await saveMovements(movements);
    await writeLog(req, req.user, "movimentacao_registrada", "Movimentacoes", movement.id, {
      tipo: movement.tipo,
      produto: product.nome,
      quantidade
    });
    res.status(201).json({ movement: publicMovement(movement, inventory, req.user) });
  });

  app.get("/api/users", requireAuth, requireAdmin, async (_req, res) => {
    res.json({ users: (await getUsers()).map(publicUser), permissions: PERMISSIONS });
  });

  app.post("/api/users", requireAuth, requireAdmin, async (req, res) => {
    const users = await getUsers();
    const generatedPassword = clean(req.body.senha) || generatePassword();
    const user = normalizeUser({
      id: makeId("USR"),
      nome: req.body.nome,
      usuario: req.body.usuario,
      senhaHash: hashPassword(generatedPassword),
      papel: req.body.papel || "vendedor",
      permissoes: req.body.permissoes,
      ativo: true,
      criadoEm: now(),
      atualizadoEm: now()
    });

    if (!user.nome || !user.usuario) return res.status(400).json({ message: "Nome e usuário são obrigatórios." });
    if (users.some((entry) => entry.usuario.toLowerCase() === user.usuario.toLowerCase())) {
      return res.status(409).json({ message: "Usuário já existe." });
    }

    users.push(user);
    await saveUsers(users);
    await writeLog(req, req.user, "usuario_criado", "Usuarios", user.id, { usuario: user.usuario });
    res.status(201).json({ user: publicUser(user), generatedPassword });
  });

  app.put("/api/users/:id", requireAuth, requireAdmin, async (req, res) => {
    const users = await getUsers();
    const index = users.findIndex((user) => user.id === req.params.id);
    if (index < 0) return res.status(404).json({ message: "Usuário não encontrado." });

    const current = users[index];
    const next = normalizeUser({
      ...current,
      nome: req.body.nome,
      usuario: req.body.usuario,
      papel: req.body.papel,
      permissoes: req.body.permissoes,
      ativo: current.usuario === ADMIN_USERNAME ? true : req.body.ativo !== false,
      atualizadoEm: now()
    });

    if (clean(req.body.senha)) next.senhaHash = hashPassword(req.body.senha);
    if (users.some((user) => user.id !== next.id && user.usuario.toLowerCase() === next.usuario.toLowerCase())) {
      return res.status(409).json({ message: "Usuário já existe." });
    }

    users[index] = next;
    await saveUsers(users);
    await writeLog(req, req.user, "usuario_atualizado", "Usuarios", next.id, { usuario: next.usuario });
    res.json({ user: publicUser(next) });
  });

  app.delete("/api/users/:id", requireAuth, requireAdmin, async (req, res) => {
    const users = await getUsers();
    const index = users.findIndex((user) => user.id === req.params.id);
    if (index < 0) return res.status(404).json({ message: "Usuário não encontrado." });
    if (users[index].usuario === ADMIN_USERNAME) {
      return res.status(400).json({ message: "O administrador principal não pode ser removido." });
    }
    users[index].ativo = false;
    users[index].atualizadoEm = now();
    await saveUsers(users);
    await writeLog(req, req.user, "usuario_desativado", "Usuarios", users[index].id, { usuario: users[index].usuario });
    res.json({ ok: true });
  });

  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });
}

class AppsScriptStore {
  constructor() {
    this.url = process.env.GOOGLE_APPS_SCRIPT_URL;
  }

  async init() {
    await this.request("init", {
      tables: Object.values(TABLES).map((table) => ({
        title: table.title,
        headers: table.headers
      }))
    });
  }

  async read(title) {
    const response = await this.request("read", { title });
    return response.rows || [];
  }

  async write(title, rows) {
    await this.request("write", { title, rows });
  }

  async append(title, row) {
    await this.request("append", { title, row });
  }

  async request(action, payload = {}) {
    const response = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload })
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (_error) {
      throw new Error(`Apps Script retornou uma resposta inválida: ${text.slice(0, 180)}`);
    }
    if (!response.ok || data.ok === false) {
      throw new Error(data.message || "Falha ao acessar o Apps Script.");
    }
    return data;
  }
}

class LocalStore {
  constructor() {
    this.file = path.join(__dirname, "data", "local-db.json");
    this.data = {};
  }

  async init() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    try {
      this.data = JSON.parse(await fs.readFile(this.file, "utf8"));
    } catch (_error) {
      this.data = emptyDatabase();
      await this.save();
    }
    for (const key of Object.keys(TABLES)) {
      this.data[TABLES[key].title] ||= [];
    }
  }

  async read(title) {
    return this.data[title] || [];
  }

  async write(title, rows) {
    this.data[title] = rows;
    await this.save();
  }

  async append(title, row) {
    this.data[title] ||= [];
    this.data[title].push(row);
    await this.save();
  }

  async save() {
    await fs.writeFile(this.file, JSON.stringify(this.data, null, 2));
  }
}

class SheetsStore {
  constructor() {
    const { google } = require("googleapis");
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });
    this.sheets = google.sheets({ version: "v4", auth: this.auth });
  }

  async init() {
    const metadata = await this.sheets.spreadsheets.get({ spreadsheetId: this.spreadsheetId });
    const existing = new Set(metadata.data.sheets.map((sheet) => sheet.properties.title));
    const requests = Object.values(TABLES)
      .filter((table) => !existing.has(table.title))
      .map((table) => ({ addSheet: { properties: { title: table.title } } }));

    if (requests.length) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests }
      });
    }

    for (const table of Object.values(TABLES)) {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${quoteSheet(table.title)}!A1:${columnName(table.headers.length)}1`,
        valueInputOption: "RAW",
        requestBody: { values: [table.headers] }
      });
    }
  }

  async read(title) {
    const table = tableByTitle(title);
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${quoteSheet(title)}!A2:${columnName(table.headers.length)}100000`
    });
    return (response.data.values || [])
      .filter((row) => row.some((value) => clean(value)))
      .map((row) => Object.fromEntries(table.headers.map((header, index) => [header, row[index] ?? ""])));
  }

  async write(title, rows) {
    const table = tableByTitle(title);
    await this.sheets.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: `${quoteSheet(title)}!A2:${columnName(table.headers.length)}100000`
    });
    if (!rows.length) return;
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${quoteSheet(title)}!A2`,
      valueInputOption: "RAW",
      requestBody: { values: rows.map((row) => table.headers.map((header) => serializeCell(row[header]))) }
    });
  }

  async append(title, row) {
    const table = tableByTitle(title);
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${quoteSheet(title)}!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [table.headers.map((header) => serializeCell(row[header]))] }
    });
  }
}

async function ensureAdminUser() {
  const users = await getUsers();
  if (users.some((user) => user.usuario === ADMIN_USERNAME)) return;
  users.unshift(normalizeUser({
    id: "USR-ADMIN",
    nome: "Administrador",
    usuario: ADMIN_USERNAME,
    senhaHash: hashPassword(ADMIN_PASSWORD),
    papel: "admin",
    permissoes: ROLE_PRESETS.admin,
    ativo: true,
    criadoEm: now(),
    atualizadoEm: now()
  }));
  await saveUsers(users);
}

async function getProducts() {
  return (await store.read(TABLES.products.title)).map(normalizeProduct);
}

async function saveProducts(products) {
  await store.write(TABLES.products.title, products.map(productRow));
}

async function getUsers() {
  return (await store.read(TABLES.users.title)).map(normalizeUser);
}

async function saveUsers(users) {
  await store.write(TABLES.users.title, users.map(userRow));
}

async function getMovements() {
  return (await store.read(TABLES.movements.title)).map(normalizeMovement);
}

async function saveMovements(movements) {
  await store.write(TABLES.movements.title, movements.map(movementRow));
}

async function getLogs() {
  return store.read(TABLES.logs.title);
}

async function writeLog(req, user, action, entity, entityId, details = {}) {
  await store.append(TABLES.logs.title, {
    id: makeId("LOG"),
    usuarioId: user?.id || "",
    usuarioNome: user?.nome || "",
    acao: action,
    entidade: entity,
    entidadeId: entityId || "",
    detalhes: JSON.stringify(details),
    ip: req.ip || "",
    criadoEm: now()
  });
}

function buildInventory(products, movements) {
  const stockByProduct = new Map(products.map((product) => [product.id, product.estoqueInicial]));
  for (const movement of movements) {
    const current = stockByProduct.get(movement.produtoId) || 0;
    const signal = movement.tipo === "saida" ? -1 : 1;
    stockByProduct.set(movement.produtoId, current + signal * movement.quantidade);
  }
  return products.map((product) => ({
    ...product,
    estoqueAtual: stockByProduct.get(product.id) || 0
  }));
}

function buildSummary(products, movements, user) {
  const activeProducts = products.filter((product) => product.ativo);
  const todayKey = new Date().toISOString().slice(0, 10);
  const exitsToday = movements
    .filter((movement) => movement.tipo === "saida" && movement.criadoEm.startsWith(todayKey))
    .reduce((sum, movement) => sum + movement.quantidade, 0);
  const lowStock = activeProducts.filter((product) => product.estoqueAtual <= product.estoqueMinimo);
  const summary = {
    totalProdutos: activeProducts.length,
    totalEstoque: activeProducts.reduce((sum, product) => sum + product.estoqueAtual, 0),
    produtosCriticos: lowStock.length,
    saidasHoje: exitsToday,
    criticos: lowStock.slice(0, 12).map((product) => publicProduct(product, user))
  };

  if (isAdmin(user)) {
    const saidas = movements.filter((movement) => movement.tipo === "saida");
    const receita = saidas.reduce((sum, movement) => sum + movement.quantidade * movement.vendaUnitario, 0);
    const custoSaidas = saidas.reduce((sum, movement) => sum + movement.quantidade * movement.custoUnitario, 0);
    const custoEstoque = activeProducts.reduce((sum, product) => sum + product.estoqueAtual * product.precoCusto, 0);
    summary.financeiro = {
      receita,
      custoSaidas,
      lucroBruto: receita - custoSaidas,
      custoEstoque
    };
  }
  return summary;
}

function publicProduct(product, user) {
  const base = {
    id: product.id,
    nome: product.nome,
    sku: product.sku,
    categoria: product.categoria,
    localizacao: product.localizacao,
    estoqueAtual: product.estoqueAtual,
    estoqueMinimo: product.estoqueMinimo,
    ativo: product.ativo
  };
  if (isAdmin(user)) {
    base.estoqueInicial = product.estoqueInicial;
    base.precoCusto = product.precoCusto;
    base.precoVenda = product.precoVenda;
  }
  return base;
}

function publicMovement(movement, inventory, user) {
  const product = inventory.find((entry) => entry.id === movement.produtoId);
  const base = {
    id: movement.id,
    tipo: movement.tipo,
    produtoId: movement.produtoId,
    produtoNome: product?.nome || movement.produtoId,
    quantidade: movement.quantidade,
    usuarioId: movement.usuarioId,
    vendedorId: movement.vendedorId,
    os: movement.os,
    observacao: movement.observacao,
    criadoEm: movement.criadoEm
  };
  if (isAdmin(user)) {
    base.custoUnitario = movement.custoUnitario;
    base.vendaUnitario = movement.vendaUnitario;
    base.totalCusto = movement.custoUnitario * movement.quantidade;
    base.totalVenda = movement.vendaUnitario * movement.quantidade;
  }
  return base;
}

function publicUser(user) {
  return {
    id: user.id,
    nome: user.nome,
    usuario: user.usuario,
    papel: user.papel,
    permissoes: user.permissoes,
    ativo: user.ativo
  };
}

function normalizeProduct(input = {}) {
  return {
    id: clean(input.id),
    nome: clean(input.nome),
    sku: clean(input.sku),
    categoria: clean(input.categoria),
    localizacao: clean(input.localizacao),
    estoqueInicial: toNumber(input.estoqueInicial),
    estoqueMinimo: toNumber(input.estoqueMinimo),
    precoCusto: toNumber(input.precoCusto),
    precoVenda: toNumber(input.precoVenda),
    ativo: parseBoolean(input.ativo, true),
    criadoEm: clean(input.criadoEm),
    atualizadoEm: clean(input.atualizadoEm)
  };
}

function normalizeUser(input = {}) {
  const papel = clean(input.papel || "vendedor");
  const preset = ROLE_PRESETS[papel] || ROLE_PRESETS.vendedor;
  return {
    id: clean(input.id),
    nome: clean(input.nome),
    usuario: clean(input.usuario),
    senhaHash: clean(input.senhaHash),
    papel,
    permissoes: parseJson(input.permissoes, preset),
    ativo: parseBoolean(input.ativo, true),
    criadoEm: clean(input.criadoEm),
    atualizadoEm: clean(input.atualizadoEm)
  };
}

function normalizeMovement(input = {}) {
  return {
    id: clean(input.id),
    tipo: clean(input.tipo || "saida"),
    produtoId: clean(input.produtoId),
    quantidade: toNumber(input.quantidade),
    custoUnitario: toNumber(input.custoUnitario),
    vendaUnitario: toNumber(input.vendaUnitario),
    usuarioId: clean(input.usuarioId),
    vendedorId: clean(input.vendedorId),
    os: clean(input.os),
    observacao: clean(input.observacao),
    criadoEm: clean(input.criadoEm)
  };
}

function productRow(product) {
  return product;
}

function userRow(user) {
  return { ...user, permissoes: JSON.stringify(user.permissoes) };
}

function movementRow(movement) {
  return movement;
}

async function requireAuth(req, res, next) {
  const user = await readUserFromRequest(req);
  if (!user) return res.status(401).json({ message: "Faça login para continuar." });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req.user)) return res.status(403).json({ message: "Acesso restrito ao administrador." });
  next();
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({ message: "Sem permissão para esta ação." });
    }
    next();
  };
}

async function readUserFromRequest(req) {
  const token = parseCookies(req.headers.cookie || "")[COOKIE_NAME];
  const payload = verifySession(token);
  if (!payload?.userId) return null;
  const users = await getUsers();
  return users.find((user) => user.id === payload.userId && user.ativo) || null;
}

function isAdmin(user) {
  return user?.papel === "admin";
}

function hasPermission(user, permission) {
  return Boolean(isAdmin(user) || user?.permissoes?.[permission]);
}

function signSession(userId) {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 1000 * 60 * 60 * 12 })).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifySession(token) {
  try {
    if (!token || !token.includes(".")) return null;
    const [payload, signature] = token.split(".");
    const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
    if (signature.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.exp < Date.now()) return null;
    return data;
  } catch (_error) {
    return null;
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  if (!stored.startsWith("scrypt$")) return String(password) === stored;
  const [, salt, hash] = stored.split("$");
  const test = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(test, "hex"));
}

function fullPermissions() {
  return Object.fromEntries(Object.keys(PERMISSIONS).map((permission) => [permission, true]));
}

function emptyDatabase() {
  return Object.fromEntries(Object.values(TABLES).map((table) => [table.title, []]));
}

function parseCookies(header) {
  return Object.fromEntries(header.split(";").filter(Boolean).map((part) => {
    const [key, ...value] = part.trim().split("=");
    return [decodeURIComponent(key), decodeURIComponent(value.join("="))];
  }));
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  parts.push("Path=/");
  return parts.join("; ");
}

function parseJson(value, fallback) {
  if (typeof value === "object" && value !== null) return value;
  try {
    return { ...fallback, ...JSON.parse(clean(value) || "{}") };
  } catch (_error) {
    return { ...fallback };
  }
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return ["true", "sim", "1", "ativo", "yes"].includes(String(value).trim().toLowerCase());
}

function clean(value) {
  return String(value ?? "").trim();
}

function toNumber(value) {
  const parsed = Number(String(value ?? "0").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function now() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`.toUpperCase();
}

function generatePassword() {
  return `Senha-${crypto.randomBytes(5).toString("base64url")}`;
}

function serializeCell(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function tableByTitle(title) {
  const table = Object.values(TABLES).find((entry) => entry.title === title);
  if (!table) throw new Error(`Tabela desconhecida: ${title}`);
  return table;
}

function storageMode() {
  if (USE_APPS_SCRIPT) return "apps-script";
  if (USE_SHEETS_API) return "sheets-api";
  return "local";
}

function quoteSheet(title) {
  return `'${title.replace(/'/g, "''")}'`;
}

function columnName(index) {
  let name = "";
  while (index > 0) {
    const remainder = (index - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    index = Math.floor((index - 1) / 26);
  }
  return name;
}

main().catch((error) => {
  console.error("Falha ao iniciar o sistema:", error);
  process.exit(1);
});
