import { Component, render } from "preact";
import { useEffect, useState } from "preact/hooks"
import { generateItem, Shape, XY } from "./Shape";
import { allowedRunes, runeAlias, known, words, rng1, know, showStats, wordBonuses, showStats2 } from "./data";
import { delay, fmt, hashCode, RNG } from "./utils";
import { Hero, Role, Slot } from "./Hero";

const AllSlots = ["main", "off", "body"];

export let s = {
  shape: null as Shape,
  heroes: [] as Hero[],
  runeButton: null as string,
  edited: [-1, 0] as [number, number],
  hovered: [-1, 0] as [number, number],
  storage: [] as Shape[],
  money: 100,
  chosen: null as Role,
  day: 1
}

export function saveState(slot) {
  let data = { money: s.money, day: s.day } as any;
  data.heroes = s.heroes.map(h => ({ lvl: h.lvl }))
  data.storage = s.storage.map(item => item.save())
  data.known = known;
  data.shape = s.storage.indexOf(s.shape);
  data.chosen = s.chosen;
  localStorage["runesmith" + slot] = JSON.stringify(data);
}

export function loadState(slot) {
  let ls = localStorage["runesmith" + slot];
  if (!ls) {
    alert("No save in slot " + slot);
    return;
  }
  let data = JSON.parse(ls);
  for (let i in data.heroes) {
    s.heroes[i].lvl = data.heroes[i].lvl;
  }
  s.money = data.money;
  s.day = data.day;
  know(data.known);
  s.storage = data.storage.map(d => Shape.load(d)); s
  s.shape = s.storage[data.shape];
  s.chosen = data.chosen;
  update()
}

export let ui: App;

export class App extends Component {
  constructor() {
    super()
    ui = this;
  }
  render() {
    return <table class="main">
      <thead>
        <tr><td colSpan={2}>
          {[1, 2, 3].map(slot => <>
            <button onClick={() => saveState(slot)}>Save {slot}</button>
            <button onClick={() => loadState(slot)}>Load {slot}</button>
          </>
          )}
          <button onClick={() => loadState("a")}>Load Autosave</button>
        </td></tr>
      </thead>
      <tbody>
        <tr><td>
          Day: {s.day}<br />
          Funds: ${s.money}
        </td><td rowSpan={2}>
            {s.chosen ? <HeroUI /> : s.shape ? <ShapeUI /> : ""}
          </td></tr>
        <tr><td>{heroCard(s.heroes[0])}</td></tr>
        <tr><td>{heroCard(s.heroes[1])}</td><td rowSpan={2}>
          <div class="storage">
            {s.storage.map(shape => <button class={shape == s.shape ? "current" : ""} onClick={() => update({ shape })}>{shape?.title()}{shape.usedBy ? ` (on ${shape.usedBy})` : ''}</button>)}
          </div>
        </td></tr>
        <tr><td>{heroCard(s.heroes[2])}</td></tr>
      </tbody>
    </table>
  }
}

function heroCard(hero: Hero) {
  return <div class="hero-card">
    <button onClick={() => update({ chosen: hero.role })}><b>{hero.title()}</b></button>

    {AllSlots.map((slot: Slot) => {
      let shape = hero[slot];
      return <div>
        <button onClick={() => shape && update({ shape })}>{shape?.title() || "Nothing"}</button>
        {s.shape?.slots.includes(slot) && s.shape != shape &&
          <button onClick={() => {
            if (s.shape) {
              let ok = hero.equip(slot, s.shape)
              if (!ok)
                alert("wrong slot")
              update();
            }
          }}> &lt; </button>}
      </div>

    })}
    <div class="can-beat"> Can beat lvl {hero.bestEnemy} </div>
  </div>
}

function updateCanvas() {
  let c = document.getElementById("routes") as HTMLCanvasElement, t = document.getElementById("gtable")
  let pr = document.querySelector(".project-rune");

  if (!s.shape || !c || !t || !pr)
    return;

  let scale = pr.getBoundingClientRect().width;
  //console.log("uc", c.height, s.shape.h);

  let rng;

  let canvasPos = (p: XY) => [(p[0] + .7 + rng() * .3) * scale, (p[1] + .5 + rng() * .3) * scale] as XY;

  if (c && t) {
    let b = t.getBoundingClientRect();
    //c.style.border = "solid 0.1px #0004"
    let w = scale * s.shape.w, h = scale * s.shape.h;
    c.width = w;
    c.style.width = `${w}px`;
    c.height = h;
    c.style.height = `${h}px`;
    let cx = c.getContext('2d');
    for (let name in s.shape.solutions) {
      rng = RNG(hashCode(name))
      cx.lineWidth = scale * .05 * (s.shape.activated[name] ? 2 : .7);
      cx.strokeStyle = `hsl(${rng(360)} 80% 60% / 0.7)`
      let sol = s.shape.solutions[name];
      let p = canvasPos(sol[0]);
      cx.beginPath();
      cx.moveTo(...p);
      for (let i = 1; sol[i]; i++) {
        let p = canvasPos(sol[i]);
        cx.lineTo(...p);
      }
      cx.stroke()
    }
  }
}

export async function update(data?: Partial<typeof s>) {
  if (data?.shape)
    data.chosen = undefined;

  if (data)
    s = { ...s, ...data };

  s.shape?.update()
  ui.setState(s)

  updateCanvas();
}

function convertToRune(r: string) {
  r = r?.toLowerCase();
  if (runeAlias[r])
    r = runeAlias[r];
  if (r >= '1' && r <= '9')
    return allowedRunes[Number(r) - 1]
  if (allowedRunes.includes(r) || r == "x" || r == "=")
    return r;
  return null;
}

function HeroUI() {
  let h = s.heroes.find(h => h.role == s.chosen);
  if (!h)
    return ""
  let win = h.emulateCombat(h.bestEnemy)[1]
  let lose = h.emulateCombat(h.bestEnemy + 1)[1]
  return <div class="hero-ui">
    <div>
      = {h.title()} =
      <hr />
      {h.statsString()}
      {AllSlots.map(slot =>
        h[slot] ? <p>
          <div>={h[slot].title()}=<button onClick={() => update({ shape: h[slot] })}>Edit</button></div>
          {h[slot].heroMultiplier != 1 ? <div>
            All bonuses x {fmt(h[slot].heroMultiplier)} because of insufficient {h[slot].limitingStat}
          </div> : ""}
          {showStats2( h[slot].m, h[slot].s)} </p> : ""
      )}
    </div>
    <div class="combat-log">
      <h4>Wins against lvl {h.bestEnemy} enemy</h4>
      {win.map(t => <div>{t}</div>)}
    </div>
    <div class="combat-log">
      <h4>Loses to lvl {h.bestEnemy + 1} enemy</h4>
      {lose.map(t => <div>{t}</div>)}
    </div>
  </div>
}

function ShapeUI() {
  function clickRuneButton(r: string) {
    s.runeButton = r;
    update()
  }

  useEffect(() => {
    let eli = (e: KeyboardEvent) => {
      if (e.code == "Space" || e.code == "Equal" || e.code == "Enter" || e.code.includes("Key") || e.code.includes("Digit") || e.code.includes("Numpad")) {
        let r = [...e.code].pop();
        if (e.code == "Space")
          r = " ";
        if (e.code == "Equal" || e.code == "Enter")
          r = "=";
        applyRune(s.hovered, convertToRune(r))
      }
    }
    document.addEventListener("keydown", eli)
    return () => {
      document.removeEventListener("keydown", eli);
    };
  }, []);

  function applyRune(pos: XY, r: string) {
    if (!r || !pos || pos[0] < 0)
      return;
    let current = s.shape.current[pos[1]][pos[0]];
    if (current != "#")
      return;
    r = convertToRune(r);
    if (r == "x" || r == s.shape.project[pos[1]][pos[0]]) {
      r = s.shape.current[pos[1]][pos[0]];
    }
    if (r == "x")
      return;
    if (r != "=") {
      s.shape.project[pos[1]][pos[0]] = r;
    } else {
      s.shape.carve(pos);
    }
    update()
  }

  function cu(pos: XY, r: string) {
    let current = s.shape.current[pos[1]][pos[0]];
    return <div class={"project-rune" + (current != r ? " changing" : "")}>{r == "#" ? "•" : r}</div>
  }

  return <>
    <div class="item-stats">{s.shape?.statsString()} <button onClick={() => s.shape.sell()}>Sell for ${s.shape.price()}</button></div>

    <div class="bench">
      <div class="gtablediv">
        <table id="gtable"><tbody>
          {s.shape.project.map((l, row) => <tr>
            {l.map((r, col) => <td>
              <div class={"rune "
                + (col == s.edited[0] && row == s.edited[1] ? "current" : "")
              }

                style={{ visibility: r != "." ? "visible" : "hidden" }}
                onMouseDown={e => {
                  if (e.shiftKey) {
                    applyRune([col, row], "=")
                  } else {
                    applyRune([col, row], s.runeButton)
                  }
                }}
                onMouseMove={e => {
                  s.hovered = [col, row]
                  focus()
                  update()
                }}
                onMouseLeave={e => {
                  s.hovered = [...s.edited]
                  update()
                }}
              >{cu([col, row], r)}</div>
            </td>)}
          </tr>)}
        </tbody></table>
      </div>
      <div class="runeButtons">
        {[...allowedRunes, '⨯', '='].map((r, i) => <button class={s.runeButton == r ? "active" : ""} onClick={e => {
          clickRuneButton(r);
        }}> {r == '=' ? '𓍋' : r}<div class="tip">{!allowedRunes.includes(r) ? r : `${r}/${i + 1}`}</div></button>)}
      </div>

      <canvas id="routes"></canvas>
      <div>
        <div class="words">{words.sort((a, b) => (a == known[a] ? a.length : 100) - (b == known[b] ? b.length : 100))
          .map(w =>
            <div class={`word hastip ` + (s.shape?.solutions[w] ? `active` : ``)}>{known[w]}
              <div class="tip">{showStats(wordBonuses[w])}</div>
            </div>
          )}</div>
      </div>
    </div >
  </>
}

export function initUI(shape: Shape, heroes) {
  s.shape = shape;
  s.heroes = heroes
  shape.update();
  render(<App />, document.body)
}

