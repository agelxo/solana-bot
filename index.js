cat > /mnt/user-data/outputs/solana-bot/index.js << 'EOF'
require('dotenv').config();

const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const TOKEN      = process.env.DISCORD_TOKEN;
const CLIENT_ID  = process.env.CLIENT_ID;
const WALLET     = '4eGrUqAks9QorH1qN6DTcDucebBrVyuJuires4pEP51X';
const AMOUNT_SOL = 1.0;
const NETWORK    = 'Solana Mainnet';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('pay')
      .setDescription('Generate a Solana payment request')
      .addNumberOption(opt =>
        opt.setName('amount')
          .setDescription('Amount in SOL (max: 1000)')
          .setMinValue(0.000001)
          .setMaxValue(1000)
          .setRequired(false)
      )
      .toJSON()
  ];
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ /pay registered.');
  } catch (err) {
    console.error(err);
  }
}

async function getSolPrice() {
  try {
    const res  = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const data = await res.json();
    return data.solana?.usd ?? null;
  } catch { return null; }
}

client.once('ready', () => console.log(`✅ Logged in as ${client.user.tag}`));

client.on('interactionCreate', async (interaction) => {

  // /pay command
  if (interaction.isChatInputCommand() && interaction.commandName === 'pay') {
    await interaction.deferReply();

    const amount   = interaction.options.getNumber('amount') ?? AMOUNT_SOL;
    const solPrice = await getSolPrice();
    const usd      = solPrice
      ? `$${(amount * solPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
      : 'USD unavailable';

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({ name: 'FINAL WATCH SOLANA BOT', iconURL: 'https://cryptologos.cc/logos/solana-sol-logo.png' })
      .setTitle('━━━━━━━━━━━━━━━━━━━━━━')
      .setDescription(
        `> 📋 **Wallet Address**\n` +
        `> \`\`\`${WALLET}\`\`\`\n` +
        `> *Click to copy the address above*`
      )
      .addFields(
        {
          name: '◈ AMOUNT',
          value: `\`\`\`${amount} SOL ≈ ${usd}\`\`\``,
          inline: false
        },
        {
          name: '◈ NETWORK',
          value: `\`\`\`${NETWORK}\`\`\``,
          inline: true
        },
        {
          name: '◈ SPEED',
          value: '```< 5 seconds```',
          inline: true
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '**1.** Open Phantom or any Solana wallet\n' +
            '**2.** Copy the wallet address above\n' +
            `**3.** Send **${amount} SOL** on Solana Mainnet\n` +
            '**4.** Done — confirms in seconds',
          inline: false
        }
      )
      .setFooter({ text: '⚠️ Final Watch • Transactions are irreversible' })
      .setTimestamp();

    const copyBtn = new ButtonBuilder()
      .setLabel('📋 Copy Wallet Address')
      .setStyle(ButtonStyle.Secondary)
      .setCustomId('copy_wallet');

    const row = new ActionRowBuilder().addComponents(copyBtn);

    await interaction.editReply({ embeds: [embed], components: [row] });
    return;
  }

  // Copy wallet button
  if (interaction.isButton() && interaction.customId === 'copy_wallet') {
    await interaction.reply({
      content: `\`\`\`${WALLET}\`\`\`\nWallet address — tap and hold to copy!`,
      ephemeral: true
    });
  }
});

(async () => {
  await registerCommands();
  await client.login(TOKEN);
})();
EOF
