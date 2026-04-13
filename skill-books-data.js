/**
 * 技能书定义（≥50）与《寒霜启示录》活动百科式整理（原型展示用）。
 * 技能书 teach 的 skillId 须存在于 game.js DEFAULT_GAMEPLAY.skills。
 */
(function () {
  const R = ["草", "火", "水", "电", "妖精", "格斗", "一般", "毒", "虫", "飞行", "地面", "岩石", "冰", "超能力", "幽灵", "龙", "恶", "钢"];
  const POOL = [
    ["active", "a_vine_whip"],
    ["active", "a_ember"],
    ["active", "a_water_gun"],
    ["active", "a_thunder_shock"],
    ["active", "a_disarming_voice"],
    ["active", "a_karate_chop"],
    ["active", "a_bite"],
    ["active", "a_sludge"],
    ["active", "a_bug_bite"],
    ["active", "a_wing_attack"],
    ["active", "a_ice_beam"],
    ["active", "a_dragon_rage"],
    ["gather", "g_photosynth"],
    ["gather", "g_warm_forge"],
    ["gather", "g_aqua_mine"],
    ["gather", "g_static_field"],
    ["gather", "g_sing_rest"],
    ["gather", "g_muscle_mine"],
    ["gather", "g_scavenge"],
    ["gather", "g_cave_scout"],
    ["battleExtra", "a_seed_bomb"],
    ["battleExtra", "a_fire_spin"],
    ["battleExtra", "a_bubble_beam"],
    ["battleExtra", "a_volt_tackle"],
    ["battleExtra", "a_hyper_voice"],
    ["battleExtra", "a_seismic_toss"],
    ["passive", "p_overgrow"],
    ["passive", "p_blaze"],
    ["passive", "p_torrent"],
    ["passive", "p_static"],
    ["passive", "p_cute_charm"],
    ["passive", "p_guts"],
    ["passive", "p_inner_focus"],
    ["passive", "p_shield_dust"],
    ["active", "a_gust"],
    ["active", "a_air_cutter"],
    ["active", "a_flamethrower"],
    ["active", "a_hydro_pump"],
    ["active", "a_thunderbolt"],
    ["active", "a_cross_chop"],
    ["active", "a_solar_beam"],
    ["gather", "g_pollen"],
    ["gather", "g_silk_line"],
    ["battleExtra", "a_bug_buzz"],
    ["battleExtra", "a_petal_dance"],
    ["passive", "p_run_away"],
    ["passive", "p_shed_skin"],
    ["passive", "p_compound_eyes"],
    ["passive", "p_rain_dish"],
    ["passive", "p_thick_fat"],
  ];
  const NAMES = ["残卷", "精要", "图解", "要义", "手抄", "秘传", "拓本", "注疏", "演习册", "讲义"];
  window.SKILL_BOOK_DEFS = [];
  for (let i = 0; i < 50; i++) {
    const role = R[i % R.length];
    const [slot, skillId] = POOL[i % POOL.length];
    const sn = NAMES[i % NAMES.length];
    window.SKILL_BOOK_DEFS.push({
      id: `sb_${String(i + 1).padStart(3, "0")}`,
      name: `技能书·${role}之${sn}${(i % 5) + 1}`,
      role,
      slot,
      skillId,
      icon: "📕",
    });
  }

  window.WOS_ACTIVITY_HUB = {
    intro:
      "下列条目整理自《寒霜启示录／Whiteout Survival》玩家维基、中文攻略站、帮助中心与大量实况／攻略视频中的常见称呼（本页为原型索引，非 Century Games 官方完整活动表，亦未穷举全部地区变体）。",
    videoNote:
      "视频来源示例：在 YouTube、Bilibili 搜索「寒霜启示录 活动」「Whiteout Survival event guide」「燃霜矿区」「猎熊行动」「最强领主」等，可看到轮换规则与录屏流程。",
    refs: [
      { label: "Whiteout Survival Wiki · Events（繁中）", url: "https://www.whiteoutsurvival.wiki/tw/events/" },
      { label: "攻略站 · 活动列表（中文）", url: "https://whiteoutsurvival.app/zh-CN/events/" },
      { label: "Century Games 帮助中心（含燃霜矿区等说明）", url: "https://centurygames.helpshift.com/hc/zh-hant/64-whiteout-survival/" },
      { label: "进阶攻略站 · 活动玩法（例：燃霜矿区）", url: "https://www.topuplive.com/zh-tw/news/whiteout-survival-guide-frostfire-mine.html" },
      {
        label: "Bilibili 搜索 · 寒霜启示录 活动／攻略视频",
        url: "https://search.bilibili.com/all?keyword=%E5%AF%92%E9%9C%9C%E5%95%9F%E7%A4%BA%E9%8C%84%20%E6%B4%BB%E5%8B%95",
      },
      {
        label: "YouTube 搜索 · Whiteout Survival events / guides（英文实况）",
        url: "https://www.youtube.com/results?search_query=whiteout+survival+event+guide",
      },
    ],
    categories: [
      {
        name: "常规／周轮换",
        items: [
          { name: "最强领主／最强战区", note: "多阶段积分排行，城建、科研、训练等阶段任务。" },
          { name: "熔炉争霸／熔炉称霸", note: "以熔炉等级与城建进度为核心的服务器竞赛。" },
          { name: "冰封的宝藏／秘宝猎人", note: "钥匙、宝箱与兑换类轮换。" },
          { name: "幸运大转盘／节日抽奖", note: "免费次数 + 付费次数混合。" },
          { name: "雪原贸易站", note: "资源与道具兑换。" },
          { name: "除雪小队", note: "轻量小游戏式任务。" },
          { name: "英雄的使命", note: "英雄养成向任务链。" },
          { name: "正中靶心", note: "射击小游戏型活动。" },
        ],
      },
      {
        name: "联盟与大型战场",
        items: [
          { name: "峡谷会战／峡谷征战", note: "联盟间大地图争夺。" },
          { name: "猎熊行动", note: "联盟 BOSS，陷阱预约与伤害排行（维基与视频攻略极多）。" },
          { name: "兵工厂争夺战", note: "器械与据点争夺。" },
          { name: "堡垒争霸", note: "驻防与集结。" },
          { name: "联盟总动员", note: "集体里程碑。" },
          { name: "SVS 最强王国", note: "王国对王国主题。" },
          { name: "决战王城／王座战", note: "王城归属决战。" },
        ],
      },
      {
        name: "限时挑战与矿区",
        items: [
          { name: "燃霜矿区", note: "短时矿区 PvE，技能树与采矿路线（视频攻略常见）。" },
          { name: "烈焰与獠牙", note: "战斗向主题周。" },
          { name: "冻土之王", note: "排行榜型挑战。" },
          { name: "全军参战", note: "全服阶段目标。" },
        ],
      },
      {
        name: "叙事与角色",
        items: [
          { name: "吉娜的复仇", note: "剧情关卡型活动。" },
          { name: "疯狂的乔伊", note: "挑战 NPC 系列。" },
          { name: "英雄殿堂／英雄集结", note: "展示与获取英雄相关。" },
          { name: "士官计划", note: "成长里程碑。" },
        ],
      },
      {
        name: "王国与长线",
        items: [
          { name: "王国合并", note: "合服与补偿说明。" },
          { name: "逐光之旅", note: "长线打卡。" },
          { name: "火晶启用计划／火晶礼包", note: "与火晶养成挂钩的运营活动（与本原型火晶系统呼应）。" },
        ],
      },
      {
        name: "商店／竞技／节庆",
        items: [
          { name: "每日特惠／限时礼包／成长基金", note: "付费与进度礼包轮换。" },
          { name: "竞技场／霜之试炼", note: "PVP 与周期奖励。" },
          { name: "钓鱼、联盟对决等休闲玩法", note: "实况视频中常单独成章介绍。" },
          { name: "圣诞／周年／春节活动", note: "换皮、签到与限定道具。" },
        ],
      },
    ],
  };
})();
