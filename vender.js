const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const { shopPanelEmbed } = require('./embeds');
const { getConfig } = require('./store');

function isAdmin(member) {
  const cfg = getConfig();
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  if (cfg.adminRoleId && member.roles.cache.has(cfg.adminRoleId)) return true;
  return false;
}

module.exports = {
  name: 'vender',
  async execute(message) {
    if (!isAdmin(message.member)) {
      return message.reply('❌ Você não tem permissão para usar esse comando.');
    }

    const embed = shopPanelEmbed();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('shop_open').setLabel('🛒 Comprar').setStyle(ButtonStyle.Success)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    if (message.deletable) message.delete().catch(() => {});
  },
  isAdmin
};
