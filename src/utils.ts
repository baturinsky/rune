
let rseed = 0;

/**
 * Генератор случайных чисел
 */
export function RNG(seed: number, integer = false) {

  if (seed < 0)
    seed = -seed;

  if (0 < seed && seed < 1)
    seed = Math.floor(seed * 1e9);
  /**
   * Возвращает случайное целое число от 0 до n
   * @param {number} n 
   */
  let rngi = (n) => {
    seed = (seed * 69069 + 1) % 2 ** 31;
    return seed % n;
  }
  /**
   * Возвращает случайное число от 0 до 1, если вызывается без параметра
   * Возвращает текущий сид, если вызывается с параметром -1
   * Возвращает случайное целое от 0 до n-1 для других параметров
   * @param {number} [n]
   */
  let rng = (n) => {
    return n == -1 ? seed : n == undefined ? rngi(1e9) / 1e9 : rngi(n)
  }
  return rng as (n?: number) => number;
}

export let defaultRng = RNG(Math.random());

export type HSV = { h: number, s: number, v: number };
export type RGB = { r: number, g: number, b: number };

export const msInDay = 1000 * 60 * 60 * 24, msInHour = 1000 * 60 * 60;

const nowSrc = typeof performance !== 'undefined' ? performance : Date;

/**@type {()=>number}*/
export const now = nowSrc.now.bind(nowSrc);


export async function loadTextAssets(names: string[]) {
  let files;
  let rawList = await Promise.all(names.map(name => fetch(`assets/${name}?${Date.now()}`)
    .catch(e => { console.log(`ERROR loading ${name}.json:`, e); return null }
    )));
  let rawTexts = rawList ? await Promise.all(
    rawList.map((v, i) => v.text().catch(e => (console.log(`ERROR parsing ${names[i]}:`, e), e)))
  ) : [];
  files = Object.fromEntries(rawTexts.map((v, i) => [names[i], v]));
  return files as { [id: string]: string };
}

/**
 * Загружает изображение до конца
 */
export async function loadImage(path: string, image?: HTMLImageElement): Promise<HTMLImageElement> {
  return new Promise((done) => {
    if (path != null) {
      image = image ?? new Image();

      //let startTime = Date.now();

      const complete = (image) => {
        //console.log(Date.now()-startTime, path);
        done(image);
      }

      image.onload = () => {
        image.decode().then(() => complete(image))
      };

      image.onerror = (event) => {
        //console.warn(event)
        complete(null);
      };

      image.src = path;
    } else {
      done(null);
    }

  })
}

export const hex2rgb = (hex: string) => {
  if (hex == null) {
    return { r: 0, g: 0, b: 0 }
  }
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  return { r, g, b } as RGB;
};

export const hex2hsv = (hex: string) => rgb2hsv(hex2rgb(hex));

export function hsv2hsl(hsv: HSV) {
  const hslL = (200 - hsv.s) * hsv.v / 100;
  const [hslS, hslV] = [
    hslL === 0 || hslL === 200 ? 0 : hsv.s * hsv.v / 100 / (hslL <= 100 ? hslL : 200 - hslL) * 100,
    hslL * 5 / 10
  ];
  return { h: hsv.h, s: hslS, l: hslV };
}

export const rgb2hsv = ({ r, g, b }: RGB) => {
  let rabs, gabs, babs, rr, gg, bb, h, s, v, diff, diffc, percentRoundFn;
  rabs = r / 255;
  gabs = g / 255;
  babs = b / 255;
  (v = Math.max(rabs, gabs, babs)), (diff = v - Math.min(rabs, gabs, babs));
  diffc = c => (v - c) / 6 / diff + 1 / 2;
  percentRoundFn = num => Math.round(num * 100) / 100;
  if (diff == 0) {
    h = s = 0;
  } else {
    s = diff / v;
    rr = diffc(rabs);
    gg = diffc(gabs);
    bb = diffc(babs);

    if (rabs === v) {
      h = bb - gg;
    } else if (gabs === v) {
      h = 1 / 3 + rr - bb;
    } else if (babs === v) {
      h = 2 / 3 + gg - rr;
    }
    if (h < 0) {
      h += 1;
    } else if (h > 1) {
      h -= 1;
    }
  }
  return {
    h: Math.round(h * 360),
    s: percentRoundFn(s * 100),
    v: percentRoundFn(v * 100)
  } as HSV;
};


// https://stackoverflow.com/questions/20253210/canvas-pattern-offset
/*export function rgbToHex(rgb) {
  const [r, g, b] = rgb
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
*/

export const rgb2hex = ({ r, g, b }: RGB) => {
  const colorToString = color => {
    const s = color.toString(16);
    return s.length < 2 ? `0${s}` : s;
  };

  return `#${colorToString(r)}${colorToString(g)}${colorToString(b)}`;
};

export const hsv2rgb = ({ h, s, v }: HSV) => {
  var r, g, b;
  var i;
  var f, p, q, t;

  // Make sure our arguments stay in-range
  h = Math.max(0, Math.min(360, h));
  s = Math.max(0, Math.min(100, s));
  v = Math.max(0, Math.min(100, v));

  // We accept saturation and value arguments from 0 to 100 because that's
  // how Photoshop represents those values. Internally, however, the
  // saturation and value are calculated from a range of 0 to 1. We make
  // That conversion here.
  s /= 100;
  v /= 100;

  if (s == 0) {
    // Achromatic (grey)
    r = g = b = v;
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  h /= 60; // sector 0 to 5
  i = Math.floor(h);
  f = h - i; // factorial part of h
  p = v * (1 - s);
  q = v * (1 - s * f);
  t = v * (1 - s * (1 - f));

  switch (i) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;

    case 1:
      r = q;
      g = v;
      b = p;
      break;

    case 2:
      r = p;
      g = v;
      b = t;
      break;

    case 3:
      r = p;
      g = q;
      b = v;
      break;

    case 4:
      r = t;
      g = p;
      b = v;
      break;

    default:
      // case 5:
      r = v;
      g = p;
      b = q;
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  } as RGB;
};

export const hsv2hex = (hsv: HSV) => rgb2hex(hsv2rgb(hsv));

export function delay(t?) {
  return new Promise(resolve => {
    setTimeout(resolve, t)
  })
}

/**Вызывает функцию каждый фрейм. Возвращает функцию, останавливающую цикл */
export function repeatEachFrame(work: (deltat: number, t: number) => any) {
  let last = 0;
  let stop = false;
  async function loop(t) {
    try {
      let delayt = work(t - last, t);
      if (delayt > 0)
        await delay(delayt)
    } catch (e) {
      console.error(e);
      debugger;
    }
    last = t;
    if (!stop)
      return requestAnimationFrame(loop);
  }
  loop(0);
  return () => { stop = true };
}

export function range(from: number, to: number) {
  return [...new Array(to - from)].map((v, i) => i + from);
}

export function capital(str) {
  if (str && str.length > 0)
    return str[0].toUpperCase() + str.substr(1);
  else
    return str;
}

export function addEventListeners(target: Element | Window, handlers: { [event: string]: EventListenerOrEventListenerObject }) {
  for (let k in handlers) {
    target.addEventListener(k, handlers[k])
  }
}

export function shuffledArray(array: any[], rng = defaultRng) {
  array = [...array];
  for (var i = array.length - 1; i > 0; i--) {
    var j = rng(i);
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array
}


export function hashCode(seed: string | number) {
  let s = `${seed}`
  var hash = 0,
    i, chr;
  if (s.length === 0) return hash;
  for (i = 0; i < s.length; i++) {
    chr = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

export function debounce(calledFunction, timeoutMs) {
  let lastCallTimer, lastCallDate;
  return function perform(...args) {
    let now = Date.now();
    let untilNextCall = timeoutMs - (now - lastCallDate);
    if (untilNextCall < 0) {
      calledFunction(...args);
      lastCallDate = now;
    } else {
      if (lastCallTimer)
        return;
      lastCallTimer = setTimeout(() => {
        calledFunction(...args)
        lastCallDate = now;
        lastCallTimer = null;
      }, untilNextCall)
    }
  }
}

/**
 * Сумма элементов
*/
export function listSum(list: any[]) {
  return list.reduce((x, y) => x + y, 0);
}


/** Случайный элемент с весами (возвращает индекс) */
export function weightedRandom(list: number[], rng: () => number) {
  let sum = listSum(list);
  let roll = rng() * sum - list[0];
  let i = 0;
  while (roll >= 0) roll -= list[++i];
  return i;
}

export function weightedRandomO(obj: { [id: string]: number }, rng: () => number) {
  let ind = weightedRandom(Object.values(obj), rng);
  return Object.keys(obj)[ind];
}

export function msToHours(n: number) {
  return Math.ceil(n / msInHour);
}

export function randomListElement<T>(list: T[], rng: () => number) {
  return list[~~(rng() * list.length)];
}

/**JSON.parse с обработкой ошибок и пустого значения */
export function JSONOr(s, dflt: any = "_unparsed") {
  if (dflt = "_unparsed")
    dflt = s;
  if (s) {
    try {
      let parsed = JSON.parse(s);
      if (parsed == null)
        return dflt;
      return parsed;
    } catch (e) {
      console.warn(e);
      return dflt
    }
  }
  return dflt;
}


export function asArray(a) {
  if (Array.isArray(a))
    return a;
  else
    return [a]
}

/**Для списка levels пар имя-числовое значение, выводит значения и индексы значений, куда попал n */
function findInterval(n: number, levels: { [id: string]: any } | number[]) {
  let isArray = Array.isArray(levels);
  let values = isArray ? levels : Object.keys(levels);
  let upperInd = values.findIndex(v => v > n);
  if (upperInd == -1) {
    upperInd = values.length;
  }
  let lowerInd = upperInd - 1;

  if (!isArray) {
    lowerInd = values[lowerInd]
    upperInd = values[upperInd]
  }

  let lowerVal = levels[lowerInd];
  let upperVal = levels[upperInd];
  return [lowerVal, upperVal, lowerInd, upperInd];
}

/**Возвращает значение  */
export function pickInterval(value: number | string | boolean, levels: { [id: string]: any } | number[], interpolated = false) {
  let n = Number(value);
  let levelsAsArray = Array.isArray(levels);
  /** Убираем нечисловые индексы */
  if (levelsAsArray) {
    if (levels.indexOf(value) != -1) {
      return String(value);
    }
  } else {
    if (value === true || value === false || !Number.isFinite(value) || levels[value] !== undefined || levels.hasOwnProperty(value)) {
      return levels[value as string]
    }
    levels = Object.fromEntries(Object.entries(levels).filter(([k, v]) => Number.isFinite(Number(k))));
  }

  let [lower, upper, lowerKey, upperKey] = findInterval(n, levels)
  if (lowerKey == undefined)
    return
  if (interpolated) {
    if (upper.length == 0)
      return lower;
    let [a, b] = [lowerKey, upperKey];
    let m = (n - a) / (b - a);
    let [la, lb] = [levels[a], levels[b]]
    if (Number.isFinite(levels[a])) {
      let r = lb * m + la * (1 - m);
      return r
    } else {
      let r = {};
      for (let k in la) {
        r[k] = lb[k] * m + la[k] * (1 - m)
      }
      return r
    }
  } else {
    return lower;
  }
}

/**Возвращает функцию с кешированием результата по первому аргументу */
export function cachedFunction(f: (a: string | number | boolean, ...etc) => any) {
  let cache = {};
  return (arg, ...etc) => cache[arg] ?? (cache[arg] = f(arg, ...etc))
}


function padNum(num, size) {
  num = num.toString();
  while (num.length < size) num = "0" + num;
  return num;
}

export const formatDuration = (ms) => {
  let s = ms / 1000;
  return `${~~(s / 3600)}:${padNum(~~(s % 3600 / 60), 2)}:${padNum(~~(s % 60), 2)}`
}

/**Evaluates value in context of obj. 
 * If noEval=true, just returns obj[value], but with dots in value for subhiclren (i.e. value="foo.bar" give obj.foo.bar) */
export function smartValue(obj: any, value: string, noEval = false) {
  if (value == null)
    return;
  let v;
  if (obj == null)
    return;
  if (noEval || /^[\w.-]+$/i.test(value) && value.substr(0, 4) != "this") {
    let dot = value.indexOf(".");
    if (dot != -1) {
      v = smartValue(obj[value.substr(0, dot)], value.substr(dot + 1), true);
    } else {
      v = obj[value]
    }
  } else {
    v = evalFunction(value).apply(obj);
  }
  return v;
}

export function evalFunction(text) {
  return Function("return (" + text + ")");
}

export function nearestParentId(el:Element){
  while(el){
    if(el.id)
      return el.id;
    el = el.parentElement;
  }
}

/**Похоже на Object.assign, но понимает "пути", т.е. если в имени поля есть точки (foo.bar.baz), 
 * идёт по этому пути в глубь объекта и меняет значение там.
 * Если использовать в конце имени поля .concat, и там находится массив, то дописывает в конец массива */
export function applyWithPath(original, changesList, inplace = false, combineAll = false) {
  changesList = asArray(changesList);
  let changed = inplace ? original : Array.isArray(original) ? original.slice() : { ...original };

  for (let changes of changesList) {
    for (let k in changes) {
      if (changes[k] === undefined || changes[k] == "default")
        continue;
      let dotIn = k.indexOf(".");
      if (dotIn == -1) {
        if (k == "concat" && Array.isArray(changed)) {
          (changed as any[]).push(...changes[k])
        } else if (k == "combine") {
          changed = applyWithPath(changed, changes[k]);
        } else if (k == "combineAll") {
          changed = applyWithPath(changed, changes[k], false, true);
        } else if (k == "multiply") {
          for (let p in changed) {
            changed[p] *= changes[k][p]
          }
        } else {
          changed[k] = combineAll && typeof changes[k] === 'object' ? applyWithPath(changed[k], changes[k], false, true) : changes[k];
        }
      } else {
        let [left, right] = [k.slice(0, dotIn), k.slice(dotIn + 1)];
        changed[left] = applyWithPath(changed[left] ?? {}, { [right]: changes[k] });
      }
    }
  }
  return changed
}


export function deepCopy(a){
  return JSON.parse(JSON.stringify(a));
}