// Developer-only admin command menu.
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
            .setPlaceholder("next, gamble, coinflip, blackjack, or highlow")
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
              const validGames = ["next", "gamble", "coinflip", "blackjack", "highlow"];
              const validOutcomes = ["win", "lose", "blackjack"];

              if (!validGames.includes(game) || !validOutcomes.includes(outcome)) {
                return { message: "Invalid rig. Game: next/gamble/coinflip/blackjack/highlow. Outcome: win/lose/blackjack." };
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
  }
];
