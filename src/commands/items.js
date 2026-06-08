// Items, shop, trading and gathering actions.
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
        const petIdle = processPetIdleHunts(user);
        const pet = petIdle.pet;
        const petXp = pet && pet.fedUntil > Date.now() ? randomInt(5, 10) : 0;
        if (petXp > 0) addPetExperience(pet, petXp);
        const luckMultiplier = getLuckMultiplier(user);
        const failChance = luckMultiplier > 1 ? 0.12 : 0.2;

        if (Math.random() < failChance) {
          return {
            title: "Hunt Failed",
            message: "You found nothing except character development.",
            color: 0xed4245,
            xp,
            totalExperience: user.experience,
            petId: petXp > 0 ? pet.id : null,
            petXp
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
          totalExperience: user.experience,
          petId: petXp > 0 ? pet.id : null,
          petXp
        };
      });

      await replyEmbed(interaction, outcome.title, outcome.message, {
        color: outcome.color,
        fields: [
          ...(outcome.itemId ? [{ name: "Item Found", value: formatItem(interaction, outcome.itemId), inline: true }] : []),
          ...(outcome.luckMultiplier > 1 ? [{ name: "Boost", value: "+20% luck", inline: true }] : []),
          ...(outcome.petXp ? [{ name: "Pet XP", value: `${formatItem(interaction, outcome.petId)} gained ${formatExperience(interaction, outcome.petXp)}`, inline: false }] : []),
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
      await replyShopMenu(interaction);
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
      .setName("trade")
      .setDescription("Start a two-player trade with coins and items.")
      .addUserOption((option) =>
        option.setName("user").setDescription("User to trade with.").setRequired(true)
      ),
    async execute(interaction) {
      const target = interaction.options.getUser("user");

      if (target.bot || target.id === interaction.user.id) {
        await replyEmbed(interaction, "Trade Failed", "Pick a real target who is not you.", {
          color: 0xed4245
        });
        return;
      }

      const customIdPrefix = `trade_${interaction.id}`;
      const trade = {
        users: [
          { id: interaction.user.id, user: interaction.user },
          { id: target.id, user: target }
        ],
        offers: {
          [interaction.user.id]: { coins: 0, items: {} },
          [target.id]: { coins: 0, items: {} }
        },
        accepted: {
          [interaction.user.id]: false,
          [target.id]: false
        },
        closed: false
      };

      function resetAccepts() {
        trade.accepted[interaction.user.id] = false;
        trade.accepted[target.id] = false;
      }

      async function renderTrade(message, disabled = false) {
        await message.edit({
          embeds: [makeTradeEmbed(interaction, trade)],
          components: makeTradeRows(customIdPrefix, disabled)
        });
      }

      function validateOffer(user, offer) {
        if ((offer.coins || 0) > (user.wallet || 0)) {
          return `You only have ${formatMoney(interaction, user.wallet || 0)} in your wallet.`;
        }

        for (const [itemId, quantity] of Object.entries(offer.items || {})) {
          if ((user.inventory?.[itemId] || 0) < quantity) {
            return `You only have ${formatItem(interaction, itemId, user.inventory?.[itemId] || 0)}.`;
          }
        }

        return null;
      }

      function finishTrade() {
        return withStore((store) => {
          const first = getUser(store, interaction.user.id);
          const second = getUser(store, target.id);
          const firstIssue = validateOffer(first, trade.offers[interaction.user.id]);
          if (firstIssue) return { ok: false, message: `${interaction.user.username}: ${firstIssue}` };
          const secondIssue = validateOffer(second, trade.offers[target.id]);
          if (secondIssue) return { ok: false, message: `${target.username}: ${secondIssue}` };

          const firstOffer = trade.offers[interaction.user.id];
          const secondOffer = trade.offers[target.id];
          first.wallet -= firstOffer.coins || 0;
          second.wallet += firstOffer.coins || 0;
          second.wallet -= secondOffer.coins || 0;
          first.wallet += secondOffer.coins || 0;

          for (const [itemId, quantity] of Object.entries(firstOffer.items || {})) {
            removeItem(first, itemId, quantity);
            addItem(second, itemId, quantity);
          }

          for (const [itemId, quantity] of Object.entries(secondOffer.items || {})) {
            removeItem(second, itemId, quantity);
            addItem(first, itemId, quantity);
          }

          return { ok: true, message: "Trade completed." };
        });
      }

      await interaction.reply({
        content: `${target}`,
        embeds: [
          makeEmbed(interaction, "Trade Request", `${interaction.user} wants to trade with ${target}.\n\n${target}, accept to open the trade window.`, {
            color: 0x5865f2
          })
        ],
        components: makeTradeRequestRows(customIdPrefix)
      });

      const requestMessage = await interaction.fetchReply();
      const requestCollector = requestMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60 * 1000
      });

      requestCollector.on("collect", async (buttonInteraction) => {
        if (buttonInteraction.user.id !== target.id) {
          await buttonInteraction.reply({ content: "Only the requested player can answer this trade request.", ephemeral: true });
          return;
        }

        if (buttonInteraction.customId.endsWith("_request_deny")) {
          trade.closed = true;
          requestCollector.stop("denied");
          await buttonInteraction.update({
            content: "",
            embeds: [makeEmbed(interaction, "Trade Request Denied", `${target.username} denied the trade request.`, { color: 0xed4245 })],
            components: makeTradeRequestRows(customIdPrefix, true)
          });
          return;
        }

        await buttonInteraction.update({
          content: "",
          embeds: [makeTradeEmbed(interaction, trade)],
          components: makeTradeRows(customIdPrefix)
        });
        requestCollector.stop("accepted");

        const message = requestMessage;
        const collector = message.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 5 * 60 * 1000
        });

        collector.on("collect", async (tradeInteraction) => {
          const participant = trade.users.find((user) => user.id === tradeInteraction.user.id);
          if (!participant) {
            await tradeInteraction.reply({ content: "You are not part of this trade.", ephemeral: true });
            return;
          }

          const action = tradeInteraction.customId.replace(`${customIdPrefix}_`, "");

        if (action === "deny") {
          trade.closed = true;
          collector.stop("denied");
          await tradeInteraction.update({
            embeds: [makeEmbed(interaction, "Trade Cancelled", `${tradeInteraction.user.username} denied the trade.`, { color: 0xed4245 })],
            components: makeTradeRows(customIdPrefix, true)
          });
          return;
        }

        if (action === "accept") {
          trade.accepted[tradeInteraction.user.id] = true;

          if (trade.accepted[interaction.user.id] && trade.accepted[target.id]) {
            const outcome = await finishTrade();
            trade.closed = true;
            collector.stop(outcome.ok ? "completed" : "failed");
            await tradeInteraction.update({
              embeds: [
                outcome.ok
                  ? makeEmbed(interaction, "Trade Complete", outcome.message, { color: 0x57f287 })
                  : makeEmbed(interaction, "Trade Failed", outcome.message, { color: 0xed4245 })
              ],
              components: makeTradeRows(customIdPrefix, true)
            });
            return;
          }

          await tradeInteraction.update({
            embeds: [makeTradeEmbed(interaction, trade)],
            components: makeTradeRows(customIdPrefix)
          });
          return;
        }

        if (action === "clear") {
          trade.offers[tradeInteraction.user.id] = { coins: 0, items: {} };
          resetAccepts();
          await tradeInteraction.update({
            embeds: [makeTradeEmbed(interaction, trade)],
            components: makeTradeRows(customIdPrefix)
          });
          return;
        }

        const modal = new ModalBuilder()
          .setCustomId(`${customIdPrefix}_modal_${action}_${tradeInteraction.user.id}`)
          .setTitle(action === "coins" ? "Add coins to trade" : "Add item to trade");

        if (action === "coins") {
          modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("amount")
              .setLabel("Coins to offer")
              .setRequired(true)
              .setStyle(TextInputStyle.Short)
          ));
        } else {
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("item")
                .setLabel("Item number, id, or name")
                .setRequired(true)
                .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("amount")
                .setLabel("Amount to offer")
                .setRequired(true)
                .setStyle(TextInputStyle.Short)
            )
          );
        }

        await tradeInteraction.showModal(modal);

        try {
          const modalInteraction = await tradeInteraction.awaitModalSubmit({
            time: 60 * 1000,
            filter: (submitInteraction) =>
              submitInteraction.user.id === tradeInteraction.user.id &&
              submitInteraction.customId === `${customIdPrefix}_modal_${action}_${tradeInteraction.user.id}`
          });
          const offer = trade.offers[tradeInteraction.user.id];

          if (action === "coins") {
            const amount = Number.parseInt(modalInteraction.fields.getTextInputValue("amount").trim(), 10);
            if (!Number.isFinite(amount) || amount < 0) {
              await modalInteraction.reply({ content: "Enter 0 or a positive number.", ephemeral: true });
              return;
            }
            offer.coins = amount;
          } else {
            const itemId = resolveItemId(modalInteraction.fields.getTextInputValue("item"));
            const amount = Number.parseInt(modalInteraction.fields.getTextInputValue("amount").trim(), 10);
            if (!itemId || !itemById.has(itemId)) {
              await modalInteraction.reply({ content: "That item does not exist.", ephemeral: true });
              return;
            }
            if (!Number.isFinite(amount) || amount <= 0) {
              await modalInteraction.reply({ content: "Enter a positive item amount.", ephemeral: true });
              return;
            }
            offer.items[itemId] = (offer.items[itemId] || 0) + amount;
          }

          resetAccepts();
          await modalInteraction.reply({ content: "Trade offer updated.", ephemeral: true });
          await renderTrade(message);
        } catch {
          await renderTrade(message);
        }
        });

        collector.on("end", async (_collected, reason) => {
          if (["completed", "failed", "denied"].includes(reason)) return;
          trade.closed = true;
          await message.edit({
            embeds: [makeEmbed(interaction, "Trade Expired", "The trade timed out before both players accepted.", { color: 0xfee75c })],
            components: makeTradeRows(customIdPrefix, true)
          }).catch(() => {});
        });
      });

      requestCollector.on("end", async (_collected, reason) => {
        if (["accepted", "denied"].includes(reason)) return;
        trade.closed = true;
        await requestMessage.edit({
          content: "",
          embeds: [makeEmbed(interaction, "Trade Request Expired", `${target.username} did not answer the trade request.`, { color: 0xfee75c })],
          components: makeTradeRequestRows(customIdPrefix, true)
        }).catch(() => {});
      });
    }
  }
];
