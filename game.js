const SAVE_KEY = "frost_frontier_save_v1";
const GAMEPLAY_KEY_STORAGE = "frost_frontier_gameplay_key";
const GAMEPLAY_UNLOCK_KEY = "FROST-GAMEPLAY-2026-LOCK";
const ASSET_KEY = "frost_frontier_assets_v1";
const STORY_KEY = "frost_frontier_story_v1";
const GAMEPLAY_KEY = "frost_frontier_gameplay_v1";
const CLOUD_GAS_URL = "https://script.google.com/macros/s/AKfycbwTvyIn6UZE16aCflvNLIyiFRPYm7CdgnXQzuhHbrQ00RWCvWEU-ZmRo25OwYw94efBPQ/exec";
const CLOUD_META_KEY = "frost_frontier_cloud_last_meta_v1";
const CLOUD_ACTIVITY_FP_KEY = "frost_frontier_cloud_activity_fp_v1";
const LOGIN_HISTORY_KEY = "frost_frontier_login_history_v1";

/** 论坛同步进行中（切页不中断抓取，仅影响商店 DOM 重绘时的状态提示） */
let forumSyncInProgress_ = false;
let forumSyncLiveMsg_ = "";
let activityHubTab_ = "checkin";
let activityMiniTab_ = "bear";
let stageReportCopyText_ = "";
let lastBattleOutcomeHint_ = "";
const BATTLE_STAGE_MAX_ = 30;

function allianceLevelBonus_() {
  const lv = Math.min(ALLIANCE_MAX_LEVEL, Math.max(1, Number(state.alliance?.level) || 1));
  // 等级带来的基础加成：让玩家能明显感到变化（同时仍保留 perks 作为进阶强化）。
  const gather = Math.min(0.18, (lv - 1) * 0.012); // 最高 ~18%
  const build = Math.min(0.15, (lv - 1) * 0.010);  // 最高 ~15%
  const battle = Math.min(0.12, (lv - 1) * 0.008); // 最高 ~12%
  return { lv, gatherYieldPct: gather, buildSpeedPct: build, battleDmgPct: battle };
}

const BUILDING_DEFS = [
  { id: "lumber", name: "伐木场", baseCost: { wood: 20 }, gain: { wood: 18 } },
  { id: "mine", name: "钢材矿坑", baseCost: { wood: 30, steel: 10 }, gain: { steel: 10 } },
  { id: "farm", name: "温室农场", baseCost: { wood: 25, steel: 5 }, gain: { food: 16 } },
  { id: "heater", name: "中央熔炉", baseCost: { wood: 30, steel: 20 }, gain: { fuel: 8 }, coldReduce: 2 },
  { id: "camp", name: "训练营", baseCost: { wood: 40, steel: 25 }, troopBoost: 0.08 },
];

const TOWN_TICK_MS = 10 * 60 * 1000;
/** 城镇累积产出上限（小时） */
const TOWN_CAP_H = 72;
/** 每 10 分钟 tick 的产出倍率（原公式偏肥，易囤数月用量） */
const TOWN_GAIN_MULT = 0.085;
/** 1 张资源券对应的基础资源量 */
const RESOURCE_TICKET_UNIT = 10000;

const DEFAULT_GAMEPLAY = {
  heroes: [
    { id: "pk_bulbasaur", name: "妙蛙种子", role: "草", atk: 42, hp: 118, slug: "bulbasaur", activeSkillId: "a_vine_whip", passiveSkillId: "p_overgrow", gatherSkillId: "g_photosynth", battleExtraSkillId: "a_seed_bomb", evolveToId: "pk_ivysaur", evolveAtLevel: 16 },
    { id: "pk_charmander", name: "小火龙", role: "火", atk: 44, hp: 112, slug: "charmander", activeSkillId: "a_ember", passiveSkillId: "p_blaze", gatherSkillId: "g_warm_forge", battleExtraSkillId: "a_fire_spin", evolveToId: "pk_charmeleon", evolveAtLevel: 16 },
    { id: "pk_squirtle", name: "杰尼龟", role: "水", atk: 41, hp: 120, slug: "squirtle", activeSkillId: "a_water_gun", passiveSkillId: "p_torrent", gatherSkillId: "g_aqua_mine", battleExtraSkillId: "a_bubble_beam", evolveToId: "pk_wartortle", evolveAtLevel: 16 },
    { id: "pk_pikachu", name: "皮卡丘", role: "电", atk: 48, hp: 108, slug: "pikachu", activeSkillId: "a_thunder_shock", passiveSkillId: "p_static", gatherSkillId: "g_static_field", battleExtraSkillId: "a_volt_tackle", evolveToId: "pk_raichu", evolveAtLevel: 22 },
    { id: "pk_jigglypuff", name: "胖丁", role: "妖精", atk: 36, hp: 168, slug: "jigglypuff", activeSkillId: "a_disarming_voice", passiveSkillId: "p_cute_charm", gatherSkillId: "g_sing_rest", battleExtraSkillId: "a_hyper_voice", evolveToId: "pk_wigglytuff", evolveAtLevel: 18 },
    { id: "pk_machop", name: "腕力", role: "格斗", atk: 52, hp: 132, slug: "machop", activeSkillId: "a_karate_chop", passiveSkillId: "p_guts", gatherSkillId: "g_muscle_mine", battleExtraSkillId: "a_seismic_toss", evolveToId: "pk_machoke", evolveAtLevel: 28 }
  ],
  heroDexExtras: [
    { id: "pk_ivysaur", name: "妙蛙草", role: "草", atk: 56, hp: 148, slug: "ivysaur", activeSkillId: "a_razor_leaf", passiveSkillId: "p_overgrow", gatherSkillId: "g_photosynth", battleExtraSkillId: "a_synthesis", evolveToId: "pk_venusaur", evolveAtLevel: 36 },
    { id: "pk_charmeleon", name: "火恐龙", role: "火", atk: 58, hp: 142, slug: "charmeleon", activeSkillId: "a_flame_burst", passiveSkillId: "p_blaze", gatherSkillId: "g_warm_forge", battleExtraSkillId: "a_dragon_rage", evolveToId: "pk_charizard", evolveAtLevel: 36 },
    { id: "pk_wartortle", name: "卡咪龟", role: "水", atk: 54, hp: 152, slug: "wartortle", activeSkillId: "a_water_pulse", passiveSkillId: "p_torrent", gatherSkillId: "g_aqua_mine", battleExtraSkillId: "a_ice_beam", evolveToId: "pk_blastoise", evolveAtLevel: 36 },
    { id: "pk_venusaur", name: "妙蛙花", role: "草", atk: 72, hp: 188, slug: "venusaur", activeSkillId: "a_solar_beam", passiveSkillId: "p_thick_fat", gatherSkillId: "g_photosynth", battleExtraSkillId: "a_petal_dance", evolveToId: "", evolveAtLevel: 999 },
    { id: "pk_charizard", name: "喷火龙", role: "火", atk: 76, hp: 186, slug: "charizard", activeSkillId: "a_flamethrower", passiveSkillId: "p_solar_power", gatherSkillId: "g_warm_forge", battleExtraSkillId: "a_air_slash", evolveToId: "", evolveAtLevel: 999 },
    { id: "pk_blastoise", name: "水箭龟", role: "水", atk: 70, hp: 192, slug: "blastoise", activeSkillId: "a_hydro_pump", passiveSkillId: "p_rain_dish", gatherSkillId: "g_aqua_mine", battleExtraSkillId: "a_skull_bash", evolveToId: "", evolveAtLevel: 999 },
    { id: "pk_raichu", name: "雷丘", role: "电", atk: 62, hp: 128, slug: "raichu", activeSkillId: "a_thunderbolt", passiveSkillId: "p_static", gatherSkillId: "g_static_field", battleExtraSkillId: "a_thunderbolt", evolveToId: "", evolveAtLevel: 999 },
    { id: "pk_wigglytuff", name: "胖可丁", role: "妖精", atk: 44, hp: 218, slug: "wigglytuff", activeSkillId: "a_hyper_voice", passiveSkillId: "p_cute_charm", gatherSkillId: "g_sing_rest", battleExtraSkillId: "a_disarming_voice", evolveToId: "", evolveAtLevel: 999 },
    { id: "pk_machoke", name: "豪力", role: "格斗", atk: 64, hp: 156, slug: "machoke", activeSkillId: "a_submission", passiveSkillId: "p_guts", gatherSkillId: "g_muscle_mine", battleExtraSkillId: "a_seismic_toss", evolveToId: "pk_machamp", evolveAtLevel: 40 },
    { id: "pk_machamp", name: "怪力", role: "格斗", atk: 78, hp: 172, slug: "machamp", activeSkillId: "a_cross_chop", passiveSkillId: "p_guts", gatherSkillId: "g_muscle_mine", battleExtraSkillId: "a_seismic_toss", evolveToId: "", evolveAtLevel: 999 },
    { id: "pk_rattata", name: "小拉达", role: "一般", atk: 40, hp: 98, slug: "rattata", activeSkillId: "a_bite", passiveSkillId: "p_run_away", gatherSkillId: "g_scavenge", battleExtraSkillId: "a_bite", evolveToId: "pk_raticate", evolveAtLevel: 20 },
    { id: "pk_raticate", name: "拉达", role: "一般", atk: 54, hp: 124, slug: "raticate", activeSkillId: "a_hyper_fang", passiveSkillId: "p_run_away", gatherSkillId: "g_scavenge", battleExtraSkillId: "a_bite", evolveToId: "", evolveAtLevel: 999 },
    { id: "pk_zubat", name: "超音蝠", role: "毒", atk: 42, hp: 112, slug: "zubat", activeSkillId: "a_wing_attack", passiveSkillId: "p_inner_focus", gatherSkillId: "g_cave_scout", battleExtraSkillId: "a_sludge", evolveToId: "pk_golbat", evolveAtLevel: 22 },
    { id: "pk_golbat", name: "大嘴蝠", role: "毒", atk: 58, hp: 148, slug: "golbat", activeSkillId: "a_air_cutter", passiveSkillId: "p_inner_focus", gatherSkillId: "g_cave_scout", battleExtraSkillId: "a_sludge", evolveToId: "", evolveAtLevel: 999 },
    { id: "pk_caterpie", name: "绿毛虫", role: "虫", atk: 28, hp: 118, slug: "caterpie", activeSkillId: "a_bug_bite", passiveSkillId: "p_shield_dust", gatherSkillId: "g_silk_line", battleExtraSkillId: "a_bug_bite", evolveToId: "pk_metapod", evolveAtLevel: 7 },
    { id: "pk_metapod", name: "铁甲蛹", role: "虫", atk: 22, hp: 132, slug: "metapod", activeSkillId: "a_harden", passiveSkillId: "p_shed_skin", gatherSkillId: "g_silk_line", battleExtraSkillId: "a_bug_bite", evolveToId: "pk_butterfree", evolveAtLevel: 10 },
    { id: "pk_butterfree", name: "巴大蝶", role: "虫", atk: 52, hp: 138, slug: "butterfree", activeSkillId: "a_gust", passiveSkillId: "p_compound_eyes", gatherSkillId: "g_pollen", battleExtraSkillId: "a_bug_buzz", evolveToId: "", evolveAtLevel: 999 }
  ],
  skills: {
    a_vine_whip: { type: "active", name: "藤鞭", chargeNeed: 100, dmgBoost: 0.22, moraleBoost: 3 },
    a_razor_leaf: { type: "active", name: "飞叶快刀", chargeNeed: 98, dmgBoost: 0.24, moraleBoost: 3 },
    a_solar_beam: { type: "active", name: "日光束", chargeNeed: 110, dmgBoost: 0.3, moraleBoost: 4 },
    a_seed_bomb: { type: "active", name: "种子炸弹", chargeNeed: 105, dmgBoost: 0.2, moraleBoost: 3 },
    a_ember: { type: "active", name: "火花", chargeNeed: 100, dmgBoost: 0.22, moraleBoost: 3 },
    a_flame_burst: { type: "active", name: "烈焰迸发", chargeNeed: 100, dmgBoost: 0.24, moraleBoost: 3 },
    a_flamethrower: { type: "active", name: "喷射火焰", chargeNeed: 108, dmgBoost: 0.28, moraleBoost: 4 },
    a_fire_spin: { type: "active", name: "火焰旋涡", chargeNeed: 102, dmgBoost: 0.2, moraleBoost: 3 },
    a_air_slash: { type: "active", name: "空气斩", chargeNeed: 104, dmgBoost: 0.22, moraleBoost: 3 },
    a_water_gun: { type: "active", name: "水枪", chargeNeed: 100, dmgBoost: 0.21, moraleBoost: 3 },
    a_water_pulse: { type: "active", name: "水之波动", chargeNeed: 98, dmgBoost: 0.23, moraleBoost: 3 },
    a_hydro_pump: { type: "active", name: "水炮", chargeNeed: 112, dmgBoost: 0.3, moraleBoost: 4 },
    a_bubble_beam: { type: "active", name: "泡沫光线", chargeNeed: 100, dmgBoost: 0.2, moraleBoost: 3 },
    a_ice_beam: { type: "active", name: "急冻光线", chargeNeed: 106, dmgBoost: 0.24, moraleBoost: 3 },
    a_skull_bash: { type: "active", name: "猛撞", chargeNeed: 104, dmgBoost: 0.22, moraleBoost: 3 },
    a_thunder_shock: { type: "active", name: "电击", chargeNeed: 95, dmgBoost: 0.22, moraleBoost: 3 },
    a_volt_tackle: { type: "active", name: "伏特攻击", chargeNeed: 115, dmgBoost: 0.26, moraleBoost: 4 },
    a_disarming_voice: { type: "active", name: "魅惑之声", chargeNeed: 92, dmgBoost: 0.18, moraleBoost: 5 },
    a_hyper_voice: { type: "active", name: "巨声", chargeNeed: 100, dmgBoost: 0.2, moraleBoost: 4 },
    a_karate_chop: { type: "active", name: "空手劈", chargeNeed: 100, dmgBoost: 0.22, moraleBoost: 3 },
    a_thunderbolt: { type: "active", name: "十万伏特", chargeNeed: 102, dmgBoost: 0.26, moraleBoost: 3 },
    a_submission: { type: "active", name: "地狱翻滚", chargeNeed: 104, dmgBoost: 0.24, moraleBoost: 3 },
    a_cross_chop: { type: "active", name: "十字劈", chargeNeed: 108, dmgBoost: 0.28, moraleBoost: 3 },
    a_bite: { type: "active", name: "咬住", chargeNeed: 96, dmgBoost: 0.18, moraleBoost: 3 },
    a_hyper_fang: { type: "active", name: "必杀门牙", chargeNeed: 100, dmgBoost: 0.22, moraleBoost: 3 },
    a_wing_attack: { type: "active", name: "翅膀攻击", chargeNeed: 98, dmgBoost: 0.19, moraleBoost: 3 },
    a_sludge: { type: "active", name: "污泥攻击", chargeNeed: 100, dmgBoost: 0.2, moraleBoost: 3 },
    a_air_cutter: { type: "active", name: "空气利刃", chargeNeed: 100, dmgBoost: 0.22, moraleBoost: 3 },
    a_bug_bite: { type: "active", name: "虫咬", chargeNeed: 92, dmgBoost: 0.14, moraleBoost: 3 },
    a_harden: { type: "active", name: "变硬", chargeNeed: 88, dmgBoost: 0.08, moraleBoost: 5 },
    a_gust: { type: "active", name: "起风", chargeNeed: 96, dmgBoost: 0.2, moraleBoost: 3 },
    a_bug_buzz: { type: "active", name: "虫鸣", chargeNeed: 106, dmgBoost: 0.24, moraleBoost: 3 },
    a_seismic_toss: { type: "active", name: "地球上投", chargeNeed: 108, dmgBoost: 0.24, moraleBoost: 3 },
    a_synthesis: { type: "active", name: "光合作用", chargeNeed: 90, dmgBoost: 0.12, moraleBoost: 6 },
    a_petal_dance: { type: "active", name: "花瓣舞", chargeNeed: 110, dmgBoost: 0.26, moraleBoost: 3 },
    a_dragon_rage: { type: "active", name: "龙之怒", chargeNeed: 100, dmgBoost: 0.22, moraleBoost: 3 },
    p_overgrow: { type: "passive", name: "茂盛", atkPct: 0.08, hpPct: 0.04 },
    p_thick_fat: { type: "passive", name: "厚脂肪", hpPct: 0.14 },
    p_blaze: { type: "passive", name: "猛火", atkPct: 0.1 },
    p_solar_power: { type: "passive", name: "太阳之力", atkPct: 0.12 },
    p_torrent: { type: "passive", name: "激流", atkPct: 0.08, hpPct: 0.06 },
    p_rain_dish: { type: "passive", name: "接雨盘", hpPct: 0.1, gatherSpeedPct: 0.04 },
    p_static: { type: "passive", name: "静电", atkPct: 0.06, teamDmgPct: 0.04 },
    p_cute_charm: { type: "passive", name: "迷人之躯", enemyDmgDown: 0.04 },
    p_guts: { type: "passive", name: "毅力", atkPct: 0.1 },
    p_run_away: { type: "passive", name: "逃跑", gatherSpeedPct: 0.06 },
    p_inner_focus: { type: "passive", name: "精神力", enemyDmgDown: 0.04 },
    p_shield_dust: { type: "passive", name: "鳞粉", gatherYieldPct: 0.05 },
    p_shed_skin: { type: "passive", name: "蜕皮", hpPct: 0.06 },
    p_compound_eyes: { type: "passive", name: "复眼", atkPct: 0.06, gatherYieldPct: 0.05 },
    g_scavenge: { type: "gather", name: "拾荒", desc: "全资源采集收益 +5%", gatherYieldPct: 0.05 },
    g_cave_scout: { type: "gather", name: "洞窟侦察", desc: "钢材／燃料采集收益 +8%", gatherYieldPct: 0.08 },
    g_silk_line: { type: "gather", name: "丝线牵引", desc: "木材采集速度 +6%", gatherSpeedPct: 0.06 },
    g_pollen: { type: "gather", name: "花粉采集", desc: "粮食采集收益 +10%", gatherYieldPct: 0.1 },
    g_photosynth: { type: "gather", name: "草本采集", desc: "木材／粮食采集收益 +10%", gatherYieldPct: 0.1 },
    g_warm_forge: { type: "gather", name: "热能冶炼", desc: "钢材采集收益 +10%", gatherYieldPct: 0.1 },
    g_aqua_mine: { type: "gather", name: "水脉开采", desc: "全资源采集速度 +6%", gatherSpeedPct: 0.06 },
    g_static_field: { type: "gather", name: "电场加速", desc: "采集速度 +8%", gatherSpeedPct: 0.08 },
    g_sing_rest: { type: "gather", name: "歌唱休整", desc: "采集收益 +8%，士气不易下降", gatherYieldPct: 0.08 },
    g_muscle_mine: { type: "gather", name: "怪力搬运", desc: "燃料采集收益 +12%", gatherYieldPct: 0.12 }
  },
  stages: [
    { stage: 1, chapterId: "c1", enemyPower: 228, enemyHpMult: 1.02, enemyAtkMult: 1.0, loot: { wood: [24, 44], steel: [10, 22], food: [18, 38], fuel: [8, 18] } },
    { stage: 2, chapterId: "c2", enemyPower: 274, enemyHpMult: 1.05, enemyAtkMult: 1.02, loot: { wood: [28, 50], steel: [12, 26], food: [20, 42], fuel: [10, 20] } },
    { stage: 3, chapterId: "c3", enemyPower: 338, enemyHpMult: 1.08, enemyAtkMult: 1.05, loot: { wood: [30, 56], steel: [14, 30], food: [24, 48], fuel: [12, 24] } },
    { stage: 4, chapterId: "c4", enemyPower: 408, enemyHpMult: 1.1, enemyAtkMult: 1.08, loot: { wood: [34, 62], steel: [16, 34], food: [26, 54], fuel: [14, 28] } },
    { stage: 5, chapterId: "c5", enemyPower: 480, enemyHpMult: 1.12, enemyAtkMult: 1.12, isBoss: true, bossName: "班基拉斯", loot: { wood: [38, 70], steel: [18, 38], food: [30, 62], fuel: [16, 32] } },
    { stage: 6, chapterId: "c6", enemyPower: 560, enemyHpMult: 1.14, enemyAtkMult: 1.15, loot: { wood: [42, 78], steel: [22, 44], food: [34, 68], fuel: [18, 36] } },
    { stage: 7, chapterId: "c7", enemyPower: 650, enemyHpMult: 1.18, enemyAtkMult: 1.18, loot: { wood: [46, 86], steel: [24, 50], food: [38, 76], fuel: [22, 42] } },
    { stage: 8, chapterId: "c8", enemyPower: 742, enemyHpMult: 1.2, enemyAtkMult: 1.22, loot: { wood: [52, 96], steel: [28, 56], food: [42, 84], fuel: [24, 48] } },
    { stage: 9, chapterId: "c9", enemyPower: 840, enemyHpMult: 1.25, enemyAtkMult: 1.28, loot: { wood: [58, 108], steel: [32, 64], food: [48, 94], fuel: [28, 56] } },
    { stage: 10, chapterId: "c10", enemyPower: 980, enemyHpMult: 1.34, enemyAtkMult: 1.35, isBoss: true, bossName: "烈空坐", loot: { wood: [70, 130], steel: [40, 80], food: [58, 112], fuel: [34, 70] } }
   ]
};

function allHeroDefs_() {
  const g = gameplay || {};
  return [...(Array.isArray(g.heroes) ? g.heroes : []), ...(Array.isArray(g.heroDexExtras) ? g.heroDexExtras : [])];
}
function heroDefById_(id) {
  return allHeroDefs_().find((x) => x.id === id) || null;
}

function pkNatDexNum_(slug) {
  const k = String(slug || "").toLowerCase();
  const n = typeof window !== "undefined" && window.PK_NATDEX ? window.PK_NATDEX[k] : undefined;
  return Number.isFinite(n) ? n : 100000;
}

function allHeroDefsDeduped_() {
  return [...new Map(allHeroDefs_().map((h) => [h.id, h])).values()];
}

function openHeroDexModal_() {
  const modal = byId("hero-dex-modal");
  const list = byId("hero-dex-list");
  const sum = byId("hero-dex-summary");
  if (!modal || !list || !sum) return;
  const owned = new Set((state.heroes || []).map((h) => h.id));
  const defs = allHeroDefsDeduped_().filter((d) => d.id && d.name);
  defs.sort(
    (a, b) => pkNatDexNum_(a.slug) - pkNatDexNum_(b.slug) || String(a.name).localeCompare(String(b.name), "zh-Hans")
  );
  const nOwn = defs.filter((d) => owned.has(d.id)).length;
  sum.innerHTML = `已收集图鉴编号：<strong>${nOwn}</strong> / <strong>${defs.length}</strong>（按全国图鉴编号排序，参考 <a href="https://wiki.52poke.com/zh-hant/%E5%AE%9D%E5%8F%AF%E6%A2%A6%E5%88%97%E8%A1%A8%EF%BC%88%E6%8C%89%E5%85%A8%E5%9B%BD%E5%9B%BE%E9%89%B4%E7%BC%96%E5%8F%B7%EF%BC%89" target="_blank" rel="noopener noreferrer">神奇宝贝百科 · 宝可梦列表（按全国图鉴编号）</a>）`;
  list.innerHTML = defs
    .map((d) => {
      const nd = pkNatDexNum_(d.slug);
      const ndLab = nd >= 100000 ? "?" : nd;
      const ok = owned.has(d.id);
      return `<div class="hero-dex-row${ok ? " is-owned" : ""}"><span class="hero-dex-no">#${ndLab}</span><span class="hero-dex-tick">${ok ? "✓" : "·"}</span><span class="hero-dex-name">${escapeHtml_(d.name)}</span><span class="muted">${escapeHtml_(d.role)}</span></div>`;
    })
    .join("");
  modal.classList.remove("hidden");
}

function heroEvolutionRootId_(heroId) {
  const byId = new Map(allHeroDefs_().map((h) => [h.id, h]));
  let cur = heroId;
  for (let guard = 0; guard < 16; guard++) {
    const parent = [...byId.values()].find((h) => h.evolveToId === cur);
    if (!parent) return cur;
    cur = parent.id;
  }
  return cur;
}
function evolutionStepsFromStarter_(starterId, heroId) {
  const byId = new Map(allHeroDefs_().map((h) => [h.id, h]));
  let steps = 0;
  let cur = starterId;
  while (cur && cur !== heroId) {
    const h = byId.get(cur);
    if (!h?.evolveToId) return -1;
    cur = h.evolveToId;
    steps += 1;
    if (steps > 20) return -1;
  }
  return cur === heroId ? steps : -1;
}

const GATHER_NODE_DEFS = [
  { id: "n1", name: "白桦林", type: "wood", baseYield: 90, durationSec: 45 },
  { id: "n2", name: "废矿脉", type: "steel", baseYield: 55, durationSec: 55 },
  { id: "n3", name: "冻土猎场", type: "food", baseYield: 80, durationSec: 50 },
  { id: "n4", name: "裂隙燃井", type: "fuel", baseYield: 45, durationSec: 60 },
  { id: "n5", name: "深雪富集林", type: "wood", baseYield: 122, durationSec: 42, unlock: { nodeId: "n1", minClaims: 6 } },
  { id: "n6", name: "熔脉复合井", type: "steel", baseYield: 88, durationSec: 48, unlock: { nodeId: "n2", minClaims: 6 }, extraYieldType: "fuel", extraYieldRatio: 0.28 },
  { id: "m1", name: "中级·桦木林带", type: "wood", baseYield: 112, durationSec: 44, unlock: { nodeId: "n1", minClaims: 5 } },
  { id: "m2", name: "中级·浅层矿脉", type: "steel", baseYield: 70, durationSec: 52, unlock: { nodeId: "n2", minClaims: 5 } },
  { id: "m3", name: "中级·冻原猎场", type: "food", baseYield: 100, durationSec: 48, unlock: { nodeId: "n3", minClaims: 5 } },
  { id: "m4", name: "中级·地热裂井", type: "fuel", baseYield: 58, durationSec: 56, unlock: { nodeId: "n4", minClaims: 5 } },
  { id: "m5", name: "中级·密雪林场", type: "wood", baseYield: 125, durationSec: 42, unlock: { nodeId: "n1", minClaims: 12 } },
  { id: "m6", name: "中级·深井矿层", type: "steel", baseYield: 78, durationSec: 50, unlock: { nodeId: "n2", minClaims: 12 } },
  { id: "m7", name: "中级·苔原猎区", type: "food", baseYield: 110, durationSec: 46, unlock: { nodeId: "n3", minClaims: 12 } },
  { id: "m8", name: "中级·熔隙燃源", type: "fuel", baseYield: 65, durationSec: 54, unlock: { nodeId: "n4", minClaims: 12 } },
  { id: "m9", name: "中级·远桦采区", type: "wood", baseYield: 135, durationSec: 40, unlock: { nodeId: "n1", minClaims: 22 } },
  { id: "m10", name: "中级·复合矿带", type: "steel", baseYield: 85, durationSec: 48, unlock: { nodeId: "n2", minClaims: 22 } },
  { id: "h1", name: "高级·深雪林产区", type: "wood", baseYield: 158, durationSec: 40, unlock: { nodeId: "m1", minClaims: 10 } },
  { id: "h2", name: "高级·熔芯矿坑", type: "steel", baseYield: 98, durationSec: 46, unlock: { nodeId: "m2", minClaims: 10 } },
  { id: "h3", name: "高级·冰原猎场", type: "food", baseYield: 142, durationSec: 44, unlock: { nodeId: "m3", minClaims: 10 } },
  { id: "h4", name: "高级·地火燃井", type: "fuel", baseYield: 88, durationSec: 50, unlock: { nodeId: "m4", minClaims: 10 } },
  { id: "h5", name: "高级·极北林场", type: "wood", baseYield: 168, durationSec: 38, unlock: { nodeId: "m5", minClaims: 10 } },
  { id: "h6", name: "高级·深脉钢层", type: "steel", baseYield: 105, durationSec: 44, unlock: { nodeId: "m6", minClaims: 10 } },
  { id: "h7", name: "高级·苔原粮仓", type: "food", baseYield: 152, durationSec: 42, unlock: { nodeId: "m7", minClaims: 10 } },
  { id: "h8", name: "高级·裂隙热井", type: "fuel", baseYield: 95, durationSec: 48, unlock: { nodeId: "m8", minClaims: 10 } },
  { id: "h9", name: "高级·古桦禁区", type: "wood", baseYield: 178, durationSec: 36, unlock: { nodeId: "m9", minClaims: 10 } },
  { id: "h10", name: "高级·复合深井", type: "steel", baseYield: 112, durationSec: 42, unlock: { nodeId: "m10", minClaims: 10 }, extraYieldType: "fuel", extraYieldRatio: 0.22 },
];
const GATHER_DURATION_OPTIONS = [
  { label: "15分钟", min: 15 },
  { label: "1小时", min: 60 },
  { label: "3小时", min: 180 },
  { label: "6小时", min: 360 },
  { label: "12小时", min: 720 },
];

/** 征募寻访：单价与十连（10+1） */
const RECRUIT_GEM_COST = 10;
const RECRUIT_TEN_GEM_COST = 100;
/** 采集加速券：每张缩短的秒数 */
const GATHER_SPEEDUP_SEC_PER_TICKET = 60;

function roleSkillBundle_(role) {
  const M = {
    草: { activeSkillId: "a_vine_whip", passiveSkillId: "p_overgrow", gatherSkillId: "g_photosynth", battleExtraSkillId: "a_seed_bomb" },
    火: { activeSkillId: "a_ember", passiveSkillId: "p_blaze", gatherSkillId: "g_warm_forge", battleExtraSkillId: "a_fire_spin" },
    水: { activeSkillId: "a_water_gun", passiveSkillId: "p_torrent", gatherSkillId: "g_aqua_mine", battleExtraSkillId: "a_bubble_beam" },
    电: { activeSkillId: "a_thunder_shock", passiveSkillId: "p_static", gatherSkillId: "g_static_field", battleExtraSkillId: "a_volt_tackle" },
    妖精: { activeSkillId: "a_disarming_voice", passiveSkillId: "p_cute_charm", gatherSkillId: "g_sing_rest", battleExtraSkillId: "a_hyper_voice" },
    格斗: { activeSkillId: "a_karate_chop", passiveSkillId: "p_guts", gatherSkillId: "g_muscle_mine", battleExtraSkillId: "a_seismic_toss" },
    一般: { activeSkillId: "a_bite", passiveSkillId: "p_run_away", gatherSkillId: "g_scavenge", battleExtraSkillId: "a_hyper_fang" },
    毒: { activeSkillId: "a_sludge", passiveSkillId: "p_inner_focus", gatherSkillId: "g_cave_scout", battleExtraSkillId: "a_sludge" },
    虫: { activeSkillId: "a_bug_bite", passiveSkillId: "p_shield_dust", gatherSkillId: "g_silk_line", battleExtraSkillId: "a_bug_buzz" },
    飞行: { activeSkillId: "a_wing_attack", passiveSkillId: "p_inner_focus", gatherSkillId: "g_cave_scout", battleExtraSkillId: "a_air_cutter" },
    地面: { activeSkillId: "a_bite", passiveSkillId: "p_run_away", gatherSkillId: "g_muscle_mine", battleExtraSkillId: "a_seismic_toss" },
    岩石: { activeSkillId: "a_harden", passiveSkillId: "p_inner_focus", gatherSkillId: "g_cave_scout", battleExtraSkillId: "a_seismic_toss" },
    冰: { activeSkillId: "a_ice_beam", passiveSkillId: "p_inner_focus", gatherSkillId: "g_aqua_mine", battleExtraSkillId: "a_ice_beam" },
    超能力: { activeSkillId: "a_water_pulse", passiveSkillId: "p_inner_focus", gatherSkillId: "g_static_field", battleExtraSkillId: "a_dragon_rage" },
    幽灵: { activeSkillId: "a_sludge", passiveSkillId: "p_inner_focus", gatherSkillId: "g_cave_scout", battleExtraSkillId: "a_dragon_rage" },
    龙: { activeSkillId: "a_dragon_rage", passiveSkillId: "p_blaze", gatherSkillId: "g_warm_forge", battleExtraSkillId: "a_air_slash" },
    恶: { activeSkillId: "a_bite", passiveSkillId: "p_run_away", gatherSkillId: "g_scavenge", battleExtraSkillId: "a_sludge" },
    钢: { activeSkillId: "a_karate_chop", passiveSkillId: "p_inner_focus", gatherSkillId: "g_cave_scout", battleExtraSkillId: "a_hydro_pump" },
  };
  return M[role] || M.一般;
}

function applyPkEvolveFirst_(row) {
  const m = typeof window !== "undefined" && window.PK_EVOLVE_FIRST ? window.PK_EVOLVE_FIRST : {};
  const ev = m[row.slug];
  if (!ev || !ev.to) return;
  const toSlug = String(ev.to).toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!toSlug) return;
  row.evolveToId = `pk_${toSlug}`;
  row.evolveAtLevel = Number(ev.lv) || 36;
}

function parsePkPipeLineToHeroRow_(line) {
  const parts = String(line).split("|");
  const slug = (parts[0] || "rattata").trim();
  const name = (parts[1] || slug).trim();
  const role = (parts[2] || "一般").trim();
  const atk = Number(parts[3]) || 40;
  const hp = Number(parts[4]) || 110;
  const sk = roleSkillBundle_(role);
  const safeSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
  const row = {
    id: `pk_${safeSlug}`,
    name,
    role,
    atk,
    hp,
    slug: safeSlug,
    ...sk,
    evolveToId: "",
    evolveAtLevel: 999,
  };
  applyPkEvolveFirst_(row);
  return row;
}

function getPkExtraDexPipeHeroRows_() {
  const raw = typeof window !== "undefined" && window.PK_EXTRA_DEX_PIPES ? window.PK_EXTRA_DEX_PIPES : [];
  return raw.map((line) => parsePkPipeLineToHeroRow_(line));
}

let _bulkRecruitDexCache = null;
function getBulkRecruitDex100_() {
  if (_bulkRecruitDexCache) return _bulkRecruitDexCache;
  const raw = typeof window !== "undefined" && window.PK_RECRUIT_PIPE_ROWS ? window.PK_RECRUIT_PIPE_ROWS : [];
  _bulkRecruitDexCache = raw.map((line) => parsePkPipeLineToHeroRow_(line));
  return _bulkRecruitDexCache;
}

let gameplay = loadGameplay();
let HERO_POOL = gameplay.heroes;

function recruitPoolIds_() {
  return getBulkRecruitDex100_().map((h) => h.id);
}

function evoStoneDefForRole_(role) {
  const r = String(role || "一般");
  const M = {
    草: { id: "evo_grass", name: "草之石", icon: "🌿" },
    火: { id: "evo_fire", name: "火之石", icon: "🔥" },
    水: { id: "evo_water", name: "水之石", icon: "💧" },
    电: { id: "evo_electric", name: "雷之石", icon: "⚡" },
    妖精: { id: "evo_fairy", name: "妖精之石", icon: "✨" },
    格斗: { id: "evo_fighting", name: "格斗之石", icon: "🥊" },
    一般: { id: "evo_normal", name: "一般之石", icon: "⚪" },
    毒: { id: "evo_poison", name: "毒之石", icon: "☠" },
    虫: { id: "evo_bug", name: "虫之石", icon: "🐛" },
    飞行: { id: "evo_flying", name: "飞行之石", icon: "🪶" },
    地面: { id: "evo_ground", name: "地面之石", icon: "🟤" },
    岩石: { id: "evo_rock", name: "岩石之石", icon: "🪨" },
    冰: { id: "evo_ice", name: "冰之石", icon: "❄" },
    超能力: { id: "evo_psychic", name: "超能之石", icon: "🔮" },
    幽灵: { id: "evo_ghost", name: "幽灵之石", icon: "👻" },
    龙: { id: "evo_dragon", name: "龙之石", icon: "🐉" },
    恶: { id: "evo_dark", name: "恶之石", icon: "🌑" },
    钢: { id: "evo_steel", name: "钢之石", icon: "⚙" },
  };
  return M[r] || M.一般;
}

function inventoryQty_(itemId) {
  const row = (state.inventory || []).find((x) => x.id === itemId);
  return row ? Number(row.qty || 0) : 0;
}

function addInventoryItem_(itemId, qty, name, icon, meta) {
  const inv = Array.isArray(state.inventory) ? state.inventory : [];
  const row = inv.find((x) => x.id === itemId);
  const extra = meta && typeof meta === "object" ? { ...meta } : {};
  if (row) {
    row.qty = Number(row.qty || 0) + qty;
    Object.assign(row, extra);
  } else inv.push({ id: itemId, name: name || itemId, icon: icon || "📦", qty, ...extra });
  state.inventory = inv;
}

function consumeInventoryItem_(itemId, qty) {
  const inv = Array.isArray(state.inventory) ? state.inventory : [];
  const row = inv.find((x) => x.id === itemId);
  if (!row || Number(row.qty || 0) < qty) return false;
  row.qty = Number(row.qty || 0) - qty;
  if (row.qty <= 0) state.inventory = inv.filter((x) => x.id !== itemId);
  else state.inventory = inv;
  return true;
}

function resourceTicketDef_(resType) {
  const M = {
    wood: { lab: "木材", icon: "🪵" },
    steel: { lab: "钢材", icon: "⚙" },
    food: { lab: "粮食", icon: "🍖" },
    fuel: { lab: "燃料", icon: "🔥" },
  };
  const x = M[resType] || { lab: resType, icon: "📦" };
  return {
    id: `rt_${resType}`,
    name: `${x.lab}资源券（×${RESOURCE_TICKET_UNIT}）`,
    icon: x.icon,
    resType,
  };
}

function sealAllResourceOverflow_() {
  const U = RESOURCE_TICKET_UNIT;
  const keys = ["wood", "steel", "food", "fuel"];
  let n = 0;
  for (const k of keys) {
    let stacks = Math.floor((state.resources[k] || 0) / U);
    while (stacks > 0) {
      state.resources[k] = (state.resources[k] || 0) - U;
      const d = resourceTicketDef_(k);
      addInventoryItem_(d.id, 1, d.name, d.icon, { kind: "resticket", resType: k });
      n += 1;
      stacks -= 1;
    }
  }
  if (!n) return alert(`四项基础资源任一项需 ≥${U} 才可铸 1 张资源券`);
  logEvent("城镇", `资源装箱 ×${n}（每券 ${U}）`);
  save();
  renderAll();
  alert(`已铸 ${n} 张资源券。在背包中可兑回资源，或 1:1 换成加速券。`);
}

function useResourceTicket_(itemId, mode) {
  const row = (state.inventory || []).find((x) => x.id === itemId);
  if (!row || inventoryRowKind_(row) !== "resticket") return;
  const k = row.resType;
  if (!k || !["wood", "steel", "food", "fuel"].includes(k)) return alert("资源券类型无效");
  if (!consumeInventoryItem_(itemId, 1)) return alert("数量不足");
  if (mode === "speed") {
    state.items.speedup = (state.items.speedup || 0) + 1;
    logEvent("背包", "资源券 → 加速券 ×1");
  } else {
    addRes({ [k]: RESOURCE_TICKET_UNIT });
    logEvent("背包", `资源券兑现：${k} +${RESOURCE_TICKET_UNIT}`);
  }
  save();
  renderAll();
}

const ACT_EVENT_OFFERS = [
  { id: "ev_w", cost: 6, label: "木材包", res: { wood: 55, food: 20 } },
  { id: "ev_s", cost: 6, label: "钢材包", res: { steel: 42, wood: 18 } },
  { id: "ev_mix", cost: 9, label: "综合补给", res: { wood: 35, steel: 28, food: 40, fuel: 22 } },
  { id: "ev_spd", cost: 12, label: "工时礼包", res: { food: 30, fuel: 35 }, speedup: 1 },
];

function normalizeActivity_() {
  if (!state.activity || typeof state.activity !== "object") state.activity = {};
  const a = state.activity;
  if (typeof a.checkInDate !== "string") a.checkInDate = "";
  if (!Number.isFinite(a.streak)) a.streak = 0;
  if (!Number.isFinite(a.tokens)) a.tokens = 0;
  if (!Number.isFinite(a.lordPts)) a.lordPts = 0;
  if (!a.lordClaims || typeof a.lordClaims !== "object") a.lordClaims = {};
}

function bumpActivityBattleWin_() {
  normalizeActivity_();
  state.activity.tokens = (state.activity.tokens || 0) + 3;
  state.activity.lordPts = (state.activity.lordPts || 0) + 12;
}

function bumpActivityBuildOrdered_() {
  normalizeActivity_();
  state.activity.lordPts = (state.activity.lordPts || 0) + 8;
}

function bumpActivityTechDone_() {
  normalizeActivity_();
  state.activity.lordPts = (state.activity.lordPts || 0) + 10;
}

function isoDateAddDays_(iso, deltaDays) {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function claimActivityCheckIn_() {
  normalizeActivity_();
  const a = state.activity;
  const today = isoDateLocal_();
  if (a.checkInDate === today) return alert("今日已签到");
  const yest = isoDateAddDays_(today, -1);
  if (a.checkInDate === yest) a.streak = (a.streak || 0) + 1;
  else a.streak = 1;
  a.checkInDate = today;
  const bonus = 12 + Math.min(36, (a.streak - 1) * 4);
  addRes({ wood: bonus, food: Math.floor(bonus * 0.75) });
  a.tokens = (a.tokens || 0) + 2 + Math.min(6, a.streak);
  logEvent("活动", `每日签到：连续 ${a.streak} 天`);
  save();
  renderActivitiesHub_();
  renderCity();
  alert(`签到成功！连续 ${a.streak} 天 · 木材+${bonus} 粮食+${Math.floor(bonus * 0.75)} · 活动代币+${2 + Math.min(6, a.streak)}`);
}

function buyActivityOffer_(offerId) {
  const o = ACT_EVENT_OFFERS.find((x) => x.id === offerId);
  if (!o) return;
  normalizeActivity_();
  if ((state.activity.tokens || 0) < o.cost) return alert("活动代币不足（战斗胜利、签到可获得）");
  state.activity.tokens -= o.cost;
  addRes(o.res || {});
  if (o.speedup) state.items.speedup = (state.items.speedup || 0) + o.speedup;
  logEvent("活动", `兑换「${o.label}」`);
  save();
  renderActivitiesHub_();
  renderCity();
  renderBag_();
}

function tryClaimLordMilestone_(thr) {
  normalizeActivity_();
  const a = state.activity;
  const key = `m${thr}`;
  if (a.lordClaims[key]) return alert("该档奖励已领取");
  if ((a.lordPts || 0) < thr) return alert("最强领主积分不足");
  a.lordClaims[key] = true;
  const gemMap = { 40: 2, 80: 5, 140: 10, 220: 18 };
  const g = gemMap[thr] || 3;
  state.items.gems = (state.items.gems || 0) + g;
  logEvent("活动", `最强领主里程碑 ${thr} 积分：+${g} 💎`);
  save();
  renderActivitiesHub_();
  renderCity();
  alert(`领取成功：+${g} 💎`);
}

function ensureActivityMinigames_() {
  if (!state.activityMinigames || typeof state.activityMinigames !== "object") state.activityMinigames = {};
  const m = state.activityMinigames;
  if (typeof m.bearDay !== "string") m.bearDay = "";
  if (!Number.isFinite(m.bearHp)) m.bearHp = 0;
  if (typeof m.bearDefeated !== "boolean") m.bearDefeated = false;
  if (typeof m.mineDay !== "string") m.mineDay = "";
  if (!Number.isFinite(m.minePick)) m.minePick = 0;
  if (typeof m.spinDay !== "string") m.spinDay = "";
  if (typeof m.fishDay !== "string") m.fishDay = "";
  if (!Number.isFinite(m.fishTimes)) m.fishTimes = 0;
  if (typeof m.escortDay !== "string") m.escortDay = "";
  if (typeof m.escortDone !== "boolean") m.escortDone = false;
}

function activityBearHit_() {
  ensureActivityMinigames_();
  normalizeActivity_();
  const today = isoDateLocal_();
  const m = state.activityMinigames;
  if (m.bearDay !== today) {
    m.bearDay = today;
    m.bearHp = 90 + Math.floor(Math.random() * 51);
    m.bearDefeated = false;
  }
  if (m.bearDefeated) return alert("今日猎熊奖励已领取");
  const dmg = 12 + Math.floor(Math.random() * 19);
  m.bearHp = Math.max(0, Number(m.bearHp) - dmg);
  if (m.bearHp <= 0) {
    m.bearDefeated = true;
    state.activity.tokens = (state.activity.tokens || 0) + 10;
    state.activity.lordPts = (state.activity.lordPts || 0) + 30;
    logEvent("活动", "雪原猎熊：讨伐成功 · 代币+10 · 最强领主积分+30");
    alert("讨伐成功！活动代币+10、最强领主积分+30");
  } else {
    logEvent("活动", `雪原猎熊：造成 ${dmg} 伤害，野熊剩余约 ${m.bearHp} HP`);
  }
  save();
  renderActivitiesHub_();
  renderCity();
}

function activityMinePick_() {
  ensureActivityMinigames_();
  normalizeActivity_();
  const today = isoDateLocal_();
  const m = state.activityMinigames;
  if (m.mineDay !== today) {
    m.mineDay = today;
    m.minePick = 0;
  }
  if (m.minePick >= 10) return alert("今日矿区开凿次数已用尽");
  m.minePick += 1;
  const r = Math.random();
  let rewardMsg = "";
  if (r < 0.22) {
    state.activity.tokens = (state.activity.tokens || 0) + 3;
    logEvent("活动", "燃霜矿区：凿出活动代币 +3");
    rewardMsg = "活动代币 +3";
  } else if (r < 0.45) {
    const n = 18 + Math.floor(Math.random() * 24);
    addRes({ wood: n });
    logEvent("活动", "燃霜矿区：木材矿脉");
    rewardMsg = `木材 +${n}`;
  } else if (r < 0.68) {
    const n = 16 + Math.floor(Math.random() * 20);
    addRes({ steel: n });
    logEvent("活动", "燃霜矿区：钢材矿脉");
    rewardMsg = `钢材 +${n}`;
  } else {
    const food = 20 + Math.floor(Math.random() * 22);
    const fuel = 12 + Math.floor(Math.random() * 16);
    addRes({ food, fuel });
    logEvent("活动", "燃霜矿区：补给矿脉");
    rewardMsg = `粮食 +${food} / 燃料 +${fuel}`;
  }
  save();
  renderActivitiesHub_();
  renderCity();
  alert(`燃霜矿区本次收获：${rewardMsg}（今日 ${m.minePick}/10）`);
}

function activitySpinWheel_(silent = false) {
  ensureActivityMinigames_();
  normalizeActivity_();
  const today = isoDateLocal_();
  const m = state.activityMinigames;
  if (m.spinDay === today) return alert("今日已转动过幸运轮盘");
  m.spinDay = today;
  const roll = Math.random();
  let msg = "";
  if (roll < 0.28) {
    addRes({ wood: 55 });
    msg = "木材 +55";
  } else if (roll < 0.52) {
    addRes({ steel: 42 });
    msg = "钢材 +42";
  } else if (roll < 0.72) {
    state.activity.tokens = (state.activity.tokens || 0) + 8;
    msg = "活动代币 +8";
  } else if (roll < 0.88) {
    state.activity.lordPts = (state.activity.lordPts || 0) + 22;
    msg = "最强领主积分 +22";
  } else if (roll < 0.96) {
    state.items.gems = (state.items.gems || 0) + 1;
    msg = "钻石 +1";
  } else {
    state.items.speedup = (state.items.speedup || 0) + 1;
    msg = "通用加速 +1";
  }
  logEvent("活动", `幸运轮盘：${msg}`);
  save();
  renderActivitiesHub_();
  renderCity();
  if (!silent) alert(`转盘结果：${msg}`);
  return msg;
}

function activityIceFish_() {
  ensureActivityMinigames_();
  normalizeActivity_();
  const today = isoDateLocal_();
  const m = state.activityMinigames;
  if (m.fishDay !== today) {
    m.fishDay = today;
    m.fishTimes = 0;
  }
  if (m.fishTimes >= 5) return alert("今日冰湖垂钓次数已达上限（5 次）");
  m.fishTimes += 1;
  const roll = Math.random();
  let msg = "";
  if (roll < 0.5) {
    const food = 28 + Math.floor(Math.random() * 30);
    addRes({ food });
    msg = `粮食 +${food}`;
  } else if (roll < 0.82) {
    const token = 2 + Math.floor(Math.random() * 3);
    state.activity.tokens = (state.activity.tokens || 0) + token;
    msg = `活动代币 +${token}`;
  } else {
    state.items.speedup = (state.items.speedup || 0) + 1;
    msg = "加速券 +1";
  }
  logEvent("活动", `冰湖垂钓：${msg}`);
  save();
  renderActivitiesHub_();
  renderCity();
  renderBag_();
  alert(`冰湖垂钓：${msg}（今日 ${m.fishTimes}/5）`);
}

function activityEscort_() {
  ensureActivityMinigames_();
  normalizeActivity_();
  const today = isoDateLocal_();
  const m = state.activityMinigames;
  if (m.escortDay !== today) {
    m.escortDay = today;
    m.escortDone = false;
  }
  if (m.escortDone) return alert("今日护送任务已完成");
  m.escortDone = true;
  const wood = 65 + Math.floor(Math.random() * 35);
  const steel = 40 + Math.floor(Math.random() * 28);
  addRes({ wood, steel });
  state.activity.tokens = (state.activity.tokens || 0) + 6;
  state.activity.lordPts = (state.activity.lordPts || 0) + 18;
  logEvent("活动", `霜原护送：木材+${wood} 钢材+${steel} 代币+6 领主积分+18`);
  save();
  renderActivitiesHub_();
  renderCity();
  alert(`护送成功：木材+${wood}、钢材+${steel}、活动代币+6、最强领主积分+18`);
}

function fireCrystalUnlocked_() {
  return (state.buildings?.heater || 1) >= FIRE_CRYSTAL_UNLOCK_HEATER_LV;
}

function maxSquadSize_() {
  const extra = Math.max(0, Math.floor(getTechBonus_("squadCap")));
  return clamp(3 + extra, 3, 6);
}

function buildingStar_(buildingId) {
  return Math.max(0, Math.min(MAX_BUILDING_STARS, Number(state.buildingStars?.[buildingId] || 0)));
}

function nextBuildingStarFireCost_(buildingId) {
  const cur = buildingStar_(buildingId);
  if (cur >= MAX_BUILDING_STARS) return null;
  return 2 + cur * 2;
}

function formatTechBuildingStarsReq_(t) {
  const rs = t?.reqBuildingStars;
  if (!rs?.length) return "";
  return rs
    .map((r) => `${BUILDING_DEFS.find((b) => b.id === r.id)?.name || r.id} ★${r.stars}`)
    .join(" · ");
}

function techBuildingStarsOk_(t) {
  const rs = t?.reqBuildingStars;
  if (!rs?.length) return true;
  return rs.every((r) => buildingStar_(r.id) >= Number(r.stars || 0));
}

function grantRandomSkillBookDrop_() {
  const pool = typeof window !== "undefined" && window.SKILL_BOOK_DEFS ? window.SKILL_BOOK_DEFS : [];
  if (!pool.length) return;
  const sb = pool[Math.floor(Math.random() * pool.length)];
  addInventoryItem_(sb.id, 1, sb.name, sb.icon, { kind: "skillbook", skillRole: sb.role, slot: sb.slot, skillId: sb.skillId });
}

function tickHeaterFireCrystalAndBooks_() {
  if (!fireCrystalUnlocked_()) return;
  const lv = state.buildings.heater || 1;
  let fc = 0;
  if (Math.random() < 0.3) fc += 1;
  if (lv >= 14 && Math.random() < 0.22) fc += 1;
  if (fc > 0) {
    state.resources.fireCrystal = (state.resources.fireCrystal || 0) + fc;
    logEvent("中央熔炉", `凝结火晶 +${fc}（Lv.${lv}）`);
  }
  const pBook = Math.min(0.14, 0.06 + Math.max(0, lv - FIRE_CRYSTAL_UNLOCK_HEATER_LV) * 0.012);
  if (Math.random() < pBook) grantRandomSkillBookDrop_();
}

function upgradeBuildingStar_(buildingId) {
  if (!fireCrystalUnlocked_()) return alert(`中央熔炉需 Lv.${FIRE_CRYSTAL_UNLOCK_HEATER_LV} 才解锁火晶与建筑升星。`);
  const need = nextBuildingStarFireCost_(buildingId);
  if (need == null) return alert("该建筑星等已满。");
  const cur = state.resources.fireCrystal || 0;
  if (cur < need) return alert(`火晶不足：升星需要 ${need} 火晶（当前 ${cur}）。`);
  state.resources.fireCrystal = cur - need;
  state.buildingStars[buildingId] = buildingStar_(buildingId) + 1;
  const nm = BUILDING_DEFS.find((b) => b.id === buildingId)?.name || buildingId;
  logEvent("建筑", `${nm} 升星 → ★${state.buildingStars[buildingId]}（消耗火晶 ${need}）`);
  save();
  renderAll();
}

function inventoryRowKind_(row) {
  if (!row) return "other";
  if (row.kind === "skillbook" || String(row.id || "").startsWith("sb_")) return "skillbook";
  if (row.kind === "evostone" || String(row.id || "").startsWith("evo_")) return "evostone";
  if (row.kind === "resticket" || String(row.id || "").startsWith("rt_")) return "resticket";
  return "other";
}

function inventoryRowRole_(row) {
  if (!row) return "";
  return String(row.skillRole || row.evoRole || row.role || "").trim();
}

function tryLearnSkillBook_(heroId, itemId) {
  const h = state.heroes.find((x) => x.id === heroId);
  const row = (state.inventory || []).find((x) => x.id === itemId);
  if (!h || !row) {
    alert("无效目标或道具。");
    return false;
  }
  if (inventoryRowKind_(row) !== "skillbook") {
    alert("该道具不是技能书。");
    return false;
  }
  const rAttr = inventoryRowRole_(row);
  if (rAttr && h.role !== rAttr) {
    alert(`属性不符：需要「${rAttr}」属性宝可梦才能研读此书（当前为 ${h.role}）。`);
    return false;
  }
  const slot = row.slot;
  const sk = row.skillId;
  if (!slot || !sk) {
    alert("技能书资料不完整。");
    return false;
  }
  if (slot === "active") h.activeSkillId = sk;
  else if (slot === "passive") h.passiveSkillId = sk;
  else if (slot === "gather") h.gatherSkillId = sk;
  else if (slot === "battleExtra") h.battleExtraSkillId = sk;
  else {
    alert("未知技能栏位。");
    return false;
  }
  if (!consumeInventoryItem_(itemId, 1)) {
    alert("扣除技能书失败。");
    return false;
  }
  logEvent("英雄", `${h.name} 研读技能书，已更换对应栏位招式`);
  save();
  renderAll();
  alert(`「${h.name}」已从技能书习得招式！`);
  return true;
}

function heroRecruitOwned_(heroId) {
  return (state.heroes || []).some((h) => h.id === heroId);
}

function grantRecruitOrStone_(pickId) {
  const def = heroDefById_(pickId);
  if (!def) return { ok: false };
  if (heroRecruitOwned_(pickId)) {
    const stone = evoStoneDefForRole_(def.role);
    addInventoryItem_(stone.id, 1, stone.name, stone.icon, { kind: "evostone", evoRole: def.role });
    return { ok: true, duplicate: true, def, stone };
  }
  const row = {
    id: def.id,
    name: def.name,
    role: def.role,
    atk: def.atk,
    hp: def.hp,
    slug: def.slug,
    activeSkillId: def.activeSkillId,
    passiveSkillId: def.passiveSkillId,
    gatherSkillId: def.gatherSkillId,
    battleExtraSkillId: def.battleExtraSkillId,
    evolveToId: def.evolveToId || "",
    evolveAtLevel: Number.isFinite(def.evolveAtLevel) ? def.evolveAtLevel : 999,
    level: 1,
    stars: 1,
    exp: 0,
  };
  state.heroes.push(row);
  state.skillCharge[def.id] = 0;
  return { ok: true, duplicate: false, def };
}

function gatherNodeUnlocked_(def) {
  if (!def?.unlock) return true;
  const need = Number(def.unlock.minClaims || 0);
  const nid = def.unlock.nodeId;
  const c = state.gatherMastery?.[nid]?.claims || 0;
  return c >= need;
}

function gatherSiteTier_(nodeId) {
  const c = state.gatherMastery?.[nodeId]?.claims || 0;
  return Math.min(3, 1 + Math.floor(c / 5));
}

function bumpGatherMasteryForClaim_(one) {
  if (!one?.masteryOnce) return;
  const nid = one.nodeId;
  if (!nid) return;
  if (!state.gatherMastery) state.gatherMastery = {};
  state.gatherMastery[nid] = state.gatherMastery[nid] || { claims: 0 };
  state.gatherMastery[nid].claims = (state.gatherMastery[nid].claims || 0) + 1;
}

function isoDateLocal_() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const WILD_SPOTS = [
  { id: 0, name: "冰沟巡逻", x: 12, y: 22 },
  { id: 1, name: "废弃哨塔", x: 72, y: 18 },
  { id: 2, name: "冻原狼群", x: 44, y: 38 },
  { id: 3, name: "裂谷盗猎", x: 22, y: 62 },
  { id: 4, name: "黑雾残敌", x: 78, y: 58 },
  { id: 5, name: "远征补给线", x: 52, y: 78 },
];

const WILD_CHALLENGE_LAYOUT = [
  [32, 14],
  [68, 14],
  [14, 48],
  [86, 48],
  [50, 88],
  [28, 72],
  [72, 72],
  [50, 58],
];

/** 城镇行人：Showdown 训练家立绘（52poke 外链常因防盗链失效） */
const CITY_WALKER_TRAINER_KEYS = [
  "youngster",
  "lass",
  "bugcatcher",
  "hiker",
  "fisherman",
  "psychic",
  "scientist",
  "blackbelt",
  "ranger",
  "veteran",
  "breeder",
];

function cityWalkerTrainerUrl_(i) {
  const k = CITY_WALKER_TRAINER_KEYS[i % CITY_WALKER_TRAINER_KEYS.length];
  return `https://play.pokemonshowdown.com/sprites/trainers/${k}.png`;
}

const WILD_ENEMY_ROSTER = [
  { slug: "rattata", name: "小拉达" },
  { slug: "zubat", name: "超音蝠" },
  { slug: "machop", name: "腕力" },
  { slug: "geodude", name: "小拳石" },
  { slug: "gastly", name: "鬼斯" },
  { slug: "snorlax", name: "卡比兽" },
];

/** 中央熔炉达此等级后解锁火晶与建筑升星 */
const FIRE_CRYSTAL_UNLOCK_HEATER_LV = 10;
const MAX_BUILDING_STARS = 5;
let bagFilterKind_ = "all";
let bagFilterRole_ = "";

const CITY_MAP_LAYOUT = {
  heater: { x: 50, y: 48 },
  farm: { x: 16, y: 26 },
  camp: { x: 84, y: 26 },
  lumber: { x: 16, y: 72 },
  mine: { x: 84, y: 72 },
};

const BUILDING_PREREQ = {
  mine: [{ id: "lumber", lv: 2 }],
  farm: [{ id: "lumber", lv: 2 }],
  camp: [{ id: "mine", lv: 2 }],
  heater: [{ id: "camp", lv: 2 }, { id: "farm", lv: 2 }],
};

const TECH_DEFS = [
  { id: "t1", branch: "dev", col: 0, treeRow: 0, treeCol: 2, name: "工程学 I", desc: "建筑速度 +15%", cost: { wood: 120, steel: 80 }, reqBuilding: [{ id: "heater", lv: 2 }], effect: { buildSpeed: 0.15 } },
  { id: "t2", branch: "dev", col: 1, treeRow: 1, treeCol: 1, name: "工程学 II", desc: "建筑速度 +10%", cost: { wood: 200, steel: 140 }, reqTech: ["t1"], reqBuilding: [{ id: "lumber", lv: 4 }], effect: { buildSpeed: 0.1 } },
  { id: "x1", branch: "dev", col: 3, treeRow: 1, treeCol: 3, name: "热能效率", desc: "寒冷抵抗 +4（展示）", cost: { wood: 180, fuel: 100 }, reqTech: ["t2"], reqBuilding: [{ id: "heater", lv: 3 }], effect: { buildSpeed: 0.05 } },
  { id: "t3", branch: "dev", col: 2, treeRow: 2, treeCol: 2, name: "自动化产线", desc: "建筑队列额外并行 +0（数值并入上限公式）", cost: { wood: 260, steel: 200, food: 120 }, reqTech: ["t2"], reqBuilding: [{ id: "mine", lv: 4 }], effect: { buildSpeed: 0.08 } },
  { id: "e1", branch: "eco", col: 0, treeRow: 0, treeCol: 2, name: "后勤学 I", desc: "采集收益 +12%", cost: { wood: 100, steel: 60, food: 80 }, reqTech: ["t1"], reqBuilding: [{ id: "lumber", lv: 3 }], effect: { gatherYield: 0.12 } },
  { id: "e2", branch: "eco", col: 1, treeRow: 1, treeCol: 2, name: "仓储学", desc: "城镇累积上限 +5%（展示）", cost: { wood: 160, steel: 100, food: 140 }, reqTech: ["e1"], reqBuilding: [{ id: "farm", lv: 3 }], effect: { gatherYield: 0.08 } },
  { id: "e3", branch: "eco", col: 2, treeRow: 2, treeCol: 2, name: "贸易路线", desc: "采集速度 +6%", cost: { wood: 220, steel: 160, food: 200 }, reqTech: ["e2"], reqBuilding: [{ id: "heater", lv: 3 }], effect: { gatherYield: 0.06 } },
  { id: "e4", branch: "eco", col: 3, treeRow: 3, treeCol: 2, name: "深层钻探", desc: "钢材基础产出 +8%（采集）", cost: { steel: 280, fuel: 160 }, reqTech: ["e3"], reqBuilding: [{ id: "mine", lv: 5 }], effect: { gatherYield: 0.08 } },
  { id: "w1", branch: "war", col: 0, treeRow: 0, treeCol: 2, name: "战术学 I", desc: "全队战斗伤害 +10%", cost: { steel: 140, fuel: 80 }, reqTech: ["t1"], reqBuilding: [{ id: "camp", lv: 3 }], effect: { battleDmg: 0.1 } },
  { id: "w2", branch: "war", col: 1, treeRow: 1, treeCol: 1, name: "稳守反击", desc: "敌方伤害 -8%", cost: { steel: 180, fuel: 120 }, reqTech: ["w1", "e1"], reqBuilding: [{ id: "heater", lv: 4 }], effect: { enemyDmgDown: 0.08 } },
  { id: "w2b", branch: "war", col: 1, treeRow: 1, treeCol: 2, name: "精准射击", desc: "战斗伤害 +6%", cost: { steel: 170, fuel: 110 }, reqTech: ["w1"], reqBuilding: [{ id: "camp", lv: 4 }], effect: { battleDmg: 0.06 } },
  { id: "w2c", branch: "war", col: 1, treeRow: 1, treeCol: 3, name: "迅猛突刺", desc: "战斗伤害 +6%", cost: { steel: 170, fuel: 110 }, reqTech: ["w1"], reqBuilding: [{ id: "camp", lv: 4 }], effect: { battleDmg: 0.06 } },
  { id: "w3", branch: "war", col: 2, treeRow: 2, treeCol: 2, name: "突击教范", desc: "战斗伤害 +8%", cost: { steel: 240, fuel: 180 }, reqTech: ["w2", "w2b", "w2c"], reqTechMode: "any", reqBuilding: [{ id: "camp", lv: 5 }], effect: { battleDmg: 0.08 } },
  { id: "w4", branch: "war", col: 3, treeRow: 3, treeCol: 2, name: "极地适应", desc: "野外探索敌伤 -6%", cost: { steel: 300, fuel: 220 }, reqTech: ["w3"], reqBuilding: [{ id: "camp", lv: 6 }], effect: { enemyDmgDown: 0.06 } },
  { id: "w_cap1", branch: "war", col: 4, treeRow: 4, treeCol: 2, name: "扩编令 I", desc: "出战宝可梦上限 +1（最多 6）", cost: { steel: 260, fuel: 180 }, reqTech: ["w4"], reqBuilding: [{ id: "camp", lv: 5 }], effect: { squadCap: 1 } },
  { id: "w_cap2", branch: "war", col: 5, treeRow: 5, treeCol: 2, name: "扩编令 II", desc: "出战宝可梦上限 +1（最多 6）", cost: { steel: 320, fuel: 220 }, reqTech: ["w_cap1"], reqBuilding: [{ id: "camp", lv: 6 }], effect: { squadCap: 1 } },
  { id: "w_cap3", branch: "war", col: 6, treeRow: 6, treeCol: 1, name: "扩编令 III", desc: "出战宝可梦上限 +1（最多 6）", cost: { steel: 420, fuel: 280 }, reqTech: ["w_cap2"], reqBuilding: [{ id: "camp", lv: 7 }], effect: { squadCap: 1 } },
  { id: "l1", branch: "logi", col: 0, treeRow: 0, treeCol: 2, name: "医疗支援", desc: "士气下降减缓（任务结算加成）", cost: { wood: 140, food: 200, steel: 60 }, reqBuilding: [{ id: "farm", lv: 2 }], effect: { battleDmg: 0.04 } },
  { id: "l2", branch: "logi", col: 1, treeRow: 1, treeCol: 2, name: "燃料精炼", desc: "每日燃料消耗 -5%（法典叠加）", cost: { fuel: 200, steel: 120 }, reqTech: ["l1"], reqBuilding: [{ id: "heater", lv: 3 }], effect: { gatherYield: 0.05 } },
  { id: "l3", branch: "logi", col: 2, treeRow: 2, treeCol: 2, name: "联合补给", desc: "采集 + 战斗双系 +4%", cost: { wood: 200, steel: 200, food: 180 }, reqTech: ["l2", "e2"], reqBuilding: [{ id: "camp", lv: 4 }], effect: { gatherYield: 0.04, battleDmg: 0.04 } },
  { id: "l4", branch: "logi", col: 3, treeRow: 3, treeCol: 2, name: "远征工学", desc: "建造与采集综合 +6%", cost: { wood: 320, steel: 260, fuel: 140 }, reqTech: ["l3", "t3"], reqBuilding: [{ id: "heater", lv: 5 }], effect: { buildSpeed: 0.06, gatherYield: 0.06 } },
  { id: "t_dev_e1", branch: "dev", col: 4, treeRow: 4, treeCol: 1, name: "制图标准化", desc: "建筑速度 +4%", cost: { wood: 300, steel: 220, food: 100 }, reqTech: ["t3"], reqBuilding: [{ id: "lumber", lv: 5 }], effect: { buildSpeed: 0.04 } },
  { id: "t_dev_e2", branch: "dev", col: 5, treeRow: 5, treeCol: 2, name: "预制件装配", desc: "建筑速度 +5%", cost: { wood: 360, steel: 300, food: 140 }, reqTech: ["t_dev_e1"], reqBuilding: [{ id: "mine", lv: 5 }], effect: { buildSpeed: 0.05 } },
  { id: "t_dev_e3", branch: "dev", col: 6, treeRow: 6, treeCol: 3, name: "夜间施工照明", desc: "建筑速度 +3%", cost: { wood: 280, steel: 240, fuel: 160 }, reqTech: ["t_dev_e2"], reqBuilding: [{ id: "heater", lv: 6 }], effect: { buildSpeed: 0.03 } },
  { id: "t_dev_e4", branch: "dev", col: 7, treeRow: 7, treeCol: 2, name: "结构应力核算", desc: "建筑速度 +4%", cost: { steel: 420, food: 180, fuel: 120 }, reqTech: ["t_dev_e3"], reqBuilding: [{ id: "camp", lv: 5 }], effect: { buildSpeed: 0.04 } },
  { id: "t_dev_e5", branch: "dev", col: 8, treeRow: 8, treeCol: 1, name: "总装协同平台", desc: "建筑速度 +6%（需建筑升星）", cost: { wood: 480, steel: 380, food: 220 }, reqTech: ["t_dev_e4"], reqBuilding: [{ id: "heater", lv: 7 }], reqBuildingStars: [{ id: "heater", stars: 1 }, { id: "camp", stars: 1 }], effect: { buildSpeed: 0.06 } },
  { id: "t_eco_e1", branch: "eco", col: 4, treeRow: 4, treeCol: 1, name: "冷链短驳", desc: "采集收益 +5%", cost: { wood: 240, steel: 200, food: 260 }, reqTech: ["e4"], reqBuilding: [{ id: "farm", lv: 4 }], effect: { gatherYield: 0.05 } },
  { id: "t_eco_e2", branch: "eco", col: 5, treeRow: 5, treeCol: 3, name: "分拣机械臂", desc: "采集收益 +4%", cost: { steel: 320, food: 300, fuel: 100 }, reqTech: ["t_eco_e1"], reqBuilding: [{ id: "mine", lv: 6 }], effect: { gatherYield: 0.04 } },
  { id: "t_eco_e3", branch: "eco", col: 6, treeRow: 6, treeCol: 2, name: "富集带标定", desc: "采集收益 +6%", cost: { wood: 400, steel: 340, food: 240 }, reqTech: ["t_eco_e2"], reqBuilding: [{ id: "lumber", lv: 6 }], effect: { gatherYield: 0.06 } },
  { id: "t_eco_e4", branch: "eco", col: 7, treeRow: 7, treeCol: 1, name: "伴生矿回收", desc: "采集收益 +5%", cost: { steel: 400, fuel: 200, food: 160 }, reqTech: ["t_eco_e3"], reqBuilding: [{ id: "heater", lv: 6 }], effect: { gatherYield: 0.05 } },
  { id: "t_eco_e5", branch: "eco", col: 8, treeRow: 8, treeCol: 3, name: "全域物流节点", desc: "采集收益 +7%（需建筑升星）", cost: { wood: 520, steel: 440, food: 360 }, reqTech: ["t_eco_e4"], reqBuilding: [{ id: "farm", lv: 6 }], reqBuildingStars: [{ id: "heater", stars: 1 }, { id: "farm", stars: 1 }], effect: { gatherYield: 0.07 } },
  { id: "t_war_e1", branch: "war", col: 4, treeRow: 4, treeCol: 1, name: "掩体构筑纲要", desc: "敌方伤害 -5%", cost: { steel: 260, fuel: 200 }, reqTech: ["w4"], reqBuilding: [{ id: "camp", lv: 5 }], effect: { enemyDmgDown: 0.05 } },
  { id: "t_war_e2", branch: "war", col: 5, treeRow: 5, treeCol: 3, name: "交叉火力表", desc: "战斗伤害 +5%", cost: { steel: 300, fuel: 240 }, reqTech: ["t_war_e1"], reqBuilding: [{ id: "heater", lv: 5 }], effect: { battleDmg: 0.05 } },
  { id: "t_war_e3", branch: "war", col: 6, treeRow: 6, treeCol: 2, name: "冻土行军靴", desc: "敌方伤害 -4%", cost: { steel: 340, food: 180, fuel: 260 }, reqTech: ["t_war_e2"], reqBuilding: [{ id: "camp", lv: 6 }], effect: { enemyDmgDown: 0.04 } },
  { id: "t_war_e4", branch: "war", col: 7, treeRow: 7, treeCol: 1, name: "破甲弹头合金", desc: "战斗伤害 +7%", cost: { steel: 420, fuel: 300 }, reqTech: ["t_war_e3"], reqBuilding: [{ id: "mine", lv: 6 }], effect: { battleDmg: 0.07 } },
  { id: "t_war_e5", branch: "war", col: 8, treeRow: 8, treeCol: 3, name: "极地围猎战术", desc: "战斗伤害 +6%，敌方伤害 -3%（需建筑升星）", cost: { steel: 480, food: 220, fuel: 340 }, reqTech: ["t_war_e4"], reqBuilding: [{ id: "camp", lv: 7 }], reqBuildingStars: [{ id: "camp", stars: 2 }, { id: "mine", stars: 1 }], effect: { battleDmg: 0.06, enemyDmgDown: 0.03 } },
  { id: "t_log_e1", branch: "logi", col: 4, treeRow: 4, treeCol: 1, name: "野战厨房规范", desc: "采集收益 +4%", cost: { wood: 260, food: 320, steel: 140 }, reqTech: ["l4"], reqBuilding: [{ id: "farm", lv: 4 }], effect: { gatherYield: 0.04 } },
  { id: "t_log_e2", branch: "logi", col: 5, treeRow: 5, treeCol: 3, name: "伤员后送链", desc: "战斗伤害 +4%", cost: { wood: 300, food: 280, steel: 200 }, reqTech: ["t_log_e1"], reqBuilding: [{ id: "camp", lv: 5 }], effect: { battleDmg: 0.04 } },
  { id: "t_log_e3", branch: "logi", col: 6, treeRow: 6, treeCol: 2, name: "备用零件箱", desc: "建筑速度 +5%", cost: { steel: 360, wood: 220, fuel: 160 }, reqTech: ["t_log_e2"], reqBuilding: [{ id: "mine", lv: 5 }], effect: { buildSpeed: 0.05 } },
  { id: "t_log_e4", branch: "logi", col: 7, treeRow: 7, treeCol: 1, name: "士气广播网", desc: "采集收益 +5%，战斗伤害 +3%", cost: { wood: 380, food: 340, steel: 260 }, reqTech: ["t_log_e3"], reqBuilding: [{ id: "heater", lv: 6 }], effect: { gatherYield: 0.05, battleDmg: 0.03 } },
  { id: "t_log_e5", branch: "logi", col: 8, treeRow: 8, treeCol: 3, name: "联合勤务司令部", desc: "建筑速度 +4%，敌方伤害 -4%（需建筑升星）", cost: { wood: 440, steel: 400, food: 300, fuel: 200 }, reqTech: ["t_log_e4"], reqBuilding: [{ id: "camp", lv: 7 }], reqBuildingStars: [{ id: "lumber", stars: 1 }, { id: "mine", stars: 1 }], effect: { buildSpeed: 0.04, enemyDmgDown: 0.04 } },
];

const LAW_DEFS = [
  { id: "law_shift", name: "轮班法", desc: "采集速度 +8%，建筑速度 +5%", cost: 2, reqBuilding: { id: "heater", lv: 2 }, effect: { gatherSpeedPct: 0.08, buildSpeed: 0.05 } },
  { id: "law_ration", name: "配给法", desc: "每日粮耗 -8%，士气衰减降低", cost: 3, reqBuilding: { id: "farm", lv: 3 }, effect: { foodUseDown: 0.08, moraleLossDown: 0.3 } },
  { id: "law_mobilize", name: "动员令", desc: "战斗伤害 +6%，但每日燃料消耗 +6%", cost: 4, reqBuilding: { id: "camp", lv: 4 }, effect: { battleDmg: 0.06, fuelUseUp: 0.06 } },
  { id: "law_curfew", name: "宵禁条例", desc: "敌方伤害 -5%，粮耗 +3%", cost: 2, reqBuilding: { id: "camp", lv: 3 }, effect: { enemyDmgDown: 0.05, foodUseDown: -0.03 } },
  { id: "law_soup", name: "热食优先令", desc: "粮耗 -5%，士气衰减降低", cost: 3, reqBuilding: { id: "farm", lv: 2 }, effect: { foodUseDown: 0.05, moraleLossDown: 0.22 } },
  { id: "law_scrap", name: "废钢回收法", desc: "建筑速度 +4%，燃料消耗 +4%", cost: 3, reqBuilding: { id: "mine", lv: 3 }, effect: { buildSpeed: 0.04, fuelUseUp: 0.04 } },
  { id: "law_patrol", name: "巡防加编令", desc: "战斗伤害 +5%，粮耗 +4%", cost: 4, reqBuilding: { id: "camp", lv: 3 }, effect: { battleDmg: 0.05, foodUseDown: -0.04 } },
  { id: "law_fallow", name: "休耕保育法", desc: "采集速度 +6%，建筑速度 -3%（政策取舍）", cost: 3, reqBuilding: { id: "farm", lv: 4 }, effect: { gatherSpeedPct: 0.06, buildSpeed: -0.03 } },
  { id: "law_bunker", name: "民防掩体条例", desc: "敌方伤害 -6%，燃料 +5%", cost: 5, reqBuilding: { id: "heater", lv: 4 }, effect: { enemyDmgDown: 0.06, fuelUseUp: 0.05 } },
  { id: "law_train", name: "集训补贴法案", desc: "战斗伤害 +7%，士气衰减略增", cost: 4, reqBuilding: { id: "camp", lv: 5 }, effect: { battleDmg: 0.07, moraleLossDown: -0.15 } },
  { id: "law_fuelcap", name: "燃料配给封顶", desc: "燃料消耗 -7%，采集速度 -4%", cost: 3, reqBuilding: { id: "heater", lv: 3 }, effect: { fuelUseUp: -0.07, gatherSpeedPct: -0.04 } },
  { id: "law_woodsave", name: "薪材节约令", desc: "建筑速度 +5%，采集速度 -3%", cost: 2, reqBuilding: { id: "lumber", lv: 4 }, effect: { buildSpeed: 0.05, gatherSpeedPct: -0.03 } },
  { id: "law_harvest", name: "延长作业许可", desc: "采集速度 +9%，燃料 +6%", cost: 5, reqBuilding: { id: "farm", lv: 5 }, effect: { gatherSpeedPct: 0.09, fuelUseUp: 0.06 } },
  { id: "law_medical", name: "医疗绿色通道", desc: "士气衰减大幅降低，战斗伤害 +2%", cost: 6, reqBuilding: { id: "farm", lv: 5 }, effect: { moraleLossDown: 0.45, battleDmg: 0.02 } },
  { id: "law_forge", name: "炉温竞赛奖励", desc: "建筑速度 +6%，敌方伤害 +2%（工人疲劳）", cost: 4, reqBuilding: { id: "heater", lv: 5 }, effect: { buildSpeed: 0.06, enemyDmgDown: -0.02 } },
  { id: "law_caravan", name: "商队武装护送", desc: "采集速度 +7%，战斗伤害 +3%", cost: 5, reqBuilding: { id: "mine", lv: 5 }, effect: { gatherSpeedPct: 0.07, battleDmg: 0.03 } },
  { id: "law_tithe", name: "应急征粮条款", desc: "粮耗 -10%，士气衰减增加", cost: 5, reqBuilding: { id: "farm", lv: 6 }, effect: { foodUseDown: 0.1, moraleLossDown: -0.25 } },
  { id: "law_blackout", name: "灯火管制令", desc: "敌方伤害 -7%，采集速度 -5%", cost: 4, reqBuilding: { id: "heater", lv: 6 }, effect: { enemyDmgDown: 0.07, gatherSpeedPct: -0.05 } },
  { id: "law_engineer", name: "工程士官编制", desc: "建筑速度 +7%，燃料 +4%", cost: 5, reqBuilding: { id: "lumber", lv: 6 }, effect: { buildSpeed: 0.07, fuelUseUp: 0.04 } },
  { id: "law_volunteer", name: "志愿兵优待法", desc: "战斗伤害 +8%，粮耗 +5%", cost: 6, reqBuilding: { id: "camp", lv: 6 }, effect: { battleDmg: 0.08, foodUseDown: -0.05 } },
  { id: "law_snow", name: "除雪总动员", desc: "采集速度 +5%，建筑速度 +4%，燃料 +5%", cost: 5, reqBuilding: { id: "lumber", lv: 5 }, effect: { gatherSpeedPct: 0.05, buildSpeed: 0.04, fuelUseUp: 0.05 } },
  { id: "law_silence", name: "静默通讯规约", desc: "敌方伤害 -5%，战斗伤害 -2%", cost: 3, reqBuilding: { id: "camp", lv: 4 }, effect: { enemyDmgDown: 0.05, battleDmg: -0.02 } },
  { id: "law_feast", name: "节庆加餐令", desc: "士气衰减降低，粮耗 +6%", cost: 4, reqBuilding: { id: "farm", lv: 4 }, effect: { moraleLossDown: 0.35, foodUseDown: -0.06 } },
];

// 法典（可升级的章节/编目）：升级后可逐步解锁更深层的法典系统（与法令消耗同一「法典点数」资源，迫使取舍）。
const CODEX_DEFS = [
  { id: "cx_dev", name: "工程法典", desc: "解锁更深的建造/施工类条目", maxLv: 40, prereq: [] },
  { id: "cx_eco", name: "后勤法典", desc: "解锁更深的采集/仓储类条目", maxLv: 40, prereq: [] },
  { id: "cx_war", name: "战术法典", desc: "解锁更深的战斗/远征类条目", maxLv: 40, prereq: [] },
  { id: "cx_log", name: "生存法典", desc: "解锁更深的燃料/士气/民生类条目", maxLv: 40, prereq: [] },
  { id: "cx_advance1", name: "前线编纂·I", desc: "更高阶法典的前置编目", maxLv: 60, prereq: [{ id: "cx_dev", lv: 8 }, { id: "cx_war", lv: 8 }] },
  { id: "cx_advance2", name: "前线编纂·II", desc: "更高阶法典的前置编目", maxLv: 80, prereq: [{ id: "cx_advance1", lv: 12 }, { id: "cx_eco", lv: 10 }] },
  { id: "cx_advance3", name: "前线编纂·III", desc: "更高阶法典的前置编目", maxLv: 100, prereq: [{ id: "cx_advance2", lv: 18 }, { id: "cx_log", lv: 14 }] },
  { id: "cx_arch", name: "极地总纲", desc: "终局法典：允许法典升到很高等", maxLv: 150, prereq: [{ id: "cx_advance3", lv: 24 }] },
];

function codexLv_(id) {
  return Math.max(0, Number(state.codexBooks?.[id] || 0));
}

function codexMaxLv_(c) {
  return Math.max(1, Math.floor(Number(c.maxLv || 1)));
}

function codexCostPts_(c, nextLv) {
  // 成本递增：越后面越贵，但仍可堆高等级。
  const lv = Math.max(1, Number(nextLv) || 1);
  const base = c.id === "cx_arch" ? 4 : c.id.startsWith("cx_advance") ? 3 : 2;
  return base + Math.floor((lv - 1) / 4);
}

function codexPrereqOk_(c, nextLv) {
  const rs = c.prereq || [];
  if (!rs.length) return true;
  // 高等级时前置要求也会逐步抬升，避免单一路线爆冲。
  const extra = Math.floor(Math.max(0, (Number(nextLv) || 1) - 1) / 12);
  return rs.every((r) => codexLv_(r.id) >= Number(r.lv || 1) + extra);
}

function upgradeCodexBook_(id) {
  const c = CODEX_DEFS.find((x) => x.id === id);
  if (!c) return;
  const cur = codexLv_(id);
  const mx = codexMaxLv_(c);
  if (cur >= mx) return alert("该法典已达上限");
  const nextLv = cur + 1;
  if (!codexPrereqOk_(c, nextLv)) return alert("前置法典等级不足");
  const cost = codexCostPts_(c, nextLv);
  if ((state.policyPoints || 0) < cost) return alert("法典点数不足");
  if (!confirm(`升级「${c.name}」到 Lv${nextLv}/${mx}？将消耗 法典点×${cost}。`)) return;
  state.policyPoints -= cost;
  if (!state.codexBooks || typeof state.codexBooks !== "object") state.codexBooks = {};
  state.codexBooks[id] = nextLv;
  logEvent("法典", `法典升级「${c.name}」→ Lv${nextLv}/${mx}`);
  save();
  renderLaws();
  renderCity();
  renderActionHub_();
  updateNavBadges_();
  renderLogs();
}

function upgradeCodexBulk_(id) {
  const c = CODEX_DEFS.find((x) => x.id === id);
  if (!c) return;
  let cur = codexLv_(id);
  const mx = codexMaxLv_(c);
  if (cur >= mx) return alert("该法典已达上限");
  let n = 0;
  let spent = 0;
  while (n < 999) {
    cur = codexLv_(id);
    if (cur >= mx) break;
    const nextLv = cur + 1;
    if (!codexPrereqOk_(c, nextLv)) break;
    const cost = codexCostPts_(c, nextLv);
    if ((state.policyPoints || 0) < cost) break;
    state.policyPoints -= cost;
    spent += cost;
    state.codexBooks[id] = nextLv;
    n += 1;
  }
  if (n <= 0) return alert("当前无法连升（法典点不足或前置法典等级未满足）");
  logEvent("法典", `连升「${c.name}」×${n} → Lv${state.codexBooks[id]}/${mx}`);
  save();
  renderLaws();
  renderCity();
  renderActionHub_();
  updateNavBadges_();
  renderLogs();
  alert(`已连升 ${n} 次：${c.name} → Lv${state.codexBooks[id]}/${mx}\n消耗法典点：${spent}`);
}

function upgradeAllAvailableCodex_() {
  let upgraded = 0;
  for (let guard = 0; guard < 30; guard += 1) {
    let changed = false;
    for (const c of CODEX_DEFS) {
      const cur = codexLv_(c.id);
      const mx = codexMaxLv_(c);
      if (cur >= mx) continue;
      const nextLv = cur + 1;
      if (!codexPrereqOk_(c, nextLv)) continue;
      const cost = codexCostPts_(c, nextLv);
      if ((state.policyPoints || 0) < cost) continue;
      state.policyPoints -= cost;
      state.codexBooks[c.id] = nextLv;
      upgraded += 1;
      changed = true;
    }
    if (!changed) break;
  }
  if (upgraded <= 0) return alert("当前没有任何可自动升级的法典（法典点不足或前置未满足）");
  logEvent("法典", `一键连升：已升级 ${upgraded} 次（遍历所有法典）`);
  save();
  renderLaws();
  renderCity();
  renderActionHub_();
  updateNavBadges_();
  renderLogs();
  alert(`一键连升完成：共升级 ${upgraded} 次（全部可升级法典已升到卡住）`);
}

const CHAPTER_MISSIONS = [
  { id: "m1", category: "chapter", text: "把伐木场升到 Lv3", done: false, unlocked: true, next: "m2", reward: { wood: 100 }, cond: { type: "buildingLv", id: "lumber", lv: 3 } },
  { id: "m2", category: "chapter", text: "通关到第 3 关", done: false, unlocked: false, next: "m3", reward: { steel: 80, food: 80 }, cond: { type: "stageAtLeast", stage: 3 } },
  { id: "m3", category: "chapter", text: "士气保持 90 以上 3 天", done: false, unlocked: false, next: "m4", reward: { fuel: 120 }, cond: { type: "moraleStreak", morale: 90, days: 3 }, streak: 0 },
  { id: "m4", category: "chapter", text: "研究「工程学I」", done: false, unlocked: false, next: "m5", reward: { steel: 120 }, cond: { type: "techDone", id: "t1" } },
  { id: "m5", category: "chapter", text: "把中央熔炉升到 Lv3", done: false, unlocked: false, next: "m6", reward: { fuel: 180 }, cond: { type: "buildingLv", id: "heater", lv: 3 } },
  { id: "m6", category: "chapter", text: "训练营达到 Lv4", done: false, unlocked: false, next: "m7", reward: { wood: 220, steel: 120 }, cond: { type: "buildingLv", id: "camp", lv: 4 } },
  { id: "m7", category: "chapter", text: "科技树完成 3 项研究", done: false, unlocked: false, next: "m8", reward: { steel: 260, fuel: 100 }, cond: { type: "techCountAtLeast", count: 3 } },
  { id: "m8", category: "chapter", text: "通关到第 5 关（Boss）", done: false, unlocked: false, next: "m9", reward: { food: 300, fuel: 180 }, cond: { type: "stageAtLeast", stage: 5 } },
  { id: "m9", category: "chapter", text: "通关到第 8 关", done: false, unlocked: false, next: "m10", reward: { wood: 400, steel: 260 }, cond: { type: "stageAtLeast", stage: 8 } },
  { id: "m10", category: "chapter", text: "通关到第 10 关（Boss）", done: false, unlocked: false, next: "m11", reward: { wood: 600, steel: 420, food: 480, fuel: 320 }, cond: { type: "stageAtLeast", stage: 10 } },
  { id: "m11", category: "chapter", text: "伐木场升级到 Lv5", done: false, unlocked: false, next: "m12", reward: { wood: 240, steel: 100 }, cond: { type: "buildingLv", id: "lumber", lv: 5 } },
  { id: "m12", category: "chapter", text: "矿坑升级到 Lv5", done: false, unlocked: false, next: "m13", reward: { steel: 280, fuel: 90 }, cond: { type: "buildingLv", id: "mine", lv: 5 } },
  { id: "m13", category: "chapter", text: "温室农场升级到 Lv5", done: false, unlocked: false, next: "m14", reward: { food: 320, wood: 120 }, cond: { type: "buildingLv", id: "farm", lv: 5 } },
  { id: "m14", category: "chapter", text: "训练营升级到 Lv6", done: false, unlocked: false, next: "m15", reward: { steel: 200, food: 200 }, cond: { type: "buildingLv", id: "camp", lv: 6 } },
  { id: "m15", category: "chapter", text: "完成 5 项科技研究", done: false, unlocked: false, next: "m16", reward: { wood: 300, steel: 300, fuel: 140 }, cond: { type: "techCountAtLeast", count: 5 } },
  { id: "m16", category: "chapter", text: "中央熔炉升级到 Lv5", done: false, unlocked: false, reward: { fuel: 400, steel: 220 }, cond: { type: "buildingLv", id: "heater", lv: 5 } },
];

const GROWTH_MISSIONS_HEAD = [
  { id: "g1", category: "growth", text: "累积领取采集奖励 5 次", done: false, unlocked: true, next: "g2", reward: { wood: 160, food: 140 }, cond: { type: "gatherClaimTotal", count: 5 } },
  { id: "g2", category: "growth", text: "任意英雄升级到 Lv8", done: false, unlocked: false, next: "g3", reward: { steel: 150, food: 160 }, cond: { type: "heroLevelAny", level: 8 } },
  { id: "g3", category: "growth", text: "拥有至少 20,000 木材储备", done: false, unlocked: false, next: "g4", reward: { wood: 400, fuel: 100 }, cond: { type: "resourceAtLeast", res: "wood", amount: 20000 } },
  { id: "g4", category: "growth", text: "城镇人口达到 40", done: false, unlocked: false, reward: { food: 280, steel: 120 }, cond: { type: "popAtLeast", pop: 40 } },
];

const EVENT_MISSIONS_LEGACY = [
  { id: "e1", category: "event", text: "限时活动：7天内达到关卡 6", done: false, unlocked: true, reward: { steel: 360, fuel: 180 }, cond: { type: "stageAtLeast", stage: 6 }, expiryDay: 7 },
  { id: "e2", category: "event", text: "限时活动：14天内研究 2 项科技", done: false, unlocked: true, reward: { wood: 300, food: 260 }, cond: { type: "techCountAtLeast", count: 2 }, expiryDay: 14 },
];

const MISSION_POOL_VERSION = 4;
/** 《寒霜启示录》类：联盟等级常见上限约 11，荣誉来自捐献与活跃 */
const ALLIANCE_MAX_LEVEL = 11;

function allianceHonorNeed_(lv) {
  const l = Math.max(1, Math.min(ALLIANCE_MAX_LEVEL - 1, lv));
  return 42 + l * 26;
}

function bumpAllianceHonor_(delta) {
  const a = state.alliance;
  if (!a || delta <= 0) return;
  let lv = Math.min(ALLIANCE_MAX_LEVEL, Math.max(1, Number(a.level) || 1));
  if (lv >= ALLIANCE_MAX_LEVEL) return;
  let hx = Number(a.honorXp || 0) + delta;
  let need = allianceHonorNeed_(lv);
  while (lv < ALLIANCE_MAX_LEVEL && hx >= need) {
    hx -= need;
    lv += 1;
    logEvent("联盟", `联盟等级提升至 Lv${lv}（联盟荣誉达标）`);
    need = allianceHonorNeed_(lv);
  }
  a.level = lv;
  a.honorXp = lv >= ALLIANCE_MAX_LEVEL ? 0 : hx;
}

function tryAllianceDonateWood_() {
  const a = state.alliance;
  const lv = Math.min(ALLIANCE_MAX_LEVEL, Math.max(1, Number(a.level) || 1));
  if (lv >= ALLIANCE_MAX_LEVEL) return alert("联盟等级已达上限");
  const cost = 380 + lv * 45;
  const have = Number(state.resources.wood || 0);
  const maxN = Math.floor(have / cost);
  if (maxN < 1) return alert(`木材不足（捐献需 ${cost}）`);
  const raw = prompt(`捐献木材换联盟荣誉。\n单次：木材 ${cost}\n可最多捐献：${maxN} 次\n请输入本次捐献次数：`, String(Math.min(5, maxN)));
  if (raw == null) return;
  const want = clamp(parseInt(String(raw), 10) || 0, 1, maxN);
  if (!confirm(`确认捐献木材 ${cost} × ${want} = ${cost * want}，以换取联盟荣誉？`)) return;
  state.resources.wood -= cost * want;
  bumpAllianceHonor_((14 + Math.floor(lv * 1.2)) * want);
  save();
  renderAlliancePage_();
  renderCity();
}

function tryAllianceDonateSteel_() {
  const a = state.alliance;
  const lv = Math.min(ALLIANCE_MAX_LEVEL, Math.max(1, Number(a.level) || 1));
  if (lv >= ALLIANCE_MAX_LEVEL) return alert("联盟等级已达上限");
  const cost = 120 + lv * 22;
  const have = Number(state.resources.steel || 0);
  const maxN = Math.floor(have / cost);
  if (maxN < 1) return alert(`钢材不足（捐献需 ${cost}）`);
  const raw = prompt(`捐献钢材换联盟荣誉。\n单次：钢材 ${cost}\n可最多捐献：${maxN} 次\n请输入本次捐献次数：`, String(Math.min(5, maxN)));
  if (raw == null) return;
  const want = clamp(parseInt(String(raw), 10) || 0, 1, maxN);
  if (!confirm(`确认捐献钢材 ${cost} × ${want} = ${cost * want}，以换取联盟荣誉？`)) return;
  state.resources.steel -= cost * want;
  bumpAllianceHonor_((12 + Math.floor(lv * 1.1)) * want);
  save();
  renderAlliancePage_();
  renderCity();
}

function buildExpandedMissions_() {
  const growthExtra = [];
  // 成长任务：保持 100 条，但用链式解锁避免一次全开。
  for (let i = GROWTH_MISSIONS_HEAD.length + 1; i <= 100; i += 1) {
    const bi = BUILDING_DEFS[(i + 2) % BUILDING_DEFS.length];
    const lv = Math.min(12, 2 + ((i * 5 + bi.id.length) % 10));
    growthExtra.push({
      id: `gr_${i}`,
      category: "growth",
      text: `成长：将「${bi.name}」升至 Lv${lv}`,
      done: false,
      unlocked: false,
      next: i < 100 ? `gr_${i + 1}` : "",
      nextOnClaim: true,
      reward: { wood: 24 + (i % 60), steel: 16 + (i % 55), food: 18 + (i % 50) },
      cond: { type: "buildingLv", id: bi.id, lv },
    });
  }
  const daily = [];
  // 日常任务：100 条不重复（战斗 1~50、采集 1~50），链式解锁且需要先领取前置奖励才出现下一条。
  for (let i = 1; i <= 100; i += 1) {
    const isBattle = i % 2 === 1;
    const n = isBattle ? (i + 1) / 2 : i / 2; // 1..50
    daily.push({
      id: `dy_${i}`,
      category: "daily",
      text: isBattle ? `日常：今日完成战斗 ${n} 次` : `日常：今日领取采集 ${n} 次`,
      done: false,
      unlocked: i === 1,
      next: i < 100 ? `dy_${i + 1}` : "",
      nextOnClaim: true,
      reward: isBattle
        ? { food: 36 + n * 3, fuel: 16 + n * 2, wood: 14 + n * 2 }
        : { wood: 44 + n * 4, steel: 22 + n * 3, food: 18 + n * 2 },
      cond: isBattle ? { type: "battleCountToday", count: n } : { type: "gatherClaimToday", count: n },
      refresh: "daily",
    });
  }
  const special = [];
  const wildSpots = WILD_SPOTS || [];
  for (let s = 0; s < 50; s += 1) {
    const dayGate = 2 + (s % 19) * 3;
    const spot = wildSpots[s % wildSpots.length];
    const mod = s % 5;
    let cond;
    let text;
    if (mod === 0) {
      const st = 2 + (s % 9);
      text = `秘闻·霜曜日（第 ${dayGate} 天）：通关至第 ${st} 关`;
      cond = { type: "stageAtLeast", stage: st };
    } else if (mod === 1 && spot) {
      text = `秘闻·据点残卷：在「${spot.name}」取得一次野外胜利`;
      cond = { type: "wildSpotWon", spotId: spot.id };
    } else if (mod === 2) {
      const techN = 1 + (s % 8);
      text = `秘闻·工坊密档：累计完成 ${techN} 项科技研究`;
      cond = { type: "techCountAtLeast", count: techN };
    } else if (mod === 3) {
      const tot = 10 + (s % 25) * 3;
      text = `秘闻·行商足迹：累计领取采集 ${tot} 次`;
      cond = { type: "gatherClaimTotal", count: tot };
    } else {
      const lv = 3 + (s % 6);
      text = `秘闻·炉火誓约：中央熔炉达到 Lv${lv}`;
      cond = { type: "buildingLv", id: "heater", lv };
    }
    special.push({
      id: `sp_${s + 1}`,
      category: "special",
      text,
      done: false,
      unlocked: false,
      next: s < 49 ? `sp_${s + 2}` : "",
      nextOnClaim: true,
      reward: { gems: s % 7 === 0 ? 2 : 0, wood: 80 + s * 4, steel: 60 + s * 3, food: 70 + s * 3, fuel: 40 + s * 2 },
      cond,
      unlockIf: {
        type: "dayOrWild",
        minDay: dayGate,
        spotId: spot ? spot.id : 0,
        mode: mod === 1 ? "either" : "dayOnly",
      },
    });
  }
  // 串起成长头部与扩展段
  const growthAll = [...structuredClone(GROWTH_MISSIONS_HEAD), ...growthExtra];
  for (let i = 0; i < growthAll.length; i += 1) {
    const cur = growthAll[i];
    if (i === 0) cur.unlocked = true;
    else cur.unlocked = false;
    const next = growthAll[i + 1];
    if (next && !cur.next) cur.next = next.id;
    if (cur.category === "growth") cur.nextOnClaim = true;
  }
  // 限时活动：100 种不重复，完成（或逾期）后推进下一条。
  const eventAll = buildLimitedEventMissions_();
  return [...structuredClone(CHAPTER_MISSIONS), ...growthAll, ...daily, ...eventAll, ...special];
}

function buildLimitedEventMissions_() {
  const list = [];
  const spots = WILD_SPOTS || [];
  for (let i = 1; i <= 100; i += 1) {
    const mod = i % 6;
    let text = "";
    let cond = {};
    let span = 7;
    if (mod === 1) {
      const st = 3 + (i % 10) + Math.floor(i / 20);
      span = 6 + (i % 6);
      text = `限时活动 #${i}：在 ${span} 天内推进到关卡 ${st}`;
      cond = { type: "stageAtLeast", stage: st };
    } else if (mod === 2) {
      const n = 1 + (i % 9) + Math.floor(i / 30);
      span = 7 + (i % 5);
      text = `限时活动 #${i}：在 ${span} 天内完成 ${n} 项科技升级`;
      cond = { type: "techCountAtLeast", count: n };
    } else if (mod === 3) {
      const bi = BUILDING_DEFS[(i * 3 + 1) % BUILDING_DEFS.length];
      const lv = Math.min(12, 2 + (i % 10) + Math.floor(i / 25));
      span = 8 + (i % 6);
      text = `限时活动 #${i}：在 ${span} 天内将「${bi.name}」升至 Lv${lv}`;
      cond = { type: "buildingLv", id: bi.id, lv };
    } else if (mod === 4) {
      const sp = spots[i % spots.length];
      span = 5 + (i % 6);
      text = `限时活动 #${i}：在 ${span} 天内于「${sp.name}」取得胜利`;
      cond = { type: "wildSpotWon", spotId: sp.id };
    } else if (mod === 5) {
      const n = 2 + (i % 10);
      span = 4 + (i % 5);
      text = `限时活动 #${i}：在 ${span} 天内今日战斗累计 ${n} 次`;
      cond = { type: "battleCountToday", count: n };
    } else {
      const n = 2 + (i % 8);
      span = 4 + (i % 6);
      text = `限时活动 #${i}：在 ${span} 天内今日领取采集累计 ${n} 次`;
      cond = { type: "gatherClaimToday", count: n };
    }
    list.push({
      id: `ev_${i}`,
      category: "event",
      text,
      done: false,
      unlocked: i === 1,
      next: i < 100 ? `ev_${i + 1}` : "",
      nextOnClaim: true,
      expirySpanDays: span,
      expiryDay: 0,
      reward: { wood: 120 + i * 6, steel: 90 + i * 5, food: 110 + i * 5, fuel: 70 + i * 3, gems: i % 17 === 0 ? 1 : 0 },
      cond,
    });
  }
  return list;
}

function mergeMissionProgress_(oldList, freshList) {
  const map = new Map((oldList || []).map((m) => [m.id, m]));
  return freshList.map((m) => {
    const o = map.get(m.id);
    if (!o) return { ...m };
    return {
      ...m,
      done: !!o.done,
      ready: !!o.ready,
      claimed: !!o.claimed,
      unlocked: typeof o.unlocked === "boolean" ? o.unlocked : m.unlocked,
      streak: Number.isFinite(o.streak) ? o.streak : m.streak || 0,
    };
  });
}

/** 兼容旧存档任务 id */
const DEFAULT_MISSIONS = buildExpandedMissions_();

const DEFAULT_ASSETS = {
  ui: {
    background: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%230b1220'/%3E%3Cstop offset='100%25' stop-color='%231e293b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3C/svg%3E",
    cityMap:
      "https://images.unsplash.com/photo-1517483000871-1dbf64a6e1c6?auto=format&fit=crop&w=1920&q=85",
  },
  resources: {
    wood: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%23341f0b'/%3E%3Crect x='7' y='26' width='26' height='8' fill='%23a16207'/%3E%3C/svg%3E",
    steel: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%231f2937'/%3E%3Crect x='8' y='9' width='24' height='20' rx='3' fill='%2394a3b8'/%3E%3C/svg%3E",
    food: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%230f172a'/%3E%3Ccircle cx='20' cy='20' r='10' fill='%23f59e0b'/%3E%3C/svg%3E",
    fuel: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%230b1220'/%3E%3Cpath d='M20 8c7 8 7 12 0 24c-7-12-7-16 0-24z' fill='%23ef4444'/%3E%3C/svg%3E",
  },
  buildings: {
    lumber: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='58' height='58'%3E%3Crect width='100%25' height='100%25' rx='8' fill='%23292524'/%3E%3Crect x='10' y='30' width='38' height='10' fill='%23a16207'/%3E%3C/svg%3E",
    mine: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='58' height='58'%3E%3Crect width='100%25' height='100%25' rx='8' fill='%231f2937'/%3E%3Cpath d='M10 38h38L29 16z' fill='%23717887'/%3E%3C/svg%3E",
    farm: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='58' height='58'%3E%3Crect width='100%25' height='100%25' rx='8' fill='%23145232'/%3E%3Crect x='10' y='32' width='38' height='8' fill='%2322c55e'/%3E%3C/svg%3E",
    heater: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='58' height='58'%3E%3Crect width='100%25' height='100%25' rx='8' fill='%23361b1b'/%3E%3Ccircle cx='29' cy='29' r='12' fill='%23fb7185'/%3E%3C/svg%3E",
    camp: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='58' height='58'%3E%3Crect width='100%25' height='100%25' rx='8' fill='%231e293b'/%3E%3Cpath d='M12 40h34L29 18z' fill='%2360a5fa'/%3E%3C/svg%3E",
  },
  battleFx: {
    layer: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='160'%3E%3Cdefs%3E%3ClinearGradient id='fx' x1='0' y1='0' x2='1' y2='0'%3E%3Cstop offset='0%25' stop-color='%23f59e0b' stop-opacity='0.1'/%3E%3Cstop offset='50%25' stop-color='%23fef3c7' stop-opacity='0.3'/%3E%3Cstop offset='100%25' stop-color='%23f59e0b' stop-opacity='0.1'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23fx)'/%3E%3C/svg%3E",
    ult: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='80'%3E%3Cdefs%3E%3ClinearGradient id='u' x1='0' y1='0' x2='1' y2='0'%3E%3Cstop offset='0%25' stop-color='%237c3aed' stop-opacity='0.1'/%3E%3Cstop offset='50%25' stop-color='%23e879f9' stop-opacity='0.45'/%3E%3Cstop offset='100%25' stop-color='%237c3aed' stop-opacity='0.1'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23u)'/%3E%3C/svg%3E",
  },
  heroes: {},
  cutscene: {
    bgs: [
      "https://images.unsplash.com/photo-1519750157634-b6d493a0f77c?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1400&q=80"
    ],
    chars: {
      narrator: "https://play.pokemonshowdown.com/sprites/trainers/scientist.png",
      commander: "https://play.pokemonshowdown.com/sprites/trainers/veteran.png",
      scout: "https://play.pokemonshowdown.com/sprites/trainers/ranger.png"
    }
  }
};

const DEFAULT_STORY_PACK = {
  chapters: [
    { id: "c1", title: "第一章：雪线之外", unlockStage: 1, text: "风雪像刀片一样刮过装甲车外壳，车队在半埋雪丘前停下。你踩下地面时，靴底立刻结了薄冰。幸存者围着你，没人说话，所有目光都在问同一件事：今晚能不能活下来。\n\n你先点燃临时火盆，再派人清理中央热能塔的进风口。钢梁在暴雪里吱呀作响，像随时会垮。工程员拿来损坏清单，最上面写着“主控阀失压”。你知道，这意味着营地不是缺资源，而是缺时间。\n\n当天夜里，第一批哨兵在外环发现陌生足迹，间距很大，像重装单位。你把仅有的三名可战英雄拉进简报帐篷，在地图上划出防线。没有人提撤退，因为每个人都知道，身后已经没有第二座城。"},
    { id: "c2", title: "第二章：余烬与誓言", unlockStage: 2, text: "熔炉重新运转后，热雾从排气塔升起，像这片冰原上最后一缕人类文明。流民在城门外排起长队，有人抱着木箱，有人只剩一条毯子。你必须决定先给谁粮食，先修哪条管线。\n\n夜间会议上，老工匠递给你一枚烧黑的徽章，说那是北哨站最后一支守备队的标记。守备队没回来，只传回一句无线电：敌方补给队正沿冰沟南下。你把这句话写在城务板最上面，并把训练营扩建列为最高优先级。\n\n天亮时，营地钟声第一次响满十二下。居民把这声音叫“活下去的钟”。你也在日志里写下誓言：不再被暴风雪推着走，而是学会在风里站稳。"},
    { id: "c3", title: "第三章：冰原追猎", unlockStage: 3, text: "侦察队带回一张冻硬的军用地图，边角沾着血。地图标出一条敌方运输线，每隔六小时有一支装载燃料的车队通过。如果放任不管，三周后他们会在北脊建成前进基地。\n\n你挑选了最稳定的三人编队，在夜色下穿过风切峡。峡谷里回声会放大脚步，任何金属碰撞都像枪响。第一轮伏击很成功，敌方前车翻入雪坑，但后队反应比预期更快，你们几乎被包夹。\n\n返程路上，Molly问你：‘我们是在守城，还是在开战？’你没有立刻回答。直到看见城墙上新点亮的巡灯，你才说：‘从今天开始，这两件事是一件事。’"},
    { id: "c4", title: "第四章：长夜守城", unlockStage: 4, text: "极夜提前到来，白天只剩两小时灰蓝色天光。燃料消耗比预测高了三成，储罐液位每天都在下坠。民众开始在公告栏写匿名留言：‘我们撑不到春天。’\n\n你把建筑队分成两班，白班扩容仓储，夜班维护供热。与此同时，城内开始出现小规模盗窃，目标全是药品和压缩口粮。巡防官建议宵禁，医生反对，担心引发恐慌。你选择折中：保留通行，但增加夜巡与配给透明公示。\n\n第三个夜晚，风暴把东墙外脚手架掀翻，压住两名工人。整个城的人都冲出去救援，连最消沉的居民也在拉绳。那一刻你意识到，士气不是口号，而是每个人在零下四十度仍愿意伸手。"},
    { id: "c5", title: "第五章：霜牙巨兽", unlockStage: 5, text: "凌晨三点，地震般的震动从北门传来。监测塔报告：大型热源正在靠近，体积远超常规战车。探照灯扫过去，你第一次看见‘霜牙巨兽’——钢骨包裹冰壳，背部挂着熔炉式喷口。\n\nBoss战持续了整整二十分钟。巨兽每次冲撞都会让城墙掉下一层冰砖，弩炮组被震得几次失准。Sergey顶在最前线，护盾裂开又被焊补；Gina趁喷口过热时刺入关键节点；Molly最后一轮箭雨直接点燃了暴露的燃料舱。\n\n巨兽倒下后，北门外一片蒸汽白雾。居民欢呼，但你心里很清楚：这种级别的单位不会只来一次。它更像一封宣战书。"},
    { id: "c6", title: "第六章：灰烬议会", unlockStage: 6, text: "Boss战后的残骸被拖进工坊，工程组连夜拆解，发现敌方核心件带有统一编号——说明他们有完整工业体系，而不是散兵游勇。你召集“灰烬议会”，把军务、城务、后勤三条线第一次并在一张桌上讨论。\n\n会上争论激烈。军务主张趁势北推，城务坚持先稳产，后勤要求扩充运输线。你最终拍板：两条腿走路。主城继续升级，外线以小队突袭切断敌补给，绝不硬拼消耗。\n\n会议散场时，Patrick把一份名单递给你：愿意加入前线的志愿者新增了四十七人。名单最后一行写着‘若必须远征，请先让孩子看到明天的灯。’"},
    { id: "c7", title: "第七章：裂谷补给战", unlockStage: 7, text: "你们沿裂谷建立了三处隐蔽补给点，计划把战线推到冰川外缘。敌军显然意识到了这一点，开始使用诱饵车队引你离开主路。第一天你们就丢了一个补给站，幸好核心物资提前转移。\n\nBahiti提出改用‘短链突击’：不追深、不恋战、打完就撤，让敌方永远不知道你下一次从哪出现。这个策略在第三夜奏效，你们连续截获两车燃料和一车医疗包，城内的库存曲线第一次明显抬头。\n\n与此同时，城里孩子在废钢板上画了一张地图，把每一次胜利标成小火焰。你路过时看见有人在第七个火焰旁写：‘今晚会更暖。’"},
    { id: "c8", title: "第八章：风暴前线", unlockStage: 8, text: "为了夺回南侧气象塔，你必须穿过一段无遮蔽冰原。风暴在两小时后抵达，这是唯一窗口。行动开始前，你把每个小队路线再确认一遍，连撤退信号都演练了三次。\n\n战斗中最危险的不是火力，而是能见度。敌我双方都被白雾切成碎片，通讯时断时续。你只能靠地标和时间判断队伍位置。就在窗口即将关闭时，Gina在塔底完成最后一次破坏，气象塔信号转为己方。\n\n回城后，所有人几乎站着就能睡着。但当控制室屏幕亮起稳定预报时，整间屋子静了一秒，然后爆发出掌声——这不是一场普通胜利，而是你们第一次抢回‘天气’本身。"},
    { id: "c9", title: "第九章：极夜之门", unlockStage: 9, text: "气象塔数据解出一条隐藏坐标：敌方主控中枢位于‘极夜之门’后方，那里常年被风暴环墙包围。你们只能在风眼形成的短暂间隙进入，一旦错过，整支队伍都会被困死在冰层迷宫。\n\n出征前夜，城里罕见地举办了简短的送行仪式。没有音乐，只有人们把保温灯一盏盏挂在城墙上。你站在高台上看着灯海，突然明白自己守护的不只是城市，而是每个普通人对明天的想象。\n\n远征队踏入风眼后，指南针全部失效，只有热能读数还能用。你在耳机里反复提醒：‘不要追击，保持阵型，目标只有中枢。’因为你知道，真正的Boss还在前面等着。"},
    { id: "c10", title: "第十章：极夜主宰", unlockStage: 10, text: "中枢大厅像一座倒置的熔炉，金属梁被冰晶包裹，中心站着‘极夜主宰’。它不是野兽，而是融合了指挥核心与重装机体的战争机器，能在数秒内切换防御形态与冲锋形态。\n\n决战分成三段。第一段你们打掉外层护盾；第二段主宰释放寒爆，几乎冻结全场；第三段，Patrick的战吼把全队士气拉回临界点，Molly与Bahiti完成交叉火力，Sergey顶着最后一次冲撞把主宰钉在能量柱前。你下令全员后撤，Gina完成终结一击。\n\n爆炸后的寂静持续了很久。远处天幕第一次出现浅金色裂口。你回头看见队员们彼此搀扶，没人说话，却都在笑。战斗并未结束，重建才刚开始——但从这一刻起，世界不再只有极夜。"}
  ],
  events: [
    "猎队在雪丘发现可用木料。",
    "哨兵回报：西侧风速持续上升。",
    "锻造台成功修复，钢材损耗下降。",
    "营地夜巡加强，治安与士气小幅回升。",
    "侦察员带回敌军旗帜，士兵训练热情高涨。"
  ]
};

let assets = loadAssets();
let storyPack = loadStoryPack();
let storyIndex = 0;
let currentTab = "city";
let citySubTab = "hub";
let battleSubTab = "march";
let techUiBranch = "dev";
let techUiView = "tree";
let missionViewTab = "chapter";
/** 编队英雄列表属性筛选（空=全部） */
let squadHeroRoleFilter_ = "";
let prevResourceSnapshot_ = null;
let forumBatchMode_ = null;
let wildBattleCtx_ = { spotIdx: 0, gemRetry: false };
let gatherTickerStarted_ = false;
let autoSaveReminderTimer_ = null;

function createDefaultState_() {
  return {
    day: 1,
    pop: 12,
    morale: 100,
    cold: 0,
    stage: 1,
    resources: { wood: 120, steel: 30, food: 100, fuel: 60, fireCrystal: 0 },
    buildings: Object.fromEntries(BUILDING_DEFS.map((b) => [b.id, 1])),
    buildingStars: Object.fromEntries(BUILDING_DEFS.map((b) => [b.id, 0])),
    heroes: HERO_POOL.map((h) => ({ ...h, level: 1, stars: 1, exp: 0 })),
    squad: HERO_POOL.slice(0, 3).map((h) => h.id),
    missions: structuredClone(DEFAULT_MISSIONS),
    missionPoolVersion: MISSION_POOL_VERSION,
    gatherNodes: Object.fromEntries(
      GATHER_NODE_DEFS.map((n) => [n.id, { running: false, startAt: 0, endAt: 0 }])
    ),
    gatherInbox: [],
    buildQueue: [],
    items: { speedup: 5, gems: 8 },
    skillCharge: Object.fromEntries(HERO_POOL.map((h) => [h.id, 0])),
    techs: {},
    introSeen: false,
    storySeen: {},
    storyBranches: { choices: {}, history: [], endings: {}, scores: { order: 0, force: 0, tactics: 0 }, finalEnding: "" },
    missionStats: { dayStamp: 1, battleToday: 0, gatherClaimToday: 0, gatherClaimLifetime: 0 },
    policyPoints: 0,
    laws: {},
    logs: { battle: [], event: [] },
    profile: { id: "", uid: 0 },
    march: { shield: 0, spear: 0, bow: 0 },
    inventory: [],
    alliance: { name: "霜前哨站", level: 1, exp: 0, honorXp: 0, solo: true, perks: { gather: 0, build: 0, battle: 0 } },
    forumShop: {
      manualReplies: 0,
      manualCites: 0,
      liveReplies: 0,
      liveCites: 0,
      uid: 0,
      startDate: "",
      endDate: "",
      lastSyncAt: 0,
      lastSyncErr: "",
      replyGemsClaimed: 0,
      citeGemsClaimed: 0,
      fastSyncNoCite: false,
      syncRangeDayKey: "",
      syncedRangeFingerprints: {},
      lastForumSyncFp: "",
      lastForumSyncDayISO: "",
    },
    shop: { dailyISO: "", resourceISO: "", resourceBuys: 0 },
    wild: {
      day: 0,
      cleared: {},
      wildCalISO: "",
      gemRetry: {},
      spotWinCount: {},
      challengeSpots: [],
      bonusUnlocked: false,
      bonusMapSpots: null,
      viewZone: 0,
    },
    townPass: { accAt: Date.now(), wood: 0, steel: 0, food: 0, fuel: 0, fireCrystal: 0 },
    extraBuildSlots: 0,
    extraGatherSlots: 0,
    gatherMastery: {},
  };
}

function isUsableSave_(raw) {
  if (!raw || typeof raw !== "object") return false;
  const r = raw.resources;
  if (!r || typeof r !== "object") return false;
  return Number.isFinite(Number(r.wood)) && Number.isFinite(Number(r.food));
}

const _loadedSave = load();
try {
  if (_loadedSave && typeof _loadedSave === "object") {
    localStorage.setItem(`${SAVE_KEY}__auto_backup_pre_update`, JSON.stringify(_loadedSave));
  }
} catch (_) {
  /* ignore backup failures */
}
const state = isUsableSave_(_loadedSave) ? _loadedSave : createDefaultState_();
normalizeState_();

function syncWildDay_() {
  const d = state.day || 1;
  syncWildCalendar_();
  if (!state.wild) state.wild = { day: d, cleared: {}, wildCalISO: "", gemRetry: {} };
  if ((state.wild.day || 0) !== d) {
    state.wild.day = d;
    state.wild.cleared = {};
  }
}

function wildGemRetryCost_(spotId) {
  const n = Number(state.wild?.gemRetry?.[String(spotId)] || 0);
  return 2 << n;
}

function generateBonusWildMaps_() {
  const maps = [];
  const gx = [12, 28, 44, 60, 76];
  const gy = [22, 42, 62];
  for (let z = 0; z < 10; z++) {
    const row = [];
    for (let i = 0; i < 15; i++) {
      const col = i % 5;
      const r = Math.floor(i / 5);
      row.push({
        id: 20000 + z * 48 + i,
        name: `外延·${z + 1}·${i + 1}`,
        x: gx[col],
        y: gy[r],
      });
    }
    maps.push(row);
  }
  return maps;
}

function wildSpotDef_(spotId) {
  const sid = String(spotId);
  for (const s of WILD_SPOTS) {
    if (String(s.id) === sid) return { ...s, kind: "base" };
  }
  for (const c of state.wild.challengeSpots || []) {
    if (String(c.id) === sid) return { id: c.id, name: c.name, x: c.x, y: c.y, kind: "challenge" };
  }
  for (const map of state.wild.bonusMapSpots || []) {
    for (const p of map) {
      if (String(p.id) === sid) return { ...p, kind: "bonus" };
    }
  }
  return { ...WILD_SPOTS[0], kind: "base" };
}

/** 用于战力／掉落公式的连续「难度序」 */
function wildSpotPowerScale_(spotId) {
  const d = wildSpotDef_(spotId);
  if (d.kind === "base") {
    const idx = WILD_SPOTS.findIndex((x) => String(x.id) === String(spotId));
    return idx >= 0 ? idx : 0;
  }
  if (d.kind === "challenge") {
    const n = Number(d.id) || 100;
    return 5.2 + (n % 11) * 0.18;
  }
  if (d.kind === "bonus") {
    const n = Number(d.id) || 20000;
    const zone = Math.max(0, Math.floor((n - 20000) / 48));
    const local = (n - 20000) % 48;
    return 7 + zone * 0.45 + (local % 15) * 0.09;
  }
  return 3;
}

function onWildSpotWin_(spotId) {
  const w = state.wild;
  if (!w) return;
  w.spotWinCount = w.spotWinCount || {};
  const k = String(spotId);
  w.spotWinCount[k] = (w.spotWinCount[k] || 0) + 1;
  const cnt = w.spotWinCount[k];
  if (cnt > 0 && cnt % 10 === 0 && (w.challengeSpots || []).length < 48) {
    if (Math.random() < 0.35) {
      const idx = w.challengeSpots.length;
      const pos = WILD_CHALLENGE_LAYOUT[idx % WILD_CHALLENGE_LAYOUT.length];
      const id = 100 + idx;
      w.challengeSpots.push({ id, name: `挑战据点·${idx + 1}`, x: pos[0], y: pos[1] });
      logEvent("野外", `新挑战据点：${w.challengeSpots[w.challengeSpots.length - 1].name}`);
    }
  }
  if (w.challengeSpots.length >= 10 && !w.bonusUnlocked) {
    w.bonusMapSpots = generateBonusWildMaps_();
    w.bonusUnlocked = true;
    logEvent("野外", "已解锁 10 张外延地图，可在上方切换区域继续挑战（每张 15 处据点，网格排布不重叠）。");
  }
}

function wildAnyUnclearedSpot_() {
  const w = state.wild;
  if (!w) return false;
  for (const sp of WILD_SPOTS) {
    if (!w.cleared[String(sp.id)]) return true;
  }
  for (const c of w.challengeSpots || []) {
    if (!w.cleared[String(c.id)]) return true;
  }
  if (w.bonusUnlocked && w.bonusMapSpots) {
    for (const map of w.bonusMapSpots) {
      for (const sp of map) {
        if (!w.cleared[String(sp.id)]) return true;
      }
    }
  }
  return false;
}

function getWildSpotsForView_() {
  const w = state.wild;
  const vz = Number(w.viewZone) || 0;
  if (!w.bonusUnlocked || vz === 0) {
    return [...WILD_SPOTS.map((s) => ({ ...s })), ...(w.challengeSpots || []).map((c) => ({ ...c }))];
  }
  const maps = w.bonusMapSpots;
  if (!maps || !maps[vz - 1]) return [...WILD_SPOTS];
  return maps[vz - 1];
}

function clearForumScrapeStorage_() {
  try {
    const wipe = (store) => {
      const keys = [];
      for (let i = 0; i < store.length; i += 1) {
        const k = store.key(i);
        if (k) keys.push(k);
      }
      keys.filter((k) => k.startsWith("ffSstm_")).forEach((k) => store.removeItem(k));
    };
    wipe(localStorage);
    wipe(sessionStorage);
  } catch (_) {
    /* ignore */
  }
}

function syncShopCalendar_() {
  const iso = isoDateLocal_();
  if (!state.shop) state.shop = { dailyISO: "", resourceISO: "", resourceBuys: 0 };
  if (state.shop.resourceISO !== iso) {
    state.shop.resourceISO = iso;
    state.shop.resourceBuys = 0;
  }
  if (!state.forumShop) state.forumShop = {};
  if (state.forumShop.syncRangeDayKey !== iso) {
    state.forumShop.syncRangeDayKey = iso;
    state.forumShop.syncedRangeFingerprints = {};
  }
}

function syncWildCalendar_() {
  const iso = isoDateLocal_();
  if (!state.wild) state.wild = { day: 0, cleared: {}, wildCalISO: "", gemRetry: {} };
  if (state.wild.wildCalISO !== iso) {
    state.wild.wildCalISO = iso;
    state.wild.gemRetry = {};
  }
}

init();

function normalizeState_() {
  const coreRes = { wood: 120, steel: 30, food: 100, fuel: 60 };
  if (!Number.isFinite(state.day) || state.day < 1) state.day = 1;
  if (!Number.isFinite(state.pop) || state.pop < 1) state.pop = 12;
  if (!Number.isFinite(state.morale)) state.morale = 100;
  if (!Number.isFinite(state.cold)) state.cold = 0;
  if (!Number.isFinite(state.stage) || state.stage < 1) state.stage = 1;
  state.stage = Math.min(BATTLE_STAGE_MAX_, Number(state.stage || 1));
  if (!state.resources || typeof state.resources !== "object") state.resources = { ...coreRes };
  ["wood", "steel", "food", "fuel"].forEach((k) => {
    if (!Number.isFinite(state.resources[k])) state.resources[k] = coreRes[k] ?? 0;
  });
  const resSum =
    Number(state.resources.wood || 0) +
    Number(state.resources.steel || 0) +
    Number(state.resources.food || 0) +
    Number(state.resources.fuel || 0);
  if (resSum <= 0 && (!Number.isFinite(state.day) || state.day <= 1)) {
    state.resources = { ...coreRes, fireCrystal: Number(state.resources?.fireCrystal) || 0 };
  }
  if (!Number.isFinite(state.resources.fireCrystal)) state.resources.fireCrystal = 0;
  if (!state.buildings || typeof state.buildings !== "object") {
    state.buildings = Object.fromEntries(BUILDING_DEFS.map((b) => [b.id, 1]));
  }
  BUILDING_DEFS.forEach((b) => {
    if (!Number.isFinite(state.buildings[b.id]) || state.buildings[b.id] < 1) state.buildings[b.id] = 1;
  });
  if (!state.buildingStars || typeof state.buildingStars !== "object") {
    state.buildingStars = Object.fromEntries(BUILDING_DEFS.map((b) => [b.id, 0]));
  }
  BUILDING_DEFS.forEach((b) => {
    if (!Number.isFinite(state.buildingStars[b.id]) || state.buildingStars[b.id] < 0) state.buildingStars[b.id] = 0;
    if (state.buildingStars[b.id] > MAX_BUILDING_STARS) state.buildingStars[b.id] = MAX_BUILDING_STARS;
  });
  if (!Array.isArray(state.heroes) || !state.heroes.length) {
    state.heroes = HERO_POOL.map((h) => ({ ...h, level: 1, stars: 1, exp: 0 }));
  }
  if (!Array.isArray(state.squad) || !state.squad.length) {
    state.squad = HERO_POOL.slice(0, maxSquadSize_()).map((h) => h.id);
  }
  if (!state.gatherNodes || typeof state.gatherNodes !== "object") {
    state.gatherNodes = {};
  }
  if (!state.stageBattleStats || typeof state.stageBattleStats !== "object") state.stageBattleStats = {};
  if (typeof state.lastGatherHeroId !== "string") state.lastGatherHeroId = "";
  GATHER_NODE_DEFS.forEach((n) => {
    if (!state.gatherNodes[n.id]) state.gatherNodes[n.id] = { running: false, startAt: 0, endAt: 0, heroId: "", durationMin: 15 };
    if (!Number.isFinite(state.gatherNodes[n.id].durationMin)) state.gatherNodes[n.id].durationMin = 15;
  });
  if (!state.gatherMastery || typeof state.gatherMastery !== "object") state.gatherMastery = {};
  GATHER_NODE_DEFS.forEach((n) => {
    if (!state.gatherMastery[n.id] || typeof state.gatherMastery[n.id] !== "object") state.gatherMastery[n.id] = { claims: 0 };
    if (!Number.isFinite(state.gatherMastery[n.id].claims)) state.gatherMastery[n.id].claims = 0;
  });
  if (!Array.isArray(state.gatherInbox)) state.gatherInbox = [];
  if (!Array.isArray(state.buildQueue)) state.buildQueue = [];
  if (!state.items) state.items = { speedup: 0, gems: 0 };
  if (!Number.isFinite(state.items.speedup)) state.items.speedup = 0;
  if (!Number.isFinite(state.items.gems)) state.items.gems = 0;
  if (!state.skillCharge || typeof state.skillCharge !== "object") {
    state.skillCharge = Object.fromEntries(HERO_POOL.map((h) => [h.id, 0]));
  }
  HERO_POOL.forEach((h) => {
    if (!Number.isFinite(state.skillCharge[h.id])) state.skillCharge[h.id] = 0;
  });
  (state.heroes || []).forEach((h) => {
    if (h?.id && !Number.isFinite(state.skillCharge[h.id])) state.skillCharge[h.id] = 0;
  });
  if (!state.techs || typeof state.techs !== "object") state.techs = {};
  TECH_DEFS.forEach((t) => {
    if (!Number.isFinite(state.techs[t.id])) state.techs[t.id] = 0;
  });
  if (!Number.isFinite(state.missionPoolVersion)) state.missionPoolVersion = 0;
  const freshMissionTemplate = buildExpandedMissions_();
  if (state.missionPoolVersion < MISSION_POOL_VERSION) {
    state.missions = mergeMissionProgress_(state.missions, freshMissionTemplate);
    state.missionPoolVersion = MISSION_POOL_VERSION;
  } else {
    const byId = new Map((state.missions || []).map((m) => [m.id, m]));
    state.missions = freshMissionTemplate.map((base, i) => {
      const old = byId.get(base.id) || {};
      return {
        ...base,
        ...old,
        cond: old.cond || base.cond,
        category: old.category || base.category || "chapter",
        unlocked:
          typeof old.unlocked === "boolean"
            ? old.unlocked
            : base.unlocked ?? (base.category === "chapter" && base.id === "m1"),
        done: !!old.done,
        ready: typeof old.ready === "boolean" ? old.ready : false,
        claimed: typeof old.claimed === "boolean" ? old.claimed : !!old.done,
        streak: Number.isFinite(old.streak) ? old.streak : base.streak || 0,
      };
    });
  }
  syncSpecialMissionUnlocks_();
  state.missions = state.missions.filter((m) => m.id !== "d_refresh" && !/刷新日常/.test(String(m.text || "")));
  state.buildQueue = state.buildQueue.map((q) => ({
    id: q.id,
    fromLv: Number(q.fromLv || 1),
    sec: Number(q.sec || 10),
    startAt: Number(q.startAt || 0),
    endAt: Number(q.endAt || 0),
    status: q.status || (q.startAt ? "active" : "pending"),
  }));
  if (!state.battleBuff) state.battleBuff = { mult: 1, active: false };
  if (typeof state.introSeen !== "boolean") state.introSeen = false;
  if (!state.storySeen || typeof state.storySeen !== "object") state.storySeen = {};
  if (!state.storyBranches || typeof state.storyBranches !== "object") {
    state.storyBranches = { choices: {}, history: [], endings: {}, scores: { order: 0, force: 0, tactics: 0 }, finalEnding: "" };
  }
  if (!state.storyBranches.choices) state.storyBranches.choices = {};
  if (!Array.isArray(state.storyBranches.history)) state.storyBranches.history = [];
  if (!state.storyBranches.endings || typeof state.storyBranches.endings !== "object") {
    state.storyBranches.endings = {};
  }
  if (!state.storyBranches.scores || typeof state.storyBranches.scores !== "object") {
    state.storyBranches.scores = { order: 0, force: 0, tactics: 0 };
  }
  if (typeof state.storyBranches.finalEnding !== "string") state.storyBranches.finalEnding = "";
  if (!state.missionStats || typeof state.missionStats !== "object") {
    state.missionStats = { dayStamp: state.day || 1, battleToday: 0, gatherClaimToday: 0, gatherClaimLifetime: 0 };
  }
  if (!Number.isFinite(state.missionStats.dayStamp)) state.missionStats.dayStamp = state.day || 1;
  if (!Number.isFinite(state.missionStats.battleToday)) state.missionStats.battleToday = 0;
  if (!Number.isFinite(state.missionStats.gatherClaimToday)) state.missionStats.gatherClaimToday = 0;
  if (!Number.isFinite(state.missionStats.gatherClaimLifetime)) state.missionStats.gatherClaimLifetime = 0;
  if (!Number.isFinite(state.policyPoints)) state.policyPoints = 0;
  if (!state.laws || typeof state.laws !== "object") state.laws = {};
  LAW_DEFS.forEach((l) => {
    if (!Number.isFinite(state.laws[l.id])) state.laws[l.id] = 0;
  });
  if (!state.codexBooks || typeof state.codexBooks !== "object") state.codexBooks = {};
  CODEX_DEFS.forEach((c) => {
    if (!Number.isFinite(state.codexBooks[c.id])) state.codexBooks[c.id] = 0;
  });
  if (!state.march || typeof state.march !== "object") state.march = { shield: 0, spear: 0, bow: 0 };
  ["shield", "spear", "bow"].forEach((k) => {
    if (!Number.isFinite(state.march[k])) state.march[k] = 0;
  });
  if (!Array.isArray(state.inventory)) state.inventory = [];
  if (!state.profile || typeof state.profile !== "object") state.profile = { id: "", uid: 0 };
  if (typeof state.profile.id !== "string") state.profile.id = "";
  if (!Number.isFinite(state.profile.uid)) state.profile.uid = 0;
  if (!state.alliance || typeof state.alliance !== "object") {
    state.alliance = { name: "霜前哨站", level: 1, exp: 0, honorXp: 0, solo: true, perks: { gather: 0, build: 0, battle: 0 } };
  }
  if (!state.alliance.perks || typeof state.alliance.perks !== "object") {
    state.alliance.perks = { gather: 0, build: 0, battle: 0 };
  }
  ["gather", "build", "battle"].forEach((k) => {
    if (!Number.isFinite(state.alliance.perks[k])) state.alliance.perks[k] = 0;
  });
  if (!Number.isFinite(state.alliance.exp)) state.alliance.exp = 0;
  if (!Number.isFinite(state.alliance.honorXp)) state.alliance.honorXp = 0;
  if (!Number.isFinite(state.alliance.level) || state.alliance.level < 1) state.alliance.level = 1;
  if (state.alliance.level > ALLIANCE_MAX_LEVEL) state.alliance.level = ALLIANCE_MAX_LEVEL;
  if (!state.forumShop || typeof state.forumShop !== "object") {
    state.forumShop = {
      manualReplies: 0,
      manualCites: 0,
      liveReplies: 0,
      liveCites: 0,
      uid: 0,
      startDate: "",
      endDate: "",
      lastSyncAt: 0,
      lastSyncErr: "",
      replyGemsClaimed: 0,
      citeGemsClaimed: 0,
      fastSyncNoCite: false,
    };
  }
  const fsNorm = state.forumShop;
  if (!Number.isFinite(fsNorm.manualReplies)) {
    fsNorm.manualReplies = Number.isFinite(fsNorm.replies) ? fsNorm.replies : 0;
  }
  if (!Number.isFinite(fsNorm.manualCites)) {
    fsNorm.manualCites = Number.isFinite(fsNorm.citations) ? fsNorm.citations : 0;
  }
  if (!Number.isFinite(fsNorm.liveReplies)) fsNorm.liveReplies = 0;
  if (!Number.isFinite(fsNorm.liveCites)) fsNorm.liveCites = 0;
  if (!fsNorm.liveByFp || typeof fsNorm.liveByFp !== "object") fsNorm.liveByFp = {};
  if (!Number.isFinite(fsNorm.uid)) fsNorm.uid = 0;
  if (state.profile.uid > 0 && (!Number.isFinite(fsNorm.uid) || fsNorm.uid <= 0)) fsNorm.uid = state.profile.uid;
  if (typeof fsNorm.startDate !== "string") fsNorm.startDate = "";
  if (typeof fsNorm.endDate !== "string") fsNorm.endDate = "";
  if (!Number.isFinite(fsNorm.lastSyncAt)) fsNorm.lastSyncAt = 0;
  if (typeof fsNorm.lastSyncErr !== "string") fsNorm.lastSyncErr = "";
  if (!Number.isFinite(fsNorm.replyGemsClaimed)) fsNorm.replyGemsClaimed = 0;
  if (!Number.isFinite(fsNorm.citeGemsClaimed)) fsNorm.citeGemsClaimed = 0;
  if (typeof fsNorm.fastSyncNoCite !== "boolean") fsNorm.fastSyncNoCite = false;
  if (typeof fsNorm.syncRangeDayKey !== "string") fsNorm.syncRangeDayKey = "";
  if (!fsNorm.syncedRangeFingerprints || typeof fsNorm.syncedRangeFingerprints !== "object") fsNorm.syncedRangeFingerprints = {};
  if (typeof fsNorm.lastForumSyncFp !== "string") fsNorm.lastForumSyncFp = "";
  if (typeof fsNorm.lastForumSyncDayISO !== "string") fsNorm.lastForumSyncDayISO = "";
  if (!fsNorm.claimedByFp || typeof fsNorm.claimedByFp !== "object") fsNorm.claimedByFp = {};
  if (!state.shop || typeof state.shop !== "object") state.shop = { dailyISO: "", resourceISO: "", resourceBuys: 0 };
  if (typeof state.shop.dailyISO !== "string") state.shop.dailyISO = "";
  if (typeof state.shop.resourceISO !== "string") state.shop.resourceISO = "";
  if (!Number.isFinite(state.shop.resourceBuys)) state.shop.resourceBuys = 0;
  if (!state.wild || typeof state.wild !== "object") state.wild = { day: 0, cleared: {} };
  if (!Number.isFinite(state.wild.day)) state.wild.day = 0;
  if (!state.wild.cleared || typeof state.wild.cleared !== "object") state.wild.cleared = {};
  if (!state.wild.gemRetry || typeof state.wild.gemRetry !== "object") state.wild.gemRetry = {};
  if (typeof state.wild.wildCalISO !== "string") state.wild.wildCalISO = "";
  if (!state.wild.spotWinCount || typeof state.wild.spotWinCount !== "object") state.wild.spotWinCount = {};
  if (!Array.isArray(state.wild.challengeSpots)) state.wild.challengeSpots = [];
  if (typeof state.wild.bonusUnlocked !== "boolean") state.wild.bonusUnlocked = false;
  if (!Number.isFinite(state.wild.viewZone)) state.wild.viewZone = 0;
  if (state.wild.bonusMapSpots && !Array.isArray(state.wild.bonusMapSpots)) state.wild.bonusMapSpots = null;
  if (state.wild.bonusUnlocked && (!state.wild.bonusMapSpots || !state.wild.bonusMapSpots.length)) {
    state.wild.bonusMapSpots = generateBonusWildMaps_();
  }
  if (
    state.wild.bonusUnlocked &&
    state.wild.bonusMapSpots &&
    state.wild.bonusMapSpots[0] &&
    state.wild.bonusMapSpots[0].length !== 15
  ) {
    state.wild.bonusMapSpots = generateBonusWildMaps_();
  }
  if (!state.townPass || typeof state.townPass !== "object") {
    state.townPass = { accAt: Date.now(), wood: 0, steel: 0, food: 0, fuel: 0, fireCrystal: 0 };
  }
  ["wood", "steel", "food", "fuel", "fireCrystal"].forEach((k) => {
    if (!Number.isFinite(state.townPass[k])) state.townPass[k] = 0;
  });
  if (!Number.isFinite(state.townPass.accAt)) state.townPass.accAt = Date.now();
  normalizeActivity_();
  ensureActivityMinigames_();
  if (!Number.isFinite(state.extraBuildSlots)) state.extraBuildSlots = 0;
  if (!Number.isFinite(state.extraGatherSlots)) state.extraGatherSlots = 0;
  syncWildDay_();
  syncShopCalendar_();
  applyGameplayToState_();
  try {
    tickBuildQueue_();
  } catch (_) {
    /* ignore */
  }
}

function applyGameplayToState_(forceRebuild = false) {
  const rosterList = gameplay.heroes || [];
  const dexById = new Map(allHeroDefs_().map((h) => [h.id, h]));
  const mergeHeroFromDef = (prev, def) => {
    const base = {
      ...def,
      level: prev.level || 1,
      stars: prev.stars || 1,
      exp: Number(prev.exp || 0),
      bonusAtk: Number(prev.bonusAtk || 0),
      bonusHp: Number(prev.bonusHp || 0),
      slug: def.slug || prev.slug || "",
      evolveToId: def.evolveToId !== undefined ? def.evolveToId : prev.evolveToId || "",
      evolveAtLevel: Number.isFinite(def.evolveAtLevel) ? def.evolveAtLevel : Number(prev.evolveAtLevel || 999),
      gatherSkillId: def.gatherSkillId || prev.gatherSkillId || "",
      battleExtraSkillId: def.battleExtraSkillId || prev.battleExtraSkillId || "",
    };
    return base;
  };
  const freshFromStarter = (h) => ({
    ...h,
    level: 1,
    stars: 1,
    exp: 0,
    bonusAtk: 0,
    bonusHp: 0,
    slug: h.slug || "",
    evolveToId: h.evolveToId || "",
    evolveAtLevel: Number.isFinite(h.evolveAtLevel) ? h.evolveAtLevel : 999,
    gatherSkillId: h.gatherSkillId || "",
    battleExtraSkillId: h.battleExtraSkillId || "",
  });
  if (!Array.isArray(state.heroes)) state.heroes = [];
  if (forceRebuild || !state.heroes.length) {
    state.heroes = rosterList.map((h) => freshFromStarter(h));
  } else {
    const oldList = state.heroes.slice();
    const used = new Set();
    const next = [];
    rosterList.forEach((st) => {
      const candidates = oldList.filter((h) => !used.has(h.id) && heroEvolutionRootId_(h.id) === st.id);
      let best = null;
      let bestScore = -1;
      candidates.forEach((h) => {
        const sc = evolutionStepsFromStarter_(st.id, h.id);
        if (sc > bestScore) {
          bestScore = sc;
          best = h;
        }
      });
      if (best) {
        used.add(best.id);
        const def = dexById.get(best.id) || st;
        next.push(mergeHeroFromDef(best, def));
      } else {
        next.push(freshFromStarter(st));
      }
    });
    // 保留玩家已拥有但不在 starters 清单中的英雄（如寻访/活动获得），避免更新时丢档。
    oldList.forEach((h) => {
      if (used.has(h.id)) return;
      const def = dexById.get(h.id);
      if (!def) return;
      next.push(mergeHeroFromDef(h, def));
    });
    state.heroes = next;
  }
  // 去重保护：同一宝可梦 ID 只保留一份（保留养成进度较高的记录）
  const heroKeep = new Map();
  state.heroes.forEach((h) => {
    const id = String(h.id || "");
    if (!id) return;
    const old = heroKeep.get(id);
    if (!old) {
      heroKeep.set(id, h);
      return;
    }
    const score = (x) =>
      Number(x.stars || 1) * 1e6 +
      Number(x.level || 1) * 1e4 +
      Number(x.exp || 0) * 10 +
      Number(x.bonusAtk || 0) +
      Number(x.bonusHp || 0);
    if (score(h) > score(old)) heroKeep.set(id, h);
  });
  state.heroes = Array.from(heroKeep.values());
  const ids = new Set(state.heroes.map((h) => h.id));
  if (!Array.isArray(state.squad) || !state.squad.length) {
    state.squad = rosterList.slice(0, maxSquadSize_()).map((h) => h.id);
  }
  state.squad = state.squad.filter((id) => ids.has(id)).slice(0, maxSquadSize_());
  if (!state.squad.length) {
    state.squad = rosterList.slice(0, maxSquadSize_()).map((h) => h.id);
  }
  if (!state.skillCharge || typeof state.skillCharge !== "object") state.skillCharge = {};
  state.heroes.forEach((h) => {
    if (!Number.isFinite(state.skillCharge[h.id])) state.skillCharge[h.id] = 0;
  });
  Object.keys(state.skillCharge).forEach((id) => {
    if (!ids.has(id)) delete state.skillCharge[id];
  });
  state.heroes.forEach((h) => {
    if (!Number.isFinite(h.exp)) h.exp = 0;
    if (!Number.isFinite(h.level)) h.level = 1;
    if (!Number.isFinite(h.bonusAtk)) h.bonusAtk = 0;
    if (!Number.isFinite(h.bonusHp)) h.bonusHp = 0;
    h.level = clamp(h.level, 1, heroLevelCap_());
  });
  state.heroes = state.heroes.map((h) => {
    const d = heroDefById_(h.id);
    if (!d) return h;
    return {
      ...h,
      activeSkillId: h.activeSkillId || d.activeSkillId,
      passiveSkillId: h.passiveSkillId || d.passiveSkillId,
      gatherSkillId: h.gatherSkillId || d.gatherSkillId,
      battleExtraSkillId: h.battleExtraSkillId || d.battleExtraSkillId,
      slug: h.slug || d.slug || "",
      evolveToId: d.evolveToId != null && String(d.evolveToId).length ? String(d.evolveToId) : h.evolveToId || "",
      evolveAtLevel: Number.isFinite(d.evolveAtLevel) ? d.evolveAtLevel : Number(h.evolveAtLevel || 999),
    };
  });
}

function init() {
  try {
    bind();
  } catch (e) {
    console.error("[Frost] bind() 失败，部分按钮可能无响应：", e);
  }
  applyAssetTheme();
  renderAll();

  bootstrapAsync()
    .catch(() => {})
    .finally(() => {
      applyAssetTheme();
      renderAll();
      ensureStoryIndex();
      renderStory();
      logEvent("系统", "已载入存档。");
      logAsset("素材包已就绪，可导入 JSON 替换素材。");
      if (!gatherTickerStarted_) {
        gatherTickerStarted_ = true;
        startGatherTicker();
      }
      try {
        tickBuildQueue_();
        save();
      } catch (_) {
        /* ignore */
      }
      if (!state.introSeen) playIntroCutscene();
      const needLogin = !(Number(state?.profile?.uid || 0) > 0) || !String(state?.profile?.id || "").trim();
      if (needLogin) byId("screen-login")?.classList.remove("hidden");
      else {
        byId("screen-login")?.classList.add("hidden");
        startAutoSaveReminder_();
      }
    });
}

async function bootstrapAsync() {
  const [remoteAssets, remoteStory, remoteGameplay] = await Promise.all([
    tryFetchJson("./assets.json"),
    tryFetchJson("./story.json"),
    tryFetchJson("./gameplay.json"),
  ]);

  if (remoteAssets && typeof remoteAssets === "object") {
    assets = {
      ui: { ...DEFAULT_ASSETS.ui, ...(assets.ui || {}), ...(remoteAssets.ui || {}) },
      resources: { ...DEFAULT_ASSETS.resources, ...(assets.resources || {}), ...(remoteAssets.resources || {}) },
      buildings: { ...DEFAULT_ASSETS.buildings, ...(assets.buildings || {}), ...(remoteAssets.buildings || {}) },
      battleFx: { ...DEFAULT_ASSETS.battleFx, ...(assets.battleFx || {}), ...(remoteAssets.battleFx || {}) },
      heroes: { ...DEFAULT_ASSETS.heroes, ...(assets.heroes || {}), ...(remoteAssets.heroes || {}) },
      cutscene: {
        bgs: [...(DEFAULT_ASSETS.cutscene?.bgs || []), ...((assets.cutscene?.bgs || remoteAssets.cutscene?.bgs || []).filter(Boolean))].slice(0, 8),
        chars: { ...(DEFAULT_ASSETS.cutscene?.chars || {}), ...(assets.cutscene?.chars || {}), ...(remoteAssets.cutscene?.chars || {}) }
      }
    };
    saveAssets();
  }
  if (remoteStory && Array.isArray(remoteStory.chapters)) {
    storyPack = normalizeStoryPack(remoteStory);
    saveStoryPack(storyPack);
  }
  if (remoteGameplay && Array.isArray(remoteGameplay.heroes)) {
    gameplay = normalizeGameplay(remoteGameplay);
    if (!Array.isArray(gameplay.heroDexExtras) || !gameplay.heroDexExtras.length) {
      gameplay.heroDexExtras = structuredClone(DEFAULT_GAMEPLAY.heroDexExtras || []);
    }
    HERO_POOL = gameplay.heroes;
    saveGameplay(gameplay);
    // 远端配置更新时仅做“数据对齐”，不强制重建玩家英雄存档。
    applyGameplayToState_(false);
  }
}

function setActionRailPanelOpen_(open) {
  const panel = byId("slg-action-rail-panel");
  const fab = byId("slg-action-rail-btn");
  if (!panel || !fab) return;
  panel.hidden = !open;
  fab.setAttribute("aria-expanded", open ? "true" : "false");
}

function bind() {
  initBottomTabs_();
  initSubTabs_();
  byId("btn-next-day")?.addEventListener("click", nextDay);
  byId("btn-battle")?.addEventListener("click", doBattle);
  byId("btn-auto")?.addEventListener("click", () => {
    for (let i = 0; i < 5; i++) {
      const ok = doBattle(true);
      if (ok === false) break;
    }
    renderAll();
  });
  byId("btn-save")?.addEventListener("click", () => {
    save();
    logEvent("系统", "已手动存档。");
    renderLogs();
  });
  byId("btn-reset")?.addEventListener("click", () => {
    if (!confirm("确定重开新档？将清除存档、论坛同步快取，并重置钻石购买的施工工位、采集伫列扩充等进度。")) return;
    clearForumScrapeStorage_();
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  });
  byId("btn-export-assets")?.addEventListener("click", exportAssets);
  byId("btn-import-assets")?.addEventListener("click", importAssets);
  byId("btn-reset-assets")?.addEventListener("click", resetAssets);
  byId("btn-save-export")?.addEventListener("click", exportSaveFile_);
  byId("btn-save-import")?.addEventListener("click", () => byId("save-import-file")?.click());
  byId("save-import-file")?.addEventListener("change", importSaveFile_);
  byId("btn-restore-heroes-backup")?.addEventListener("click", restoreHeroesFromAutoBackup_);
  byId("btn-cloud-upload-save")?.addEventListener("click", uploadCloudSave_);
  byId("btn-cloud-load-save")?.addEventListener("click", loadCloudSave_);
  byId("btn-cloud-ping")?.addEventListener("click", pingCloudSave_);
  byId("btn-switch-account")?.addEventListener("click", () => openLoginOverlayForSwitch_());
  byId("btn-logout-account")?.addEventListener("click", () => logoutAccount_());
  updateCloudMetaUi_();
  byId("btn-login-enter")?.addEventListener("click", submitLogin_);
  byId("login-id")?.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") byId("login-uid")?.focus();
  });
  byId("login-uid")?.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") submitLogin_();
  });
  renderLoginHistory_();
  syncLoginUi_();
  byId("btn-import-gameplay-key")?.addEventListener("click", () => byId("gameplay-key-file")?.click());
  byId("gameplay-key-file")?.addEventListener("change", importGameplayKeyFile_);
  byId("btn-export-gameplay")?.addEventListener("click", () => {
    if (!gameplayKeyUnlocked_()) return alert("请先汇入玩法 KEY。");
    exportGameplay();
  });
  byId("btn-import-gameplay")?.addEventListener("click", () => {
    if (!gameplayKeyUnlocked_()) return alert("请先汇入玩法 KEY。");
    importGameplay();
  });
  byId("btn-reset-gameplay")?.addEventListener("click", () => {
    if (!gameplayKeyUnlocked_()) return alert("请先汇入玩法 KEY。");
    resetGameplay();
  });
  updateGameplayKeyUi_();
  byId("btn-play-intro")?.addEventListener("click", playIntroCutscene);
  byId("btn-prev-chapter")?.addEventListener("click", () => {
    storyIndex = Math.max(0, storyIndex - 1);
    renderStory();
  });
  byId("btn-next-chapter")?.addEventListener("click", () => {
    storyIndex = Math.min((storyPack.chapters || []).length - 1, storyIndex + 1);
    renderStory();
  });
  byId("btn-play-chapter")?.addEventListener("click", playCurrentChapterCutscene);
  byId("btn-cutscene-next")?.addEventListener("click", cutsceneNext);
  byId("btn-cutscene-skip")?.addEventListener("click", skipCutsceneChapter_);
  byId("bm-close")?.addEventListener("click", closeBuildingModal);
  byId("bm-upgrade")?.addEventListener("click", () => {
    const id = byId("building-modal").dataset.bid;
    if (!id) return;
    const res = upgradeBuilding(id);
    if (!res?.ok) alert(`升级失败：${upgradeReasonText_(res?.reason)}（已显示诊断）`);
    openBuildingModal(id);
  });
  byId("btn-use-speedup")?.addEventListener("click", useSpeedupOnBuildQueue);
  byId("btn-cast-ult")?.addEventListener("click", castReadyUlts);
  byId("btn-goto-story")?.addEventListener("click", () => {
    const unread = getUnlockedUnreadChapterIds_();
    if (!unread.length) return;
    const idx = (storyPack.chapters || []).findIndex((x) => x.id === unread[0]);
    if (idx >= 0) storyIndex = idx;
    switchTab_("story");
    playCurrentChapterCutscene();
    renderStory();
  });
  byId("gcm-close")?.addEventListener("click", () => closeModalWithAnim_("gather-claim-modal"));
  byId("gcm-claim-one")?.addEventListener("click", claimGatherOne);
  byId("gcm-claim-all")?.addEventListener("click", claimGatherAll);
  byId("btn-open-settings")?.addEventListener("click", () => switchTab_("settings"));
  byId("slg-btn-top-shop")?.addEventListener("click", () => switchTab_("shop"));
  byId("slg-gems-plus")?.addEventListener("click", () => switchTab_("shop"));
  byId("btn-shop-daily")?.addEventListener("click", claimShopDaily_);
  byId("btn-shop-resource")?.addEventListener("click", buyShopResourcePack_);
  byId("btn-shop-buy-speed")?.addEventListener("click", buyShopSpeedTickets_);
  byId("btn-shop-recruit")?.addEventListener("click", shopRecruitHero_);
  byId("btn-shop-recruit-ten")?.addEventListener("click", shopRecruitTen_);
  byId("slg-action-rail-btn")?.addEventListener("click", () => {
    const panel = byId("slg-action-rail-panel");
    if (!panel) return;
    setActionRailPanelOpen_(panel.hidden);
  });
  byId("slg-action-rail-min")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActionRailPanelOpen_(false);
  });
  byId("slg-action-rail")?.addEventListener("click", (e) => {
    if (e.target.closest("#slg-action-rail-min")) {
      e.preventDefault();
      e.stopPropagation();
      setActionRailPanelOpen_(false);
    }
  });
  byId("btn-open-hero-dex")?.addEventListener("click", openHeroDexModal_);
  byId("hero-dex-close")?.addEventListener("click", () => closeModalWithAnim_("hero-dex-modal"));
  byId("hero-dex-modal")?.querySelector(".modal-mask")?.addEventListener("click", () => closeModalWithAnim_("hero-dex-modal"));
  byId("shop-resource-batch")?.addEventListener("input", () => renderShopOffers_());
  byId("shop-speed-batch")?.addEventListener("input", () => renderShopOffers_());
  byId("hero-detail-close")?.addEventListener("click", () => closeModalWithAnim_("hero-detail-modal"));
  byId("forum-batch-cancel")?.addEventListener("click", () => {
    byId("forum-batch-modal")?.classList.add("hidden");
    forumBatchMode_ = null;
  });
  byId("forum-batch-confirm")?.addEventListener("click", () => confirmForumBatchClaim_());
  byId("forum-batch-modal")?.querySelector(".modal-mask")?.addEventListener("click", () => {
    byId("forum-batch-modal")?.classList.add("hidden");
    forumBatchMode_ = null;
  });
  byId("forum-debug-close")?.addEventListener("click", () => byId("forum-debug-modal")?.classList.add("hidden"));
  byId("forum-debug-modal")?.querySelector(".modal-mask")?.addEventListener("click", () => {
    byId("forum-debug-modal")?.classList.add("hidden");
  });
  byId("slg-btn-activities")?.addEventListener("click", openActivitiesHub_);
  byId("slg-btn-settings")?.addEventListener("click", () => switchTab_("settings"));
  byId("activities-hub-close")?.addEventListener("click", () => closeModalWithAnim_("activities-hub-modal"));
  byId("activities-hub-modal")?.querySelector(".modal-mask")?.addEventListener("click", () =>
    closeModalWithAnim_("activities-hub-modal")
  );
  byId("stage-report-close")?.addEventListener("click", () => closeModalWithAnim_("stage-report-modal"));
  byId("stage-report-modal")?.querySelector(".modal-mask")?.addEventListener("click", () =>
    closeModalWithAnim_("stage-report-modal")
  );
  byId("stage-report-copy")?.addEventListener("click", async () => {
    if (!stageReportCopyText_) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(stageReportCopyText_);
        alert("战报数值已复制");
      } else {
        alert("当前环境不支持剪贴板复制");
      }
    } catch (_) {
      alert("复制失败，请手动复制");
    }
  });
}

function initBottomTabs_() {
  const tabs = Array.from(document.querySelectorAll(".nav-tab"));
  if (!tabs.length) return;
  tabs.forEach((btn) => {
    btn.onclick = () => {
      const cs = btn.getAttribute("data-city-sub");
      const bs = btn.getAttribute("data-battle-sub");
      if (cs) citySubTab = cs;
      if (bs) battleSubTab = bs;
      const tab = btn.getAttribute("data-tab") || "city";
      switchTab_(tab);
    };
  });
  switchTab_(currentTab);
}

function navTabMatches_(el) {
  const t = el.getAttribute("data-tab");
  if (t !== currentTab) return false;
  const cs = el.getAttribute("data-city-sub");
  const bs = el.getAttribute("data-battle-sub");
  if (currentTab === "city" && cs) return citySubTab === cs;
  if (currentTab === "battle" && bs) return battleSubTab === bs;
  if (currentTab === "city" && !cs) return true;
  if (currentTab === "battle" && !bs) return battleSubTab === "combat";
  return true;
}

function switchTab_(tab) {
  currentTab = tab;
  document.body.classList.toggle("tab-city", tab === "city");
  document.querySelectorAll(".nav-tab").forEach((x) => {
    x.classList.toggle("active", navTabMatches_(x));
  });
  document.querySelectorAll(".page-section").forEach((x) => {
    const page = x.getAttribute("data-page");
    if (page !== tab) {
      x.classList.remove("active");
      return;
    }
    const sub = x.getAttribute("data-sub");
    if (!sub) {
      x.classList.add("active");
      return;
    }
    if (tab === "city") x.classList.toggle("active", sub === citySubTab);
    else if (tab === "battle") x.classList.toggle("active", sub === battleSubTab);
    else x.classList.add("active");
  });
  syncSubTabNav_();
  updateNavBadges_();
}

function switchCitySub_(id) {
  citySubTab = id;
  switchTab_("city");
}

function switchBattleSub_(id) {
  battleSubTab = id;
  switchTab_("battle");
}

function syncSubTabNav_() {
  const cityNav = byId("city-sub-nav");
  const battleNav = byId("battle-sub-nav");
  if (cityNav) {
    cityNav.hidden = currentTab !== "city";
    cityNav.querySelectorAll("[data-city-sub]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-city-sub") === citySubTab);
    });
  }
  if (battleNav) {
    battleNav.hidden = currentTab !== "battle";
    battleNav.querySelectorAll("[data-battle-sub]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-battle-sub") === battleSubTab);
    });
  }
}

function initSubTabs_() {
  byId("city-sub-nav")
    ?.querySelectorAll("[data-city-sub]")
    .forEach((btn) => {
      btn.onclick = () => switchCitySub_(btn.getAttribute("data-city-sub") || "hub");
    });
  byId("battle-sub-nav")
    ?.querySelectorAll("[data-battle-sub]")
    .forEach((btn) => {
      btn.onclick = () => switchBattleSub_(btn.getAttribute("data-battle-sub") || "march");
    });
  syncSubTabNav_();
}

function nextDay() {
  state.day += 1;
  syncWildDay_();
  syncShopCalendar_();
  if (state.missionStats.dayStamp !== state.day) {
    state.missionStats.dayStamp = state.day;
    state.missionStats.battleToday = 0;
    state.missionStats.gatherClaimToday = 0;
    resetDailyMissionsForNewDay_();
  }
  runBuildingProduction();
  tickHeaterFireCrystalAndBooks_();

  const foodNeed = Math.ceil(state.pop * 1.5 * (1 - getLawBonus_("foodUseDown")));
  const fuelNeed = Math.ceil((8 + state.day * 0.2) * (1 + getLawBonus_("fuelUseUp")));
  spend("food", foodNeed);
  spend("fuel", fuelNeed);

  if (state.resources.fuel < 0) {
    state.cold += 3;
    state.resources.fuel = 0;
  } else {
    state.cold = Math.max(0, state.cold - totalColdReduce());
  }

  if (state.resources.food < 0) {
    state.morale -= Math.ceil(8 * (1 - getLawBonus_("moraleLossDown")));
    state.resources.food = 0;
  } else {
    state.morale = Math.min(100, state.morale + 1);
  }

  if (state.cold > 20) state.morale -= 4;
  state.morale = clamp(state.morale, 0, 100);
  rollRandomEvent();
  tickMissions("day");
  state.heroes.forEach((h) => {
    state.skillCharge[h.id] = clamp((state.skillCharge[h.id] || 0) + 8, 0, 100);
  });
  if (Math.random() < 0.18) {
    state.items.speedup += 1;
    logEvent("补给", "获得加速道具 x1");
  }
  if (state.day % 3 === 0) {
    state.alliance.exp = (state.alliance.exp || 0) + 1;
    logEvent("联盟", "联盟经验 +1（每 3 天结算）");
  }
  bumpAllianceHonor_(2);
  save();
  renderAll();
}

function doBattle(silent = false) {
  const stageBefore = Number(state.stage || 1);
  const myPowerBefore = calcBattlePowerDisplay_();
  const enemyPowerBefore = calcEnemyPower();
  const gate = stageGateReq_(state.stage);
  if (gate) {
    const msg = `无法开始战斗：关卡${state.stage}需 Day ${gate.day}+、中央熔炉 Lv${gate.heaterLv}+、训练营 Lv${gate.campLv}+、伐木场 Lv${gate.lumberLv}+（当前 Day ${state.day} / 熔炉 Lv${state.buildings.heater || 1} / 训练营 Lv${state.buildings.camp || 1} / 伐木场 Lv${state.buildings.lumber || 1}）`;
    showBattleBlockReason_(msg);
    if (!silent) alert(msg);
    return false;
  }
  const unread = getUnlockedUnreadChapterIds_();
  if (unread.length) {
    const firstId = unread[0];
    const chapter = (storyPack.chapters || []).find((x) => x.id === firstId);
    const msg = `无法开始战斗：有未观看剧情（${chapter?.title || firstId}）。请先观看剧情。`;
    showBattleBlockReason_(msg, firstId);
    logBattle(`⛔ ${msg}`);
    if (!silent) {
      const idx = (storyPack.chapters || []).findIndex((x) => x.id === firstId);
      if (idx >= 0) storyIndex = idx;
      switchTab_("story");
      playCurrentChapterCutscene();
      alert(msg);
      renderStory();
    }
    return false;
  }
  showBattleBlockReason_("");
  const sim = simulateBattleTurns_();
  animateBattleScene(sim);
  if (!silent) {
    sim.logs.forEach((x) => logBattle(x));
  }
  if (sim.win) {
    state.missionStats.battleToday = (state.missionStats.battleToday || 0) + 1;
    state.stage = Math.min(BATTLE_STAGE_MAX_, Number(state.stage || 1) + 1);
    addRes(sim.loot);
    grantHeroExp(8);
    bumpActivityBattleWin_();
    bumpAllianceHonor_(1);
    if (!silent) {
      logBattle(`胜利结算：木${sim.loot.wood}/钢${sim.loot.steel}/粮${sim.loot.food}/燃${sim.loot.fuel}`);
      if (state.stage >= BATTLE_STAGE_MAX_) logBattle(`已达到当前主线关卡上限：${BATTLE_STAGE_MAX_}`);
    }
    lastBattleOutcomeHint_ = `上一场结果：胜利（${sim.endReason || "敌方被击破"}）`;
  } else {
    state.morale = Math.max(0, state.morale - 3);
    if (!silent) logBattle("战败结算：士气 -3");
    lastBattleOutcomeHint_ = `上一场结果：败北（${sim.endReason || "战斗判定失利"}）`;
  }
  if (sim?.debuff?.moraleDown) {
    state.morale = Math.max(0, state.morale - Number(sim.debuff.moraleDown || 0));
    if (!silent) logBattle(`Boss 减益：士气 -${Number(sim.debuff.moraleDown || 0)}`);
  }
  state.heroes.forEach((h) => {
    if (state.squad.includes(h.id)) state.skillCharge[h.id] = clamp((state.skillCharge[h.id] || 0) + 22, 0, 100);
  });
  tickMissions("battle");
  if (!state.stageBattleStats || typeof state.stageBattleStats !== "object") state.stageBattleStats = {};
  const key = String(stageBefore);
  const row = state.stageBattleStats[key] || { attempts: 0, wins: 0, losses: 0, bestMyPower: 0, bestEnemyPower: 0, lastLoot: null, lastAt: 0, recentReports: [] };
  row.attempts += 1;
  if (sim.win) row.wins += 1;
  else row.losses += 1;
  row.bestMyPower = Math.max(Number(row.bestMyPower || 0), Number(myPowerBefore || 0));
  row.bestEnemyPower = Math.max(Number(row.bestEnemyPower || 0), Number(enemyPowerBefore || 0));
  row.lastLoot = sim.loot || null;
  row.lastAt = Date.now();
  if (!Array.isArray(row.recentReports)) row.recentReports = [];
  row.recentReports.push({
    at: Date.now(),
    win: !!sim.win,
    myPower: Number(myPowerBefore || 0),
    enemyPower: Number(enemyPowerBefore || 0),
    endReason: String(sim.endReason || ""),
    loot: sim.loot || {},
  });
  row.recentReports = row.recentReports.slice(-5);
  state.stageBattleStats[key] = row;
  save();
  if (!silent) renderAll();
  return true;
}

function simulateBattleTurns_() {
  const allies = state.heroes.filter((h) => state.squad.includes(h.id));
  const logs = [];
  const stageCfg = getStageCfg_(state.stage);
  if (stageCfg?.isBoss) logs.push(`Boss关：${stageCfg.bossName || "首领单位"} 来袭`);
  const readiness = battleReadiness_();
  if (readiness < 0.98) logs.push(`战备不足：当前战备系数 ${Math.floor(readiness * 100)}%`);
  const myBattleP = calcBattlePowerDisplay_();
  if (totalMarchUnits_() > 0) logs.push(`兵力加成：+${calcMarchPower_()} 战力（出征配置）`);
  let allyHp = Math.floor(myBattleP * 0.95);
  const allyMaxHp = Math.max(1, allyHp);
  const baseEnemyPower = calcEnemyPower();
  let enemyHp = Math.floor(baseEnemyPower * (stageCfg?.enemyHpMult || 1.05));
  const enemyMaxHp = Math.max(1, enemyHp);
  let bossPhase = 1;
  let debuffRounds = 0;
  let debuffApplied = false;
  let round = 1;
  while (round <= 6 && allyHp > 0 && enemyHp > 0) {
    const buffMult = state.battleBuff?.active ? state.battleBuff.mult : 1;
    const debuffMult = debuffRounds > 0 ? 0.82 : 1;
    const atkA = Math.floor(myBattleP * (0.16 + Math.random() * 0.08) * buffMult * debuffMult);
    enemyHp -= atkA;
    logs.push(`R${round} 我方打出 ${atkA}，敌军剩余 ${Math.max(0, enemyHp)}`);
    if (stageCfg?.isBoss && bossPhase === 1 && enemyHp > 0 && enemyHp <= Math.floor(enemyMaxHp * 0.5)) {
      bossPhase = 2;
      logs.push(`PHASE2::${stageCfg.bossName || "Boss"} 狂暴化，攻击提升`);
    }
    if (enemyHp <= 0) break;
    const enemyDown = Math.min(0.72, getTechBonus_("enemyDmgDown") + getLawBonus_("enemyDmgDown"));
    const phaseAtkMult = stageCfg?.isBoss && bossPhase >= 2 ? 1.24 : 1;
    const atkE = Math.floor(baseEnemyPower * (0.15 + Math.random() * 0.09) * (stageCfg?.enemyAtkMult || 1) * phaseAtkMult * (1 - enemyDown));
    allyHp -= atkE;
    logs.push(`R${round} 敌军反击 ${atkE}，我方剩余 ${Math.max(0, allyHp)}`);
    if (stageCfg?.isBoss && bossPhase >= 2 && !debuffApplied) {
      debuffApplied = true;
      debuffRounds = 2;
      logs.push("BOSS_SKILL::极寒威压");
      logs.push("Boss 施放「极寒威压」：我方输出下降 18%（2 回合）");
    } else if (debuffRounds > 0) {
      debuffRounds -= 1;
    }
    round += 1;
  }
  const powerRatio = myBattleP / Math.max(1, baseEnemyPower);
  const win =
    enemyHp <= 0 ||
    (allyHp > enemyHp && round > 6) ||
    (allyHp > 0 && round > 6 && powerRatio >= 1.3);
  let endReason = "";
  if (enemyHp <= 0) endReason = "敌方 HP 归零";
  else if (allyHp <= 0) endReason = "我方 HP 归零";
  else if (round > 6) endReason = `回合上限（6 回合）结算：我方剩余 ${Math.max(0, allyHp)} vs 敌方剩余 ${Math.max(0, enemyHp)}`;
  logs.push(`结算判定：${endReason} → ${win ? "胜利" : "败北"}`);
  const loot = {
    wood: randFromRange_(stageCfg?.loot?.wood, [20, 45]),
    steel: randFromRange_(stageCfg?.loot?.steel, [10, 25]),
    food: randFromRange_(stageCfg?.loot?.food, [18, 40]),
    fuel: randFromRange_(stageCfg?.loot?.fuel, [8, 20]),
  };
  if (!win) {
    loot.wood = 0; loot.steel = 0; loot.food = Math.floor(loot.food * 0.4); loot.fuel = 0;
  }
  if (allies.length === 0) logs.unshift("未配置编队，战力大幅下降。");
  if (state.battleBuff?.active) logs.unshift(`大招增幅生效 x${state.battleBuff.mult.toFixed(2)}`);
  state.battleBuff = { mult: 1, active: false };
  return {
    win,
    logs,
    loot,
    allyMaxHp,
    enemyMaxHp,
    finalAllyHp: Math.max(0, allyHp),
    finalEnemyHp: Math.max(0, enemyHp),
    endReason,
    debuff: debuffApplied ? { atkDownPct: 18, moraleDown: 4 } : null,
  };
}

function simulateWildBattle_(spotId) {
  const pScale = wildSpotPowerScale_(spotId);
  const spotName = wildSpotDef_(spotId).name || "敌对据点";
  const allies = state.heroes.filter((h) => state.squad.includes(h.id));
  const logs = [];
  const dayN = Math.max(1, Number(state.day || 1));
  const dayScale = 1 + Math.min(2.4, (dayN - 1) * 0.038);
  const elite = Math.random() < 0.1;
  logs.push(`野外：${spotName}（第 ${dayN} 天 · 敌方强度 ×${dayScale.toFixed(2)}）`);
  if (elite) logs.push("⚠ 精英野生宝可梦出现！（红环强敌 · 奖励提升）");
  const readiness = battleReadiness_();
  const myBattleP = calcBattlePowerDisplay_();
  if (totalMarchUnits_() > 0) logs.push(`兵力加成：+${calcMarchPower_()} 战力`);
  let allyHp = Math.floor(myBattleP * 0.95);
  const allyMaxHp = Math.max(1, allyHp);
  let baseEnemyPower = Math.max(65, Math.floor(calcEnemyPower() * (0.26 + pScale * 0.055) * dayScale));
  if (elite) baseEnemyPower = Math.floor(baseEnemyPower * 1.42);
  const enemyAtkMult = (0.9 + pScale * 0.018) * (1 + Math.min(1.2, (dayN - 1) * 0.022)) * (elite ? 1.12 : 1);
  let enemyHp = Math.floor(baseEnemyPower * 1.04 * (elite ? 1.38 : 1));
  const enemyMaxHp = Math.max(1, enemyHp);
  let round = 1;
  while (round <= 6 && allyHp > 0 && enemyHp > 0) {
    const buffMult = state.battleBuff?.active ? state.battleBuff.mult : 1;
    const atkA = Math.floor(myBattleP * (0.16 + Math.random() * 0.08) * buffMult);
    enemyHp -= atkA;
    logs.push(`R${round} 我方打出 ${atkA}，敌军剩余 ${Math.max(0, enemyHp)}`);
    if (enemyHp <= 0) break;
    const enemyDown = Math.min(0.72, getTechBonus_("enemyDmgDown") + getLawBonus_("enemyDmgDown"));
    const atkE = Math.floor(baseEnemyPower * (0.14 + Math.random() * 0.08) * enemyAtkMult * (1 - enemyDown));
    allyHp -= atkE;
    logs.push(`R${round} 敌军反击 ${atkE}，我方剩余 ${Math.max(0, allyHp)}`);
    round += 1;
  }
  const powerRatio = myBattleP / Math.max(1, baseEnemyPower);
  const win =
    enemyHp <= 0 ||
    (allyHp > enemyHp && round > 6) ||
    (allyHp > 0 && round > 6 && powerRatio >= 1.3);
  let endReason = "";
  if (enemyHp <= 0) endReason = "敌方 HP 归零";
  else if (allyHp <= 0) endReason = "我方 HP 归零";
  else if (round > 6) endReason = `回合上限（6 回合）结算：我方剩余 ${Math.max(0, allyHp)} vs 敌方剩余 ${Math.max(0, enemyHp)}`;
  logs.push(`结算判定：${endReason} → ${win ? "胜利" : "败北"}`);
  const stageCfg = getStageCfg_(state.stage);
  const mul = (0.32 + pScale * 0.11) * (elite ? 1.48 : 1);
  const loot = {
    wood: Math.floor(randFromRange_(stageCfg?.loot?.wood, [20, 45]) * mul),
    steel: Math.floor(randFromRange_(stageCfg?.loot?.steel, [10, 25]) * mul),
    food: Math.floor(randFromRange_(stageCfg?.loot?.food, [18, 40]) * mul),
    fuel: Math.floor(randFromRange_(stageCfg?.loot?.fuel, [8, 20]) * mul),
  };
  if (!win) {
    loot.wood = 0;
    loot.steel = 0;
    loot.fuel = 0;
    loot.food = Math.floor(loot.food * 0.35);
  }
  if (allies.length === 0) logs.unshift("未配置编队，战力大幅下降。");
  if (state.battleBuff?.active) logs.unshift(`大招增幅生效 x${state.battleBuff.mult.toFixed(2)}`);
  state.battleBuff = { mult: 1, active: false };
  const en = WILD_ENEMY_ROSTER[Math.floor(pScale) % WILD_ENEMY_ROSTER.length];
  const enemyName = elite ? `${en.name}·精英` : en.name;
  return { win, logs, loot, enemyMaxHp, allyMaxHp, wild: true, elite, enemySlug: en.slug, enemyName, myPower: myBattleP, enemyPower: baseEnemyPower, endReason };
}

let wildModalTimers_ = [];

function applyWildBattleResult_(spotId, sim) {
  const key = String(spotId);
  const spotTitle = wildSpotDef_(spotId).name || "";
  const ctx = wildBattleCtx_;
  const gemRetry = !!(ctx && ctx.gemRetry && String(ctx.spotIdx) === key);
  if (!gemRetry && state.wild.cleared[key]) return;
  if (sim?.win) state.missionStats.battleToday = (state.missionStats.battleToday || 0) + 1;
  tickMissions();
  if (gemRetry) {
    sim.logs.forEach((x) => logBattle(x));
    if (sim.win) {
      bumpActivityBattleWin_();
      bumpAllianceHonor_(1);
      state.wild.gemRetry[key] = (state.wild.gemRetry[key] || 0) + 1;
      addRes(sim.loot);
      if (sim.elite && fireCrystalUnlocked_() && Math.random() < 0.34) {
        state.resources.fireCrystal = (state.resources.fireCrystal || 0) + 1;
        logEvent("野外", "精英再战：获得火晶 ×1");
        logBattle("精英掉落：火晶 +1");
      }
      grantHeroExp(5);
      onWildSpotWin_(spotId);
      logEvent("野外", `钻石再战胜利「${spotTitle}」：奖励已发放`);
      logBattle(`野外再战奖励：木${sim.loot.wood}/钢${sim.loot.steel}/粮${sim.loot.food}/燃${sim.loot.fuel}`);
    } else {
      state.morale = Math.max(0, state.morale - 2);
      logBattle("野外再战败北：士气 -2");
    }
    state.heroes.forEach((h) => {
      if (state.squad.includes(h.id)) state.skillCharge[h.id] = clamp((state.skillCharge[h.id] || 0) + 12, 0, 100);
    });
    wildBattleCtx_ = { spotIdx: 0, gemRetry: false };
    save();
    renderAll();
    return;
  }
  sim.logs.forEach((x) => logBattle(x));
  if (sim.win) {
    bumpActivityBattleWin_();
    bumpAllianceHonor_(1);
    addRes(sim.loot);
    if (sim.elite && fireCrystalUnlocked_() && Math.random() < 0.34) {
      state.resources.fireCrystal = (state.resources.fireCrystal || 0) + 1;
      logEvent("野外", "精英胜利：获得火晶 ×1");
      logBattle("精英掉落：火晶 +1");
    }
    if (sim.elite && Math.random() < 0.22) grantRandomSkillBookDrop_();
    grantHeroExp(5);
    state.wild.cleared[key] = true;
    onWildSpotWin_(spotId);
    logEvent("野外", `据点「${spotTitle}」胜利：资源已入帐`);
    logBattle(`野外奖励：木${sim.loot.wood}/钢${sim.loot.steel}/粮${sim.loot.food}/燃${sim.loot.fuel}`);
  } else {
    state.morale = Math.max(0, state.morale - 2);
    logBattle("野外战败：士气 -2");
  }
  state.heroes.forEach((h) => {
    if (state.squad.includes(h.id)) state.skillCharge[h.id] = clamp((state.skillCharge[h.id] || 0) + 12, 0, 100);
  });
  wildBattleCtx_ = { spotIdx: 0, gemRetry: false };
  save();
  renderAll();
}

function renderWildBattleMiniScene_(box, sim) {
  if (!box) return;
  const allies = state.heroes.filter((h) => state.squad.includes(h.id));
  const frontSet = new Set(["草", "水", "格斗"]);
  const front = allies.filter((h) => frontSet.has(h.role));
  const back = allies.filter((h) => !frontSet.has(h.role));
  const toHtml = (arr) =>
    arr
      .map(
        (h) => `
    <div class="sprite-card">
      <img class="sprite" src="${getHeroAvatar(h.id)}" alt="" />
      <div class="muted">${h.name}</div>
    </div>
  `
      )
      .join("");
  const enSlug = sim.enemySlug || "rattata";
  const enName = sim.enemyName || "野生";
  const myP = Math.floor(sim.myPower || 0);
  const enP = Math.floor(sim.enemyPower || 0);
  const ratio = enP > 0 ? myP / enP : 0;
  const advice =
    ratio >= 1.25 ? "优势明显" : ratio >= 0.95 ? "胜算较高" : ratio >= 0.78 ? "势均力敌" : ratio >= 0.6 ? "偏难" : "不建议挑战";
  box.innerHTML = `
    <div class="wild-battle-hintbar">
      <div class="muted">建议：我方战力 <strong>${myP}</strong> / 敌方 <strong>${enP}</strong>（${advice}）</div>
      <div class="muted">敌方 HP：<strong class="wild-en-hp-val">${Math.floor(sim.enemyMaxHp || 0)}</strong> / ${Math.floor(sim.enemyMaxHp || 0)}</div>
      <div class="wild-hpbar"><i class="wild-hpbar-i" style="width:100%"></i></div>
    </div>
    <div class="battle-midline"></div>
    <div class="faction-badge ally">我方</div>
    <div class="faction-badge enemy">${escapeHtml_(enName)}</div>
    <div class="battle-lane-wrap">
      <div class="ally-front">${toHtml(front) || toHtml(allies) || '<div class="muted">无编队</div>'}</div>
      <div class="ally-back">${toHtml(back)}</div>
    </div>
    <div class="enemy-box">
      <div class="enemy-front sprite-card${sim.elite ? " wild-enemy-elite" : ""}">
        <img class="sprite" src="${pkmSpriteUrl_(enSlug)}" alt="" />
        <div class="muted">${escapeHtml_(enName)}</div>
      </div>
    </div>
  `;
}

function animateWildBattleModal_(box, sim, onEnd) {
  const logs = sim.logs || [];
  const phases = logs.filter((x) => /我方打出|敌军反击/.test(x)).slice(0, 8);
  const timers = [];
  let curEnemyHp = Math.max(1, Number(sim.enemyMaxHp || 1));
  const maxEnemyHp = Math.max(1, Number(sim.enemyMaxHp || 1));
  const hpEl = () => box.querySelector(".wild-en-hp-val");
  const hpBar = () => box.querySelector(".wild-hpbar-i");
  phases.forEach((ln, i) => {
    const t = 120 + i * 220;
    timers.push(
      setTimeout(() => {
        const isAlly = ln.includes("我方打出");
        const dmg = Number((ln.match(/(\d+)/g) || []).slice(-2)[0] || 0);
        box.classList.add("hit", "clash", "cam-shake");
        const target = box.querySelector(isAlly ? ".enemy-front .sprite" : ".ally-front .sprite");
        if (target) {
          target.classList.remove("atk-pulse");
          void target.offsetWidth;
          target.classList.add("atk-pulse");
        }
        emitBattleFloat_(`-${dmg}`, "dmg", box);
        if (isAlly) {
          curEnemyHp = Math.max(0, curEnemyHp - dmg);
          const el = hpEl();
          if (el) el.textContent = String(curEnemyHp);
          const bar = hpBar();
          if (bar) bar.style.width = `${Math.max(0, Math.floor((curEnemyHp / maxEnemyHp) * 100))}%`;
        }
        setTimeout(() => box.classList.remove("hit", "clash", "cam-shake"), 140);
      }, t)
    );
  });
  const endAt = 220 + phases.length * 220;
  timers.push(
    setTimeout(() => {
      const win = !!sim.win;
      const res = document.createElement("div");
      res.className = "battle-result";
      res.textContent = win ? "胜利" : "败北";
      box.appendChild(res);
      emitBattleFloat_(win ? "WIN" : "LOSE", win ? "heal" : "dmg", box);
      if (typeof onEnd === "function") onEnd();
    }, endAt)
  );
  return timers;
}

function openWildBattleModal_(spotId, sim) {
  const modal = byId("wild-battle-modal");
  const box = byId("wild-battle-scene");
  const logEl = byId("wild-battle-log");
  const title = byId("wild-battle-title");
  if (!modal || !box) return;
  if (title) title.textContent = `野外：${wildSpotDef_(spotId).name || ""}`;
  renderWildBattleMiniScene_(box, sim);
  if (logEl) logEl.textContent = (sim.logs || []).join("\n");
  modal.classList.remove("hidden");
  wildModalTimers_.forEach(clearTimeout);
  wildModalTimers_ = [];
  let applied = false;
  const finish = () => {
    if (applied) return;
    applied = true;
    wildModalTimers_.forEach(clearTimeout);
    wildModalTimers_ = [];
    applyWildBattleResult_(spotId, sim);
    modal.classList.add("hidden");
  };
  const skip = byId("wild-battle-skip");
  const close = byId("wild-battle-close");
  const runSkip = () => {
    wildModalTimers_.forEach(clearTimeout);
    wildModalTimers_ = [];
    const win = !!sim.win;
    const res = document.createElement("div");
    res.className = "battle-result";
    res.textContent = win ? "胜利（跳过）" : "败北（跳过）";
    box.appendChild(res);
    finish();
  };
  if (skip) skip.onclick = runSkip;
  if (close) close.onclick = runSkip;
  wildModalTimers_ = animateWildBattleModal_(box, sim, finish);
}

function doWildGemRetry_(spotId) {
  syncWildCalendar_();
  syncWildDay_();
  const key = String(spotId);
  if (!state.wild.cleared[key]) {
    alert("请先通关此据点，再使用钻石再战。");
    return;
  }
  if (!state.squad.length) {
    alert("请先在「探险 → 编队」配置英雄。");
    return;
  }
  const cost = wildGemRetryCost_(spotId);
  if ((state.items.gems || 0) < cost) {
    alert(`钻石不足：本次再战需 ${cost} 💎（首次 2 💎 起，每胜一次翻倍；每日重置）`);
    return;
  }
  const n = Number(state.wild.gemRetry[key] || 0);
  const nm = wildSpotDef_(spotId).name || "";
  if (!confirm(`花费 ${cost} 💎 再次挑战「${nm}」？\n今日该据点已成功再战 ${n} 次（仅胜利后计入）。`)) return;
  state.items.gems -= cost;
  logEvent("野外", `已支付 ${cost} 💎 野外再战（${nm}）`);
  wildBattleCtx_ = { spotIdx: spotId, gemRetry: true };
  save();
  renderCity();
  const sim = simulateWildBattle_(spotId);
  openWildBattleModal_(spotId, sim);
}

function doWildBattle_(spotId) {
  syncWildDay_();
  const key = String(spotId);
  if (state.wild.cleared[key]) {
    doWildGemRetry_(spotId);
    return;
  }
  if (!state.squad.length) {
    alert("请先在「探险 → 编队」配置英雄。");
    return;
  }
  wildBattleCtx_ = { spotIdx: spotId, gemRetry: false };
  const sim = simulateWildBattle_(spotId);
  openWildBattleModal_(spotId, sim);
}

function claimShopDaily_() {
  syncShopCalendar_();
  const iso = isoDateLocal_();
  if (state.shop.dailyISO === iso) {
    alert("今日已领取过每日特惠。");
    return;
  }
  state.shop.dailyISO = iso;
  addRes({ wood: 95, steel: 48, food: 72, fuel: 32 });
  state.items.speedup = (state.items.speedup || 0) + 1;
  logEvent("商店", "已领取每日特惠");
  save();
  renderAll();
}

function resourcePackGemCostAtBuys_(buysSoFar) {
  return 2 + Math.floor(buysSoFar / 3) * 2;
}

function sumResourcePackGems_(startBuys, times) {
  let s = 0;
  for (let i = 0; i < times; i += 1) s += resourcePackGemCostAtBuys_(startBuys + i);
  return s;
}

function buyShopResourcePack_() {
  syncShopCalendar_();
  const raw = parseInt(String(byId("shop-resource-batch")?.value || "1"), 10);
  const batch = clamp(Number.isFinite(raw) && raw > 0 ? raw : 1, 1, 500);
  const start = state.shop.resourceBuys || 0;
  const totalGem = sumResourcePackGems_(start, batch);
  if ((state.items.gems || 0) < totalGem) {
    alert(`钻石不足：批量 ${batch} 次共需 ${totalGem} 💎（下次单次 ${resourcePackGemCostAtBuys_(start)} 💎 起）`);
    return;
  }
  state.items.gems -= totalGem;
  for (let i = 0; i < batch; i += 1) {
    state.shop.resourceBuys = (state.shop.resourceBuys || 0) + 1;
    addRes({ wood: 130, steel: 85, food: 110, fuel: 45 });
  }
  logEvent("商店", `已兑换资源补给 ×${batch}（今日累计 ${state.shop.resourceBuys} 次，-${totalGem} 💎）`);
  save();
  renderAll();
}

function buyShopSpeedTickets_() {
  const raw = parseInt(String(byId("shop-speed-batch")?.value || "1"), 10);
  const n = clamp(Number.isFinite(raw) && raw > 0 ? raw : 1, 1, 999);
  const per = 3;
  const cost = n * per;
  if ((state.items.gems || 0) < cost) return alert(`钻石不足（购买 ${n} 张需 ${cost} 💎，每张 ${per} 💎）`);
  state.items.gems -= cost;
  state.items.speedup = (state.items.speedup || 0) + n;
  logEvent("商店", `已购买加速券 ×${n}（-${cost} 💎）`);
  save();
  renderAll();
}

function shopRecruitHero_() {
  if ((state.items.gems || 0) < RECRUIT_GEM_COST) return alert(`钻石不足（需要 ${RECRUIT_GEM_COST} 💎）`);
  const pool = recruitPoolIds_();
  if (!pool.length) return alert("招募池资料缺失（请确认已载入 pokedex-data.js）。");
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const def = heroDefById_(pick);
  if (!def) return alert("招募资料缺失，请检查玩法配置。");
  state.items.gems -= RECRUIT_GEM_COST;
  const r = grantRecruitOrStone_(pick);
  if (!r.ok) return alert("招募处理失败。");
  if (r.duplicate) {
    logEvent("商店", `征募寻访：重复「${r.def.name}」→ ${r.stone.icon} ${r.stone.name}×1（-${RECRUIT_GEM_COST} 💎）`);
    alert(`寻访到「${r.def.name}」，已拥有同名伙伴，转化为 ${r.stone.icon} ${r.stone.name}×1（已放入背包）。`);
  } else {
    logEvent("商店", `征募寻访：获得初阶「${r.def.name}」（-${RECRUIT_GEM_COST} 💎）`);
    alert(`征募成功：${r.def.name} 已加入城镇（仅初始形态；进化需等级、素材与对应属性进化石）。`);
  }
  save();
  renderAll();
}

function shopRecruitTen_() {
  if ((state.items.gems || 0) < RECRUIT_TEN_GEM_COST) return alert(`钻石不足（需要 ${RECRUIT_TEN_GEM_COST} 💎）`);
  const pool = recruitPoolIds_();
  if (!pool.length) return alert("招募池资料缺失（请确认已载入 pokedex-data.js）。");
  state.items.gems -= RECRUIT_TEN_GEM_COST;
  const lines = [];
  let newHero = 0;
  let dup = 0;
  for (let i = 0; i < 11; i += 1) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const r = grantRecruitOrStone_(pick);
    if (!r.ok) continue;
    if (r.duplicate) {
      dup += 1;
      lines.push(`${i + 1}. ${r.def.name} → ${r.stone.name}`);
    } else {
      newHero += 1;
      lines.push(`${i + 1}. ${r.def.name} 入队`);
    }
  }
  logEvent("商店", `征募十连（10+1）：新伙伴 ${newHero} 名，重复转石 ${dup} 次（-${RECRUIT_TEN_GEM_COST} 💎）`);
  alert(`十连寻访完成（共 11 次）\n新伙伴：${newHero} 名 · 重复转进化石：${dup} 次\n\n${lines.join("\n")}`);
  save();
  renderAll();
}

function renderShopOffers_() {
  syncShopCalendar_();
  const iso = isoDateLocal_();
  const dailyDone = state.shop.dailyISO === iso;
  const nextCost = resourcePackGemCostAtBuys_(state.shop.resourceBuys || 0);
  const dd = byId("shop-daily-desc");
  const rd = byId("shop-resource-desc");
  const bd = byId("btn-shop-daily");
  const br = byId("btn-shop-resource");
  const sh = byId("shop-speed-cost-hint");
  const rc = byId("shop-recruit-desc");
  const btnR = byId("btn-shop-recruit");
  if (dd) dd.textContent = dailyDone ? "今日已领取（明日再来）" : "每日限领 1 次：木材、钢材、粮食、燃料与加速×1";
  if (rd) {
    rd.textContent = `今日已兑换 ${state.shop.resourceBuys || 0} 次；下次单次 ${nextCost} 💎（每 3 次加价，次日重置）`;
  }
  if (bd) {
    bd.disabled = !!dailyDone;
    bd.textContent = dailyDone ? "已领取" : "领取";
  }
  if (br) {
    const raw = parseInt(String(byId("shop-resource-batch")?.value || "1"), 10);
    const batch = clamp(Number.isFinite(raw) && raw > 0 ? raw : 1, 1, 500);
    const total = sumResourcePackGems_(state.shop.resourceBuys || 0, batch);
    const okGems = (state.items.gems || 0) >= total;
    br.disabled = !okGems;
    br.textContent = `兑换（批量 ${batch} 次 · 共 ${total} 💎）`;
  }
  if (sh) {
    const raw = parseInt(String(byId("shop-speed-batch")?.value || "1"), 10);
    const n = clamp(Number.isFinite(raw) && raw > 0 ? raw : 1, 1, 999);
    sh.textContent = `单价 3 💎／张 · 小计 ${n * 3} 💎`;
  }
  const poolN = recruitPoolIds_().length;
  const gems = state.items.gems || 0;
  if (rc) {
    rc.textContent = `消耗 ${RECRUIT_GEM_COST} 💎 随机获得 1 名初阶伙伴（池 ${poolN} 种，可重复；重复转化为对应属性进化石）。十连 ${RECRUIT_TEN_GEM_COST} 💎 共 11 次寻访。`;
  }
  if (btnR) {
    btnR.disabled = poolN <= 0 || gems < RECRUIT_GEM_COST;
    btnR.textContent = poolN <= 0 ? "招募池未就绪" : `征募寻访（${RECRUIT_GEM_COST} 💎）`;
  }
  const btn10 = byId("btn-shop-recruit-ten");
  if (btn10) {
    btn10.disabled = poolN <= 0 || gems < RECRUIT_TEN_GEM_COST;
    btn10.textContent = poolN <= 0 ? "招募池未就绪" : `征募十连 10+1（${RECRUIT_TEN_GEM_COST} 💎）`;
  }
}

function renderWildMap_() {
  const root = byId("wild-map-root");
  if (!root) return;
  syncWildDay_();
  root.innerHTML = "";
  const w = state.wild;
  const bg = assets?.cutscene?.bgs?.[2] || assets?.cutscene?.bgs?.[0] || "";
  if (bg) {
    root.style.backgroundImage = `linear-gradient(180deg, rgba(2,8,24,.5), rgba(15,23,42,.75)), url("${bg}")`;
    root.style.backgroundSize = "cover";
    root.style.backgroundPosition = "center";
  } else {
    root.style.backgroundImage = "";
  }
  syncWildCalendar_();
  if (w.bonusUnlocked) {
    root.classList.add("wild-map-has-zones");
    const tabs = document.createElement("div");
    tabs.className = "wild-map-zones";
    const mkTab = (label, z) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "wild-zone-tab" + (z === Number(w.viewZone) ? " wild-zone-tab-active" : "");
      b.textContent = label;
      b.onclick = () => {
        w.viewZone = z;
        save();
        renderWildMap_();
      };
      tabs.appendChild(b);
    };
    mkTab("本境", 0);
    for (let z = 1; z <= 10; z++) mkTab("外延 " + z, z);
    root.appendChild(tabs);
  } else {
    root.classList.remove("wild-map-has-zones");
  }
  const hud = document.createElement("div");
  hud.className = "wild-map-hud muted";
  const vz = Number(w.viewZone) || 0;
  const zoneHint = w.bonusUnlocked ? ` · 当前：${vz === 0 ? "本境" : "外延 " + vz}` : "";
  hud.innerHTML = `第 ${state.day} 日 · 每据点每日首次通关免费 · 再战 2 💎 起翻倍（每日重置）${zoneHint}`;
  root.appendChild(hud);
  const list = getWildSpotsForView_();
  list.forEach((sp) => {
    const done = !!state.wild.cleared[String(sp.id)];
    const nextRetry = wildGemRetryCost_(sp.id);
    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = "wild-spot" + (done ? " wild-spot-done" : "");
    pin.style.left = `${sp.x}%`;
    pin.style.top = `${sp.y}%`;
    pin.innerHTML = `<span class="wild-spot-ico" aria-hidden="true">👾</span><span class="wild-spot-name">${sp.name}</span>${
      done
        ? `<span class="wild-spot-tag">已通关</span><span class="wild-spot-retry muted">${nextRetry}💎再战</span>`
        : ""
    }`;
    pin.title = done ? `已通关 · 点击花 ${nextRetry} 💎 再战（每日重置计价）` : "点击免费挑战";
    pin.onclick = () => doWildBattle_(sp.id);
    root.appendChild(pin);
  });
}

function runBuildingProduction() {
  for (const b of BUILDING_DEFS) {
    const lv = state.buildings[b.id] || 0;
    if (lv <= 0) continue;
    const rate = 1 + (lv - 1) * 0.24;
    if (b.gain) {
      for (const [k, v] of Object.entries(b.gain)) {
        state.resources[k] += Math.floor(v * rate);
      }
    }
  }
}

function rollRandomEvent() {
  const r = Math.random();
  if (r < 0.22) {
    const got = rand(25, 60);
    state.resources.food += got;
    logEvent("狩猎队", `带回粮食 ${got}`);
  } else if (r < 0.35) {
    const lost = rand(8, 18);
    spend("fuel", lost);
    logEvent("暴风雪", `燃料损失 ${lost}`);
  } else if (r < 0.42) {
    state.pop += 1;
    logEvent("流民", "新增 1 位居民");
  } else if (r < 0.5 && storyPack.events.length) {
    const msg = storyPack.events[rand(0, storyPack.events.length - 1)];
    logEvent("世界", msg);
  }
}

function missionSpecialGateOpen_(m) {
  const u = m.unlockIf;
  if (!u || u.type !== "dayOrWild") return true;
  const dayOk = state.day >= (u.minDay || 1);
  if (u.mode === "either") {
    const sid = u.spotId != null ? String(u.spotId) : "";
    const wildOk = sid && !!state.wild?.cleared?.[sid];
    return dayOk || wildOk;
  }
  return dayOk;
}

function syncSpecialMissionUnlocks_() {
  (state.missions || []).forEach((m) => {
    if (m.category !== "special" || m.done) return;
    if (missionSpecialGateOpen_(m)) m.unlocked = true;
  });
}

function tickMissions(source = "general") {
  syncSpecialMissionUnlocks_();
  state.missions.forEach((m) => {
    if (!m.unlocked || m.done) return;
    // 限时活动：首次解锁时写入到期日；逾期则自动推进到下一条，保证活动不断档。
    if (m.category === "event") {
      const span = Number(m.expirySpanDays || 0);
      if (span > 0 && (!Number.isFinite(m.expiryDay) || m.expiryDay <= 0)) {
        m.expiryDay = (state.day || 1) + span - 1;
      }
      if (Number.isFinite(m.expiryDay) && m.expiryDay > 0 && (state.day || 1) > m.expiryDay && !m.done) {
        m.unlocked = false;
        m.ready = false;
        m.claimed = true;
        logEvent("活动", `限时活动已逾期：${m.text}`);
        if (m.next && m.nextOnClaim) {
          const nx = state.missions.find((x) => x.id === m.next);
          if (nx) {
            nx.unlocked = true;
            logEvent("活动", `新的限时活动已开启：${nx.text}`);
          }
        }
        return;
      }
    }
    if (isMissionDoneNow_(m, source)) completeMission(m);
  });
}

function missionProgressHint_(m) {
  const c = m?.cond || {};
  switch (c.type) {
    case "gatherClaimTotal": {
      const cur = state.missionStats?.gatherClaimLifetime || 0;
      const need = Number(c.count || 1);
      return `进度：${cur}/${need} 次采集领取`;
    }
    case "heroLevelAny": {
      const lv = Math.max(0, ...state.heroes.map((h) => Number(h.level) || 1));
      return `最高英雄等级：${lv}（目标 ${Number(c.level || 1)}）`;
    }
    case "resourceAtLeast":
      return `目前 ${c.res}：${state.resources[c.res] || 0}（目标 ${Number(c.amount || 0)}）`;
    case "popAtLeast":
      return `人口：${state.pop || 0}（目标 ${Number(c.pop || 0)}）`;
    case "techCountAtLeast":
      return `已完成科技：${Object.values(state.techs || {}).filter((x) => Number(x) > 0).length}（目标 ${Number(c.count || 1)}）`;
    case "wildSpotWon":
      return state.wild?.cleared?.[String(c.spotId)] ? "已达成据点胜利" : "尚未在该据点取胜";
    default:
      return "";
  }
}

function isMissionDoneNow_(m, source = "general") {
  const c = m.cond || {};
  if (m.expiryDay && state.day > Number(m.expiryDay)) return false;
  switch (c.type) {
    case "buildingLv":
      return (state.buildings[c.id] || 1) >= Number(c.lv || 1);
    case "stageAtLeast":
      return state.stage >= Number(c.stage || 1);
    case "techDone":
      return (state.techs[c.id] || 0) > 0;
    case "techCountAtLeast":
      return Object.values(state.techs || {}).filter((x) => Number(x) > 0).length >= Number(c.count || 1);
    case "moraleStreak": {
      const needMorale = Number(c.morale || 90);
      const needDays = Number(c.days || 3);
      if (source !== "day") return false;
      m.streak = state.morale >= needMorale ? (m.streak || 0) + 1 : 0;
      return m.streak >= needDays;
    }
    case "battleCountToday":
      return (state.missionStats?.battleToday || 0) >= Number(c.count || 1);
    case "gatherClaimToday":
      return (state.missionStats?.gatherClaimToday || 0) >= Number(c.count || 1);
    case "gatherClaimTotal":
      return (state.missionStats?.gatherClaimLifetime || 0) >= Number(c.count || 1);
    case "heroLevelAny":
      return state.heroes.some((h) => (Number(h.level) || 1) >= Number(c.level || 1));
    case "resourceAtLeast":
      return (state.resources[c.res] || 0) >= Number(c.amount || 0);
    case "popAtLeast":
      return (state.pop || 0) >= Number(c.pop || 0);
    case "wildSpotWon":
      return !!state.wild?.cleared?.[String(c.spotId)];
    default:
      return false;
  }
}

function completeMission(m) {
  m.done = true;
  m.ready = true;
  m.claimed = false;
  if (m.next && !m.nextOnClaim) {
    const nx = state.missions.find((x) => x.id === m.next);
    if (nx) {
      nx.unlocked = true;
      logEvent("任务", `主线／支线推进：已解锁「${nx.text}」`);
    }
  }
  logEvent("任务", `完成「${m.text}」待领取`);
}

function calcMarchPower_() {
  const m = state.march || {};
  const a = clamp(Number(m.shield) || 0, 0, 1e9);
  const b = clamp(Number(m.spear) || 0, 0, 1e9);
  const c = clamp(Number(m.bow) || 0, 0, 1e9);
  return Math.floor((a + b + c) * 0.14);
}

function maxMarchUnits_() {
  return 80 + (state.buildings.camp || 1) * 220;
}

function totalMarchUnits_() {
  const m = state.march || {};
  return (Number(m.shield) || 0) + (Number(m.spear) || 0) + (Number(m.bow) || 0);
}

function calcMyPower() {
  const campLv = state.buildings.camp || 1;
  const troopBase = 55 + campLv * 12 + state.pop * 1.2;
  const boost = 1 + (campLv - 1) * 0.06;
  const passive = getPassiveTotals_();
  const allyLv = allianceLevelBonus_();
  const techMult = 1 + getTechBonus_("battleDmg") + getLawBonus_("battleDmg") + passive.teamDmgPct + allyLv.battleDmgPct;
  const heroPower = state.heroes
    .filter((h) => state.squad.includes(h.id))
    .reduce((sum, h) => {
      const atk = (Number(h.atk) + Number(h.bonusAtk || 0)) * (1 + passive.atkPct);
      const hp = (Number(h.hp) + Number(h.bonusHp || 0)) * (1 + passive.hpPct);
      const lv = Number(h.level || 1);
      const st = Number(h.stars || 1);
      return sum + atk * 0.52 + hp * 0.17 + lv * 4 + st * 6 + Math.max(0, lv - 1) * 2.2 + Math.max(0, st - 1) * 3;
    }, 0);
  const allyBattle = 1 + Math.min(0.12, (state.alliance?.perks?.battle || 0) * 0.015);
  return Math.floor((troopBase * boost + heroPower) * techMult * allyBattle);
}

function calcBattlePowerRaw_() {
  return calcMyPower() + calcMarchPower_();
}

function calcBattlePowerDisplay_() {
  return Math.max(1, Math.floor(calcBattlePowerRaw_() * battleReadiness_()));
}

function calcEnemyPower() {
  const cfg = getStageCfg_(state.stage);
  if (cfg && Number.isFinite(cfg.enemyPower)) return Math.floor(cfg.enemyPower);
  return Math.floor(140 + state.stage * 58 + Math.pow(state.stage, 1.2) * 9);
}

function grantHeroExp(points) {
  state.heroes.forEach((h) => {
    if (!state.squad.includes(h.id)) return;
    const cap = heroLevelCap_();
    if (h.level >= cap) return;
    h.exp = Number(h.exp || 0) + Number(points || 0);
    let need = heroExpNeed_(h.level);
    while (h.exp >= need && h.level < cap) {
      h.exp -= need;
      h.level += 1;
      need = heroExpNeed_(h.level);
    }
    h.level = clamp(h.level, 1, cap);
    if (h.level >= cap) h.exp = 0;
  });
  tickMissions();
}

function heroExpNeed_(level) {
  const lv = clamp(Number(level || 1), 1, 60);
  return 24 + lv * 11;
}

function heroLevelCap_() {
  const dayCap = 1 + Math.floor((state.day || 1) * 1.8);
  const heaterCap = 2 + (state.buildings.heater || 1) * 4;
  const campCap = 2 + (state.buildings.camp || 1) * 4;
  return clamp(Math.min(dayCap, heaterCap, campCap), 1, 60);
}

function stageGateReq_(stage) {
  const st = Number(stage || 1);
  // 仅在“剧情关卡节点”启用硬门槛；普通节点不再卡 Day/建筑。
  if (st % 5 !== 0) return null;
  const reqDay = Math.max(1, st + 1);
  const reqHeater = Math.max(1, Math.ceil((st + 1) / 2));
  const reqCamp = Math.max(1, 1 + Math.floor(st / 3));
  const reqLumber = Math.max(1, Math.ceil(st / 2));
  const pass = (state.day || 1) >= reqDay
    && (state.buildings.heater || 1) >= reqHeater
    && (state.buildings.camp || 1) >= reqCamp
    && (state.buildings.lumber || 1) >= reqLumber;
  return pass ? null : { day: reqDay, heaterLv: reqHeater, campLv: reqCamp, lumberLv: reqLumber };
}

function battleReadiness_() {
  const st = Number(state.stage || 1);
  const dayNeed = Math.max(1, st + 1);
  const heaterNeed = Math.max(1, Math.ceil((st + 1) / 2));
  const campNeed = Math.max(1, 1 + Math.floor(st / 3));
  const avgLv = (state.heroes || [])
    .filter((h) => state.squad.includes(h.id))
    .reduce((s, h, _, arr) => s + (h.level || 1) / Math.max(1, arr.length), 0);
  const lvNeed = Math.max(1, 1 + Math.floor(st * 1.2));
  const parts = [
    clamp((state.day || 1) / dayNeed, 0.55, 1),
    clamp((state.buildings.heater || 1) / heaterNeed, 0.55, 1),
    clamp((state.buildings.camp || 1) / campNeed, 0.55, 1),
    clamp((avgLv || 1) / lvNeed, 0.55, 1),
  ];
  return clamp(parts.reduce((a, b) => a * b, 1), 0.25, 1);
}

function totalColdReduce() {
  const heaterLv = state.buildings.heater || 0;
  return heaterLv * 2;
}

function buildingCost(def, lv) {
  const scale = 1 + lv * 0.55;
  const out = {};
  for (const [k, v] of Object.entries(def.baseCost || {})) out[k] = Math.floor(v * scale);
  return out;
}

function getUpgradeDiagnosis_(id) {
  sanitizeBuildQueue_();
  const def = BUILDING_DEFS.find((x) => x.id === id);
  if (!def) return { ok: false, reason: "invalid", messages: ["建筑定义不存在。"], cost: {}, lv: 1 };
  const lv = state.buildings[id] || 1;
  const cost = buildingCost(def, lv);
  const queueHit = state.buildQueue.some((q) => q.id === id);
  const overCap = state.buildQueue.length >= 8;
  const prereqOk = canUpgradeBuilding_(id);
  const afford = canAfford(cost);
  const missing = [];
  Object.entries(cost).forEach(([k, v]) => {
    const cur = Number(state.resources?.[k] || 0);
    if (cur < v) missing.push(`${k} 缺 ${v - cur}`);
  });
  const messages = [
    `${prereqOk ? "✅" : "❌"} 前置条件：${getBuildPrereqText_(id)}`,
    `${afford ? "✅" : "❌"} 资源：${fmtRes(cost)}${missing.length ? `（${missing.join(" / ")}）` : ""}`,
    `${queueHit ? "❌" : "✅"} 队列：${queueHit ? "该建筑已在施工队列中" : "可加入队列"}`,
    `${overCap ? "❌" : "✅"} 队列上限：${state.buildQueue.length}/8`,
  ];
  const ok = prereqOk && afford && !queueHit && !overCap;
  let reason = "ok";
  if (!prereqOk) reason = "prereq";
  else if (!afford) reason = "resource";
  else if (queueHit) reason = "queue";
  else if (overCap) reason = "cap";
  return { ok, reason, messages, cost, lv };
}

function upgradeReasonText_(reason) {
  if (reason === "prereq") return "前置条件不足";
  if (reason === "resource") return "资源不足";
  if (reason === "queue") return "施工队列冲突";
  if (reason === "cap") return "队列已满";
  return "无法升级";
}

function getBuildPrereqText_(id) {
  const reqs = BUILDING_PREREQ[id] || [];
  if (!reqs.length) return "无前置";
  return reqs
    .map((r) => {
      const n = BUILDING_DEFS.find((b) => b.id === r.id)?.name || r.id;
      return `${n} Lv${r.lv}`;
    })
    .join(" / ");
}

function canUpgradeBuilding_(id) {
  const reqs = BUILDING_PREREQ[id] || [];
  for (const r of reqs) {
    if ((state.buildings[r.id] || 1) < r.lv) return false;
  }
  return true;
}

function getTechBonus_(key) {
  return TECH_DEFS.reduce((sum, t) => {
    const lv = Math.max(0, Number(state.techs?.[t.id] || 0));
    if (lv <= 0) return sum;
    const perLv = Number(t.effect?.[key] || 0);
    return sum + perLv * lv;
  }, 0);
}

function getLawBonus_(key) {
  return LAW_DEFS.reduce((sum, l) => sum + ((state.laws?.[l.id] || 0) > 0 ? (l.effect?.[key] || 0) : 0), 0);
}

function techMaxLv_(t) {
  // 越后段（treeRow 越大）可升越高，且支持每条科技自订 maxLv。
  if (Number.isFinite(Number(t.maxLv)) && Number(t.maxLv) > 0) return Math.floor(Number(t.maxLv));
  const r = Math.max(0, Number(t.treeRow) || 0);
  // 0..2 -> 3, 3..5 -> 6, 6..8 -> 9（上限 12）
  return Math.min(12, 3 + Math.floor(r / 3) * 3);
}

function techCostForLv_(t, nextLv) {
  const base = t.cost || {};
  const lv = Math.max(1, Number(nextLv) || 1);
  const mult = 1 + (lv - 1) * 0.65;
  const out = {};
  for (const [k, v] of Object.entries(base)) out[k] = Math.max(0, Math.floor(Number(v || 0) * mult));
  return out;
}

function isTechUnlocked_(t, targetLv = 1) {
  const req = t.reqTech || [];
  const reqB = t.reqBuilding || [];
  const needLv = Math.max(1, Number(targetLv) || 1);
  const reqLv = Math.max(1, Math.min(needLv - 1, 8)); // 升得越高越吃前置等级（上限 8）
  const getLv = (id) => Math.max(0, Number(state.techs?.[id] || 0));
  const techOk =
    !req.length ||
    (t.reqTechMode === "any" ? req.some((id) => getLv(id) >= reqLv) : req.every((id) => getLv(id) >= reqLv));
  return techOk && techBuildingStarsOk_(t) && reqB.every((r) => (state.buildings[r.id] || 1) >= Number(r.lv || 1));
}

function researchTech(id) {
  const t = TECH_DEFS.find((x) => x.id === id);
  if (!t) return;
  const cur = Math.max(0, Number(state.techs?.[id] || 0));
  const mx = techMaxLv_(t);
  if (cur >= mx) return alert("该科技已满级");
  const nextLv = cur + 1;
  if (!isTechUnlocked_(t, nextLv)) return alert("前置条件未完成（科技等级、建筑等级或建筑星等不足）");
  const cost = techCostForLv_(t, nextLv);
  if (!canAfford(cost)) return alert("资源不足");
  pay(cost);
  state.techs[id] = nextLv;
  bumpActivityTechDone_();
  logEvent("科技", `科技升级「${t.name}」→ Lv${state.techs[id]}/${mx}`);
  tickMissions();
  save();
  renderAll();
}

function upgradeTechBulk_(id) {
  const t = TECH_DEFS.find((x) => x.id === id);
  if (!t) return;
  let cur = Math.max(0, Number(state.techs?.[id] || 0));
  const mx = techMaxLv_(t);
  if (cur >= mx) return alert("该科技已满级");
  let n = 0;
  let spent = { wood: 0, steel: 0, food: 0, fuel: 0 };
  while (n < 999) {
    cur = Math.max(0, Number(state.techs?.[id] || 0));
    if (cur >= mx) break;
    const nextLv = cur + 1;
    if (!isTechUnlocked_(t, nextLv)) break;
    const cost = techCostForLv_(t, nextLv);
    if (!canAfford(cost)) break;
    pay(cost);
    for (const k of Object.keys(spent)) spent[k] += Number(cost[k] || 0);
    state.techs[id] = nextLv;
    bumpActivityTechDone_();
    n += 1;
  }
  if (n <= 0) return alert("当前无法连升（资源不足或前置条件未满足）");
  logEvent("科技", `连升「${t.name}」×${n} → Lv${state.techs[id]}/${mx}`);
  tickMissions();
  save();
  renderAll();
  alert(`已连升 ${n} 次：${t.name} → Lv${state.techs[id]}/${mx}\n消耗：${fmtRes(spent)}`);
}

function upgradeAllAvailableTechs_() {
  let upgraded = 0;
  for (let guard = 0; guard < 30; guard += 1) {
    let changed = false;
    for (const t of TECH_DEFS) {
      const cur = Math.max(0, Number(state.techs?.[t.id] || 0));
      const mx = techMaxLv_(t);
      if (cur >= mx) continue;
      const nextLv = cur + 1;
      if (!isTechUnlocked_(t, nextLv)) continue;
      const cost = techCostForLv_(t, nextLv);
      if (!canAfford(cost)) continue;
      pay(cost);
      state.techs[t.id] = nextLv;
      bumpActivityTechDone_();
      upgraded += 1;
      changed = true;
    }
    if (!changed) break;
  }
  if (upgraded <= 0) return alert("当前没有任何可自动升级的科技（资源不足或前置未满足）");
  logEvent("科技", `一键连升：已升级 ${upgraded} 次（遍历所有科技）`);
  tickMissions();
  save();
  renderAll();
  alert(`一键连升完成：共升级 ${upgraded} 次（全部可升级科技已升到卡住）`);
}

function upgradeBuilding(id) {
  const diag = getUpgradeDiagnosis_(id);
  if (!diag.ok) return { ok: false, reason: diag.reason, diagnosis: diag };
  const def = BUILDING_DEFS.find((x) => x.id === id);
  const lv = diag.lv;
  pay(diag.cost);
  const sec = buildDurationSec_(id, lv);
  state.buildQueue.push({ id, fromLv: lv, startAt: 0, endAt: 0, sec, status: "pending" });
  assignBuildSlots_();
  bumpActivityBuildOrdered_();
  logEvent("建筑", `${def.name} 已加入施工队列（${sec}s）`);
  tickMissions();
  save();
  renderAll();
  return { ok: true };
}

function toggleSquad(heroId) {
  const idx = state.squad.indexOf(heroId);
  if (idx >= 0) {
    state.squad.splice(idx, 1);
  } else {
    if (state.squad.length >= maxSquadSize_()) return alert(`最多 ${maxSquadSize_()} 名英雄`);
    state.squad.push(heroId);
  }
  save();
  renderHeroes();
  renderBattle();
}

function heroCombatScore_(h) {
  const atk = Number(h.atk || 0) + Number(h.bonusAtk || 0);
  const hp = Number(h.hp || 0) + Number(h.bonusHp || 0);
  const lv = Number(h.level || 1);
  const st = Number(h.stars || 1);
  return atk * 1.25 + hp * 0.42 + lv * 18 + st * 30;
}

function recommendSquad_() {
  const top = [...(state.heroes || [])]
    .sort((a, b) => heroCombatScore_(b) - heroCombatScore_(a))
    .slice(0, 3)
    .map((h) => h.id);
  if (!top.length) return;
  state.squad = top;
  save();
  renderHeroes();
  renderBattle();
}

function renderActionHub_() {
  const list = byId("slg-action-rail-list");
  const badge = byId("slg-action-rail-badge");
  if (!list) return;
  tickTownAcc_();
  syncWildDay_();
  normalizeActivity_();
  ensureActivityMinigames_();
  const items = [];
  const push = (label, btnText, tab, citySub, battleSub, anchor) => {
    items.push({ label, btnText, tab, citySub, battleSub, anchor: anchor || null });
  };
  if (!state.buildQueue.length) {
    const canUp = BUILDING_DEFS.some((b) => getUpgradeDiagnosis_(b.id).ok);
    if (canUp) push("建筑：施工队列为空，可安排升级", "去建筑", "city", "build", "");
  }
  const techAvail = TECH_DEFS.find((t) => {
    const cur = Math.max(0, Number(state.techs?.[t.id] || 0));
    const mx = techMaxLv_(t);
    if (cur >= mx) return false;
    if (!isTechUnlocked_(t, cur + 1)) return false;
    const cost = techCostForLv_(t, cur + 1);
    return canAfford(cost);
  });
  if (techAvail) {
    push(`科技：可升级「${techAvail.name}」`, "去科技", "city", "tech", "", { type: "tech", id: techAvail.id });
  }
  const lawAvail = LAW_DEFS.find(
    (l) =>
      !(state.laws[l.id] > 0) &&
      (state.buildings?.[l.reqBuilding.id] || 1) >= Number(l.reqBuilding.lv || 1) &&
      (state.policyPoints || 0) >= Number(l.cost || 0)
  );
  if (lawAvail) push(`法典：可颁布「${lawAvail.name}」`, "去法典", "city", "law", "", { type: "law", id: lawAvail.id });
  const codexAvail = CODEX_DEFS.find((c) => {
    const cur = codexLv_(c.id);
    const mx = codexMaxLv_(c);
    if (cur >= mx) return false;
    const nextLv = cur + 1;
    const cost = codexCostPts_(c, nextLv);
    return codexPrereqOk_(c, nextLv) && (state.policyPoints || 0) >= cost;
  });
  if (codexAvail) push(`法典：可升级「${codexAvail.name}」`, "去法典", "city", "law", "", { type: "codex", id: codexAvail.id });
  const act = state.activity || {};
  const today = isoDateLocal_();
  if (act.checkInDate !== today) {
    push("活动：今日可签到领取代币", "去活动", "city", "hub", "", { type: "activity", id: "checkin" });
  }
  const mg = state.activityMinigames || {};
  if (mg.spinDay !== today && (state.day || 1) >= 3 && (state.buildings?.heater || 1) >= 2) {
    push("活动：幸运轮盘可转一次", "去活动", "city", "hub", "", { type: "activity", id: "minigame" });
  }
  if ((state.gatherInbox || []).length) {
    push("采集：有返回物资待领取", "去采集", "city", "gather", "");
  } else if (canDispatchAnyGather_()) {
    push("采集：有空闲采集点可派遣", "去采集", "city", "gather", "");
  }
  const tp = state.townPass || {};
  if (["wood", "steel", "food", "fuel"].some((k) => (tp[k] || 0) > 0)) {
    push("城镇：建筑累积产出可收取", "去城镇地图", "city", "map", "");
  }
  if (
    (state.missions || []).some(
      (m) => m.unlocked && (!m.done || (m.ready && !m.claimed))
    )
  ) {
    push("任务：有日常／章节／成长待完成或奖励可领", "去总览", "city", "hub", "");
  }
  if (wildAnyUnclearedSpot_()) {
    push("野外：尚有可挑战据点", "去野外", "city", "wild", "");
  }
  if (!stageGateReq_(state.stage)) {
    push("主线：当前关卡可尝试战斗", "去关卡", "battle", "", "combat");
  }
  const n = items.length;
  if (badge) {
    badge.hidden = n <= 0;
    badge.textContent = String(Math.min(99, n));
  }
  list.innerHTML = items.length
    ? items
        .map(
          (it) =>
            `<div class="slg-action-rail-item"><div class="slg-action-rail-label">${it.label}</div><button type="button" class="slg-btn-yellow slg-action-jump" data-hub-tab="${it.tab}" data-hub-city="${it.citySub}" data-hub-battle="${it.battleSub}" data-anchor-type="${escapeHtml_(it.anchor?.type || "")}" data-anchor-id="${escapeHtml_(it.anchor?.id || "")}">${it.btnText}</button></div>`
        )
        .join("")
    : `<div class="muted slg-action-rail-empty">暂无待办。</div>`;
  list.querySelectorAll(".slg-action-jump").forEach((btn) => {
    btn.onclick = () => {
      const tab = btn.getAttribute("data-hub-tab") || "city";
      const cs = btn.getAttribute("data-hub-city") || "";
      const bs = btn.getAttribute("data-hub-battle") || "";
      const anchorType = btn.getAttribute("data-anchor-type") || "";
      const anchorId = btn.getAttribute("data-anchor-id") || "";
      if (tab === "battle") {
        if (bs) battleSubTab = bs;
        switchTab_("battle");
        return;
      }
      if (cs) citySubTab = cs;
      switchTab_("city");
      if (anchorType && anchorId) {
        setTimeout(() => {
          if (anchorType === "tech") {
            const t = TECH_DEFS.find((x) => x.id === anchorId);
            if (t) techUiBranch = t.branch || "dev";
            renderTechTree();
            setTimeout(() => {
              const el = document.querySelector(`[data-tech="${CSS.escape(anchorId)}"],[data-tech-bulk="${CSS.escape(anchorId)}"]`);
              el?.scrollIntoView?.({ behavior: "smooth", block: "center" });
            }, 30);
          } else if (anchorType === "law") {
            renderLaws();
            setTimeout(() => {
              const el = document.querySelector(`[data-law="${CSS.escape(anchorId)}"]`);
              el?.scrollIntoView?.({ behavior: "smooth", block: "center" });
            }, 30);
          } else if (anchorType === "codex") {
            renderLaws();
            setTimeout(() => {
              const el = document.querySelector(`[data-codex="${CSS.escape(anchorId)}"],[data-codex-bulk="${CSS.escape(anchorId)}"]`);
              el?.scrollIntoView?.({ behavior: "smooth", block: "center" });
            }, 30);
          } else if (anchorType === "activity") {
            activityHubTab_ = anchorId || "checkin";
            openActivitiesHub_();
          }
        }, 60);
      }
    };
  });
}

function renderAll() {
  renderCity();
  renderBuildings();
  renderTechTree();
  renderLaws();
  renderBuildQueue();
  renderCityMap();
  renderGatherNodes();
  renderHeroes();
  renderMarchExpedition_();
  renderBattle();
  renderMissions();
  renderBag_();
  renderAlliancePage_();
  renderShopForum_();
  renderShopOffers_();
  renderWildMap_();
  renderLogs();
  ensureStoryIndex();
  renderStory();
  renderActionHub_();
  updateNavBadges_();
}

function ensureStoryIndex() {
  const chapters = storyPack.chapters || [];
  if (!chapters.length) { storyIndex = 0; return; }
  const lastUnlocked = chapters.reduce((acc, ch, i) => (state.stage >= chapterUnlockStage_(ch, i) ? i : acc), 0);
  storyIndex = Math.min(Math.max(storyIndex, 0), Math.max(lastUnlocked, 0));
}

function renderCity() {
  byId("v-day").textContent = state.day;
  byId("v-pop").textContent = state.pop;
  byId("v-morale").textContent = state.morale;
  byId("v-cold").textContent = state.cold;
  const heat = clamp(Math.round((state.morale * 0.7) + (100 - state.cold * 2.2)), 0, 100);
  const heatText = byId("v-furnace-heat");
  const heatRing = byId("furnace-heat-ring");
  if (heatText) heatText.textContent = `${heat}%`;
  if (heatRing) {
    heatRing.style.background = `conic-gradient(rgba(251,146,60,.95) ${heat}%, rgba(30,41,59,.9) ${heat}% 100%)`;
  }
  byId("r-wood").innerHTML = `${iconHtml("resource", "wood", "icon16")} ${state.resources.wood}`;
  byId("r-steel").innerHTML = `${iconHtml("resource", "steel", "icon16")} ${state.resources.steel}`;
  byId("r-food").innerHTML = `${iconHtml("resource", "food", "icon16")} ${state.resources.food}`;
  byId("r-fuel").innerHTML = `${iconHtml("resource", "fuel", "icon16")} ${state.resources.fuel}`;
  byId("v-speedup").textContent = state.items.speedup || 0;
  const hudMeta = byId("hud-meta");
  const hudRes = byId("hud-resources");
  if (hudMeta) hudMeta.textContent = `Day ${state.day} · Pop ${state.pop} · Morale ${state.morale} · Cold ${state.cold}`;
  if (hudRes) hudRes.textContent = `木 ${state.resources.wood} · 钢 ${state.resources.steel} · 粮 ${state.resources.food} · 燃 ${state.resources.fuel} · 法典 ${state.policyPoints || 0}`;
  renderForumSyncFloat_();
  const pVal = byId("slg-power-val");
  if (pVal) pVal.textContent = String(Math.floor(calcBattlePowerDisplay_())).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const tVal = byId("slg-temp-val");
  if (tVal) {
    const tc = -4.2 - (state.cold || 0) * 0.38 - (100 - clamp(state.morale, 0, 100)) * 0.028;
    tVal.textContent = `${tc.toFixed(1)}℃`;
  }
  const popCap = Math.max(state.pop, 8 + (state.buildings.camp || 1) * 12);
  const slgPop = byId("slg-pop-cap");
  if (slgPop) slgPop.textContent = `${state.pop}/${popCap}`;
  const ft = byId("slg-food-timer");
  if (ft) {
    const tick = ((state.day || 1) * 47 + (state.pop || 0) * 19) % 3600;
    const mm = Math.floor(tick / 60);
    const ss = tick % 60;
    ft.textContent = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  const rw = byId("slg-r-wood");
  const rs = byId("slg-r-steel");
  const rf = byId("slg-r-fire");
  const rfw = byId("slg-fire-wrap");
  const rg = byId("slg-r-gems");
  if (rw) rw.textContent = fmtCompact_(state.resources.wood);
  if (rs) rs.textContent = fmtCompact_(state.resources.steel);
  if (rf) rf.textContent = fmtCompact_(state.resources.fireCrystal || 0);
  if (rfw) {
    rfw.hidden = !fireCrystalUnlocked_();
  }
  if (rg) rg.textContent = fmtCompact_(state.items.gems || 0);
  const av = byId("slg-avatar");
  if (av) {
    const url = getCommanderPortraitUrl_();
    av.innerHTML = `<img src="${url}" alt="指挥官" title="训练家类型风格头像（可于素材包覆写 cutscene.chars.commander）" />`;
    const pid = String(state?.profile?.id || "").trim();
    if (pid) av.title = `指挥官：${pid}（UID ${Number(state?.profile?.uid || 0) || "-"})`;
  }
  const qk = byId("slg-quest-track");
  if (qk) {
    let track = state.missions.find((x) => x.category === "chapter" && x.unlocked && !x.done);
    if (!track) track = state.missions.find((x) => x.unlocked && !x.done);
    if (!track) track = state.missions.find((x) => x.unlocked && x.ready && !x.claimed);
    if (track) {
      qk.hidden = false;
      const hint = track.ready && !track.claimed ? "（可领奖）" : "";
      qk.innerHTML = `<span class="slg-qt-ico" aria-hidden="true">📜</span><span class="slg-qt-text">${track.text}${hint}</span>`;
    } else {
      qk.hidden = true;
      qk.innerHTML = "";
    }
  }
  const sealBtn = byId("btn-resource-seal-all");
  if (sealBtn) {
    const canSeal = ["wood", "steel", "food", "fuel"].some((k) => (state.resources[k] || 0) >= RESOURCE_TICKET_UNIT);
    sealBtn.disabled = !canSeal;
    sealBtn.onclick = () => sealAllResourceOverflow_();
  }
  animateResourceDelta_();
}

function fmtCompact_(n) {
  const x = Number(n) || 0;
  if (x >= 1e6) return `${(x / 1e6).toFixed(1)}M`;
  if (x >= 1e3) return `${(x / 1e3).toFixed(1)}K`;
  return String(Math.floor(x));
}

function renderBuildings() {
  const wrap = byId("buildings");
  wrap.innerHTML = "";
  const fcUn = fireCrystalUnlocked_();
  for (const b of BUILDING_DEFS) {
    const lv = state.buildings[b.id] || 1;
    const cost = buildingCost(b, lv);
    const queued = state.buildQueue.some((q) => q.id === b.id);
    const st = buildingStar_(b.id);
    const needFc = nextBuildingStarFireCost_(b.id);
    const canUp = !queued && canUpgradeBuilding_(b.id);
    const starLine = fcUn
      ? `<div class="muted">建筑星等：${"★".repeat(st)}${"☆".repeat(Math.max(0, MAX_BUILDING_STARS - st))}（${st}/${MAX_BUILDING_STARS}）${
          needFc != null ? ` · 下次升星消耗 <strong>${needFc}</strong> 火晶` : " · 已达星等上限"
        }</div>`
      : `<div class="muted">建筑星等：中央熔炉 Lv.${FIRE_CRYSTAL_UNLOCK_HEATER_LV} 后可用<strong>火晶</strong>升星，解锁高阶科技与技能书掉落。</div>`;
    const div = document.createElement("div");
    div.className = `card ${canUp ? "is-ready" : ""}`;
    div.innerHTML = `
      <div class="building-head">${iconHtml("building", b.id, "icon20")} <strong>${b.name}</strong> Lv${lv}${canUp ? '<span class="building-ready-dot" title="可升级">🔔</span>' : ""}</div>
      ${starLine}
      <div class="muted">升级花费: ${fmtRes(cost)}</div>
      <div class="muted">前置: ${getBuildPrereqText_(b.id)}</div>
      <div class="row building-action-row">
        <button type="button" data-up="${b.id}" ${queued ? "disabled" : ""}>${queued ? "升级中" : "升级等级"}</button>
        <button type="button" class="slg-btn-yellow" data-star="${b.id}" ${fcUn && needFc != null ? "" : "disabled"}>升星（火晶）</button>
      </div>
    `;
    wrap.appendChild(div);
  }
  wrap.querySelectorAll("button[data-up]").forEach((btn) => {
    btn.onclick = () => {
      const res = upgradeBuilding(btn.dataset.up);
      if (!res?.ok) alert(`升级失败：${upgradeReasonText_(res?.reason)}`);
    };
  });
  wrap.querySelectorAll("button[data-star]").forEach((btn) => {
    btn.onclick = () => upgradeBuildingStar_(btn.getAttribute("data-star"));
  });
}

function buildTechTreeLinesSvg_(list, rowCount) {
  const cols = 5;
  const cx = (col) => ((Number(col) - 0.5) / cols) * 100;
  const cy = (row) => ((Number(row) + 0.5) / rowCount) * 100;
  const lines = [];
  for (const t of list) {
    for (const rid of t.reqTech || []) {
      const p = list.find((x) => x.id === rid);
      if (!p) continue;
      lines.push(
        `<line x1="${cx(p.treeCol)}" y1="${cy(p.treeRow)}" x2="${cx(t.treeCol)}" y2="${cy(t.treeRow)}" />`
      );
    }
  }
  return `<svg class="slg-tech-lines-svg" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${lines.join(
    ""
  )}</svg>`;
}

function renderTechNodeCardHtml_(t) {
  const curLv = Math.max(0, Number(state.techs?.[t.id] || 0));
  const mx = techMaxLv_(t);
  const done = curLv >= mx;
  const unlocked = !done && isTechUnlocked_(t, curLv + 1);
  const reqText = (t.reqTech || []).map((id) => TECH_DEFS.find((x) => x.id === id)?.name || id).join(" · ") || "无";
  const reqBuilding = (t.reqBuilding || [])
    .map((r) => `${BUILDING_DEFS.find((b) => b.id === r.id)?.name || r.id} Lv${r.lv}`)
    .join(" · ") || "无";
  const reqStars = formatTechBuildingStarsReq_(t);
  const pill = done
    ? '<span class="slg-tech-pill slg-tech-pill--max">MAX</span>'
    : `<span class="slg-tech-pill">Lv${curLv}/${mx}</span>`;
  const nextCost = done ? {} : techCostForLv_(t, curLv + 1);
  const canUp = unlocked && canAfford(nextCost);
  return `
    <div class="slg-tech-node ${done ? "is-done" : ""} ${unlocked ? "is-open" : "is-locked"} ${canUp ? "is-ready" : ""}">
      <div class="slg-tech-hex slg-tech-hex--big" aria-hidden="true"></div>
      <div class="slg-tech-body">
        ${pill}
        <div class="slg-tech-name">${t.name}</div>
        <div class="muted slg-tech-desc">${t.desc}</div>
        <div class="muted slg-tech-req">前置：${reqText}</div>
        <div class="muted slg-tech-req">建筑：${reqBuilding}</div>
        ${reqStars ? `<div class="muted slg-tech-req">建筑星等：${reqStars}</div>` : ""}
        <div class="muted">升级成本：${fmtRes(nextCost)}</div>
        <div class="row">
          <button type="button" data-tech="${t.id}" ${done || !unlocked ? "disabled" : ""}>${done ? "已满级" : curLv > 0 ? "升级" : "研究"}</button>
          <button type="button" data-tech-bulk="${t.id}" ${done || !canUp ? "disabled" : ""}>连升</button>
          ${canUp ? `<span class="tech-ready-dot" title="资源足够，可升级">●</span>` : ""}
        </div>
      </div>
    </div>`;
}

function renderTechTree() {
  const wrap = byId("tech-tree");
  if (!wrap) return;
  const branches = [
    { id: "dev", label: "发展" },
    { id: "eco", label: "经济" },
    { id: "war", label: "战斗" },
    { id: "logi", label: "后勤" },
  ];
  const tabs = branches
    .map(
      (b) =>
        `<button type="button" class="slg-main-tab ${techUiBranch === b.id ? "active" : ""}" data-tech-branch="${b.id}">${b.label}</button>`
    )
    .join("");
  const viewBar = `<div class="slg-tech-view-bar" role="toolbar">
    <span class="slg-tech-view-label muted">检视</span>
    <button type="button" class="slg-tech-view-btn ${techUiView === "tree" ? "active" : ""}" data-tech-view="tree">科技树</button>
    <button type="button" class="slg-tech-view-btn ${techUiView === "list" ? "active" : ""}" data-tech-view="list">列表</button>
  </div>`;
  const list = TECH_DEFS.filter((t) => (t.branch || "dev") === techUiBranch).sort(
    (a, b) => (a.treeRow || 0) - (b.treeRow || 0) || (a.treeCol || 0) - (b.treeCol || 0)
  );
  const maxRow = Math.max(0, ...list.map((t) => Number(t.treeRow) || 0)) + 1;
  const rowCount = Math.max(1, maxRow);
  const svgLines = list.length ? buildTechTreeLinesSvg_(list, rowCount) : "";
  const nodes = list
    .map((t) => {
      const curLv = Math.max(0, Number(state.techs?.[t.id] || 0));
      const mx = techMaxLv_(t);
      const done = curLv >= mx;
      const unlocked = !done && isTechUnlocked_(t, curLv + 1);
      const reqText = (t.reqTech || []).map((id) => TECH_DEFS.find((x) => x.id === id)?.name || id).join(" · ") || "无";
      const reqBuilding = (t.reqBuilding || [])
        .map((r) => `${BUILDING_DEFS.find((b) => b.id === r.id)?.name || r.id} Lv${r.lv}`)
        .join(" · ") || "无";
      const reqStars = formatTechBuildingStarsReq_(t);
      const tr = Number(t.treeRow) || 0;
      const tc = Number(t.treeCol) || 1;
      const pill = done
        ? '<span class="slg-tech-pill slg-tech-pill--max">MAX</span>'
        : `<span class="slg-tech-pill">Lv${curLv}/${mx}</span>`;
      const nextCost = done ? {} : techCostForLv_(t, curLv + 1);
      const canUp = unlocked && canAfford(nextCost);
      return `
    <div class="slg-tech-nodetile ${done ? "is-done" : ""} ${unlocked ? "is-open" : "is-locked"}" style="grid-row:${
        tr + 1
      };grid-column:${tc}">
      <div class="slg-tech-hex" aria-hidden="true"><i class="slg-tech-hex-inner"></i></div>
      ${pill}
      ${canUp ? `<span class="tech-ready-dot tech-ready-dot--tile" title="资源足够，可升级">●</span>` : ""}
      <div class="slg-tech-name">${t.name}</div>
      <div class="muted slg-tech-desc">${t.desc}</div>
      <div class="muted slg-tech-req">前置：${reqText}</div>
      <div class="muted slg-tech-req">建筑：${reqBuilding}</div>
      ${reqStars ? `<div class="muted slg-tech-req">星等：${reqStars}</div>` : ""}
      <div class="muted slg-tech-cost">${fmtRes(nextCost)}</div>
      <button type="button" class="slg-tech-node-btn" data-tech="${t.id}" ${done || !unlocked ? "disabled" : ""}>${
        done ? "已满级" : curLv > 0 ? "升级" : "研究"
      }</button>
    </div>`;
    })
    .join("");
  const listBoard = `<div class="slg-tech-list-board slg-tech-board">${list.map((t) => renderTechNodeCardHtml_(t)).join("")}</div>`;
  const treeBoard = `<div class="slg-tech-tree-canvas">
    <div class="slg-tech-grid-board" style="--tech-rows:${rowCount}">${svgLines}${nodes}</div>
  </div>`;
  const main = techUiView === "tree" ? treeBoard : listBoard;
  const canAuto = TECH_DEFS.some((t) => {
    const cur = Math.max(0, Number(state.techs?.[t.id] || 0));
    const mx = techMaxLv_(t);
    if (cur >= mx) return false;
    const next = cur + 1;
    if (!isTechUnlocked_(t, next)) return false;
    return canAfford(techCostForLv_(t, next));
  });
  const autoBar = `<div class="row slg-tech-autobar">
    <button type="button" class="slg-btn-yellow" id="btn-tech-auto" ${canAuto ? "" : "disabled"}>一键连升全部可升级</button>
    <span class="muted" style="font-size:12px">${canAuto ? "会把所有可升级科技自动升到卡住" : "当前没有可自动升级的科技"}</span>
  </div>`;
  wrap.innerHTML = `<div class="slg-main-tabs" role="tablist">${tabs}</div>${viewBar}${autoBar}
  <div class="slg-tech-tree-panel">${main}</div>`;
  wrap.querySelectorAll("[data-tech-branch]").forEach((btn) => {
    btn.onclick = () => {
      techUiBranch = btn.getAttribute("data-tech-branch") || "dev";
      renderTechTree();
    };
  });
  wrap.querySelectorAll("[data-tech-view]").forEach((btn) => {
    btn.onclick = () => {
      techUiView = btn.getAttribute("data-tech-view") === "list" ? "list" : "tree";
      renderTechTree();
    };
  });
  wrap.querySelectorAll("button[data-tech]").forEach((btn) => {
    btn.onclick = () => researchTech(btn.dataset.tech);
  });
  wrap.querySelectorAll("button[data-tech-bulk]").forEach((btn) => {
    btn.onclick = () => upgradeTechBulk_(btn.getAttribute("data-tech-bulk"));
  });
  byId("btn-tech-auto")?.addEventListener("click", () => upgradeAllAvailableTechs_());
}

function renderLaws() {
  const wrap = byId("law-board");
  if (!wrap) return;
  const pts = Number(state.policyPoints || 0);
  const lawAvail = LAW_DEFS.some((l) => {
    const done = Number(state.laws[l.id] || 0) > 0;
    const reqOk = (state.buildings?.[l.reqBuilding.id] || 1) >= Number(l.reqBuilding.lv || 1);
    return !done && reqOk && pts >= Number(l.cost || 0);
  });
  const codexAvail = CODEX_DEFS.some((c) => {
    const cur = codexLv_(c.id);
    const mx = codexMaxLv_(c);
    if (cur >= mx) return false;
    const nextLv = cur + 1;
    const cost = codexCostPts_(c, nextLv);
    return codexPrereqOk_(c, nextLv) && pts >= cost;
  });
  wrap.innerHTML = `
    <div class="muted">法典点数：<strong>${pts}</strong>（主线/成长/秘闻提供；用于升级法典或颁布法令） ${
      lawAvail || codexAvail ? `<span class="law-hint-badge" title="有可操作项目">●</span>` : ""
    }</div>
    <div class="row law-autobar">
      <button type="button" class="slg-btn-yellow" id="btn-codex-auto" ${codexAvail ? "" : "disabled"}>一键连升全部可升级法典</button>
      <span class="muted" style="font-size:12px">${codexAvail ? "会把所有可升级法典自动升到卡住" : "当前没有可自动升级的法典"}</span>
    </div>
    <div class="law-codex-board"></div>
    <div id="law-list"></div>
  `;
  byId("btn-codex-auto")?.addEventListener("click", () => upgradeAllAvailableCodex_());
  const cb = wrap.querySelector(".law-codex-board");
  if (cb) {
    cb.innerHTML = `
      <div class="muted"><strong>法典等级</strong>（高阶法典需要前置法典到指定等级）</div>
      <div class="law-codex-grid">
        ${CODEX_DEFS.map((c) => {
          const cur = codexLv_(c.id);
          const mx = codexMaxLv_(c);
          const done = cur >= mx;
          const nextLv = cur + 1;
          const cost = done ? 0 : codexCostPts_(c, nextLv);
          const ok = !done && codexPrereqOk_(c, nextLv) && pts >= cost;
          const reqText = (c.prereq || []).map((r) => `${CODEX_DEFS.find((x)=>x.id===r.id)?.name || r.id} Lv${r.lv}`).join(" · ") || "无";
          return `<div class="card law-codex-card ${ok ? "is-ready" : ""}">
            <div class="law-codex-top">
              <div><strong>${escapeHtml_(c.name)}</strong></div>
              <div class="muted">Lv${cur}/${mx}</div>
            </div>
            <div class="muted">${escapeHtml_(c.desc || "")}</div>
            <div class="muted">前置：${escapeHtml_(reqText)}</div>
            <div class="muted">升级消耗：法典点×${cost}</div>
            <div class="row">
              <button type="button" data-codex="${escapeHtml_(c.id)}" ${ok ? "" : "disabled"}>${done ? "已满级" : "升级"}</button>
              <button type="button" data-codex-bulk="${escapeHtml_(c.id)}" ${ok ? "" : "disabled"}>连升</button>
              ${ok ? `<span class="tech-ready-dot" title="法典点足够，可升级">●</span>` : ""}
            </div>
          </div>`;
        }).join("")}
      </div>
    `;
    cb.querySelectorAll("button[data-codex]").forEach((btn) => {
      btn.onclick = () => upgradeCodexBook_(btn.getAttribute("data-codex"));
    });
    cb.querySelectorAll("button[data-codex-bulk]").forEach((btn) => {
      btn.onclick = () => upgradeCodexBulk_(btn.getAttribute("data-codex-bulk"));
    });
  }
  const list = wrap.querySelector("#law-list");
  if (!list) return;
  LAW_DEFS.forEach((l) => {
    const done = Number(state.laws[l.id] || 0) > 0;
    const reqOk = (state.buildings?.[l.reqBuilding.id] || 1) >= Number(l.reqBuilding.lv || 1);
    const can = !done && reqOk && pts >= Number(l.cost || 0);
    const d = document.createElement("div");
    d.className = "card";
    d.innerHTML = `
      <div class="law-row-head">
        <div><strong>${l.name}</strong> ${done ? "✅" : ""}</div>
        ${can ? `<span class="law-right-hint" title="可颁布">🔔</span>` : ""}
      </div>
      <div class="muted">${l.desc}</div>
      <div class="muted">前置：${BUILDING_DEFS.find((b)=>b.id===l.reqBuilding.id)?.name || l.reqBuilding.id} Lv${l.reqBuilding.lv}</div>
      <div class="muted">消耗法典点：${l.cost}</div>
      <button data-law="${l.id}" ${can ? "" : "disabled"}>${done ? "已颁布" : "颁布"}</button>
    `;
    list.appendChild(d);
  });
  list.querySelectorAll("button[data-law]").forEach((btn) => {
    btn.onclick = () => enactLaw_(btn.getAttribute("data-law"));
  });
}

function enactLaw_(id) {
  const l = LAW_DEFS.find((x) => x.id === id);
  if (!l) return;
  if ((state.laws[l.id] || 0) > 0) return;
  if ((state.buildings?.[l.reqBuilding.id] || 1) < Number(l.reqBuilding.lv || 1)) return alert("前置建筑等级不足");
  if (Number(state.policyPoints || 0) < Number(l.cost || 0)) return alert("法典点数不足");
  state.policyPoints -= Number(l.cost || 0);
  state.laws[l.id] = 1;
  logEvent("法典", `已颁布「${l.name}」`);
  save();
  renderLaws();
  renderCity();
  renderActionHub_();
  updateNavBadges_();
  renderLogs();
}

function renderCityMap() {
  renderTownPassHud_();
  const wrap = byId("city-map");
  if (!wrap) return;
  const cityBg = assets?.ui?.cityMap || "";
  const dayCycle = (state.day % 8) / 8;
  const dark = 0.18 + Math.abs(dayCycle - 0.5) * 0.42;
  wrap.style.setProperty("--city-dark-alpha", dark.toFixed(2));
  wrap.classList.toggle("city-night", dark >= 0.42);
  wrap.style.backgroundImage = cityBg ? `linear-gradient(180deg, rgba(2,6,23,.25), rgba(15,23,42,.4)), url("${cityBg}")` : "";
  wrap.style.backgroundSize = "cover";
  wrap.style.backgroundPosition = "center";
  wrap.innerHTML = "";
  const roads = document.createElement("div");
  roads.className = "city-road-grid";
  wrap.appendChild(roads);
  const corePos = CITY_MAP_LAYOUT.heater || { x: 50, y: 50 };
  const coreHalo = document.createElement("div");
  coreHalo.className = "city-core-halo";
  coreHalo.style.left = `${corePos.x}%`;
  coreHalo.style.top = `${corePos.y}%`;
  wrap.appendChild(coreHalo);
  const particles = document.createElement("div");
  particles.className = "city-particles";
  const pCount = 14 + (state.day % 8);
  for (let i = 0; i < pCount; i += 1) {
    const p = document.createElement("i");
    p.style.setProperty("--x", `${Math.floor(Math.random() * 100)}%`);
    p.style.setProperty("--d", `${4 + Math.random() * 5}s`);
    p.style.setProperty("--delay", `${Math.random() * 4}s`);
    particles.appendChild(p);
  }
  wrap.appendChild(particles);
  const civilians = document.createElement("div");
  civilians.className = "city-civilians";
  for (let i = 0; i < 10; i += 1) {
    const c = document.createElement("span");
    c.className = "city-trainer-walk";
    const img = document.createElement("img");
    const src = cityWalkerTrainerUrl_(i * 3 + (i % 7));
    img.src = src;
    img.alt = "";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.onerror = function () {
      this.onerror = null;
      this.src = "https://play.pokemonshowdown.com/sprites/trainers/veteran.png";
    };
    c.appendChild(img);
    c.title = "城镇行人（训练家立绘 · Pokémon Showdown）";
    c.style.setProperty("--x", `${12 + Math.random() * 76}%`);
    c.style.setProperty("--y", `${18 + Math.random() * 62}%`);
    c.style.setProperty("--d", `${6 + Math.random() * 6}s`);
    c.style.setProperty("--delay", `${Math.random() * 5}s`);
    civilians.appendChild(c);
  }
  wrap.appendChild(civilians);
  BUILDING_DEFS.forEach((b) => {
    const pos = CITY_MAP_LAYOUT[b.id] || { x: 50, y: 52 };
    const lv = state.buildings[b.id] || 1;
    const node = document.createElement("div");
    node.className = "map-node";
    node.setAttribute("data-bid", b.id);
    const px = clamp(Number(pos.x || 50), 8, 92);
    const py = clamp(Number(pos.y || 52), 12, 88);
    node.style.left = `${px}%`;
    node.style.top = `${py}%`;
    node.classList.toggle("upgrade-ready", canUpgradeBuilding_(b.id));
    const mapReady = canUpgradeBuilding_(b.id);
    node.innerHTML = `
      <div class="map-icon-badge">${iconHtml("building", b.id, "icon20")}</div>
      ${mapReady ? '<span class="map-ready-dot" title="可升级">🔔</span>' : ""}
      <div class="map-label">${b.name}</div>
      <div class="map-lv">Lv${lv}</div>
    `;
    node.onclick = () => openBuildingModal(b.id);
    wrap.appendChild(node);
  });
  const worldHud = document.createElement("div");
  worldHud.className = "world-map-hud";
  const gx = 520 + state.stage * 31 + state.day * 7;
  const gy = 180 + state.stage * 19;
  worldHud.innerHTML = `
    <div class="world-coord">营地座标 #${1100 + state.day}　X:${gx % 2500}　Y:${gy % 2500}</div>
    <div class="world-fog-layer" aria-hidden="true"></div>
    <div class="world-base-pin" title="主城">🏰</div>
    <div class="world-legend muted">城镇建筑配置示意（野外探索请从底部「野外」进入）</div>
  `;
  wrap.appendChild(worldHud);
}

function updateNavBadges_() {
  const dotCity = byId("dot-city");
  const dotBattle = byId("dot-battle");
  const dotHeroes = byId("dot-heroes");
  if (!dotCity || !dotBattle) return;

  const cityWarn = state.buildQueue.some((q) => q.status === "pending") || state.gatherInbox.length > 0;
  const readyUlts = state.heroes.filter((h) => {
    if (!state.squad.includes(h.id)) return false;
    const s = getActiveSkillCfg_(h);
    const need = Number(s.chargeNeed || 100);
    return (state.skillCharge[h.id] || 0) >= need;
  }).length;
  const missionTodo = state.missions.some((m) => m.unlocked && (!m.done || (m.ready && !m.claimed)));

  const onTownHub = currentTab === "city" && citySubTab === "hub";
  const onBattleCombat = currentTab === "battle" && battleSubTab === "combat";
  const onBattleSquad = currentTab === "battle" && battleSubTab === "squad";

  dotCity.classList.toggle("show", (cityWarn || missionTodo) && !onTownHub);
  dotBattle.classList.toggle("show", readyUlts > 0 && !onBattleCombat);
  if (dotHeroes) dotHeroes.classList.toggle("show", readyUlts > 0 && !onBattleSquad);
}

function isGatherDispatchActive_(s) {
  if (!s || !s.running || !s.heroId) return false;
  const st = Number(s.startAt || 0);
  const ed = Number(s.endAt || 0);
  const now = Date.now();
  if (!Number.isFinite(st) || !Number.isFinite(ed) || st <= 0 || ed <= st) return false;
  if (ed <= now) return false;
  if (ed - st > 24 * 3600 * 1000) return false;
  return true;
}

function renderGatherNodes() {
  const wrap = byId("gather-nodes");
  if (!wrap) return;
  const now = Date.now();
  const gqCost = nextGatherSlotGemCost_();
  byId("gather-queue-info").innerHTML = `采集队列：${runningGatherCount_()} / ${maxGatherQueue_()}（训练营 + 钻石扩充）　<button type="button" class="slg-inline-btn" id="btn-buy-gather-slot">💎 ${gqCost} +1 伫列</button>`;
  const bgq = byId("btn-buy-gather-slot");
  if (bgq) bgq.onclick = () => buyGatherSlotWithGems_();
  wrap.innerHTML = "";
  const unlocked = GATHER_NODE_DEFS.filter(gatherNodeUnlocked_);
  const locked = GATHER_NODE_DEFS.filter((n) => !gatherNodeUnlocked_(n));
  const busyGatherHeroes_ = (excludeNodeId = "") =>
    new Set(
      Object.entries(state.gatherNodes || {})
        .filter(([nid, s]) => nid !== excludeNodeId && isGatherDispatchActive_(s))
        .map(([, s]) => String(s.heroId))
    );
  const recommendGatherHeroId_ = (node) => {
    const last = String(state.lastGatherHeroId || "");
    const busy = busyGatherHeroes_();
    if (last && !busy.has(last) && state.heroes.some((h) => h.id === last)) return last;
    const pref = node.type === "wood" || node.type === "food" ? ["草", "火"] : node.type === "steel" || node.type === "fuel" ? ["水", "格斗"] : [];
    const byLv = [...state.heroes].sort((a, b) => (Number(b.level || 1) - Number(a.level || 1)));
    const free = byLv.filter((h) => !busy.has(String(h.id)));
    const p = free.find((h) => pref.includes(h.role));
    return (p || free[0] || {}).id || "";
  };
  const renderOne = (n, lockedCard) => {
    const s = state.gatherNodes[n.id] || { running: false, startAt: 0, endAt: 0, heroId: "", durationMin: 15 };
    const busy = busyGatherHeroes_(n.id);
    const selectedHero = (s.heroId && !busy.has(String(s.heroId))) ? s.heroId : recommendGatherHeroId_(n);
    const selectedMin = Number(s.durationMin || 15);
    const duration = calcGatherDurationSec_(n, selectedHero, selectedMin);
    const total = Math.max(1, duration * 1000);
    const doneMs = clamp(now - s.startAt, 0, total);
    const pct = s.running ? Math.floor((doneMs / total) * 100) : 0;
    const remain = s.running ? Math.max(0, Math.ceil((s.endAt - now) / 1000)) : 0;
    const tier = gatherSiteTier_(n.id);
    const claims = state.gatherMastery?.[n.id]?.claims || 0;
    const yieldAmt = calcGatherYield_(n, selectedHero, selectedMin, tier);
    const div = document.createElement("div");
    div.className = "card gather-node" + (lockedCard ? " gather-node-locked" : "");
    const lockHint =
      lockedCard && n.unlock
        ? `<div class="muted">解锁：在「${GATHER_NODE_DEFS.find((x) => x.id === n.unlock.nodeId)?.name || n.unlock.nodeId}」累计领取 ${n.unlock.minClaims} 次资源</div>`
        : "";
    div.innerHTML = `
      <div>
        <div><strong>${n.name}</strong> (${n.type})${lockedCard ? " <span class=\"tag\">未解锁</span>" : ""}</div>
        <div class="muted">富集阶层 ${tier}/3 · 同点已领取 ${claims} 次</div>
        ${lockHint}
        <div class="muted">预计主资源 ${yieldAmt} / 时长 ${duration}s${n.extraYieldType ? ` · 伴采含 ${n.extraYieldType}` : ""}</div>
        <div class="gather-config">
          <select data-gather-hero="${n.id}" ${s.running || lockedCard ? "disabled" : ""}>
            <option value="">不派英雄</option>
            ${state.heroes.map(h => `<option value="${h.id}" ${selectedHero===h.id?'selected':''} ${busy.has(String(h.id)) ? "disabled" : ""}>${h.name} (${h.role})${busy.has(String(h.id)) ? "（派遣中）" : ""}</option>`).join("")}
          </select>
          <select data-gather-duration="${n.id}" ${s.running || lockedCard ? "disabled" : ""}>
            ${GATHER_DURATION_OPTIONS.map(o => `<option value="${o.min}" ${o.min===selectedMin?'selected':''}>${o.label}</option>`).join("")}
          </select>
          <div class="muted">${selectedHero ? `已选: ${state.heroes.find(h=>h.id===selectedHero)?.name || selectedHero}` : "可选英雄加成"}</div>
          <div class="muted">派遣时长: ${selectedMin >= 60 ? `${(selectedMin / 60).toFixed(selectedMin % 60 === 0 ? 0 : 1)}小时` : `${selectedMin}分钟`}</div>
        </div>
        <div class="gather-bar"><i style="width:${pct}%"></i></div>
        <div class="muted">${s.running ? `进行中，剩余 ${remain}s` : "待命"}</div>
        ${
          s.running && !lockedCard
            ? `<div class="gather-speedup-row">
          <div class="muted">每张券缩短 <strong>${GATHER_SPEEDUP_SEC_PER_TICKET}</strong> 秒 · 持有 <strong>${state.items.speedup || 0}</strong> 张</div>
          <div class="gather-spd-controls">
            <label class="muted">使用张数 <input type="number" class="gather-spd-input" min="1" max="${Math.max(1, state.items.speedup || 0)}" value="${Math.min(Math.max(1, state.items.speedup || 0), Math.max(1, Math.ceil(remain / GATHER_SPEEDUP_SEC_PER_TICKET)))}" data-gather-spd-n="${n.id}" /></label>
            <button type="button" class="gather-spd-btn" data-gather-spd="${n.id}" ${(state.items.speedup || 0) > 0 ? "" : "disabled"}>⚡ 加速</button>
          </div>
        </div>`
            : ""
        }
      </div>
      <div>
        <button data-gather="${n.id}" ${s.running || lockedCard ? "disabled" : ""}>${lockedCard ? "未解锁" : s.running ? "采集中" : "派遣"}</button>
      </div>
    `;
    wrap.appendChild(div);
  };
  unlocked.forEach((n) => renderOne(n, false));
  locked.forEach((n) => renderOne(n, true));
  wrap.querySelectorAll("button[data-gather]").forEach((btn) => {
    btn.onclick = () => startGather_(btn.dataset.gather);
  });
  wrap.querySelectorAll("button[data-gather-spd]").forEach((btn) => {
    btn.onclick = () => {
      const nodeId = btn.getAttribute("data-gather-spd");
      const inp = wrap.querySelector(`input[data-gather-spd-n="${nodeId}"]`);
      const raw = inp ? Number(inp.value) : 1;
      useSpeedupOnGatherNode_(nodeId, raw);
    };
  });
  wrap.querySelectorAll("select[data-gather-hero]").forEach((sel) => {
    sel.onchange = () => {
      const id = sel.getAttribute("data-gather-hero");
      const cur = state.gatherNodes[id] || { running: false, startAt: 0, endAt: 0, heroId: "" };
      if (cur.running) return;
      const busy = busyGatherHeroes_(id);
      if (sel.value && busy.has(String(sel.value))) {
        alert("该英雄已在其他采集点派遣中，无法重复派遣。");
        renderGatherNodes();
        return;
      }
      cur.heroId = sel.value || "";
      if (cur.heroId) state.lastGatherHeroId = cur.heroId;
      state.gatherNodes[id] = cur;
      save();
      renderGatherNodes();
    };
  });
  wrap.querySelectorAll("select[data-gather-duration]").forEach((sel) => {
    sel.onchange = () => {
      const id = sel.getAttribute("data-gather-duration");
      const cur = state.gatherNodes[id] || { running: false, startAt: 0, endAt: 0, heroId: "", durationMin: 15 };
      if (cur.running) return;
      cur.durationMin = Number(sel.value || 15);
      state.gatherNodes[id] = cur;
      save();
      renderGatherNodes();
    };
  });
}

function renderBuildQueue() {
  const wrap = byId("build-queue");
  if (!wrap) return;
  const active = state.buildQueue.filter((q) => q.status === "active").length;
  const slotInfo = byId("build-slot-info");
  const gemCost = nextBuildSlotGemCost_();
  if (slotInfo) {
    slotInfo.innerHTML = `施工工位：${active} / ${maxBuildQueue_()}（可并行）　<button type="button" class="slg-inline-btn" id="btn-buy-build-slot">💎 ${gemCost} 扩建工位</button>`;
    const bbs = byId("btn-buy-build-slot");
    if (bbs) bbs.onclick = () => buyBuildSlotWithGems_();
  }
  if (!state.buildQueue.length) {
    wrap.innerHTML = `<div class="muted">当前无施工任务（上限 ${maxBuildQueue_()}）</div>`;
    return;
  }
  const now = Date.now();
  const spd = state.items.speedup || 0;
  wrap.innerHTML = state.buildQueue.map((q, idx) => {
    const def = BUILDING_DEFS.find((x) => x.id === q.id);
    const remain = q.status === "pending" ? "--" : Math.max(0, Math.ceil((q.endAt - now) / 1000));
    const tag = q.status === "pending" ? `<span class="tag">待开工</span>` : `<span class="tag">施工中</span>`;
    return `<div class="queue-item"><div>${tag}${idx + 1}. ${def?.name || q.id} Lv${q.fromLv}→Lv${q.fromLv + 1}</div><div class="queue-item-row"><span class="muted">剩余 ${remain}s</span><button type="button" class="slg-inline-btn queue-spd-one" data-queue-spd="${idx}" ${
      spd <= 0 ? "disabled" : ""
    }>加速券 −60s</button></div></div>`;
  }).join("");
  wrap.querySelectorAll("button[data-queue-spd]").forEach((btn) => {
    btn.onclick = () => speedupOneBuildQueueItem_(Number(btn.getAttribute("data-queue-spd")));
  });
}

function speedupOneBuildQueueItem_(idx) {
  if ((state.items.speedup || 0) <= 0) return alert("没有加速券");
  const q = state.buildQueue[idx];
  if (!q) return;
  const now = Date.now();
  const def = BUILDING_DEFS.find((x) => x.id === q.id);
  const name = def?.name || q.id;
  let beforeS = "";
  let afterS = "";
  if (q.status === "active" && q.endAt) {
    const b = Math.max(0, Math.ceil((q.endAt - now) / 1000));
    beforeS = `${b}s`;
  } else if (q.status === "pending") {
    beforeS = `总时长 ${q.sec || 0}s`;
  }
  const reduceMs = 60 * 1000;
  state.items.speedup -= 1;
  if (q.status === "active") q.endAt -= reduceMs;
  else if (q.status === "pending") q.sec = Math.max(1, (q.sec || 0) - 60);
  if (q.status === "active" && q.endAt) {
    afterS = `${Math.max(0, Math.ceil((q.endAt - now) / 1000))}s`;
  } else if (q.status === "pending") {
    afterS = `${q.sec}s`;
  }
  logEvent("道具", `施工队列 #${idx + 1} 使用加速券（-60s）`);
  tickBuildQueue_();
  alert(`已消耗 1 张加速券\n${name}：${beforeS ? `${beforeS} → ${afterS}` : "已缩短 60s"}`);
  save();
  renderBuildQueue();
  renderCity();
  renderBag_();
  renderLogs();
}

function calcGatherYield_(node, heroId = "", durationMin = 15, siteTier = 1) {
  const base = node.baseYield;
  const durScale = Math.max(1, Number(durationMin || 15) / 15);
  let bonus = (1 + (state.stage - 1) * 0.05 + (state.buildings.camp - 1) * 0.03) * Math.pow(durScale, 0.98);
  bonus += getTechBonus_("gatherYield");
  bonus += getPassiveTotals_().gatherYieldPct;
  bonus += Math.min(0.2, (state.alliance?.perks?.gather || 0) * 0.02);
  bonus += allianceLevelBonus_().gatherYieldPct;
  const h = state.heroes.find((x) => x.id === heroId);
  if (h) {
    const roleBonus =
      h.role === "草" || h.role === "火" ? 0.1 : h.role === "水" || h.role === "格斗" ? 0.07 : 0.08;
    bonus += roleBonus + h.level * 0.002;
  }
  const st = Math.max(1, Math.min(3, Number(siteTier) || 1));
  const tierMul = 1 + 0.1 * (st - 1);
  return Math.floor(base * bonus * tierMul);
}
function calcGatherDurationSec_(node, heroId = "", durationMin = 15) {
  let d = Math.max(60, Number(durationMin || 15) * 60);
  const passiveSpeed = getPassiveTotals_().gatherSpeedPct + getLawBonus_("gatherSpeedPct");
  if (passiveSpeed !== 0) d = Math.max(10, Math.floor(d * (1 - passiveSpeed)));
  const h = state.heroes.find((x) => x.id === heroId);
  if (h) d = Math.max(12, Math.floor(d * (1 - (0.12 + h.level * 0.0015))));
  return d;
}

function startGather_(nodeId) {
  if (runningGatherCount_() >= maxGatherQueue_()) {
    alert(`采集队列已满（上限 ${maxGatherQueue_()}）`);
    return;
  }
  const def = GATHER_NODE_DEFS.find((x) => x.id === nodeId);
  if (!def) return;
  if (!gatherNodeUnlocked_(def)) {
    alert("该采集点尚未解锁，请先在对应基础点累计领取足够次数。");
    return;
  }
  const now = Date.now();
  const nodeState = state.gatherNodes[nodeId] || { running: false, startAt: 0, endAt: 0, heroId: "", durationMin: 15 };
  const pref = def.type === "wood" || def.type === "food" ? ["草", "火"] : def.type === "steel" || def.type === "fuel" ? ["水", "格斗"] : [];
  const allHeroes = [...state.heroes].sort((a, b) => (Number(b.level || 1) - Number(a.level || 1)));
  const busySet = new Set(
    Object.entries(state.gatherNodes || {})
      .filter(([nid, s]) => nid !== nodeId && isGatherDispatchActive_(s))
      .map(([, s]) => String(s.heroId))
  );
  const freeHeroes = allHeroes.filter((h) => !busySet.has(String(h.id)));
  let heroId = nodeState.heroId || state.lastGatherHeroId || "";
  if (heroId && busySet.has(String(heroId))) {
    heroId = "";
  }
  if (!heroId) {
    heroId = (freeHeroes.find((h) => pref.includes(h.role)) || freeHeroes[0] || {}).id || "";
  }
  const durationMin = Number(state.gatherNodes[nodeId]?.durationMin || 15);
  if (heroId && busySet.has(String(heroId))) return;
  const dur = calcGatherDurationSec_(def, heroId, durationMin);
  state.gatherNodes[nodeId] = {
    running: true,
    startAt: now,
    endAt: now + dur * 1000,
    heroId,
    durationMin,
  };
  if (heroId) state.lastGatherHeroId = heroId;
  logEvent("采集", `已派遣到 ${def.name}${heroId ? `（英雄 ${state.heroes.find(h=>h.id===heroId)?.name || heroId}）` : ""}`);
  save();
  renderGatherNodes();
  renderActionHub_();
  updateNavBadges_();
  renderLogs();
}

function runningGatherCount_() {
  return Object.values(state.gatherNodes).filter((x) => x && x.running).length;
}
function canDispatchAnyGather_() {
  if (runningGatherCount_() >= maxGatherQueue_()) return false;
  const unlocked = GATHER_NODE_DEFS.filter(gatherNodeUnlocked_);
  return unlocked.some((n) => {
    const s = state.gatherNodes[n.id];
    return !s || !s.running;
  });
}
function maxGatherQueue_() {
  const campLv = state.buildings.camp || 1;
  return 2 + Math.floor((campLv - 1) / 2) + (state.extraGatherSlots || 0);
}

function getTownProdPerTick_() {
  const out = { wood: 0, steel: 0, food: 0, fuel: 0, fireCrystal: 0 };
  for (const b of BUILDING_DEFS) {
    const lv = state.buildings[b.id] || 0;
    if (lv <= 0) continue;
    const rate = 1 + (lv - 1) * 0.18;
    if (b.gain) {
      for (const [k, v] of Object.entries(b.gain)) {
        const raw = Number(v) * rate * TOWN_GAIN_MULT;
        out[k] += Math.max(0, Math.floor(raw));
      }
    }
  }
  if (fireCrystalUnlocked_()) {
    const hv = Number(state.buildings?.heater || 1);
    out.fireCrystal += Math.max(0, Math.floor(1 + (hv - FIRE_CRYSTAL_UNLOCK_HEATER_LV) * 0.25));
  }
  return out;
}

function tickTownAcc_() {
  if (!state.townPass) return false;
  const now = Date.now();
  const last = Number(state.townPass.accAt) || now;
  const ticks = Math.floor((now - last) / TOWN_TICK_MS);
  if (ticks < 1) return false;
  const prod = getTownProdPerTick_();
  const capTicks = (TOWN_CAP_H * 60) / 10;
  for (let t = 0; t < ticks; t += 1) {
    for (const k of ["wood", "steel", "food", "fuel", "fireCrystal"]) {
      const p = prod[k] || 0;
      const maxK = p * capTicks;
      state.townPass[k] = Math.min((state.townPass[k] || 0) + p, maxK);
    }
  }
  state.townPass.accAt = last + ticks * TOWN_TICK_MS;
  return true;
}

function renderTownPassHud_() {
  const el = byId("town-pass-hud");
  if (!el) return;
  const prod = getTownProdPerTick_();
  const capTicks = (TOWN_CAP_H * 60) / 10;
  const tp = state.townPass || { wood: 0, steel: 0, food: 0, fuel: 0, fireCrystal: 0 };
  let full = false;
  const keys = ["wood", "steel", "food", "fuel"];
  if (fireCrystalUnlocked_()) keys.push("fireCrystal");
  const lines = keys.map((k) => {
    const cur = Math.floor(tp[k] || 0);
    const mx = Math.floor((prod[k] || 0) * capTicks);
    if (mx > 0 && cur >= mx * 0.98) full = true;
    const lab = { wood: "木", steel: "钢", food: "粮", fuel: "燃", fireCrystal: "火晶" }[k];
    return `${lab} ${cur}${mx ? ` / ${mx}` : ""}`;
  });
  el.classList.toggle("is-full", full);
  const any = keys.some((k) => (tp[k] || 0) > 0);
  el.innerHTML = `
    <div class="town-pass-stats">
      <div><strong>城镇产出</strong>（每 10 分钟，最多累积 ${TOWN_CAP_H} 小时）</div>
      <div class="muted">${lines.join(" · ")}</div>
    </div>
    <button type="button" class="slg-btn-yellow" id="btn-town-claim">收取</button>
  `;
  const btn = byId("btn-town-claim");
  if (btn) {
    btn.disabled = !any;
    btn.onclick = () => claimTownPass_();
  }
}

function claimTownPass_() {
  const tp = state.townPass;
  if (!tp) return;
  const add = {};
  let n = false;
  for (const k of ["wood", "steel", "food", "fuel", "fireCrystal"]) {
    const v = Math.floor(tp[k] || 0);
    if (v > 0) {
      add[k] = v;
      tp[k] = 0;
      n = true;
    }
  }
  if (!n) return alert("目前没有可收取的资源");
  addRes(add);
  logEvent("城镇", "已收取城镇累积产出");
  save();
  renderAll();
}

/** 对战用宝可梦动态图（Gen5 动画 GIF）。 */
function pkmSpriteUrl_(slug) {
  const s = String(slug || "rattata")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  return `https://play.pokemonshowdown.com/sprites/gen5ani/${s}.gif`;
}

const COMMANDER_TRAINER_KEYS_ = ["veteran", "hiker", "scientist", "ranger", "blackbelt"];

function getCommanderPortraitUrl_() {
  const idx = Math.max(0, (state.day || 1) - 1) % COMMANDER_TRAINER_KEYS_.length;
  const key = COMMANDER_TRAINER_KEYS_[idx];
  return `https://play.pokemonshowdown.com/sprites/trainers/${key}.png`;
}

function storyTrainerPortrait_(key) {
  const map = {
    commander: "veteran",
    scout: "ranger",
    narrator: "scientist",
    guard: "blackbelt",
    engineer: "hiker",
  };
  const k = map[key] || "veteran";
  return `https://play.pokemonshowdown.com/sprites/trainers/${k}.png`;
}

function chapterUnlockStage_(chapter, idx) {
  const i = Math.max(0, Number(idx || 0));
  const milestone = i <= 0 ? 1 : i * 5;
  const raw = Number(chapter?.unlockStage || 1);
  return Math.min(BATTLE_STAGE_MAX_, Math.max(milestone, Number.isFinite(raw) ? raw : 1));
}

function stageEnemySlug_(st) {
  if (st === 5) return "tyranitar";
  if (st === 10) return "rayquaza";
  const pool = ["sentret", "furret", "pidgeotto", "noctowl", "ariados", "murkrow", "sneasel", "piloswine"];
  return pool[(Math.max(1, st) - 1) % pool.length];
}

function buildDurationSec_(id, lv) {
  const safeLv = Math.max(1, Number(lv || 1));
  const baseSec = 120 * Math.pow(2, safeLv - 1);
  const typeFactor = id === "heater" ? 1.5 : 1;
  const speedBonus = getTechBonus_("buildSpeed") + getLawBonus_("buildSpeed");
  const allyB = Math.min(0.12, (state.alliance?.perks?.build || 0) * 0.02);
  const allyLvB = allianceLevelBonus_().buildSpeedPct;
  return clamp(Math.floor(baseSec * typeFactor * (1 - speedBonus) * (1 - allyB) * (1 - allyLvB)), 120, 24 * 3600);
}
function maxBuildQueue_() {
  const heaterLv = state.buildings.heater || 1;
  const base = Math.max(1, 1 + Math.floor((heaterLv - 1) / 3));
  return base + (state.extraBuildSlots || 0);
}

function nextBuildSlotGemCost_() {
  const n = state.extraBuildSlots || 0;
  return 48 + n * 36;
}

function buyBuildSlotWithGems_() {
  const cost = nextBuildSlotGemCost_();
  if ((state.items.gems || 0) < cost) return alert(`钻石不足（需要 ${cost} 💎）`);
  state.items.gems -= cost;
  state.extraBuildSlots = (state.extraBuildSlots || 0) + 1;
  logEvent("建筑", `已用 ${cost} 💎 扩建施工工位`);
  save();
  renderAll();
}

function nextGatherSlotGemCost_() {
  const n = state.extraGatherSlots || 0;
  return 36 + n * 28;
}

function buyGatherSlotWithGems_() {
  const cost = nextGatherSlotGemCost_();
  if ((state.items.gems || 0) < cost) return alert(`钻石不足（需要 ${cost} 💎）`);
  if (!confirm(`消耗 ${cost} 💎 永久 +1 采集伫列上限？`)) return;
  state.items.gems -= cost;
  state.extraGatherSlots = (state.extraGatherSlots || 0) + 1;
  logEvent("采集", `已用 ${cost} 💎 扩充采集伫列（累计 +${state.extraGatherSlots}）`);
  save();
  renderGatherNodes();
  renderCity();
  renderBag_();
}

function settleGatherNode_(nodeId) {
  const def = GATHER_NODE_DEFS.find((x) => x.id === nodeId);
  const s = state.gatherNodes[nodeId];
  if (!def || !s || !s.running) return false;
  if (Date.now() < s.endAt) return false;
  const siteTier = gatherSiteTier_(nodeId);
  const amount = calcGatherYield_(def, s.heroId || "", Number(s.durationMin || 15), siteTier);
  state.gatherInbox.push({ nodeId, type: def.type, amount, name: def.name, masteryOnce: true });
  const bonusMap = { wood: "food", steel: "fuel", food: "wood", fuel: "steel" };
  if (siteTier >= 2) {
    const bt = bonusMap[def.type];
    if (bt) {
      state.gatherInbox.push({
        nodeId,
        type: bt,
        amount: Math.floor(amount * (siteTier === 2 ? 0.2 : 0.34)),
        name: `${def.name}·伴生`,
      });
    }
  }
  if (def.extraYieldType) {
    state.gatherInbox.push({
      nodeId,
      type: def.extraYieldType,
      amount: Math.floor(amount * (def.extraYieldRatio || 0.25)),
      name: `${def.name}·伴采`,
    });
  }
  state.gatherNodes[nodeId] = { running: false, startAt: 0, endAt: 0, heroId: s.heroId || "", durationMin: Number(s.durationMin || 15) };
  logEvent("采集", `${def.name} 已返回，待领取 ${def.type}:${amount}`);
  openGatherClaimIfNeeded();
  return true;
}

function startGatherTicker() {
  setInterval(() => {
    let changed = false;
    changed = tickBuildQueue_() || changed;
    changed = tickTownAcc_() || changed;
    GATHER_NODE_DEFS.forEach((n) => {
      if (settleGatherNode_(n.id)) changed = true;
    });
    if (!isGatherSelectActive_()) renderGatherNodes();
    renderBuildQueue();
    if (changed) {
      save();
      renderAll();
      renderLogs();
    }
  }, 1000);
}

function isGatherSelectActive_() {
  const ae = document.activeElement;
  if (!ae) return false;
  return ae.matches?.("select[data-gather-hero], select[data-gather-duration]") || false;
}

function tickBuildQueue_() {
  sanitizeBuildQueue_();
  if (!state.buildQueue.length) return false;
  const now = Date.now();
  let changed = false;
  // 修复旧存档／异常：active 但 endAt 未写入 → 倒数归零后永远「施工中」
  state.buildQueue.forEach((q) => {
    if (q.status !== "active") return;
    if (!Number.isFinite(q.sec) || q.sec <= 0) return;
    if (!Number.isFinite(q.endAt) || q.endAt <= 0 || !Number.isFinite(q.startAt) || q.startAt <= 0) {
      q.startAt = now;
      q.endAt = now + q.sec * 1000;
      changed = true;
    }
  });
  const done = state.buildQueue.filter(
    (q) => q.status === "active" && Number(q.endAt || 0) > 0 && now >= q.endAt
  );
  if (done.length) {
    done.forEach((t) => {
      const cur = Number(state.buildings[t.id] || t.fromLv || 1);
      state.buildings[t.id] = Math.max(cur, Number(t.fromLv || 1) + 1);
      const def = BUILDING_DEFS.find((x) => x.id === t.id);
      logEvent("施工", `${def?.name || t.id} 升级完成`);
    });
    state.buildQueue = state.buildQueue.filter(
      (q) => !(q.status === "active" && Number(q.endAt || 0) > 0 && now >= q.endAt)
    );
    changed = true;
  }
  sanitizeBuildQueue_();
  assignBuildSlots_();
  return changed;
}

function assignBuildSlots_() {
  sanitizeBuildQueue_();
  const now = Date.now();
  const active = state.buildQueue.filter((q) => q.status === "active").length;
  let free = Math.max(0, maxBuildQueue_() - active);
  if (!free) return;
  for (const q of state.buildQueue) {
    if (free <= 0) break;
    if (q.status === "pending") {
      q.status = "active";
      q.startAt = now;
      q.endAt = now + q.sec * 1000;
      free -= 1;
    }
  }
}

function sanitizeBuildQueue_() {
  if (!Array.isArray(state.buildQueue)) state.buildQueue = [];
  const now = Date.now();
  const dedup = new Map();
  state.buildQueue
    .map((q) => {
      const sec = Number(q.sec || 10);
      let startAt = Number(q.startAt || 0);
      let endAt = Number(q.endAt || 0);
      const status = q.status === "active" ? "active" : "pending";
      if (status === "active" && Number.isFinite(sec) && sec > 0 && (!Number.isFinite(endAt) || endAt <= 0)) {
        startAt = Number.isFinite(startAt) && startAt > 0 ? startAt : now;
        endAt = startAt + sec * 1000;
      }
      return {
        id: q.id,
        fromLv: Number(q.fromLv || 1),
        sec,
        startAt,
        endAt,
        status,
      };
    })
    .filter((q) => q.id && Number.isFinite(q.sec) && q.sec > 0)
    .forEach((q) => {
      const curLv = Number(state.buildings?.[q.id] || 1);
      // 旧存档可能残留已过期施工项，会导致同建筑永远无法再次升级
      if (q.fromLv < curLv) return;
      const prev = dedup.get(q.id);
      if (!prev) {
        dedup.set(q.id, q);
        return;
      }
      if (prev.status !== "active" && q.status === "active") {
        dedup.set(q.id, q);
        return;
      }
      if (q.fromLv >= prev.fromLv) dedup.set(q.id, q);
    });
  state.buildQueue = Array.from(dedup.values());
}

function useSpeedupOnBuildQueue() {
  if (!state.buildQueue.length) return alert("当前没有施工任务");
  if ((state.items.speedup || 0) <= 0) return alert("没有加速道具");
  const now = Date.now();
  state.items.speedup -= 1;
  const reduceMs = 60 * 1000;
  state.buildQueue.forEach((q) => {
    if (q.status === "active") q.endAt -= reduceMs;
    if (q.status === "pending") {
      q.sec = Math.max(1, q.sec - 60);
    }
  });
  tickBuildQueue_();
  const lines = state.buildQueue.map((q, i) => {
    const def = BUILDING_DEFS.find((x) => x.id === q.id);
    const name = def?.name || q.id;
    if (q.status === "active" && q.endAt) {
      const rem = Math.max(0, Math.ceil((q.endAt - now) / 1000));
      return `${i + 1}. ${name}（施工中）剩余约 ${rem}s`;
    }
    if (q.status === "pending") return `${i + 1}. ${name}（待开工）总 ${q.sec || 0}s`;
    return "";
  }).filter(Boolean);
  logEvent("道具", "使用加速道具，施工任务 -60s");
  const detail = lines.length ? `\n${lines.slice(0, 5).join("\n")}${lines.length > 5 ? "\n…" : ""}` : "";
  alert(`已消耗 1 张加速券：每项「施工中」已缩短 60 秒；「待开工」总工期 -60 秒。${detail}`);
  save();
  renderBuildQueue();
  renderCity();
  renderBag_();
  renderLogs();
}

function useSpeedupOnGatherNode_(nodeId, ticketCount) {
  let n = Math.floor(Number(ticketCount));
  if (!Number.isFinite(n) || n < 1) n = 1;
  const have = Number(state.items.speedup || 0);
  if (have <= 0) return alert("没有加速券");
  n = Math.min(n, have);
  const s = state.gatherNodes[nodeId];
  if (!s?.running) return alert("此节点未在采集");
  const now = Date.now();
  const def = GATHER_NODE_DEFS.find((x) => x.id === nodeId);
  if (def && (!Number.isFinite(s.endAt) || s.endAt <= 0)) {
    const dur = calcGatherDurationSec_(def, s.heroId || "", Number(s.durationMin || 15));
    const t0 = Number.isFinite(s.startAt) && s.startAt > 0 ? s.startAt : now;
    s.startAt = t0;
    s.endAt = t0 + dur * 1000;
  }
  if (now >= Number(s.endAt || 0)) return alert("采集已结束，请领取");
  const before = Math.max(0, Math.ceil((Number(s.endAt) - now) / 1000));
  const reduceMs = n * GATHER_SPEEDUP_SEC_PER_TICKET * 1000;
  state.items.speedup -= n;
  s.endAt = Math.max(now, Number(s.endAt) - reduceMs);
  const after = Math.max(0, Math.ceil((Number(s.endAt) - now) / 1000));
  const shortened = Math.max(0, before - after);
  const nodeName = def?.name || nodeId;
  logEvent("采集", `已使用 ${n} 张加速券（${nodeName} 倒数 ${before}s → ${after}s）`);
  alert(
    `已消耗 ${n} 张加速券（每张缩短 ${GATHER_SPEEDUP_SEC_PER_TICKET} 秒，本节点约缩短 ${shortened} 秒）\n${nodeName} 采集倒数：${before} 秒 → ${after} 秒`
  );
  save();
  renderGatherNodes();
  renderCity();
  renderBag_();
}

function resolveSkillCfg_(sid) {
  if (!sid) return null;
  const id = String(sid);
  const fromDef = DEFAULT_GAMEPLAY.skills[id];
  const fromGp = gameplay?.skills?.[id];
  const merged = { ...(fromDef && typeof fromDef === "object" ? fromDef : {}), ...(fromGp && typeof fromGp === "object" ? fromGp : {}) };
  return Object.keys(merged).length ? merged : null;
}

function skillDescText_(s) {
  if (!s) return "";
  if (s.desc) return s.desc;
  const bits = [];
  if (s.dmgBoost) bits.push(`战斗伤害约 +${Math.round(Number(s.dmgBoost) * 100)}%`);
  if (s.moraleBoost) bits.push(`士气 +${s.moraleBoost}`);
  if (s.gatherYieldPct) bits.push(`采集收益约 +${Math.round(Number(s.gatherYieldPct) * 100)}%`);
  if (s.gatherSpeedPct) bits.push(`采集加速约 +${Math.round(Number(s.gatherSpeedPct) * 100)}%`);
  if (s.atkPct) bits.push(`攻击约 +${Math.round(Number(s.atkPct) * 100)}%`);
  if (s.hpPct) bits.push(`生命约 +${Math.round(Number(s.hpPct) * 100)}%`);
  if (s.teamDmgPct) bits.push(`全队伤害约 +${Math.round(Number(s.teamDmgPct) * 100)}%`);
  if (s.enemyDmgDown) bits.push(`敌方伤害约 -${Math.round(Number(s.enemyDmgDown) * 100)}%`);
  if (s.chargeNeed && s.type === "active") bits.push(`能量 ${s.chargeNeed} 释放`);
  return bits.join("；") || "";
}

function openHeroDetailModal_(heroId) {
  const modal = byId("hero-detail-modal");
  const body = byId("hero-detail-body");
  const title = byId("hero-detail-title");
  const h = state.heroes.find((x) => x.id === heroId);
  if (!modal || !body || !h) return;
  const defH = heroDefById_(h.id) || {};
  const slotIds = [
    h.activeSkillId || defH.activeSkillId,
    h.passiveSkillId || defH.passiveSkillId,
    h.gatherSkillId || defH.gatherSkillId,
    h.battleExtraSkillId || defH.battleExtraSkillId,
  ];
  const slots = [
    ["主动战斗", slotIds[0]],
    ["被动／特性", slotIds[1]],
    ["采集协助", slotIds[2]],
    ["追加战术", slotIds[3]],
  ]
    .map(([lab, sid]) => {
      const s = resolveSkillCfg_(sid);
      const name = s?.name || (sid ? `未注册（${sid}）` : "未配置");
      const desc =
        skillDescText_(s) ||
        (s?.name && sid
          ? `「${s.name}」：请在玩法配置 JSON 的 skills 中为「${sid}」补上 desc 或数值栏位（如 dmgBoost、atkPct）。`
          : sid
            ? "请在「设定 → 玩法配置」为此技能编号补上定义，或重置为预设宝可梦资料。"
            : "此栏位缺资料；已尝试套用预设英雄表，若仍空白请重置玩法配置。");
      return `<div class="hero-skill-pill"><strong>${lab}：</strong>${name}<div class="muted">${desc}</div></div>`;
    })
    .join("");
  const needLv = Number(h.evolveAtLevel || 999);
  const nextDef = h.evolveToId ? heroDefById_(h.evolveToId) : null;
  const costEvo = { steel: 100 + h.stars * 45, food: 90 + h.stars * 35 };
  const stone = evoStoneDefForRole_(h.role);
  const haveStone = inventoryQty_(stone.id) >= 1;
  const canEvo = !!(h.evolveToId && nextDef && h.level >= needLv && haveStone && canAfford(costEvo));
  let evoLine = "";
  if (!h.evolveToId) evoLine = "已为最终型态，无法进化。";
  else if (!nextDef) evoLine = "进化资料缺失，请检查玩法配置。";
  else if (h.level < needLv) {
    evoLine = `进化为「${nextDef.name}」需 <strong>Lv.${needLv}</strong>（目前 Lv.${h.level}）、${fmtRes(costEvo)} 与 ${stone.icon} ${stone.name}×1。`;
  } else {
    evoLine = `可进化为「${nextDef.name}」，将消耗 ${fmtRes(costEvo)} 与 ${stone.icon} ${stone.name}×1（持有 ${inventoryQty_(stone.id)}）。`;
    if (!haveStone) evoLine += " <strong>进化石不足。</strong>";
    if (!canAfford(costEvo)) evoLine += " <strong>粮食／钢材不足。</strong>";
  }
  const books = (state.inventory || []).filter(
    (row) => inventoryRowKind_(row) === "skillbook" && inventoryRowRole_(row) === h.role
  );
  const booksHtml = books.length
    ? books
        .map((row) => {
          const s = resolveSkillCfg_(row.skillId);
          const sn = escapeHtml_(s?.name || row.skillId);
          return `<div class="hero-book-row"><span>${row.icon || "📕"} ${escapeHtml_(row.name)} → ${sn}（${escapeHtml_(row.slot)}）</span><button type="button" class="slg-inline-btn" data-learn-skill="${escapeHtml_(row.id)}">研读</button></div>`;
        })
        .join("")
    : `<div class="muted">背包中无与「${escapeHtml_(h.role)}」属性相符的技能书。</div>`;
  title.textContent = `${h.name} 详情`;
  body.innerHTML = `
    <div class="hero-detail-top">
      <img class="hero-detail-sprite" src="${getHeroAvatar(h.id)}" alt="" />
      <div>
        <div><strong>Lv.</strong>${h.level}　★${h.stars}　<span class="muted">${h.role}</span></div>
        <div class="hero-statline">ATK ${h.atk}+${h.bonusAtk || 0} · HP ${h.hp}+${h.bonusHp || 0}</div>
        <div class="muted">EXP ${Number(h.exp || 0)}/${heroExpNeed_(h.level)}</div>
        <div class="hero-evolve-hint muted">${evoLine}</div>
      </div>
    </div>
    <div class="hero-skill-grid">${slots}</div>
    <div class="hero-skillbooks">
      <div class="muted"><strong>技能书研读</strong>（须与宝可梦属性相同，消耗 1 本）</div>
      ${booksHtml}
    </div>
    <div class="row">
      <button type="button" id="hero-detail-evolve" ${canEvo ? "" : "disabled"}>进化</button>
      <button type="button" id="hero-detail-star" ${h.stars >= 6 ? "disabled" : ""}>升星</button>
    </div>
  `;
  byId("hero-detail-evolve").onclick = () => {
    tryEvolveHero_(heroId);
    closeModalWithAnim_("hero-detail-modal");
  };
  byId("hero-detail-star").onclick = () => {
    tryHeroStarUp_(heroId);
    closeModalWithAnim_("hero-detail-modal");
  };
  body.querySelectorAll("[data-learn-skill]").forEach((btn) => {
    btn.onclick = () => {
      const bid = btn.getAttribute("data-learn-skill");
      if (tryLearnSkillBook_(heroId, bid)) closeModalWithAnim_("hero-detail-modal");
    };
  });
  modal.classList.remove("hidden");
}

function tryEvolveHero_(heroId) {
  const h = state.heroes.find((x) => x.id === heroId);
  const defNext = h?.evolveToId ? heroDefById_(h.evolveToId) : null;
  if (!h || !defNext) return alert("此宝可梦无法进化或资料不完整");
  if (h.level < (h.evolveAtLevel || 999)) return alert(`等级不足：需要 Lv.${h.evolveAtLevel || 16}`);
  const cost = { steel: 100 + h.stars * 45, food: 90 + h.stars * 35 };
  const stone = evoStoneDefForRole_(h.role);
  if (inventoryQty_(stone.id) < 1) {
    return alert(`进化需要 ${stone.icon} ${stone.name}×1（重复寻访可获得对应属性进化石，已放入背包）`);
  }
  if (!canAfford(cost)) {
    alert(`进化素材不足：需要 ${fmtRes(cost)}`);
    return;
  }
  if (!confirm(`消耗 ${fmtRes(cost)} 与 ${stone.icon} ${stone.name}×1，将「${h.name}」进化为「${defNext.name}」？`)) return;
  pay(cost);
  if (!consumeInventoryItem_(stone.id, 1)) {
    alert("进化石扣除失败");
    return;
  }
  const oldId = h.id;
  Object.assign(h, {
    id: defNext.id,
    name: defNext.name,
    role: defNext.role,
    atk: defNext.atk,
    hp: defNext.hp,
    slug: defNext.slug,
    activeSkillId: defNext.activeSkillId,
    passiveSkillId: defNext.passiveSkillId,
    gatherSkillId: defNext.gatherSkillId,
    battleExtraSkillId: defNext.battleExtraSkillId,
    evolveToId: defNext.evolveToId || "",
    evolveAtLevel: Number.isFinite(defNext.evolveAtLevel) ? defNext.evolveAtLevel : 999,
  });
  state.squad = state.squad.map((s) => (s === oldId ? h.id : s));
  state.skillCharge[h.id] = state.skillCharge[h.id] || 0;
  delete state.skillCharge[oldId];
  alert(`进化成功！现在是「${h.name}」`);
  logEvent("英雄", `进化：${h.name}`);
  save();
  renderAll();
}

function tryHeroStarUp_(heroId) {
  const h = state.heroes.find((x) => x.id === heroId);
  if (!h) return;
  if (h.stars >= 6) return alert("星数已达上限（6）");
  const gems = Math.max(1, Math.floor((22 + h.stars * 22) / 5));
  const steel = 70 + h.stars * 48;
  if ((state.items.gems || 0) < gems || (state.resources.steel || 0) < steel) {
    alert(`升星需要 💎${gems} 与 钢材 ${steel}（目前不足）`);
    return;
  }
  if (!confirm(`消耗 💎${gems}、钢材 ${steel} 提升星数？`)) return;
  state.items.gems -= gems;
  state.resources.steel -= steel;
  h.stars += 1;
  h.atk = Math.floor(h.atk * 1.07);
  h.hp = Math.floor(h.hp * 1.07);
  alert(`升星成功！${h.name} 现在 ★${h.stars}（已消耗 💎${gems}、钢材 ${steel}）`);
  logEvent("英雄", `${h.name} 升星 → ★${h.stars}`);
  save();
  renderAll();
}

function renderHeroes() {
  const wrap = byId("heroes");
  const capEl = byId("squad-cap-title");
  if (capEl) capEl.textContent = `当前出战上限（3~6）：${maxSquadSize_()}`;
  const roleOpts = ["", ...Array.from(new Set((state.heroes || []).map((h) => h.role).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-Hans"))];
  const chips = roleOpts
    .map((r) => {
      const active = squadHeroRoleFilter_ === r;
      const lab = r ? escapeHtml_(r) : "全部属性";
      return `<button type="button" class="squad-filter-chip ${active ? "is-active" : ""}" data-squad-role="${escapeHtml_(r)}">${lab}</button>`;
    })
    .join("");
  wrap.innerHTML = `<div class="squad-filter-bar"><span class="muted squad-filter-label">筛选</span><div class="squad-filter-chips">${chips}</div><button type="button" class="slg-inline-btn" id="btn-squad-recommend">推荐编队</button></div><div class="muted" style="margin:6px 2px 10px;">等级说明：英雄经验来自主线战斗/野外战斗胜利；强化/连升也会追加经验并自动升级，等级上限受天数、中央熔炉与训练营限制。</div><div class="hero-roster-grid"></div>`;
  byId("btn-squad-recommend")?.addEventListener("click", () => recommendSquad_());
  wrap.querySelectorAll("[data-squad-role]").forEach((btn) => {
    btn.onclick = () => {
      squadHeroRoleFilter_ = btn.getAttribute("data-squad-role") || "";
      renderHeroes();
    };
  });
  const grid = wrap.querySelector(".hero-roster-grid");
  const list = squadHeroRoleFilter_ ? state.heroes.filter((h) => h.role === squadHeroRoleFilter_) : state.heroes;
  list.forEach((h) => {
    const active = state.squad.includes(h.id);
    const avatar = getHeroAvatar(h.id);
    const div = document.createElement("div");
    div.className = "card hero-card-mini";
    const ba = Number(h.bonusAtk || 0);
    const bh = Number(h.bonusHp || 0);
    const upTier = ba + bh;
    const wood = 32 + upTier * 10;
    const food = 28 + upTier * 9;
    const canUp = canAfford({ wood, food });
    div.innerHTML = `
      <div class="hero-card ${ba + bh > 0 ? "hero-card-boosted" : ""}" data-open-hero="${h.id}">
        <img class="hero-avatar" src="${avatar}" alt="${h.name}" />
        <div>
          <div><strong>${h.name}</strong> (${h.role})</div>
          <div class="muted">Lv${h.level} / ★${h.stars} · EXP ${Number(h.exp || 0)}/${heroExpNeed_(h.level)}</div>
          <div class="hero-statline">ATK ${h.atk}<span class="hero-bonus">+${ba}</span> · HP ${h.hp}<span class="hero-bonus">+${bh}</span></div>
          <div class="row hero-actions">
            <button type="button" data-hero="${h.id}">${active ? "移出编队" : "加入编队"}</button>
            <button type="button" class="hero-up-btn ${canUp ? "" : "hero-up-btn-muted"}" data-hero-up="${h.id}" title="木${wood} 粮${food}">强化</button>
            <button type="button" class="hero-up-max ${canUp ? "" : "hero-up-btn-muted"}" data-hero-up-max="${h.id}" title="资源足够时连续强化至上限">连升</button>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(div);
  });
  grid.querySelectorAll("[data-open-hero]").forEach((el) => {
    el.addEventListener("click", (ev) => {
      if (ev.target.closest("button")) return;
      openHeroDetailModal_(el.getAttribute("data-open-hero"));
    });
  });
  grid.querySelectorAll("button[data-hero]").forEach((btn) => {
    btn.onclick = () => toggleSquad(btn.dataset.hero);
  });
  grid.querySelectorAll("button[data-hero-up]").forEach((btn) => {
    btn.onclick = () => tryHeroUpgrade_(btn.getAttribute("data-hero-up"));
  });
  grid.querySelectorAll("button[data-hero-up-max]").forEach((btn) => {
    btn.onclick = () => tryHeroUpgradeMax_(btn.getAttribute("data-hero-up-max"));
  });

  byId("squad").innerHTML = state.squad
    .map((id) => state.heroes.find((h) => h.id === id)?.name || id)
    .join(" / ");
}

function marchWinHintText_() {
  const ep = calcEnemyPower();
  const mp = calcBattlePowerDisplay_();
  if (ep <= 0) return "无法评估敌方强度";
  const r = mp / ep;
  if (r < 0.55) return "本次出征几乎不可能获胜";
  if (r < 0.85) return "胜算偏低，建议提升兵力或英雄";
  if (r < 1.15) return "势均力敌，请谨慎出击";
  return "胜算良好";
}

function adjustMarch_(key, delta) {
  const cap = maxMarchUnits_();
  const m = {
    shield: Number(state.march?.shield) || 0,
    spear: Number(state.march?.spear) || 0,
    bow: Number(state.march?.bow) || 0,
  };
  m[key] = Math.max(0, m[key] + delta);
  let tot = m.shield + m.spear + m.bow;
  if (tot > cap) m[key] = Math.max(0, m[key] - (tot - cap));
  state.march = m;
  save();
  renderMarchExpedition_();
  renderBattle();
}

function renderMarchExpedition_() {
  const root = byId("march-panel");
  if (!root) return;
  const cap = maxMarchUnits_();
  const m = state.march || { shield: 0, spear: 0, bow: 0 };
  const tot = totalMarchUnits_();
  const hint = marchWinHintText_();
  const hintCls = hint.includes("不可能") ? "march-hint-bad" : hint.includes("偏低") ? "march-hint-warn" : "march-hint-ok";
  const allies = state.heroes.filter((h) => state.squad.includes(h.id));
  const heroSlots = Array.from({ length: maxSquadSize_() }, (_, i) => i)
    .map((i) => {
      const h = allies[i];
      if (!h) return `<div class="march-hero-slot empty"><span>空位</span></div>`;
      const av = getHeroAvatar(h.id);
      const stars = `${"★".repeat(Math.min(5, h.stars))}${"☆".repeat(Math.max(0, 5 - h.stars))}`;
      return `<div class="march-hero-slot"><img src="${av}" alt=""/><div class="march-hero-cap">Lv.${h.level}</div><div class="march-hero-stars">${stars}</div></div>`;
    })
    .join("");
  const row = (key, label) => {
    const v = clamp(Number(m[key]) || 0, 0, cap);
    const pct = cap ? Math.floor((v / cap) * 100) : 0;
    return `<div class="march-troop-card" data-troop="${key}">
      <div class="march-troop-head"><span>${label}</span><span>${v} / ${cap}</span></div>
      <div class="march-troop-bar"><i style="width:${pct}%"></i></div>
      <div class="march-troop-ctl">
        <button type="button" data-dm="${key}">-</button>
        <button type="button" data-dp="${key}">+</button>
      </div>
    </div>`;
  };
  root.innerHTML = `
    <div class="march-topline">
      <span class="muted">兵力</span> <strong>${tot} / ${cap}</strong>
      <span class="muted">｜</span>
      <span class="muted">编队</span> <strong>${Math.floor(calcMyPower())}</strong>
      <span class="muted">+兵力</span> <strong>${calcMarchPower_()}</strong>
      <span class="muted">｜总战力</span> <strong>${Math.floor(calcBattlePowerRaw_())}</strong>
      <span class="muted">｜实战战力</span> <strong>${Math.floor(calcBattlePowerDisplay_())}</strong>
    </div>
    <div class="march-hero-row">${heroSlots}</div>
    <p class="march-win-hint ${hintCls}">${hint}</p>
    <div class="march-troop-list">
      ${row("shield", "盾兵")}
      ${row("spear", "矛兵")}
      ${row("bow", "射手")}
    </div>
    <div class="row march-quick">
      <button type="button" id="btn-march-clear">清空兵力</button>
      <button type="button" id="btn-march-fill">一键配比</button>
    </div>
  `;
  root.querySelectorAll("button[data-dm]").forEach((btn) => {
    btn.onclick = () => adjustMarch_(btn.getAttribute("data-dm"), -Math.max(1, Math.ceil(cap * 0.06)));
  });
  root.querySelectorAll("button[data-dp]").forEach((btn) => {
    btn.onclick = () => adjustMarch_(btn.getAttribute("data-dp"), Math.max(1, Math.ceil(cap * 0.06)));
  });
  const clr = byId("btn-march-clear");
  if (clr)
    clr.onclick = () => {
      state.march = { shield: 0, spear: 0, bow: 0 };
      save();
      renderMarchExpedition_();
      renderBattle();
    };
  const fil = byId("btn-march-fill");
  if (fil)
    fil.onclick = () => {
      const c = maxMarchUnits_();
      const a = Math.floor(c * 0.34);
      const b = Math.floor(c * 0.34);
      state.march = { shield: a, spear: b, bow: Math.max(0, c - a - b) };
      save();
      renderMarchExpedition_();
      renderBattle();
    };
}

function heroUpgradeCostForTier_(tier) {
  return { wood: 32 + tier * 10, food: 28 + tier * 9 };
}

function heroTier_(h) {
  return Number(h.bonusAtk || 0) + Number(h.bonusHp || 0);
}

/** 执行一次强化（需已确认资源）；返回 { ok, atkUp, wood, food } */
function applyHeroUpgradeOnce_(h) {
  const tier = heroTier_(h);
  const { wood, food } = heroUpgradeCostForTier_(tier);
  if (!canAfford({ wood, food })) return { ok: false };
  pay({ wood, food });
  const atkUp = Math.random() < 0.55;
  if (atkUp) h.bonusAtk = Number(h.bonusAtk || 0) + 1;
  else h.bonusHp = Number(h.bonusHp || 0) + 4;
  // 强化同时累积经验并触发升级，避免“连升不涨等级”的割裂体验
  const cap = heroLevelCap_();
  if (Number(h.level || 1) < cap) h.level = Number(h.level || 1) + 1;
  if (Number(h.level || 1) >= cap) h.exp = 0;
  return { ok: true, atkUp, wood, food };
}

function tryHeroUpgrade_(heroId) {
  const h = state.heroes.find((x) => x.id === heroId);
  if (!h) return;
  const tier = heroTier_(h);
  const { wood, food } = heroUpgradeCostForTier_(tier);
  if (!canAfford({ wood, food })) {
    const miss = [];
    if ((state.resources.wood || 0) < wood) miss.push(`木材尚缺 ${wood - (state.resources.wood || 0)}`);
    if ((state.resources.food || 0) < food) miss.push(`粮食尚缺 ${food - (state.resources.food || 0)}`);
    alert(`无法强化「${h.name}」\n${miss.join("；")}`);
    return;
  }
  if (!confirm(`强化「${h.name}」将消耗 木材 ${wood}、粮食 ${food}，是否继续？`)) return;
  const r = applyHeroUpgradeOnce_(h);
  if (!r.ok) return;
  alert(
    r.atkUp
      ? `强化成功！攻击加成 +1（已消耗木材 ${r.wood}、粮食 ${r.food}）`
      : `强化成功！生命加成 +4（已消耗木材 ${r.wood}、粮食 ${r.food}）`
  );
  logEvent("英雄", `${h.name} 强化成功`);
  save();
  renderHeroes();
  renderBattle();
  renderMarchExpedition_();
}

function tryHeroUpgradeMax_(heroId) {
  const h = state.heroes.find((x) => x.id === heroId);
  if (!h) return;
  const lvCap = heroLevelCap_();
  const lvRoom = Math.max(0, lvCap - Number(h.level || 1));
  if (lvRoom <= 0) return alert(`「${h.name}」已达当前等级上限 Lv${lvCap}，请先提升等级上限后再连升。`);
  let simTier = heroTier_(h);
  let maxN = 0;
  const w0 = state.resources.wood || 0;
  const f0 = state.resources.food || 0;
  let accW = 0;
  let accF = 0;
  while (maxN < 400) {
    const { wood, food } = heroUpgradeCostForTier_(simTier);
    if (accW + wood > w0 || accF + food > f0) break;
    accW += wood;
    accF += food;
    simTier += 1;
    maxN += 1;
  }
  maxN = Math.min(maxN, lvRoom);
  if (maxN < 1) {
    const { wood, food } = heroUpgradeCostForTier_(heroTier_(h));
    const miss = [];
    if (w0 < wood) miss.push(`木材尚缺 ${wood - w0}`);
    if (f0 < food) miss.push(`粮食尚缺 ${food - f0}`);
    return alert(`无法连续强化「${h.name}」\n${miss.join("；")}`);
  }
  if (!confirm(`将连续强化「${h.name}」最多 ${maxN} 次，预计消耗 木材 ${accW}、粮食 ${accF}（每次随机攻击+1 或 生命+4）？`)) return;
  let n = 0;
  let atkG = 0;
  let hpG = 0;
  let spentW = 0;
  let spentF = 0;
  while (n < maxN) {
    const r = applyHeroUpgradeOnce_(h);
    if (!r.ok) break;
    spentW += r.wood;
    spentF += r.food;
    if (r.atkUp) atkG += 1;
    else hpG += 1;
    n += 1;
  }
  logEvent("英雄", `${h.name} 连续强化 ×${n}（攻击+${atkG} 次 / 生命+${hpG} 次）`);
  save();
  renderHeroes();
  renderBattle();
  renderMarchExpedition_();
  alert(`已完成 ${n} 次强化：攻击加成累计 +${atkG}（每次+1）、生命加成累计 +${hpG * 4}（每次+4）；消耗 木材 ${spentW}、粮食 ${spentF}`);
}

function renderBagFilterBar_() {
  const bar = byId("bag-filter-bar");
  if (!bar) return;
  const inv = Array.isArray(state.inventory) ? state.inventory : [];
  const kinds = [
    { id: "all", label: "全部" },
    { id: "skillbook", label: "技能书" },
    { id: "evostone", label: "进化石" },
    { id: "other", label: "其他" },
  ];
  const kindChips = kinds
    .map(
      (k) =>
        `<button type="button" class="bag-filter-chip ${bagFilterKind_ === k.id ? "is-active" : ""}" data-bag-kind="${k.id}">${k.label}</button>`
    )
    .join("");
  let roleSection = "";
  if (bagFilterKind_ === "skillbook" || bagFilterKind_ === "evostone") {
    const pool = inv.filter((r) => inventoryRowKind_(r) === bagFilterKind_);
    const roles = [...new Set(pool.map((r) => inventoryRowRole_(r)).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "zh-Hans")
    );
    const roleChips = [
      `<button type="button" class="bag-filter-chip bag-filter-chip--role ${!bagFilterRole_ ? "is-active" : ""}" data-bag-role="">全部属性</button>`,
      ...roles.map(
        (r) =>
          `<button type="button" class="bag-filter-chip bag-filter-chip--role ${bagFilterRole_ === r ? "is-active" : ""}" data-bag-role="${escapeHtml_(
            r
          )}">${escapeHtml_(r)}</button>`
      ),
    ].join("");
    roleSection = `<div class="bag-filter-row"><span class="bag-filter-label muted">属性</span><div class="bag-filter-chips">${roleChips}</div></div>`;
  }
  bar.innerHTML = `<div class="bag-filter-row"><span class="bag-filter-label muted">类型</span><div class="bag-filter-chips">${kindChips}</div></div>${roleSection}`;
  bar.querySelectorAll("[data-bag-kind]").forEach((btn) => {
    btn.onclick = () => {
      const next = btn.getAttribute("data-bag-kind") || "all";
      bagFilterKind_ = next;
      if (bagFilterKind_ !== "skillbook" && bagFilterKind_ !== "evostone") bagFilterRole_ = "";
      renderBag_();
    };
  });
  bar.querySelectorAll("[data-bag-role]").forEach((btn) => {
    btn.onclick = () => {
      bagFilterRole_ = btn.getAttribute("data-bag-role") || "";
      renderBag_();
    };
  });
}

function bagRowPassesFilter_(row) {
  const kind = inventoryRowKind_(row);
  if (bagFilterKind_ === "all") return true;
  if (bagFilterKind_ === "skillbook") {
    if (kind !== "skillbook") return false;
    if (!bagFilterRole_) return true;
    return inventoryRowRole_(row) === bagFilterRole_;
  }
  if (bagFilterKind_ === "evostone") {
    if (kind !== "evostone") return false;
    if (!bagFilterRole_) return true;
    return inventoryRowRole_(row) === bagFilterRole_;
  }
  if (bagFilterKind_ === "other") return kind === "other" || kind === "resticket";
  return true;
}

function renderBag_() {
  const w = byId("inventory");
  if (!w) return;
  renderBagFilterBar_();
  const inv = Array.isArray(state.inventory) ? state.inventory : [];
  const filtered = inv.filter(bagRowPassesFilter_);
  const rows = filtered.length
    ? filtered
        .map((it) => {
          const kind = inventoryRowKind_(it);
          const actions =
            kind === "resticket"
              ? `<div class="bag-ticket-actions"><button type="button" class="slg-inline-btn" data-ticket-redeem="${escapeHtml_(
                  it.id
                )}">兑现 ${RESOURCE_TICKET_UNIT}</button><button type="button" class="slg-inline-btn" data-ticket-speed="${escapeHtml_(
                  it.id
                )}">换加速券 1:1</button></div>`
              : "";
          return `<div class="bag-slot"><span class="bag-ico">${it.icon || "📦"}</span><div><strong>${escapeHtml_(
            it.name || it.id
          )}</strong><div class="muted">x${it.qty ?? 1}</div>${actions}</div></div>`;
        })
        .join("")
    : `<div class="muted">${inv.length ? "当前筛选条件下无道具" : "尚无道具（完成任务或战斗可扩充此栏位）"}</div>`;
  const speed = state.items?.speedup || 0;
  const showSpeed = bagFilterKind_ === "all" || bagFilterKind_ === "other";
  const speedSlot = showSpeed
    ? `<div class="bag-slot bag-slot-key"><span class="bag-ico">⚡</span><div><strong>加速券</strong><div class="muted">x${speed}</div></div></div>`
    : "";
  w.innerHTML = `
    <div class="bag-grid">
      ${speedSlot}
      ${rows}
    </div>
  `;
  w.querySelectorAll("[data-ticket-redeem]").forEach((btn) => {
    btn.onclick = () => useResourceTicket_(btn.getAttribute("data-ticket-redeem"), "res");
  });
  w.querySelectorAll("[data-ticket-speed]").forEach((btn) => {
    btn.onclick = () => useResourceTicket_(btn.getAttribute("data-ticket-speed"), "speed");
  });
}

function renderActivitiesHub_() {
  const body = byId("activities-hub-body");
  if (!body) return;
  normalizeActivity_();
  ensureActivityMinigames_();
  const a = state.activity;
  const today = isoDateLocal_();
  const mg = state.activityMinigames;
  let bearLine = "";
  if (mg.bearDay !== today) bearLine = "今日尚未遭遇野熊，点击下方开始讨伐。";
  else if (mg.bearDefeated) bearLine = "今日已成功讨伐野熊。";
  else bearLine = `野熊剩余 HP：约 ${Math.max(0, Math.floor(Number(mg.bearHp) || 0))}`;
  const mineLine =
    mg.mineDay !== today ? "今日开凿：0 / 10" : `今日开凿：${mg.minePick} / 10`;
  const spinDone = mg.spinDay === today;
  const bearBtnOff = mg.bearDay === today && mg.bearDefeated;
  const mineBtnOff = mg.mineDay === today && mg.minePick >= 10;
  const checked = a.checkInDate === today;
  const milestones = [
    { thr: 40, gems: 2 },
    { thr: 80, gems: 5 },
    { thr: 140, gems: 10 },
    { thr: 220, gems: 18 },
  ];
  const lordRows = milestones
    .map((m) => {
      const done = !!a.lordClaims[`m${m.thr}`];
      const ok = (a.lordPts || 0) >= m.thr;
      return `<div class="activities-lord-row"><span>积分 ≥${m.thr} → ${m.gems} 💎</span><button type="button" class="slg-inline-btn" data-lord-claim="${m.thr}" ${
        done || !ok ? "disabled" : ""
      }>${done ? "已领" : ok ? "领取" : "未达成"}</button></div>`;
    })
    .join("");
  const offers = ACT_EVENT_OFFERS.map(
    (o) =>
      `<div class="activities-offer-row"><div><strong>${escapeHtml_(o.label)}</strong> <span class="muted">代币 ${o.cost}</span>${
        o.speedup ? ` <span class="muted">+加速×${o.speedup}</span>` : ""
      }</div><button type="button" class="slg-btn-yellow" data-act-offer="${escapeHtml_(o.id)}">兑换</button></div>`
  ).join("");
  const hub = typeof window !== "undefined" ? window.WOS_ACTIVITY_HUB : null;
  let wiki = "";
  if (hub) {
    wiki = `<details class="activities-wiki"><summary>玩法百科（参考寒霜类活动命名）</summary>`;
    wiki += `<p class="muted">${escapeHtml_(hub.intro || "")}</p>`;
    if (hub.refs && hub.refs.length) {
      wiki += `<ul class="activities-hub-reflist">`;
      for (const r of hub.refs) {
        const u = escapeHtml_(r.url || "");
        const lab = escapeHtml_(r.label || r.url || "");
        wiki += `<li><a href="${u}" target="_blank" rel="noopener noreferrer">${lab}</a></li>`;
      }
      wiki += `</ul>`;
    }
    wiki += `</details>`;
  }
  const tabs = [
    ["checkin", "签到"],
    ["shop", "商店"],
    ["lord", "领主"],
    ["minigame", "玩法"],
  ];
  const wheelUnlocked = (state.day || 1) >= 3 && (state.buildings?.heater || 1) >= 2;
  const bearUnlocked = (state.stage || 1) >= 4 && (state.buildings?.camp || 1) >= 3;
  const mineUnlocked = (state.buildings?.mine || 1) >= 3;
  const fishUnlocked = (state.day || 1) >= 5 && (state.buildings?.farm || 1) >= 3;
  const escortUnlocked = (state.stage || 1) >= 6 && (state.buildings?.camp || 1) >= 4;
  const wheelHint = wheelUnlocked ? "每日一次免费转盘" : "需要：第 3 天 + 中央熔炉 Lv2";
  const bearHint = bearUnlocked ? bearLine : "需要：关卡 ≥4 + 训练营 Lv3";
  const mineHint = mineUnlocked ? mineLine : "需要：矿坑 Lv3";
  const miniTabs = [
    ["bear", "雪原猎熊"],
    ["mine", "燃霜矿区"],
    ["spin", "幸运轮盘"],
    ["fish", "冰湖垂钓"],
    ["escort", "霜原护送"],
  ];
  const ensureMiniTab = miniTabs.some((x) => x[0] === activityMiniTab_) ? activityMiniTab_ : "bear";
  activityMiniTab_ = ensureMiniTab;
  body.innerHTML = `
    <div class="activities-tabbar">
      ${tabs
        .map(
          ([id, name]) =>
            `<button type="button" class="activities-tab ${activityHubTab_ === id ? "active" : ""}" data-act-tab="${id}">${name}</button>`
        )
        .join("")}
    </div>
    <section class="activities-play-block" style="${activityHubTab_ === "checkin" ? "" : "display:none"}">
      <h4 class="activities-hub-cat-title">每日签到</h4>
      <p class="muted">连续天数越高，当日木材／粮食与活动代币略增。</p>
      <button type="button" class="slg-btn-yellow" id="act-btn-checkin" ${checked ? "disabled" : ""}>${checked ? "今日已签到" : "今日签到"}</button>
      <p class="muted">连续：<strong>${a.streak || 0}</strong> 天</p>
    </section>
    <section class="activities-play-block" style="${activityHubTab_ === "shop" ? "" : "display:none"}">
      <h4 class="activities-hub-cat-title">活动代币商店</h4>
      <p class="muted">代币来源：关卡／野外战斗胜利、每日签到。用于兑换资源包（原型简化版「雪原贸易站」）。</p>
      <p>当前代币：<strong>${a.tokens || 0}</strong></p>
      <div class="activities-offer-list">${offers}</div>
    </section>
    <section class="activities-play-block" style="${activityHubTab_ === "lord" ? "" : "display:none"}">
      <h4 class="activities-hub-cat-title">最强领主（积分里程碑）</h4>
      <p class="muted">积分来源：战斗胜利、下达建筑升级、完成科技研究。达成档位可领钻石（原型简化）。</p>
      <p>当前积分：<strong>${a.lordPts || 0}</strong></p>
      <div class="activities-lord-list">${lordRows}</div>
    </section>
    <section class="activities-play-block activities-minigames" style="${activityHubTab_ === "minigame" ? "" : "display:none"}">
      <h4 class="activities-hub-cat-title">限时活动玩法</h4>
      <p class="muted">对照常见赛季活动做的可玩原型：猎熊讨伐、矿区开凿、幸运轮盘；各自每日单独结算，且需满足条件才可使用。</p>
      <div class="activities-minigame-tabbar">
        ${miniTabs
          .map(
            ([id, name]) =>
              `<button type="button" class="activities-minigame-tab ${activityMiniTab_ === id ? "active" : ""}" data-act-mini-tab="${id}">${name}</button>`
          )
          .join("")}
      </div>
      <div class="activities-minigame-grid">
        <div class="activities-minigame-card" style="${activityMiniTab_ === "bear" ? "" : "display:none"}">
          <strong>雪原猎熊</strong>
          <img class="activities-scene-img" alt="" src="https://play.pokemonshowdown.com/sprites/ani/ursaring.gif" />
          <p class="muted activities-minigame-hint">${escapeHtml_(bearHint)}</p>
          <button type="button" class="slg-btn-yellow" id="act-btn-bear" ${bearBtnOff || !bearUnlocked ? "disabled" : ""}>重击野熊</button>
        </div>
        <div class="activities-minigame-card" style="${activityMiniTab_ === "mine" ? "" : "display:none"}">
          <strong>燃霜矿区</strong>
          <img class="activities-scene-img" alt="" src="https://play.pokemonshowdown.com/sprites/ani/geodude.gif" />
          <p class="muted activities-minigame-hint">${escapeHtml_(mineHint)}</p>
          <button type="button" class="slg-btn-yellow" id="act-btn-mine" ${mineBtnOff || !mineUnlocked ? "disabled" : ""}>开凿矿脉</button>
        </div>
        <div class="activities-minigame-card" style="${activityMiniTab_ === "spin" ? "" : "display:none"}">
          <strong>幸运轮盘</strong>
          <div class="act-wheel-wrap">
            <div class="act-wheel" id="act-wheel"></div>
            <div class="act-wheel-pointer" aria-hidden="true">▲</div>
          </div>
          <p class="muted activities-minigame-hint">${spinDone ? "今日已转动" : wheelHint}</p>
          <button type="button" class="slg-btn-yellow" id="act-btn-spin" ${spinDone || !wheelUnlocked ? "disabled" : ""}>转动转盘</button>
          <div class="muted" id="act-spin-result"></div>
        </div>
        <div class="activities-minigame-card" style="${activityMiniTab_ === "fish" ? "" : "display:none"}">
          <strong>冰湖垂钓</strong>
          <img class="activities-scene-img" alt="" src="https://play.pokemonshowdown.com/sprites/ani/seel.gif" />
          <p class="muted activities-minigame-hint">${fishUnlocked ? "每日最多 5 次，随机获得粮食/代币/加速券" : "需要：第 5 天 + 农场 Lv3"}</p>
          <button type="button" class="slg-btn-yellow" id="act-btn-fish" ${fishUnlocked ? "" : "disabled"}>抛竿</button>
        </div>
        <div class="activities-minigame-card" style="${activityMiniTab_ === "escort" ? "" : "display:none"}">
          <strong>霜原护送</strong>
          <img class="activities-scene-img" alt="" src="https://play.pokemonshowdown.com/sprites/ani/growlithe.gif" />
          <p class="muted activities-minigame-hint">${escortUnlocked ? "每日 1 次，护送补给车获得资源与活动积分" : "需要：关卡 ≥6 + 训练营 Lv4"}</p>
          <button type="button" class="slg-btn-yellow" id="act-btn-escort" ${escortUnlocked ? "" : "disabled"}>执行护送</button>
        </div>
      </div>
    </section>
  `;
  body.querySelectorAll("[data-act-tab]").forEach((btn) => {
    btn.onclick = () => {
      activityHubTab_ = btn.getAttribute("data-act-tab") || "checkin";
      renderActivitiesHub_();
    };
  });
  body.querySelectorAll("[data-act-mini-tab]").forEach((btn) => {
    btn.onclick = () => {
      activityMiniTab_ = btn.getAttribute("data-act-mini-tab") || "bear";
      renderActivitiesHub_();
    };
  });
  byId("act-btn-checkin")?.addEventListener("click", () => claimActivityCheckIn_());
  byId("act-btn-bear")?.addEventListener("click", () => activityBearHit_());
  byId("act-btn-mine")?.addEventListener("click", () => activityMinePick_());
  byId("act-btn-fish")?.addEventListener("click", () => activityIceFish_());
  byId("act-btn-escort")?.addEventListener("click", () => activityEscort_());
  byId("act-btn-spin")?.addEventListener("click", () => {
    const wheel = byId("act-wheel");
    const out = byId("act-spin-result");
    if (wheel) {
      const turns = 6 + Math.floor(Math.random() * 4);
      const deg = turns * 360 + Math.floor(Math.random() * 360);
      wheel.style.setProperty("--spin-deg", `${deg}deg`);
      wheel.classList.remove("is-spinning");
      // force reflow
      void wheel.offsetWidth;
      wheel.classList.add("is-spinning");
    }
    setTimeout(() => {
      const msg = activitySpinWheel_(true);
      if (out && msg) out.textContent = `结果：${msg}`;
    }, 2300);
  });
  body.querySelectorAll("[data-act-offer]").forEach((btn) => {
    btn.onclick = () => buyActivityOffer_(btn.getAttribute("data-act-offer"));
  });
  body.querySelectorAll("[data-lord-claim]").forEach((btn) => {
    btn.onclick = () => tryClaimLordMilestone_(parseInt(btn.getAttribute("data-lord-claim"), 10));
  });
}

function openActivitiesHub_() {
  renderActivitiesHub_();
  byId("activities-hub-modal")?.classList.remove("hidden");
}

function renderAlliancePage_() {
  const w = byId("alliance-root");
  if (!w) return;
  const a = state.alliance || { name: "霜前哨站", level: 1, exp: 0, honorXp: 0, solo: true, perks: {} };
  const pk = a.perks || {};
  const lv = Math.min(ALLIANCE_MAX_LEVEL, Math.max(1, Number(a.level) || 1));
  const lb = allianceLevelBonus_();
  const pct = (x) => `${Math.round(Math.max(0, x) * 100)}%`;
  const needHonor = lv >= ALLIANCE_MAX_LEVEL ? 0 : allianceHonorNeed_(lv);
  const hx = Number(a.honorXp || 0);
  const honorPct = needHonor ? Math.min(100, Math.floor((hx / needHonor) * 100)) : 100;
  w.innerHTML = `
    <div class="alliance-banner">
      <div class="slg-hex slg-hex-lg">盟</div>
      <div>
        <div class="alliance-name">${a.name || "前哨"}</div>
        <div class="muted">联盟等级 Lv${lv} / ${ALLIANCE_MAX_LEVEL} · ${a.solo ? "单人盟约" : "联盟模式"}</div>
        <div class="alliance-honor-bar" title="联盟荣誉（参考原作：成员捐献、科技、活跃累积联盟经验）">
          <span class="muted">联盟荣誉</span>
          <div class="alliance-honor-track"><i style="width:${honorPct}%"></i></div>
          <span class="muted">${lv >= ALLIANCE_MAX_LEVEL ? "已满级" : `${hx} / ${needHonor}`}</span>
        </div>
      </div>
    </div>
    <p class="muted">升级方式（原型）：每日推进、战斗胜利、活动中心捐献木材／钢材可累积<strong>联盟荣誉</strong>；每 3 天另获 1 点<strong>联盟经验</strong>用于下方科技式加成。</p>
    <div class="card">
      <div><strong>联盟等级效果</strong>（随等级提升自动生效）</div>
      <div class="muted">采集收益 +${pct(lb.gatherYieldPct)} · 建造加速 +${pct(lb.buildSpeedPct)} · 战斗伤害 +${pct(lb.battleDmgPct)}</div>
      <div class="muted">额外强化（消耗联盟经验）：采集 +${(pk.gather || 0) * 2}% · 建造 +${(pk.build || 0) * 2}% · 战斗 +${(pk.battle || 0) * 1}%</div>
    </div>
    <div class="row alliance-donate-row">
      <button type="button" class="slg-btn-blue" id="btn-alliance-donate-wood">捐献木材换荣誉</button>
      <button type="button" class="slg-btn-blue" id="btn-alliance-donate-steel">捐献钢材换荣誉</button>
    </div>
    <div class="alliance-perks">
      <div class="alliance-perk"><span>采集 +${(pk.gather || 0) * 2}%</span><button type="button" data-ap="gather" ${(a.exp || 0) < 3 ? "disabled" : ""}>升级（3 EXP）</button></div>
      <div class="alliance-perk"><span>建造 +${(pk.build || 0) * 2}%</span><button type="button" data-ap="build" ${(a.exp || 0) < 3 ? "disabled" : ""}>升级（3 EXP）</button></div>
      <div class="alliance-perk"><span>战斗 +${(pk.battle || 0) * 1}%</span><button type="button" data-ap="battle" ${(a.exp || 0) < 3 ? "disabled" : ""}>升级（3 EXP）</button></div>
    </div>
    <div class="muted">联盟经验储备：<strong>${a.exp || 0}</strong>（每 3 天 +1）</div>
  `;
  byId("btn-alliance-donate-wood")?.addEventListener("click", tryAllianceDonateWood_);
  byId("btn-alliance-donate-steel")?.addEventListener("click", tryAllianceDonateSteel_);
  w.querySelectorAll("button[data-ap]").forEach((btn) => {
    btn.onclick = () => {
      const k = btn.getAttribute("data-ap");
      if (!k) return;
      if ((state.alliance.exp || 0) < 3) return alert("联盟经验不足");
      state.alliance.exp -= 3;
      state.alliance.perks[k] = (state.alliance.perks[k] || 0) + 1;
      logEvent("联盟", `已强化：${k}`);
      save();
      renderAlliancePage_();
    };
  });
}

function forumRangeFingerprint_(uid, startISO, endISO) {
  return `${String(uid)}|${String(startISO)}|${String(endISO)}`;
}

function forumLiveByFingerprint_(fp) {
  const fs = state.forumShop || {};
  if (!fs.liveByFp || typeof fs.liveByFp !== "object") fs.liveByFp = {};
  if (!fp || !fs.liveByFp[fp] || typeof fs.liveByFp[fp] !== "object") return { replies: 0, cites: 0 };
  return {
    replies: Math.max(0, Number(fs.liveByFp[fp].replies || 0)),
    cites: Math.max(0, Number(fs.liveByFp[fp].cites || 0)),
  };
}

function sumDayBucketInRange_(bucket, startISO, endISO) {
  if (!bucket || typeof bucket !== "object") return 0;
  const s = String(startISO || "");
  const e = String(endISO || "");
  let n = 0;
  for (const [d, v] of Object.entries(bucket)) {
    if (s && d < s) continue;
    if (e && d > e) continue;
    n += Math.max(0, Number(v || 0));
  }
  return n;
}

function consumeDayBucketInRange_(sourceBucket, claimedBucket, startISO, endISO, want) {
  if (!sourceBucket || typeof sourceBucket !== "object" || !claimedBucket || typeof claimedBucket !== "object") return 0;
  let left = Math.max(0, Number(want || 0));
  if (!left) return 0;
  const days = Object.keys(sourceBucket)
    .filter((d) => (!startISO || d >= startISO) && (!endISO || d <= endISO))
    .sort();
  let got = 0;
  for (const d of days) {
    if (left <= 0) break;
    const src = Math.max(0, Number(sourceBucket[d] || 0));
    const used = Math.max(0, Number(claimedBucket[d] || 0));
    const avail = Math.max(0, src - used);
    if (!avail) continue;
    const take = Math.min(avail, left);
    claimedBucket[d] = used + take;
    got += take;
    left -= take;
  }
  return got;
}

function openForumDebugModal_() {
  const fs = state.forumShop || {};
  const fp = fs.uid ? forumRangeFingerprint_(fs.uid, fs.startDate, fs.endDate) : "";
  const modal = byId("forum-debug-modal");
  const body = byId("forum-debug-body");
  const title = byId("forum-debug-title");
  if (!modal || !body || !title) return;
  const live = (fs.liveByFp && fp && fs.liveByFp[fp]) ? fs.liveByFp[fp] : {};
  const rep = live.repliesByDay || {};
  const cit = live.citesByDay || {};
  const uidStr = String(fs.uid || "");
  const claimed = fs.claimedCitesByDayByUid?.[uidStr] || {};
  const days = Array.from(new Set([...Object.keys(rep), ...Object.keys(cit)])).sort();
  const lines = [];
  lines.push(`UID: ${uidStr || "-"}`);
  lines.push(`区间: ${fs.startDate || "-"} ~ ${fs.endDate || "-"}`);
  lines.push(`指纹: ${fp || "-"}`);
  lines.push(`回复总数: ${Number(live.replies || 0)} | 引用总数: ${Number(live.cites || 0)}`);
  lines.push("");
  lines.push("每日分布（当前区间）:");
  if (!days.length) {
    lines.push("- 本区间尚无同步到按日数据，请先执行一次论坛同步。");
  } else {
    days.forEach((d) => {
      const r = Number(rep[d] || 0);
      const c = Number(cit[d] || 0);
      const used = Number(claimed[d] || 0);
      lines.push(`${d} | 回复 ${r} | 引用 ${c} | 已兑换引用 ${used}`);
    });
  }
  title.textContent = "论坛调试明细（每日分布）";
  body.textContent = lines.join("\n");
  modal.classList.remove("hidden");
}

function openForumBatchModal_(type) {
  const fs = state.forumShop;
  const fpNow = fs.uid ? forumRangeFingerprint_(fs.uid, fs.startDate, fs.endDate) : "";
  const liveNow = forumLiveByFingerprint_(fpNow);
  const totalR = (fs.manualReplies || 0) + liveNow.replies;
  const totalC = (fs.manualCites || 0) + liveNow.cites;
  if (!fs.claimedByFp || typeof fs.claimedByFp !== "object") fs.claimedByFp = {};
  const claimed = fpNow && fs.claimedByFp[fpNow] ? fs.claimedByFp[fpNow] : { replyStacks: 0, cites: 0 };
  const replyAvail = Math.max(0, Math.floor(totalR / 5) - Number(claimed.replyStacks || 0));
  const uidNow = String(fs.uid || "");
  if (!fs.claimedCitesByDayByUid || typeof fs.claimedCitesByDayByUid !== "object") fs.claimedCitesByDayByUid = {};
  if (uidNow && !fs.claimedCitesByDayByUid[uidNow]) fs.claimedCitesByDayByUid[uidNow] = {};
  const claimedDayBucket = uidNow ? fs.claimedCitesByDayByUid[uidNow] : {};
  const citesByDay = fs.liveByFp?.[fpNow]?.citesByDay || {};
  const claimedByDayInRange = sumDayBucketInRange_(claimedDayBucket, fs.startDate, fs.endDate);
  const citeAvail = Math.max(0, totalC - Math.max(Number(claimed.cites || 0), claimedByDayInRange));
  const modal = byId("forum-batch-modal");
  const title = byId("forum-batch-title");
  const body = byId("forum-batch-body");
  if (!modal || !title || !body) return;
  if (type === "reply") {
    if (replyAvail < 1) return alert("可兑换的回复堆数不足（每 5 条为 1 堆）");
    forumBatchMode_ = "reply";
    title.textContent = "批量兑换 · 回复 → 钻石";
    body.innerHTML = `
      <p class="muted">每 <strong>5</strong> 条合计回复 → <strong>1</strong> 💎。兑换会立刻从「可兑换堆数」扣除。</p>
      <p>剩余可换堆数：<strong>${replyAvail}</strong>　本区间已领 <strong>${Number(claimed.replyStacks || 0)}</strong> 堆（已计入 <strong>${Number(claimed.replyStacks || 0) * 5}</strong> 条回复）</p>
      <label class="forum-batch-qty-label">兑换堆数 <input type="number" id="forum-batch-qty" min="1" max="${replyAvail}" value="1" class="slg-num-input" /></label>
    `;
  } else if (type === "cite") {
    if (citeAvail < 1) return alert("可兑换的引用次数不足");
    forumBatchMode_ = "cite";
    title.textContent = "批量兑换 · 引用 → 钻石";
    body.innerHTML = `
      <p class="muted">每 <strong>1</strong> 次被引用 → <strong>1</strong> 💎。</p>
      <p>剩余可换：<strong>${citeAvail}</strong>　本区间已领 <strong>${Number(claimed.cites || 0)}</strong> 次（按此区间独立计算）</p>
      <label class="forum-batch-qty-label">兑换次数 <input type="number" id="forum-batch-qty" min="1" max="${citeAvail}" value="1" class="slg-num-input" /></label>
    `;
  } else return;
  modal.classList.remove("hidden");
}

function confirmForumBatchClaim_() {
  const type = forumBatchMode_;
  if (type !== "reply" && type !== "cite") return;
  const raw = parseInt(String(byId("forum-batch-qty")?.value || "1"), 10);
  const want = clamp(Number.isFinite(raw) && raw > 0 ? raw : 1, 1, 500);
  let gained = 0;
  const fpNow = state.forumShop.uid
    ? forumRangeFingerprint_(state.forumShop.uid, state.forumShop.startDate, state.forumShop.endDate)
    : "";
  const uidNow = String(state.forumShop.uid || "");
  if (!state.forumShop.claimedByFp || typeof state.forumShop.claimedByFp !== "object") state.forumShop.claimedByFp = {};
  if (!state.forumShop.claimedCitesByDayByUid || typeof state.forumShop.claimedCitesByDayByUid !== "object") state.forumShop.claimedCitesByDayByUid = {};
  if (uidNow && !state.forumShop.claimedCitesByDayByUid[uidNow]) state.forumShop.claimedCitesByDayByUid[uidNow] = {};
  if (fpNow && !state.forumShop.claimedByFp[fpNow]) state.forumShop.claimedByFp[fpNow] = { replyStacks: 0, cites: 0 };
  const claimed = fpNow ? state.forumShop.claimedByFp[fpNow] : null;
  if (type === "reply") {
    for (let i = 0; i < want; i += 1) {
      const liveNow = forumLiveByFingerprint_(fpNow);
      const t = (state.forumShop.manualReplies || 0) + liveNow.replies;
      const maxStacks = Math.floor(t / 5);
      if (!claimed || Number(claimed.replyStacks || 0) >= maxStacks) break;
      claimed.replyStacks = Number(claimed.replyStacks || 0) + 1;
      state.items.gems = (state.items.gems || 0) + 1;
      gained += 1;
    }
    if (!gained) {
      alert("可兑换的回复堆数不足");
      return;
    }
    logEvent("商店", `批量兑换回复堆 ×${gained}（+${gained} 💎）`);
  } else {
    const liveNow = forumLiveByFingerprint_(fpNow);
    const tc = (state.forumShop.manualCites || 0) + liveNow.cites;
    const citedDayBucket = state.forumShop.liveByFp?.[fpNow]?.citesByDay || {};
    const claimedDayBucket = uidNow ? state.forumShop.claimedCitesByDayByUid[uidNow] : {};
    const maxByDay = sumDayBucketInRange_(citedDayBucket, state.forumShop.startDate, state.forumShop.endDate)
      - sumDayBucketInRange_(claimedDayBucket, state.forumShop.startDate, state.forumShop.endDate);
    const hardCap = Math.max(0, Math.min(tc - Number(claimed?.cites || 0), maxByDay));
    const canTake = Math.max(0, Math.min(want, hardCap));
    if (canTake > 0 && claimed) {
      const got = consumeDayBucketInRange_(
        citedDayBucket,
        claimedDayBucket,
        state.forumShop.startDate,
        state.forumShop.endDate,
        canTake
      );
      claimed.cites = Number(claimed.cites || 0) + got;
      state.items.gems = (state.items.gems || 0) + got;
      gained += got;
    }
    if (!gained) {
      alert("尚无可兑换的引用额度");
      return;
    }
    logEvent("商店", `批量兑换引用 ×${gained}（+${gained} 💎）`);
  }
  byId("forum-batch-modal")?.classList.add("hidden");
  forumBatchMode_ = null;
  save();
  renderShopForum_();
  renderCity();
}

function renderShopForum_() {
  const w = byId("shop-forum-root");
  if (!w) return;
  const fs = state.forumShop;
  const gems = state.items?.gems || 0;
  const today = isoDateLocal_();
  if (!fs.startDate) fs.startDate = today;
  if (!fs.endDate) fs.endDate = today;
  const uidNow = fs.uid || 0;
  const fpNow = uidNow ? forumRangeFingerprint_(uidNow, fs.startDate, fs.endDate) : "";
  if (!fs.claimedByFp || typeof fs.claimedByFp !== "object") fs.claimedByFp = {};
  if (!fs.liveByFp || typeof fs.liveByFp !== "object") fs.liveByFp = {};
  if (!fs.claimedCitesByDayByUid || typeof fs.claimedCitesByDayByUid !== "object") fs.claimedCitesByDayByUid = {};
  // 迁移旧字段：把“上次同步区间”的已兑换记录归入该 fp，避免跨区间误扣。
  if ((fs.replyGemsClaimed || fs.citeGemsClaimed) && fs.lastForumSyncFp && !fs.claimedByFp[fs.lastForumSyncFp]) {
    fs.claimedByFp[fs.lastForumSyncFp] = {
      replyStacks: Number(fs.replyGemsClaimed || 0),
      cites: Number(fs.citeGemsClaimed || 0),
    };
    fs.replyGemsClaimed = 0;
    fs.citeGemsClaimed = 0;
  }
  if ((fs.liveReplies || fs.liveCites) && fs.lastForumSyncFp && !fs.liveByFp[fs.lastForumSyncFp]) {
    fs.liveByFp[fs.lastForumSyncFp] = {
      replies: Number(fs.liveReplies || 0),
      cites: Number(fs.liveCites || 0),
    };
  }
  const claimed = fpNow && fs.claimedByFp[fpNow] ? fs.claimedByFp[fpNow] : { replyStacks: 0, cites: 0 };
  const liveNow = forumLiveByFingerprint_(fpNow);
  const totalR = (fs.manualReplies || 0) + liveNow.replies;
  const totalC = (fs.manualCites || 0) + liveNow.cites;
  const replyAvail = Math.max(0, Math.floor(totalR / 5) - Number(claimed.replyStacks || 0));
  const uidStr = String(uidNow || "");
  if (uidStr && !fs.claimedCitesByDayByUid[uidStr]) fs.claimedCitesByDayByUid[uidStr] = {};
  const claimedDayBucket = uidStr ? fs.claimedCitesByDayByUid[uidStr] : {};
  const citesByDay = fs.liveByFp?.[fpNow]?.citesByDay || {};
  const claimedByDayInRange = sumDayBucketInRange_(claimedDayBucket, fs.startDate, fs.endDate);
  const citeAvail = Math.max(0, totalC - Math.max(Number(claimed.cites || 0), claimedByDayInRange));
  const replyRemainVisual = Math.max(0, totalR - Number(claimed.replyStacks || 0) * 5);
  const citeRemainVisual = citeAvail;
  const syncHint = forumSyncInProgress_
    ? `<span class="muted">${escapeHtml_(forumSyncLiveMsg_ || "同步抓取中…（切换画面不会中断）")}</span>`
    : fs.lastSyncErr
      ? `<span class="forum-sync-err">${escapeHtml_(fs.lastSyncErr)}</span>`
      : fs.lastSyncAt
        ? `<span class="muted">上次同步：${new Date(fs.lastSyncAt).toLocaleString()}</span>`
        : `<span class="muted">尚未从论坛同步</span>`;
  enforceUidBinding_();
  const lockedUid = Number(state?.profile?.uid || 0) > 0;
  const uidVal = fs.uid ? String(fs.uid) : "";

  w.innerHTML = `
    <div class="forum-card">
      <h3 class="forum-title">社群兑换（SSTM 新手区）</h3>
      <p class="muted">与打卡工具分开储存进度（键前缀 <code>ffSstm_</code>）。规则：每 <strong>5</strong> 条新手区回复 → <strong>1</strong> 💎；每 <strong>1</strong> 次有效被引用 → <strong>1</strong> 💎。起迄日期依<strong>本机时区</strong>解读（跨月统计请拉满整月）。可重复按「从论坛同步」；每次结果与<strong>历史较高值</strong>合并（快速同步不验引用时，不会把已同步到的引用数覆盖成 0）。手动 +1 回复／被引用会永久累加。同步失败时可用下方手动记帐。</p>
      <p class="muted">未勾选「快速同步」时，引用会<strong>逐条打开帖子核对</strong>，<strong>不做次数上限</strong>（仅受总超时与列表页数上限影响，逾时可再按同步续跑）。勾选快速同步则跳过引用验证、只累加回复。</p>
      <p class="muted">同一 UID＋起迄日期若<strong>本日已同步过</strong>，再按会提示确认，避免误刷；增量仍会合并新回复／新引用。</p>
      <div class="forum-form row">
        <label class="forum-label">UID <input type="number" id="forum-uid" min="1" step="1" value="${uidVal}" placeholder="数字 UID" ${lockedUid ? "readonly" : ""} /></label>
        <label class="forum-label">起 <input type="date" id="forum-start" value="${fs.startDate}" /></label>
        <label class="forum-label">迄 <input type="date" id="forum-end" value="${fs.endDate}" /></label>
      </div>
      <label class="forum-fast"><input type="checkbox" id="forum-sync-fast" ${state.forumShop.fastSyncNoCite ? "checked" : ""} /> 快速同步（只计回复，不验证引用，较快）</label>
      <div class="row forum-actions">
        <button type="button" id="btn-forum-sync" class="slg-btn-yellow">${forumSyncInProgress_ ? "同步中…（点此查看提示）" : "从论坛同步"}</button>
        <button type="button" id="btn-forum-debug">论坛调试明细</button>
        <span id="forum-sync-status" class="forum-sync-status">${syncHint}</span>
      </div>
      <div class="forum-stats">
        <div>论坛回复（当前区间同步）：<strong id="v-forum-live-r">${liveNow.replies}</strong></div>
        <div>论坛被引用（当前区间同步）：<strong id="v-forum-live-c">${liveNow.cites}</strong></div>
        <div>手动回复 +1：<strong id="v-forum-man-r">${fs.manualReplies || 0}</strong></div>
        <div>手动被引用 +1：<strong id="v-forum-man-c">${fs.manualCites || 0}</strong></div>
        <div>合计回复：<strong>${totalR}</strong> · 剩余<strong>未兑换条数</strong>（画面）：<strong>${replyRemainVisual}</strong> · 可换堆数 <strong>${replyAvail}</strong>（本区间已领 <strong>${Number(claimed.replyStacks || 0)}</strong> 堆＝已扣 <strong>${Number(claimed.replyStacks || 0) * 5}</strong> 条）</div>
        <div>合计引用：<strong>${totalC}</strong> · 剩余可换：<strong>${citeRemainVisual}</strong>（本区间已领 <strong>${Number(claimed.cites || 0)}</strong> 次，且与其他时间区间做按日防重）</div>
        <div>当前钻石：<strong>${gems}</strong></div>
      </div>
      <div class="row forum-actions">
        <button type="button" id="btn-forum-reply">手动 +1 回复</button>
        <button type="button" id="btn-forum-cite">手动 +1 被引用</button>
        <button type="button" id="btn-forum-claim-reply" class="slg-btn-yellow">兑换（5 回复 → 1 💎）</button>
        <button type="button" id="btn-forum-claim-cite" class="slg-btn-yellow">兑换（1 引用 → 1 💎）</button>
      </div>
    </div>
  `;

  byId("forum-uid")?.addEventListener("change", () => {
    if (lockedUid) return;
    const n = parseInt(String(byId("forum-uid").value), 10);
    state.forumShop.uid = Number.isFinite(n) && n > 0 ? n : 0;
    save();
  });
  byId("forum-start")?.addEventListener("change", () => {
    state.forumShop.startDate = String(byId("forum-start").value || today)
      .trim()
      .replace(/\//g, "-")
      .slice(0, 10);
    save();
  });
  byId("forum-end")?.addEventListener("change", () => {
    state.forumShop.endDate = String(byId("forum-end").value || today)
      .trim()
      .replace(/\//g, "-")
      .slice(0, 10);
    save();
  });
  byId("forum-sync-fast")?.addEventListener("change", () => {
    state.forumShop.fastSyncNoCite = !!byId("forum-sync-fast")?.checked;
    save();
  });

  byId("btn-forum-sync")?.addEventListener("click", async () => {
    const api = window.SstmForumScrape;
    enforceUidBinding_();
    const uid = Number(state?.profile?.uid || state.forumShop.uid || parseInt(String(byId("forum-uid")?.value), 10));
    if (!uid || uid < 1) {
      alert("请填写有效的论坛 UID");
      return;
    }
    if (forumSyncInProgress_) {
      alert(`论坛同步仍在进行中。\n\n进度：${forumSyncLiveMsg_ || "抓取中…"}\n\n提示：同步期间按钮会显示“同步中…（点此查看提示）”。`);
      return;
    }
    state.forumShop.uid = uid;
    state.forumShop.startDate = String(byId("forum-start")?.value || state.forumShop.startDate || "")
      .trim()
      .replace(/\//g, "-")
      .slice(0, 10);
    state.forumShop.endDate = String(byId("forum-end")?.value || state.forumShop.endDate || "")
      .trim()
      .replace(/\//g, "-")
      .slice(0, 10);
    syncShopCalendar_();
    const fp = forumRangeFingerprint_(uid, state.forumShop.startDate, state.forumShop.endDate);
    const calToday = isoDateLocal_();
    if (!api || typeof api.scrapeRange !== "function") {
      state.forumShop.lastSyncErr = "缺少 sstm-forum-scrape.js";
      save();
      renderShopForum_();
      return;
    }
    const setSt = (msg, err) => {
      const st = byId("forum-sync-status");
      if (!st) return;
      st.innerHTML = err
        ? `<span class="forum-sync-err">${escapeHtml_(msg)}</span>`
        : `<span class="muted">${escapeHtml_(msg)}</span>`;
      renderForumSyncFloat_();
    };
    const setBtnText = (txt) => {
      const btnLive = byId("btn-forum-sync");
      if (btnLive) btnLive.textContent = txt;
    };
    forumSyncInProgress_ = true;
    forumSyncLiveMsg_ = "连线中：取得个人页…";
    setSt(forumSyncLiveMsg_);
    renderForumSyncFloat_();
    setBtnText("同步中…（点此查看提示）");
    if (
      state.forumShop.lastForumSyncFp === fp &&
      state.forumShop.lastForumSyncDayISO === calToday &&
      !confirm(
        "今日已用相同 UID 与起迄日期同步过。继续将增量合并新回复／引用（完整同步会逐条验证引用）。确定继续？"
      )
    ) {
      forumSyncInProgress_ = false;
      forumSyncLiveMsg_ = "";
      setBtnText("从论坛同步");
      return;
    }
    const fast = !!byId("forum-sync-fast")?.checked;
    state.forumShop.fastSyncNoCite = fast;
    try {
      const r = await api.scrapeRange(uid, state.forumShop.startDate, state.forumShop.endDate, "_ffshop", {
        onProgress: (msg) => {
          const t = typeof msg === "string" ? msg : String(msg?.message || msg);
          forumSyncLiveMsg_ = t;
          setSt(t);
        },
        maxCitationChecks: fast ? 0 : null,
        // 需要跨月（例如 3 月）时页数可能很深；配合页码日期缓存可快速跳到附近。
        maxPages: fast ? 60 : 260,
        overallMs: fast ? 120000 : 420000,
      });
      const nr = Number(r.replies || 0);
      const nc = Number(r.citations || 0);
      if (!state.forumShop.liveByFp || typeof state.forumShop.liveByFp !== "object") state.forumShop.liveByFp = {};
      state.forumShop.liveByFp[fp] = {
        replies: nr,
        cites: nc,
        repliesByDay: r.repliesByDay || {},
        citesByDay: r.citesByDay || {},
        at: Date.now(),
      };
      state.forumShop.liveReplies = nr;
      state.forumShop.liveCites = nc;
      state.forumShop.lastSyncAt = Date.now();
      state.forumShop.lastSyncErr = "";
      state.forumShop.lastForumSyncFp = fp;
      state.forumShop.lastForumSyncDayISO = calToday;
      state.forumShop.syncedRangeFingerprints[fp] = true;
      logEvent("商店", `论坛同步（${state.forumShop.startDate}~${state.forumShop.endDate}）：回复 ${nr}、引用 ${nc}`);
      try {
        await cloudWriteNoCors_("forum_fetch_log", {
          uid: String(state.forumShop.uid || uid),
          startDate: state.forumShop.startDate,
          endDate: state.forumShop.endDate,
          reply_count: nr,
          citation_count: nc,
          ts: Date.now(),
        });
        await pushForumDailyActivityLogs_(
          String(state.forumShop.uid || uid),
          state.forumShop.startDate,
          state.forumShop.endDate,
          r.repliesByDay || {},
          r.citesByDay || {}
        );
      } catch (_) {
        // cloud log is best-effort, do not block normal sync flow
      }
      setSt(`同步完成（当前区间）：回复 ${nr} / 引用 ${nc}`);
      save();
      renderShopForum_();
      renderCity();
    } catch (e) {
      state.forumShop.lastSyncErr = (e && e.message) || String(e);
      setSt(state.forumShop.lastSyncErr, true);
      save();
      renderShopForum_();
    } finally {
      forumSyncInProgress_ = false;
      forumSyncLiveMsg_ = "";
      setBtnText("从论坛同步");
      renderForumSyncFloat_();
      renderShopForum_();
    }
  });
  byId("btn-forum-debug")?.addEventListener("click", () => openForumDebugModal_());

  byId("btn-forum-reply")?.addEventListener("click", () => {
    state.forumShop.manualReplies = (state.forumShop.manualReplies || 0) + 1;
    save();
    renderShopForum_();
    renderCity();
  });
  byId("btn-forum-cite")?.addEventListener("click", () => {
    state.forumShop.manualCites = (state.forumShop.manualCites || 0) + 1;
    save();
    renderShopForum_();
    renderCity();
  });
  byId("btn-forum-claim-reply")?.addEventListener("click", () => openForumBatchModal_("reply"));
  byId("btn-forum-claim-cite")?.addEventListener("click", () => openForumBatchModal_("cite"));
}

function escapeHtml_(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderBattle() {
  const sc = getStageCfg_(state.stage);
  const panel = byId("battle-panel");
  const bossHud = byId("boss-hud");
  const bossName = byId("boss-name");
  const bossPhase = byId("boss-phase");
  const bossHpFill = byId("boss-hp-fill");
  const isBoss = !!sc?.isBoss;
  panel?.classList.toggle("boss-theme", isBoss);
  if (bossHud) bossHud.classList.toggle("hidden", !isBoss);
  if (!isBoss) bossHpFill?.classList.remove("phase2", "boss-hp-pulse");
  if (isBoss) {
    if (bossName) bossName.textContent = sc?.bossName || "BOSS";
    const pow = calcEnemyPower();
    const phase = pow > 680 ? "P2" : "P1";
    if (bossPhase) bossPhase.textContent = phase;
    const hpPct = Math.max(18, Math.min(100, Math.floor((pow / 1100) * 100)));
    if (bossHpFill) bossHpFill.style.width = `${hpPct}%`;
    bossHpFill?.classList.toggle("phase2", phase === "P2");
  }
  byId("v-stage").textContent = sc?.isBoss ? `${state.stage}（Boss）` : state.stage;
  const ep = calcEnemyPower();
  const mp = calcBattlePowerDisplay_();
  byId("v-enemy-power").textContent = ep;
  byId("v-my-power").textContent = mp;
  const maxP = Math.max(1, ep, mp);
  const epBar = byId("bar-enemy-power");
  const mpBar = byId("bar-my-power");
  if (epBar) epBar.style.width = `${Math.floor((ep / maxP) * 100)}%`;
  if (mpBar) mpBar.style.width = `${Math.floor((mp / maxP) * 100)}%`;
  const fx = byId("battle-fx");
  const url = assets?.battleFx?.layer || "";
  fx.innerHTML = url ? `<img src="${url}" alt="battle-fx-layer" />` : "可在素材映射设定 battleFx.layer";
  const uf = byId("ult-fx");
  const uurl = assets?.battleFx?.ult || "";
  uf.innerHTML = uurl ? `<img src="${uurl}" alt="ult-fx-layer" />` : "大招动画位";
  renderSkillBars();
  renderBattleScene();
  renderBattleStageMap_();
  const rr = byId("battle-result-reason");
  if (rr) rr.textContent = lastBattleOutcomeHint_ || "";
}

function renderBattleStageMap_() {
  const wrap = byId("battle-stage-map");
  if (!wrap) return;
  const cur = Math.max(1, Number(state.stage || 1));
  const mapBlocks = [];
  for (let m = 0; m < 3; m += 1) {
    const start = m * 10 + 1;
    const end = start + 9;
    const unlockedMap = m === 0 || cur > start;
    const dots = [];
    for (let st = start; st <= end; st += 1) {
      const cleared = st < cur;
      const current = st === cur;
      const story = st % 5 === 0;
      const locked = !unlockedMap || st > cur;
      dots.push(
        `<button type="button" class="battle-stage-dot ${cleared ? "is-cleared" : ""} ${current ? "is-current" : ""} ${
          story ? "is-story" : ""
        }" data-bstage="${st}" ${locked ? "disabled" : ""} title="${story ? "通关后会触发剧情章节" : "关卡节点"}">${
          current ? "▶" : st
        }</button>`
      );
    }
    mapBlocks.push(
      `<div class="battle-stage-map-block"><div class="muted"><strong>地图 ${m + 1}</strong> · 关卡 ${start}-${end} ${
        unlockedMap ? "" : "（未解锁）"
      }</div><div class="battle-stage-map-grid">${dots.join("")}</div></div>`
    );
  }
  wrap.innerHTML = mapBlocks.join("");
  wrap.querySelectorAll("button[data-bstage]").forEach((btn) => {
    btn.onclick = () => {
      const st = Number(btn.getAttribute("data-bstage") || 0);
      if (st !== cur) {
        if (st < cur) showStageNodeReport_(st);
        return;
      }
      doBattle();
    };
  });
}

function showStageNodeReport_(stageNum) {
  const rec = state.stageBattleStats?.[String(stageNum)] || null;
  if (!rec) {
    alert(`关卡 ${stageNum} 历史战报暂无记录。`);
    return;
  }
  const modal = byId("stage-report-modal");
  const title = byId("stage-report-title");
  const body = byId("stage-report-body");
  if (!modal || !title || !body) return;
  const wr = rec.attempts > 0 ? Math.floor((Number(rec.wins || 0) / Number(rec.attempts || 1)) * 100) : 0;
  const loot = rec.lastLoot || {};
  const recents = Array.isArray(rec.recentReports) ? rec.recentReports.slice(-5).reverse() : [];
  const lines = [];
  lines.push(`关卡 ${stageNum} · 历史战报`);
  lines.push(`尝试：${rec.attempts} 次`);
  lines.push(`胜利：${rec.wins} 次 / 败北：${rec.losses} 次（胜率 ${wr}%）`);
  lines.push(`最高我方战力：${Math.floor(rec.bestMyPower || 0)}`);
  lines.push(`最高敌方战力：${Math.floor(rec.bestEnemyPower || 0)}`);
  lines.push(`最近奖励：木${Math.floor(loot.wood || 0)} / 钢${Math.floor(loot.steel || 0)} / 粮${Math.floor(loot.food || 0)} / 燃${Math.floor(loot.fuel || 0)}`);
  lines.push("");
  lines.push("最近 5 次战报：");
  if (!recents.length) lines.push("- 暂无详细记录");
  recents.forEach((r, i) => {
    const tm = r.at ? new Date(r.at).toLocaleString() : "未知时间";
    lines.push(
      `${i + 1}. [${tm}] ${r.win ? "胜利" : "败北"} | 我方 ${Math.floor(r.myPower || 0)} vs 敌方 ${Math.floor(r.enemyPower || 0)} | ${r.endReason || ""} | 奖励 木${Math.floor(r.loot?.wood || 0)}/钢${Math.floor(r.loot?.steel || 0)}/粮${Math.floor(r.loot?.food || 0)}/燃${Math.floor(r.loot?.fuel || 0)}`
    );
  });
  title.textContent = `关卡 ${stageNum} 历史战报`;
  body.textContent = lines.join("\n");
  stageReportCopyText_ = lines.join("\n");
  modal.classList.remove("hidden");
}

function renderSkillBars() {
  const wrap = byId("skill-bars");
  if (!wrap) return;
  wrap.innerHTML = state.heroes
    .filter((h) => state.squad.includes(h.id))
    .map((h) => {
      const s = getActiveSkillCfg_(h);
      const need = Number(s.chargeNeed || 100);
      const c = clamp(state.skillCharge[h.id] || 0, 0, need);
      const pct = Math.floor((c / need) * 100);
      return `<div class="skill-row"><div>${h.name} · ${s.name || "技能"}</div><div class="skill-bar"><i style="width:${pct}%"></i></div><div>${c}/${need}</div></div>`;
    })
    .join("");
}

function renderMissions() {
  const wrap = byId("hub-missions");
  if (!wrap) return;
  const tabs = [
    ["chapter", "主线"],
    ["growth", "成长"],
    ["daily", "日常"],
    ["special", "秘闻"],
    ["event", "活动"],
  ];
  const counts = Object.fromEntries(tabs.map(([id]) => [id, 0]));
  state.missions.forEach((m) => {
    const cat = missionCategory_(m);
    if (m.unlocked && m.ready && !m.claimed) counts[cat] = (counts[cat] || 0) + 1;
  });
  const allUnlocked = state.missions.filter((m) => m.unlocked);
  const doneCount = allUnlocked.filter((m) => m.done).length;
  const progressPct = allUnlocked.length ? Math.floor((doneCount / allUnlocked.length) * 100) : 0;
  const list = state.missions.filter((m) => {
    if (missionCategory_(m) !== missionViewTab || !m.unlocked) return false;
    if (m.done && m.claimed) return false;
    return true;
  });
  wrap.innerHTML = `
    <div class="mission-board">
      <div class="mission-left">
        ${tabs.map(([id, name]) => `<button type="button" class="mission-tab ${id === missionViewTab ? "active" : ""}" data-mtab="${id}">${name}${counts[id] ? `<span class="mission-badge">${counts[id]}</span>` : ""}</button>`).join("")}
      </div>
      <div>
        <div class="mission-topbar">
          <div>总进度：${doneCount}/${allUnlocked.length}</div>
          <div class="mission-progress"><i style="width:${progressPct}%"></i></div>
          <div class="row">
            <button data-mclaim-all>一键领取</button>
          </div>
        </div>
        <div id="mission-list"></div>
      </div>
    </div>
  `;
  wrap.querySelectorAll("button[data-mtab]").forEach((btn) => {
    btn.onclick = () => {
      missionViewTab = btn.getAttribute("data-mtab") || "chapter";
      renderMissions();
    };
  });
  wrap.querySelector("button[data-mclaim-all]")?.addEventListener("click", () => {
    claimAllMissionsByTab_(missionViewTab);
  });
  const lw = wrap.querySelector("#mission-list");
  if (!lw) return;
  if (!list.length) {
    lw.innerHTML = `<div class="muted">当前分类暂无任务</div>`;
    return;
  }
  list.forEach((m, idx) => {
    const div = document.createElement("div");
    div.className = `card mission-card mcat-${missionCategory_(m)}`;
    div.style.setProperty("--mission-delay", `${idx * 60}ms`);
    const streakText = m.cond?.type === "moraleStreak" ? ` / 连天数: ${m.streak || 0}` : "";
    const expText = m.expiryDay ? ` / 剩余天数: ${Math.max(0, m.expiryDay - state.day + 1)}` : "";
    const prog = missionProgressHint_(m);
    const stateTxt = m.claimed ? "✅已领取" : (m.ready ? "🎁可领取" : (m.done ? "✅已完成" : "⬜进行中"));
    div.innerHTML = `
      <div>${stateTxt} ${m.text}</div>
      <div class="muted">奖励: ${fmtRes(m.reward || {})}${streakText}${expText}</div>
      ${prog ? `<div class="muted mission-prog">${prog}</div>` : ""}
      ${m.ready && !m.claimed ? `<button data-mclaim="${m.id}">领取奖励</button>` : ""}
    `;
    lw.appendChild(div);
  });
  lw.querySelectorAll("button[data-mclaim]").forEach((btn) => {
    btn.onclick = () => claimMission_(btn.getAttribute("data-mclaim"));
  });
}

function missionCategory_(m) {
  return m.category || "chapter";
}

function claimMission_(id) {
  const m = state.missions.find((x) => x.id === id);
  if (!m || !m.ready || m.claimed) return;
  addRes(m.reward || {});
  const ppAdd = m.category === "chapter" ? 2 : m.category === "growth" || m.category === "special" ? 1 : 0;
  state.policyPoints = Number(state.policyPoints || 0) + ppAdd;
  m.claimed = true;
  m.ready = false;
  if (m.next && m.nextOnClaim) {
    const nx = state.missions.find((x) => x.id === m.next);
    if (nx && !nx.unlocked) {
      nx.unlocked = true;
      logEvent("任务", `任务推进：已解锁「${nx.text}」`);
    }
  }
  logEvent("任务领取", `领取「${m.text}」`);
  tickMissions();
  save();
  renderCity();
  renderMissions();
  updateNavBadges_();
  renderLogs();
}

function claimAllMissionsByTab_(tab) {
  const list = state.missions.filter((m) => missionCategory_(m) === tab && m.ready && !m.claimed);
  if (!list.length) return alert("当前分类没有可领取奖励");
  list.forEach((m) => {
    addRes(m.reward || {});
    const ppAdd = m.category === "chapter" ? 2 : m.category === "growth" || m.category === "special" ? 1 : 0;
    state.policyPoints = Number(state.policyPoints || 0) + ppAdd;
    m.claimed = true;
    m.ready = false;
    if (m.next && m.nextOnClaim) {
      const nx = state.missions.find((x) => x.id === m.next);
      if (nx && !nx.unlocked) nx.unlocked = true;
    }
  });
  logEvent("任务领取", `一键领取 ${list.length} 条任务奖励`);
  tickMissions();
  save();
  renderCity();
  renderMissions();
  updateNavBadges_();
  renderLogs();
}

function resetDailyMissionsForNewDay_() {
  state.missions.forEach((m) => {
    if (m.refresh !== "daily") return;
    m.done = false;
    m.ready = false;
    m.claimed = false;
    m.streak = 0;
    // 每日只开放链首，避免一口气刷 100 条。
    m.unlocked = m.id === "dy_1";
  });
}

function refreshDailyMissions_() {
  resetDailyMissionsForNewDay_();
  tickMissions();
  save();
  renderMissions();
  updateNavBadges_();
}

function renderLogs() {
  const bl = byId("battle-log");
  if (bl) bl.textContent = state.logs.battle.slice(-18).join("\n");
  const ev = byId("event-log");
  if (ev) ev.textContent = state.logs.event.slice(-18).join("\n");
}

function renderStory() {
  const chapters = storyPack.chapters || [];
  const titleEl = byId("story-title");
  const textEl = byId("story-text");
  if (!chapters.length) {
    titleEl.textContent = "未加载剧情";
    textEl.textContent = "请检查 story.json";
    return;
  }
  const ch = chapters[storyIndex] || chapters[0];
  const needStage = chapterUnlockStage_(ch, storyIndex);
  const unlocked = state.stage >= needStage;
  const endingEl = byId("story-ending-mark");
  const bLog = byId("story-branch-log");
  const ending = state.storyBranches?.endings?.[ch.id];
  const scores = state.storyBranches?.scores || { order: 0, force: 0, tactics: 0 };
  titleEl.innerHTML = `<strong>${ch.title}</strong> <span class="muted">（解锁条件：关卡 ${needStage}）</span>`;
  if (endingEl) {
    const trend = `倾向(Order/Force/Tactics): ${scores.order}/${scores.force}/${scores.tactics}`;
    const finalTag = state.storyBranches?.finalEnding ? ` ｜最终结局：${state.storyBranches.finalEnding}` : "";
    endingEl.textContent = `${ending ? `章节结局标记：${ending}` : "章节结局标记：未触发"} ｜ ${trend}${finalTag}`;
  }
  textEl.textContent = unlocked ? ch.text : `该章节尚未解锁。达到关卡 ${needStage} 后可阅读。`;
  if (bLog) {
    const rows = (state.storyBranches?.history || []).slice(-12).map((x) => {
      return `[${x.chapter}] ${x.question} -> ${x.choice}`;
    });
    bLog.textContent = rows.length ? rows.join("\n") : "分支回看：暂无记录";
  }
}

const INTRO_LINES = [
  { speaker: "旁白", text: "极夜第 17 天，风暴再度压境。", pose: "center", charKey: "narrator", bgIndex: 0, isDialogue: false },
  { speaker: "指挥官", text: "所有人回到热能塔周边，先保住火源。", pose: "left", charKey: "commander", sideCharKey: "scout", bgIndex: 1, isDialogue: true },
  { speaker: "侦察员", text: "北侧出现敌军补给队，我们有窗口期。", pose: "right", charKey: "scout", sideCharKey: "commander", bgIndex: 2, isDialogue: true },
  { speaker: "旁白", text: "你的第一道命令，将决定这座城市能否撑过寒潮。", pose: "center", charKey: "narrator", bgIndex: 0, isDialogue: false },
];
let introCursor = 0;
let lastCutsceneBg_ = "";
let typeTimer_ = 0;
let typeDone_ = true;
let activeCutsceneChapterId_ = "";

const STORY_BRANCH_LIBRARY = {
  c1: { id: "c1_b1", at: 2, question: "夜间首轮部署怎么选？", options: [
    { id: "a", text: "优先守塔，稳住供热", effect: { morale: +4, fuel: +20 }, score: { order: 2 }, after: "你把热能塔列为唯一优先目标，居民看见暖光后明显安定。", ending: "守序指挥" },
    { id: "b", text: "派侦察队外扩，摸清敌情", effect: { steel: +30, food: -20 }, score: { tactics: 2 }, after: "你用补给换来了情报优势，北线地图被迅速补全。", ending: "侦察优先" },
    { id: "c", text: "均分人手，两线同时推进", effect: { wood: +20, morale: -2 }, score: { force: 1, tactics: 1 }, after: "两线都推进了，但每条线都绷得很紧。", ending: "平衡冒险" }
  ]},
  c5: { id: "c5_b1", at: 4, question: "Boss冲锋前，战术抉择？", options: [
    { id: "a", text: "全员集火核心", effect: { morale: +6, fuel: -30 }, score: { force: 2 }, after: "集火撕开了装甲，但弹药和燃料消耗巨大。", ending: "强攻破阵" },
    { id: "b", text: "稳守前排，反打窗口", effect: { food: +40, morale: +2 }, score: { order: 2 }, after: "你用稳守换来反打窗口，战损显着下降。", ending: "稳守反击" },
    { id: "c", text: "诱敌偏转，拆侧翼喷口", effect: { steel: +60, morale: -3 }, score: { tactics: 2 }, after: "侧翼爆裂掀起冰雾，战场瞬间改写。", ending: "奇袭切入" }
  ]},
  c2: { id: "c2_b1", at: 3, question: "流民接纳优先级怎么定？", options: [
    { id: "a", text: "先收技术工与医护", effect: { steel: +35, food: -20 }, score: { order: 1, tactics: 1 }, after: "你优先补齐关键岗位，营地运行更稳定。", ending: "功能优先" },
    { id: "b", text: "先收老幼与伤员", effect: { morale: +5, food: -35 }, score: { order: 2 }, after: "你把生存权放在首位，民心显着上升。", ending: "人道优先" },
    { id: "c", text: "限额接纳，先看携带物资", effect: { wood: +40, morale: -2 }, score: { force: 1 }, after: "短期压力缓解，但部分居民对政策有疑虑。", ending: "现实优先" }
  ]},
  c3: { id: "c3_b1", at: 4, question: "伏击后是否追击？", options: [
    { id: "a", text: "追击残敌，争取全歼", effect: { steel: +55, morale: -2 }, score: { force: 2 }, after: "你冒险追击，缴获不少，但队伍疲惫明显。", ending: "强攻追猎" },
    { id: "b", text: "立即撤离，保全编队", effect: { morale: +3, food: +25 }, score: { order: 2 }, after: "你选择稳妥撤离，战损被压到最低。", ending: "稳妥撤收" },
    { id: "c", text: "设伏二线，等对方回收", effect: { fuel: +30, steel: +20 }, score: { tactics: 2 }, after: "你在回收路线上再设陷阱，打出第二次收益。", ending: "双层伏击" }
  ]},
  c4: { id: "c4_b1", at: 3, question: "治安策略如何执行？", options: [
    { id: "a", text: "全面宵禁，军管夜间流动", effect: { morale: -2, food: +35 }, score: { order: 2 }, after: "秩序迅速恢复，但压抑感在街区蔓延。", ending: "铁律宵禁" },
    { id: "b", text: "公开配给+夜巡并行", effect: { morale: +4, fuel: -10 }, score: { order: 1, tactics: 1 }, after: "你让规则透明，居民逐步回到协作状态。", ending: "透明治理" },
    { id: "c", text: "放宽限制，靠社群互助", effect: { morale: +2, steel: -25 }, score: { tactics: 1 }, after: "社区活力回升，但执行成本转移到基层。", ending: "自治维稳" }
  ]},
  c6: { id: "c6_b1", at: 3, question: "灰烬议会第一优先是什么？", options: [
    { id: "a", text: "先稳产能，再谋外线", effect: { wood: +45, fuel: +20 }, score: { order: 2 }, after: "你稳住了主城产线，后续行动更有底气。", ending: "稳产路线" },
    { id: "b", text: "同步推进双线作战", effect: { morale: +2, food: -25, steel: +35 }, score: { force: 1, tactics: 1 }, after: "你压榨了执行效率，获得速度优势。", ending: "双线压进" },
    { id: "c", text: "优先打断敌补给链", effect: { fuel: +35, morale: -1 }, score: { tactics: 2 }, after: "你把节奏握在手里，敌方补给出现断层。", ending: "断补给线" }
  ]},
  c7: { id: "c7_b1", at: 3, question: "裂谷补给站失守后怎么办？", options: [
    { id: "a", text: "立刻反扑夺回原点", effect: { steel: +45, morale: -2 }, score: { force: 2 }, after: "你强行反扑，短时夺回地形但付出伤亡。", ending: "强夺据点" },
    { id: "b", text: "转移线路，重建短链", effect: { food: +35, fuel: +20 }, score: { tactics: 2 }, after: "你放弃旧点位，补给效率反而更稳定。", ending: "短链重构" },
    { id: "c", text: "固守主城，不再外扩", effect: { morale: +3, wood: -30 }, score: { order: 2 }, after: "你选择收缩阵线，城内压力明显下降。", ending: "守城收缩" }
  ]},
  c8: { id: "c8_b1", at: 4, question: "风暴窗口只剩20分钟，你下令？", options: [
    { id: "a", text: "全队压秒冲塔", effect: { steel: +50, morale: -3 }, score: { force: 2 }, after: "你赌窗口极限，最终踩线拿下目标。", ending: "压秒突进" },
    { id: "b", text: "分队掩护，主队破点", effect: { morale: +3, fuel: -15 }, score: { tactics: 2 }, after: "你用分队节奏控制风险，推进更有序。", ending: "分队破点" },
    { id: "c", text: "保守撤回，留待下次", effect: { morale: -1, food: +30 }, score: { order: 1 }, after: "你保住了战力，但也失去一次关键机会。", ending: "稳撤待机" }
  ]},
  c9: { id: "c9_b1", at: 4, question: "进入风眼后队形怎么排？", options: [
    { id: "a", text: "楔形突进，快速穿透", effect: { fuel: +20, morale: -2 }, score: { force: 2 }, after: "楔形撕开了风墙，但容错空间很小。", ending: "楔形突进" },
    { id: "b", text: "箱形护送，稳步推进", effect: { morale: +4, steel: +20 }, score: { order: 2 }, after: "你保持了完整队形，损耗控制理想。", ending: "箱形护送" },
    { id: "c", text: "双翼机动，诱导追兵", effect: { wood: +35, fuel: -20 }, score: { tactics: 2 }, after: "你把追兵带离主线，主队顺利前插。", ending: "双翼诱导" }
  ]},
  c10: { id: "c10_b1", at: 5, question: "最终阶段，谁来承担终结窗口？", options: [
    { id: "a", text: "前排强行顶入，创造空档", effect: { morale: +6, food: -30 }, score: { force: 2 }, after: "你让前排顶住代价，换来决定性的射界。", ending: "前压终结" },
    { id: "b", text: "维持阵型，等待共振时机", effect: { morale: +3, steel: +40 }, score: { order: 2 }, after: "你耐心等待共振峰值，终结一击更稳。", ending: "稳态终结" },
    { id: "c", text: "佯攻吸引，侧翼刺杀核心", effect: { fuel: +25, morale: +1 }, score: { tactics: 2 }, after: "你用佯攻骗出防御姿态，侧翼一击定胜。", ending: "奇袭终结" }
  ]},
  default: { id: "std_b1", at: 3, question: "关键决策：", options: [
    { id: "a", text: "保守推进", effect: { morale: +3 }, score: { order: 1 }, after: "你选择稳步推进，队伍节奏保持完整。", ending: "稳健线" },
    { id: "b", text: "主动压迫", effect: { wood: +30, morale: -1 }, score: { force: 1 }, after: "你主动压迫前线，资源回收效率提高。", ending: "进攻线" },
    { id: "c", text: "机动周旋", effect: { fuel: +25, steel: +20 }, score: { tactics: 1 }, after: "你拉开阵型机动周旋，局势被重新拉平。", ending: "机动线" }
  ]}
};

function playIntroCutscene() {
  introCursor = 0;
  lastCutsceneBg_ = "";
  clearTypeTimer_();
  byId("cutscene").classList.remove("hidden");
  drawCutsceneLine_();
}

function drawCutsceneLine_() {
  const line = INTRO_LINES[introCursor];
  if (!line) return closeCutscene();
  clearTypeTimer_();
  byId("cutscene-title").textContent = `序章 · 分镜 ${introCursor + 1}/${INTRO_LINES.length}`;
  const np = byId("cutscene-nameplate");
  const optWrap = byId("cutscene-branch-options");
  if (np) np.textContent = line.speaker || "旁白";
  if (optWrap) {
    optWrap.classList.remove("show");
    optWrap.innerHTML = "";
  }
  typewriterTo_("cutscene-text", line.text || "", 18);
  const bg = byId("cutscene-bg");
  const ch = byId("cutscene-char");
  const ch2 = byId("cutscene-char-2");
  const stageEl = ch?.parentElement;
  const bgs = assets?.cutscene?.bgs || [];
  const bgUrl = bgs.length ? bgs[(Number(line.bgIndex) || 0) % bgs.length] : (assets.ui.background || "");
  const fallbackHero = storyTrainerPortrait_(line.charKey || "commander");
  bg.style.backgroundImage = `url("${bgUrl}")`;
  const isDialogue = !!line.isDialogue;
  const mainChar = fallbackHero;
  const sideChar = line.sideCharKey
    ? storyTrainerPortrait_(line.sideCharKey)
    : storyTrainerPortrait_("scout");
  ch.classList.toggle("hidden", !isDialogue);
  ch2?.classList.toggle("hidden", !isDialogue);
  if (isDialogue) {
    ch.style.backgroundImage = `url("${mainChar}")`;
    ch2.style.backgroundImage = `url("${sideChar}")`;
    [ch, ch2].forEach((el) => {
      el.style.backgroundSize = "contain";
      el.style.backgroundRepeat = "no-repeat";
    });
    const mainPos = line.pose === "left" ? "20% bottom" : "80% bottom";
    const sidePos = line.pose === "left" ? "80% bottom" : "20% bottom";
    ch.style.backgroundPosition = mainPos;
    ch2.style.backgroundPosition = sidePos;
    ch.style.transform = line.pose === "left" ? "translateX(-6px)" : "translateX(6px)";
    ch2.style.transform = line.pose === "left" ? "translateX(8px)" : "translateX(-8px)";
    ch.classList.remove("enter-left", "enter-right", "enter-center");
    ch.classList.add(line.pose === "left" ? "enter-left" : "enter-right");
  }
  if (stageEl && bgUrl !== lastCutsceneBg_) {
    stageEl.classList.remove("scene-switch");
    void stageEl.offsetWidth;
    stageEl.classList.add("scene-switch");
    setTimeout(() => stageEl.classList.remove("scene-switch"), 320);
  }
  if (stageEl && isImpactLine_(line.text || "")) {
    stageEl.classList.remove("fx-shake", "fx-flash");
    void stageEl.offsetWidth;
    stageEl.classList.add("fx-shake", "fx-flash");
    setTimeout(() => stageEl.classList.remove("fx-shake", "fx-flash"), 400);
  }
  lastCutsceneBg_ = bgUrl;
}

function cutsceneNext() {
  if (!typeDone_) {
    forceCompleteTypewriter_("cutscene-text");
    return;
  }
  const line = INTRO_LINES[introCursor];
  if (line?.branch && !line.branchDone) {
    openBranchOptions_(line);
    return;
  }
  introCursor += 1;
  drawCutsceneLine_();
}

function skipCutsceneChapter_() {
  const pendingIdx = INTRO_LINES.findIndex((line, i) => i >= introCursor && line?.branch && !line.branchDone);
  if (pendingIdx >= 0) {
    introCursor = pendingIdx;
    drawCutsceneLine_();
    const line = INTRO_LINES[introCursor];
    if (line?.branch && !line.branchDone) openBranchOptions_(line);
    return;
  }
  closeCutscene();
}

function closeCutscene() {
  clearTypeTimer_();
  byId("cutscene").classList.add("hidden");
  const optWrap = byId("cutscene-branch-options");
  if (optWrap) {
    optWrap.classList.remove("show");
    optWrap.innerHTML = "";
  }
  state.introSeen = true;
  if (activeCutsceneChapterId_) state.storySeen[activeCutsceneChapterId_] = true;
  activeCutsceneChapterId_ = "";
  renderStory();
  save();
}

function renderForumSyncFloat_() {
  const bar = byId("forum-sync-float");
  if (!bar) return;
  if (!forumSyncInProgress_) {
    bar.hidden = true;
    bar.textContent = "";
    return;
  }
  bar.hidden = false;
  bar.textContent = `论坛同步中：${forumSyncLiveMsg_ || "抓取中..."}`;
}

function playCurrentChapterCutscene() {
  const ch = storyPack.chapters?.[storyIndex];
  if (!ch) return;
  const needStage = chapterUnlockStage_(ch, storyIndex);
  if ((state.stage || 1) < needStage) {
    alert(`该章节尚未解锁：需要通关到关卡 ${needStage}。`);
    return;
  }
  activeCutsceneChapterId_ = ch.id || "";
  const partsRaw = String(ch.text || "").split(/[。！？!?.]/).map((x) => x.trim()).filter(Boolean);
  const parts = buildStoryboardFromChapter_(partsRaw);
  if (!parts.length) return;
  INTRO_LINES.length = 0;
  parts.forEach((p, i) => {
    INTRO_LINES.push({
      speaker: p.speaker,
      text: p.text.endsWith("。") ? p.text : `${p.text}。`,
      pose: p.pose,
      charKey: p.charKey,
      sideCharKey: p.sideCharKey || "",
      isDialogue: !!p.isDialogue,
      bgIndex: p.bgIndex,
      branch: p.branch || null,
      branchDone: false,
    });
  });
  playIntroCutscene();
}

function getUnlockedUnreadChapterIds_() {
  const chapters = storyPack.chapters || [];
  return chapters
    .filter((ch, i) => state.stage >= chapterUnlockStage_(ch, i))
    .map((ch) => ch.id)
    .filter((id) => !state.storySeen?.[id]);
}

function buildStoryboardFromChapter_(partsRaw) {
  if (!partsRaw.length) return [];
  const maxShots = 10;
  const minShots = 6;
  const target = clamp(partsRaw.length, minShots, maxShots);
  const out = [];
  let dialogueCount = 0;
  for (let i = 0; i < target; i++) {
    const src = partsRaw[i % partsRaw.length];
    const mode = i % 4;
    const hasQuote = /[「『“”"'‘’]/.test(src);
    const hasSpeechVerb = /(问|说|回报|下令|提醒|表示|喊|回应|询问)/.test(src);
    const likelyNarration = /(风雪|营地|城墙|夜里|天亮|日志|你知道|你意识到|那一刻|回城后|爆炸后)/.test(src);
    const isDialogue = hasQuote || (!likelyNarration && hasSpeechVerb && mode !== 0);
    if (isDialogue) dialogueCount += 1;
    out.push({
      text: src,
      speaker: isDialogue ? (mode % 2 ? "指挥官" : "侦察员") : "旁白",
      pose: isDialogue ? (mode % 2 ? "left" : "right") : "center",
      charKey: isDialogue ? (mode % 2 ? "commander" : "scout") : "narrator",
      sideCharKey: isDialogue ? (mode % 2 ? "scout" : "commander") : "",
      isDialogue,
      bgIndex: storyIndex * 2 + i,
      branch: null,
    });
  }
  if (dialogueCount === 0 && out.length >= 2) {
    const idx = clamp(Math.floor(out.length / 2), 1, out.length - 1);
    const line = out[idx];
    line.isDialogue = true;
    line.speaker = "指挥官";
    line.pose = "left";
    line.charKey = "commander";
    line.sideCharKey = "scout";
  }
  if (dialogueCount === out.length && out.length >= 2) {
    out[0].isDialogue = false;
    out[0].speaker = "旁白";
    out[0].pose = "center";
    out[0].charKey = "narrator";
    out[0].sideCharKey = "";
  }
  const chapterId = storyPack.chapters?.[storyIndex]?.id || "";
  const tpl = STORY_BRANCH_LIBRARY[chapterId] || STORY_BRANCH_LIBRARY.default;
  const idx = clamp(Number(tpl.at || Math.floor(out.length / 2)), 1, out.length - 2);
  const branchId = `${chapterId || "chapter"}:${tpl.id}`;
  const chosen = state.storyBranches?.choices?.[branchId] || "";
  out[idx].branch = {
    id: branchId,
    question: tpl.question,
    options: tpl.options,
    chosen,
  };
  return out;
}

function clearTypeTimer_() {
  if (typeTimer_) clearInterval(typeTimer_);
  typeTimer_ = 0;
  typeDone_ = true;
}

function typewriterTo_(id, fullText, intervalMs = 18) {
  const el = byId(id);
  if (!el) return;
  clearTypeTimer_();
  const txt = String(fullText || "");
  let i = 0;
  typeDone_ = false;
  el.textContent = "";
  typeTimer_ = setInterval(() => {
    i += 1;
    el.textContent = txt.slice(0, i);
    if (i >= txt.length) {
      clearTypeTimer_();
      typeDone_ = true;
    }
  }, intervalMs);
}

function forceCompleteTypewriter_(id) {
  const line = INTRO_LINES[introCursor];
  if (!line) return;
  const el = byId(id);
  if (!el) return;
  clearTypeTimer_();
  el.textContent = String(line.text || "");
  typeDone_ = true;
}

function isImpactLine_(text) {
  return /(Boss|主宰|巨兽|冲撞|爆炸|轰鸣|寒爆|崩塌|警报)/i.test(String(text || ""));
}

function openBranchOptions_(line) {
  const wrap = byId("cutscene-branch-options");
  if (!wrap || !line?.branch) return;
  const q = line.branch;
  const chapterTitle = storyPack.chapters?.[storyIndex]?.title || "章节";
  if (q.chosen) {
    const picked = q.options.find((x) => x.id === q.chosen);
    if (picked?.after) {
      const nextLine = INTRO_LINES[introCursor + 1];
      if (!nextLine || nextLine.__branchReplay !== q.id) {
        INTRO_LINES.splice(introCursor + 1, 0, {
          speaker: "旁白",
          text: picked.after,
          pose: "center",
          charKey: "narrator",
          sideCharKey: "",
          isDialogue: false,
          bgIndex: (INTRO_LINES[introCursor]?.bgIndex || 0) + 1,
          branch: null,
          branchDone: true,
          __branchReplay: q.id,
        });
      }
    }
    line.branchDone = true;
    introCursor += 1;
    drawCutsceneLine_();
    return;
  }
  wrap.innerHTML = `
    <div class="muted" style="margin-bottom:4px;">${q.question}</div>
    ${q.options.map((o) => `<button class="branch-option-btn" data-branch-opt="${o.id}">${o.text}</button>`).join("")}
  `;
  wrap.classList.add("show");
  wrap.querySelectorAll("button[data-branch-opt]").forEach((btn) => {
    btn.onclick = () => {
      const oid = btn.getAttribute("data-branch-opt");
      const opt = q.options.find((x) => x.id === oid);
      if (!opt) return;
      applyBranchChoice_(line, q, opt, chapterTitle);
      wrap.classList.remove("show");
      wrap.innerHTML = "";
      introCursor += 1;
      drawCutsceneLine_();
    };
  });
}

function applyBranchChoice_(line, branch, opt, chapterTitle) {
  const key = branch.id;
  const e = opt.effect || {};
  line.branchDone = true;
  state.storyBranches.choices[key] = opt.id;
  if (Number.isFinite(e.morale)) state.morale = clamp(state.morale + Number(e.morale), 0, 100);
  ["wood", "steel", "food", "fuel"].forEach((k) => {
    if (Number.isFinite(e[k])) state.resources[k] = (state.resources[k] || 0) + Number(e[k]);
  });
  const effectText = Object.entries(e).map(([k, v]) => `${k}${v >= 0 ? "+" : ""}${v}`).join(" ");
  const s = opt.score || {};
  state.storyBranches.scores.order += Number(s.order || 0);
  state.storyBranches.scores.force += Number(s.force || 0);
  state.storyBranches.scores.tactics += Number(s.tactics || 0);
  state.storyBranches.history.push({
    chapter: chapterTitle,
    question: branch.question,
    choice: opt.text,
    effect: effectText || "无",
  });
  state.storyBranches.history = state.storyBranches.history.slice(-60);
  if (activeCutsceneChapterId_) state.storyBranches.endings[activeCutsceneChapterId_] = opt.ending || "分支已选择";
  if (activeCutsceneChapterId_ === "c10") {
    const ending = computeFinalEnding_();
    state.storyBranches.finalEnding = ending;
    INTRO_LINES.push({
      speaker: "旁白",
      text: `【终局】${ending}。`,
      pose: "center",
      charKey: "narrator",
      sideCharKey: "",
      isDialogue: false,
      bgIndex: (INTRO_LINES[INTRO_LINES.length - 1]?.bgIndex || 0) + 1,
      branch: null,
      branchDone: true,
    });
  }
  if (opt.after) {
    INTRO_LINES.splice(introCursor + 1, 0, {
      speaker: "旁白",
      text: opt.after,
      pose: "center",
      charKey: "narrator",
      sideCharKey: "",
      isDialogue: false,
      bgIndex: (INTRO_LINES[introCursor]?.bgIndex || 0) + 1,
      branch: null,
      branchDone: true,
    });
  }
  renderCity();
  renderStory();
  save();
}

function computeFinalEnding_() {
  const s = state.storyBranches?.scores || { order: 0, force: 0, tactics: 0 };
  if (s.order >= s.force && s.order >= s.tactics) return "霜城秩序结局";
  if (s.force >= s.order && s.force >= s.tactics) return "铁血远征结局";
  return "寒境智谋结局";
}

function logBattle(text) {
  state.logs.battle.push(`[D${state.day}] ${text}`);
}

function logEvent(tag, text) {
  state.logs.event.push(`[D${state.day}][${tag}] ${text}`);
}

function canAfford(cost) {
  return Object.entries(cost).every(([k, v]) => (state.resources[k] || 0) >= v);
}
function pay(cost) {
  Object.entries(cost).forEach(([k, v]) => { state.resources[k] -= v; });
}
function addRes(cost) {
  Object.entries(cost || {}).forEach(([k, v]) => {
    const n = Number(v) || 0;
    if (k === "gems") state.items.gems = (state.items.gems || 0) + n;
    else state.resources[k] = (state.resources[k] || 0) + n;
  });
}
function spend(key, amount) {
  state.resources[key] = (state.resources[key] || 0) - amount;
}

function fmtRes(res) {
  return Object.entries(res).map(([k, v]) => `${k}:${v}`).join(" / ");
}

function byId(id) { return document.getElementById(id); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function save() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function gameplayKeyUnlocked_() {
  try {
    return String(localStorage.getItem(GAMEPLAY_KEY_STORAGE) || "") === GAMEPLAY_UNLOCK_KEY;
  } catch {
    return false;
  }
}

function updateGameplayKeyUi_() {
  const ok = gameplayKeyUnlocked_();
  const st = byId("gameplay-key-status");
  if (st) st.textContent = ok ? "已授权" : "未授权";
  ["btn-export-gameplay", "btn-import-gameplay", "btn-reset-gameplay"].forEach((id) => {
    const b = byId(id);
    if (b) b.disabled = !ok;
  });
}

async function importGameplayKeyFile_() {
  const inp = byId("gameplay-key-file");
  const f = inp?.files?.[0];
  if (!f) return;
  try {
    const txt = String(await f.text()).trim();
    let key = txt;
    if (txt.startsWith("{")) {
      const obj = JSON.parse(txt);
      key = String(obj.key || "");
    }
    if (key !== GAMEPLAY_UNLOCK_KEY) {
      alert("玩法 KEY 无效。");
      inp.value = "";
      updateGameplayKeyUi_();
      return;
    }
    localStorage.setItem(GAMEPLAY_KEY_STORAGE, key);
    inp.value = "";
    updateGameplayKeyUi_();
    alert("玩法配置已授权。");
  } catch {
    alert("读取 KEY 失败，请确认文件内容。");
    if (inp) inp.value = "";
  }
}

function logSave_(msg) {
  const box = byId("save-log");
  if (!box) return;
  const old = String(box.textContent || "");
  box.textContent = `${msg}\n${old}`.slice(0, 4000);
}

function cloudUid_() {
  const uid = Number(state?.profile?.uid || state?.forumShop?.uid || 0);
  if (uid > 0) return `sstm_${uid}`;
  return "frost_default";
}

function loginHistory_() {
  try { return JSON.parse(localStorage.getItem(LOGIN_HISTORY_KEY) || "[]"); } catch { return []; }
}

function pushLoginHistory_(id, uid) {
  if (!id || !uid) return;
  const next = [{ id: String(id), uid: Number(uid) }, ...loginHistory_().filter((x) => String(x.id) !== String(id))].slice(0, 6);
  try { localStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(next)); } catch (_) {}
}

function renderLoginHistory_() {
  const el = byId("login-history");
  if (!el) return;
  const hist = loginHistory_();
  if (!hist.length) {
    el.textContent = "";
    return;
  }
  el.innerHTML = `最近使用：${hist
    .map((x, i) => `<button type="button" data-login-h="${i}">${escapeHtml_(x.id)} (${x.uid})</button>`)
    .join("")}`;
  el.querySelectorAll("[data-login-h]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.getAttribute("data-login-h") || -1);
      const x = hist[i];
      if (!x) return;
      const idEl = byId("login-id");
      const uidEl = byId("login-uid");
      if (idEl) idEl.value = x.id;
      if (uidEl) uidEl.value = String(x.uid);
    });
  });
}

function syncLoginUi_() {
  const idEl = byId("login-id");
  const uidEl = byId("login-uid");
  if (idEl) idEl.value = String(state?.profile?.id || "");
  if (uidEl) uidEl.value = String(state?.profile?.uid || "");
}

function enforceUidBinding_() {
  const uid = Number(state?.profile?.uid || 0);
  if (uid > 0) state.forumShop.uid = uid;
}

function startAutoSaveReminder_() {
  if (autoSaveReminderTimer_) clearInterval(autoSaveReminderTimer_);
  autoSaveReminderTimer_ = setInterval(() => {
    const go = confirm("已游玩 30 分钟，建议立即云端存档。\n是否前往存档管理？");
    if (!go) return;
    switchTab_("settings");
    setTimeout(() => byId("btn-cloud-upload-save")?.scrollIntoView?.({ behavior: "smooth", block: "center" }), 60);
  }, 30 * 60 * 1000);
}

function openLoginOverlayForSwitch_() {
  const curId = String(state?.profile?.id || "").trim();
  const curUid = Number(state?.profile?.uid || 0);
  if (curUid > 0 && !confirm(`当前帐号：${curId || "-"} (${curUid})\n切换帐号将尝试自动导入新 UID 的云端数据，是否继续？`)) return;
  byId("screen-login")?.classList.remove("hidden");
  syncLoginUi_();
}

function logoutAccount_() {
  if (!confirm("确定登出当前帐号？")) return;
  state.profile = { id: "", uid: 0 };
  if (state.forumShop) state.forumShop.uid = 0;
  if (autoSaveReminderTimer_) {
    clearInterval(autoSaveReminderTimer_);
    autoSaveReminderTimer_ = null;
  }
  save();
  byId("screen-login")?.classList.remove("hidden");
  syncLoginUi_();
}

async function submitLogin_() {
  const id = String(byId("login-id")?.value || "").trim();
  const uid = Number(byId("login-uid")?.value || 0);
  if (!id) return alert("请输入论坛 ID");
  if (!Number.isFinite(uid) || uid < 1) return alert("请输入有效的数字 UID");
  state.profile = { id, uid };
  enforceUidBinding_();
  pushLoginHistory_(id, uid);
  save();
  setCloudSavingUi_(true, "正在读取该 UID 的云端记录…");
  try {
    const ret = await cloudRequestRead_("load_full", { uid: cloudUid_() });
    const row = ret?.data || null;
    if (row?.save_json) {
      const parsedSave = JSON.parse(String(row.save_json || "{}"));
      if (isUsableSave_(parsedSave)) {
        const parsedAssets = JSON.parse(String(row.assets_json || "{}"));
        const parsedGameplay = JSON.parse(String(row.gameplay_json || "{}"));
        const parsedStory = JSON.parse(String(row.story_json || "{}"));
        localStorage.setItem(SAVE_KEY, JSON.stringify(parsedSave));
        localStorage.setItem(ASSET_KEY, JSON.stringify(parsedAssets));
        localStorage.setItem(GAMEPLAY_KEY, JSON.stringify(parsedGameplay));
        localStorage.setItem(STORY_KEY, JSON.stringify(parsedStory));
        writeCloudMeta_(cloudUid_(), Number(row.ts || Date.now()));
        logSave_("登入成功，已自动导入对应 UID 云端记录。");
        location.reload();
        return;
      }
    }
  } catch (_) {
    // 云端没有记录或暂时不可达时，继续本地游玩
  } finally {
    setCloudSavingUi_(false);
  }
  byId("screen-login")?.classList.add("hidden");
  renderLoginHistory_();
  renderAll();
  startAutoSaveReminder_();
}

function updateCloudMetaUi_() {
  const el = byId("cloud-last-meta");
  if (!el) return;
  try {
    const raw = localStorage.getItem(CLOUD_META_KEY);
    if (!raw) {
      el.textContent = "最近云端存档：尚无";
      return;
    }
    const m = JSON.parse(raw);
    const uid = String(m?.uid || "-");
    const ts = Number(m?.ts || 0);
    const timeStr = ts > 0 ? new Date(ts).toLocaleString() : "-";
    el.textContent = `最近云端存档：UID ${uid} / 时间 ${timeStr}`;
  } catch {
    el.textContent = "最近云端存档：读取失败";
  }
}

function writeCloudMeta_(uid, ts) {
  try {
    localStorage.setItem(CLOUD_META_KEY, JSON.stringify({ uid: String(uid || ""), ts: Number(ts || Date.now()) }));
  } catch (_) {
    // ignore localStorage errors
  }
  updateCloudMetaUi_();
}

function markActivityFingerprint_(fp) {
  if (!fp) return false;
  try {
    const raw = localStorage.getItem(CLOUD_ACTIVITY_FP_KEY) || "{}";
    const map = JSON.parse(raw);
    if (map[fp]) return false;
    map[fp] = Date.now();
    const keys = Object.keys(map);
    if (keys.length > 3000) {
      keys
        .sort((a, b) => Number(map[a] || 0) - Number(map[b] || 0))
        .slice(0, keys.length - 2500)
        .forEach((k) => delete map[k]);
    }
    localStorage.setItem(CLOUD_ACTIVITY_FP_KEY, JSON.stringify(map));
    return true;
  } catch {
    return true;
  }
}

async function pushForumDailyActivityLogs_(uid, startDate, endDate, repliesByDay, citesByDay) {
  const u = String(uid || "");
  if (!u) return;
  const rep = repliesByDay || {};
  const cit = citesByDay || {};
  const days = Array.from(new Set([...Object.keys(rep), ...Object.keys(cit)]))
    .filter((d) => d >= startDate && d <= endDate)
    .sort();
  for (const d of days) {
    const rv = Number(rep[d] || 0);
    const cv = Number(cit[d] || 0);
    const fp = `forum_daily_dist|${u}|${startDate}|${endDate}|${d}|${rv}|${cv}`;
    if (!markActivityFingerprint_(fp)) continue;
    await cloudWriteNoCors_("activity_log", {
      uid: u,
      date: d,
      event: "forum_daily_dist",
      value: rv + cv,
      note: `range:${startDate}~${endDate};replies:${rv};cites:${cv}`,
      ts: Date.now(),
    });
  }
}

function setCloudSavingUi_(show, text) {
  const modal = byId("cloud-saving-modal");
  const txt = byId("cloud-saving-text");
  if (txt && text) txt.textContent = text;
  if (modal) modal.classList.toggle("hidden", !show);
  ["btn-cloud-upload-save", "btn-cloud-load-save", "btn-cloud-ping"].forEach((id) => {
    const b = byId(id);
    if (b) b.disabled = !!show;
  });
}

function cloudJsonp_(params, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const cbName = `__frostCloudCb_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const q = new URLSearchParams({ ...params, callback: cbName });
    const src = `${CLOUD_GAS_URL}?${q.toString()}`;
    const script = document.createElement("script");
    let done = false;
    const cleanup = () => {
      try { delete window[cbName]; } catch (_) { window[cbName] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("jsonp_timeout"));
    }, timeoutMs);
    window[cbName] = (data) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cleanup();
      resolve(data || {});
    };
    script.onerror = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cleanup();
      reject(new Error("jsonp_load_error"));
    };
    script.src = src;
    document.head.appendChild(script);
  });
}

async function cloudRequestRead_(action, payload) {
  const data = await cloudJsonp_({ action, ...payload });
  if (!data?.ok) throw new Error(String(data?.error || "cloud_request_failed"));
  return data;
}

async function cloudWriteNoCors_(action, payload) {
  const req = { action, ...payload };
  const body = JSON.stringify(req);
  if (navigator.sendBeacon) {
    const ok = navigator.sendBeacon(CLOUD_GAS_URL, new Blob([body], { type: "text/plain;charset=UTF-8" }));
    if (ok) return;
  }
  await fetch(CLOUD_GAS_URL, {
    method: "POST",
    mode: "no-cors",
    body,
  });
}

function delay_(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function collectFullSavePayload_() {
  save();
  return {
    uid: cloudUid_(),
    client_ver: "frost-frontier-web",
    ts: Date.now(),
    save_json: localStorage.getItem(SAVE_KEY) || "{}",
    assets_json: localStorage.getItem(ASSET_KEY) || "{}",
    gameplay_json: localStorage.getItem(GAMEPLAY_KEY) || "{}",
    story_json: localStorage.getItem(STORY_KEY) || "{}",
  };
}

async function uploadCloudSave_() {
  setCloudSavingUi_(true, "正在存档，请稍候…");
  try {
    const payload = collectFullSavePayload_();
    await cloudWriteNoCors_("save_full", payload);
    await cloudWriteNoCors_("save_snapshot", payload);
    let verified = false;
    for (let i = 0; i < 3; i += 1) {
      await delay_(900);
      try {
        const chk = await cloudRequestRead_("load_full", { uid: payload.uid });
        const row = chk?.data || null;
        if (row?.save_json) {
          verified = true;
          break;
        }
      } catch (_) {
        // keep retry
      }
    }
    if (verified) {
      writeCloudMeta_(payload.uid, payload.ts);
      logSave_("云端上传成功（已读回校验，完整存档可恢复）。");
      alert("云端存档成功，且已完成读回校验。");
    } else {
      logSave_("云端上传请求已送出，但暂未读回确认（可稍后点云端恢复再确认）。");
      alert("云端上传请求已送出，服务器处理可能稍有延迟。");
    }
  } catch (e) {
    logSave_(`云端上传失败：${e?.message || e}`);
    alert(`云端上传失败：${e?.message || e}`);
  } finally {
    setCloudSavingUi_(false);
  }
}

async function loadCloudSave_() {
  setCloudSavingUi_(true, "正在读档，请稍候…");
  try {
    const ret = await cloudRequestRead_("load_full", { uid: cloudUid_() });
    const row = ret?.data || null;
    if (!row) {
      logSave_("云端恢复失败：找不到该 UID 的存档。");
      alert("云端没有找到可恢复存档。");
      setCloudSavingUi_(false);
      return;
    }
    const parsedSave = JSON.parse(String(row.save_json || "{}"));
    if (!isUsableSave_(parsedSave)) throw new Error("云端主存档格式无效");
    const parsedAssets = JSON.parse(String(row.assets_json || "{}"));
    const parsedGameplay = JSON.parse(String(row.gameplay_json || "{}"));
    const parsedStory = JSON.parse(String(row.story_json || "{}"));
    localStorage.setItem(SAVE_KEY, JSON.stringify(parsedSave));
    localStorage.setItem(ASSET_KEY, JSON.stringify(parsedAssets));
    localStorage.setItem(GAMEPLAY_KEY, JSON.stringify(parsedGameplay));
    localStorage.setItem(STORY_KEY, JSON.stringify(parsedStory));
    writeCloudMeta_(cloudUid_(), Number(row.ts || Date.now()));
    logSave_("云端恢复成功，正在重载游戏。");
    location.reload();
  } catch (e) {
    logSave_(`云端恢复失败：${e?.message || e}`);
    alert(`云端恢复失败：${e?.message || e}`);
    setCloudSavingUi_(false);
  }
}

async function pingCloudSave_() {
  try {
    const ret = await cloudRequestRead_("ping", {});
    const ver = String(ret?.v || "-");
    logSave_(`云端连线正常（${ver}）。`);
    alert(`云端连线正常：${ver}`);
  } catch (e) {
    logSave_(`云端连线失败：${e?.message || e}`);
    alert(`云端连线失败：${e?.message || e}`);
  }
}

function exportSaveFile_() {
  try {
    save();
    const raw = localStorage.getItem(SAVE_KEY) || "{}";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const blob = new Blob([raw], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `frost-save-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    logSave_("已下载存档文件。");
  } catch (e) {
    logSave_(`下载存档失败：${e?.message || e}`);
  }
}

async function importSaveFile_(ev) {
  const inp = ev?.target;
  const f = inp?.files?.[0];
  if (!f) return;
  try {
    const txt = await f.text();
    const parsed = JSON.parse(txt);
    if (!isUsableSave_(parsed)) {
      alert("存档格式无效，读取失败。");
      logSave_("读取存档失败：文件格式无效。");
      inp.value = "";
      return;
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
    logSave_("读取存档成功，正在重载游戏。");
    inp.value = "";
    location.reload();
  } catch (e) {
    alert("读取存档失败，请确认文件是有效 JSON。");
    logSave_(`读取存档失败：${e?.message || e}`);
    if (inp) inp.value = "";
  }
}

function restoreHeroesFromAutoBackup_() {
  try {
    const raw = localStorage.getItem(`${SAVE_KEY}__auto_backup_pre_update`);
    if (!raw) return alert("找不到自动备份。");
    const bak = JSON.parse(raw);
    if (!bak || !Array.isArray(bak.heroes) || !bak.heroes.length) {
      return alert("自动备份中没有可用英雄数据。");
    }
    state.heroes = bak.heroes.map((h) => ({ ...h }));
    if (Array.isArray(bak.squad)) state.squad = bak.squad.slice(0, maxSquadSize_());
    if (bak.skillCharge && typeof bak.skillCharge === "object") state.skillCharge = { ...bak.skillCharge };
    normalizeState_();
    save();
    renderAll();
    logSave_("已从自动备份恢复英雄数据。");
    alert("已恢复英雄/编队数据。");
  } catch (e) {
    alert("恢复失败：自动备份损坏。");
    logSave_(`恢复失败：${e?.message || e}`);
  }
}

function applyAssetTheme() {
  const bg = assets?.ui?.background;
  if (bg) {
    document.body.style.backgroundImage = `url("${bg}")`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundAttachment = "fixed";
  } else {
    document.body.style.backgroundImage = "";
  }
  const root = document.documentElement;
  const ui = assets?.ui || {};
  const vars = {
    "--v4-panel-overlay": ui.panelOverlay || "linear-gradient(180deg, rgba(148,163,184,.08), rgba(30,41,59,.05))",
    "--v4-panel-base": ui.panelBase || "rgba(11, 18, 32, 0.88)",
    "--v4-panel-border": ui.panelBorder || "#334155",
    "--v4-accent": ui.accent || "#60a5fa",
    "--v4-gold": ui.gold || "#fbbf24",
    "--v4-edge": ui.edgeGlow || "rgba(251,191,36,.22)",
    "--v4-softglow": ui.softGlow || "rgba(34,211,238,.18)",
    "--v4-nav-bg": ui.navBg || "rgba(2, 6, 23, 0.95)",
    "--v4-boss-bg": ui.bossOverlay || "radial-gradient(circle, rgba(127,29,29,.34), rgba(2,6,23,.7))",
    "--v4-boss-text": ui.bossText || "#fee2e2",
  };
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

function iconHtml(type, id, cls) {
  let url = "";
  const txt = type === "resource" ? id[0].toUpperCase() : id.slice(0, 2).toUpperCase();
  const fallbackUrl = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='100%' height='100%' fill='#0b1220'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' fill='#94a3b8' font-size='14'>${txt}</text></svg>`
  )}`;
  if (type === "resource") url = assets?.resources?.[id] || "";
  if (type === "building") url = assets?.buildings?.[id] || "";
  if (!url) url = fallbackUrl;
  return `<img class="${cls}" src="${url}" alt="${type}-${id}" onerror="this.onerror=null;this.src='${fallbackUrl}'" />`;
}

function getEnemySprite() {
  return pkmSpriteUrl_(stageEnemySlug_(state.stage || 1));
}

function chibiCrowdHtml_(side, count) {
  let html = "";
  for (let i = 0; i < count; i += 1) {
    const v = i % 4;
    const carry =
      (side === "ally" && i % 5 === 0) || (side === "enemy" && i % 6 === 2) ? " chibi--carry" : "";
    html += `<span class="chibi chibi-battle chibi--v${v} chibi--${side}${carry}" style="--i:${i}"></span>`;
  }
  return html;
}

function renderBattleScene(resultText = "", simView = null) {
  const box = byId("battle-scene");
  if (!box) return;
  const allies = state.heroes.filter((h) => state.squad.includes(h.id));
  const frontSet = new Set(["草", "水", "格斗"]);
  const front = allies.filter((h) => frontSet.has(h.role));
  const back = allies.filter((h) => !frontSet.has(h.role));
  const toHtml = (arr) => arr.map((h) => `
    <div class="sprite-card">
      <img class="sprite" src="${getHeroAvatar(h.id)}" alt="${h.name}" />
      <div class="muted">${h.name}</div>
    </div>
  `).join("");
  const sc = getStageCfg_(state.stage);
  const isBoss = !!sc?.isBoss;
  const allyMaxHp = Math.max(1, Number(simView?.allyMaxHp || Math.floor(calcBattlePowerDisplay_() * 0.95)));
  const enemyMaxHp = Math.max(1, Number(simView?.enemyMaxHp || Math.floor(calcEnemyPower() * 1.05)));
  const allyHp = Math.max(0, Number(simView?.allyHp ?? allyMaxHp));
  const enemyHp = Math.max(0, Number(simView?.enemyHp ?? enemyMaxHp));
  const allyPct = Math.floor((allyHp / allyMaxHp) * 100);
  const enemyPct = Math.floor((enemyHp / enemyMaxHp) * 100);
  box.innerHTML = `
    <div class="snow-overlay"></div>
    <div class="battle-scene-hp">
      <div class="battle-scene-hp-row"><span>我方 HP</span><div class="battle-scene-hp-track ally"><i style="width:${allyPct}%"></i></div><strong>${Math.floor(allyHp)}/${Math.floor(allyMaxHp)}</strong></div>
      <div class="battle-scene-hp-row"><span>敌方 HP</span><div class="battle-scene-hp-track enemy"><i style="width:${enemyPct}%"></i></div><strong>${Math.floor(enemyHp)}/${Math.floor(enemyMaxHp)}</strong></div>
    </div>
    <div class="battle-crowd ally">${chibiCrowdHtml_("ally", 9)}</div>
    <div class="battle-crowd enemy">${chibiCrowdHtml_("enemy", 8)}</div>
    <div class="battle-midline"></div>
    <div class="faction-badge ally">我方</div>
    <div class="faction-badge enemy">${isBoss ? "BOSS" : "敌方"}</div>
    ${resultText ? `<div class="battle-result">${resultText}</div>` : ""}
    <div class="battle-lane-wrap">
      <div class="ally-front">${toHtml(front) || toHtml(allies) || '<div class="muted">请先加入编队</div>'}</div>
      <div class="ally-back">${toHtml(back)}</div>
    </div>
    <div class="enemy-box">
      <div>
        <div class="enemy-front sprite-card">
          <img class="sprite" src="${getEnemySprite()}" alt="enemy" />
          <div class="muted">${isBoss ? `Boss · ${sc?.bossName || "敌军"}` : `敌军 Lv${state.stage}`}</div>
        </div>
        <div class="enemy-back sprite-card">
          <img class="sprite" src="${getEnemySprite()}" alt="enemy-back" />
        </div>
      </div>
    </div>
  `;
}

function animateBattleScene(sim) {
  const box = byId("battle-scene");
  if (!box) return;
  const win = !!sim?.win;
  const logs = Array.isArray(sim?.logs) ? sim.logs : [];
  const hpState = { allyMaxHp: sim.allyMaxHp || 1, enemyMaxHp: sim.enemyMaxHp || 1, allyHp: sim.allyMaxHp || 1, enemyHp: sim.enemyMaxHp || 1 };
  renderBattleScene("", hpState);
  const phases = logs.filter((x) => /我方打出|敌军反击/.test(x)).slice(0, 8);
  const phase2Index = logs.findIndex((x) => x.startsWith("PHASE2::"));
  const bossSkillIndex = logs.findIndex((x) => x.startsWith("BOSS_SKILL::"));
  const sc = getStageCfg_(state.stage);
  if (sc?.isBoss && !sim.wild) {
    const en = document.createElement("div");
    en.className = "boss-entry";
    en.textContent = `${sc.bossName || "Boss"} 来袭`;
    box.appendChild(en);
    setTimeout(() => en.remove(), 980);
  }
  phases.forEach((ln, i) => {
    const t = 120 + i * 220;
    setTimeout(() => {
      const isAlly = ln.includes("我方打出");
      const dmg = Number((ln.match(/(\d+)/g) || []).slice(-2)[0] || 0);
      box.classList.add("hit", "clash", "cam-shake");
      box.classList.toggle("enemy-hit", isAlly);
      box.classList.toggle("ally-hit", !isAlly);
      const target = box.querySelector(isAlly ? ".enemy-front .sprite" : ".ally-front .sprite");
      if (target) {
        target.classList.remove("atk-pulse");
        void target.offsetWidth;
        target.classList.add("atk-pulse");
      }
      emitBattleFloat_(`-${dmg}`, "dmg");
      if (isAlly) hpState.enemyHp = Math.max(0, Number(hpState.enemyHp || 0) - dmg);
      else hpState.allyHp = Math.max(0, Number(hpState.allyHp || 0) - dmg);
      const allyTxt = box.querySelector(".battle-scene-hp-row:nth-child(1) strong");
      const enemyTxt = box.querySelector(".battle-scene-hp-row:nth-child(2) strong");
      const allyBar = box.querySelector(".battle-scene-hp-track.ally i");
      const enemyBar = box.querySelector(".battle-scene-hp-track.enemy i");
      if (allyTxt) allyTxt.textContent = `${Math.floor(hpState.allyHp)}/${Math.floor(hpState.allyMaxHp)}`;
      if (enemyTxt) enemyTxt.textContent = `${Math.floor(hpState.enemyHp)}/${Math.floor(hpState.enemyMaxHp)}`;
      if (allyBar) allyBar.style.width = `${Math.max(0, Math.floor((hpState.allyHp / Math.max(1, hpState.allyMaxHp)) * 100))}%`;
      if (enemyBar) enemyBar.style.width = `${Math.max(0, Math.floor((hpState.enemyHp / Math.max(1, hpState.enemyMaxHp)) * 100))}%`;
      setTimeout(() => box.classList.remove("hit", "clash", "enemy-hit", "ally-hit", "cam-shake"), 140);
    }, t);
    if (phase2Index >= 0 && i === Math.max(1, Math.floor(phases.length / 2) - 1)) {
      setTimeout(() => {
        const badge = document.createElement("div");
        badge.className = "skill-banner";
        badge.textContent = "BOSS PHASE 2";
        box.appendChild(badge);
        const phase = byId("boss-phase");
        const hpFill = byId("boss-hp-fill");
        if (phase) phase.textContent = "P2";
        hpFill?.classList.add("phase2");
        hpFill?.classList.add("boss-hp-pulse");
        setTimeout(() => {
          badge.remove();
          hpFill?.classList.remove("boss-hp-pulse");
        }, 880);
      }, t + 60);
    }
    if (bossSkillIndex >= 0 && i === Math.min(phases.length - 1, Math.max(1, Math.floor(phases.length / 2)))) {
      setTimeout(() => {
        const warn = document.createElement("div");
        warn.className = "boss-skill-warning";
        warn.innerHTML = `<div class="title">WARNING</div><div class="name">BOSS 技能 · 极寒威压</div><div class="desc">我方攻击 -18%（2回合）</div>`;
        box.appendChild(warn);
        box.classList.add("boss-debuffing");
        setTimeout(() => {
          warn.remove();
          box.classList.remove("boss-debuffing");
        }, 1200);
      }, t + 80);
    }
  });
  const endAt = 220 + phases.length * 220;
  if (state.battleBuff?.active) {
    const b = document.createElement("div");
    b.className = "skill-banner";
    b.textContent = `技能增幅 x${state.battleBuff.mult.toFixed(2)}`;
    box.appendChild(b);
    setTimeout(() => b.remove(), 760);
  }
  setTimeout(() => {
    renderBattleScene(win ? "WIN" : "LOSE", {
      allyMaxHp: sim.allyMaxHp || 1,
      enemyMaxHp: sim.enemyMaxHp || 1,
      allyHp: sim.finalAllyHp ?? hpState.allyHp,
      enemyHp: sim.finalEnemyHp ?? hpState.enemyHp,
    });
    emitBattleFloat_(win ? "+Victory" : "-Morale", win ? "heal" : "dmg");
  }, endAt);
  setTimeout(() => renderBattleScene(""), endAt + 550);
}

function emitBattleFloat_(text, kind = "dmg", boxEl = null) {
  const box = boxEl || byId("battle-scene");
  if (!box) return;
  const el = document.createElement("div");
  el.className = `float-dmg ${kind === "heal" ? "heal" : ""}`;
  el.textContent = text;
  el.style.left = `${rand(18, 78)}%`;
  el.style.top = `${rand(32, 74)}%`;
  box.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

function castReadyUlts() {
  const ready = state.heroes.filter((h) => {
    if (!state.squad.includes(h.id)) return false;
    const s = getActiveSkillCfg_(h);
    return (state.skillCharge[h.id] || 0) >= Number(s.chargeNeed || 100);
  });
  if (!ready.length) return alert("没有就绪大招");
  let totalBoost = 0;
  let moraleBoost = 0;
  ready.forEach((h) => {
    const s = getActiveSkillCfg_(h);
    state.skillCharge[h.id] = 0;
    emitBattleFloat_(`${h.name} ${s.name || "ULT"}!`, "heal");
    logBattle(`${h.name} 释放「${s.name || "技能"}」，下一场伤害增强`);
    totalBoost += Number(s.dmgBoost || 0.2);
    moraleBoost += Number(s.moraleBoost || 4);
  });
  state.battleBuff = { mult: 1 + totalBoost, active: true };
  state.morale = clamp(state.morale + moraleBoost, 0, 100);
  save();
  renderBattle();
  renderCity();
  renderLogs();
}

function openBuildingModal(id) {
  const def = BUILDING_DEFS.find((x) => x.id === id);
  if (!def) return;
  const diag = getUpgradeDiagnosis_(id);
  const lv = diag.lv;
  const cost = diag.cost;
  const modal = byId("building-modal");
  modal.dataset.bid = id;
  byId("bm-title").textContent = `${def.name} 详情`;
  byId("bm-body").innerHTML = `
    <div class="row">${iconHtml("building", id, "icon20")} <strong>当前等级：Lv${lv}</strong></div>
    <div class="muted">下一级花费：${fmtRes(cost)}</div>
    <div class="muted">前置条件：${getBuildPrereqText_(id)}</div>
    <div class="muted">资源增益随等级成长（约 +24%/级）</div>
    <div class="upgrade-diagnosis ${diag.ok ? "ok" : "fail"}">
      <div><strong>升级诊断：${diag.ok ? "可升级" : `不可升级（${upgradeReasonText_(diag.reason)}）`}</strong></div>
      ${diag.messages.map((x) => `<div class="muted">${x}</div>`).join("")}
    </div>
  `;
  byId("bm-upgrade").disabled = !diag.ok;
  modal.classList.remove("hidden");
  triggerMapNodeFx_(id);
}
function closeBuildingModal() {
  closeModalWithAnim_("building-modal");
}

function openGatherClaimIfNeeded() {
  if (!state.gatherInbox.length) return;
  const m = byId("gather-claim-modal");
  const body = byId("gcm-body");
  const first = state.gatherInbox[0];
  body.innerHTML = `
    <div>待领取总数：${state.gatherInbox.length}</div>
    <div class="muted">当前：${first.name} / ${first.type}:${first.amount}</div>
  `;
  m.classList.remove("hidden");
}
function claimGatherOne() {
  if (!state.gatherInbox.length) return;
  const one = state.gatherInbox.shift();
  bumpGatherMasteryForClaim_(one);
  state.missionStats.gatherClaimToday = (state.missionStats.gatherClaimToday || 0) + 1;
  state.missionStats.gatherClaimLifetime = (state.missionStats.gatherClaimLifetime || 0) + 1;
  addRes({ [one.type]: one.amount });
  logEvent("采集领取", `${one.name} -> ${one.type}:${one.amount}`);
  if (!state.gatherInbox.length) closeModalWithAnim_("gather-claim-modal");
  else openGatherClaimIfNeeded();
  tickMissions();
  save();
  renderCity();
  renderMissions();
  renderLogs();
}
function claimGatherAll() {
  if (!state.gatherInbox.length) return;
  const cnt = state.gatherInbox.length;
  state.gatherInbox.forEach((x) => {
    bumpGatherMasteryForClaim_(x);
    addRes({ [x.type]: x.amount });
  });
  state.missionStats.gatherClaimToday = (state.missionStats.gatherClaimToday || 0) + cnt;
  state.missionStats.gatherClaimLifetime = (state.missionStats.gatherClaimLifetime || 0) + cnt;
  logEvent("采集领取", `一次性领取 ${cnt} 条采集返回`);
  state.gatherInbox = [];
  closeModalWithAnim_("gather-claim-modal");
  tickMissions();
  save();
  renderCity();
  renderMissions();
  renderLogs();
}

function closeModalWithAnim_(id) {
  const m = byId(id);
  if (!m) return;
  m.classList.add("closing");
  setTimeout(() => {
    m.classList.add("hidden");
    m.classList.remove("closing");
  }, 170);
}

function triggerMapNodeFx_(bid) {
  const node = document.querySelector(`.map-node[data-bid="${bid}"]`);
  const map = byId("city-map");
  if (!node) return;
  map?.classList.add("camera-push");
  node.classList.add("active-ping");
  setTimeout(() => {
    node.classList.remove("active-ping");
    map?.classList.remove("camera-push");
  }, 650);
}

function animateResourceDelta_() {
  const cur = {
    wood: Number(state.resources.wood || 0),
    steel: Number(state.resources.steel || 0),
    food: Number(state.resources.food || 0),
    fuel: Number(state.resources.fuel || 0),
  };
  if (!prevResourceSnapshot_) {
    prevResourceSnapshot_ = { ...cur };
    return;
  }
  const ids = { wood: "r-wood", steel: "r-steel", food: "r-food", fuel: "r-fuel" };
  Object.entries(cur).forEach(([k, v]) => {
    const d = v - Number(prevResourceSnapshot_[k] || 0);
    if (!d) return;
    const host = byId(ids[k]);
    if (!host) return;
    const tag = document.createElement("i");
    tag.className = `hud-float ${d > 0 ? "plus" : "minus"}`;
    tag.textContent = `${d > 0 ? "+" : ""}${d}`;
    host.appendChild(tag);
    host.classList.add(d > 0 ? "res-up" : "res-down");
    setTimeout(() => tag.remove(), 900);
    setTimeout(() => host.classList.remove("res-up", "res-down"), 360);
  });
  prevResourceSnapshot_ = { ...cur };
}

function showBattleBlockReason_(text, chapterId = "") {
  const el = byId("battle-block-reason");
  const txt = byId("battle-block-text");
  const btn = byId("btn-goto-story");
  if (!el || !txt || !btn) return;
  if (!text) {
    txt.textContent = "";
    btn.classList.add("hidden");
    btn.dataset.chapterId = "";
    el.classList.add("hidden");
    return;
  }
  txt.textContent = text;
  btn.dataset.chapterId = chapterId || "";
  btn.classList.toggle("hidden", !chapterId);
  el.classList.remove("hidden");
}

function getActiveSkillCfg_(hero) {
  const sid = hero?.activeSkillId || hero?.skillId || "";
  const s = resolveSkillCfg_(sid);
  if (s && s.type === "active") return s;
  return { type: "active", name: "通用技", chargeNeed: 100, dmgBoost: 0.2, moraleBoost: 4 };
}

function getPassiveTotals_() {
  const base = { atkPct: 0, hpPct: 0, teamDmgPct: 0, gatherYieldPct: 0, gatherSpeedPct: 0 };
  state.heroes
    .filter((h) => state.squad.includes(h.id))
    .forEach((h) => {
      const ids = [h?.passiveSkillId, h?.gatherSkillId].filter(Boolean);
      ids.forEach((sid) => {
        const s = gameplay?.skills?.[sid];
        if (!s) return;
        if (s.type === "passive" || s.type === "gather") {
          base.atkPct += Number(s.atkPct || 0);
          base.hpPct += Number(s.hpPct || 0);
          base.teamDmgPct += Number(s.teamDmgPct || 0);
          base.gatherYieldPct += Number(s.gatherYieldPct || 0);
          base.gatherSpeedPct += Number(s.gatherSpeedPct || 0);
        }
      });
    });
  return base;
}

function getStageCfg_(stage) {
  const list = Array.isArray(gameplay?.stages) ? gameplay.stages : [];
  if (!list.length) return null;
  const exact = list.find((x) => Number(x.stage) === Number(stage));
  if (exact) return exact;
  const sorted = [...list].sort((a, b) => Number(a.stage) - Number(b.stage));
  let best = sorted[0];
  for (const s of sorted) {
    if (Number(s.stage) <= Number(stage)) best = s;
  }
  return best;
}

function randFromRange_(range, fallback) {
  const arr = Array.isArray(range) ? range : fallback;
  const min = Number(arr?.[0] ?? fallback[0]);
  const max = Number(arr?.[1] ?? fallback[1]);
  return rand(Math.min(min, max), Math.max(min, max));
}

function getHeroAvatar(heroId) {
  const gh = state?.heroes?.find((x) => x.id === heroId) || heroDefById_(heroId);
  const slug = gh?.slug;
  if (slug) return pkmSpriteUrl_(slug);
  const v = assets?.heroes?.[heroId]?.avatar || "";
  if (v) return v;
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='100%' height='100%' fill='#0b1220'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' fill='#94a3b8' font-size='18'>${heroId}</text></svg>`
  )}`;
}

function normalizeGameplay(raw) {
  const mapHeroRow = (h, i) => ({
    id: String(h.id || `h${i + 1}`),
    name: String(h.name || `Hero${i + 1}`),
    role: String(h.role || "步兵"),
    atk: Number(h.atk || 30),
    hp: Number(h.hp || 120),
    activeSkillId: String(h.activeSkillId || h.skillId || ""),
    passiveSkillId: String(h.passiveSkillId || ""),
    slug: h.slug ? String(h.slug) : "",
    gatherSkillId: String(h.gatherSkillId || ""),
    battleExtraSkillId: String(h.battleExtraSkillId || ""),
    evolveToId: h.evolveToId != null ? String(h.evolveToId) : "",
    evolveAtLevel: Number.isFinite(h.evolveAtLevel) ? h.evolveAtLevel : 999,
  });
  const starterIds = new Set(DEFAULT_GAMEPLAY.heroes.map((x) => x.id));
  let heroes = Array.isArray(raw?.heroes) && raw.heroes.length
    ? raw.heroes.map(mapHeroRow)
    : structuredClone(DEFAULT_GAMEPLAY.heroes);
  let heroDexExtras = Array.isArray(raw?.heroDexExtras) && raw.heroDexExtras.length
    ? raw.heroDexExtras.map(mapHeroRow)
    : structuredClone(DEFAULT_GAMEPLAY.heroDexExtras || []);
  const dexById = new Map(heroDexExtras.map((h) => [h.id, h]));
  (DEFAULT_GAMEPLAY.heroDexExtras || []).forEach((h) => {
    if (!dexById.has(h.id)) {
      const c = structuredClone(h);
      heroDexExtras.push(c);
      dexById.set(h.id, c);
    }
  });
  const misplaced = heroes.filter((h) => !starterIds.has(h.id));
  heroes = heroes.filter((h) => starterIds.has(h.id));
  misplaced.forEach((h) => {
    if (!dexById.has(h.id)) {
      heroDexExtras.push(h);
      dexById.set(h.id, h);
    }
  });
  getBulkRecruitDex100_().forEach((h) => {
    if (!dexById.has(h.id) && !starterIds.has(h.id)) {
      const c = structuredClone(h);
      heroDexExtras.push(c);
      dexById.set(h.id, c);
    }
  });
  getPkExtraDexPipeHeroRows_().forEach((h) => {
    if (!dexById.has(h.id) && !starterIds.has(h.id)) {
      const c = structuredClone(h);
      heroDexExtras.push(c);
      dexById.set(h.id, c);
    }
  });
  const kept = new Map(heroes.map((h) => [h.id, h]));
  heroes = DEFAULT_GAMEPLAY.heroes.map((def) => {
    const k = kept.get(def.id);
    return k ? { ...def, ...k, id: def.id, evolveToId: def.evolveToId, evolveAtLevel: def.evolveAtLevel } : structuredClone(def);
  });
  const skills = { ...DEFAULT_GAMEPLAY.skills, ...(raw?.skills || {}) };
  const stages = Array.isArray(raw?.stages) && raw.stages.length
    ? raw.stages.map((s, i) => ({
      stage: Number(s.stage || i + 1),
      enemyPower: Number(s.enemyPower || (180 + (i + 1) * 60)),
      enemyHpMult: Number(s.enemyHpMult || 1.05),
      enemyAtkMult: Number(s.enemyAtkMult || 1.0),
      loot: {
        wood: Array.isArray(s.loot?.wood) ? s.loot.wood : [20, 45],
        steel: Array.isArray(s.loot?.steel) ? s.loot.steel : [10, 25],
        food: Array.isArray(s.loot?.food) ? s.loot.food : [18, 40],
        fuel: Array.isArray(s.loot?.fuel) ? s.loot.fuel : [8, 20]
      }
    }))
    : structuredClone(DEFAULT_GAMEPLAY.stages);
  return { heroes, heroDexExtras, skills, stages };
}

function loadGameplay() {
  try {
    const raw = localStorage.getItem(GAMEPLAY_KEY);
    if (!raw) return normalizeGameplay(DEFAULT_GAMEPLAY);
    return normalizeGameplay(JSON.parse(raw));
  } catch {
    return normalizeGameplay(DEFAULT_GAMEPLAY);
  }
}

function saveGameplay(data) {
  localStorage.setItem(GAMEPLAY_KEY, JSON.stringify(normalizeGameplay(data)));
}

async function exportGameplay() {
  const txt = JSON.stringify(normalizeGameplay(gameplay), null, 2);
  try {
    await navigator.clipboard.writeText(txt);
    logGameplay("已复制玩法配置 JSON。");
  } catch {
    logGameplay("复制失败，请手动复制下方日志。");
  }
  byId("gameplay-log").textContent = txt;
}

async function importGameplay() {
  let preset = "";
  try { preset = await navigator.clipboard.readText(); } catch {}
  const input = prompt("贴上玩法配置 JSON：", preset || "");
  if (input == null) return;
  try {
    gameplay = normalizeGameplay(JSON.parse(input));
    HERO_POOL = gameplay.heroes;
    saveGameplay(gameplay);
    applyGameplayToState_(true);
    save();
    renderAll();
    logGameplay("已导入玩法配置并生效。");
    byId("gameplay-log").textContent = JSON.stringify(gameplay, null, 2);
  } catch (e) {
    logGameplay(`导入失败: ${e.message || e}`);
  }
}

function resetGameplay() {
  if (!confirm("确认重置玩法配置？")) return;
  gameplay = normalizeGameplay(DEFAULT_GAMEPLAY);
  HERO_POOL = gameplay.heroes;
  saveGameplay(gameplay);
  applyGameplayToState_(true);
  save();
  renderAll();
  logGameplay("玩法配置已重置。");
  byId("gameplay-log").textContent = JSON.stringify(gameplay, null, 2);
}

function loadAssets() {
  try {
    const raw = localStorage.getItem(ASSET_KEY);
    if (!raw) return structuredClone(DEFAULT_ASSETS);
    const parsed = JSON.parse(raw);
    return {
      ui: { ...DEFAULT_ASSETS.ui, ...(parsed.ui || {}) },
      resources: { ...DEFAULT_ASSETS.resources, ...(parsed.resources || {}) },
      buildings: { ...DEFAULT_ASSETS.buildings, ...(parsed.buildings || {}) },
      battleFx: { ...DEFAULT_ASSETS.battleFx, ...(parsed.battleFx || {}) },
      heroes: { ...DEFAULT_ASSETS.heroes, ...(parsed.heroes || {}) },
      cutscene: {
        bgs: [...(DEFAULT_ASSETS.cutscene?.bgs || []), ...((parsed.cutscene?.bgs || []).filter(Boolean))].slice(0, 8),
        chars: { ...(DEFAULT_ASSETS.cutscene?.chars || {}), ...(parsed.cutscene?.chars || {}) }
      }
    };
  } catch {
    return structuredClone(DEFAULT_ASSETS);
  }
}

function saveAssets() {
  localStorage.setItem(ASSET_KEY, JSON.stringify(assets));
}

async function exportAssets() {
  const txt = JSON.stringify(assets, null, 2);
  try {
    await navigator.clipboard.writeText(txt);
    logAsset("已复制素材映射 JSON。");
  } catch {
    logAsset("复制失败，请手动复制下方日志。");
  }
  byId("asset-log").textContent = txt;
}

async function importAssets() {
  let preset = "";
  try { preset = await navigator.clipboard.readText(); } catch {}
  const input = prompt("贴上素材映射 JSON：", preset || "");
  if (input == null) return;
  try {
    const parsed = JSON.parse(input);
    assets = {
      ui: { ...DEFAULT_ASSETS.ui, ...(parsed.ui || {}) },
      resources: { ...DEFAULT_ASSETS.resources, ...(parsed.resources || {}) },
      buildings: { ...DEFAULT_ASSETS.buildings, ...(parsed.buildings || {}) },
      battleFx: { ...DEFAULT_ASSETS.battleFx, ...(parsed.battleFx || {}) },
      heroes: { ...DEFAULT_ASSETS.heroes, ...(parsed.heroes || {}) },
      cutscene: {
        bgs: [...(DEFAULT_ASSETS.cutscene?.bgs || []), ...((parsed.cutscene?.bgs || []).filter(Boolean))].slice(0, 8),
        chars: { ...(DEFAULT_ASSETS.cutscene?.chars || {}), ...(parsed.cutscene?.chars || {}) }
      }
    };
    saveAssets();
    applyAssetTheme();
    renderCity();
    renderBuildings();
    renderHeroes();
    renderBattle();
    logAsset("已导入素材映射并生效。");
    byId("asset-log").textContent = JSON.stringify(assets, null, 2);
  } catch (e) {
    logAsset(`导入失败: ${e.message || e}`);
  }
}

function resetAssets() {
  if (!confirm("确认重置素材映射？")) return;
  assets = structuredClone(DEFAULT_ASSETS);
  saveAssets();
  applyAssetTheme();
  renderCity();
  renderBuildings();
  renderHeroes();
  renderBattle();
  logAsset("素材映射已重置。");
  byId("asset-log").textContent = JSON.stringify(assets, null, 2);
}

function normalizeStoryPack(raw) {
  return {
    chapters: Array.isArray(raw.chapters) ? raw.chapters.map((c, i) => ({
      id: c.id || `c${i + 1}`,
      title: String(c.title || `章节 ${i + 1}`),
      unlockStage: Number(c.unlockStage || 1),
      text: String(c.text || ""),
    })) : [],
    events: Array.isArray(raw.events) ? raw.events.map((x) => String(x)) : [],
  };
}

function loadStoryPack() {
  try {
    const raw = localStorage.getItem(STORY_KEY);
    if (!raw) return normalizeStoryPack(DEFAULT_STORY_PACK);
    return normalizeStoryPack(JSON.parse(raw));
  } catch {
    return normalizeStoryPack(DEFAULT_STORY_PACK);
  }
}

function saveStoryPack(pack) {
  localStorage.setItem(STORY_KEY, JSON.stringify(normalizeStoryPack(pack)));
}

async function tryFetchJson(url) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

function logAsset(msg) {
  const box = byId("asset-log");
  const old = box.textContent || "";
  box.textContent = `${msg}\n${old}`.slice(0, 3000);
}

function logGameplay(msg) {
  const box = byId("gameplay-log");
  if (!box) return;
  const old = box.textContent || "";
  box.textContent = `${msg}\n${old}`.slice(0, 3000);
}

