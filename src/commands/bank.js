// Banking: storage, deposits and withdrawals.
// Auto-split from the original commands.js (behavior-preserving).
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
  TextInputStyle,
  withStore,
  getUser,
  getNetWorth,
  config,
  formatCoins,
  randomInt,
  clampBet,
  getCooldown,
  BEG_COOLDOWN,
  WORK_COOLDOWN,
  DAILY_COOLDOWN,
  ROB_COOLDOWN,
  BANKROB_COOLDOWN,
  HUNT_COOLDOWN,
  GIVE_COOLDOWN,
  MINE_COOLDOWN,
  LUCKY_CHARM_DURATION,
  PET_IDLE_INTERVAL,
  PET_MAX_IDLE_HUNTS,
  JOB_PROMOTION_XP,
  JOB_MAX_LEVEL,
  JOB_FAIL_LIMIT,
  MEDIUM_JOB_LEVEL,
  JOB_APPLY_COOLDOWNS,
  PAGE_SIZE,
  DEV_USER_ID,
  BANKROB_BASE_SUCCESS_CHANCE,
  bankLevels,
  bankDefenseItems,
  shopCategories,
  shopItems,
  petItems,
  petFoodItems,
  jobTiers,
  jobDefinitions,
  jobIdsByTier,
  items,
  itemById,
  itemNumberById,
  pickaxes,
  mineDropTables,
  begWinMessages,
  begLoseMessages,
  gambleWinMessages,
  gambleLoseMessages,
  coinflipWinMessages,
  coinflipLoseMessages,
  pickMessage,
  getEmoji,
  formatMoney,
  formatBankMoney,
  formatExperience,
  formatItem,
  resolveItemId,
  formatCard,
  formatHand,
  createDeck,
  drawCard,
  getHandScore,
  getHandValue,
  getCardValueForSplit,
  canSplitHand,
  canDoubleHand,
  makeBlackjackButtons,
  drawHighLowRoll,
  getHighLowChance,
  getHighLowPayout,
  makeHighLowButtons,
  formatHighLowBar,
  makeHighLowEmbed,
  makeBlackjackEmbed,
  finishBlackjack,
  addItem,
  removeItem,
  petChoices,
  petFoodChoices,
  normalizePet,
  getEquippedPet,
  getPetBoost,
  getPetStats,
  getPetHuntInterval,
  formatPetNextHunt,
  addPetExperience,
  pickPetHuntItem,
  processPetIdleHunts,
  claimPetStash,
  formatPetStash,
  ownedPetSelectOptions,
  ownedFoodSelectOptions,
  equipPet,
  feedPet,
  normalizeBankLevel,
  getBankLevelInfo,
  getNextBankLevelInfo,
  getBankSpace,
  getBankDefenseSlots,
  getBankDefenseEntries,
  getBankDefenseCount,
  getBankDefenseBlockChance,
  getBankrobSuccessChance,
  formatBankDefenses,
  formatBankDefenseSlots,
  formatDefenseEffect,
  getSpecificDefense,
  consumeTriggeredDefense,
  consumeSpecificDefense,
  removeRandomBankDefense,
  removeRandomInventoryItem,
  payFromWalletThenBank,
  getActiveBoost,
  getLuckMultiplier,
  useInventoryItem,
  pickWeightedItem,
  pickWeightedDrop,
  getBestPickaxe,
  consumeRig,
  getShopItem,
  getShopCategory,
  getShopItemsByCategory,
  isStackableShopItem,
  purchaseShopItem,
  itemChoices,
  getLevel,
  getNextLevelExperience,
  getExperienceUntilNextLevel,
  addExperience,
  getJobLevel,
  getNextJobLevelXp,
  getJobXpUntilNext,
  normalizeJob,
  getUnlockedJobTiers,
  normalizeJobApplyCooldowns,
  getJobApplyCooldown,
  formatJobApplyCooldowns,
  formatJobProgress,
  makeJobsView,
  makeJobsComponents,
  applyForJob,
  shuffleRows,
  makeWorkChallenge,
  makeWorkChallengeComponents,
  completeJobShift,
  getExperienceProgress,
  formatDuration,
  xpFields,
  makeEmbed,
  replyEmbed,
  notifyBankAlarmOwner,
  getBankView,
  upgradeBank,
  makeBankComponents,
  replyBankMenu,
  makePetEmbed,
  makePetComponents,
  replyPetMenu,
  requireDev,
  makePagedRows,
  makePagedEmbed,
  makeInventoryRows,
  makeInventoryComponents,
  makeGiveRows,
  makeTradeOfferText,
  makeTradeEmbed,
  makeTradeRows,
  makeTradeRequestRows,
  getInventoryEntries,
  getInventoryPageCount,
  makeShopRows,
  makeShopComponents,
  replyShopMenu,
  replyInventoryMenu,
  replyPagedMenu
} = require("./shared");

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName("bank")
      .setDescription("Open your bank menu."),
    async execute(interaction) {
      await replyBankMenu(interaction);
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
  }
];
