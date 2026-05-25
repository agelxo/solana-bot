const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');

// ─── CONFIG ───────────────────────────────────────────────
const TOKEN        = process.env.DISCORD_TOKEN;   // your bot token
const CLIENT_ID    = process.env.CLIENT_ID;       // your app's client ID
const WALLET       = '4eGrUqAks9QorH1qN6DTcDucebBrVyuJuires4pEP51X';
const AMOUNT_SOL   = 1.0; // default if no amount specified
const NETWORK      = 'Solana Mainnet';
// ──────────────────────────────────────────────────────────

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ─── Register slash command ────────────────────────────────
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('pay')
      .setDescription('Get the Solana payment details')
      .addNumberOption(opt =>
        opt.setName('amount')
          .setDescription('Amount in SOL (default: 1, max: 1000)')
          .setMinValue(0.000001)
          .setMaxValue(1000)
          .setRequired(false)
      )
      .toJSON()
  ];

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    console.log('Registering /pay command...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ /pay command registered globally.');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
}

// ─── Fetch live SOL price ──────────────────────────────────
async function getSolPrice() {
  try {
    const res  = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const data = await res.json();
    return data.solana?.usd ?? null;
  } catch {
    return null;
  }
}

// ─── Bot ready ────────────────────────────────────────────
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ─── Handle /pay ──────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'pay') return;

  await interaction.deferReply();

  const amount   = interaction.options.getNumber('amount') ?? AMOUNT_SOL;
  const solPrice = await getSolPrice();
  const usdValue = solPrice ? `≈ $${(amount * solPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` : '';

  const embed = new EmbedBuilder()
    .setColor(0x9945FF)
    .setTitle('◎  Solana Payment Request')
    .setDescription('Send the exact amount below to the wallet address.')
    .addFields(
      {
        name: '💰 Amount',
        value: `\`\`\`${amount} SOL${usdValue ? `  (${usdValue})` : ''}\`\`\``,
        inline: false,
      },
      {
        name: '📬 Wallet Address',
        value: `\`\`\`${WALLET}\`\`\``,
        inline: false,
      },
      {
        name: '🌐 Network',
        value: NETWORK,
        inline: true,
      },
      {
        name: '⚡ Avg. Confirmation',
        value: '< 5 seconds',
        inline: true,
      }
    )
    .addFields({
      name: '📋 How to Pay',
      value: [
        '**1.** Open Phantom, Solflare, or any Solana wallet',
        '**2.** Copy the wallet address above',
        `**3.** Send exactly **${amount} SOL** on Solana Mainnet`,
        '**4.** Transaction confirms in seconds',
      ].join('\n'),
    })
    .setFooter({ text: '⚠️  Solana transactions are irreversible — double-check the address.' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
});

// ─── Start ────────────────────────────────────────────────
(async () => {
  await registerCommands();
  await client.login(TOKEN);
})();
