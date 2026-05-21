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

4. Optionally enable the admin web editor.

```bash
ADMIN_HOST=127.0.0.1
ADMIN_PORT=3001
ADMIN_TOKEN=put_a_long_random_admin_password_here
```

With the default host, open it through an SSH tunnel:

```bash
ssh -L 3001:127.0.0.1:3001 user@your-server
```

Then visit `http://127.0.0.1:3001`.

5. Deploy slash commands:

```bash
npm run deploy
```

For faster testing, add `GUILD_ID` to `.env`. Without `GUILD_ID`, commands are deployed globally and can take longer to appear.

6. Start the bot:

```bash
npm start
```

## Commands

- `/balance` - Check your wallet and bank.
- `/beg` - Beg for coins with random outcomes.
- `/work` - Work a goofy job for money.
- `/daily` - Claim a daily reward.
- `/bank` - Open the bank menu to view storage, upgrade costs, and installed defenses.
- `/deposit amount` - Move coins from wallet to bank.
- `/withdraw amount` - Move coins from bank to wallet.
- `/rob user` - Try to rob another user.
- `/bankrob user` - Try to steal from another user's bank.
- `/scanbank user` - Spend a Hack Device to scan a user's bank defenses.
- `/voiddefense user` - Spend a Void to remove one random bank defense.
- `/shop` - Buy pickaxes, bank defense items, tools, pet food, and pets. The shop menu has Bank, Food, Pets, Mine, and Black Market categories with page-based buying and quantities.
- `/use item` - Use potions, charms, mystery blocks, or install bank defenses.
- `/hunt` - Hunt for random items.
- `/pet` - Open the pet menu to equip one pet, feed a chosen quantity, claim idle hunt drops, and view pet level/food time.
- `/mine` - Mine for ores with your best pickaxe.
- `/gamble amount` - Risk coins for a chance to win more.
- `/highlow amount` - Guess whether the next 0-100 roll is above or below, then cash out or keep going.
- `/coinflip choice amount` - Bet on heads or tails.
- `/leaderboard` - Show the richest users by net worth.

Pets are bought from the shop. They do not drop from `/beg` or `/hunt`, and each pet has its own base idle hunt speed.

Bank defense slots unlock with bank level: levels 1-2 have 1 slot, levels 3-5 have 2 slots, and levels 6-10 have 3 slots.
