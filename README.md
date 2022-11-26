# tip-bot
Algorand ASA Discord Tip Bot

## Disclaimer
* This tool is provided as is. It is your responsibility to check everything before minting.
* I strongly suggest to test it on testnet to make sure the tool is working properly.

## You will need
* Node
* Visual Studio Code 

## Installation
Once Node and VS Code are installed, simply run below command:
```
npm install
```
Open the solution in VS Code.

There are several things to configure:
* .env
  * TOKEN - your Discod bot token. Please follow [this guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html) that explains how to set up Discord side of installation process.
  * CLIENTID - your Discord client id.
  * GUILDID - your guild id you want to use the bot in.
  * TIP_MNEMONIC_MAINNET - your account mnemonic for mainnet (each word is space separated).
  * TIP_ACCOUNT_MAINNET - your account address for mainnet.
  * TIP_ASSET_MAINNET - your asset id for mainnet.
  * TIP_ASSET_MULTIPLIER_MAINNET - if your mainnet asset has any decimals set it to 1xxxxxxx where x is 0 for each decimal place. Eg. for 6 decimal places use 1000000.
  * TIP_MNEMONIC_TESTNET - your account mnemonic for testnet (each word is space separated).
  * TIP_ACCOUNT_TESTNET - your account address for testnet.
  * TIP_ASSET_TESTNET = 0
  * TIP_ASSET_MULTIPLIER_TESTNET - if your testnet asset has any decimals set it to 1xxxxxxx where x is 0 for each decimal place. Eg. for 6 secimal places use 1000000.
  * TIP_OPT_IN_ASSET_ID - your asset id for testnet.
  * NETWORK_TO_USE - **testnet** or **mainnet**.
  
Once the initial configuration is done, there is one more step required - installing slash commands on your server. This can be done by using **deploy-commands.js** script. Execute the below command:
```
node deploy-commands.js
```

Once everything is set up, simply run it by executing below command in Command Prompt:
```
node bot.js
```
Bot will attempt to connect to Discord servers and will be listening continuously.

Bot is using local SQLite database that get's created when the bot is started for the first time. If you want to reset the database, delete database.sqlite file and restart your bot.

If you have any problems, feel free to get in touch with me.

Pull requests are welcome.

