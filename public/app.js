const state = {
  user: null,
  data: null,
  view: "dashboard",
  query: "",
  editingProduct: null,
  editingUser: null,
  permissions: {}
};

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");

document.addEventListener("submit", onSubmit);
document.addEventListener("click", onClick);
document.addEventListener("input", onInput);
document.addEventListener("change", onChange);

init();
setInterval(() => {
  if (state.user) loadData(false);
}, 15000);

async function init() {
  const session = await api("/api/session", { allowGuest: true });
  state.user = session.user;
  state.permissions = session.permissions || {};
  if (state.user) await loadData(false);
  render();
}

async function loadData(shouldRender = true) {
  state.data = await api("/api/bootstrap");
  state.user = state.data.user;
  state.permissions = state.data.permissions;
  if (shouldRender) render();
}

function render() {
  if (!state.user) {
    app.innerHTML = loginView();
    return;
  }
  if (!canView(state.view)) state.view = "dashboard";
  app.innerHTML = shellView();
}

function loginView() {
  return `
    <main class="login">
      <section class="login-visual">
        <div class="mark">AE</div>
        <div>
          <h1>Almoxarifado Essencial</h1>
          <p>Estoque em tempo real, saídas por vendedor, logs completos e analytics financeiro restrito ao administrador.</p>
        </div>
      </section>
      <section class="login-panel">
        <div class="login-card">
          <p class="eyebrow">Login</p>
          <h2>Acessar sistema</h2>
          <form id="loginForm" class="form-grid">
            <label class="field">
              <span>Usuário</span>
              <input name="usuario" autocomplete="username" required />
            </label>
            <label class="field">
              <span>Senha</span>
              <input name="senha" type="password" autocomplete="current-password" required />
            </label>
            <button class="btn primary full" type="submit">Entrar</button>
          </form>
        </div>
      </section>
    </main>
  `;
}

function shellView() {
  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="mark">AE</div>
          <div>
            <strong>Almoxarifado</strong>
            <span>${storageLabel(state.data?.storage)}</span>
          </div>
        </div>
        <nav class="nav">
          ${navButton("dashboard", "▦", "Dashboard")}
          ${navButton("products", "□", "Produtos")}
          ${navButton("movements", "⇄", "Movimentações")}
          ${isAdmin() ? navButton("finance", "▤", "Financeiro") : ""}
          ${isAdmin() ? navButton("settings", "⚙", "Configurações") : ""}
          ${isAdmin() ? navButton("logs", "≡", "Logs") : ""}
        </nav>
        <div class="side-footer">
          <div>
            <strong>${escapeHtml(state.user.nome)}</strong>
            <div class="muted">${roleLabel(state.user.papel)}</div>
          </div>
          <button class="btn ghost" type="button" data-action="logout">Sair</button>
        </div>
      </aside>
      <main class="main">${currentView()}</main>
    </div>
  `;
}

function navButton(view, icon, label) {
  if (!canView(view)) return "";
  return `
    <button type="button" class="${state.view === view ? "active" : ""}" data-view="${view}">
      <span>${icon}</span><span>${label}</span>
    </button>
  `;
}

function currentView() {
  if (!state.data) return empty("Carregando dados.");
  const views = {
    dashboard: dashboardView,
    products: productsView,
    movements: movementsView,
    finance: financeView,
    settings: settingsView,
    logs: logsView
  };
  return (views[state.view] || dashboardView)();
}

function dashboardView() {
  const { summary } = state.data;
  return `
    ${header("Dashboard", "Produtos, quantidades e saídas recentes.", `
      ${can("registerOutput") ? `<button class="btn primary" type="button" data-view="movements">Registrar saída</button>` : ""}
      ${isAdmin() ? `<button class="btn ghost" type="button" data-view="settings">Configurações</button>` : ""}
    `)}
    <section class="metrics">
      ${metric("Produtos ativos", summary.totalProdutos)}
      ${metric("Unidades em estoque", summary.totalEstoque)}
      ${metric("Estoque crítico", summary.produtosCriticos)}
      ${metric("Saídas hoje", summary.saidasHoje)}
    </section>
    <section class="grid">
      <div class="table-wrap">
        ${productTable(state.data.products, false)}
      </div>
      <aside class="panel">
        <h3>Registrar saída</h3>
        ${movementForm("saida")}
      </aside>
    </section>
  `;
}

function productsView() {
  const query = normalize(state.query);
  const products = state.data.products.filter((product) => {
    if (!query) return true;
    return [product.nome, product.sku, product.categoria, product.localizacao].some((value) => normalize(value).includes(query));
  });

  return `
    ${header("Produtos", "Cadastro e leitura rápida do estoque atual.", `
      ${can("manageProducts") ? `<button class="btn primary" type="button" data-action="new-product">Novo produto</button>` : ""}
    `)}
    <div class="filters">
      <input data-filter="query" value="${escapeAttr(state.query)}" placeholder="Buscar produto, SKU ou local" />
    </div>
    <section class="grid">
      <div class="table-wrap">${productTable(products, true)}</div>
      ${can("manageProducts") ? productForm() : `<aside class="panel">${empty("Seu perfil pode consultar, mas não editar produtos.")}</aside>`}
    </section>
  `;
}

function productTable(products, actions) {
  return `
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>SKU</th>
            <th>Local</th>
            <th>Mín.</th>
            <th>Estoque</th>
            <th>Status</th>
            ${isAdmin() ? "<th>Custo</th><th>Venda</th>" : ""}
            ${actions && can("manageProducts") ? "<th></th>" : ""}
          </tr>
        </thead>
        <tbody>
          ${products.map((product) => `
            <tr>
              <td><strong>${escapeHtml(product.nome)}</strong><div class="muted">${escapeHtml(product.categoria || "-")}</div></td>
              <td>${escapeHtml(product.sku || "-")}</td>
              <td>${escapeHtml(product.localizacao || "-")}</td>
              <td>${formatNumber(product.estoqueMinimo)}</td>
              <td><strong>${formatNumber(product.estoqueAtual)}</strong></td>
              <td>${stockTag(product)}</td>
              ${isAdmin() ? `<td>${money(product.precoCusto)}</td><td>${money(product.precoVenda)}</td>` : ""}
              ${actions && can("manageProducts") ? `
                <td>
                  <div class="row-actions">
                    <button class="btn ghost" type="button" data-action="edit-product" data-id="${escapeAttr(product.id)}">Editar</button>
                    <button class="btn danger" type="button" data-action="delete-product" data-id="${escapeAttr(product.id)}">Remover</button>
                  </div>
                </td>
              ` : ""}
            </tr>
          `).join("") || `<tr><td colspan="${isAdmin() ? 9 : 7}">Nenhum produto cadastrado.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function productForm() {
  const product = state.editingProduct || {};
  return `
    <aside class="panel">
      <h3>${product.id ? "Editar produto" : "Novo produto"}</h3>
      <form id="productForm" class="form-grid">
        <input type="hidden" name="id" value="${escapeAttr(product.id || "")}" />
        <label class="field"><span>Nome</span><input name="nome" value="${escapeAttr(product.nome || "")}" required /></label>
        <div class="two">
          <label class="field"><span>SKU</span><input name="sku" value="${escapeAttr(product.sku || "")}" /></label>
          <label class="field"><span>Categoria</span><input name="categoria" value="${escapeAttr(product.categoria || "")}" /></label>
        </div>
        <label class="field"><span>Localização</span><input name="localizacao" value="${escapeAttr(product.localizacao || "")}" /></label>
        <div class="two">
          <label class="field"><span>Estoque inicial</span><input name="estoqueInicial" type="number" step="0.01" value="${escapeAttr(product.estoqueInicial || 0)}" /></label>
          <label class="field"><span>Estoque mínimo</span><input name="estoqueMinimo" type="number" step="0.01" value="${escapeAttr(product.estoqueMinimo || 0)}" /></label>
        </div>
        <div class="two">
          <label class="field"><span>Custo</span><input name="precoCusto" type="number" step="0.01" value="${escapeAttr(product.precoCusto || 0)}" /></label>
          <label class="field"><span>Venda</span><input name="precoVenda" type="number" step="0.01" value="${escapeAttr(product.precoVenda || 0)}" /></label>
        </div>
        <div class="toolbar" style="justify-content:flex-start">
          <button class="btn primary" type="submit">Salvar produto</button>
          ${product.id ? `<button class="btn ghost" type="button" data-action="cancel-product">Cancelar</button>` : ""}
        </div>
      </form>
    </aside>
  `;
}

function movementsView() {
  return `
    ${header("Movimentações", "Registro de entradas, saídas, devoluções e ajustes.", "")}
    <section class="grid">
      <div class="table-wrap">${movementsTable(state.data.movements)}</div>
      <aside class="panel">
        <h3>Nova movimentação</h3>
        ${movementForm(can("registerInput") ? "entrada" : "saida")}
      </aside>
    </section>
  `;
}

function movementForm(defaultType) {
  const products = state.data.products.filter((product) => product.ativo);
  return `
    <form id="movementForm" class="form-grid">
      <label class="field">
        <span>Tipo</span>
        <select name="tipo">
          ${can("registerInput") ? `<option value="entrada" ${defaultType === "entrada" ? "selected" : ""}>Entrada</option>` : ""}
          ${can("registerOutput") ? `<option value="saida" ${defaultType === "saida" ? "selected" : ""}>Saída</option>` : ""}
          ${can("registerInput") ? `<option value="devolucao">Devolução</option><option value="ajuste">Ajuste positivo</option>` : ""}
        </select>
      </label>
      <label class="field">
        <span>Produto</span>
        <select name="produtoId" required>
          <option value="">Selecione</option>
          ${products.map((product) => `<option value="${escapeAttr(product.id)}">${escapeHtml(product.nome)} (${formatNumber(product.estoqueAtual)})</option>`).join("")}
        </select>
      </label>
      <div class="two">
        <label class="field"><span>Quantidade</span><input name="quantidade" type="number" step="0.01" min="0.01" required /></label>
        <label class="field"><span>O.S.</span><input name="os" /></label>
      </div>
      ${isAdmin() ? `
        <div class="two">
          <label class="field"><span>Custo unitário</span><input name="custoUnitario" type="number" step="0.01" /></label>
          <label class="field"><span>Venda unitária</span><input name="vendaUnitario" type="number" step="0.01" /></label>
        </div>
      ` : ""}
      <label class="field"><span>Observação</span><textarea name="observacao"></textarea></label>
      <button class="btn primary full" type="submit">Registrar</button>
    </form>
  `;
}

function movementsTable(movements) {
  return `
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Produto</th>
            <th>Qtd.</th>
            <th>O.S.</th>
            <th>Obs.</th>
            ${isAdmin() ? "<th>Total venda</th><th>Lucro</th>" : ""}
          </tr>
        </thead>
        <tbody>
          ${movements.map((movement) => `
            <tr>
              <td>${dateTime(movement.criadoEm)}</td>
              <td>${movementTag(movement.tipo)}</td>
              <td><strong>${escapeHtml(movement.produtoNome)}</strong></td>
              <td>${formatNumber(movement.quantidade)}</td>
              <td>${escapeHtml(movement.os || "-")}</td>
              <td>${escapeHtml(movement.observacao || "-")}</td>
              ${isAdmin() ? `<td>${money(movement.totalVenda || 0)}</td><td>${money((movement.totalVenda || 0) - (movement.totalCusto || 0))}</td>` : ""}
            </tr>
          `).join("") || `<tr><td colspan="${isAdmin() ? 8 : 6}">Nenhuma movimentação.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function financeView() {
  if (!isAdmin()) return empty("Acesso restrito.");
  const finance = state.data.summary.financeiro || {};
  return `
    ${header("Financeiro", "Custo, receita e lucro bruto das saídas.", "")}
    <section class="metrics">
      ${metric("Receita", money(finance.receita || 0), true)}
      ${metric("Custo das saídas", money(finance.custoSaidas || 0), true)}
      ${metric("Lucro bruto", money(finance.lucroBruto || 0), true)}
      ${metric("Custo em estoque", money(finance.custoEstoque || 0), true)}
    </section>
    <div class="table-wrap">${productTable(state.data.products, false)}</div>
  `;
}

function settingsView() {
  if (!isAdmin()) return empty("Acesso restrito.");
  return `
    ${header("Configurações", "Usuários, vendedores e permissões.", `
      <button class="btn ghost" type="button" data-view="dashboard">Voltar ao dashboard</button>
    `)}
    <section class="grid">
      <div class="table-wrap">
        <div class="table-scroll">
          <table>
            <thead><tr><th>Nome</th><th>Usuário</th><th>Perfil</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${(state.data.users || []).map((user) => `
                <tr>
                  <td><strong>${escapeHtml(user.nome)}</strong></td>
                  <td>${escapeHtml(user.usuario)}</td>
                  <td>${roleLabel(user.papel)}</td>
                  <td>${user.ativo ? `<span class="tag">Ativo</span>` : `<span class="tag danger">Inativo</span>`}</td>
                  <td>
                    <div class="row-actions">
                      <button class="btn ghost" type="button" data-action="edit-user" data-id="${escapeAttr(user.id)}">Editar</button>
                      ${user.papel !== "admin" ? `<button class="btn danger" type="button" data-action="delete-user" data-id="${escapeAttr(user.id)}">Remover</button>` : ""}
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
      ${userForm()}
    </section>
  `;
}

function userForm() {
  const user = state.editingUser || { papel: "vendedor", permissoes: rolePreset("vendedor") };
  return `
    <aside class="panel">
      <h3>${user.id ? "Editar usuário" : "Novo vendedor"}</h3>
      <form id="userForm" class="form-grid">
        <input type="hidden" name="id" value="${escapeAttr(user.id || "")}" />
        <label class="field"><span>Nome</span><input name="nome" value="${escapeAttr(user.nome || "")}" required /></label>
        <div class="two">
          <label class="field"><span>Usuário</span><input name="usuario" value="${escapeAttr(user.usuario || "")}" required /></label>
          <label class="field"><span>Senha</span><input name="senha" placeholder="${user.id ? "Manter atual" : "Gerar automática"}" /></label>
        </div>
        <label class="field">
          <span>Perfil</span>
          <select name="papel">
            ${["vendedor", "estoque", "admin"].map((role) => `<option value="${role}" ${user.papel === role ? "selected" : ""}>${roleLabel(role)}</option>`).join("")}
          </select>
        </label>
        <div class="permission-grid">
          ${Object.entries(state.permissions).map(([key, label]) => `
            <label class="check">
              <input name="perm:${key}" type="checkbox" ${user.permissoes?.[key] ? "checked" : ""} />
              <span>${escapeHtml(label)}</span>
            </label>
          `).join("")}
        </div>
        <label class="check">
          <input name="ativo" type="checkbox" ${user.ativo === false ? "" : "checked"} />
          <span>Usuário ativo</span>
        </label>
        <div class="toolbar" style="justify-content:flex-start">
          <button class="btn primary" type="submit">Salvar usuário</button>
          ${user.id ? `<button class="btn ghost" type="button" data-action="cancel-user">Cancelar</button>` : ""}
        </div>
      </form>
    </aside>
  `;
}

function logsView() {
  if (!isAdmin()) return empty("Acesso restrito.");
  return `
    ${header("Logs", "Tudo que os usuários fazem fica registrado aqui.", "")}
    <div class="table-wrap">
      <div class="table-scroll">
        <table>
          <thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>Detalhes</th></tr></thead>
          <tbody>
            ${(state.data.logs || []).map((log) => `
              <tr>
                <td>${dateTime(log.criadoEm)}</td>
                <td>${escapeHtml(log.usuarioNome || "-")}</td>
                <td>${escapeHtml(log.acao)}</td>
                <td>${escapeHtml(log.entidade)} ${escapeHtml(log.entidadeId || "")}</td>
                <td>${escapeHtml(log.detalhes || "-")}</td>
              </tr>
            `).join("") || `<tr><td colspan="5">Nenhum log.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function header(title, subtitle, actions = "") {
  return `
    <header class="topbar">
      <div><h2>${title}</h2><p>${subtitle}</p></div>
      <div class="toolbar">${actions}</div>
    </header>
  `;
}

function metric(label, value, raw = false) {
  return `<div class="card"><span>${label}</span><strong>${raw ? value : formatNumber(value)}</strong></div>`;
}

async function onSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const data = Object.fromEntries(new FormData(form).entries());

  if (form.id === "loginForm") {
    const response = await api("/api/login", { method: "POST", body: data });
    state.user = response.user;
    await loadData(false);
    render();
    return;
  }

  if (form.id === "productForm") {
    const id = data.id;
    const method = id ? "PUT" : "POST";
    const url = id ? `/api/products/${id}` : "/api/products";
    await api(url, { method, body: data });
    state.editingProduct = null;
    await loadData();
    notice("Produto salvo.");
    return;
  }

  if (form.id === "movementForm") {
    await api("/api/movements", { method: "POST", body: data });
    await loadData();
    notice("Movimentação registrada.");
    return;
  }

  if (form.id === "userForm") {
    const id = data.id;
    const permissions = {};
    Object.keys(state.permissions).forEach((key) => {
      permissions[key] = Boolean(data[`perm:${key}`]);
      delete data[`perm:${key}`];
    });
    data.permissoes = permissions;
    data.ativo = Boolean(data.ativo);
    const response = await api(id ? `/api/users/${id}` : "/api/users", { method: id ? "PUT" : "POST", body: data });
    state.editingUser = null;
    await loadData();
    notice(response.generatedPassword ? `Senha gerada: ${response.generatedPassword}` : "Usuário salvo.");
  }
}

async function onClick(event) {
  const view = event.target.closest("[data-view]")?.dataset.view;
  if (view) {
    state.view = view;
    state.query = "";
    render();
    return;
  }

  const action = event.target.closest("[data-action]")?.dataset.action;
  const id = event.target.closest("[data-id]")?.dataset.id;
  if (!action) return;

  if (action === "logout") {
    await api("/api/logout", { method: "POST", body: {} });
    state.user = null;
    state.data = null;
    render();
  }
  if (action === "new-product") {
    state.editingProduct = null;
    render();
  }
  if (action === "edit-product") {
    state.editingProduct = state.data.products.find((product) => product.id === id);
    render();
  }
  if (action === "cancel-product") {
    state.editingProduct = null;
    render();
  }
  if (action === "delete-product" && confirm("Remover este produto?")) {
    await api(`/api/products/${id}`, { method: "DELETE" });
    await loadData();
  }
  if (action === "edit-user") {
    state.editingUser = state.data.users.find((user) => user.id === id);
    render();
  }
  if (action === "cancel-user") {
    state.editingUser = null;
    render();
  }
  if (action === "delete-user" && confirm("Remover este usuário?")) {
    await api(`/api/users/${id}`, { method: "DELETE" });
    await loadData();
  }
}

function onInput(event) {
  const filter = event.target.dataset.filter;
  if (!filter) return;
  const cursor = event.target.selectionStart;
  state[filter] = event.target.value;
  render();
  const restored = document.querySelector(`[data-filter="${filter}"]`);
  if (restored) {
    restored.focus();
    restored.setSelectionRange(cursor, cursor);
  }
}

function onChange(event) {
  if (event.target.name !== "papel") return;
  const form = event.target.closest("form");
  const preset = rolePreset(event.target.value);
  Object.keys(state.permissions).forEach((key) => {
    const checkbox = form.querySelector(`[name="perm:${key}"]`);
    if (checkbox) checkbox.checked = Boolean(preset[key]);
  });
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (response.status === 401 && options.allowGuest) return response.json();
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      state.user = null;
      state.data = null;
      render();
    }
    throw notice(payload.message || "Não foi possível concluir a ação.");
  }
  return payload;
}

function can(permission) {
  return isAdmin() || Boolean(state.user?.permissoes?.[permission]);
}

function canView(view) {
  if (view === "finance" || view === "settings" || view === "logs") return isAdmin();
  if (view === "products") return can("products");
  if (view === "movements") return can("movements");
  return can("dashboard");
}

function isAdmin() {
  return state.user?.papel === "admin";
}

function rolePreset(role) {
  const base = Object.fromEntries(Object.keys(state.permissions).map((key) => [key, false]));
  if (role === "admin") return Object.fromEntries(Object.keys(state.permissions).map((key) => [key, true]));
  if (role === "estoque") return { ...base, dashboard: true, products: true, manageProducts: true, movements: true, registerOutput: true, registerInput: true };
  return { ...base, dashboard: true, products: true, movements: true, registerOutput: true };
}

function stockTag(product) {
  if (!product.ativo) return `<span class="tag danger">Inativo</span>`;
  if (product.estoqueAtual <= 0) return `<span class="tag danger">Sem estoque</span>`;
  if (product.estoqueAtual <= product.estoqueMinimo) return `<span class="tag warn">Comprar</span>`;
  return `<span class="tag">Ok</span>`;
}

function movementTag(type) {
  const label = { entrada: "Entrada", saida: "Saída", devolucao: "Devolução", ajuste: "Ajuste" }[type] || type;
  const klass = type === "saida" ? "blue" : type === "ajuste" ? "warn" : "";
  return `<span class="tag ${klass}">${label}</span>`;
}

function roleLabel(role) {
  return { admin: "Administrador", vendedor: "Vendedor", estoque: "Estoque" }[role] || role;
}

function storageLabel(storage) {
  return {
    "apps-script": "Google Sheets",
    "sheets-api": "Google Sheets API",
    local: "Local"
  }[storage] || "Local";
}

function empty(text) {
  return `<div class="empty">${text}</div>`;
}

function notice(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(notice.timer);
  notice.timer = setTimeout(() => {
    toast.hidden = true;
  }, 5000);
  return new Error(message);
}

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(Number(value || 0));
}

function money(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function dateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
