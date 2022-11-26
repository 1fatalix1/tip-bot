const { SlashCommandBuilder } = require('discord.js');
const { CreateCustomEmbed } = require('../helpers/helpers.js');
const { Op } = require('sequelize');
const algosdk = require("algosdk");
require('dotenv').config();

const {
	INDEXER_TOKEN_TESTNET, INDEXER_PORT_TESTNET, INDEXER_ENDPOINT_TESTNET,
	INDEXER_TOKEN_MAINNET, INDEXER_PORT_MAINNET, INDEXER_ENDPOINT_MAINNET,
} = require('../config.json');

let algoIndexer = null;

function setAlgoIndexer(network) {
	if (network === 'testnet') {
		algoIndexer = new algosdk.Indexer(
			INDEXER_TOKEN_TESTNET,
			INDEXER_ENDPOINT_TESTNET,
			INDEXER_PORT_TESTNET
		);
	}
	if (network === 'mainnet') {
		algoIndexer = new algosdk.Indexer(
			INDEXER_TOKEN_MAINNET,
			INDEXER_ENDPOINT_MAINNET,
			INDEXER_PORT_MAINNET
		);
	}
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('register')
		.setDescription('Registers user\'s wallet.')
		.addStringOption(option =>
			option.setName('wallet-address')
				.setDescription('Your wallet address.')
				.setRequired(true)),
	async ExecuteRegister(interaction, UsersConfig) {
		let indexerError = undefined;
		setAlgoIndexer(process.env.NETWORK_TO_USE);
		const walletAddress = interaction.options.getString('wallet-address');
		const wallet = await algoIndexer.lookupAccountByID(walletAddress).do().catch((reason) => {
			console.log(`LookupAccountByID - Error code: ${reason?.status}, Error message: ${reason?.response?.body?.message}`);
			indexerError = reason.status;
		});
		if (!wallet) {
			if (indexerError = 404) {
				const embed = await CreateCustomEmbed(`Error:`, `> Invalid wallet address.`, `register`);
				await interaction.followUp({ embeds: [embed], ephemeral: true });
				return;
			} else {
				const embed = await CreateCustomEmbed(`Error:`, `> Indexer error.`, `register`);
				await interaction.followUp({ embeds: [embed], ephemeral: true });
				return;
			}
		} else {
			const usersConfig = await UsersConfig.findAll({ where: { walletAddress: walletAddress, userId: { [Op.ne]: interaction.user.id } } });
			if (usersConfig.length > 0) {
				const embed = await CreateCustomEmbed(`Error:`, `> Wallet Address: ${walletAddress.slice(0, 5)}...${walletAddress.slice(walletAddress.length - 5)} already belongs to another account.`, `register`);
				await interaction.followUp({ embeds: [embed], ephemeral: true });
				return;
			} else {
				const usersConfig = await UsersConfig.findOne({ where: { userId: interaction.user.id } });
				if (usersConfig) {
					const userNameCurrent = usersConfig.userName;
					const walletAddressCurrent = usersConfig.walletAddress;
					if (usersConfig.walletAddress !== walletAddress) {
						let flagResult = await algoIndexer.lookupAccountTransactions(walletAddress).assetID(process.env.TIP_OPT_IN_ASSET_ID).txType('axfer').do().catch((reason) => {
							console.log(`LookupAccountTransactions - Error code: ${reason?.status}, Error message: ${reason?.response?.body?.message}`);
							indexerError = reason.status;
						});
						if (!flagResult || indexerError) {
							const embed = await CreateCustomEmbed(`Error:`, `> Indexer error.`, `register`);
							await interaction.followUp({ embeds: [embed], ephemeral: true });
							return;
						}
						if (flagResult.transactions.length === 0) {
							const reply =
								`> Wallet Address: ${walletAddress.slice(0, 5)}...${walletAddress.slice(walletAddress.length - 5)}\n> **ASA ${process.env.TIP_OPT_IN_ASSET_ID}** not opted-in!\n` +
								`> **ONCE OPT-IN IS COMPLETED RUN \`/register {WALLETADDRESS}\` COMMAND WITHIN 3 MINUTES TO COMPLETE REGISTRATION PROCESS**`;
							const embed = await CreateCustomEmbed(`Error:`, reply, `register`);
							await interaction.followUp({ embeds: [embed], ephemeral: true });
							return;
						}
						let transactionTime = flagResult.transactions
							.filter(x => x.sender === x['asset-transfer-transaction'].receiver && x['asset-transfer-transaction'].amount === 0)
							.sort((one, two) => (one['round-time'] > two['round-time'] ? -1 : 1))[0]['round-time'];
						let currentTime = Math.round(new Date().getTime() / 1000);
						let timeDifference = (currentTime - transactionTime);

						if (timeDifference > 180) {
							reply =
								`> Wallet Address: ${walletAddress.slice(0, 5)}...${walletAddress.slice(walletAddress.length - 5)}\n> **ASA ${process.env.TIP_OPT_IN_ASSET_ID}** not opted-in **within 3 minutes!** Please opt-in again.\n` +
								`> **ONCE OPT-IN IS COMPLETED RUN \`/register {WALLETADDRESS}\` COMMAND WITHIN 3 MINUTES TO COMPLETE REGISTRATION PROCESS**`;
							const embed = await CreateCustomEmbed(`Error:`, reply, `register`);
							await interaction.followUp({ embeds: [embed], ephemeral: true });
							return;
						}
						await UsersConfig.update({ userName: userNameCurrent, walletAddress: walletAddress }, { where: { userId: interaction.user.id } });
						const embed = await CreateCustomEmbed(`Result:`, `> Configuration Updated.\n> Wallet Address: ${walletAddress.slice(0, 5)}...${walletAddress.slice(walletAddress.length - 5)}.`, `register`);
						await interaction.followUp({ embeds: [embed], ephemeral: true });
						return;
					} else {
						const embed = await CreateCustomEmbed(`Result:`, `> Configuration Unchanged.\n> Wallet Address: ${walletAddressCurrent.slice(0, 5)}...${walletAddressCurrent.slice(walletAddressCurrent.length - 5)}.`, `register`);
						await interaction.followUp({ embeds: [embed], ephemeral: true });
						return;
					}
				} else {
					let flagResult = await algoIndexer.lookupAccountTransactions(walletAddress).assetID(process.env.TIP_OPT_IN_ASSET_ID).txType('axfer').do().catch((reason) => {
						console.log(`LookupAccountTransactions - Error code: ${reason?.status}, Error message: ${reason?.response?.body?.message}`);
						indexerError = reason.status;
					});
					if (!flagResult || indexerError) {
						const embed = await CreateCustomEmbed(`Error:`, `> Indexer error.`, `register`)
						await interaction.followUp({ embeds: [embed], ephemeral: true });
						return;
					}
					if (flagResult.transactions.length === 0) {
						const reply =
							`> Wallet Address: ${walletAddress.slice(0, 5)}...${walletAddress.slice(walletAddress.length - 5)}\n> **ASA ${process.env.TIP_OPT_IN_ASSET_ID}** not opted-in!\n` +
							`> **ONCE OPT-IN IS COMPLETED RUN \`/register {WALLETADDRESS}\` COMMAND WITHIN 3 MINUTES TO COMPLETE REGISTRATION PROCESS**`;
						const embed = await CreateCustomEmbed(`Error:`, reply, `register`);
						await interaction.followUp({ embeds: [embed], ephemeral: true });
						return;
					}
					let transactionTime = flagResult.transactions
						.filter(x => x.sender === x['asset-transfer-transaction'].receiver && x['asset-transfer-transaction'].amount === 0)
						.sort((one, two) => (one['round-time'] > two['round-time'] ? -1 : 1))[0]['round-time'];
					let currentTime = Math.round(new Date().getTime() / 1000);
					let timeDifference = (currentTime - transactionTime);

					if (timeDifference > 180) {
						reply =
							`> Wallet Address: ${walletAddress.slice(0, 5)}...${walletAddress.slice(walletAddress.length - 5)}\n> **ASA ${process.env.TIP_OPT_IN_ASSET_ID}** not opted-in **within 3 minutes!** Please opt-in again.\n` +
							`> **ONCE OPT-IN IS COMPLETED RUN \`/register {WALLETADDRESS}\` COMMAND WITHIN 3 MINUTES TO COMPLETE REGISTRATION PROCESS**`;
						const embed = await CreateCustomEmbed(`Error:`, reply, `register`);
						await interaction.followUp({ embeds: [embed], ephemeral: true });
						return;
					}
					await UsersConfig.create({
						userId: interaction.user.id,
						userName: interaction.user.username,
						walletAddress: walletAddress,
					});
					const embed = await CreateCustomEmbed(`Result:`, `> Configuration Created.\n> Wallet Address: ${walletAddress.slice(0, 5)}...${walletAddress.slice(walletAddress.length - 5)}.`, `register`);
					await interaction.followUp({ embeds: [embed], ephemeral: true });
					return;
				}
			}
		}
	}
};