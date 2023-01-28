const { SlashCommandBuilder } = require('discord.js');
const { CreateCustomEmbed } = require('../helpers/helpers.js');
const algosdk = require("algosdk");
require('dotenv').config();

const {
	NODE_TOKEN_TESTNET, NODE_PORT_TESTNET, NODE_ENDPOINT_TESTNET,
	NODE_TOKEN_MAINNET, NODE_PORT_MAINNET, NODE_ENDPOINT_MAINNET,
	INDEXER_TOKEN_TESTNET, INDEXER_PORT_TESTNET, INDEXER_ENDPOINT_TESTNET,
	INDEXER_TOKEN_MAINNET, INDEXER_PORT_MAINNET, INDEXER_ENDPOINT_MAINNET,
} = require('../config.json');

let algodClient = null;
let algoIndexer = null;
let tipAccountMnemonic = null;
let tipAccount = null;
let tipAsset = null;
let tipAssetMultiplier = null;

function setAlgodClient(network) {
	if (network === 'testnet') {
		algodClient = new algosdk.Algodv2(
			NODE_TOKEN_TESTNET,
			NODE_ENDPOINT_TESTNET,
			NODE_PORT_TESTNET
		);
	}
	if (network === 'mainnet') {
		algodClient = new algosdk.Algodv2(
			NODE_TOKEN_MAINNET,
			NODE_ENDPOINT_MAINNET,
			NODE_PORT_MAINNET
		);
	}
}

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

function setTipAddress(network) {
	if (network === 'testnet') {
		tipAccountMnemonic = algosdk.mnemonicToSecretKey(
			process.env.TIP_MNEMONIC_TESTNET
		);
		tipAccount = process.env.TIP_ACCOUNT_TESTNET;
		tipAsset = parseInt(process.env.TIP_ASSET_TESTNET);
		tipAssetMultiplier = parseInt(process.env.TIP_ASSET_MULTIPLIER_TESTNET);
	}
	if (network === 'mainnet') {
		tipAccountMnemonic = algosdk.mnemonicToSecretKey(
			process.env.TIP_MNEMONIC_MAINNET
		);
		tipAccount = process.env.TIP_ACCOUNT_MAINNET;
		tipAsset = parseInt(process.env.TIP_ASSET_MAINNET);
		tipAssetMultiplier = parseInt(process.env.TIP_ASSET_MULTIPLIER_MAINNET);
	}
}

async function createClawbackTransaction(amount, from, to, assetIndex, assetMultiplier, tipClawbackAccount) {
	const suggestedParams = await algodClient.getTransactionParams().do();
	const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
		amount: amount * assetMultiplier,
		from: tipClawbackAccount,
		to: to,
		assetIndex: assetIndex,
		suggestedParams: suggestedParams,
		revocationTarget: from
	});

	return txn;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tip')
		.setDescription('Tips selected user.')
		.addUserOption(option =>
			option.setName('receiver')
				.setDescription('Receiver.')
				.setRequired(true))
		.addIntegerOption(option =>
			option.setName('amount')
				.setDescription('Amount.')
				.setRequired(true)
				.setMinValue(1)),
	async ExecuteTip(interaction, UsersConfig) {
		setAlgodClient(process.env.NETWORK_TO_USE);
		setAlgoIndexer(process.env.NETWORK_TO_USE);
		setTipAddress(process.env.NETWORK_TO_USE);
		const senderUser = interaction.user;
		const receiverUser = interaction.options.getUser('receiver');
		const amount = interaction.options.getInteger('amount');
		const usersConfigSender = await UsersConfig.findOne({ where: { userId: interaction.user.id } });
		if (!usersConfigSender) {
			const embed = await CreateCustomEmbed(`Error:`, `> Sender not regeistered.\n> Please register first.`, `register`);
			await interaction.followUp({ embeds: [embed] });
			return;
		}
		const usersConfigReceiver = await UsersConfig.findOne({ where: { userId: receiverUser.id } });
		if (!usersConfigReceiver) {
			const embed = await CreateCustomEmbed(`Error:`, `> Receiver not registered.\n> Please register first.`, `register`);
			await interaction.followUp({ embeds: [embed] });
			return;
		}
		if (usersConfigSender.userId === usersConfigReceiver.userId) {
			const embed = await CreateCustomEmbed(`Error:`, `> Receiver can't be sender.`, `register`);
			await interaction.followUp({ embeds: [embed] });
			return;
		}
		let nextToken = undefined;
		let balances = [];
		let balancesRes = await algoIndexer.lookupAssetBalances(tipAsset).do();
		for (let balance of balancesRes.balances) {
			balances.push(balance);
		}
		nextToken = balancesRes['next-token'];
		while (nextToken !== undefined) {
			balancesRes = await algoIndexer.lookupAssetBalances(tipAsset).nextToken(nextToken).do();
			for (let balance of balancesRes.balances) {
				balances.push(balance);
			}
			nextToken = balancesRes['next-token'];
		}
		const senderWallet = usersConfigSender.walletAddress;
		const senderBalance = balances.find(x => x.address === senderWallet);
		if (!senderBalance || senderBalance.amount < amount * tipAssetMultiplier) {
			const embed = await CreateCustomEmbed(`Error:`, `> Sender has insufficient balance.`, `register`);
			await interaction.followUp({ embeds: [embed] });
			return;
		}
		const receiverWallet = usersConfigReceiver.walletAddress;
		const receiverBalance = balances.find(x => x.address === receiverWallet);
		if (!receiverBalance) {
			const embed = await CreateCustomEmbed(`Error:`, `> Receiver did not opt in.`, `register`);
			await interaction.followUp({ embeds: [embed] });
			return;
		}
		let createClawbackTransactionTx = await createClawbackTransaction(amount, senderWallet, receiverWallet, tipAsset, tipAssetMultiplier, tipAccount);
		let createClawbackTransactionTxSigned = createClawbackTransactionTx.signTxn(tipAccountMnemonic.sk);
		let tx = await algodClient.sendRawTransaction(createClawbackTransactionTxSigned).do();
		// Wait for transaction to be confirmed
		let confirmedTxn = await algosdk.waitForConfirmation(algodClient, tx.txId, 6);
		console.log(`## transaction success: round - ${confirmedTxn['confirmed-round']}, tx - ${tx.txId}`);
		const embed = await CreateCustomEmbed(
			`**${receiverUser.username}**. Say thanks to **${senderUser.username}** for sending a tip to you.`,
			`**${senderUser}** sent ${receiverUser} ${amount} tokens.`,
			`Tip sent`
		);
		await interaction.followUp({ embeds: [embed] });
	}
};
