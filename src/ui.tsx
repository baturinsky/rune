import { Component, render } from "preact";
import { useEffect, useState } from "preact/hooks"
import { Shape, XY } from "./Shape";
import { allowedRunes, runeAlias, known, words } from "./data";
import { delay, hashCode, RNG } from "./utils";

let s = {
  shape: null as Shape,
  runeButton: null as string,
  edited: [-1, 0] as [number, number],
  hovered: [-1, 0] as [number, number],
  known: null
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
        <tr><td colSpan={2}>Header</td></tr>
      </thead>
      <tbody>
        <tr><td>Workbench</td><td rowSpan={2}><ShapeUI /></td></tr>
        <tr><td>Knight</td></tr>
        <tr><td>Wizard</td><td rowSpan={2}>Items</td></tr>
        <tr><td>Rogue</td></tr>
      </tbody>
    </table>
  }
}

function update() {
  s.shape.solve()
  let c = document.getElementById("routes") as HTMLCanvasElement, t = document.getElementById("gtable")
  let rem = c.width / s.shape.w;

  let rng;

  let canvasPos = (p: XY) => [(p[0] + .3 + rng() * .5) * rem, (p[1] + .3 + rng() * .4) * rem] as XY;

  if (c && t) {
    let b = t.getBoundingClientRect();
    c.style.border = "solid 0.1px #0004"
    c.width = b.width;
    c.style.width = `${b.width}px`;
    c.height = b.height;
    c.style.height = `${b.height}px`;
    let cx = c.getContext('2d');
    cx.lineWidth = rem * .05;
    for (let name in s.shape.solutions) {
      rng = RNG(hashCode(name))
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
  ui.setState(s)
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

function ShapeUI() {
  function clickRuneButton(r: string) {
    s.runeButton = r;
    update()
  }

  useEffect(() => {
    let eli = (e: KeyboardEvent) => {
      if (e.code == "Space" || e.code == "Equal"|| e.code == "Enter" || e.code.includes("Key") || e.code.includes("Digit") || e.code.includes("Numpad")) {
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
      s.shape.current[pos[1]][pos[0]] = s.shape.project[pos[1]][pos[0]];
      console.log("carved");
    }
    update()
  }

  function cu(pos: XY, r: string) {
    let current = s.shape.current[pos[1]][pos[0]];
    return <div class={"project-rune" + (current != r ? " changing" : "")}>{r == "#" ? "•" : r}</div>
  }

  return <div class="bench">
    <table id="gtable"><tbody>
      {s.shape.project.map((l, row) => <tr>
        {l.map((r, col) => <td>
          <div class={"rune "
            + (col == s.edited[0] && row == s.edited[1] ? "current" : "")
          }

            style={{ visibility: r != "." ? "visible" : "hidden" }}
            onMouseDown={e => {
              if (e.shiftKey) {
                applyRune([col, row], "x")
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
      <tr><td colSpan={7} style={{ textAlign: "center" }}>
        <div class="runeButtons">
          {[...allowedRunes, '⨯', '='].map((r, i) => <button class={s.runeButton == r ? "active" : ""} onClick={e => {
            clickRuneButton(r);
          }}> {r == '=' ? '𓍋' : r}<div class="tip">{!allowedRunes.includes(r) ? r : `${r}/${i + 1}`}</div></button>)}
        </div>
      </td></tr>
    </tbody></table>
    <canvas id="routes"></canvas>
    <div class="words">{words.sort((a,b)=>(a==known[a]?a.length:100) - (b==known[b]?b.length:100))
    .map(w => <span class={`word ` + (s.shape?.solutions[w] ? `active` : ``)}>{known[w]} </span>)}</div>
  </div>
}

export function initUI(shape: Shape) {
  s.shape = shape;
  shape.solve();
  render(<App />, document.body)
}

