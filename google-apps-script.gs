const SHEET_ID = "";

function doPost(event) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const body = JSON.parse((event.postData && event.postData.contents) || "{}");
    const action = body.action;

    if (action === "init") {
      initTables(body.tables || []);
      return json({ ok: true });
    }

    if (action === "read") {
      return json({ ok: true, rows: readRows(body.title) });
    }

    if (action === "write") {
      writeRows(body.title, body.rows || []);
      return json({ ok: true });
    }

    if (action === "append") {
      appendRow(body.title, body.row || {});
      return json({ ok: true });
    }

    if (action === "bulkWrite") {
      const tables = body.tables || {};
      Object.keys(tables).forEach((title) => writeRows(title, tables[title] || []));
      return json({ ok: true });
    }

    return json({ ok: false, message: "Ação inválida." });
  } catch (error) {
    return json({ ok: false, message: String(error && error.message ? error.message : error) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json({ ok: true, name: "Almoxarifado Apps Script" });
}

function initTables(tables) {
  const spreadsheet = getSpreadsheet();
  tables.forEach((table) => {
    const sheet = getOrCreateSheet(spreadsheet, table.title);
    const headers = table.headers || [];
    if (headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  });
  migrateLegacyProductsIfNeeded(spreadsheet);
}

function readRows(title) {
  const sheet = getSpreadsheet().getSheetByName(title);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) return [];

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String);
  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();

  return values
    .filter((row) => row.some((cell) => String(cell).trim() !== ""))
    .map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index] instanceof Date ? row[index].toISOString() : row[index];
      });
      return item;
    });
}

function writeRows(title, rows) {
  const spreadsheet = getSpreadsheet();
  const sheet = getOrCreateSheet(spreadsheet, title);
  const headers = getHeaders(sheet);

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(sheet.getLastColumn(), headers.length)).clearContent();
  }

  if (!rows.length || !headers.length) return;

  const values = rows.map((row) => headers.map((header) => serialize(row[header])));
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}

function appendRow(title, row) {
  const spreadsheet = getSpreadsheet();
  const sheet = getOrCreateSheet(spreadsheet, title);
  const headers = getHeaders(sheet);
  sheet.appendRow(headers.map((header) => serialize(row[header])));
}

function migrateLegacyProductsIfNeeded(spreadsheet) {
  const productsSheet = spreadsheet.getSheetByName("Produtos");
  if (!productsSheet || hasRealProducts(productsSheet)) return;

  const legacy = findLegacyProducts(spreadsheet);
  if (!legacy.length) return;

  writeRows("Produtos", legacy);
}

function hasRealProducts(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 2) return false;

  const values = sheet.getRange(2, 1, lastRow - 1, Math.min(lastColumn, 2)).getValues();
  return values.some((row) => {
    const id = clean(row[0]).toLowerCase();
    const name = clean(row[1]).toLowerCase();
    return id && name && id !== "id item" && name !== "nome item";
  });
}

function findLegacyProducts(spreadsheet) {
  const sheets = spreadsheet.getSheets();
  for (let s = 0; s < sheets.length; s += 1) {
    const sheet = sheets[s];
    const values = sheet.getDataRange().getValues();
    const headerIndex = values.findIndex((row) =>
      clean(row[0]).toLowerCase() === "id item" &&
      clean(row[1]).toLowerCase() === "nome item"
    );

    if (headerIndex < 0) continue;

    return legacyRowsToProducts(values.slice(headerIndex + 1));
  }
  return [];
}

function legacyRowsToProducts(rows) {
  const stockByName = {};

  rows.forEach((row) => {
    const entryName = productKey(row[13]);
    const entryQty = parseNumber(row[14]);
    if (entryName) stockByName[entryName] = (stockByName[entryName] || 0) + entryQty;

    const outputName = productKey(row[16]);
    const outputQty = parseNumber(row[17]);
    if (outputName) stockByName[outputName] = (stockByName[outputName] || 0) - outputQty;
  });

  return rows
    .filter((row) => clean(row[0]) && clean(row[1]))
    .map((row, index) => {
      const name = stripExamplePrefix(row[1]);
      const stock = Math.max(0, stockByName[productKey(name)] || 0);
      const timestamp = new Date().toISOString();
      return {
        id: clean(row[0]) || `PROD-LEGADO-${index + 1}`,
        nome: name,
        sku: clean(row[0]),
        categoria: clean(row[4]),
        localizacao: clean(row[5]),
        estoqueInicial: stock,
        estoqueMinimo: parseNumber(row[2]),
        precoCusto: parseNumber(row[3]),
        precoVenda: "",
        ativo: true,
        criadoEm: timestamp,
        atualizadoEm: timestamp,
        estoqueAtual: stock
      };
    });
}

function getSpreadsheet() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateSheet(spreadsheet, title) {
  return spreadsheet.getSheetByName(title) || spreadsheet.insertSheet(title);
}

function getHeaders(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (!lastColumn) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String);
}

function serialize(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function stripExamplePrefix(value) {
  return clean(value).replace(/^exemplo\s*-\s*/i, "");
}

function productKey(value) {
  return stripExamplePrefix(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function clean(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}

function parseNumber(value) {
  let text = clean(value).replace(/[^\d,.-]/g, "");
  if (!text) return 0;
  if (text.indexOf(",") >= 0) {
    text = text.replace(/\./g, "").replace(",", ".");
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
