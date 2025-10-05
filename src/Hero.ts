import { Shape } from "./Shape"

export type Stats = {
  str: number,
  dex: number,
  int: number,

  hp: number,
  stamina: number,
  mana: number,

  damage: number,

  critChance: number,

  critMult: number,

  armor: number,

  manaShield: number,

  speed: number,

  evade: number,

  bleeding: number

  staminaUse: number
  manaUse: number

  poison: number

  regen: number
}

export type CombatState = {
  hp: number
  mana: number
  stamina: number
  enemyHP: number
  enemyPoison: number
  crit: number
  speed: number
  evade: number
  manaShield: number
}

export class Hero {
  main: Shape
  off: Shape
  body: Shape
  stats: Stats

  emulateCombat(eLvl: number) {
    let combatLog: string[] = [];
    let s = this.stats
    let hp = s.hp,
      mana = s.mana,
      stamina = s.stamina,
      manaShield = s.manaShield,
      enemyHP = eLvl * 3,
      enemyDamage = eLvl,
      enemyPoison = 0,
      evade = 0;

    function log(s: string) {
      combatLog.push(s)
    }

    function createAttackFunction(w: Shape) {
      if (!(w.s.damage > 0)) {
        return () => { }
      }

      let crit = 0,
        speed = 0,
        dmg = w.s.damage - eLvl / 2;

      let attack = (secondAttack = false) => {
        if (dmg <= 0)
          return;

        if (!secondAttack) {
          speed += s.speed - eLvl;
        }

        crit += s.critChance - eLvl;

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
        let cdmg = dmg
        if (crit >= 100) {
          crit = 0;
          cdmg *= (1 + s.critMult / 100);
          log("CRIT!")
        }
        log(`Dealt ${cdmg} damage`)
        if (enemyPoison) {
          log(`Poisoned for ${enemyPoison}p`)
        }
        enemyHP -= cdmg + enemyPoison;
        if (enemyHP <= 0)
          log(`Defeat`);
        enemyPoison += w.s.poison;
        if (speed > 100) {
          speed = 0;
          attack(true)
        }
      }
    }

    let ww = [createAttackFunction(this.main), createAttackFunction(this.off)];

    for (let turn = 1; turn <= 10; turn++) {
      
      if (hp <= 0 || enemyHP <= 0)
        return;

      log("Turn " + turn)

      ww[0]();
      ww[1]();

      evade += s.evade - eLvl;
      if (evade >= 100) {
        evade = 0
        log("Evaded all damage")
      } else {
        let thisTurnEnemyDamage = enemyDamage;
        if (manaShield > 0) {
          let absorbed = Math.min(manaShield, thisTurnEnemyDamage);
          if (absorbed > 0) {
            log(`Mana shield blocked ${absorbed} damage`)
            manaShield -= absorbed;
            thisTurnEnemyDamage -= absorbed;
          }
        }
        thisTurnEnemyDamage -= s.armor;
        if (thisTurnEnemyDamage > 0) {
          hp -= thisTurnEnemyDamage;
          log(`Took ${thisTurnEnemyDamage} damage, hp now ${hp}`)
          if (hp <= 0) {
            log(`Defeat`);
          }
        }
      }
    }
  }
}