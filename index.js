require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { startKeepAlive } = require('./keepalive');

const venderCmd = require('./vender');
const painelCmd = require('./painel');
const panelInteractions = require('./panelInteractions');
const shopInteractions = require('./shopInteractions');

const PREFIX = process.env.PREFIX || '!';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();
client.commands.set(venderCmd.name, venderCmd);
client.commands.set(painelCmd.name, painelCmd);

client.once('ready', () => {
  console.log(`✅ Smooth Vendas online como ${client.user.tag}`);
  client.user.setActivity('Smooth Roblox 🛒', { type: 3 }); // Watching
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();
  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (err) {
    console.error(`Erro ao executar comando ${commandName}:`, err);
    message.reply('❌ Ocorreu um erro ao executar esse comando.').catch(() => {});
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('panel_') || interaction.customId.startsWith('prod_')) {
        return panelInteractions.handle(interaction);
      }
      if (interaction.customId.startsWith('shop_')) {
        return shopInteractions.handle(interaction);
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('shop_')) {
        return shopInteractions.handle(interaction);
      }
      // seletores do painel (categorias/produtos)
      return panelInteractions.handle(interaction);
    }

    if (interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu()) {
      return panelInteractions.handleSelect(interaction);
    }

    if (interaction.isModalSubmit()) {
      return panelInteractions.handleModal(interaction);
    }
  } catch (err) {
    console.error('Erro ao processar interação:', err);
    const payload = { content: '❌ Ocorreu um erro ao processar essa ação.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      interaction.followUp(payload).catch(() => {});
    } else {
      interaction.reply(payload).catch(() => {});
    }
  }
});

startKeepAlive();

if (!process.env.TOKEN) {
  console.error('❌ TOKEN não definido. Configure a variável de ambiente TOKEN.');
  process.exit(1);
}

client.login(process.env.TOKEN);
