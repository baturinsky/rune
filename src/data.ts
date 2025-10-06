import { type Slot } from "./Hero";
import { fixed2, randomListElement, RNG } from "./utils";

export type Stats = {
  str: number,
  dex: number,
  int: number,

  hp: number,
  stamina: number,
  mana: number,
  armor: number,
  manaShield: number,
  evade: number,
  regen: number

  damage: number,
  critChance: number,
  critMult: number,
  speed: number,
  staminaUse: number
  manaUse: number
  bleed: number
  offHandDamage: number
  firstStrike: number
}

export const GearStats = ["hp", "stamina", "mana", "armor", "evade", "regen"],
  AttackStats = ["damage", "critChance", "critMult", "speed", "bleed", "offHandDamage", "firstStrike"],
  TaxStats = ["staminaUse", "manaUse"],
  CoreStats = ["str", "int", "dex"];

export let allowedRunes = [..."bcfhiorst"];

export const runeAlias = { n: 'h', ' ': 'x', '#': 'x', '⨯': 'x', 'q': 'o' }

export let rng1 = RNG(1);

export function seed(v:number){
  rng1 = RNG(v)
}

export const statsConfig = {
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
    tip: "Fight is over when it is 0",
    mult: 3
  },
  stamina: {
    tip: "Used by some weapons",
    mult: 3
  },
  mana: {
    tip: "Used by some weapons",
    mult: 3
  },

  critChance: {
    tip: "Hero gains +(critChance-enemyLevel) critPoints per turn. At 100 - damage multiplied by 1 + critMult/100, reset to 0"
  },

  critMult: {
    tip: "Hero gains +(critChance-enemyLevel) critPoints per turn. At 100 - damage multiplied by 1 + critMult/100, reset to 0"
  },

  armor: {
    tip: "-(armor) to enemy damage",
    mult: .3
  },

  manaShield: {
    tip: "absorb (manShield) damage total",
    mult: 3
  },

  speed: {
    tip: "+(speed-elvl) speedPoints per turn. At 100 - extra turn, reset to 0"
  },

  evade: {
    tip: "+(evade-elvl) evadePoints per turn. At 100 - copletely evade enemy attack, reset to 0"
  },

  bleed: {
    tip: "enemy gains +(bleed-elvl) bleedPoints, if it was hit this turn. Enemy lose bleedPoint hp each turn.",
    mult: .3
  },

  regen: {
    tip: "hp restored each turn"
  },

  offHandDamage: {
    tip: "damage multiplier for offhand"
  },

  firstStrike: {
    tip: "damage multiplier on first turn"
  },

  damage: {
    tip: "base damage to enemy"
  }

}

function generateWords() {
  let words: string[] = []
  for (let i = 0; i < 100; i++) {
    let s = "";
    for (let j = 0; j < 10; j++) {
      let r = allowedRunes[rng1(9)];
      if (r != [...s].pop())
        s += r;
      if (j > 3 && !rng1(3))
        break
    }
    words.push(s);
  }
  words = words.sort((a, b) => a.length - b.length)
  return words;
}

export let words = generateWords()

export let wordBonuses = Object.fromEntries(words.map((v) => [v, generateWordBonus(v.length)]))


export function generateWordBonus(len: number, forWeapon?: boolean) {
  forWeapon ??= rng1() < .5;
  let name = randomListElement(forWeapon && rng1() < .7 ? AttackStats : GearStats, rng1);
  
  if(!statsConfig[name])
    console.log(name);
  let value = fixed2((len ** 1.5) * (rng1() * .8 + .4) * .05) * (statsConfig[name].mult||1);
  let results = { [name]: value };
  return results;
}

export let known = Object.fromEntries(words.map(v => {
  if (rng1() < .25) {
    return [v, v]
  } else {
    let l = [...v].map(l => rng1() < .2 ? l : '-').join('')
    return [v, l]
  }
}))

export function know(data){
  known = data;
}


export const rawShapes: { [name: string]: { slots: Slot[], shape: string, stats: Partial<Stats>, randomBonus?:number } } = {
  sword: {
    slots: ["main", "off"],
    stats: {
      str: 1,
      int: 1,
      dex: 1,
      damage: 1,
    },
    shape: `
..#..
#####
.###.
.###.
.###.
..#..
`}, shield: {
    slots: ["off"],
    stats: {
      str: 2,
      int: 1,
      dex: 1,
      armor: .3
    },
    shape: `
#####
##.##
##.##
.###.
`}, dagger: {
    slots: ["main", "off"],
    stats: {
      str: 1,
      int: 1,
      dex: 2,
      damage: .8,
      critChance: 1.5,
      critMult: 1.5
    },
    shape: `
....#.
...###    
...###
..###.
.###..
###...
`}, hammer: {
    slots: ["main"],
    stats: {
      int: 1,
      dex: 1,
      damage: 1.5,
      str: 3
    },
    shape: `
####
####
.##.
.##.
.##.
.##.
`}, staff: {
    slots: ["main"],
    stats: {
      str: 1,
      dex: 1,
      damage: 1,
      manaUse: 1,
      int: 2
    },
    shape: `
.##.
####
####
.##.
.##.
.##.
`}, orb: {
    slots: ["main", "off"],
    stats: {
      str: 1,
      dex: 1,
      int: 2,
      damage: 1,
      manaUse: 1
    },
    shape: `
.###.
#####
#####
.###.
`}, helmet: {
    slots: ["off"],
    stats: {
      str: .5,
      dex: .5,
      int: .5,
      armor: .1,
    },
    shape: `
.###.
#####
##.##
##.##
`}, circlet: {
    slots: ["off"],
    stats: {
      str: 1,
      dex: 1,
      int: 2,
      mana: 2
    },
    shape: `
 ###
##.##
#...#
##.##
.###.
`}, robe: {
    slots: ["body"],    
    randomBonus: 1,
    stats: {
      str: 1,
      dex: 1,
      int: 2,
      armor: .2
    },
    shape: `
.###.
#####
.###.
#####
`}, leather: {
    slots: ["body"],
    stats: {
      str: 1,
      dex: 2,
      int: 1,
      armor: 1
    },
    shape: `
.###.
#####
#####
.###.
`}, boots: {
    slots: ["off"],
    stats: {
      str: 1,
      int: 1,
      dex: 2,
      armor: .1,
      evade: 1
    },
    shape: `
..###
..###
..###
#####
`}, plate: {
    slots: ["body"],
    stats: {
      armor: .5,
      int: 1,
      dex: 1,
      str: 2
    },
    shape: `
#####
#####
.###.
.###.
`}, anvil: {
    slots: ["main"],
    stats: {
      int: 1,
      dex: 1,
      str: 2,
      firstStrike: 1
    },
    shape: `
######
.#####
..##..
.####.
`}, amulet: {
    slots: ["off"],
    stats: {
      str: 1,
      int: 2,
      dex: 1,
      manaShield: 1
    },
    shape: `
...#...
##.#.##
.#####.
##.#.##
`}
}

//export let shapes: { [id: string]: Shape } = {};

//for (let k in rawShapes)
//shapes[k] = new Shape(k, { ...rawShapes[k] })
