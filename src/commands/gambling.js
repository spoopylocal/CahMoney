// Gambling games: blackjack, gamble, high-low and coinflip.
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
      .setName("highlow")
      .setDescription("Set a percent threshold and guess whether the roll is above or below.")
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
            title: "Highlow Failed",
            message: bet.message,
            color: 0xed4245
          };
        }

        user.wallet -= bet.amount;
        const rig = consumeRig(user, "highlow");
        const rigRoll = Number.isInteger(rig?.highlowRoll) && rig.highlowRoll >= 0 && rig.highlowRoll <= 100
          ? rig.highlowRoll
          : null;
        return { ok: true, bet: bet.amount, rigOutcome: rig?.outcome || null, rigRoll };
      });

      if (!start.ok) {
        await replyEmbed(interaction, start.title, start.message, { color: start.color });
        return;
      }

      const game = {
        bet: start.bet,
        threshold: 50,
        lastRoll: null,
        finished: false,
        rigOutcome: start.rigOutcome,
        rigRoll: start.rigRoll,
        title: "Highlow",
        message: "Move the threshold, then guess Above or Below.",
        color: 0x5865f2
      };

      await interaction.reply({
        embeds: [makeHighLowEmbed(interaction, game)],
        components: makeHighLowButtons(game)
      });
      const message = await interaction.fetchReply();
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 90 * 1000
      });

      collector.on("collect", async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
          await buttonInteraction.reply({
            content: "This higher or lower game is not yours.",
            ephemeral: true
          });
          return;
        }

        if (game.finished) {
          await buttonInteraction.deferUpdate();
          return;
        }

        const thresholdMoves = {
          highlow_down10: -10,
          highlow_down1: -1,
          highlow_up1: 1,
          highlow_up10: 10
        };

        if (buttonInteraction.customId in thresholdMoves) {
          game.threshold = Math.min(99, Math.max(1, game.threshold + thresholdMoves[buttonInteraction.customId]));
          game.title = "Highlow";
          game.message = "Move the threshold, then guess Above or Below.";
          game.color = 0x5865f2;
          await buttonInteraction.update({
            embeds: [makeHighLowEmbed(interaction, game)],
            components: makeHighLowButtons(game)
          });
          return;
        }

        const guess = buttonInteraction.customId === "highlow_higher" ? "above" : "below";
        let nextRoll = game.rigRoll ?? drawHighLowRoll();

        if (game.rigRoll === null && (game.rigOutcome === "win" || game.rigOutcome === "blackjack")) {
          const validValues = Array.from({ length: 101 }, (_, index) => index)
            .filter((value) => guess === "above" ? value > game.threshold : value < game.threshold);
          if (validValues.length > 0) {
            const value = validValues[randomInt(0, validValues.length - 1)];
            nextRoll = value;
          }
        }

        if (game.rigRoll === null && game.rigOutcome === "lose") {
          const badValues = Array.from({ length: 101 }, (_, index) => index)
            .filter((value) => guess === "above" ? value < game.threshold : value > game.threshold);
          if (badValues.length > 0) {
            const value = badValues[randomInt(0, badValues.length - 1)];
            nextRoll = value;
          }
        }
        game.rigOutcome = null;
        game.rigRoll = null;

        const correct = guess === "above"
          ? nextRoll > game.threshold
          : nextRoll < game.threshold;

        if (!correct) {
          const xp = await withStore((store) => {
            const user = getUser(store, interaction.user.id);
            return addExperience(user, 2, 6);
          });

          game.finished = true;
          game.title = "Highlow Lost";
          game.message = `You guessed ${guess} ${game.threshold}%, but the roll landed on ${nextRoll}%. You lost ${formatMoney(interaction, game.bet)}. ${formatExperience(interaction, xp)} earned.`;
          game.color = 0xed4245;
          game.lastRoll = nextRoll;
          await buttonInteraction.update({
            embeds: [makeHighLowEmbed(interaction, game)],
            components: makeHighLowButtons(game, true)
          });
          collector.stop("lost");
          return;
        }

        const payout = getHighLowPayout(game.bet, game.threshold, guess);
        const xp = await withStore((store) => {
          const user = getUser(store, interaction.user.id);
          user.wallet += payout;
          return addExperience(user, 10, 22);
        });

        game.finished = true;
        game.lastRoll = nextRoll;
        game.title = "Highlow Won";
        game.message = `You guessed ${guess} ${game.threshold}%, and the roll landed on ${nextRoll}%. You won ${formatMoney(interaction, payout)}. ${formatExperience(interaction, xp)} earned.`;
        game.color = 0x57f287;
        await buttonInteraction.update({
          embeds: [makeHighLowEmbed(interaction, game)],
          components: makeHighLowButtons(game, true)
        });
        collector.stop("won");
      });

      collector.on("end", async () => {
        if (game.finished) return;
        game.finished = true;
        game.title = "Highlow Expired";
        game.message = `The game timed out. Your bet of ${formatMoney(interaction, game.bet)} was lost.`;
        game.color = 0xed4245;
        await message.edit({
          embeds: [makeHighLowEmbed(interaction, game)],
          components: makeHighLowButtons(game, true)
        }).catch(() => {});
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
  }
];
