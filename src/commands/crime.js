// Crime: robbing wallets, bank heists and defense tooling.
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

      await notifyBankAlarmOwner(interaction, target, outcome);
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
          { name: "Defense Slots", value: formatBankDefenseSlots(outcome.targetUser), inline: true },
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
          ...(outcome.victim ? [{ name: "Defense Slots", value: formatBankDefenseSlots(outcome.victim), inline: true }] : []),
          ...(outcome.victim ? [{ name: "Remaining Defenses", value: formatBankDefenses(interaction, outcome.victim), inline: false }] : [])
        ]
      });
    }
  }
];
