require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events
} = require('discord.js');

// ─── CONFIG ───────────────────────────────────────────────
const TOKEN      = process.env.DISCORD_TOKEN;
const CLIENT_ID  = process.env.CLIENT_ID;
const WALLET     = '4eGrUqAks9QorH1qN6DTcDucebBrVyuJuires4pEP51X';
const AMOUNT_SOL = 1.0;
const NETWORK    = 'Solana Mainnet';
// ──────────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ─── Register slash commands ───────────────────────────────
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
      .toJSON(),
    new SlashCommandBuilder()
      .setName('panel')
      .setDescription('Post the ticket panel with a button')
      .toJSON()
  ];

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log('Registering commands...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Commands registered.');
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

// ─── !panel message command (legacy) ──────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.content === '!panel') {
    const button = new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel('🎫 Create Ticket')
      .setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(button);
    await message.channel.send({
      content: '**Support Tickets**\nClick the button below to open a private ticket!',
      components: [row]
    });
  }
});

// ─── Interactions ──────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {

  // ── /pay slash command ──
  if (interaction.isChatInputCommand() && interaction.commandName === 'pay') {
    await interaction.deferReply();
    const amount   = interaction.options.getNumber('amount') ?? AMOUNT_SOL;
    const solPrice = await getSolPrice();
    const usdValue = solPrice
      ? `≈ $${(amount * solPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
      : '';

    const embed = new EmbedBuilder()
      .setColor(0x9945FF)
      .setTitle('◎  Solana Payment Request')
      .setDescription('Send the exact amount below to the wallet address.')
      .addFields(
        { name: '💰 Amount', value: `\`\`\`${amount} SOL${usdValue ? `  (${usdValue})` : ''}\`\`\``, inline: false },
        { name: '📬 Wallet Address', value: `\`\`\`${WALLET}\`\`\``, inline: false },
        { name: '🌐 Network', value: NETWORK, inline: true },
        { name: '⚡ Avg. Confirmation', value: '< 5 seconds', inline: true }
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
    return;
  }

  // ── /panel slash command ──
  if (interaction.isChatInputCommand() && interaction.commandName === 'panel') {
    const button = new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel('🎫 Create Ticket')
      .setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(button);
    await interaction.reply({
      content: '**Support Tickets**\nClick the button below to open a private ticket!',
      components: [row]
    });
    return;
  }

  // ── Ticket button ──
  if (interaction.isButton() && interaction.customId === 'create_ticket') {
    // Check if user already has an open ticket
    const existing = interaction.guild.channels.cache.find(
      c => c.name === `ticket-${interaction.user.username.toLowerCase()}`
    );
    if (existing) {
      await interaction.reply({
        content: `You already have an open ticket: ${existing}`,
        ephemeral: true
      });
      return;
    }

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username.toLowerCase()}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
      ],
    });

    // Close ticket button
    const closeBtn = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('🔒 Close Ticket')
      .setStyle(ButtonStyle.Danger);
    const closeRow = new ActionRowBuilder().addComponents(closeBtn);

    await channel.send({
      content: `Hey ${interaction.user}, your ticket is open! Describe your issue and staff will be with you shortly.`,
      components: [closeRow]
    });

    await interaction.reply({
      content: `Your ticket was created: ${channel}`,
      ephemeral: true
    });
    return;
  }

  // ── Close ticket button ──
  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    await interaction.reply({ content: '🔒 Closing ticket in 5 seconds...', ephemeral: false });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }
});

// ─── Start ────────────────────────────────────────────────
(async () => {
  await registerCommands();
  await client.login(TOKEN);
})();
