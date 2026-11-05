// client/src/lib/steamAchievementIds.ts
// Steam API naming rule: ACH_<INTERNAL_ID_UPPERCASE>
// Example: clicks_10 -> ACH_CLICKS_10
// We intentionally IGNORE the 10 "secret_*" achievements for now.

export const STEAM_API_PREFIX = "ACH_";

export function toSteamApiName(internalId: string): string | null {
  if (internalId.startsWith("secret_")) return null;
  return `ACH_${internalId.toUpperCase()}`;
}


/**
 * All non-secret internal achievement IDs (164 total)
 * Generated from the exact tier lists in useGame.ts (generateTieredAchievements)
 */
export const INTERNAL_ACHIEVEMENT_IDS: string[] = [
  // clicks (15)
  "clicks_10","clicks_50","clicks_100","clicks_250","clicks_500","clicks_1000","clicks_2500","clicks_5000",
  "clicks_10000","clicks_25000","clicks_50000","clicks_100000","clicks_250000","clicks_500000","clicks_1000000",

  // crits (12)
  "crits_1","crits_10","crits_50","crits_100","crits_250","crits_500","crits_1000","crits_2500",
  "crits_5000","crits_10000","crits_25000","crits_50000",

  // data (20)
  "data_100","data_500","data_1000","data_5000","data_10000","data_50000","data_100000","data_500000",
  "data_1000000","data_5000000","data_10000000","data_50000000","data_100000000","data_500000000",
  "data_1000000000","data_5000000000","data_10000000000","data_50000000000","data_100000000000","data_500000000000",

  // credits (15)
  "credits_100","credits_500","credits_1000","credits_5000","credits_10000","credits_50000","credits_100000","credits_500000",
  "credits_1000000","credits_5000000","credits_10000000","credits_50000000","credits_100000000","credits_500000000","credits_1000000000",

  // crypto (14)
  "crypto_1","crypto_10","crypto_50","crypto_100","crypto_500","crypto_1000","crypto_5000","crypto_10000",
  "crypto_50000","crypto_100000","crypto_500000","crypto_1000000","crypto_5000000","crypto_10000000",

  // upgrades bought (17)
  "upgrades_1","upgrades_5","upgrades_10","upgrades_25","upgrades_50","upgrades_75","upgrades_100","upgrades_150","upgrades_200",
  "upgrades_300","upgrades_400","upgrades_500","upgrades_750","upgrades_1000","upgrades_1500","upgrades_2000","upgrades_3000",

  // checkpoints (9)
  "checkpoints_1","checkpoints_5","checkpoints_10","checkpoints_25","checkpoints_50","checkpoints_100","checkpoints_200","checkpoints_500","checkpoints_1000",

  // ascend (6)
  "ascend_1","ascend_2","ascend_5","ascend_10","ascend_15","ascend_25","ascend_50",
  // v1.03 milestones
  "automation_first","challenge_no_clicks","challenge_half_crypto","challenge_sprint","challenge_bare_metal","challenge_all","finale_breach","endless_5","endless_10","endless_25",

  // prestige spent (9)
  "prestige_spent_10","prestige_spent_50","prestige_spent_100","prestige_spent_250","prestige_spent_500","prestige_spent_1000","prestige_spent_2500","prestige_spent_5000","prestige_spent_10000",

  // prestige upgrades bought (8)
  "prestige_upgrades_1","prestige_upgrades_5","prestige_upgrades_10","prestige_upgrades_25","prestige_upgrades_50","prestige_upgrades_100","prestige_upgrades_200","prestige_upgrades_500",

  // pickups (5)
  "pickups_10","pickups_50","pickups_100","pickups_250","pickups_500",

  // crit pickups (3)
  "crit_pickups_1","crit_pickups_10","crit_pickups_25",

  // dps (15)
  "dps_10","dps_50","dps_100","dps_500","dps_1000","dps_5000","dps_10000","dps_50000","dps_100000","dps_500000",
  "dps_1000000","dps_5000000","dps_10000000","dps_50000000","dps_100000000",

  // speedrun (4)  NOTE: these are seconds in code: [600,480,360,300]
  "speed_600","speed_480","speed_360","speed_300",

  // playtime (7) NOTE: seconds in code: [300,1800,3600,7200,18000,36000,86400]
  "playtime_300","playtime_1800","playtime_3600","playtime_7200","playtime_18000","playtime_36000","playtime_86400",

  // cosmetics bought (5)
  "cosmetics_1","cosmetics_5","cosmetics_10","cosmetics_25","cosmetics_50",
];

export const STEAM_ACHIEVEMENTS: { id: string; api: string }[] =
  INTERNAL_ACHIEVEMENT_IDS.map(id => ({ id, api: `${STEAM_API_PREFIX}${id.toUpperCase()}` }));
