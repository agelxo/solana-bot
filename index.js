require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const WALLET = '4eGrUqAks9QorH1qN6DTcDucebBrVyuJuires4pEP51X';
const NETWORK = 'Solana';
const SOL_LOGO = 'https://cryptologos.cc/logos/solana-sol-logo.png';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('pay')
      .setDescription('Create a payment request')
      .addNumberOption(opt =>
        opt.setName('amount').setDescription('Amount in SOL').setRequired(true).setMinValue(0.000001).setMaxValue(1000)
      )
      .toJSON()
  ];
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log('✅ /pay registered.');
}

client.once('ready', () => console.log(`✅ Logged in as ${client.user.tag}`));

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand() && interaction.commandName === 'pay') {
    const amount = interaction.options.getNumber('amount');
    let solPrice = null;
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await res.json();
      solPrice = data.solana.usd;
    } catch {}
    const usdValue = solPrice ? `$${(amount * solPrice).toFixed(2)}` : 'N/A';
    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({ name: 'FINAL CLUB BUNDLER BOT', iconURL: SOL_LOGO })
      .addFields(
        { name: '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬', value: '\u200b', inline: false },
        { name: '🪪 Wallet Address', value: `\`\`\`${WALLET}\`\`\`\n*Click to copy the address above*` },
        { name: '◆ AMOUNT', value: `\`\`\`${amount} SOL ≈ ${usdValue} USD\`\`\`` },
        { name: '◆ NETWORK', value: `\`\`\`${NETWORK}\`\`\``, inline: true },
        { name: '◆ SPEED', value: '```< 5 seconds```', inline: true },
        { name: '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬', value: '**1.** Open Phantom or any Solana wallet\n**2.** Copy the wallet address above\n**3.** Send **' + amount + ' SOL** on Solana\n**4.** Done — confirms in seconds' },
        { name: '💰 Your Payout Wallet', value: 'Paste your Solana wallet address below — profits will automatically hit here.' }
      )
      .setFooter({ text: 'FINAL CLUB BUNDLER BOT' });
    const copyButton = new ButtonBuilder()
      .setCustomId('copy_wallet')
      .setLabel('📋 Copy Wallet Address')
      .setStyle(ButtonStyle.Secondary);
    const pasteButton = new ButtonBuilder()
      .setCustomId('paste_wallet')
      .setLabel('💰 Enter Payout Wallet')
      .setStyle(ButtonStyle.Primary);
    await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(copyButton, pasteButton)] });
  }
  if (interaction.isButton() && interaction.customId === 'copy_wallet') {
    await interaction.reply({ content: `\`${WALLET}\``, ephemeral: true });
  }
  if (interaction.isButton() && interaction.customId === 'paste_wallet') {
    await interaction.reply({ content: '📋 Paste your Solana wallet address here and profits will automatically be sent to it.', ephemeral: true });
  }
});

(async () => {
  await registerCommands();
  await client.login(TOKEN);
})();
