import { allowedRunes, generateWordBonus, known, rawShapes, rng1, showStats, wordBonuses, words } from "./data";
import { Stats } from "./data";
import { byRole, initStats, Role, Slot } from "./Hero";
import { s, saveState, ui, update } from "./ui";
import { capital, debounce, deepCopy, fmt, hashCode, randomListElement, RNG } from "./utils";

const neighborsDeltas = [[1, 0], [-1, 0], [0, 1], [0, -1]] as XY[]

export function sum(a: XY, b: XY) {
  return [a[0] + b[0], a[1] + b[1]] as XY
}

export function sub(a: XY, b: XY) {
  return [a[0] - b[0], a[1] - b[1]] as XY
}

export function same(a: XY, b: XY) {
  return a[0] == b[0] && a[1] == b[1]
}

export function addStat(a, b, m = 1) {
  for (let k in b)
    a[k] = (a[k] || 0) + b[k] * m;
}

export type XY = [number, number];

export function generateItem(level: number, rng, kind?) {
  level = ~~level;
  kind ??= randomListElement(Object.keys(rawShapes), rng);
  let raw = rawShapes[kind];
  let shape = new Shape(kind, { ...raw, skipChance: .1, letterChance: .2 })
  shape.s = { ...initStats(), ...shape.s };
  for (let k in raw.stats) {
    shape.s[k] = ~~(raw.stats[k] * level);
  }
  let bonus = generateWordBonus(rng(2) + 3, shape.s.damage > 0);
  addStat(shape.s, bonus, level);
  shape.level = level;
  shape.update();
  s.storage.push(shape)
  return shape;
}

export class Shape {
  w: number;
  h: number;
  current: string[][];
  project: string[][];
  solutions: { [name: string]: XY[] } = {}
  activated: { [name: string]: XY[] } = {}
  s: Partial<Stats> = {}
  /**panalised stats */
  m: Partial<Stats> = {}
  level: number
  warp = 0
  slots: Slot[]
  usedBy: Role
  slot: Slot
  foundBy: Role
  heroMultiplier: number
  limitingStat: string

  title() {
    return `${capital(this.name)}${this.pluses() ? "+" + this.pluses() : ""} ${fmt(this.level)}`;
  }

  pluses() {
    return Object.keys(this.activated).length;
  }

  save() {
    return {
      level: this.level,
      warp: this.warp,
      name: this.name,
      slot: this.slot,
      usedBy: this.usedBy,
      foundBy: this.foundBy,
      activated: this.activated,
      s: this.s,
      current: this.current.map(l => l.join('')).join("\n"),
      project: this.project.map(l => l.join('')).join("\n"),
    }
  }

  static load(data) {
    let shape = generateItem(data.level, rng1, data.name)
    Object.assign(shape, data)
    shape.current = data.current.split("\n").map(l => [...l])
    shape.project = data.project.split("\n").map(l => [...l])
    if (shape.usedBy) {
      let hero = byRole(shape.usedBy);
      hero.equip(data.slot, shape);
    }
    shape.update()
    shape.s = data.s;
    return shape;
  }

  constructor(public name: string, data: { shape: string, skipChance?: number, letterChance?: number, slots?: Slot[] }) {
    let raw = data.shape.trim();
    let lines = raw.split("\n");
    this.w = lines[0].length;
    this.h = lines.length
    this.current = lines.map(l => [...l]);
    this.slots = data.slots;

    if (data.skipChance || data.letterChance) {
      let rng = RNG(rng1())
      this.eachCell(p => {
        if (this.current[p[1]][p[0]] == ".")
          return
        if (rng() < data.skipChance) {
          this.current[p[1]][p[0]] = "."
        } else if (rng() < data.letterChance) {
          this.current[p[1]][p[0]] = randomListElement(allowedRunes, rng);
        }
      })
    }
    this.project = deepCopy(this.current);
    this.solve();
    this.warp = 0;
  }

  leveledCopy() {

  }

  toString() {
    return this.current.join("\n")
  }

  //copy() {    return new Shape(this.name, { shape: this.toString() })  }

  eachCell(cb: (p: XY) => boolean | void) {
    for (let col = 0; col < this.w; col++) {
      for (let row = 0; row < this.h; row++) {
        if (cb([col, row]))
          return;
      }
    }
  }

  p(pos: XY) {
    return (this.project[pos[1]] || [])[pos[0]];
  }

  setp(pos: XY, v) {
    (this.project[pos[1]] || [])[pos[0]] = v;
  }


  c(pos: XY) {
    return (this.current[pos[1]] || [])[pos[0]];
  }

  setc(pos: XY, v) {
    (this.current[pos[1]] || [])[pos[0]] = v;
  }

  update() {
    this.solve(true);
    this.solve(false);
  }

  solve(inCurrent: boolean = false) {
    let solutions: { [name: string]: XY[] } = {}
    for (let w of words) {
      this.eachCell(p => {
        let solution = this.solveStarting(p, w, inCurrent || known[w] != w, []);
        if (solution) {
          solutions[w] = solution;
          return true
        }
      })
    }
    for (let k in solutions) {
      if (known[k] != k) {
        known[k] = k;
        console.log("Found new word: " + k);
        ui?.forceUpdate()
      }
    }
    if (inCurrent) {
      for (let k in solutions) {
        if (!this.activated[k]) {
          let bonus = wordBonuses[k];
          addStat(this.s, bonus, this.level);
          this.warp++;

          for (let l of k) {
            for (let k in known) {
              if (known[k] != k) {
                [...k].forEach((ll, i) => {
                  if (ll == l && rng1() < .005) {
                    let chars = [...known[k]];
                    chars[i] = l;
                    known[k] = chars.join('');
                  }
                })
              }
            }
          }

        }
      }
      this.activated = solutions;
    } else {
      this.solutions = solutions;
    }
    return solutions
  }

  statsString() {
    return `=${this.title()}= Carving cost: $${this.carveCost()} | ${this.foundBy ? `Found by ${this.foundBy} | ` : ""} ${showStats(this.s)}`
  }

  carveCost() {
    return 2 ** this.warp
  }

  carve(pos: XY) {
    if (s.money < this.carveCost()) {
      alert("Too expensive!")
      return;
    }
    update({ money: s.money - this.carveCost(), day: s.day + 1 })
    for (let h of s.heroes) {
      h.doDay();
    }
    let l = this.project[pos[1]][pos[0]];
    this.current[pos[1]][pos[0]] = l;
    this.warp++;
    saveState("a")
  }

  solveStarting(pos: XY, text: string, inCurrent: boolean, taken: XY[]) {
    let runeHere = inCurrent ? this.c(pos) : this.p(pos);
    if (text[0] != runeHere)
      return false;
    text = text.substring(1, 100);
    if (text.length == 0)
      return [pos];
    for (let nd of neighborsDeltas) {
      let nextPos = sum(pos, nd);
      if (taken.some(a => same(a, nextPos)))
        continue;
      let solution = this.solveStarting(nextPos, text, inCurrent, [...taken, pos])
      if (solution)
        return [pos, ...solution];
    }
    return false;
  }

  sell() {
    let ind = s.storage.indexOf(this);
    s.storage = s.storage.filter(shape => shape != this);
    update({ money: s.money + this.price(), shape: s.shape == this ? (ind>1?s.storage[ind-1]:null) : s.shape })
  }

  price() {
    return ~~(this.level + 1)
  }

}