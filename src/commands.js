const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");
const { withStore, getUser, getNetWorth } = require("./economyStore");
const { config } = require("./config");
const { formatCoins, randomInt, clampBet, getCooldown } = require("./utils");

const BEG_COOLDOWN = 30 * 1000;
const WORK_COOLDOWN = 5 * 60 * 1000;
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000;
const ROB_COOLDOWN = 10 * 60 * 1000;
const BANKROB_COOLDOWN = 30 * 60 * 1000;
const HUNT_COOLDOWN = 90 * 1000;
const GIVE_COOLDOWN = 20 * 1000;
const MINE_COOLDOWN = 45 * 1000;
const LUCKY_CHARM_DURATION = 5 * 60 * 1000;
const PAGE_SIZE = 5;
const DEV_USER_ID = "749345623785996489";
const BANKROB_BASE_SUCCESS_CHANCE = 0.28;
const bankLevels = [
  { level: 1, capacity: 25000, upgradeCost: 30000 },
  { level: 2, capacity: 75000, upgradeCost: 85000 },
  { level: 3, capacity: 150000, upgradeCost: 200000 },
  { level: 4, capacity: 500000, upgradeCost: 650000 },
  { level: 5, capacity: 1000000, upgradeCost: 1300000 },
  { level: 6, capacity: 2500000, upgradeCost: 3250000 },
  { level: 7, capacity: 5000000, upgradeCost: 6500000 },
  { level: 8, capacity: 10000000, upgradeCost: 13000000 },
  { level: 9, capacity: 25000000, upgradeCost: 30000000 },
  { level: 10, capacity: 50000000, upgradeCost: null }
];
const bankDefenseItems = {
  laser_grid: { name: "Laser Grid", blockChance: 0.11, consumeChance: 0.3, effect: "burn_item" },
  land_mine: { name: "Land Mine", blockChance: 0.18, consumeChance: 0.65, effect: "fine" },
  guard: { name: "Guard", blockChance: 0.2, consumeChance: 0.35, effect: "fine" },
  alarm: { name: "Alarm", blockChance: 0.05, consumeChance: 0.35, effect: "alert" }
};
const shopItems = [
  { itemId: "stone_pickaxe", price: 3500 },
  { itemId: "iron_pickaxe", price: 10250 },
  { itemId: "gold_pickaxe", price: 25000 },
  { itemId: "diamond_pickaxe", price: 45000 },
  { itemId: "netherite_pickaxe", price: 125000 },
  { itemId: "alarm", price: 15000 },
  { itemId: "laser_grid", price: 45000 },
  { itemId: "land_mine", price: 70000 },
  { itemId: "guard", price: 100000 },
  { itemId: "hackdevice", price: 100000 },
  { itemId: "void", price: 150000 }
];

const jobs = [
  "tested suspicious vending machines",
  "sold premium air",
  "moderated a group chat argument",
  "found coins under a digital couch",
  "wrote fake business emails"
];

const items = [
  { id: "xp_potion", name: "XP Potion", description: "Drink it for a burst of XP.", weight: 8, sellValue: 350, usable: true },
  { id: "cash_potion", name: "Cash Potion", description: "Drink it for a random pile of coins.", weight: 8, sellValue: 350, usable: true },
  { id: "dirt", name: "Dirt", description: "Suspiciously ordinary. Somehow collectible.", weight: 22, sellValue: 15 },
  { id: "lucky_charm", name: "Lucky Charm", description: "Use it for +20% luck for 5 minutes.", weight: 7, sellValue: 500, usable: true },
  { id: "broken_phone", name: "Broken Phone", description: "It still receives emotional damage.", weight: 12, sellValue: 90 },
  { id: "rubber_duck", name: "Rubber Duck", description: "Excellent debugging partner.", weight: 12, sellValue: 120 },
  { id: "gold_ring", name: "Gold Ring", description: "Shiny, valuable, maybe cursed.", weight: 4, sellValue: 900 },
  { id: "mystery_block", name: "Mystery Block", description: "Open it for a random reward or problem.", weight: 10, sellValue: 180, usable: true },
  { id: "fake_id", name: "Fake ID", description: "Says your name is Business Johnson.", weight: 7, sellValue: 300 },
  { id: "shiny_rock", name: "Shiny Rock", description: "A rock with ambition.", weight: 10, sellValue: 150 },
  { id: "wooden_pickaxe", name: "Wooden Pickaxe", description: "The starter pickaxe. Free, dramatic, splintery.", weight: 0, sellValue: 0 },
  { id: "stone_pickaxe", name: "Stone Pickaxe", description: "Better mining odds than wood.", weight: 0, sellValue: 750 },
  { id: "iron_pickaxe", name: "Iron Pickaxe", description: "Good enough to make rocks nervous.", weight: 0, sellValue: 2500 },
  { id: "gold_pickaxe", name: "Gold Pickaxe", description: "Flashy and oddly effective.", weight: 0, sellValue: 4500 },
  { id: "diamond_pickaxe", name: "Diamond Pickaxe", description: "A serious tool for serious shiny things.", weight: 0, sellValue: 9000 },
  { id: "netherite_pickaxe", name: "Netherite Pickaxe", description: "Top-tier mining nonsense.", weight: 0, sellValue: 20000 },
  { id: "cobblestone", name: "Cobblestone", description: "A classic chunk of not-much.", weight: 0, sellValue: 25 },
  { id: "coal", name: "Coal", description: "Crunchy little fuel money.", weight: 0, sellValue: 60 },
  { id: "iron", name: "Iron", description: "A respectable metal with bills to pay.", weight: 0, sellValue: 160 },
  { id: "raw_gold", name: "Raw Gold", description: "Shiny before taxes.", weight: 0, sellValue: 320 },
  { id: "redstone", name: "Redstone", description: "Dust with electrical opinions.", weight: 0, sellValue: 450 },
  { id: "diamond", name: "Diamond", description: "Sharp, shiny, expensive.", weight: 0, sellValue: 1000 },
  { id: "emerald", name: "Emerald", description: "Villager-approved sparkle.", weight: 0, sellValue: 1400 },
  { id: "end_stone", name: "End Stone", description: "A block from somewhere inconvenient.", weight: 0, sellValue: 1800 },
  { id: "netherite_ingot", name: "Netherite Ingot", description: "Dense, rare, and showing off.", weight: 0, sellValue: 3500 },
  { id: "ruby", name: "Ruby", description: "Red, rare, and financially loud.", weight: 0, sellValue: 5000 },
  { id: "pebble", name: "Pebble", description: "Tiny, humble, and technically loot.", weight: 38, sellValue: 8 },
  { id: "fries", name: "Fries", description: "A salty little snack with resale value somehow.", weight: 30, sellValue: 25 },
  { id: "cd", name: "CD", description: "Possibly music. Possibly a coaster.", weight: 26, sellValue: 40 },
  { id: "burger", name: "Burger", description: "Found food. Economically brave.", weight: 24, sellValue: 55 },
  { id: "boots", name: "Boots", description: "Only lightly cursed by the trail.", weight: 18, sellValue: 90 },
  { id: "crown", name: "Crown", description: "Royal-looking enough to cause problems.", weight: 3, sellValue: 1750 },
  { id: "alarm", name: "Alarm", description: "Use it to install a bank defense.", weight: 0, sellValue: 4000, usable: true },
  { id: "laser_grid", name: "Laser Grid", description: "Use it to install a bank defense.", weight: 0, sellValue: 12000, usable: true },
  { id: "land_mine", name: "Land Mine", description: "Use it to install a bank defense.", weight: 0, sellValue: 18000, usable: true },
  { id: "guard", name: "Guard", description: "Use it to install a bank defense.", weight: 0, sellValue: 25000, usable: true },
  { id: "hackdevice", name: "Hack Device", description: "Use /scanbank to detect another player's bank defenses.", weight: 0, sellValue: 25000 },
  { id: "void", name: "Void", description: "Use /voiddefense to erase one random bank defense from a player.", weight: 0, sellValue: 40000 }
];

const itemById = new Map(items.map((item) => [item.id, item]));
const itemNumberById = new Map(items.map((item, index) => [item.id, index + 1]));
const pickaxes = [
  { id: "wooden_pickaxe", tier: 1 },
  { id: "stone_pickaxe", tier: 2 },
  { id: "iron_pickaxe", tier: 3 },
  { id: "gold_pickaxe", tier: 4 },
  { id: "diamond_pickaxe", tier: 5 },
  { id: "netherite_pickaxe", tier: 6 }
];
const mineDropTables = {
  wooden_pickaxe: [
    ["cobblestone", 55],
    ["coal", 28],
    ["iron", 12],
    ["raw_gold", 4],
    ["redstone", 1]
  ],
  stone_pickaxe: [
    ["cobblestone", 38],
    ["coal", 26],
    ["iron", 20],
    ["raw_gold", 10],
    ["redstone", 5],
    ["diamond", 1]
  ],
  iron_pickaxe: [
    ["cobblestone", 25],
    ["coal", 22],
    ["iron", 22],
    ["raw_gold", 14],
    ["redstone", 10],
    ["diamond", 5],
    ["emerald", 2]
  ],
  gold_pickaxe: [
    ["cobblestone", 18],
    ["coal", 18],
    ["iron", 20],
    ["raw_gold", 18],
    ["redstone", 12],
    ["diamond", 8],
    ["emerald", 4],
    ["ruby", 2]
  ],
  diamond_pickaxe: [
    ["cobblestone", 10],
    ["coal", 14],
    ["iron", 18],
    ["raw_gold", 18],
    ["redstone", 14],
    ["diamond", 12],
    ["emerald", 8],
    ["end_stone", 4],
    ["ruby", 2]
  ],
  netherite_pickaxe: [
    ["coal", 8],
    ["iron", 14],
    ["raw_gold", 16],
    ["redstone", 16],
    ["diamond", 16],
    ["emerald", 12],
    ["end_stone", 8],
    ["netherite_ingot", 6],
    ["ruby", 4]
  ]
};

const begWinMessages = [
  "A stranger dropped {coins} into your hand and said nothing. Mysterious. Profitable.",
  "You performed the saddest little speech possible and earned {coins}.",
  "Someone paid you {coins} to stop making eye contact.",
  "A vending machine coughed up {coins}. You are choosing to call this begging.",
  "You found {coins} in a parking lot and immediately looked humble about it.",
  "A rich person mistook you for a tax write-off and gave you {coins}.",
  "Your cardboard sign had excellent font choice. You earned {coins}.",
  "Someone donated {coins} because your financial aura looked haunted."
];

const begLoseMessages = [
  "Nobody gave you anything. Brutal economy.",
  "A person offered advice instead of money. Horrifying.",
  "You got a thumbs up and zero coins.",
  "Someone said they only carry card. Devastating.",
  "Your begging technique has been described as 'financially unconvincing.'",
  "You found a coin, but it was glued to the floor.",
  "A stranger gave you a coupon that expired three years ago.",
  "You asked nicely and the universe said no."
];

const gambleWinMessages = [
  "You won {payout} on a {multiplier}x hit. Very suspicious luck.",
  "The machine blinked twice and paid out {payout}.",
  "You walked in confident and somehow left with {payout}.",
  "Your terrible strategy worked. You won {payout}.",
  "The odds looked away for one second. You won {payout}.",
  "You hit {multiplier}x and gained {payout}. Try not to develop a personality around this.",
  "A risky click turned into {payout}. Clean enough.",
  "You won {payout}. The house is pretending to be happy for you."
];

const gambleLoseMessages = [
  "You lost {bet}. The house is doing house things.",
  "You lost {bet}. The machine made a noise that sounded personal.",
  "Your coins left and did not text back. Lost {bet}.",
  "You donated {bet} to the invisible casino fund.",
  "You lost {bet}. Mathematically rude.",
  "The gamble failed so fast it almost felt efficient. Lost {bet}.",
  "You lost {bet}. Your wallet needs a quiet moment.",
  "The odds folded you like a cheap chair. Lost {bet}."
];

const coinflipWinMessages = [
  "It landed on {result}. You won {payout}.",
  "{result} came up and your wallet got {payout} louder.",
  "It was {result}. You won {payout}, which means you are basically a coin scholar.",
  "{result}. Correct call. You won {payout}.",
  "The coin respected your vision. {result} wins you {payout}."
];

const coinflipLoseMessages = [
  "It landed on {result}. You lost {bet}.",
  "{result}. Wrong call. Your {bet} has left the building.",
  "The coin chose {result} and chose violence. You lost {bet}.",
  "It was {result}. You lost {bet}, but at least the coin had fun.",
  "{result}. Not your finest prediction. Lost {bet}."
];

function pickMessage(messages, values = {}) {
  const message = messages[randomInt(0, messages.length - 1)];

  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    message
  );
}

function getEmoji(interaction, name, fallback, configuredEmoji = null) {
  if (configuredEmoji) return configuredEmoji;

  return (
    interaction.guild?.emojis.cache.find((emoji) => emoji.name.toLowerCase() === name.toLowerCase())?.toString() ||
    fallback
  );
}

function formatMoney(interaction, amount) {
  return `${getEmoji(interaction, "money", "money", config.moneyEmoji)} ${formatCoins(amount)}`;
}

function formatBankMoney(interaction, amount) {
  return `${getEmoji(interaction, "bank", "bank", config.bankEmoji)} ${formatCoins(amount)}`;
}

function formatExperience(interaction, amount) {
  return `${getEmoji(interaction, "exp", "EXP", config.expEmoji)} ${amount.toLocaleString()} XP`;
}

function formatItem(interaction, itemId, quantity = null) {
  const item = itemById.get(itemId);
  const fallback = item ? item.name : itemId;
  const emoji = getEmoji(interaction, itemId, fallback, config.itemEmojis[itemId]);
  const label = item ? item.name : itemId;

  if (quantity === null) return `${emoji} ${label}`;
  return `${emoji} ${label} x${quantity.toLocaleString()}`;
}

function resolveItemId(input) {
  const normalized = String(input || "").trim().toLowerCase();
  const number = Number.parseInt(normalized, 10);

  if (Number.isInteger(number) && number >= 1 && number <= items.length) {
    return items[number - 1].id;
  }

  if (itemById.has(normalized)) return normalized;

  const compact = normalized.replace(/[\s-]+/g, "_");
  if (itemById.has(compact)) return compact;

  const noSpaces = normalized.replace(/[\s_-]+/g, "");
  return items.find((item) => item.name.toLowerCase().replace(/[\s_-]+/g, "") === noSpaces)?.id || null;
}

function formatCard(interaction, card, hidden = false) {
  if (hidden) {
    return getEmoji(interaction, "CardJoker", "Hidden", config.cardEmojis.joker);
  }

  const emojiKey = {
    A: "ace",
    K: "king",
    Q: "queen",
    J: "jack",
    10: null,
    9: 9,
    8: 8,
    7: 7,
    6: 6,
    5: 5,
    4: 4,
    3: 3,
    2: 2
  }[card.rank];
  const emojiName = `Card${card.rank === "A" ? "Ace" : card.rank === "K" ? "King" : card.rank === "Q" ? "Queen" : card.rank === "J" ? "Jack" : card.rank}`;
  const fallback = card.rank;

  return getEmoji(interaction, emojiName, fallback, config.cardEmojis[emojiKey]);
}

function formatHand(interaction, hand, hideFirst = false) {
  return hand.map((card, index) => formatCard(interaction, card, hideFirst && index === 0)).join(" ");
}

function createDeck() {
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const deck = [];

  for (const rank of ranks) {
    for (let index = 0; index < 4; index += 1) {
      deck.push({ rank });
    }
  }

  return deck;
}

function drawCard(deck) {
  const index = randomInt(0, deck.length - 1);
  const [card] = deck.splice(index, 1);
  return card;
}

function getHandScore(hand) {
  let total = 0;
  let aces = 0;

  for (const card of hand) {
    if (card.rank === "A") {
      total += 11;
      aces += 1;
    } else if (["K", "Q", "J"].includes(card.rank)) {
      total += 10;
    } else {
      total += Number(card.rank);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return {
    value: total,
    soft: aces > 0
  };
}

function getHandValue(hand) {
  return getHandScore(hand).value;
}

function getCardValueForSplit(card) {
  if (card.rank === "A") return 11;
  if (["K", "Q", "J", "10"].includes(card.rank)) return 10;
  return Number(card.rank);
}

function canSplitHand(hand) {
  if (!hand) return false;
  return hand.cards.length === 2 && getCardValueForSplit(hand.cards[0]) === getCardValueForSplit(hand.cards[1]);
}

function canDoubleHand(hand) {
  if (!hand) return false;
  return hand.cards.length === 2 && !hand.done;
}

function makeBlackjackButtons(game, disabled = false) {
  const hand = game.hands?.[game.activeHandIndex];
  const actionDisabled = disabled || game.finished || !hand || hand.done;

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("blackjack_hit")
        .setLabel("Hit")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(actionDisabled),
      new ButtonBuilder()
        .setCustomId("blackjack_stand")
        .setLabel("Stand")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(actionDisabled),
      new ButtonBuilder()
        .setCustomId("blackjack_double")
        .setLabel("Double Down")
        .setStyle(ButtonStyle.Success)
        .setDisabled(actionDisabled || !canDoubleHand(hand)),
      new ButtonBuilder()
        .setCustomId("blackjack_split")
        .setLabel("Split")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(actionDisabled || game.hands.length > 1 || !canSplitHand(hand))
    )
  ];
}

function makeBlackjackEmbed(interaction, game) {
  const dealerValue = getHandValue(game.dealerHand);
  const dealerLabel = game.finished ? `Value: ${dealerValue}` : `Showing: ${dealerValue}`;
  const handFields = game.hands.map((hand, index) => {
    const marker = index === game.activeHandIndex && !game.finished ? "Current" : hand.done ? "Done" : "Waiting";
    return {
      name: `Hand ${index + 1} (${marker}, Value: ${getHandValue(hand.cards)}, Bet: ${formatMoney(interaction, hand.bet)})`,
      value: formatHand(interaction, hand.cards),
      inline: false
    };
  });
  const totalBet = game.hands.reduce((sum, hand) => sum + hand.bet, 0);

  return makeEmbed(interaction, game.title || "Blackjack", game.message || "Choose Hit or Stand.", {
    color: game.color || 0x5865f2,
    fields: [
      { name: `Dealer (${dealerLabel})`, value: formatHand(interaction, game.dealerHand), inline: false },
      ...handFields,
      { name: "Total Bet", value: formatMoney(interaction, totalBet), inline: true }
    ]
  });
}

async function finishBlackjack(interaction, game, reason) {
  const liveHands = game.hands.filter((hand) => getHandValue(hand.cards) <= 21);

  while (liveHands.length > 0 && reason !== "blackjack") {
    const dealerScore = getHandScore(game.dealerHand);
    if (dealerScore.value > 17 || (dealerScore.value === 17 && dealerScore.soft)) break;
    if (dealerScore.value === 17 && !dealerScore.soft) break;
    game.dealerHand.push(drawCard(game.deck));
  }

  const dealerValue = getHandValue(game.dealerHand);
  const results = game.hands.map((hand, index) => {
    const playerValue = getHandValue(hand.cards);
    let payout = 0;
    let text = "";

    if (playerValue > 21) {
      text = `Hand ${index + 1}: busted with ${playerValue}, lost ${formatMoney(interaction, hand.bet)}.`;
    } else if (dealerValue > 21) {
      payout = hand.bet * 2;
      text = `Hand ${index + 1}: dealer busted, won ${formatMoney(interaction, payout)}.`;
    } else if (playerValue > dealerValue) {
      payout = hand.blackjack ? Math.floor(hand.bet * 2.5) : hand.bet * 2;
      text = `Hand ${index + 1}: beat dealer ${playerValue} to ${dealerValue}, won ${formatMoney(interaction, payout)}.`;
    } else if (playerValue === dealerValue) {
      payout = hand.bet;
      text = `Hand ${index + 1}: pushed at ${playerValue}, bet returned.`;
    } else {
      text = `Hand ${index + 1}: dealer won ${dealerValue} to ${playerValue}, lost ${formatMoney(interaction, hand.bet)}.`;
    }

    return { payout, text };
  });
  const payout = results.reduce((sum, result) => sum + result.payout, 0);
  const totalBet = game.hands.reduce((sum, hand) => sum + hand.bet, 0);
  const net = payout - totalBet;
  const color = net > 0 ? 0x57f287 : net === 0 ? 0xfee75c : 0xed4245;
  const title = net > 0 ? "Blackjack Won" : net === 0 ? "Blackjack Push" : "Blackjack Lost";

  const xp = await withStore((store) => {
    const user = getUser(store, interaction.user.id);
    if (payout > 0) user.wallet += payout;
    return addExperience(user, net > 0 ? 8 : 2, net > 0 ? 16 : 6);
  });

  game.finished = true;
  game.title = title;
  game.message = `${results.map((result) => result.text).join("\n")}\nNet: ${formatMoney(interaction, net)}. ${formatExperience(interaction, xp)} earned.`;
  game.color = color;
  game.payout = payout;
}

function addItem(user, itemId, quantity = 1) {
  user.inventory ||= {};
  user.inventory[itemId] = (user.inventory[itemId] || 0) + quantity;
}

function removeItem(user, itemId, quantity = 1) {
  user.inventory ||= {};

  if ((user.inventory[itemId] || 0) < quantity) return false;

  user.inventory[itemId] -= quantity;
  if (user.inventory[itemId] <= 0) {
    delete user.inventory[itemId];
  }

  return true;
}

function normalizeBankLevel(user) {
  const level = Math.floor(Number(user.bankLevel) || 1);
  user.bankLevel = Math.min(bankLevels.length, Math.max(1, level));
  return user.bankLevel;
}

function getBankLevelInfo(user) {
  return bankLevels[normalizeBankLevel(user) - 1];
}

function getNextBankLevelInfo(user) {
  const level = normalizeBankLevel(user);
  return bankLevels[level] || null;
}

function getBankSpace(user) {
  return Math.max(0, getBankLevelInfo(user).capacity - user.bank);
}

function getBankDefenseEntries(user) {
  user.bankDefenses ||= {};
  return Object.entries(user.bankDefenses)
    .map(([itemId, quantity]) => {
      const defense = bankDefenseItems[itemId];
      const amount = Math.max(0, Math.floor(Number(quantity) || 0));
      return defense && amount > 0 ? { itemId, quantity: amount, ...defense } : null;
    })
    .filter(Boolean);
}

function getBankDefenseBlockChance(user) {
  const total = getBankDefenseEntries(user).reduce((sum, defense) => sum + defense.blockChance * defense.quantity, 0);
  return Math.min(0.23, total);
}

function getBankrobSuccessChance(victim) {
  return Math.max(0.05, BANKROB_BASE_SUCCESS_CHANCE - getBankDefenseBlockChance(victim));
}

function formatBankDefenses(interaction, user) {
  const defenses = getBankDefenseEntries(user);
  if (defenses.length === 0) return "None installed.";

  return defenses
    .map((defense) => `${formatItem(interaction, defense.itemId, defense.quantity)} (${Math.round(defense.blockChance * 100)}% block each, ${formatDefenseEffect(defense)})`)
    .join("\n");
}

function formatDefenseEffect(defense) {
  if (defense.effect === "alert") return "alerts the owner";
  if (defense.effect === "burn_item") return "burns a robber item";
  return "raises the robber fine";
}

function getSpecificDefense(user, itemId) {
  const defense = bankDefenseItems[itemId];
  const quantity = Math.max(0, Math.floor(Number(user.bankDefenses?.[itemId]) || 0));
  return defense && quantity > 0 ? { itemId, quantity, ...defense } : null;
}

function consumeTriggeredDefense(user) {
  const defenses = getBankDefenseEntries(user);
  if (defenses.length === 0) return null;

  const totalWeight = defenses.reduce((sum, defense) => sum + defense.blockChance * defense.quantity, 0);
  let roll = Math.random() * totalWeight;
  const triggered = defenses.find((defense) => {
    roll -= defense.blockChance * defense.quantity;
    return roll <= 0;
  }) || defenses[defenses.length - 1];
  const consumed = Math.random() < triggered.consumeChance;

  if (consumed) {
    user.bankDefenses[triggered.itemId] -= 1;
    if (user.bankDefenses[triggered.itemId] <= 0) delete user.bankDefenses[triggered.itemId];
  }

  return { ...triggered, consumed };
}

function consumeSpecificDefense(user, itemId) {
  const defense = getSpecificDefense(user, itemId);
  if (!defense) return null;

  const consumed = Math.random() < defense.consumeChance;
  if (consumed) {
    user.bankDefenses[itemId] -= 1;
    if (user.bankDefenses[itemId] <= 0) delete user.bankDefenses[itemId];
  }

  return { ...defense, consumed };
}

function removeRandomBankDefense(user) {
  const defenses = getBankDefenseEntries(user);
  if (defenses.length === 0) return null;

  const totalQuantity = defenses.reduce((sum, defense) => sum + defense.quantity, 0);
  let roll = randomInt(1, totalQuantity);
  const removed = defenses.find((defense) => {
    roll -= defense.quantity;
    return roll <= 0;
  }) || defenses[defenses.length - 1];

  user.bankDefenses[removed.itemId] -= 1;
  if (user.bankDefenses[removed.itemId] <= 0) delete user.bankDefenses[removed.itemId];

  return removed;
}

function removeRandomInventoryItem(user) {
  user.inventory ||= {};
  const entries = Object.entries(user.inventory).filter(([, quantity]) => Math.floor(Number(quantity) || 0) > 0);
  if (entries.length === 0) return null;

  const totalQuantity = entries.reduce((sum, [, quantity]) => sum + Math.floor(Number(quantity) || 0), 0);
  let roll = randomInt(1, totalQuantity);
  const [itemId] = entries.find(([, quantity]) => {
    roll -= Math.floor(Number(quantity) || 0);
    return roll <= 0;
  }) || entries[entries.length - 1];

  removeItem(user, itemId);
  return itemId;
}

function payFromWalletThenBank(user, amount) {
  const paid = Math.min(user.wallet + user.bank, amount);
  const walletPayment = Math.min(user.wallet, paid);
  const bankPayment = paid - walletPayment;

  user.wallet -= walletPayment;
  user.bank -= bankPayment;

  return paid;
}

function getActiveBoost(user, boostId) {
  const expiresAt = user.boosts?.[boostId] || 0;

  if (expiresAt <= Date.now()) {
    if (user.boosts) delete user.boosts[boostId];
    return null;
  }

  return expiresAt;
}

function getLuckMultiplier(user) {
  return getActiveBoost(user, "lucky_charm") ? 1.2 : 1;
}

function useInventoryItem(interaction, user, itemId) {
  const item = itemById.get(itemId);

  if (!item?.usable) {
    return {
      title: "Use Failed",
      message: "That item is not usable right now.",
      color: 0xed4245
    };
  }

  if (!removeItem(user, itemId)) {
    return {
      title: "Use Failed",
      message: `You do not have ${formatItem(interaction, itemId)}.`,
      color: 0xed4245
    };
  }

  if (itemId === "xp_potion") {
    const xp = addExperience(user, 75, 150);
    return {
      title: "XP Potion Used",
      message: `You drank ${formatItem(interaction, itemId)} and gained ${formatExperience(interaction, xp)}.`,
      color: 0x57f287,
      xp,
      totalExperience: user.experience
    };
  }

  if (itemId === "cash_potion") {
    const coins = randomInt(500, 1200);
    const xp = addExperience(user, 5, 10);
    user.wallet += coins;

    return {
      title: "Cash Potion Used",
      message: `You drank ${formatItem(interaction, itemId)} and gained ${formatMoney(interaction, coins)}.`,
      color: 0x57f287,
      coins,
      coinsLabel: "Coins Earned",
      xp,
      totalExperience: user.experience
    };
  }

  if (itemId === "lucky_charm") {
    user.boosts ||= {};
    user.boosts.lucky_charm = Date.now() + LUCKY_CHARM_DURATION;

    return {
      title: "Lucky Charm Used",
      message: `${formatItem(interaction, itemId)} activated. You have +20% luck for 5 minutes.`,
      color: 0x57f287
    };
  }

  if (bankDefenseItems[itemId]) {
    user.bankDefenses ||= {};
    user.bankDefenses[itemId] = (user.bankDefenses[itemId] || 0) + 1;

    return {
      title: "Bank Defense Installed",
      message: `${formatItem(interaction, itemId)} is now defending your bank.`,
      color: 0x57f287,
      defenseId: itemId,
      ephemeral: true
    };
  }

  const roll = Math.random();
  const xp = addExperience(user, 5, 10);

  if (roll < 0.25) {
    const coins = randomInt(200, 800);
    user.wallet += coins;

    return {
      title: "Mystery Block Opened",
      message: `${formatItem(interaction, itemId)} popped open and spilled out ${formatMoney(interaction, coins)}.`,
      color: 0x57f287,
      coins,
      xp,
      totalExperience: user.experience
    };
  }

  if (roll < 0.5) {
    const bonusXp = addExperience(user, 50, 120);

    return {
      title: "Mystery Block Opened",
      message: `${formatItem(interaction, itemId)} flashed dramatically and gave you ${formatExperience(interaction, bonusXp)}.`,
      color: 0x57f287,
      xp: xp + bonusXp,
      totalExperience: user.experience
    };
  }

  if (roll < 0.75) {
    const foundItem = pickWeightedItem();
    addItem(user, foundItem.id);

    return {
      title: "Mystery Block Opened",
      message: `${formatItem(interaction, itemId)} contained ${formatItem(interaction, foundItem.id)}.`,
      color: 0x57f287,
      itemId: foundItem.id,
      xp,
      totalExperience: user.experience
    };
  }

  const lost = Math.min(user.wallet, randomInt(100, 500));
  user.wallet -= lost;

  return {
    title: "Mystery Block Opened",
    message: `${formatItem(interaction, itemId)} made a worrying sound and ate ${formatMoney(interaction, lost)}.`,
    color: 0xed4245,
    coins: lost,
    coinsLabel: "Coins Lost",
    xp,
    totalExperience: user.experience
  };
}

function pickWeightedItem(luckMultiplier = 1) {
  const dropItems = items.filter((item) => item.weight > 0);
  const weightedItems = dropItems.map((item, index) => {
    const bonus = 1 + (luckMultiplier - 1) * (index / Math.max(1, dropItems.length - 1));
    return { ...item, adjustedWeight: item.weight * bonus };
  });
  const totalWeight = weightedItems.reduce((sum, item) => sum + item.adjustedWeight, 0);
  let roll = randomInt(1, totalWeight);

  for (const item of weightedItems) {
    roll -= item.adjustedWeight;
    if (roll <= 0) return item;
  }

  return weightedItems[weightedItems.length - 1];
}

function pickWeightedDrop(dropTable, luckMultiplier = 1) {
  const weightedTable = dropTable.map(([itemId, weight], index) => {
    const bonus = 1 + (luckMultiplier - 1) * (index / Math.max(1, dropTable.length - 1));
    return [itemId, weight * bonus];
  });
  const totalWeight = weightedTable.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = randomInt(1, totalWeight);

  for (const [itemId, weight] of weightedTable) {
    roll -= weight;
    if (roll <= 0) return itemId;
  }

  return dropTable[dropTable.length - 1][0];
}

function getBestPickaxe(user) {
  user.inventory ||= {};

  return pickaxes
    .slice()
    .reverse()
    .find((pickaxe) => pickaxe.id === "wooden_pickaxe" || (user.inventory[pickaxe.id] || 0) > 0);
}

function consumeRig(user, game) {
  if (!user.rig) return null;
  if (user.rig.game !== "next" && user.rig.game !== game) return null;

  const rig = user.rig;
  user.rig = null;
  return rig;
}

function shopChoices() {
  return shopItems.map((shopItem) => {
    const item = itemById.get(shopItem.itemId);
    return { name: item?.name || shopItem.itemId, value: shopItem.itemId };
  });
}

function itemChoices(includeAll = true) {
  const source = includeAll ? items : items.filter((item) => item.usable);
  return source.map((item) => ({ name: item.name, value: item.id }));
}

function getLevel(experience) {
  return Math.floor(experience / 100) + 1;
}

function getNextLevelExperience(experience) {
  return getLevel(experience) * 100;
}

function getExperienceUntilNextLevel(experience) {
  return getNextLevelExperience(experience) - experience;
}

function addExperience(user, min, max) {
  const earned = randomInt(min, max);
  user.experience = (user.experience || 0) + earned;
  return earned;
}

function getExperienceProgress(interaction, totalExperience) {
  return `Level ${getLevel(totalExperience)} | ${formatExperience(interaction, getExperienceUntilNextLevel(totalExperience))} to next level`;
}

function formatDuration(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const leftoverSeconds = seconds % 60;

  if (minutes <= 0) return `${seconds}s`;
  if (leftoverSeconds === 0) return `${minutes}m`;
  return `${minutes}m ${leftoverSeconds}s`;
}

function xpFields(interaction, outcome) {
  if (!outcome.xp) return [];

  return [
    { name: "XP Earned", value: formatExperience(interaction, outcome.xp), inline: true },
    { name: "XP Progress", value: getExperienceProgress(interaction, outcome.totalExperience), inline: true }
  ];
}

function makeEmbed(interaction, title, description, options = {}) {
  const embed = new EmbedBuilder()
    .setColor(options.color || 0x2b2d31)
    .setTitle(title)
    .setDescription(description)
    .setAuthor({
      name: interaction.user.username,
      iconURL: interaction.user.displayAvatarURL()
    })
    .setTimestamp();

  if (options.fields?.length) {
    embed.addFields(options.fields);
  }

  return embed;
}

async function replyEmbed(interaction, title, description, options = {}) {
  await interaction.reply({
    embeds: [makeEmbed(interaction, title, description, options)],
    ephemeral: options.ephemeral || false
  });
}

async function requireDev(interaction) {
  if (interaction.user.id === DEV_USER_ID) return true;

  await replyEmbed(interaction, "Dev Only", "You cannot use this command.", {
    color: 0xed4245,
    ephemeral: true
  });
  return false;
}

function makePagedRows(customIdPrefix, page, totalPages) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${customIdPrefix}_first`)
        .setLabel("<<")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`${customIdPrefix}_prev`)
        .setLabel("<")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`${customIdPrefix}_refresh`)
        .setLabel("Refresh")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${customIdPrefix}_next`)
        .setLabel(">")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1),
      new ButtonBuilder()
        .setCustomId(`${customIdPrefix}_last`)
        .setLabel(">>")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1)
    )
  ];
}

function makePagedEmbed(interaction, title, rows, page, options = {}) {
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const visibleRows = rows.slice(start, start + PAGE_SIZE);
  const description = visibleRows.length > 0 ? visibleRows.join("\n\n") : options.emptyText;

  return makeEmbed(interaction, title, description || "Nothing to show.", {
    color: options.color || 0x5865f2,
    fields: [{ name: "Page", value: `${page + 1} of ${totalPages}`, inline: true }]
  });
}

function makeInventoryRows(interaction, entries) {
  return entries.map(([itemId, quantity]) => {
    const item = itemById.get(itemId);
    const itemNumber = itemNumberById.get(itemId) || "?";
    const sellValue = item ? item.sellValue * quantity : 0;
    return `**#${itemNumber} ${formatItem(interaction, itemId, quantity)}**\n${item?.description || "No description."}\nSell value: ${formatMoney(interaction, sellValue)}`;
  });
}

function makeInventoryComponents(interaction, customIdPrefix, page, totalPages, entries, canSell) {
  const components = makePagedRows(customIdPrefix, page, totalPages);
  const visibleEntries = entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const usableEntries = visibleEntries.filter(([itemId]) => itemById.get(itemId)?.usable);

  if (canSell && visibleEntries.length > 0) {
    components.unshift(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`${customIdPrefix}_sell`)
          .setPlaceholder("Sell an item from this page")
          .addOptions(
            visibleEntries.map(([itemId, quantity]) => {
              const item = itemById.get(itemId);
              return {
                label: item?.name || itemId,
                description: `You have ${quantity.toLocaleString()} | ${formatCoins((item?.sellValue || 0) * quantity)} total value`,
                value: itemId
              };
            })
          )
      )
    );
  }

  if (canSell && usableEntries.length > 0) {
    components.unshift(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`${customIdPrefix}_use`)
          .setPlaceholder("Use an item from this page")
          .addOptions(
            usableEntries.map(([itemId, quantity]) => {
              const item = itemById.get(itemId);
              return {
                label: item?.name || itemId,
                description: `You have ${quantity.toLocaleString()}`,
                value: itemId
              };
            })
          )
      )
    );
  }

  return components;
}

function getInventoryEntries(inventory) {
  return Object.entries(inventory || {}).filter(([, quantity]) => quantity > 0);
}

function getInventoryPageCount(entries) {
  return Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
}

async function replyInventoryMenu(interaction, target) {
  let page = 0;
  const canSell = target.id === interaction.user.id;
  const customIdPrefix = `inventory_${interaction.id}`;

  async function getState() {
    const inventory = await withStore((store) => getUser(store, target.id).inventory || {});
    const entries = getInventoryEntries(inventory);
    const totalPages = getInventoryPageCount(entries);
    page = Math.min(page, totalPages - 1);
    const rows = makeInventoryRows(interaction, entries);

    return { entries, rows, totalPages };
  }

  async function render(message = null) {
    const state = await getState();
    const payload = {
      embeds: [
        makePagedEmbed(interaction, `${target.username}'s Inventory`, state.rows, page, {
          emptyText: "Empty pockets. Powerful minimalist energy.",
          color: state.entries.length === 0 ? 0xfee75c : 0x5865f2
        })
      ],
      components: makeInventoryComponents(interaction, customIdPrefix, page, state.totalPages, state.entries, canSell)
    };

    if (message) {
      await message.edit(payload);
    } else {
      await interaction.reply(payload);
    }
  }

  await render();
  const message = await interaction.fetchReply();
  const collector = message.createMessageComponentCollector({
    time: 2 * 60 * 1000
  });

  collector.on("collect", async (componentInteraction) => {
    if (componentInteraction.user.id !== interaction.user.id) {
      await componentInteraction.reply({
        content: "This inventory menu is not yours.",
        ephemeral: true
      });
      return;
    }

    if (componentInteraction.isButton()) {
      const state = await getState();

      if (componentInteraction.customId.endsWith("_first")) page = 0;
      if (componentInteraction.customId.endsWith("_prev")) page = Math.max(0, page - 1);
      if (componentInteraction.customId.endsWith("_next")) page = Math.min(state.totalPages - 1, page + 1);
      if (componentInteraction.customId.endsWith("_last")) page = state.totalPages - 1;

      await componentInteraction.update({
        embeds: [
          makePagedEmbed(interaction, `${target.username}'s Inventory`, state.rows, page, {
            emptyText: "Empty pockets. Powerful minimalist energy.",
            color: state.entries.length === 0 ? 0xfee75c : 0x5865f2
          })
        ],
        components: makeInventoryComponents(interaction, customIdPrefix, page, state.totalPages, state.entries, canSell)
      });
      return;
    }

    if (!componentInteraction.isStringSelectMenu()) return;

    const itemId = componentInteraction.values[0];

    if (componentInteraction.customId.endsWith("_use")) {
      const outcome = await withStore((store) => {
        const user = getUser(store, interaction.user.id);
        return useInventoryItem(interaction, user, itemId);
      });

      await componentInteraction.reply({
        embeds: [makeEmbed(interaction, outcome.title, outcome.message, { color: outcome.color })],
        ephemeral: true
      });
      await render(message);
      return;
    }

    const item = itemById.get(itemId);
    const modal = new ModalBuilder()
      .setCustomId(`${customIdPrefix}_sell_modal_${itemId}`)
      .setTitle(`Sell ${item?.name || itemId}`);
    const amountInput = new TextInputBuilder()
      .setCustomId("amount")
      .setLabel("Amount to sell")
      .setPlaceholder("Type a number, or all")
      .setRequired(true)
      .setStyle(TextInputStyle.Short);

    modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
    await componentInteraction.showModal(modal);

    try {
      const modalInteraction = await componentInteraction.awaitModalSubmit({
        time: 60 * 1000,
        filter: (submitInteraction) =>
          submitInteraction.user.id === interaction.user.id &&
          submitInteraction.customId === `${customIdPrefix}_sell_modal_${itemId}`
      });
      const rawAmount = modalInteraction.fields.getTextInputValue("amount").trim().toLowerCase();
      const outcome = await withStore((store) => {
        const user = getUser(store, interaction.user.id);
        const owned = user.inventory?.[itemId] || 0;
        const amount = rawAmount === "all" ? owned : Number.parseInt(rawAmount, 10);

        if (!Number.isFinite(amount) || amount <= 0) {
          return { ok: false, message: "Enter a positive number or `all`." };
        }

        if (owned < amount) {
          return { ok: false, message: `You only have ${formatItem(interaction, itemId, owned)}.` };
        }

        removeItem(user, itemId, amount);
        const coins = (item?.sellValue || 0) * amount;
        user.wallet += coins;

        return {
          ok: true,
          message: `Sold ${formatItem(interaction, itemId, amount)} for ${formatMoney(interaction, coins)}.`
        };
      });

      await modalInteraction.reply({
        content: outcome.message,
        ephemeral: true
      });
      await render(message);
    } catch {
      await render(message);
    }
  });

  collector.on("end", async () => {
    const state = await getState();
    const disabledComponents = makeInventoryComponents(interaction, customIdPrefix, page, state.totalPages, state.entries, canSell);

    for (const row of disabledComponents) {
      row.components.forEach((component) => component.setDisabled(true));
    }

    await message.edit({ components: disabledComponents }).catch(() => {});
  });
}

async function replyPagedMenu(interaction, options) {
  let page = 0;
  const totalPages = Math.max(1, Math.ceil(options.rows.length / PAGE_SIZE));
  const customIdPrefix = `${options.id}_${interaction.id}`;

  await interaction.reply({
    embeds: [makePagedEmbed(interaction, options.title, options.rows, page, options)],
    components: makePagedRows(customIdPrefix, page, totalPages)
  });

  const message = await interaction.fetchReply();
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 2 * 60 * 1000
  });

  collector.on("collect", async (buttonInteraction) => {
    if (buttonInteraction.user.id !== interaction.user.id) {
      await buttonInteraction.reply({
        content: "This menu is not yours.",
        ephemeral: true
      });
      return;
    }

    if (buttonInteraction.customId.endsWith("_first")) page = 0;
    if (buttonInteraction.customId.endsWith("_prev")) page = Math.max(0, page - 1);
    if (buttonInteraction.customId.endsWith("_next")) page = Math.min(totalPages - 1, page + 1);
    if (buttonInteraction.customId.endsWith("_last")) page = totalPages - 1;

    await buttonInteraction.update({
      embeds: [makePagedEmbed(interaction, options.title, options.rows, page, options)],
      components: makePagedRows(customIdPrefix, page, totalPages)
    });
  });

  collector.on("end", async () => {
    await message.edit({ components: makePagedRows(customIdPrefix, page, totalPages).map((row) => {
      row.components.forEach((component) => component.setDisabled(true));
      return row;
    }) }).catch(() => {});
  });
}

const commands = [
  {
    data: new SlashCommandBuilder()
      .setName("dev")
      .setDescription("Open the developer tools menu."),
    async execute(interaction) {
      if (!(await requireDev(interaction))) return;

      const customIdPrefix = `dev_${interaction.id}`;
      const rows = [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`${customIdPrefix}_addmoney`)
            .setLabel("Add Money")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`${customIdPrefix}_submoney`)
            .setLabel("Sub Money")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`${customIdPrefix}_giveitem`)
            .setLabel("Give Item")
            .setStyle(ButtonStyle.Primary)
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`${customIdPrefix}_addxp`)
            .setLabel("Add XP")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`${customIdPrefix}_subxp`)
            .setLabel("Sub XP")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`${customIdPrefix}_rig`)
            .setLabel("Rig Next")
            .setStyle(ButtonStyle.Primary)
        )
      ];

      await interaction.reply({
        embeds: [
          makeEmbed(interaction, "Developer Menu", "Pick an action. Each button opens a private modal.", {
            color: 0x5865f2
          })
        ],
        components: rows,
        ephemeral: true
      });

      const message = await interaction.fetchReply();
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 5 * 60 * 1000
      });

      collector.on("collect", async (buttonInteraction) => {
        if (buttonInteraction.user.id !== DEV_USER_ID) {
          await buttonInteraction.reply({
            content: "You cannot use this menu.",
            ephemeral: true
          });
          return;
        }

        const action = buttonInteraction.customId.replace(`${customIdPrefix}_`, "");
        const modal = new ModalBuilder()
          .setCustomId(`${customIdPrefix}_modal_${action}`)
          .setTitle(`Dev: ${action}`);
        const userInput = new TextInputBuilder()
          .setCustomId("user_id")
          .setLabel("User ID")
          .setPlaceholder("Paste the target user ID")
          .setRequired(true)
          .setStyle(TextInputStyle.Short);
        const amountInput = new TextInputBuilder()
          .setCustomId("amount")
          .setLabel("Amount")
          .setPlaceholder("Positive number")
          .setRequired(!["giveitem", "rig"].includes(action))
          .setStyle(TextInputStyle.Short);

        modal.addComponents(new ActionRowBuilder().addComponents(userInput));

        if (action === "rig") {
          const gameInput = new TextInputBuilder()
            .setCustomId("game")
            .setLabel("Game")
            .setPlaceholder("next, gamble, coinflip, or blackjack")
            .setRequired(true)
            .setStyle(TextInputStyle.Short);
          const outcomeInput = new TextInputBuilder()
            .setCustomId("outcome")
            .setLabel("Outcome")
            .setPlaceholder("win, lose, or blackjack")
            .setRequired(true)
            .setStyle(TextInputStyle.Short);

          modal.addComponents(new ActionRowBuilder().addComponents(gameInput));
          modal.addComponents(new ActionRowBuilder().addComponents(outcomeInput));
        }

        if (action === "giveitem") {
          const itemInput = new TextInputBuilder()
            .setCustomId("item")
            .setLabel("Item")
            .setPlaceholder("Item number, id, or name")
            .setRequired(true)
            .setStyle(TextInputStyle.Short);
          amountInput.setPlaceholder("Optional, defaults to 1").setRequired(false);
          modal.addComponents(new ActionRowBuilder().addComponents(itemInput));
        }

        if (action !== "rig") {
          modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
        }
        await buttonInteraction.showModal(modal);

        try {
          const modalInteraction = await buttonInteraction.awaitModalSubmit({
            time: 60 * 1000,
            filter: (submitInteraction) =>
              submitInteraction.user.id === DEV_USER_ID &&
              submitInteraction.customId === `${customIdPrefix}_modal_${action}`
          });
          const targetId = modalInteraction.fields.getTextInputValue("user_id").replace(/[<@!>]/g, "").trim();
          const amountText = action === "rig" ? "1" : modalInteraction.fields.getTextInputValue("amount")?.trim() || "1";
          const amount = Number.parseInt(amountText, 10);

          if (!/^\d{10,25}$/.test(targetId)) {
            await modalInteraction.reply({ content: "Invalid user ID.", ephemeral: true });
            return;
          }

          if (!Number.isFinite(amount) || amount <= 0) {
            await modalInteraction.reply({ content: "Amount must be a positive number.", ephemeral: true });
            return;
          }

          const outcome = await withStore((store) => {
            const user = getUser(store, targetId);

            if (action === "giveitem") {
              const itemId = resolveItemId(modalInteraction.fields.getTextInputValue("item"));

              if (!itemId) {
                return { message: "That item does not exist." };
              }

              addItem(user, itemId, amount);
              return { message: `Gave <@${targetId}> ${formatItem(interaction, itemId, amount)}.` };
            }

            if (action === "rig") {
              const game = modalInteraction.fields.getTextInputValue("game").trim().toLowerCase();
              const outcome = modalInteraction.fields.getTextInputValue("outcome").trim().toLowerCase();
              const validGames = ["next", "gamble", "coinflip", "blackjack"];
              const validOutcomes = ["win", "lose", "blackjack"];

              if (!validGames.includes(game) || !validOutcomes.includes(outcome)) {
                return { message: "Invalid rig. Game: next/gamble/coinflip/blackjack. Outcome: win/lose/blackjack." };
              }

              user.rig = {
                game,
                outcome,
                setAt: Date.now()
              };
              return { message: `Rigged <@${targetId}>'s next ${game} for ${outcome}.` };
            }

            if (action === "addmoney") {
              user.wallet += amount;
              return { message: `Added ${formatMoney(interaction, amount)} to <@${targetId}>.` };
            }

            if (action === "submoney") {
              const removed = payFromWalletThenBank(user, amount);
              return { message: `Removed ${formatMoney(interaction, removed)} from <@${targetId}>.` };
            }

            if (action === "addxp") {
              user.experience = (user.experience || 0) + amount;
              return { message: `Added ${formatExperience(interaction, amount)} to <@${targetId}>.` };
            }

            user.experience = Math.max(0, (user.experience || 0) - amount);
            return { message: `Removed ${formatExperience(interaction, amount)} from <@${targetId}>.` };
          });

          await modalInteraction.reply({
            content: outcome.message,
            ephemeral: true
          });
        } catch {
          // Modal timed out; keep the dev menu alive.
        }
      });

      collector.on("end", async () => {
        for (const row of rows) {
          row.components.forEach((component) => component.setDisabled(true));
        }

        await message.edit({ components: rows }).catch(() => {});
      });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("balance")
      .setDescription("Check your wallet and bank.")
      .addUserOption((option) =>
        option.setName("user").setDescription("User to check.").setRequired(false)
      ),
    async execute(interaction) {
      const target = interaction.options.getUser("user") || interaction.user;

      const result = await withStore((store) => {
        const user = getUser(store, target.id);
        return {
          wallet: user.wallet,
          bank: user.bank,
          netWorth: getNetWorth(user),
          experience: user.experience
        };
      });

      const description = target.id === interaction.user.id
        ? "Use `/bank` to privately manage storage upgrades and defenses."
        : "Bank upgrades and defenses are private unless scanned with a Hack Device.";

      await replyEmbed(interaction, `${target.username}'s Balance`, description, {
        color: 0x57f287,
        fields: [
          { name: "Wallet", value: formatMoney(interaction, result.wallet), inline: true },
          { name: "Bank", value: formatBankMoney(interaction, result.bank), inline: true },
          { name: "Net Worth", value: formatMoney(interaction, result.netWorth), inline: true },
          {
            name: "Experience",
            value: `${formatExperience(interaction, result.experience)}\nLevel ${getLevel(result.experience)}\n${formatExperience(interaction, getExperienceUntilNextLevel(result.experience))} to next level`,
            inline: true
          }
        ]
      });
    }
  },
  {
    data: new SlashCommandBuilder().setName("beg").setDescription("Beg for coins. Results may vary."),
    async execute(interaction) {
      const outcome = await withStore((store) => {
        const user = getUser(store, interaction.user.id);
        const cooldown = getCooldown(user.lastBeg, BEG_COOLDOWN);

        if (cooldown) {
          return {
            title: "Begging Cooldown",
            message: `Slow down. Try begging again in ${cooldown}.`,
            color: 0xfee75c
          };
        }

        user.lastBeg = Date.now();

        const earned = randomInt(20, 180);
        const foundItem = Math.random() < 0.2 ? pickWeightedItem() : null;

        if (Math.random() < 0.25) {
          const xp = addExperience(user, 1, 3);
          if (foundItem) addItem(user, foundItem.id);
          return {
            title: "Begging Failed",
            message: foundItem
              ? `${pickMessage(begLoseMessages)} You did find ${formatItem(interaction, foundItem.id)} though.`
              : pickMessage(begLoseMessages),
            color: 0xed4245,
            xp,
            totalExperience: user.experience,
            itemId: foundItem?.id
          };
        }

        const xp = addExperience(user, 3, 7);
        if (foundItem) addItem(user, foundItem.id);
        user.wallet += earned;
        return {
          title: "Begging Worked",
          message: foundItem
            ? `${pickMessage(begWinMessages, { coins: formatMoney(interaction, earned) })} You also got ${formatItem(interaction, foundItem.id)}.`
            : pickMessage(begWinMessages, { coins: formatMoney(interaction, earned) }),
          color: 0x57f287,
          coins: earned,
          xp,
          totalExperience: user.experience,
          itemId: foundItem?.id
        };
      });

      await replyEmbed(interaction, outcome.title, outcome.message, {
        color: outcome.color,
        fields: [
          ...(outcome.coins ? [{ name: "Coins Earned", value: formatMoney(interaction, outcome.coins), inline: true }] : []),
          ...(outcome.itemId ? [{ name: "Item Found", value: formatItem(interaction, outcome.itemId), inline: true }] : []),
          ...xpFields(interaction, outcome)
        ]
      });
    }
  },
  {
    data: new SlashCommandBuilder().setName("work").setDescription("Work a weird little job for coins."),
    async execute(interaction) {
      const outcome = await withStore((store) => {
        const user = getUser(store, interaction.user.id);
        const cooldown = getCooldown(user.lastWork, WORK_COOLDOWN);

        if (cooldown) {
          return {
            title: "Work Cooldown",
            message: `You are still emotionally recovering from work. Try again in ${cooldown}.`,
            color: 0xfee75c
          };
        }

        user.lastWork = Date.now();

        const earned = randomInt(150, 600);
        const xp = addExperience(user, 10, 20);
        const job = jobs[randomInt(0, jobs.length - 1)];
        user.wallet += earned;

        return {
          title: "Shift Complete",
          message: `You ${job} and earned ${formatMoney(interaction, earned)}.`,
          color: 0x57f287,
          coins: earned,
          xp,
          totalExperience: user.experience
        };
      });

      await replyEmbed(interaction, outcome.title, outcome.message, {
        color: outcome.color,
        fields: [
          ...(outcome.coins ? [{ name: "Coins Earned", value: formatMoney(interaction, outcome.coins), inline: true }] : []),
          ...xpFields(interaction, outcome)
        ]
      });
    }
  },
  {
    data: new SlashCommandBuilder().setName("daily").setDescription("Claim your daily coins."),
    async execute(interaction) {
      const outcome = await withStore((store) => {
        const user = getUser(store, interaction.user.id);
        const cooldown = getCooldown(user.lastDaily, DAILY_COOLDOWN);

        if (cooldown) {
          return {
            title: "Daily Cooldown",
            message: `You already claimed daily. Come back in ${cooldown}.`,
            color: 0xfee75c
          };
        }

        user.lastDaily = Date.now();
        user.wallet += 1000;
        const xp = addExperience(user, 25, 25);

        return {
          title: "Daily Claimed",
          message: `Daily claimed: ${formatMoney(interaction, 1000)} added to your wallet.`,
          color: 0x57f287,
          coins: 1000,
          xp,
          totalExperience: user.experience
        };
      });

      await replyEmbed(interaction, outcome.title, outcome.message, {
        color: outcome.color,
        fields: [
          ...(outcome.coins ? [{ name: "Coins Earned", value: formatMoney(interaction, outcome.coins), inline: true }] : []),
          ...xpFields(interaction, outcome)
        ]
      });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("boost")
      .setDescription("View your active boosts."),
    async execute(interaction) {
      const activeBoosts = await withStore((store) => {
        const user = getUser(store, interaction.user.id);
        const boosts = [];
        const luckyCharm = getActiveBoost(user, "lucky_charm");

        if (luckyCharm) {
          boosts.push(`**${formatItem(interaction, "lucky_charm")}**\n+20% luck | ${formatDuration(luckyCharm - Date.now())} left`);
        }

        return boosts;
      });

      await replyEmbed(
        interaction,
        "Boosts",
        activeBoosts.length > 0 ? activeBoosts.join("\n\n") : "You do not have any active boosts.",
        { color: activeBoosts.length > 0 ? 0x57f287 : 0xfee75c }
      );
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("bank")
      .setDescription("View or upgrade your bank storage.")
      .addStringOption((option) =>
        option
          .setName("action")
          .setDescription("What to do.")
          .setRequired(false)
          .addChoices({ name: "Info", value: "info" }, { name: "Upgrade", value: "upgrade" })
      ),
    async execute(interaction) {
      const action = interaction.options.getString("action") || "info";
      const outcome = await withStore((store) => {
        const user = getUser(store, interaction.user.id);
        const current = getBankLevelInfo(user);
        const next = getNextBankLevelInfo(user);

        if (action === "upgrade") {
          if (!next) {
            return {
              title: "Bank Maxed",
              message: "Your bank is already level 10.",
              color: 0xfee75c,
              current,
              next,
              user
            };
          }

          if (user.wallet < current.upgradeCost) {
            return {
              title: "Bank Upgrade Failed",
              message: `You need ${formatMoney(interaction, current.upgradeCost)} in your wallet to upgrade to level ${next.level}.`,
              color: 0xed4245,
              current,
              next,
              user
            };
          }

          user.wallet -= current.upgradeCost;
          user.bankLevel = next.level;

          return {
            title: "Bank Upgraded",
            message: `Your bank is now level ${next.level} with ${formatCoins(next.capacity)} max storage.`,
            color: 0x57f287,
            current: next,
            next: getNextBankLevelInfo(user),
            user
          };
        }

        return {
          title: "Bank",
          message: "Your bank storage and defenses.",
          color: 0x5865f2,
          current,
          next,
          user
        };
      });

      const nextText = outcome.next
        ? `Level ${outcome.next.level}: ${formatCoins(outcome.next.capacity)} max\nUpgrade cost: ${formatMoney(interaction, outcome.current.upgradeCost)}`
        : "Max level reached.";

      await replyEmbed(interaction, outcome.title, outcome.message, {
        color: outcome.color,
        ephemeral: true,
        fields: [
          { name: "Storage", value: `${formatBankMoney(interaction, outcome.user.bank)} / ${formatCoins(outcome.current.capacity)}`, inline: true },
          { name: "Level", value: `${outcome.current.level} / ${bankLevels.length}`, inline: true },
          { name: "Next Upgrade", value: nextText, inline: true },
          { name: "Defenses", value: formatBankDefenses(interaction, outcome.user), inline: false }
        ]
      });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("deposit")
      .setDescription("Deposit wallet coins into the bank.")
      .addStringOption((option) =>
        option.setName("amount").setDescription("Amount to deposit, or all.").setRequired(true)
      ),
    async execute(interaction) {
      const rawAmount = interaction.options.getString("amount");
      const outcome = await withStore((store) => {
        const user = getUser(store, interaction.user.id);
        const bankSpace = getBankSpace(user);
        const requestedAmount = rawAmount.toLowerCase() === "all" ? user.wallet : Number.parseInt(rawAmount, 10);
        const amount = rawAmount.toLowerCase() === "all" ? Math.min(user.wallet, bankSpace) : requestedAmount;

        if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
          return {
            title: "Deposit Failed",
            message: "Enter a positive number or `all`.",
            color: 0xed4245
          };
        }

        if (requestedAmount > user.wallet) {
          return {
            title: "Deposit Failed",
            message: `You only have ${formatMoney(interaction, user.wallet)} in your wallet.`,
            color: 0xed4245
          };
        }

        if (bankSpace <= 0) {
          return {
            title: "Deposit Failed",
            message: `Your level ${getBankLevelInfo(user).level} bank is full. Use \`/bank action: Upgrade\` to raise the limit.`,
            color: 0xed4245
          };
        }

        if (requestedAmount > bankSpace) {
          return {
            title: "Deposit Failed",
            message: `Your bank only has room for ${formatBankMoney(interaction, bankSpace)}. Use \`/bank action: Upgrade\` to raise the limit.`,
            color: 0xed4245
          };
        }

        user.wallet -= amount;
        user.bank += amount;
        return {
          title: "Deposited",
          message: `Moved ${formatBankMoney(interaction, amount)} into your bank.`,
          color: 0x5865f2
        };
      });

      await replyEmbed(interaction, outcome.title, outcome.message, { color: outcome.color, ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("withdraw")
      .setDescription("Withdraw bank coins into your wallet.")
      .addIntegerOption((option) =>
        option.setName("amount").setDescription("Amount to withdraw.").setRequired(true).setMinValue(1)
      ),
    async execute(interaction) {
      const amount = interaction.options.getInteger("amount");
      const outcome = await withStore((store) => {
        const user = getUser(store, interaction.user.id);

        if (amount > user.bank) {
          return {
            title: "Withdraw Failed",
            message: `You only have ${formatMoney(interaction, user.bank)} in the bank.`,
            color: 0xed4245
          };
        }

        user.bank -= amount;
        user.wallet += amount;
        return {
          title: "Withdrew",
          message: `Moved ${formatMoney(interaction, amount)} into your wallet.`,
          color: 0x5865f2
        };
      });

      await replyEmbed(interaction, outcome.title, outcome.message, { color: outcome.color, ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("rob")
      .setDescription("Try to rob another user's wallet.")
      .addUserOption((option) =>
        option.setName("user").setDescription("User to rob.").setRequired(true)
      ),
    async execute(interaction) {
      const target = interaction.options.getUser("user");

      if (target.bot || target.id === interaction.user.id) {
        await replyEmbed(interaction, "Rob Failed", "Pick a real target who is not you.", {
          color: 0xed4245
        });
        return;
      }

      const outcome = await withStore((store) => {
        const robber = getUser(store, interaction.user.id);
        const victim = getUser(store, target.id);
        const cooldown = getCooldown(robber.lastRob, ROB_COOLDOWN);

        if (cooldown) {
          return {
            title: "Rob Cooldown",
            message: `Lay low for ${cooldown} before trying that again.`,
            color: 0xfee75c
          };
        }

        if (victim.wallet < 250) {
          return {
            title: "Rob Failed",
            message: `${target.username} is too broke to rob right now.`,
            color: 0xed4245
          };
        }

        robber.lastRob = Date.now();

        if (Math.random() < 0.45) {
          const stolen = randomInt(50, Math.max(50, Math.floor(victim.wallet * 0.45)));
          const xp = addExperience(robber, 8, 15);
          victim.wallet -= stolen;
          robber.wallet += stolen;
          return {
            title: "Robbery Worked",
            message: `Success. You robbed ${target.username} for ${formatMoney(interaction, stolen)}.`,
            color: 0x57f287,
            coins: stolen,
            xp,
            totalExperience: robber.experience
          };
        }

        const fine = payFromWalletThenBank(robber, randomInt(75, 350));
        const xp = addExperience(robber, 2, 5);
        victim.wallet += fine;

        return {
          title: "Caught",
          message: `You got caught and paid ${target.username} ${formatMoney(interaction, fine)}.`,
          color: 0xed4245,
          coins: fine,
          xp,
          totalExperience: robber.experience
        };
      });

      await replyEmbed(interaction, outcome.title, outcome.message, {
        color: outcome.color,
        fields: [
          ...(outcome.coins ? [{ name: "Coins Moved", value: formatMoney(interaction, outcome.coins), inline: true }] : []),
          ...xpFields(interaction, outcome)
        ]
      });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("bankrob")
      .setDescription("Try to steal from another user's bank.")
      .addUserOption((option) =>
        option.setName("user").setDescription("User to bankrob.").setRequired(true)
      ),
    async execute(interaction) {
      const target = interaction.options.getUser("user");

      if (target.bot || target.id === interaction.user.id) {
        await replyEmbed(interaction, "Bankrob Failed", "Pick a real target who is not you.", {
          color: 0xed4245
        });
        return;
      }

      const outcome = await withStore((store) => {
        const robber = getUser(store, interaction.user.id);
        const victim = getUser(store, target.id);
        const cooldown = getCooldown(robber.lastBankrob, BANKROB_COOLDOWN);

        if (cooldown) {
          return {
            title: "Bankrob Cooldown",
            message: `The bank is still looking for you. Try again in ${cooldown}.`,
            color: 0xfee75c
          };
        }

        if (victim.bank < 1000) {
          return {
            title: "Bankrob Failed",
            message: `${target.username}'s bank is not worth the paperwork right now.`,
            color: 0xed4245
          };
        }

        robber.lastBankrob = Date.now();
        const successChance = getBankrobSuccessChance(victim);
        const alarm = consumeSpecificDefense(victim, "alarm");
        const roll = Math.random();

        if (roll < successChance) {
          const stolen = randomInt(150, Math.max(150, Math.floor(victim.bank * 0.35)));
          const xp = addExperience(robber, 18, 35);
          victim.bank -= stolen;
          robber.wallet += stolen;

          return {
            title: "Bankrob Worked",
            message: `You cracked the bank vibes and stole ${formatBankMoney(interaction, stolen)} from ${target.username}.`,
            color: 0x57f287,
            coins: stolen,
            alarm,
            successChance,
            xp,
            totalExperience: robber.experience
          };
        }

        if (roll < BANKROB_BASE_SUCCESS_CHANCE) {
          const defense = consumeTriggeredDefense(victim);

          if (defense) {
            const fine = payFromWalletThenBank(robber, randomInt(350, 1250));
            const xp = addExperience(robber, 3, 8);
            const burnedItemId = defense.effect === "burn_item" ? removeRandomInventoryItem(robber) : null;
            victim.wallet += fine;

            return {
              title: "Bankrob Blocked",
              message: `${target.username}'s ${formatItem(interaction, defense.itemId)} stopped the bankrob. You paid ${target.username} ${formatMoney(interaction, fine)}.${burnedItemId ? ` Your ${formatItem(interaction, burnedItemId)} was burned by the laser grid.` : ""}${defense.consumed ? " The defense was used up." : ""}`,
              color: 0xed4245,
              coins: fine,
              alarm,
              burnedItemId,
              defenseId: defense.itemId,
              defenseConsumed: defense.consumed,
              successChance,
              xp,
              totalExperience: robber.experience
            };
          }
        }

        const fine = payFromWalletThenBank(robber, randomInt(250, 900));
        const xp = addExperience(robber, 3, 8);
        victim.wallet += fine;

        return {
          title: "Bankrob Failed",
          message: `You got caught and paid ${target.username} ${formatMoney(interaction, fine)}.`,
          color: 0xed4245,
          coins: fine,
          alarm,
          successChance,
          xp,
          totalExperience: robber.experience
        };
      });

      const fields = [
        ...(outcome.coins ? [{ name: "Coins Moved", value: formatMoney(interaction, outcome.coins), inline: true }] : []),
        ...(typeof outcome.successChance === "number" ? [{ name: "Success Chance", value: `${Math.round(outcome.successChance * 100)}%`, inline: true }] : []),
        ...(outcome.defenseId ? [{ name: "Defense", value: `${formatItem(interaction, outcome.defenseId)}${outcome.defenseConsumed ? " used up" : " held"}`, inline: true }] : []),
        ...(outcome.burnedItemId ? [{ name: "Item Burned", value: formatItem(interaction, outcome.burnedItemId), inline: true }] : []),
        ...(outcome.alarm ? [{ name: "Alarm", value: `${target.username} was alerted that ${interaction.user.username} tried a bankrob.${outcome.alarm.consumed ? " Alarm used up." : ""}`, inline: false }] : []),
        ...xpFields(interaction, outcome)
      ];

      await interaction.reply({
        ...(outcome.alarm ? { content: `<@${target.id}> Bank alarm: ${interaction.user.username} tried to rob your bank.` } : {}),
        embeds: [makeEmbed(interaction, outcome.title, outcome.message, { color: outcome.color, fields })],
        allowedMentions: outcome.alarm ? { users: [target.id] } : { parse: [] }
      });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("scanbank")
      .setDescription("Use a Hack Device to scan another user's bank defenses.")
      .addUserOption((option) =>
        option.setName("user").setDescription("User to scan.").setRequired(true)
      ),
    async execute(interaction) {
      const target = interaction.options.getUser("user");

      if (target.bot) {
        await replyEmbed(interaction, "Scan Failed", "Pick a real user to scan.", {
          color: 0xed4245
        });
        return;
      }

      const outcome = await withStore((store) => {
        const scanner = getUser(store, interaction.user.id);
        const targetUser = getUser(store, target.id);

        if (!removeItem(scanner, "hackdevice")) {
          return {
            title: "Scan Failed",
            message: `You need ${formatItem(interaction, "hackdevice")} to scan bank defenses.`,
            color: 0xed4245
          };
        }

        const defenses = getBankDefenseEntries(targetUser);
        return {
          title: "Bank Scan Complete",
          message: defenses.length > 0
            ? `Detected defenses on ${target.username}'s bank.`
            : `${target.username}'s bank has no installed defenses.`,
          color: defenses.length > 0 ? 0x57f287 : 0xfee75c,
          targetUser
        };
      });

      await replyEmbed(interaction, outcome.title, outcome.message, {
        color: outcome.color,
        ephemeral: true,
        fields: outcome.targetUser ? [
          { name: "Defenses", value: formatBankDefenses(interaction, outcome.targetUser), inline: false }
        ] : []
      });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("voiddefense")
      .setDescription("Use a Void to remove one random bank defense from a user.")
      .addUserOption((option) =>
        option.setName("user").setDescription("User whose bank defense you want to remove.").setRequired(true)
      ),
    async execute(interaction) {
      const target = interaction.options.getUser("user");

      if (target.bot || target.id === interaction.user.id) {
        await replyEmbed(interaction, "Void Failed", "Pick a real target who is not you.", {
          color: 0xed4245
        });
        return;
      }

      const outcome = await withStore((store) => {
        const attacker = getUser(store, interaction.user.id);
        const victim = getUser(store, target.id);

        if (!removeItem(attacker, "void")) {
          return {
            title: "Void Failed",
            message: `You need ${formatItem(interaction, "void")} to remove a bank defense.`,
            color: 0xed4245
          };
        }

        const removed = removeRandomBankDefense(victim);
        if (!removed) {
          return {
            title: "Void Fizzled",
            message: `${target.username}'s bank had no defenses to remove. The ${formatItem(interaction, "void")} collapsed anyway.`,
            color: 0xfee75c
          };
        }

        return {
          title: "Defense Voided",
          message: `Removed one ${formatItem(interaction, removed.itemId)} from ${target.username}'s bank defenses.`,
          color: 0x57f287,
          removedId: removed.itemId,
          victim
        };
      });

      await replyEmbed(interaction, outcome.title, outcome.message, {
        color: outcome.color,
        ephemeral: true,
        fields: [
          ...(outcome.removedId ? [{ name: "Removed", value: formatItem(interaction, outcome.removedId), inline: true }] : []),
          ...(outcome.victim ? [{ name: "Remaining Defenses", value: formatBankDefenses(interaction, outcome.victim), inline: false }] : [])
        ]
      });
    }
  },
  {
    data: new SlashCommandBuilder().setName("hunt").setDescription("Go hunting for random items."),
    async execute(interaction) {
      const outcome = await withStore((store) => {
        const user = getUser(store, interaction.user.id);
        const cooldown = getCooldown(user.lastHunt, HUNT_COOLDOWN);

        if (cooldown) {
          return {
            title: "Hunt Cooldown",
            message: `Give the wilderness ${cooldown} to restock.`,
            color: 0xfee75c
          };
        }

        user.lastHunt = Date.now();
        const xp = addExperience(user, 4, 10);
        const luckMultiplier = getLuckMultiplier(user);
        const failChance = luckMultiplier > 1 ? 0.12 : 0.2;

        if (Math.random() < failChance) {
          return {
            title: "Hunt Failed",
            message: "You found nothing except character development.",
            color: 0xed4245,
            xp,
            totalExperience: user.experience
          };
        }

        const item = pickWeightedItem(luckMultiplier);
        addItem(user, item.id);

        return {
          title: "Hunt Complete",
          message: `You found ${formatItem(interaction, item.id)}.`,
          color: 0x57f287,
          itemId: item.id,
          luckMultiplier,
          xp,
          totalExperience: user.experience
        };
      });

      await replyEmbed(interaction, outcome.title, outcome.message, {
        color: outcome.color,
        fields: [
          ...(outcome.itemId ? [{ name: "Item Found", value: formatItem(interaction, outcome.itemId), inline: true }] : []),
          ...(outcome.luckMultiplier > 1 ? [{ name: "Boost", value: "+20% luck", inline: true }] : []),
          ...xpFields(interaction, outcome)
        ]
      });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("inventory")
      .setDescription("View your items.")
      .addUserOption((option) =>
        option.setName("user").setDescription("User to inspect.").setRequired(false)
      ),
    async execute(interaction) {
      const target = interaction.options.getUser("user") || interaction.user;
      await replyInventoryMenu(interaction, target);
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("use")
      .setDescription("Use an item from your inventory.")
      .addStringOption((option) =>
        option
          .setName("item")
          .setDescription("Item to use.")
          .setRequired(true)
          .addChoices(...itemChoices(false))
      ),
    async execute(interaction) {
      const itemId = interaction.options.getString("item");
      const outcome = await withStore((store) => {
        const user = getUser(store, interaction.user.id);
        return useInventoryItem(interaction, user, itemId);
      });

      await replyEmbed(interaction, outcome.title, outcome.message, {
        color: outcome.color,
        ephemeral: outcome.ephemeral || false,
        fields: [
          ...(outcome.coins ? [{ name: outcome.coinsLabel || "Coins", value: formatMoney(interaction, outcome.coins), inline: true }] : []),
          ...(outcome.itemId ? [{ name: "Item Found", value: formatItem(interaction, outcome.itemId), inline: true }] : []),
          ...(outcome.defenseId ? [{ name: "Defense Installed", value: formatItem(interaction, outcome.defenseId), inline: true }] : []),
          ...xpFields(interaction, outcome)
        ]
      });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("sell")
      .setDescription("Sell an item from your inventory.")
      .addStringOption((option) =>
        option
          .setName("item")
          .setDescription("Item number, id, or name to sell.")
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option.setName("amount").setDescription("Amount to sell.").setRequired(false).setMinValue(1)
      ),
    async execute(interaction) {
      const itemInput = interaction.options.getString("item");
      const itemId = resolveItemId(itemInput);
      const amount = interaction.options.getInteger("amount") || 1;
      const item = itemById.get(itemId);

      const outcome = await withStore((store) => {
        const user = getUser(store, interaction.user.id);

        if (!item) {
          return {
            title: "Sell Failed",
            message: `That item does not exist. Try using the number shown in \`/inventory\`, like \`/sell item: 3\`.`,
            color: 0xed4245
          };
        }

        if (!removeItem(user, itemId, amount)) {
          return {
            title: "Sell Failed",
            message: `You do not have ${amount.toLocaleString()} ${item.name}.`,
            color: 0xed4245
          };
        }

        const coins = item.sellValue * amount;
        const xp = addExperience(user, 1, 4);
        user.wallet += coins;

        return {
          title: "Item Sold",
          message: `Sold ${formatItem(interaction, itemId, amount)} for ${formatMoney(interaction, coins)}.`,
          color: 0x57f287,
          coins,
          xp,
          totalExperience: user.experience
        };
      });

      await replyEmbed(interaction, outcome.title, outcome.message, {
        color: outcome.color,
        fields: [
          ...(outcome.coins ? [{ name: "Coins Earned", value: formatMoney(interaction, outcome.coins), inline: true }] : []),
          ...xpFields(interaction, outcome)
        ]
      });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("give")
      .setDescription("Give coins or an item to another user.")
      .addUserOption((option) =>
        option.setName("user").setDescription("User to give to.").setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("type")
          .setDescription("What you are giving.")
          .setRequired(true)
          .addChoices({ name: "Coins", value: "coins" }, { name: "Item", value: "item" })
      )
      .addIntegerOption((option) =>
        option.setName("amount").setDescription("Amount to give.").setRequired(true).setMinValue(1)
      )
      .addStringOption((option) =>
        option
          .setName("item")
          .setDescription("Item number, id, or name to give if type is Item.")
          .setRequired(false)
      ),
    async execute(interaction) {
      const target = interaction.options.getUser("user");
      const type = interaction.options.getString("type");
      const amount = interaction.options.getInteger("amount");
      const itemInput = interaction.options.getString("item");
      const itemId = resolveItemId(itemInput);

      if (target.bot || target.id === interaction.user.id) {
        await replyEmbed(interaction, "Give Failed", "Pick a real target who is not you.", {
          color: 0xed4245
        });
        return;
      }

      const outcome = await withStore((store) => {
        const giver = getUser(store, interaction.user.id);
        const receiver = getUser(store, target.id);
        const cooldown = getCooldown(giver.lastGive, GIVE_COOLDOWN);

        if (cooldown) {
          return {
            title: "Give Cooldown",
            message: `Wait ${cooldown} before giving again.`,
            color: 0xfee75c
          };
        }

        if (type === "coins") {
          if (amount > giver.wallet) {
            return {
              title: "Give Failed",
              message: `You only have ${formatMoney(interaction, giver.wallet)} in your wallet.`,
              color: 0xed4245
            };
          }

          giver.wallet -= amount;
          receiver.wallet += amount;
          giver.lastGive = Date.now();

          return {
            title: "Coins Given",
            message: `You gave ${target.username} ${formatMoney(interaction, amount)}.`,
            color: 0x57f287,
            coins: amount
          };
        }

        if (!itemId) {
          return {
            title: "Give Failed",
            message: "Choose an item when giving item type.",
            color: 0xed4245
          };
        }

        const item = itemById.get(itemId);

        if (!item) {
          return {
            title: "Give Failed",
            message: "That item does not exist. Try using the number shown in `/inventory`.",
            color: 0xed4245
          };
        }

        if (!removeItem(giver, itemId, amount)) {
          return {
            title: "Give Failed",
            message: `You do not have ${formatItem(interaction, itemId, amount)}.`,
            color: 0xed4245
          };
        }

        addItem(receiver, itemId, amount);
        giver.lastGive = Date.now();

        return {
          title: "Item Given",
          message: `You gave ${target.username} ${formatItem(interaction, itemId, amount)}.`,
          color: 0x57f287,
          itemId,
          amount
        };
      });

      await replyEmbed(interaction, outcome.title, outcome.message, {
        color: outcome.color,
        fields: [
          ...(outcome.coins ? [{ name: "Coins Given", value: formatMoney(interaction, outcome.coins), inline: true }] : []),
          ...(outcome.itemId ? [{ name: "Item Given", value: formatItem(interaction, outcome.itemId, outcome.amount), inline: true }] : [])
        ]
      });
    }
  },
  {
    data: new SlashCommandBuilder().setName("items").setDescription("View the item list."),
    async execute(interaction) {
      const lines = items.map((item) => {
        const itemNumber = itemNumberById.get(item.id);
        const tags = [
          item.usable ? "usable" : null,
          `sell value ${formatMoney(interaction, item.sellValue)}`
        ].filter(Boolean);
        return `**#${itemNumber} ${formatItem(interaction, item.id)}**\n${item.description}\n${tags.join(" | ")}`;
      });

      await replyPagedMenu(interaction, {
        id: "items",
        title: "Items",
        rows: lines,
        emptyText: "No items exist yet.",
        color: 0x5865f2
      });
    }
  },
  {
    data: new SlashCommandBuilder().setName("shop").setDescription("View the shop."),
    async execute(interaction) {
      const rows = shopItems.map((shopItem) => {
        const item = itemById.get(shopItem.itemId);
        return `**${formatItem(interaction, shopItem.itemId)}**\n${item?.description || "No description."}\nPrice: ${formatMoney(interaction, shopItem.price)}`;
      });

      await replyPagedMenu(interaction, {
        id: "shop",
        title: "Shop",
        rows,
        emptyText: "The shop is empty right now. Very exclusive. Suspiciously exclusive.",
        color: 0xfee75c
      });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("buy")
      .setDescription("Buy an item from the shop.")
      .addStringOption((option) =>
        option
          .setName("item")
          .setDescription("Shop item to buy.")
          .setRequired(true)
          .addChoices(...shopChoices())
      ),
    async execute(interaction) {
      const itemId = interaction.options.getString("item");
      const shopItem = shopItems.find((entry) => entry.itemId === itemId);

      const outcome = await withStore((store) => {
        const user = getUser(store, interaction.user.id);

        if (!shopItem) {
          return {
            title: "Purchase Failed",
            message: "That item is not in the shop.",
            color: 0xed4245
          };
        }

        if (!bankDefenseItems[itemId] && !["hackdevice", "void"].includes(itemId) && (user.inventory?.[itemId] || 0) > 0) {
          return {
            title: "Purchase Failed",
            message: `You already own ${formatItem(interaction, itemId)}.`,
            color: 0xed4245
          };
        }

        if (user.wallet < shopItem.price) {
          return {
            title: "Purchase Failed",
            message: `You need ${formatMoney(interaction, shopItem.price)} in your wallet.`,
            color: 0xed4245
          };
        }

        user.wallet -= shopItem.price;
        addItem(user, itemId);

        return {
          title: "Purchase Complete",
          message: `Bought ${formatItem(interaction, itemId)} for ${formatMoney(interaction, shopItem.price)}.`,
          color: 0x57f287,
          itemId
        };
      });

      await replyEmbed(interaction, outcome.title, outcome.message, {
        color: outcome.color,
        fields: outcome.itemId ? [{ name: "Item", value: formatItem(interaction, outcome.itemId), inline: true }] : []
      });
    }
  },
  {
    data: new SlashCommandBuilder().setName("mine").setDescription("Mine for ores with your best pickaxe."),
    async execute(interaction) {
      const outcome = await withStore((store) => {
        const user = getUser(store, interaction.user.id);
        const cooldown = getCooldown(user.lastMine, MINE_COOLDOWN);

        if (cooldown) {
          return {
            title: "Mine Cooldown",
            message: `Your pickaxe needs ${cooldown} to stop vibrating.`,
            color: 0xfee75c
          };
        }

        const pickaxe = getBestPickaxe(user);
        const luckMultiplier = getLuckMultiplier(user);
        const rolls = pickaxe.tier >= 5 ? randomInt(3, 7) : pickaxe.tier >= 3 ? randomInt(1, 4) : 1;
        const drops = {};
        const xp = addExperience(user, 5 + pickaxe.tier, 10 + pickaxe.tier * 2);

        user.lastMine = Date.now();

        for (let index = 0; index < rolls; index += 1) {
          const dropId = pickWeightedDrop(mineDropTables[pickaxe.id], luckMultiplier);
          drops[dropId] = (drops[dropId] || 0) + 1;
          addItem(user, dropId);
        }

        const dropText = Object.entries(drops)
          .map(([itemId, quantity]) => formatItem(interaction, itemId, quantity))
          .join("\n");

        return {
          title: "Mine Complete",
          message: `You mined with ${formatItem(interaction, pickaxe.id)} and found:\n${dropText}`,
          color: 0x57f287,
          pickaxeId: pickaxe.id,
          drops,
          luckMultiplier,
          xp,
          totalExperience: user.experience
        };
      });

      await replyEmbed(interaction, outcome.title, outcome.message, {
        color: outcome.color,
        fields: [
          ...(outcome.pickaxeId ? [{ name: "Pickaxe", value: formatItem(interaction, outcome.pickaxeId), inline: true }] : []),
          ...(outcome.luckMultiplier > 1 ? [{ name: "Boost", value: "+20% luck", inline: true }] : []),
          ...(outcome.drops ? [{
            name: "Drops",
            value: Object.entries(outcome.drops).map(([itemId, quantity]) => formatItem(interaction, itemId, quantity)).join("\n"),
            inline: true
          }] : []),
          ...xpFields(interaction, outcome)
        ]
      });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("blackjack")
      .setDescription("Play blackjack with Hit and Stand buttons.")
      .addIntegerOption((option) =>
        option.setName("amount").setDescription("Amount to bet.").setRequired(true).setMinValue(1)
      ),
    async execute(interaction) {
      const rawAmount = interaction.options.getInteger("amount");
      const start = await withStore((store) => {
        const user = getUser(store, interaction.user.id);
        const bet = clampBet(rawAmount, user.wallet);

        if (!bet.ok) {
          return {
            ok: false,
            title: "Blackjack Failed",
            message: bet.message,
            color: 0xed4245
          };
        }

        user.wallet -= bet.amount;
        return { ok: true, bet: bet.amount };
      });

      if (!start.ok) {
        await replyEmbed(interaction, start.title, start.message, { color: start.color });
        return;
      }

      const game = {
        deck: createDeck(),
        hands: [],
        dealerHand: [],
        activeHandIndex: 0,
        finished: false,
        title: "Blackjack",
        message: "Choose Hit or Stand.",
        color: 0x5865f2
      };
      game.hands.push({
        cards: [drawCard(game.deck), drawCard(game.deck)],
        bet: start.bet,
        done: false,
        blackjack: false,
        doubled: false
      });
      game.dealerHand.push(drawCard(game.deck));
      await withStore((store) => {
        const user = getUser(store, interaction.user.id);
        const rig = consumeRig(user, "blackjack");

        if (rig?.outcome === "blackjack" || rig?.outcome === "win") {
          game.hands[0].cards = [{ rank: "A" }, { rank: "K" }];
          game.dealerHand = [{ rank: "9" }];
        }

        if (rig?.outcome === "lose") {
          game.hands[0].cards = [{ rank: "10" }, { rank: "9" }];
          game.dealerHand = [{ rank: "A" }];
        }
      });

      game.hands[0].blackjack = getHandValue(game.hands[0].cards) === 21;

      if (game.hands[0].blackjack) {
        game.hands[0].done = true;
        await finishBlackjack(interaction, game, "blackjack");
      }

      await interaction.reply({
        embeds: [makeBlackjackEmbed(interaction, game)],
        components: makeBlackjackButtons(game, game.finished)
      });
      const message = await interaction.fetchReply();

      if (game.finished) return;

      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60 * 1000
      });

      collector.on("collect", async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
          await buttonInteraction.reply({
            content: "This blackjack table is not yours.",
            ephemeral: true
          });
          return;
        }

        const activeHand = game.hands[game.activeHandIndex];

        if (buttonInteraction.customId === "blackjack_hit") {
          activeHand.cards.push(drawCard(game.deck));

          if (getHandValue(activeHand.cards) >= 21) {
            activeHand.done = true;
          } else {
            game.message = "You took a card. Hit or Stand?";
          }
        }

        if (buttonInteraction.customId === "blackjack_stand") {
          activeHand.done = true;
          game.message = "You stood.";
        }

        if (buttonInteraction.customId === "blackjack_double") {
          const doubled = await withStore((store) => {
            const user = getUser(store, interaction.user.id);
            if (user.wallet < activeHand.bet) return false;
            user.wallet -= activeHand.bet;
            return true;
          });

          if (!doubled) {
            await buttonInteraction.reply({
              content: `You need another ${formatMoney(interaction, activeHand.bet)} in your wallet to double down.`,
              ephemeral: true
            });
            return;
          }

          activeHand.bet *= 2;
          activeHand.doubled = true;
          activeHand.cards.push(drawCard(game.deck));
          activeHand.done = true;
          game.message = "You doubled down and took one final card.";
        }

        if (buttonInteraction.customId === "blackjack_split") {
          const splitPaid = await withStore((store) => {
            const user = getUser(store, interaction.user.id);
            if (user.wallet < activeHand.bet) return false;
            user.wallet -= activeHand.bet;
            return true;
          });

          if (!splitPaid) {
            await buttonInteraction.reply({
              content: `You need another ${formatMoney(interaction, activeHand.bet)} in your wallet to split.`,
              ephemeral: true
            });
            return;
          }

          const [firstCard, secondCard] = activeHand.cards;
          game.hands = [
            {
              cards: [firstCard, drawCard(game.deck)],
              bet: activeHand.bet,
              done: false,
              blackjack: false,
              doubled: false
            },
            {
              cards: [secondCard, drawCard(game.deck)],
              bet: activeHand.bet,
              done: false,
              blackjack: false,
              doubled: false
            }
          ];
          game.activeHandIndex = 0;
          game.message = "You split into two hands. Play Hand 1.";
        }

        while (game.hands[game.activeHandIndex]?.done && game.activeHandIndex < game.hands.length - 1) {
          game.activeHandIndex += 1;
          game.message = `Now playing Hand ${game.activeHandIndex + 1}.`;
        }

        if (game.hands.every((hand) => hand.done)) {
          await finishBlackjack(interaction, game, "stand");
          collector.stop("finished");
        }

        await buttonInteraction.update({
          embeds: [makeBlackjackEmbed(interaction, game)],
          components: makeBlackjackButtons(game, game.finished)
        });
      });

      collector.on("end", async (_collected, reason) => {
        if (game.finished || reason === "finished") return;

        await finishBlackjack(interaction, game, "stand");
        game.message = `${game.message}\nTimed out, so you stood automatically.`;

        await message.edit({
          embeds: [makeBlackjackEmbed(interaction, game)],
          components: makeBlackjackButtons(game, true)
        });
      });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("gamble")
      .setDescription("Risk wallet coins for a chance to win.")
      .addIntegerOption((option) =>
        option.setName("amount").setDescription("Amount to gamble.").setRequired(true).setMinValue(1)
      ),
    async execute(interaction) {
      const rawAmount = interaction.options.getInteger("amount");
      const outcome = await withStore((store) => {
        const user = getUser(store, interaction.user.id);
        const bet = clampBet(rawAmount, user.wallet);

        if (!bet.ok) {
          return {
            title: "Gamble Failed",
            message: bet.message,
            color: 0xed4245
          };
        }

        user.wallet -= bet.amount;
        const rig = consumeRig(user, "gamble");
        const roll = rig?.outcome === "win" || rig?.outcome === "blackjack" ? 0.75 : rig?.outcome === "lose" ? 0.1 : Math.random();

        const multiplier = roll > 0.92 ? 3 : 2;
        const payout = bet.amount * multiplier;

        if (roll < 0.47) {
          const xp = addExperience(user, 2, 5);
          return {
            title: "Gamble Lost",
            message: pickMessage(gambleLoseMessages, { bet: formatMoney(interaction, bet.amount) }),
            color: 0xed4245,
            coins: bet.amount,
            xp,
            totalExperience: user.experience
          };
        }

        const xp = addExperience(user, 5, 12);
        user.wallet += payout;

        return {
          title: "Gamble Won",
          message: pickMessage(gambleWinMessages, {
            payout: formatMoney(interaction, payout),
            multiplier
          }),
          color: 0x57f287,
          coins: payout,
          xp,
          totalExperience: user.experience
        };
      });

      await replyEmbed(interaction, outcome.title, outcome.message, {
        color: outcome.color,
        fields: [
          ...(outcome.coins ? [{ name: "Coins", value: formatMoney(interaction, outcome.coins), inline: true }] : []),
          ...xpFields(interaction, outcome)
        ]
      });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("coinflip")
      .setDescription("Bet on heads or tails.")
      .addStringOption((option) =>
        option
          .setName("choice")
          .setDescription("Heads or tails.")
          .setRequired(true)
          .addChoices({ name: "Heads", value: "heads" }, { name: "Tails", value: "tails" })
      )
      .addIntegerOption((option) =>
        option.setName("amount").setDescription("Amount to bet.").setRequired(true).setMinValue(1)
      ),
    async execute(interaction) {
      const choice = interaction.options.getString("choice");
      const rawAmount = interaction.options.getInteger("amount");
      const outcome = await withStore((store) => {
        const user = getUser(store, interaction.user.id);
        const bet = clampBet(rawAmount, user.wallet);

        if (!bet.ok) {
          return {
            title: "Coinflip Failed",
            message: bet.message,
            color: 0xed4245
          };
        }

        const rig = consumeRig(user, "coinflip");
        const result =
          rig?.outcome === "win" || rig?.outcome === "blackjack"
            ? choice
            : rig?.outcome === "lose"
              ? choice === "heads" ? "tails" : "heads"
              : Math.random() < 0.5 ? "heads" : "tails";
        user.wallet -= bet.amount;

        if (choice === result) {
          const payout = bet.amount * 2;
          const xp = addExperience(user, 4, 9);
          user.wallet += payout;
          return {
            title: "Coinflip Won",
            message: pickMessage(coinflipWinMessages, {
              result,
              payout: formatMoney(interaction, payout)
            }),
            color: 0x57f287,
            coins: payout,
            xp,
            totalExperience: user.experience
          };
        }

        const xp = addExperience(user, 1, 4);
        return {
          title: "Coinflip Lost",
          message: pickMessage(coinflipLoseMessages, {
            result,
            bet: formatMoney(interaction, bet.amount)
          }),
          color: 0xed4245,
          coins: bet.amount,
          xp,
          totalExperience: user.experience
        };
      });

      await replyEmbed(interaction, outcome.title, outcome.message, {
        color: outcome.color,
        fields: [
          ...(outcome.coins ? [{ name: "Coins", value: formatMoney(interaction, outcome.coins), inline: true }] : []),
          ...xpFields(interaction, outcome)
        ]
      });
    }
  },
  {
    data: new SlashCommandBuilder().setName("leaderboard").setDescription("Show the richest users."),
    async execute(interaction) {
      const leaders = await withStore((store) =>
        Object.entries(store.users)
          .map(([userId, user]) => ({
            userId,
            netWorth: getNetWorth(user),
            experience: user.experience
          }))
          .sort((a, b) => b.netWorth - a.netWorth)
          .slice(0, 10)
      );

      if (leaders.length === 0) {
        await replyEmbed(interaction, "Leaderboard", "No economy data yet. Go make questionable financial decisions.", {
          color: 0xfee75c
        });
        return;
      }

      const lines = leaders.map(
        (entry, index) =>
          `${index + 1}. <@${entry.userId}> - ${formatMoney(interaction, entry.netWorth)} | ${formatExperience(interaction, entry.experience)}`
      );

      await replyEmbed(interaction, "Leaderboard", lines.join("\n"), {
        color: 0xf1c40f
      });
    }
  }
];

module.exports = {
  commands
};
