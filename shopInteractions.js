const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  AttachmentBuilder
} = require('discord.js');
const store = require('./store');
const { buildPixPayload, generateQrCodeBuffer } = require('./pix');
const { categoryEmbed, orderPixEmbed } = require('./embeds');
const { isAdmin } = require('./vender');

async function handle(interaction) {
  const id = interaction.customId;

  // ----- Abrir loja: escolher categoria -----
  if (id === 'shop_open') {
    const cats = store.listCategories();
    if (cats.length === 0) {
      return interaction.reply({ content: '⚠️ A loja ainda não possui categorias cadastradas.', ephemeral: true });
    }
    const menu = new StringSelectMenuBuilder()
      .setCustomId('shop_cat_select')
      .setPlaceholder('Selecione uma categoria')
      .addOptions(cats.slice(0, 25).map((c) => ({ label: c.name, value: c.id, emoji: c.emoji || undefined, description: `${c.products.length} produto(s)` })));
    return interaction.reply({ content: '📁 Escolha uma categoria:', components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
  }

  // ----- Escolher produto dentro da categoria -----
  if (id === 'shop_cat_select') {
    const catId = interaction.values[0];
    const cat = store.getCategory(catId);
    if (!cat) return interaction.update({ content: '❌ Categoria não encontrada.', components: [] });
    if (cat.products.length === 0) {
      return interaction.update({ content: `⚠️ A categoria **${cat.name}** ainda não tem produtos.`, embeds: [], components: [] });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`shop_prod_select:${catId}`)
      .setPlaceholder('Selecione um produto')
      .addOptions(
        cat.products.slice(0, 25).map((p) => ({
          label: `${p.name} — R$ ${p.price.toFixed(2)}`,
          value: p.id,
          description: p.stock.length > 0 ? `Estoque: ${p.stock.length}` : 'Sem estoque no momento'
        }))
      );

    return interaction.update({
      content: null,
      embeds: [categoryEmbed(cat)],
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }

  // ----- Gerar pedido + QR Code Pix -----
  if (id.startsWith('shop_prod_select:')) {
    const catId = id.split(':')[1];
    const prodId = interaction.values[0];
    const product = store.getProduct(catId, prodId);
    const cfg = store.getConfig();

    if (!product) return interaction.update({ content: '❌ Produto não encontrado.', embeds: [], components: [] });
    if (!cfg.pix.key) {
      return interaction.update({ content: '⚠️ A loja ainda não configurou uma chave Pix. Avise um administrador.', embeds: [], components: [] });
    }
    if (product.stock.length === 0) {
      return interaction.update({ content: `⚠️ O produto **${product.name}** está sem estoque no momento.`, embeds: [], components: [] });
    }

    const order = store.createOrder({
      buyerId: interaction.user.id,
      catId,
      prodId,
      price: product.price,
      productName: product.name
    });

    const payload = buildPixPayload({
      key: cfg.pix.key,
      merchantName: cfg.pix.merchantName,
      merchantCity: cfg.pix.merchantCity,
      amount: product.price,
      txid: order.id,
      description: product.name
    });

    const qrBuffer = await generateQrCodeBuffer(payload);
    const attachment = new AttachmentBuilder(qrBuffer, { name: 'pix-qrcode.png' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`shop_paid:${order.id}`).setLabel('Já paguei').setEmoji('✅').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`shop_cancel:${order.id}`).setLabel('Cancelar').setEmoji('✖️').setStyle(ButtonStyle.Danger)
    );

    await interaction.update({
      content: null,
      embeds: [orderPixEmbed(order, payload)],
      files: [attachment],
      components: [row]
    });
    return;
  }

  // ----- Comprador avisa que pagou -----
  if (id.startsWith('shop_paid:')) {
    const orderId = id.split(':')[1];
    const order = store.getOrder(orderId);
    if (!order) return interaction.update({ content: '❌ Pedido não encontrado.', embeds: [], components: [] });
    if (order.buyerId !== interaction.user.id) {
      return interaction.reply({ content: '❌ Esse pedido não é seu.', ephemeral: true });
    }

    store.updateOrder(orderId, { status: 'em_analise' });

    await interaction.update({
      content: '⏳ Pagamento em análise! Nossa equipe irá confirmar e entregar seu produto em breve.',
      embeds: [],
      components: []
    });

    const cfg = store.getConfig();
    if (cfg.logChannelId) {
      const logChannel = await interaction.client.channels.fetch(cfg.logChannelId).catch(() => null);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor('#FFC107')
          .setTitle('🔔 Novo pedido aguardando aprovação')
          .addFields(
            { name: 'Comprador', value: `<@${order.buyerId}>`, inline: true },
            { name: 'Produto', value: order.productName, inline: true },
            { name: 'Valor', value: `R$ ${order.price.toFixed(2)}`, inline: true },
            { name: 'ID do pedido', value: order.id }
          )
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`shop_approve:${order.id}`).setLabel('Aprovar e entregar').setEmoji('✅').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`shop_reject:${order.id}`).setLabel('Recusar').setEmoji('❌').setStyle(ButtonStyle.Danger)
        );
        await logChannel.send({ embeds: [embed], components: [row] });
      }
    }
    return;
  }

  // ----- Comprador cancela -----
  if (id.startsWith('shop_cancel:')) {
    const orderId = id.split(':')[1];
    const order = store.getOrder(orderId);
    if (order && order.buyerId !== interaction.user.id) {
      return interaction.reply({ content: '❌ Esse pedido não é seu.', ephemeral: true });
    }
    if (order) store.updateOrder(orderId, { status: 'cancelado' });
    return interaction.update({ content: '✖️ Pedido cancelado.', embeds: [], components: [] });
  }

  // ----- Staff aprova pedido (entrega automática do estoque) -----
  if (id.startsWith('shop_approve:')) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Apenas a equipe pode aprovar pedidos.', ephemeral: true });
    }
    const orderId = id.split(':')[1];
    const order = store.getOrder(orderId);
    if (!order) return interaction.update({ content: '❌ Pedido não encontrado.', components: [] });

    const item = store.popStock(order.catId, order.prodId);
    if (!item) {
      await interaction.reply({ content: '⚠️ Sem estoque disponível para entregar. Adicione estoque e tente novamente.', ephemeral: true });
      return;
    }

    store.updateOrder(orderId, { status: 'aprovado' });

    const buyer = await interaction.client.users.fetch(order.buyerId).catch(() => null);
    if (buyer) {
      const dmEmbed = new EmbedBuilder()
        .setColor('#00C851')
        .setTitle('✅ Compra aprovada — Smooth Vendas')
        .setDescription(`Seu produto **${order.productName}** foi liberado!`)
        .addFields({ name: 'Conteúdo', value: `\`\`\`${item}\`\`\`` })
        .setFooter({ text: `Pedido #${order.id}` });
      await buyer.send({ embeds: [dmEmbed] }).catch(() => {});
    }

    await interaction.update({
      content: `✅ Pedido **#${order.id}** aprovado e entregue para <@${order.buyerId}>.`,
      embeds: [],
      components: []
    });
    return;
  }

  // ----- Staff recusa pedido -----
  if (id.startsWith('shop_reject:')) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Apenas a equipe pode recusar pedidos.', ephemeral: true });
    }
    const orderId = id.split(':')[1];
    const order = store.getOrder(orderId);
    if (!order) return interaction.update({ content: '❌ Pedido não encontrado.', components: [] });

    store.updateOrder(orderId, { status: 'recusado' });

    const buyer = await interaction.client.users.fetch(order.buyerId).catch(() => null);
    if (buyer) {
      await buyer
        .send(`❌ Seu pedido **${order.productName}** (#${order.id}) foi recusado. Entre em contato com a equipe se acredita que isso é um engano.`)
        .catch(() => {});
    }

    await interaction.update({ content: `❌ Pedido **#${order.id}** recusado.`, embeds: [], components: [] });
    return;
  }
}

module.exports = { handle };
