import { Shape } from "./Shape";
import { RNG } from "./utils";

export let allowedRunes = [..."bcfhiorst"];

export const runeAlias = { n: 'h', ' ': 'x', '#': 'x', '⨯': 'x' }

export let rng = RNG(1);

export const stats = {
  str: {
    tip: "Affect item scaling"
  },
  dex: {
    tip: "Affect item scaling"
  },
  int: {
    tip: "Affect item scaling"
  },

  hp: {
    tip: "Fight is over when it is 0"
  },
  stamina: {
    tip: "Used by some weapons"
  },
  mana: {
    tip: "Used by some weapons"
  },

  critChance: {
    tip: "Hero gains +(critChance-enemyLevel) critPoints per turn. At 100 - damage multiplied by 1 + critMult/100, reset to 0"
  },

  critMult: {
    tip: "Hero gains +(critChance-enemyLevel) critPoints per turn. At 100 - damage multiplied by 1 + critMult/100, reset to 0"
  },

  armor: {
    tip: "-(armor) to enemy damage"
  },

  manaShield: {
    tip: "absorb (manShield) damage total"
  },

  speed: {
    tip: "+(speed-elvl) speedPoints per turn. At 100 - extra turn, reset to 0"
  },

  evade: {
    tip: "+(evade-elvl) evadePoints per turn. At 100 - copletely evade enemy attack, reset to 0"
  },

  bleeding: {
    tip: "enemy gains +(bleeding-elvl) bleedPoints, if it was hit this turn. Enemy lose bleedPoint hp each turn.s"
  }

}

function generateWords() {
  let words: string[] = []
  for (let i = 0; i < 100; i++) {
    let s = "";
    for (let j = 0; j < 10; j++) {
      let r = allowedRunes[rng(9)];
      if (r != [...s].pop())
        s += r;
      if (j > 3 && !rng(3))
        break
    }
    words.push(s);
  }
  words = words.sort((a, b) => a.length - b.length)
  return words;
}

export let words = generateWords()

export let known = Object.fromEntries(words.map(v => {
  if (rng() < .25) {
    return [v, v]
  } else {
    let l = [...v].map(l => rng() < .2 ? l : '-').join('')
    return [v, l]
  }
}))

console.log(known);

export const rawShapes = {
  sword: {
    damage: 1,
    slots: ["main", "off"],
    shape: `
..#..
#####
.###.
.###.
.###.
..#..
`}, shield: {
    slots: ["off"],
    str: 2,
    armor: 1,
    shape: `
#####
##.##
##.##
.###.
`}, dagger: {
    slots: ["main", "off"],
    dex: 2,
    damage: .8,
    critChance: 1.5,
    critMult: 1.5,
    shape: `
.##.
.##.
####
.##.
.##.
.##.
.##.
.#..
`}, hammer: {
    slots: ["main"],
    damage: 1.5,
    str: 3,
    shape: `
####
####
.##.
.##.
.##.
.##.
`}, staff: {
    slots: ["main"],
    damage: 1,
    manaUse: 1,
    int: 2,
    shape: `
.##.
####
####
.##.
.##.
.##.
`}, orb: {
    slots: ["main", "off"],
    damage: 1,
    manaUse: 1,
    int: 2,
    shape: `
.###.
#####
#####
.###.
`}, helmet: {
    slots: ["off"],
    armor: .5,
    shape: `
.###.
#####
##.##
##.##
`}, circlet: {
    slots: ["off"],
    int: 2,
    mana: 2,
    shape: `
 ###
##.##
#...#
##.##
.###.
`}, robe: {
    slots: ["body"],
    int: 2,
    shape: `
.###.
#####
.###.
#####
`}, boots: {
    slots: ["off"],
    dex: 2,
    evade: 2,
    shape: `
..###
..###
..###
#####
`}, plate: {
    slots: ["body"],
    str: 2,
    shape: `
#####
#####
.###.
.###.
`}, anvil: {
    slots: ["main"],
    str: 2,
    firstStrike: 2,
    shape: `
######
.#####
..##..
.####.
`}, amulet: {
    slots: ["off"],
    manShield: 1,
    int: 2,
    shape: `
...#...
##.#.##
.#####.
##.#.##
`}
}

export let shapes: { [id: string]: Shape } = {};

for (let k in rawShapes)
  shapes[k] = new Shape(k, { ...rawShapes[k], skipChance: .1, letterChance: .2 })
