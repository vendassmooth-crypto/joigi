const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('./vender');
const { getConfig } = require('./store');

function buildPanelEmbed() {
  const cfg = getConfig();
  return new EmbedBuilder()
    .setColor(cfg.embedColor || '#00B0F4')
    .setTitle('⚙️ Painel de Configuração — Smooth Vendas')
    .setDescription(
      'Use os botões abaixo para configurar **tudo** direto pelo Discord.\n' +
        'Esse painel não expira — pode deixar fixado no canal de administração.'
    )
    .addFields(
      { name: '🔑 Pix', value: cfg.pix.key ? '`Configurada`' : '`Não configurada`', inline: true },
      { name: '📁 Categorias', value: `\`${cfg.categories.length}\``, inline: true },
      {
        name: '📦 Produtos',
        value: `\`${cfg.categories.reduce((acc, c) => acc + c.products.length, 0)}\``,
        inline: true
      },
      { name: '📋 Canal de logs', value: cfg.logChannelId ? `<#${cfg.logChannelId}>` : '`Não definido`', inline: true },
      { name: '👑 Cargo admin', value: cfg.adminRoleId ? `<@&${cfg.adminRoleId}>` : '`Somente Administrador`', inline: true }
    )
    .setFooter({ text: 'Smooth Vendas • Painel Administrativo' });
}

function buildPanelRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('panel_pix').setLabel('Configurar Pix').setEmoji('🔑').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('panel_categories').setLabel('Categorias').setEmoji('📁').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('panel_products').setLabel('Produtos').setEmoji('📦').setStyle(ButtonStyle.Primary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('panel_customize').setLabel('Personalizar Painel').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('panel_channels').setLabel('Canal de Logs').setEmoji('📋').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('panel_adminrole').setLabel('Cargo Admin').setEmoji('👑').setStyle(ButtonStyle.Secondary)
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('panel_refresh').setLabel('Atualizar Painel').setEmoji('🔄').setStyle(ButtonStyle.Success)
  );
  return [row1, row2, row3];
}

module.exports = {
  name: 'painel',
  async execute(message) {
    if (!isAdmin(message.member)) {
      return message.reply('❌ Você não tem permissão para usar esse comando.');
    }
    await message.channel.send({ embeds: [buildPanelEmbed()], components: buildPanelRows() });
    if (message.deletable) message.delete().catch(() => {});
  },
  buildPanelEmbed,
  buildPanelRows
};
