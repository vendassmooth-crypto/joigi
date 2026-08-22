const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG_PATH = path.join(__dirname, 'data', 'config.json');
const ORDERS_PATH = path.join(__dirname, 'data', 'orders.json');

function defaultConfig() {
  return {
    guildId: null,
    adminRoleId: null,
    logChannelId: null,
    embedColor: '#00B0F4',
    currencySymbol: 'R$',
    pix: {
      key: '',
      merchantName: 'SMOOTH VENDAS',
      merchantCity: 'SAO PAULO'
    },
    panel: {
      title: '🛒 Smooth Vendas',
      description:
        'Bem-vindo à loja oficial do **Smooth Roblox**!\nEscolha uma categoria abaixo para ver os produtos disponíveis.',
      image: '',
      thumbnail: '',
      footer: 'Smooth Vendas • Compra rápida e segura'
    },
    categories: []
  };
}

function ensureFiles() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig(), null, 2));
  }
  if (!fs.existsSync(ORDERS_PATH)) {
    fs.writeFileSync(ORDERS_PATH, JSON.stringify({ orders: [] }, null, 2));
  }
}

ensureFiles();

let config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
let ordersData = JSON.parse(fs.readFileSync(ORDERS_PATH, 'utf8'));

function saveConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function saveOrders() {
  fs.writeFileSync(ORDERS_PATH, JSON.stringify(ordersData, null, 2));
}

function getConfig() {
  return config;
}

function updateConfig(mutatorFn) {
  mutatorFn(config);
  saveConfig();
  return config;
}

function genId() {
  return crypto.randomBytes(4).toString('hex');
}

// ---------- Categorias ----------
function listCategories() {
  return config.categories;
}

function getCategory(catId) {
  return config.categories.find((c) => c.id === catId);
}

function createCategory({ name, emoji, description }) {
  const cat = {
    id: genId(),
    name,
    emoji: emoji || '📁',
    description: description || 'Sem descrição.',
    products: []
  };
  config.categories.push(cat);
  saveConfig();
  return cat;
}

function editCategory(catId, { name, emoji, description }) {
  const cat = getCategory(catId);
  if (!cat) return null;
  if (name !== undefined && name !== '') cat.name = name;
  if (emoji !== undefined && emoji !== '') cat.emoji = emoji;
  if (description !== undefined && description !== '') cat.description = description;
  saveConfig();
  return cat;
}

function deleteCategory(catId) {
  const idx = config.categories.findIndex((c) => c.id === catId);
  if (idx === -1) return false;
  config.categories.splice(idx, 1);
  saveConfig();
  return true;
}

// ---------- Produtos ----------
function getProduct(catId, prodId) {
  const cat = getCategory(catId);
  if (!cat) return null;
  return cat.products.find((p) => p.id === prodId) || null;
}

function createProduct(catId, { name, price, description, stock }) {
  const cat = getCategory(catId);
  if (!cat) return null;
  const product = {
    id: genId(),
    name,
    price: Number(price),
    description: description || 'Sem descrição.',
    stock: Array.isArray(stock) ? stock : []
  };
  cat.products.push(product);
  saveConfig();
  return product;
}

function editProduct(catId, prodId, { name, price, description }) {
  const product = getProduct(catId, prodId);
  if (!product) return null;
  if (name !== undefined && name !== '') product.name = name;
  if (price !== undefined && price !== '' && !isNaN(Number(price))) product.price = Number(price);
  if (description !== undefined && description !== '') product.description = description;
  saveConfig();
  return product;
}

function deleteProduct(catId, prodId) {
  const cat = getCategory(catId);
  if (!cat) return false;
  const idx = cat.products.findIndex((p) => p.id === prodId);
  if (idx === -1) return false;
  cat.products.splice(idx, 1);
  saveConfig();
  return true;
}

function addStock(catId, prodId, items) {
  const product = getProduct(catId, prodId);
  if (!product) return null;
  product.stock.push(...items);
  saveConfig();
  return product;
}

function popStock(catId, prodId) {
  const product = getProduct(catId, prodId);
  if (!product || product.stock.length === 0) return null;
  const item = product.stock.shift();
  saveConfig();
  return item;
}

// ---------- Pedidos ----------
function createOrder({ buyerId, catId, prodId, price, productName }) {
  const order = {
    id: genId(),
    buyerId,
    catId,
    prodId,
    productName,
    price,
    status: 'aguardando_pagamento', // aguardando_pagamento -> em_analise -> aprovado/recusado
    createdAt: Date.now()
  };
  ordersData.orders.push(order);
  saveOrders();
  return order;
}

function getOrder(orderId) {
  return ordersData.orders.find((o) => o.id === orderId);
}

function updateOrder(orderId, patch) {
  const order = getOrder(orderId);
  if (!order) return null;
  Object.assign(order, patch);
  saveOrders();
  return order;
}

// ---------- Estatísticas de vendas ----------
function getStats() {
  const approved = ordersData.orders.filter((o) => o.status === 'aprovado');
  const totalVendas = approved.length;
  const totalArrecadado = approved.reduce((acc, o) => acc + Number(o.price || 0), 0);
  const totalProdutos = config.categories.reduce((acc, c) => acc + c.products.length, 0);
  const totalEstoque = config.categories.reduce(
    (acc, c) => acc + c.products.reduce((a, p) => a + p.stock.length, 0),
    0
  );

  const porProduto = {};
  for (const o of approved) {
    porProduto[o.productName] = (porProduto[o.productName] || 0) + 1;
  }
  const maisVendidos = Object.entries(porProduto)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nome, qtd]) => ({ nome, qtd }));

  return {
    totalVendas,
    totalArrecadado,
    totalCategorias: config.categories.length,
    totalProdutos,
    totalEstoque,
    maisVendidos
  };
}

module.exports = {
  getConfig,
  getStats,
  updateConfig,
  saveConfig,
  listCategories,
  getCategory,
  createCategory,
  editCategory,
  deleteCategory,
  getProduct,
  createProduct,
  editProduct,
  deleteProduct,
  addStock,
  popStock,
  createOrder,
  getOrder,
  updateOrder,
  genId
};
