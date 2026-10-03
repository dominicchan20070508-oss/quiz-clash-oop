// config.js — single source of truth (CONFIG + CHARACTERS + ITEMS + EMOJIS).
// UMD: browser globals; Node require.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.QC_CONFIG = api.CONFIG; root.CHARACTERS = api.CHARACTERS; root.ITEMS = api.ITEMS; root.EMOJIS = api.EMOJIS; }
})(typeof self !== 'undefined' ? self : this, function () {
  const CONFIG = {
    ruleset_id: 'quizclash-2.0.0',
    // --- longer matches: at least 20 questions ---
    maxHp: 300,
    baseDamage: 12,          // base per correct answer
    streakBonus: 2,          // extra damage per current streak level
    streakCap: 6,            // max +12 bonus -> up to 24 per hit
    minQuestions: 20,        // match cannot end before this many questions (lethal clamps to HP>=1)
    // --- timing ---
    questionTimeMs: 10000,
    resolvePauseMs: 1700,
    wrongPauseMs: 900,
    // --- signature skill (Power Surge): charges with correct answers, then cooldown ---
    skill: {
      energyPerCorrect: 25,  // 4 correct answers -> ready
      energyMax: 100,
      multiplier: 2,         // next correct answer deals 2x damage
      cooldownMs: 12000
    },
    // --- items: granted every Nth correct answer ---
    items: {
      every: 3,
      healAmount: 40,
      maxShields: 2
      // insight removes two wrong options; shield absorbs one incoming hit
    },
    // --- AI practice ---
    ai: { minDelayMs: 2000, maxDelayMs: 8500, accuracy: 0.6 }
  };

  // Characters differ ONLY in visuals + signature skill name; same HP / same base damage.
  const CHARACTERS = [
    { id: 'ignis', name: 'Ignis', title: 'Pyromancer', effect: 'fire',
      attackName: 'Fireball', skillName: 'Inferno Overload', color: '#FF6B35', color2: '#FFB020',
      desc: 'Hurls a spinning fireball that bursts into embers on impact.' },
    { id: 'volt', name: 'Volt', title: 'Thunderblade', effect: 'lightning',
      attackName: 'Thunder Slash', skillName: 'Thunder Drive', color: '#FFD23F', color2: '#6BE8FF',
      desc: 'Cuts with lightning; jagged arcs strike in an instant.' },
    { id: 'frost', name: 'Frost', title: 'Ice Archer', effect: 'ice',
      attackName: 'Frost Arrow', skillName: 'Frost Barrage', color: '#7FD8FF', color2: '#EAF9FF',
      desc: 'Looses an ice arrow that shatters into frozen shards.' },
    { id: 'shadow', name: 'Nightblade', title: 'Shadow Assassin', effect: 'shadow',
      attackName: 'Shadow Strike', skillName: 'Shadow Eclipse', color: '#9B5DE5', color2: '#3D1E6D',
      desc: 'Dashes through shadows, erupting in violet smoke.' },
    { id: 'terra', name: 'Terra', title: 'Stoneguard', effect: 'rock',
      attackName: 'Boulder Toss', skillName: 'Tectonic Slam', color: '#C9A227', color2: '#8A6D1F',
      desc: 'Throws a heavy boulder; debris flies and the ground shakes hardest.' }
  ];

  const ITEMS = [
    { id: 'shield', name: 'Shield', glyph: '🛡️', desc: 'Absorbs the next incoming hit completely.' },
    { id: 'insight', name: 'Insight', glyph: '🔍', desc: 'Removes two wrong options on this question.' },
    { id: 'heal', name: 'Repair Kit', glyph: '🧰', desc: 'Restore 40 HP immediately.' }
  ];

  const EMOJIS = ['😂', '👍', '🔥', '😎', '👏', '🤔', '❤️', '💪'];

  return { CONFIG, CHARACTERS, ITEMS, EMOJIS };
});
