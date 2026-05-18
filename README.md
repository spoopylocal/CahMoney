# Discord Economy Bot

A basic funny-money economy sim bot inspired by the style of Dank Memer, with original commands and simple chance-based actions.

## Important

If you pasted your Discord bot token anywhere public or into chat, rotate it in the Discord Developer Portal before running the bot.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and add your new rotated token.

3. Choose where economy data should be stored.

```bash
DATA_DIR=data
```

The bot writes economy data to `DATA_DIR/economy.json`. Keep this folder backed up on your host.

4. Deploy slash commands:

```bash
npm run deploy
```

For faster testing, add `GUILD_ID` to `.env`. Without `GUILD_ID`, commands are deployed globally and can take longer to appear.

5. Start the bot:

```bash
npm start
```

## Commands

- `/balance` - Check your wallet and bank.
- `/beg` - Beg for coins with random outcomes.
- `/work` - Work a goofy job for money.
- `/daily` - Claim a daily reward.
- `/deposit amount` - Move coins from wallet to bank.
- `/withdraw amount` - Move coins from bank to wallet.
- `/rob user` - Try to rob another user.
- `/gamble amount` - Risk coins for a chance to win more.
- `/coinflip choice amount` - Bet on heads or tails.
- `/leaderboard` - Show the richest users by net worth.
