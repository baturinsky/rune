import { CoreStats, GearStats, rng1, showStats, Stats } from "./data"
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
    str: 2,
    int: 1.2,
    dex: 1.2,
    hp: 1.2,
    stamina: 1.5,
    mana: 1,
    offHandDamage: .7
  },
  Wizard: {
    hp: 1,
    str: 1.2,
    int: 2,
    dex: 1.2,
    stamina: 1,
    mana: 2,
    offHandDamage: .7
  },
  Rogue: {
    hp: 1,
    str: 1.2,
    int: 1.2,
    dex: 2,
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

  statsString() {
    return `${showStats(this.s)}`;
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
    this.calculateHeroMultiplier(shape);
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
          s[k] = (s[k] || 0) + (item.m[k] || 0)
        }
      }
    }
    this.s = s;

    this.findBestEnemy()
  }

  calculateHeroMultiplier(item: Shape) {
    let worstMult = 1, limitingStat = '';
    for (let stat of CoreStats) {
      let mult = Math.min(1, this.s[stat] / item.s[stat]);
      if (mult < worstMult) {
        worstMult = mult;
        limitingStat = stat;
      }
    }
    item.heroMultiplier = worstMult
    item.limitingStat = limitingStat;

    item.m = Object.fromEntries(Object.entries(item.s).map(([k, v]) => [k, v * item.heroMultiplier]));

    //if (item.heroMultiplier < 1)      console.log(item.s, item.m);

    //console.log(worstMult, limitingStat);
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


  emulateCombat(eLvl: number): [boolean, string[]] {
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

      if (!(w.m.damage > 0)) {
        return () => { }
      }

      let crit = 0,
        speed = 0,
        dmg = w.m.damage * handMultiplier - eLvl / 2;

      let attack = (secondAttack = false) => {
        if (!secondAttack) {
          speed += w.m.speed - eLvl;
        }

        crit += w.m.critChance + 10 - eLvl;

        let staminaUse = w.s.staminaUse || 0, manaUse = w.s.manaUse || 0;

        if (stamina <staminaUse) {
          if (stamina > 0)
            log("Out of Stamina")
          return
        }

        if (mana <= manaUse) {
          if (mana > 0)
            log("Out of Mana")
          return
        }

        stamina -= staminaUse;
        mana -= manaUse
        let cdmg = dmg;
        
        if (crit >= 100) {
          crit = 0;
          cdmg *= (1.5 + s.critMult / 100);
          log("CRIT!")
        }
        if (turn == 1) {
          cdmg *= 1 + s.firstStrike / 100;
        }

        if (cdmg>0)
          log(`Dealing ${fmt(cdmg)} damage`)
        else
          log(`Enemy armor blocks all damage`)

        if (enemyBleed) {
          log(`Enemy bleeds for ${fmt(enemyBleed)} dmg`)
        }

        enemyHP -= cdmg + enemyBleed;
        if (isNaN(enemyHP))
          debugger
        if (w.m.bleed && cdmg>0)
          enemyBleed += w.m.bleed;
        if (speed > 100) {
          speed = 0;
          log("EXTRA STRIKE!")
          attack(true)
        }
      }
      return attack
    }

    let ww = [createAttackFunction(this.main, 1), createAttackFunction(this.off, this.s.offHandDamage)];

    for (turn = 1; turn <= 20; turn++) {

      if (hp <= 0 || enemyHP <= 0)
        return;

      log('⠀')
      log(`= Turn ${turn} =`)

      ww[0]();
      ww[1]();

      if (enemyHP <= 0) {
        log(`Victory`);
        return [true, combatLog]
      }

      if(this.s.regen){
        log(`Regen ${fmt(s.regen)} hp`)
        hp += this.s.regen;
      }

      evade += s.evade - eLvl;
      if (evade >= 100) {
        evade = 0
        log("EVADE!")
      } else {
        let thisTurnEnemyDamage = enemyDamage;
        if (manaShield > 0) {
          let absorbed = Math.min(manaShield, thisTurnEnemyDamage);
          if (absorbed > 0) {
            log(`Mana shield ${fmt(manaShield)} -> ${fmt(manaShield-absorbed)}`)
            manaShield -= absorbed;
            thisTurnEnemyDamage -= absorbed;
          }
        }
        thisTurnEnemyDamage -= s.armor;
        if (thisTurnEnemyDamage > 0) {
          hp -= thisTurnEnemyDamage;
          log(`Taking ${fmt(thisTurnEnemyDamage)} dmg`)
          if (hp <= 0) {
            log(`${fmt(hp)} hp left. Need better defence.`);
            return [false, combatLog]
          }
        }
      }

      log(`Me: ${fmt(hp)} hp | Enemy: ${fmt(enemyHP)} hp`/* | Mana: ${fmt(mana)} | Stamina: ${fmt(stamina)}`*/)

    }

    log("Turn limit reached, enemy escapes. Have to deal damage faster.")
    return [false, combatLog]
  }
}