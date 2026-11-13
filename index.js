require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const WALLET = '4eGrUqAks9QorH1qN6DTcDucebBrVyuJuires4pEP51X';
const NETWORK = 'Solana';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder().setName('pay').setDescription('Create a slot').toJSON()
  ];
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log('✅ /pay registered.');
}

client.once('ready', () => console.log(`✅ Logged in as ${client.user.tag}`));

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand() && interaction.commandName === 'pay') {
    let price = 'N/A';
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await res.json();
      price = '$' + data.solana.usd.toLocaleString();
    } catch {}

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({ name: 'FINAL CLUB SOLANA BOT' })
      .setTitle('💳 Payment Info')
      .addFields(
        { name: 'Network', value: NETWORK, inline: true },
        { name: 'SOL Price', value: price, inline: true },
        { name: 'Wallet Address', value: `\`${WALLET}\`` }
      )
      .setFooter({ text: 'Send exact amount to the wallet above.' });

    const button = new ButtonBuilder()
      .setCustomId('copy_wallet')
      .setLabel('📋 Copy Wallet')
      .setStyle(ButtonStyle.Secondary);

    await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] });
  }

  if (interaction.isButton() && interaction.customId === 'copy_wallet') {
    await interaction.reply({ content: `\`${WALLET}\``, ephemeral: true });
  }
});

(async () => {
  await registerCommands();
  await client.login(TOKEN);
})();
