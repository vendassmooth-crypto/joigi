const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelType,
  EmbedBuilder
} = require('discord.js');
const store = require('./store');
const { isAdmin } = require('./vender');
const { buildPanelEmbed, buildPanelRows } = require('./painel');

function notAdminReply(interaction) {
  return interaction.reply({ content: '❌ Você não tem permissão para usar isso.', ephemeral: true });
}

async function handle(interaction) {
  const id = interaction.customId;

  // Todas as interações do painel exigem admin
  if (!interaction.member || !isAdmin(interaction.member)) {
    if (id.startsWith('panel_')) return notAdminReply(interaction);
  }

  // ---------- BOTÕES PRINCIPAIS ----------
  if (id === 'panel_refresh') {
    await interaction.update({ embeds: [buildPanelEmbed()], components: buildPanelRows() });
    return;
  }

  if (id === 'panel_pix') {
    const cfg = store.getConfig();
    const modal = new ModalBuilder().setCustomId('panel_pix_modal').setTitle('Configurar chave Pix');

    const keyInput = new TextInputBuilder()
      .setCustomId('pix_key')
      .setLabel('Chave Pix (cpf, email, telefone ou aleatória)')
      .setStyle(TextInputStyle.Short)
      .setValue(cfg.pix.key || '')
      .setRequired(true);

    const nameInput = new TextInputBuilder()
      .setCustomId('pix_name')
      .setLabel('Nome do recebedor (máx 25 caracteres)')
      .setStyle(TextInputStyle.Short)
      .setValue(cfg.pix.merchantName || '')
      .setMaxLength(25)
      .setRequired(true);

    const cityInput = new TextInputBuilder()
      .setCustomId('pix_city')
      .setLabel('Cidade do recebedor (máx 15 caracteres)')
      .setStyle(TextInputStyle.Short)
      .setValue(cfg.pix.merchantCity || '')
      .setMaxLength(15)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(keyInput),
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(cityInput)
    );
    return interaction.showModal(modal);
  }

  if (id === 'panel_customize') {
    const cfg = store.getConfig();
    const modal = new ModalBuilder().setCustomId('panel_customize_modal').setTitle('Personalizar painel de vendas');

    const titleInput = new TextInputBuilder()
      .setCustomId('c_title')
      .setLabel('Título do painel')
      .setStyle(TextInputStyle.Short)
      .setValue(cfg.panel.title)
      .setRequired(true);

    const descInput = new TextInputBuilder()
      .setCustomId('c_desc')
      .setLabel('Descrição do painel')
      .setStyle(TextInputStyle.Paragraph)
      .setValue(cfg.panel.description)
      .setRequired(true);

    const colorInput = new TextInputBuilder()
      .setCustomId('c_color')
      .setLabel('Cor do embed (hex, ex: #00B0F4)')
      .setStyle(TextInputStyle.Short)
      .setValue(cfg.embedColor)
      .setRequired(false);

    const imageInput = new TextInputBuilder()
      .setCustomId('c_image')
      .setLabel('URL da imagem grande (opcional)')
      .setStyle(TextInputStyle.Short)
      .setValue(cfg.panel.image || '')
      .setRequired(false);

    const thumbInput = new TextInputBuilder()
      .setCustomId('c_thumb')
      .setLabel('URL da thumbnail (opcional)')
      .setStyle(TextInputStyle.Short)
      .setValue(cfg.panel.thumbnail || '')
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descInput),
      new ActionRowBuilder().addComponents(colorInput),
      new ActionRowBuilder().addComponents(imageInput),
      new ActionRowBuilder().addComponents(thumbInput)
    );
    return interaction.showModal(modal);
  }

  if (id === 'panel_channels') {
    const row = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('panel_channel_select')
        .setPlaceholder('Selecione o canal de logs de pedidos')
        .addChannelTypes(ChannelType.GuildText)
    );
    return interaction.reply({ content: 'Selecione o canal onde os pedidos e aprovações serão enviados:', components: [row], ephemeral: true });
  }

  if (id === 'panel_adminrole') {
    const row = new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder().setCustomId('panel_role_select').setPlaceholder('Selecione o cargo administrador da loja')
    );
    return interaction.reply({ content: 'Selecione o cargo que poderá gerenciar a loja (além de Administradores):', components: [row], ephemeral: true });
  }

  // ---------- CATEGORIAS ----------
  if (id === 'panel_categories') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('panel_cat_create').setLabel('Criar categoria').setEmoji('➕').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('panel_cat_edit').setLabel('Editar categoria').setEmoji('✏️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('panel_cat_delete').setLabel('Excluir categoria').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
    );
    return interaction.reply({ content: '📁 Gerenciamento de categorias:', components: [row], ephemeral: true });
  }

  if (id === 'panel_cat_create') {
    const modal = new ModalBuilder().setCustomId('panel_cat_create_modal').setTitle('Criar nova categoria');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('cat_name').setLabel('Nome da categoria').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('cat_emoji').setLabel('Emoji (ex: 🎮)').setStyle(TextInputStyle.Short).setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('cat_desc').setLabel('Descrição').setStyle(TextInputStyle.Paragraph).setRequired(false)
      )
    );
    return interaction.showModal(modal);
  }

  if (id === 'panel_cat_edit' || id === 'panel_cat_delete') {
    const cats = store.listCategories();
    if (cats.length === 0) {
      return interaction.reply({ content: '⚠️ Não há categorias cadastradas ainda.', ephemeral: true });
    }
    const action = id === 'panel_cat_edit' ? 'panel_cat_pickedit' : 'panel_cat_pickdelete';
    const menu = new StringSelectMenuBuilder()
      .setCustomId(action)
      .setPlaceholder('Selecione a categoria')
      .addOptions(cats.slice(0, 25).map((c) => ({ label: c.name, value: c.id, emoji: c.emoji, description: `${c.products.length} produto(s)` })));
    return interaction.reply({ content: 'Selecione a categoria:', components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
  }

  if (id === 'panel_cat_pickedit') {
    const catId = interaction.values[0];
    const cat = store.getCategory(catId);
    if (!cat) return interaction.update({ content: '❌ Categoria não encontrada.', components: [] });

    const modal = new ModalBuilder().setCustomId(`panel_cat_edit_modal:${catId}`).setTitle('Editar categoria');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('cat_name').setLabel('Nome da categoria').setStyle(TextInputStyle.Short).setValue(cat.name).setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('cat_emoji').setLabel('Emoji').setStyle(TextInputStyle.Short).setValue(cat.emoji).setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('cat_desc').setLabel('Descrição').setStyle(TextInputStyle.Paragraph).setValue(cat.description).setRequired(false)
      )
    );
    return interaction.showModal(modal);
  }

  if (id === 'panel_cat_pickdelete') {
    const catId = interaction.values[0];
    const cat = store.getCategory(catId);
    if (!cat) return interaction.update({ content: '❌ Categoria não encontrada.', components: [] });
    store.deleteCategory(catId);
    return interaction.update({ content: `🗑️ Categoria **${cat.name}** excluída com sucesso (junto com seus produtos).`, components: [] });
  }

  // ---------- PRODUTOS ----------
  if (id === 'panel_products') {
    const cats = store.listCategories();
    if (cats.length === 0) {
      return interaction.reply({ content: '⚠️ Crie uma categoria antes de adicionar produtos.', ephemeral: true });
    }
    const menu = new StringSelectMenuBuilder()
      .setCustomId('panel_prod_pickcat')
      .setPlaceholder('Selecione a categoria')
      .addOptions(cats.slice(0, 25).map((c) => ({ label: c.name, value: c.id, emoji: c.emoji })));
    return interaction.reply({ content: '📦 Selecione a categoria para gerenciar os produtos:', components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
  }

  if (id === 'panel_prod_pickcat') {
    const catId = interaction.values[0];
    const cat = store.getCategory(catId);
    if (!cat) return interaction.update({ content: '❌ Categoria não encontrada.', components: [] });

    const embed = new EmbedBuilder()
      .setTitle(`📦 Produtos — ${cat.emoji} ${cat.name}`)
      .setDescription(
        cat.products.length
          ? cat.products.map((p) => `**${p.name}** — R$ ${p.price.toFixed(2)} • estoque: ${p.stock.length}`).join('\n')
          : 'Nenhum produto cadastrado.'
      )
      .setColor(store.getConfig().embedColor);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`prod_add:${catId}`).setLabel('Adicionar').setEmoji('➕').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`prod_edit:${catId}`).setLabel('Editar').setEmoji('✏️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`prod_stock:${catId}`).setLabel('Add. Estoque').setEmoji('📥').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`prod_del:${catId}`).setLabel('Excluir').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
    );
    return interaction.update({ content: null, embeds: [embed], components: [row] });
  }

  if (id.startsWith('prod_add:')) {
    const catId = id.split(':')[1];
    const modal = new ModalBuilder().setCustomId(`panel_prod_add_modal:${catId}`).setTitle('Adicionar produto');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('p_name').setLabel('Nome do produto').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('p_price').setLabel('Preço (ex: 10.50)').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('p_desc').setLabel('Descrição').setStyle(TextInputStyle.Paragraph).setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('p_stock')
          .setLabel('Estoque inicial (1 item por linha, opcional)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
      )
    );
    return interaction.showModal(modal);
  }

  if (id.startsWith('prod_edit:') || id.startsWith('prod_del:') || id.startsWith('prod_stock:')) {
    const [action, catId] = id.split(':');
    const cat = store.getCategory(catId);
    if (!cat || cat.products.length === 0) {
      return interaction.reply({ content: '⚠️ Não há produtos nessa categoria.', ephemeral: true });
    }
    const nextStep = { prod_edit: 'panel_prod_pickedit', prod_del: 'panel_prod_pickdelete', prod_stock: 'panel_prod_pickstock' }[action];
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`${nextStep}:${catId}`)
      .setPlaceholder('Selecione o produto')
      .addOptions(cat.products.slice(0, 25).map((p) => ({ label: p.name, value: p.id, description: `R$ ${p.price.toFixed(2)} • estoque: ${p.stock.length}` })));
    return interaction.reply({ content: 'Selecione o produto:', components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
  }

  if (id.startsWith('panel_prod_pickedit:')) {
    const catId = id.split(':')[1];
    const prodId = interaction.values[0];
    const product = store.getProduct(catId, prodId);
    if (!product) return interaction.update({ content: '❌ Produto não encontrado.', components: [] });

    const modal = new ModalBuilder().setCustomId(`panel_prod_edit_modal:${catId}:${prodId}`).setTitle('Editar produto');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('p_name').setLabel('Nome').setStyle(TextInputStyle.Short).setValue(product.name).setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('p_price').setLabel('Preço').setStyle(TextInputStyle.Short).setValue(String(product.price)).setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('p_desc').setLabel('Descrição').setStyle(TextInputStyle.Paragraph).setValue(product.description).setRequired(false)
      )
    );
    return interaction.showModal(modal);
  }

  if (id.startsWith('panel_prod_pickdelete:')) {
    const catId = id.split(':')[1];
    const prodId = interaction.values[0];
    const product = store.getProduct(catId, prodId);
    if (!product) return interaction.update({ content: '❌ Produto não encontrado.', components: [] });
    store.deleteProduct(catId, prodId);
    return interaction.update({ content: `🗑️ Produto **${product.name}** excluído com sucesso.`, components: [] });
  }

  if (id.startsWith('panel_prod_pickstock:')) {
    const catId = id.split(':')[1];
    const prodId = interaction.values[0];
    const product = store.getProduct(catId, prodId);
    if (!product) return interaction.update({ content: '❌ Produto não encontrado.', components: [] });

    const modal = new ModalBuilder().setCustomId(`panel_prod_stock_modal:${catId}:${prodId}`).setTitle(`Adicionar estoque — ${product.name}`);
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('stock_items')
          .setLabel('1 item por linha (conta, chave, código, etc.)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );
    return interaction.showModal(modal);
  }
}

// ---------- SUBMIT DE MODAIS ----------
async function handleModal(interaction) {
  const id = interaction.customId;

  if (!isAdmin(interaction.member)) return notAdminReply(interaction);

  if (id === 'panel_pix_modal') {
    const key = interaction.fields.getTextInputValue('pix_key').trim();
    const name = interaction.fields.getTextInputValue('pix_name').trim();
    const city = interaction.fields.getTextInputValue('pix_city').trim();
    store.updateConfig((cfg) => {
      cfg.pix.key = key;
      cfg.pix.merchantName = name;
      cfg.pix.merchantCity = city;
    });
    return interaction.reply({ content: '✅ Chave Pix atualizada com sucesso!', ephemeral: true });
  }

  if (id === 'panel_customize_modal') {
    const title = interaction.fields.getTextInputValue('c_title');
    const desc = interaction.fields.getTextInputValue('c_desc');
    const color = interaction.fields.getTextInputValue('c_color');
    const image = interaction.fields.getTextInputValue('c_image');
    const thumb = interaction.fields.getTextInputValue('c_thumb');

    store.updateConfig((cfg) => {
      cfg.panel.title = title;
      cfg.panel.description = desc;
      if (color) cfg.embedColor = color;
      cfg.panel.image = image || '';
      cfg.panel.thumbnail = thumb || '';
    });
    return interaction.reply({ content: '✅ Painel personalizado com sucesso! Use `!vender` novamente para atualizar um painel já postado.', ephemeral: true });
  }

  if (id === 'panel_cat_create_modal') {
    const name = interaction.fields.getTextInputValue('cat_name');
    const emoji = interaction.fields.getTextInputValue('cat_emoji');
    const desc = interaction.fields.getTextInputValue('cat_desc');
    const cat = store.createCategory({ name, emoji, description: desc });
    return interaction.reply({ content: `✅ Categoria **${cat.emoji} ${cat.name}** criada com sucesso!`, ephemeral: true });
  }

  if (id.startsWith('panel_cat_edit_modal:')) {
    const catId = id.split(':')[1];
    const name = interaction.fields.getTextInputValue('cat_name');
    const emoji = interaction.fields.getTextInputValue('cat_emoji');
    const desc = interaction.fields.getTextInputValue('cat_desc');
    const cat = store.editCategory(catId, { name, emoji, description: desc });
    if (!cat) return interaction.reply({ content: '❌ Categoria não encontrada.', ephemeral: true });
    return interaction.reply({ content: `✅ Categoria atualizada para **${cat.emoji} ${cat.name}**.`, ephemeral: true });
  }

  if (id.startsWith('panel_prod_add_modal:')) {
    const catId = id.split(':')[1];
    const name = interaction.fields.getTextInputValue('p_name');
    const priceRaw = interaction.fields.getTextInputValue('p_price').replace(',', '.');
    const desc = interaction.fields.getTextInputValue('p_desc');
    const stockRaw = interaction.fields.getTextInputValue('p_stock');

    const price = Number(priceRaw);
    if (isNaN(price) || price <= 0) {
      return interaction.reply({ content: '❌ Preço inválido. Use apenas números, ex: `10.50`.', ephemeral: true });
    }
    const stock = stockRaw ? stockRaw.split('\n').map((s) => s.trim()).filter(Boolean) : [];
    const product = store.createProduct(catId, { name, price, description: desc, stock });
    if (!product) return interaction.reply({ content: '❌ Categoria não encontrada.', ephemeral: true });
    return interaction.reply({ content: `✅ Produto **${product.name}** adicionado com ${stock.length} item(ns) em estoque!`, ephemeral: true });
  }

  if (id.startsWith('panel_prod_edit_modal:')) {
    const [, catId, prodId] = id.split(':');
    const name = interaction.fields.getTextInputValue('p_name');
    const priceRaw = interaction.fields.getTextInputValue('p_price').replace(',', '.');
    const desc = interaction.fields.getTextInputValue('p_desc');
    const product = store.editProduct(catId, prodId, { name, price: priceRaw, description: desc });
    if (!product) return interaction.reply({ content: '❌ Produto não encontrado.', ephemeral: true });
    return interaction.reply({ content: `✅ Produto atualizado para **${product.name}**.`, ephemeral: true });
  }

  if (id.startsWith('panel_prod_stock_modal:')) {
    const [, catId, prodId] = id.split(':');
    const raw = interaction.fields.getTextInputValue('stock_items');
    const items = raw.split('\n').map((s) => s.trim()).filter(Boolean);
    const product = store.addStock(catId, prodId, items);
    if (!product) return interaction.reply({ content: '❌ Produto não encontrado.', ephemeral: true });
    return interaction.reply({ content: `✅ ${items.length} item(ns) adicionados ao estoque de **${product.name}**. Estoque atual: ${product.stock.length}.`, ephemeral: true });
  }
}

// ---------- SELECT MENUS NATIVOS (canal / cargo) ----------
async function handleSelect(interaction) {
  const id = interaction.customId;
  if (!isAdmin(interaction.member)) return notAdminReply(interaction);

  if (id === 'panel_channel_select') {
    const channelId = interaction.values[0];
    store.updateConfig((cfg) => {
      cfg.logChannelId = channelId;
    });
    return interaction.update({ content: `✅ Canal de logs definido para <#${channelId}>.`, components: [] });
  }

  if (id === 'panel_role_select') {
    const roleId = interaction.values[0];
    store.updateConfig((cfg) => {
      cfg.adminRoleId = roleId;
    });
    return interaction.update({ content: `✅ Cargo administrador da loja definido para <@&${roleId}>.`, components: [] });
  }
}

module.exports = { handle, handleModal, handleSelect };
