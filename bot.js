const { Client, Events, GatewayIntentBits } = require('discord.js');

require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const { ExecuteRegister } = require('./commands/register');
const { ExecuteTip } = require('./commands/tip');

const { Sequelize, STRING } = require('sequelize');

const sequelize = new Sequelize('database', 'username', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    // SQLite only
    storage: 'database.sqlite',
});

const UsersConfig = sequelize.define('usersConfig', {
    userId: {
        type: STRING,
        unique: true,
        primaryKey: true,
    },
    userName: STRING,
    walletAddress: STRING,
});

client.once(Events.ClientReady, async c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    UsersConfig.sync();
    console.log('DB Ready!');
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    console.log(`Slash command: ${interaction.commandName} executed`);
    const commandName = interaction.commandName;

    if (!commandName == 'register' || !commandName == 'tip') {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    } else if (commandName === 'register') {
        try {
            await interaction.deferReply({ ephemeral: true });
            await ExecuteRegister(interaction, UsersConfig);
        } catch (error) {
            console.error(error);
            await interaction.channel.send({ content: 'There was an error while executing this command!' });
        }
    } else if (commandName === 'tip') {
        try {
            await interaction.deferReply();
            await ExecuteTip(interaction, UsersConfig);
        } catch (error) {
            console.error(error);
            await interaction.channel.send({ content: 'There was an error while executing this command!' });
        }
    }
});

client.login(process.env.TOKEN);