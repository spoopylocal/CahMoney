// Core economy: balances, daily income, transfers, leaderboard.
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
      .setName("give")
      .setDescription("Give coins or an item to another user.")
      .addUserOption((option) =>
        option.setName("user").setDescription("User to give to.").setRequired(true)
      ),
    async execute(interaction) {
      const target = interaction.options.getUser("user");

      if (target.bot || target.id === interaction.user.id) {
        await replyEmbed(interaction, "Give Failed", "Pick a real target who is not you.", {
          color: 0xed4245
        });
        return;
      }

      let page = 0;
      const customIdPrefix = `give_${interaction.id}`;

      async function getGiveState() {
        return withStore((store) => {
          const giver = getUser(store, interaction.user.id);
          const entries = getInventoryEntries(giver.inventory).sort(([a], [b]) => a.localeCompare(b));
          return {
            wallet: giver.wallet || 0,
            entries,
            rows: makeInventoryRows(interaction, entries),
            totalPages: getInventoryPageCount(entries),
            cooldown: getCooldown(giver.lastGive, GIVE_COOLDOWN)
          };
        });
      }

      async function render(message = null) {
        const state = await getGiveState();
        page = Math.min(page, state.totalPages - 1);
        const embed = makePagedEmbed(interaction, `Give to ${target.username}`, state.rows, page, {
          emptyText: "No inventory items to give. You can still give coins.",
          color: 0x5865f2
        });
        embed.spliceFields(0, 0,
          { name: "Wallet", value: formatMoney(interaction, state.wallet), inline: true },
          { name: "Cooldown", value: state.cooldown || "Ready", inline: true }
        );
        const payload = {
          embeds: [embed],
          components: makeGiveRows(interaction, customIdPrefix, page, state.totalPages, state.entries)
        };

        if (message) await message.edit(payload);
        else await interaction.reply(payload);
      }

      async function giveCoins(amount) {
        return withStore((store) => {
          const giver = getUser(store, interaction.user.id);
          const receiver = getUser(store, target.id);
          const cooldown = getCooldown(giver.lastGive, GIVE_COOLDOWN);
          if (cooldown) return { ok: false, title: "Give Cooldown", message: `Wait ${cooldown} before giving again.`, color: 0xfee75c };
          if (amount > giver.wallet) return { ok: false, title: "Give Failed", message: `You only have ${formatMoney(interaction, giver.wallet)} in your wallet.`, color: 0xed4245 };

          giver.wallet -= amount;
          receiver.wallet += amount;
          giver.lastGive = Date.now();
          return { ok: true, title: "Coins Given", message: `You gave ${target.username} ${formatMoney(interaction, amount)}.`, color: 0x57f287, coins: amount };
        });
      }

      async function giveItem(itemId, amount) {
        return withStore((store) => {
          const giver = getUser(store, interaction.user.id);
          const receiver = getUser(store, target.id);
          const cooldown = getCooldown(giver.lastGive, GIVE_COOLDOWN);
          if (cooldown) return { ok: false, title: "Give Cooldown", message: `Wait ${cooldown} before giving again.`, color: 0xfee75c };
          if (!itemById.has(itemId)) return { ok: false, title: "Give Failed", message: "That item does not exist.", color: 0xed4245 };
          if (!removeItem(giver, itemId, amount)) return { ok: false, title: "Give Failed", message: `You do not have ${formatItem(interaction, itemId, amount)}.`, color: 0xed4245 };

          addItem(receiver, itemId, amount);
          giver.lastGive = Date.now();
          return { ok: true, title: "Item Given", message: `You gave ${target.username} ${formatItem(interaction, itemId, amount)}.`, color: 0x57f287, itemId, amount };
        });
      }

      await render();
      const message = await interaction.fetchReply();
      const collector = message.createMessageComponentCollector({ time: 2 * 60 * 1000 });

      collector.on("collect", async (componentInteraction) => {
        if (componentInteraction.user.id !== interaction.user.id) {
          await componentInteraction.reply({ content: "This give menu is not yours.", ephemeral: true });
          return;
        }

        if (componentInteraction.isButton()) {
          const state = await getGiveState();
          if (componentInteraction.customId.endsWith("_first")) page = 0;
          if (componentInteraction.customId.endsWith("_prev")) page = Math.max(0, page - 1);
          if (componentInteraction.customId.endsWith("_next")) page = Math.min(state.totalPages - 1, page + 1);
          if (componentInteraction.customId.endsWith("_last")) page = state.totalPages - 1;

          if (componentInteraction.customId.endsWith("_cancel")) {
            collector.stop("closed");
            await componentInteraction.update({ components: makeGiveRows(interaction, customIdPrefix, page, state.totalPages, state.entries).map((row) => {
              row.components.forEach((component) => component.setDisabled(true));
              return row;
            }) });
            return;
          }

          if (!componentInteraction.customId.endsWith("_coins")) {
            await componentInteraction.deferUpdate();
            await render(message);
            return;
          }

          const modal = new ModalBuilder()
            .setCustomId(`${customIdPrefix}_coins_modal`)
            .setTitle(`Give coins to ${target.username}`);
          modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("amount")
              .setLabel("Coins to give")
              .setRequired(true)
              .setStyle(TextInputStyle.Short)
          ));
          await componentInteraction.showModal(modal);

          try {
            const modalInteraction = await componentInteraction.awaitModalSubmit({
              time: 60 * 1000,
              filter: (submitInteraction) => submitInteraction.user.id === interaction.user.id && submitInteraction.customId === `${customIdPrefix}_coins_modal`
            });
            const amount = Number.parseInt(modalInteraction.fields.getTextInputValue("amount").trim(), 10);
            const outcome = Number.isFinite(amount) && amount > 0
              ? await giveCoins(amount)
              : { title: "Give Failed", message: "Enter a positive number.", color: 0xed4245 };
            await modalInteraction.reply({ embeds: [makeEmbed(interaction, outcome.title, outcome.message, { color: outcome.color })], ephemeral: true });
            await render(message);
          } catch {
            await render(message);
          }
          return;
        }

        if (!componentInteraction.isStringSelectMenu()) return;
        const itemId = componentInteraction.values[0];
        const modal = new ModalBuilder()
          .setCustomId(`${customIdPrefix}_item_modal_${itemId}`)
          .setTitle(`Give ${itemById.get(itemId)?.name || itemId}`);
        modal.addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("amount")
            .setLabel("Amount to give")
            .setPlaceholder("Type a number, or all")
            .setRequired(true)
            .setStyle(TextInputStyle.Short)
        ));
        await componentInteraction.showModal(modal);

        try {
          const modalInteraction = await componentInteraction.awaitModalSubmit({
            time: 60 * 1000,
            filter: (submitInteraction) => submitInteraction.user.id === interaction.user.id && submitInteraction.customId === `${customIdPrefix}_item_modal_${itemId}`
          });
          const rawAmount = modalInteraction.fields.getTextInputValue("amount").trim().toLowerCase();
          const state = await getGiveState();
          const owned = state.entries.find(([id]) => id === itemId)?.[1] || 0;
          const amount = rawAmount === "all" ? owned : Number.parseInt(rawAmount, 10);
          const outcome = Number.isFinite(amount) && amount > 0
            ? await giveItem(itemId, amount)
            : { title: "Give Failed", message: "Enter a positive number or `all`.", color: 0xed4245 };
          await modalInteraction.reply({ embeds: [makeEmbed(interaction, outcome.title, outcome.message, { color: outcome.color })], ephemeral: true });
          await render(message);
        } catch {
          await render(message);
        }
      });

      collector.on("end", async () => {
        const state = await getGiveState();
        const disabledComponents = makeGiveRows(interaction, customIdPrefix, page, state.totalPages, state.entries);
        for (const row of disabledComponents) row.components.forEach((component) => component.setDisabled(true));
        await message.edit({ components: disabledComponents }).catch(() => {});
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
