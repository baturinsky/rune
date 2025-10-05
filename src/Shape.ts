import { allowedRunes, known, words } from "./data";
import { Stats } from "./Hero";
import { ui } from "./ui";
import { deepCopy, hashCode, randomListElement, RNG } from "./utils";

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

export type XY = [number, number];

export class Shape {
  w: number;
  h: number;
  current: string[][];
  project: string[][];
  solutions: { [name: string]: XY[] } = {}
  s:Stats

  title(){
    return this.name;
  }

  constructor(public name: string, data: { shape: string, skipChance?: number, letterChance?: number }) {
    let raw = data.shape.trim();
    let lines = raw.split("\n");
    this.w = lines[0].length;
    this.h = lines.length
    this.current = lines.map(l => [...l]);

    if (data.skipChance || data.letterChance) {
      let rng = RNG(Math.random())
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
  }

  toString() {
    return this.current.join("\n")
  }

  copy() {
    return new Shape(this.name, { shape: this.toString() })
  }

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

  solve(ww: string[] = words) {
    let solutions: { [name: string]: XY[] } = {}
    for (let w of ww) {
      this.eachCell(p => {
        let solution = this.solveStarting(p, w, known[w] != w, []);
        if (solution) {
          solutions[w] = solution;
          return true
        }
      })
    }
    this.solutions = solutions;
    for(let k in solutions){
      if(known[k] != k){
        known[k] = k;
        console.log("Found new word: " + k);
        ui.forceUpdate()
      }
    }
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

}