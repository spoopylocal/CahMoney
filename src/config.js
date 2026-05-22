require("dotenv").config();

const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  dataDir: process.env.DATA_DIR || "data",
  mongodbUri: process.env.MONGODB_URI || process.env.MONGODB || null,
  mongodbDb: process.env.MONGODB_DB || "economybot",
  mongodbCollection: process.env.MONGODB_COLLECTION || "users",
  adminHost: process.env.ADMIN_HOST || "127.0.0.1",
  adminPort: process.env.ADMIN_PORT ? Number.parseInt(process.env.ADMIN_PORT, 10) : null,
  adminToken: process.env.ADMIN_TOKEN || null,
  moneyEmoji: process.env.MONEY_EMOJI || null,
  bankEmoji: process.env.BANK_EMOJI || null,
  expEmoji: process.env.EXP_EMOJI || null,
  itemEmojis: {
    xp_potion: process.env.ITEM_XP_POTION_EMOJI || null,
    cash_potion: process.env.ITEM_CASH_POTION_EMOJI || null,
    dirt: process.env.ITEM_DIRT_EMOJI || null,
    lucky_charm: process.env.ITEM_LUCKY_CHARM_EMOJI || null,
    broken_phone: process.env.ITEM_BROKEN_PHONE_EMOJI || null,
    rubber_duck: process.env.ITEM_RUBBER_DUCK_EMOJI || null,
    gold_ring: process.env.ITEM_GOLD_RING_EMOJI || null,
    mystery_block: process.env.ITEM_MYSTERY_BLOCK_EMOJI || null,
    fake_id: process.env.ITEM_FAKE_ID_EMOJI || null,
    shiny_rock: process.env.ITEM_SHINY_ROCK_EMOJI || null,
    wooden_pickaxe: process.env.ITEM_WOODEN_PICKAXE_EMOJI || null,
    stone_pickaxe: process.env.ITEM_STONE_PICKAXE_EMOJI || null,
    iron_pickaxe: process.env.ITEM_IRON_PICKAXE_EMOJI || null,
    gold_pickaxe: process.env.ITEM_GOLD_PICKAXE_EMOJI || null,
    diamond_pickaxe: process.env.ITEM_DIAMOND_PICKAXE_EMOJI || null,
    netherite_pickaxe: process.env.ITEM_NETHERITE_PICKAXE_EMOJI || null,
    cobblestone: process.env.ITEM_COBBLESTONE_EMOJI || null,
    coal: process.env.ITEM_COAL_EMOJI || null,
    iron: process.env.ITEM_IRON_EMOJI || null,
    raw_gold: process.env.ITEM_RAW_GOLD_EMOJI || null,
    redstone: process.env.ITEM_REDSTONE_EMOJI || null,
    diamond: process.env.ITEM_DIAMOND_EMOJI || null,
    emerald: process.env.ITEM_EMERALD_EMOJI || null,
    end_stone: process.env.ITEM_END_STONE_EMOJI || null,
    netherite_ingot: process.env.ITEM_NETHERITE_INGOT_EMOJI || null,
    ruby: process.env.ITEM_RUBY_EMOJI || null,
    pebble: process.env.ITEM_PEBBLE_EMOJI || null,
    fries: process.env.ITEM_FRIES_EMOJI || null,
    crown: process.env.ITEM_CROWN_EMOJI || null,
    cd: process.env.ITEM_CD_EMOJI || null,
    burger: process.env.ITEM_BURGER_EMOJI || null,
    boots: process.env.ITEM_BOOTS_EMOJI || null,
    laser_grid: process.env.ITEM_LASER_GRID_EMOJI || null,
    land_mine: process.env.ITEM_LAND_MINE_EMOJI || null,
    guard: process.env.ITEM_GUARD_EMOJI || null,
    alarm: process.env.ITEM_ALARM_EMOJI || null,
    hackdevice: process.env.ITEM_HACKDEVICE_EMOJI || null,
    void: process.env.ITEM_VOID_EMOJI || null,
    businesscard: process.env.ITEM_BUSINESSCARD_EMOJI || null,
    watermelon: process.env.ITEM_WATERMELON_EMOJI || null,
    toco: process.env.ITEM_TOCO_EMOJI || null,
    smirkcat: process.env.ITEM_SMIRKCAT_EMOJI || null,
    rufus: process.env.ITEM_RUFUS_EMOJI || null,
    orange: process.env.ITEM_ORANGE_EMOJI || null,
    meat: process.env.ITEM_MEAT_EMOJI || null,
    lizard: process.env.ITEM_LIZARD_EMOJI || null,
    geckodragon: process.env.ITEM_GECKODRAGON_EMOJI || null,
    funnydog: process.env.ITEM_FUNNYDOG_EMOJI || null,
    crunch: process.env.ITEM_CRUNCH_EMOJI || null,
    croissant: process.env.ITEM_CROISSANT_EMOJI || null,
    cat: process.env.ITEM_CAT_EMOJI || null,
    beans: process.env.ITEM_BEANS_EMOJI || null,
    basicdog: process.env.ITEM_BASICDOG_EMOJI || null
  },
  cardEmojis: {
    1: process.env.CARD_1_EMOJI || null,
    2: process.env.CARD_2_EMOJI || null,
    3: process.env.CARD_3_EMOJI || null,
    4: process.env.CARD_4_EMOJI || null,
    5: process.env.CARD_5_EMOJI || null,
    6: process.env.CARD_6_EMOJI || null,
    7: process.env.CARD_7_EMOJI || null,
    8: process.env.CARD_8_EMOJI || null,
    9: process.env.CARD_9_EMOJI || null,
    ace: process.env.CARD_ACE_EMOJI || null,
    king: process.env.CARD_KING_EMOJI || null,
    queen: process.env.CARD_QUEEN_EMOJI || null,
    jack: process.env.CARD_JACK_EMOJI || null,
    joker: process.env.CARD_JOKER_EMOJI || null
  }
};

function assertConfig(options = {}) {
  const missing = [];

  if (!config.token) missing.push("DISCORD_TOKEN");
  if (!config.clientId) missing.push("CLIENT_ID");

  if (missing.length > 0) {
    throw new Error(`Missing required env value(s): ${missing.join(", ")}`);
  }
}

module.exports = {
  config,
  assertConfig
};
