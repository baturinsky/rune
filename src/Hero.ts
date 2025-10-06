import { CoreStats, GearStats, rng1, Stats } from "./data"
import { generateItem, Shape } from "./Shape"
import { s } from "./ui";
import { fmt } from "./utils";


export function initStats() {
  return {
    str: 0,
    dex: 0,
    int: 0,

    hp: 0,
    stamina: 0,
    mana: 0,
    armor: 0,
    manaShield: 0,
    evade: 0,
    regen: 0,

    damage: 0,
    critChance: 0,
    critMult: 0,
    speed: 0,
    bleed: 0,
    staminaUse: 0,
    manaUse: 0,
    offHandDamage: 0,
    firstStrike: 0
  } as Stats;
}


export function byRole(role: Role) {
  return s.heroes.find(h => h.role == role);
}

export type CombatState = {
  hp: number
  mana: number
  stamina: number
  enemyHP: number
  enemyBleed: number
  crit: number
  speed: number
  evade: number
  manaShield: number
}

export type Role = "Knight" | "Wizard" | "Rogue";
export type Slot = "main" | "off" | "body";

const RoleStats = {
  Knight: {
    hp: 1.2,
    str: 1.5,
    int: 1,
    dex: 1,
    stamina: 1.5,
    mana: 1,
    offHandDamage: .7
  },
  Wizard: {
    hp: 1,
    str: 1,
    int: 1.5,
    dex: 1,
    stamina: 1,
    mana: 1.5,
    offHandDamage: .7
  },
  Rogue: {
    hp: 1,
    str: 1,
    int: 1,
    dex: 1.5,
    stamina: 1,
    mana: 1,
    offHandDamage: 1
  }
}



export function scaleStats(b: { [name: string]: number }, level: number) {
  return Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v * level]))
}

export class Hero {
  main: Shape
  off: Shape
  body: Shape

  s: Stats
  role: Role
  lvl: number;

  bestEnemy: number = 0

  constructor(role: Role, level: number,) {
    this.role = role;
    this.lvl = level;
    this.updateStats(this.lvl)
  }

  doDay() {
    if (rng1() < .3) {
      let item = generateItem(this.bestEnemy, rng1)
      item.foundBy = this.role;
    }
    let xp = Math.min(0.1, (this.bestEnemy ** 2 / (this.lvl + 1) ** 2.5) * .1);
    this.lvl += xp;
  }

  title() {
    return `${this.role} lvl ${fmt(this.lvl)}`
  }

  equip(slot: Slot, shape: Shape) {
    if (!shape.slots.includes(slot))
      return false;
    if (shape.usedBy) {
      let user = byRole(shape.usedBy);
      user[shape.slot] = null;
      user.updateStats();
    }
    if (this[slot]) {
      this[slot].usedBy = null;
    }
    this[slot] = shape;
    shape.usedBy = this.role;
    shape.slot = slot;
    this.updateStats();
    return true;
  }

  getRandomItems(...gear: string[]) {
    this.equip("main", generateItem(this.lvl, rng1, gear[0]))
    this.equip("off", generateItem(this.lvl, rng1, gear[1]))
    this.equip("body", generateItem(this.lvl, rng1, gear[2]))
    this.updateStats();
    return this
  }

  updateStats(lvl?: number) {
    if (lvl)
      this.lvl = lvl;
    else
      lvl = this.lvl;
    let s = initStats();
    let rs = RoleStats[this.role];
    s.hp = lvl * 5 * rs.hp;
    s.stamina = lvl * 5 * rs.stamina;
    s.mana = lvl * 5 * rs.mana;
    s.str = lvl * rs.str;
    s.int = lvl * rs.int;
    s.dex = lvl * rs.dex;
    s.offHandDamage = rs.offHandDamage;

    for (let item of [this.main, this.off, this.body]) {
      if (!item)
        continue
      for (let k of GearStats) {
        if (item.s[k]) {
          s[k] = (s[k] || 0) + (item.s[k] || 0)
        }
      }
    }
    this.s = s;

    this.findBestEnemy()
  }

  itemStatLimit(item: Shape) {
    let worstMult = 1;
    for (let stat of CoreStats) {
      let mult = Math.min(1, this.s[stat] / item.s[stat]);
      worstMult = Math.min(mult, worstMult)
    }
    return worstMult
  }

  findBestEnemy() {
    let i;
    for (i = 1; i < 1000; i++) {
      let attempt = this.emulateCombat(i);
      if (attempt[0] == false) {
        this.bestEnemy = i - 1;
        return [i - 1, attempt[1]];
      }
    }
  }


  emulateCombat(eLvl: number) {
    let combatLog: string[] = [];
    let s = this.s, turn: number;
    let hp = s.hp,
      mana = s.mana,
      stamina = s.stamina,
      manaShield = s.manaShield,
      enemyHP = eLvl * 3,
      enemyDamage = eLvl,
      enemyBleed = 0,
      evade = 0;

    function log(s: string) {
      combatLog.push(s)
    }


    function createAttackFunction(w: Shape, handMultiplier = 1) {
      if (!w)
        return () => { }

      if (!(w.s.damage > 0)) {
        return () => { }
      }

      let crit = 0,
        speed = 0,
        dmg = w.s.damage * handMultiplier - eLvl / 2;

      let attack = (secondAttack = false) => {
        if (!secondAttack) {
          speed += s.speed - eLvl;
        }

        crit += s.critChance + 10 - eLvl;

        if (stamina < w.s.staminaUse) {
          if (stamina > 0)
            log("Out of Stamina")
          return
        }

        if (mana <= w.s.manaUse) {
          if (mana > 0)
            log("Out of Mana")
          return
        }

        stamina -= w.s.staminaUse;
        mana -= w.s.manaUse
        let cdmg = dmg;
        if (crit >= 100) {
          crit = 0;
          cdmg *= (1.5 + s.critMult / 100);
          log("CRIT!")
        }
        if (turn == 1) {
          cdmg *= 1 + s.firstStrike / 100;
        }

        if (cdmg)
          log(`Dealing ${fmt(cdmg)} damage`)
        else
          log(`Enemy armor blocks all damage`)

        if (enemyBleed) {
          log(`Enemy bleeds for ${fmt(enemyBleed - cdmg - enemyBleed)} dmg`)
        }
        enemyHP -= cdmg + enemyBleed;
        if (isNaN(enemyHP))
          debugger
        if (w.s.bleed)
          enemyBleed += w.s.bleed;
        if (speed > 100) {
          speed = 0;
          attack(true)
        }
      }
      return attack
    }

    let ww = [createAttackFunction(this.main, 1), createAttackFunction(this.off, this.s.offHandDamage)];

    for (turn = 1; turn <= 10; turn++) {

      if (hp <= 0 || enemyHP <= 0)
        return;

      log(`= Turn ${turn} =`)

      ww[0]();
      ww[1]();

      if (enemyHP <= 0) {
        log(`Victory`);
        return [true, combatLog]
      }

      evade += s.evade - eLvl;
      if (evade >= 100) {
        evade = 0
        log("Evading all damage")
      } else {
        let thisTurnEnemyDamage = enemyDamage;
        if (manaShield > 0) {
          let absorbed = Math.min(manaShield, thisTurnEnemyDamage);
          if (absorbed > 0) {
            log(`Mana shield blocks ${absorbed} dmg`)
            manaShield -= absorbed;
            thisTurnEnemyDamage -= absorbed;
          }
        }
        thisTurnEnemyDamage -= s.armor;
        if (thisTurnEnemyDamage > 0) {
          hp -= thisTurnEnemyDamage;
          log(`Taking ${thisTurnEnemyDamage} dmg`)
          if (hp <= 0) {
            log(`No hp - I flee`);
            return [false, combatLog]
          }
        }
      }

      log(`Me: ${fmt(hp)} hp Enemy: ${fmt(enemyHP)} hp`)

    }

    log("Enemy escapes")
    return [false, combatLog]
  }
}