const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('./store');

function baseEmbed() {
  const cfg = getConfig();
  return new EmbedBuilder().setColor(cfg.embedColor || '#00B0F4');
}

function shopPanelEmbed() {
  const cfg = getConfig();
  const embed = baseEmbed()
    .setTitle(cfg.panel.title)
    .setDescription(cfg.panel.description)
    .setFooter({ text: cfg.panel.footer || 'Smooth Vendas' })
    .setTimestamp();

  if (cfg.panel.image) embed.setImage(cfg.panel.image);
  if (cfg.panel.thumbnail) embed.setThumbnail(cfg.panel.thumbnail);

  if (cfg.categories.length === 0) {
    embed.addFields({ name: '⚠️ Loja vazia', value: 'Nenhuma categoria cadastrada ainda.' });
  } else {
    const list = cfg.categories
      .map((c) => `${c.emoji} **${c.name}** — ${c.products.length} produto(s)`)
      .join('\n');
    embed.addFields({ name: 'Categorias disponíveis', value: list });
  }
  return embed;
}

function categoryEmbed(cat) {
  const cfg = getConfig();
  const embed = baseEmbed()
    .setTitle(`${cat.emoji} ${cat.name}`)
    .setDescription(cat.description || 'Sem descrição.');

  if (cat.products.length === 0) {
    embed.addFields({ name: 'Produtos', value: 'Nenhum produto cadastrado nesta categoria.' });
  } else {
    for (const p of cat.products) {
      embed.addFields({
        name: `${p.name} — ${cfg.currencySymbol} ${p.price.toFixed(2)}`,
        value: `${p.description}\nEstoque: **${p.stock.length}**`
      });
    }
  }
  return embed;
}

function orderPixEmbed(order, payload) {
  const cfg = getConfig();
  return baseEmbed()
    .setTitle('💳 Pagamento via Pix')
    .setDescription(
      `Produto: **${order.productName}**\nValor: **${cfg.currencySymbol} ${order.price.toFixed(2)}**\n\n` +
        `📷 Escaneie o QR Code acima com o app do seu banco\n` +
        `ou copie o código abaixo (Pix Copia e Cola):`
    )
    .addFields({ name: 'Pix Copia e Cola', value: `\`\`\`${payload}\`\`\`` })
    .setFooter({ text: `Pedido #${order.id} • Após pagar, clique em "Já paguei"` })
    .setImage('attachment://pix-qrcode.png');
}

module.exports = { baseEmbed, shopPanelEmbed, categoryEmbed, orderPixEmbed };
