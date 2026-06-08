// Progression: jobs, shifts and pets.
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
    data: new SlashCommandBuilder().setName("jobs").setDescription("Apply for jobs and view job progress."),
    async execute(interaction) {
      const customIdPrefix = `jobs_${interaction.id}`;
      const state = await withStore((store) => {
        const user = getUser(store, interaction.user.id);
        return { user };
      });

      const message = await interaction.reply({
        embeds: [makeJobsView(interaction, state.user)],
        components: makeJobsComponents(customIdPrefix, state.user),
        fetchReply: true
      });

      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 2 * 60 * 1000
      });

      collector.on("collect", async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
          await buttonInteraction.reply({ content: "This jobs menu is not yours.", ephemeral: true });
          return;
        }

        const action = buttonInteraction.customId.replace(`${customIdPrefix}_`, "");
        const result = await withStore((store) => {
          const user = getUser(store, interaction.user.id);

          if (action.startsWith("apply_")) {
            const tier = action.replace("apply_", "");
            const notice = applyForJob(interaction, user, tier);
            return { user, notice };
          }

          if (action === "quit") {
            const job = normalizeJob(user);
            if (!job) {
              return {
                user,
                notice: {
                  title: "No Job",
                  message: "You do not have a job to quit.",
                  color: 0xfee75c
                }
              };
            }

            const jobName = jobDefinitions[job.id].name;
            user.job = null;
            return {
              user,
              notice: {
                title: "Job Quit",
                message: `You quit **${jobName}**.`,
                color: 0xfee75c
              }
            };
          }

          return { user, notice: null };
        });

        await buttonInteraction.update({
          embeds: [makeJobsView(interaction, result.user, result.notice)],
          components: makeJobsComponents(customIdPrefix, result.user)
        });
      });

      collector.on("end", async () => {
        const state = await withStore((store) => {
          const user = getUser(store, interaction.user.id);
          return { user };
        }).catch(() => null);
        await message.edit({
          components: makeJobsComponents(customIdPrefix, state?.user || {}, true)
        }).catch(() => {});
      });
    }
  },
  {
    data: new SlashCommandBuilder().setName("work").setDescription("Work a weird little job for coins."),
    async execute(interaction) {
      const start = await withStore((store) => {
        const user = getUser(store, interaction.user.id);
        const cooldown = getCooldown(user.lastWork, WORK_COOLDOWN);

        if (cooldown) {
          return {
            title: "Work Cooldown",
            message: `You are still emotionally recovering from work. Try again in ${cooldown}.`,
            color: 0xfee75c
          };
        }

        const currentJob = normalizeJob(user);
        if (!currentJob) {
          return {
            title: "No Job",
            message: "You need a job before you can work. Use `/jobs` to apply.",
            color: 0xfee75c
          };
        }

        user.lastWork = Date.now();
        const job = jobDefinitions[currentJob.id];
        const challenge = makeWorkChallenge(job);

        return { ok: true, jobId: currentJob.id, job, challenge };
      });

      if (!start.ok) {
        await replyEmbed(interaction, start.title, start.message, { color: start.color });
        return;
      }

      const customIdPrefix = `work_${interaction.id}`;
      const embed = makeEmbed(interaction, `${start.job.name} Shift`, start.challenge.prompt, {
        color: jobTiers[start.job.tier].color,
        fields: [
          { name: "Job Tier", value: jobTiers[start.job.tier].name, inline: true },
          { name: "Task", value: "Pick the right action to pass this shift.", inline: true }
        ]
      });

      const message = await interaction.reply({
        embeds: [embed],
        components: makeWorkChallengeComponents(customIdPrefix, start.challenge),
        fetchReply: true
      });

      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60 * 1000,
        max: 1
      });

      collector.on("collect", async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
          await buttonInteraction.reply({ content: "This work shift is not yours.", ephemeral: true });
          return;
        }

        const index = Number(buttonInteraction.customId.split("_").pop());
        const choice = start.challenge.choices[index];
        const outcome = await withStore((store) => {
          const user = getUser(store, interaction.user.id);
          const currentJob = normalizeJob(user);
          if (!currentJob || currentJob.id !== start.jobId) {
            return {
              title: "Shift Cancelled",
              message: "You no longer have this job.",
              color: 0xed4245
            };
          }

          return completeJobShift(interaction, user, start.job, Boolean(choice?.correct));
        });

        await buttonInteraction.update({
          embeds: [
            makeEmbed(interaction, outcome.title, `${outcome.message}${choice ? `\n\nYou picked: **${choice.label}**.` : ""}`, {
              color: outcome.color,
              fields: [
                ...(outcome.coins ? [{ name: "Coins Earned", value: formatMoney(interaction, outcome.coins), inline: true }] : []),
                ...(outcome.fine ? [{ name: "Penalty", value: formatMoney(interaction, outcome.fine), inline: true }] : []),
                ...(outcome.jobXp ? [{ name: "Job XP", value: `${outcome.jobXp.toLocaleString()}${outcome.promoted ? "\nPromoted!" : ""}`, inline: true }] : []),
                ...(outcome.job ? [{ name: "Job Progress", value: outcome.fired ? "Fired" : formatJobProgress(outcome.job), inline: true }] : []),
                ...xpFields(interaction, outcome)
              ]
            })
          ],
          components: makeWorkChallengeComponents(customIdPrefix, start.challenge, true)
        });
      });

      collector.on("end", async (collected) => {
        if (collected.size > 0) return;
        await message.edit({
          embeds: [makeEmbed(interaction, "Shift Timed Out", "You missed the shift window. The cooldown still counts.", { color: 0xfee75c })],
          components: makeWorkChallengeComponents(customIdPrefix, start.challenge, true)
        }).catch(() => {});
      });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("pet")
      .setDescription("Open your pet menu."),
    async execute(interaction) {
      await replyPetMenu(interaction);
    }
  }
];
