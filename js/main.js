/* The Joshua Tree (U2) · infografía interactiva
   El árbol se dibuja con los datos: cada rama es la forma de onda de una canción y su copa encierra
   el radar de atributos. Los datos salen de data/joshua-tree.json, los textos de data/texts.json
   y los iconos y el mapa de assets/art.svg. */
(async function () {
  "use strict";

  // ---------- Geometría (lienzo de 1500 x 3240) ----------
  const W = 1500, H = 3240;
  const MOBILE_VIEW = [190, 815, 1300, 1730];        // en pantallas estrechas solo se ve el árbol
  const FEATS = ["danceability", "energy", "speechiness", "acousticness", "instrumentalness", "valence"]; // en sentido horario desde arriba
  const LEGEND_ORDER = ["danceability", "valence", "energy", "speechiness", "instrumentalness", "acousticness"];
  const R_UNIT = 0.894;      // el valor 1000 queda al 89 % del eje, como en los radares originales
  const L = 60;              // longitud del eje de cada radar
  const RD = 66;             // radio del disco de la copa
  // Medidas de cada tipo de rama y copa. La rama es la forma de onda: un núcleo de madera que adelgaza
  // de la base (C0) a la punta (C1) y, encima, la amplitud de la canción (hasta SPK a cada lado).
  // Las caras B son brotes pequeños que salen de la rama de su sencillo.
  const SIZE = {
    album: { RD, L, C0: 9, C1: 2.4, SPK: 10, label: 22 },
    bside: { RD: 27, L: 25, C0: 4, C1: 1.2, SPK: 5, label: 17 }
  };
  const sz = d => SIZE[d.type] || SIZE.album;
  const halfMax = S => S.C0 + S.SPK;
  const MIXED = new Set(["where-the-streets-have-no-name", "with-or-without-you", "bullet-the-blue-sky", "red-hill-mining-town"]);

  // Ramas de madera (sin datos) que salen del tronco y de las que nacen las canciones.
  // p0: inicio (dentro del tronco) · c: final · a0, a1: ángulos de salida y llegada (0 = derecha, -90 = arriba)
  // k: tensión de la curva · w: semianchura al principio y al final
  const LIMBS = {
    L: { p0: [748, 1900], c: [600, 1712], a0: -100, a1: -165, k: [0.55, 0.45], w: [30, 13] },
    C: { p0: [774, 1890], c: [768, 1565], a0: -90, a1: -95, k: [0.4, 0.4], w: [30, 13] },
    R: { p0: [800, 1900], c: [950, 1722], a0: -80, a1: -15, k: [0.55, 0.45], w: [30, 13] }
  };
  // Ramas de las canciones. c: centro de la copa · from: [rama de la que nace, fracción de su longitud]
  // label: [x, y, alineación, anchura] del rótulo
  const LAYOUT = {
    "bullet-the-blue-sky":            { c: [650, 935],   from: ["C", 1], a0: -92, a1: -112, k: [0.45, 0.4], label: [546, 872, "end", 300] },
    "running-to-stand-still":         { c: [890, 950],   from: ["bullet-the-blue-sky", 0.25], a0: -55, a1: -100, k: [0.5, 0.45], label: [996, 895, "start", 300] },
    "red-hill-mining-town":           { c: [1110, 1140], from: ["C", 0.85], a0: -62, a1: -30, k: [0.5, 0.45], label: [1216, 1095, "start", 284] },
    "with-or-without-you":            { c: [430, 1110],  from: ["L", 1], a0: -95, a1: -120, k: [0.5, 0.45], label: [327, 1062, "end", 300] },
    "i-still-havent-found":           { c: [345, 1445],  from: ["L", 1], a0: -170, a1: -125, k: [0.5, 0.45], label: [242, 1392, "end", 222] },
    "where-the-streets-have-no-name": { c: [380, 1820],  from: ["L", 0.8], a0: 175, a1: 140, k: [0.5, 0.4], label: [276, 1772, "end", 250] },
    "in-gods-country":                { c: [1035, 1425], from: ["R", 1], a0: -80, a1: -100, k: [0.45, 0.4], label: [1141, 1377, "start", 240] },
    "trip-through-your-wires":        { c: [1340, 1570], from: ["R", 1], a0: -15, a1: -35, k: [0.5, 0.45], label: [1340, 1668, "middle", 220] },
    "one-tree-hill":                  { c: [1340, 1880], from: ["R", 0.95], a0: 15, a1: 20, k: [0.5, 0.45], label: [1340, 1974, "middle", 220] },
    "mothers-of-the-disappeared":     { c: [1010, 2040], from: ["R", 0.35], a0: 60, a1: 95, k: [0.5, 0.45], label: [1010, 2168, "middle", 210] },
    "exit":                           { c: [1280, 2215], from: ["mothers-of-the-disappeared", 0.5], a0: -15, a1: 70, k: [0.5, 0.45], label: [1386, 2185, "start", 110] },
    // Caras B
    "luminous-times":    { c: [590, 1135], from: ["with-or-without-you", 0.6], a0: -30, a1: -80, k: [0.5, 0.45], label: [582, 1036, "middle", 175] },
    "walk-to-the-water": { c: [450, 1300], from: ["with-or-without-you", 0.42], a0: -160, a1: -100, k: [0.5, 0.45], label: [404, 1280, "end", 150] },
    "spanish-eyes":      { c: [200, 1600], from: ["i-still-havent-found", 0.88], a0: 150, a1: 120, k: [0.5, 0.45], label: [158, 1588, "end", 130] },
    "deep-in-the-heart": { c: [330, 1640], from: ["i-still-havent-found", 0.65], a0: 110, a1: 100, k: [0.5, 0.45], label: [330, 1690, "middle", 110] },
    "silver-and-gold":   { c: [640, 1905], from: ["where-the-streets-have-no-name", 0.22], a0: 90, a1: 80, k: [0.5, 0.45], label: [640, 1955, "middle", 100] },
    "sweetest-thing":    { c: [525, 1920], from: ["where-the-streets-have-no-name", 0.5], a0: 95, a1: 90, k: [0.5, 0.45], label: [525, 1970, "middle", 110] },
    "race-against-time": { c: [440, 1990], from: ["where-the-streets-have-no-name", 0.6], a0: 100, a1: 80, k: [0.5, 0.45], label: [404, 1980, "end", 90] }
  };
  // Lugares del mapa: [longitud, latitud, canción asociada]
  const PLACES = {
    dublin: [-6.26, 53.35, null, "rec"], deathvalley: [-116.87, 36.42, null, "photo"],
    ethiopia: [39.5, 9.0, "where-the-streets-have-no-name"], elsalvador: [-88.9, 13.7, "bullet-the-blue-sky"],
    buenosaires: [-58.38, -34.6, "mothers-of-the-disappeared"], auckland: [174.76, -36.85, "one-tree-hill"]
  };
  const LEGEND_C = [228, 2150], LEGEND_L = 78;

  // ---------- Carga ----------
  const [data, texts, art, trunkSvg] = await Promise.all([
    d3.json("data/joshua-tree.json"),
    d3.json("data/texts.json"),
    d3.xml("assets/art.svg"),
    d3.xml("assets/trunk.svg")
  ]);
  const trunkNode = document.importNode(trunkSvg.querySelector("#trunk-path"), true);
  const all = data.tracks;                                  // las 11 del disco y las 7 caras B
  const tracks = all.filter(t => t.type === "album");
  const bsides = all.filter(t => t.type === "bside");
  const byId = new Map(all.map(t => [t.id, t]));
  const albumItem = { id: "album", type: "albuminfo", title: data.album.title, features: data.album.features_mean };
  const order = ["album", ...tracks.map(t => t.id), ...bsides.map(t => t.id)];
  const itemOf = id => (id === "album" ? albumItem : byId.get(id));
  const LAST_N = tracks.length;

  // ---------- Estado ----------
  const mq = window.matchMedia("(max-width: 720px)");
  const state = { lang: initialLang(), active: null, mobile: mq.matches, compare: false, explore: null };
  const T = () => window.I18N[state.lang];

  function initialLang() {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "es" || q === "en") return q;
    try { const s = localStorage.getItem("joshua-tree-lang"); if (s === "es" || s === "en") return s; } catch (e) { /* sin almacenamiento */ }
    return (navigator.language || "es").toLowerCase().startsWith("es") ? "es" : "en";
  }

  const svg = d3.select("#viz");
  const panel = d3.select("#panel");
  const defs = svg.append("defs");
  art.querySelectorAll("defs > g").forEach(n => defs.node().appendChild(document.importNode(n, true)));
  const artNode = id => document.importNode(art.querySelector("#" + id), true);

  // ---------- Geometría de las ramas ----------
  const rad = a => a * Math.PI / 180;
  // Muestrea una Bézier cúbica a pasos iguales de longitud: devuelve n puntos con su normal
  function sampleBezier(P, n, cut) {
    const M = 800, raw = [];
    for (let i = 0; i <= M; i++) {
      const t = i / M, u = 1 - t;
      raw.push([
        u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0],
        u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1]
      ]);
    }
    const acc = [0];
    for (let i = 1; i <= M; i++) acc.push(acc[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
    const len = acc[M] - (cut || 0), out = [];
    let j = 0;
    for (let i = 0; i < n; i++) {
      const s = len * i / (n - 1);
      while (j < M - 1 && acc[j + 1] < s) j++;
      const f = (s - acc[j]) / ((acc[j + 1] - acc[j]) || 1);
      const x = raw[j][0] + f * (raw[j + 1][0] - raw[j][0]), y = raw[j][1] + f * (raw[j + 1][1] - raw[j][1]);
      const dx = raw[j + 1][0] - raw[j][0], dy = raw[j + 1][1] - raw[j][1], d = Math.hypot(dx, dy) || 1;
      out.push({ x, y, nx: -dy / d, ny: dx / d });
    }
    out.len = len;
    return out;
  }
  // La onda sobre la rama, de la muestra i0 a la i1: una barra fina cada BAR_GAP unidades, como en un editor de audio
  const BAR_GAP = 3.1;
  function ribbon(pts, widths, i0, i1) {
    const step = Math.max(1, Math.round(BAR_GAP / (pts.len / (pts.length - 1))));
    let d = "";
    for (let i = Math.ceil(i0 / step) * step; i <= i1; i += step) {
      let w = 0;
      for (let j = i; j < Math.min(i + step, pts.length); j++) if (widths[j] > w) w = widths[j];
      const p = pts[i];
      d += `M${(p.x + p.nx * w).toFixed(1)},${(p.y + p.ny * w).toFixed(1)}L${(p.x - p.nx * w).toFixed(1)},${(p.y - p.ny * w).toFixed(1)}`;
    }
    return d;
  }
  const centerline = pts => "M" + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("L");
  function resample(arr, m) {      // conserva los picos al reducir
    const out = [];
    for (let i = 0; i < m; i++) {
      const lo = Math.floor(i * arr.length / m), hi = Math.max(lo + 1, Math.floor((i + 1) * arr.length / m));
      out.push(d3.max(arr.slice(lo, hi)));
    }
    return out;
  }

  // Amplitud que se dibuja en cada tramo de la onda
  const AMP = new URLSearchParams(location.search).get('amp') || 'peaks';
  const amp = t => (AMP === 'peaks' ? t.peaks : t.rms);

  // Ramas: cada una nace de una rama de madera o de la rama de otra canción
  const G = {};
  const bezier = (p0, lay, cut) => {
    const d = Math.hypot(lay.c[0] - p0[0], lay.c[1] - p0[1]);
    const P = [p0,
      [p0[0] + Math.cos(rad(lay.a0)) * d * lay.k[0], p0[1] + Math.sin(rad(lay.a0)) * d * lay.k[0]],
      [lay.c[0] - Math.cos(rad(lay.a1)) * d * lay.k[1], lay.c[1] - Math.sin(rad(lay.a1)) * d * lay.k[1]],
      lay.c];
    return sampleBezier(P, 200, cut);
  };
  Object.entries(LIMBS).forEach(([k, lay]) => {
    const pts = bezier(lay.p0, lay, 0);
    G[k] = { pts, w: pts.map((p, i) => lay.w[0] + (lay.w[1] - lay.w[0]) * Math.pow(i / (pts.length - 1), 0.8)) };
  });
  const pointOn = (id, f) => { const pp = G[id].pts; const q = pp[Math.round(f * (pp.length - 1))]; return [q.x, q.y]; };
  function buildBranch(id) {
    if (G[id] && G[id].pts) return;
    const lay = LAYOUT[id], parent = lay.from[0];
    if (!LIMBS[parent]) buildBranch(parent);
    const p0 = pointOn(parent, lay.from[1]);
    const t = byId.get(id), n = t.peaks.length, S = sz(t);
    const dd = Math.hypot(lay.c[0] - p0[0], lay.c[1] - p0[1]);
    const P = [p0,
      [p0[0] + Math.cos(rad(lay.a0)) * dd * lay.k[0], p0[1] + Math.sin(rad(lay.a0)) * dd * lay.k[0]],
      [lay.c[0] - Math.cos(rad(lay.a1)) * dd * lay.k[1], lay.c[1] - Math.sin(rad(lay.a1)) * dd * lay.k[1]],
      lay.c];
    const pts = sampleBezier(P, n, S.RD - 2);
    const core = pts.map((p, i) => S.C0 + (S.C1 - S.C0) * Math.pow(i / (n - 1), 0.7));
    G[id] = { pts, core, w: amp(t).map((a, i) => core[i] + a * S.SPK), origin: p0 };
  }
  all.forEach(t => buildBranch(t.id));
  // Contorno relleno de una rama de grosor variable (núcleo de madera)
  function solid(pts, widths) {
    const a = [], b = [];
    pts.forEach((p, i) => {
      a.push(`${(p.x + p.nx * widths[i]).toFixed(1)},${(p.y + p.ny * widths[i]).toFixed(1)}`);
      b.push(`${(p.x - p.nx * widths[i]).toFixed(1)},${(p.y - p.ny * widths[i]).toFixed(1)}`);
    });
    return "M" + a.join("L") + "L" + b.reverse().join("L") + "Z";
  }

  // Comprobación de solapamientos (solo con ?debug): ramas, copas y rótulos que se tocan
  function checkOverlaps() {
    const items = [];
    const circ = (id, x, y, r) => items.push({ id, kind: "copa", x, y, r });
    all.forEach(t => {
      const g = G[t.id], S = sz(t);
      g.pts.forEach((p, i) => { if (i % 6 === 0) items.push({ id: t.id, kind: "rama", x: p.x, y: p.y, r: g.w[i] }); });
      circ(t.id, LAYOUT[t.id].c[0], LAYOUT[t.id].c[1], S.RD + 4);
    });
    const parentOf = id => (LAYOUT[id] ? LAYOUT[id].from[0] : null);
    const related = (a, b) => a === b || parentOf(a) === b || parentOf(b) === a || (parentOf(a) && parentOf(a) === parentOf(b) && LIMBS[parentOf(a)]);
    const near = (a, b) => Math.hypot(a.x - G[a.id].origin[0], a.y - G[a.id].origin[1]) < 60 || Math.hypot(b.x - G[b.id].origin[0], b.y - G[b.id].origin[1]) < 60;
    const hits = new Set();
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (a.id === b.id) continue;
      if (related(a.id, b.id) && a.kind === "rama" && b.kind === "rama" && near(a, b)) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r + 3) hits.add([a.id, a.kind, b.id, b.kind].join(" / "));
    }
    // rótulos: cajas contra copas y ramas
    svg.selectAll(".t-title, .t-meta").each(function () {
      const bb = this.getBBox(), id = this.parentNode.dataset.id;
      items.forEach(o => {
        const cx = Math.max(bb.x, Math.min(o.x, bb.x + bb.width)), cy = Math.max(bb.y, Math.min(o.y, bb.y + bb.height));
        if (Math.hypot(cx - o.x, cy - o.y) < o.r + 2 && !(o.id === id && o.kind === "copa")) hits.add(`rótulo ${id} / ${o.id} ${o.kind}`);
      });
    });
    return [...hits];
  }

  // ---------- Etiqueta flotante ----------
  const tip = d3.select("#tip");
  function showTip(html, ev) {
    tip.html(html).attr("hidden", null);
    const w = tip.node().offsetWidth, h = tip.node().offsetHeight;
    const x = Math.min(window.innerWidth - w - 8, Math.max(8, ev.clientX + 14));
    const y = ev.clientY + 18 + h > window.innerHeight ? ev.clientY - h - 12 : ev.clientY + 18;
    tip.style("left", x + "px").style("top", y + "px");
  }
  function hideTip() { tip.attr("hidden", ""); }

  // ---------- Utilidades de dibujo ----------
  const fmtDate = iso => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${T().months[m - 1]} ${y}`; };
  const fmtVal = v => Math.round(v * 1000);
  const iconSvg = f => `<svg class="ic" viewBox="-13 -15 26 30" aria-hidden="true"><use href="#ic-${f}"/></svg>`;
  const mmss = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  const titleOf = d => d.title + (MIXED.has(d.id) ? " *" : "");

  function radarPath(feats, len) {
    const line = d3.lineRadial()
      .angle((d, i) => i * Math.PI / 3)
      .radius(d => d * R_UNIT * len)
      .curve(d3.curveCardinalClosed.tension(0.35));
    return line(FEATS.map(f => feats[f]));
  }
  function drawRadar(g, len, feats) {
    const grid = g.append("g").attr("class", "grid");
    [0.2, 0.4, 0.6, 0.8].forEach(v => grid.append("circle").attr("class", "ring").attr("r", v * R_UNIT * len));
    FEATS.forEach((f, i) => {
      const a = i * Math.PI / 3 - Math.PI / 2;
      grid.append("line").attr("class", "axis").attr("x2", Math.cos(a) * len).attr("y2", Math.sin(a) * len);
    });
    if (feats) g.append("path").attr("class", "blob").attr("d", radarPath(feats, len));
  }

  // Texto con saltos de línea automáticos. parts: [{t, cls}]
  function wrapText(text, parts, width, lh) {
    const x = text.attr("x");
    const probe = text.append("tspan");
    const measure = (s, cls) => { probe.text(s).attr("class", cls || null); return probe.node().getComputedTextLength(); };
    const space = measure("a a") - measure("aa");
    const lines = [[]]; let w = 0;
    parts.forEach(p => p.t.split(/\s+/).filter(Boolean).forEach(word => {
      const ww = measure(word, p.cls);
      if (w > 0 && w + space + ww > width) { lines.push([]); w = 0; }
      lines[lines.length - 1].push({ word, cls: p.cls }); w += (w > 0 ? space : 0) + ww;
    }));
    probe.remove();
    lines.forEach((ln, i) => {
      const row = text.append("tspan").attr("x", x).attr("dy", i === 0 ? 0 : lh);
      let run = null;
      ln.forEach((it, j) => {
        if (!run || run.cls !== it.cls) { run = { cls: it.cls, el: row.append("tspan").attr("class", it.cls || null), s: "" }; }
        run.s += (j > 0 ? " " : "") + it.word; run.el.text(run.s);
      });
      row.selectAll("tspan").attr("xml:space", "preserve");
    });
    return lines.length;
  }

  // ---------- Render principal ----------
  let root;
  function render() {
    const t = T(), mobile = state.mobile;
    document.documentElement.lang = t.lang;
    document.title = t.pageTitle;
    d3.select("#viz-title").text(t.vizTitle);
    d3.select("#intro").html(`${t.intro} <span class="intro-more">${t.introMore}</span> <span class="intro-keys">${t.introKeys}</span>`);
    d3.selectAll(".lang button").attr("aria-pressed", function () { return this.dataset.lang === state.lang; });

    svg.selectAll(":scope > g").remove();
    svg.attr("viewBox", mobile ? MOBILE_VIEW.join(" ") : `0 0 ${W} ${H}`).classed("is-mobile", mobile);
    root = svg.append("g").attr("class", "root");

    if (!mobile) {
      // Cabecera: título, foto de portada entre dos filetes dorados
      root.append("text").attr("class", "big-title").attr("x", 750).attr("y", 112).attr("textLength", 1290).attr("lengthAdjust", "spacing").text("THE JOSHUA TREE U2");
      root.append("rect").attr("class", "rule").attr("x", 0).attr("y", 190).attr("width", W).attr("height", 8);
      root.append("image").attr("href", "assets/cover.jpg").attr("x", 0).attr("y", 198).attr("width", W).attr("height", 589).attr("preserveAspectRatio", "xMidYMid slice");
      root.append("rect").attr("class", "rule").attr("x", 0).attr("y", 787).attr("width", W).attr("height", 8);
      root.append("rect").attr("class", "rule").attr("x", 0).attr("y", 2528).attr("width", W).attr("height", 8);
      // Datos generales del álbum
      const stats = root.append("text").attr("class", "stats").attr("x", 40).attr("y", 868)
        .attr("tabindex", 0).attr("role", "button").attr("aria-label", `${data.album.title}. ${t.album}`)
        .on("click", () => activate("album"))
        .on("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); activate("album"); } });
      t.stats.forEach((s, i) => stats.append("tspan").attr("x", 40).attr("dy", i ? 25 : 0).text(s));
    }

    // Tronco (de la silueta del árbol de la portada) y ramas de madera
    const wood = root.append("g").attr("class", "tree-wood");
    wood.node().appendChild(trunkNode.cloneNode(true));
    Object.entries(LIMBS).forEach(([k, lay]) => {
      wood.append("path").attr("class", "limb").attr("d", solid(G[k].pts, G[k].w));
      wood.append("circle").attr("class", "limb").attr("cx", lay.c[0]).attr("cy", lay.c[1]).attr("r", lay.w[1]);
    });
    // Ramas de las canciones: primero los brotes de las caras B, luego las ramas del disco
    const branches = root.append("g").attr("class", "branches");
    [...bsides].reverse().forEach(d => drawWave(branches, d, G[d.id], "branch bside", halfMax(SIZE.bside)));
    [...tracks].reverse().forEach(d => drawWave(branches, d, G[d.id], "branch", halfMax(SIZE.album)));

    // Una copa interactiva por canción
    const layer = root.append("g").attr("class", "tracks");
    all.forEach(d => {
      const id = d.id, lay = LAYOUT[id], { RD, L } = sz(d), isB = d.type === "bside", SPIKE = isB ? 6 : 12;
      const g = layer.append("g")
        .attr("class", "track" + (isB ? " bside" : "")).attr("data-id", id)
        .attr("tabindex", 0).attr("role", "button")
        .attr("aria-label", `${isB ? T().bsideOf(byId.get(d.parent).title) : d.n + "."} ${d.title}. ${d.duration}, ${d.bpm} bpm, ${d.key}`)
        .on("click", () => activate(id))
        .on("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); activate(id); } });

      const r = g.append("g").attr("transform", `translate(${lay.c})`);
      r.append("circle").attr("class", "disc").attr("r", RD);
      r.append("path").attr("class", "crown-prog");
      r.append("circle").attr("class", "halo").attr("r", RD + 6);
      drawRadar(r, L, d.features);
      r.append("path").attr("class", "mean").attr("d", radarPath(data.album.features_mean, L));
      const dot = r.append("circle").attr("class", "vdot").attr("r", 3.4).style("display", "none");
      // un sector invisible por eje: recoge el clic y muestra el valor exacto al pasar el puntero
      FEATS.forEach((f, i) => {
        const a = i * Math.PI / 3;
        r.append("path").attr("class", "hit")
          .attr("d", d3.arc()({ innerRadius: 0, outerRadius: RD + SPIKE, startAngle: a - Math.PI / 6, endAngle: a + Math.PI / 6 }))
          .on("pointermove", ev => {
            if (ev.pointerType === "touch") return;
            const rr = d.features[f] * R_UNIT * L;
            dot.attr("cx", Math.sin(a) * rr).attr("cy", -Math.cos(a) * rr).style("display", null);
            showTip(`<span class="tip-title">${d.title}</span>${iconSvg(f)}<b>${T().features[f][1]}</b> ${fmtVal(d.features[f])}` +
              ` <span class="tip-sub">${T().mean} ${fmtVal(data.album.features_mean[f])}</span>`, ev);
          })
          .on("pointerleave", () => { dot.style("display", "none"); hideTip(); });
      });
      const badge = r.append("g").attr("class", "badge");
      if (isB) badge.attr("transform", "scale(0.8)");
      badge.append("rect").attr("x", -34).attr("y", -13).attr("width", 68).attr("height", 26).attr("rx", 13);
      badge.append("text").attr("y", 5);

      if (mobile) {
        // en móvil solo cabe el número; los títulos van en la lista de debajo
        const [lx, , anchor] = lay.label, side = anchor === "end" ? -1 : anchor === "start" ? 1 : 0;
        if (isB) {
          g.append("text").attr("class", "m-num b").attr("text-anchor", "middle")
            .attr("x", lay.c[0]).attr("y", lay.c[1] + RD + SPIKE + 30).text(d.n);
          return;
        }
        g.append("text").attr("class", "m-num").attr("text-anchor", "middle")
          .attr("x", side ? lay.c[0] + side * (RD + SPIKE + 30) : lx).attr("y", side ? lay.c[1] + 16 : lay.c[1] + RD + SPIKE + 52).text(d.n);
        return;
      }
      const [x, y, anchor, width] = lay.label, lh = sz(d).label;
      const title = g.append("text").attr("class", "t-title" + (isB ? " b" : "")).attr("x", x).attr("y", y).attr("text-anchor", anchor);
      const nl = wrapText(title, [{ t: String(d.n), cls: "num" }, { t: titleOf(d).toUpperCase(), cls: "name" }], width, lh);
      if (isB) {
        const meta = g.append("text").attr("class", "t-meta b").attr("x", x).attr("y", y + nl * lh + 1).attr("text-anchor", anchor);
        [`${d.duration} · ${d.bpm} bpm`, d.key].forEach((l, i) => meta.append("tspan").attr("x", x).attr("dy", i ? lh - 1 : 0).text(l));
        return;
      }
      const lines = [d.duration, d.bpm + " bpm", d.key];
      if (d.single) lines.push(`(${fmtDate(d.single)})`);
      const meta = g.append("text").attr("class", "t-meta").attr("x", x).attr("y", y + nl * 22 + 3).attr("text-anchor", anchor);
      lines.forEach((l, i) => meta.append("tspan").attr("x", x).attr("dy", i ? 22 : 0).text(l));
    });

    if (!mobile) { drawLegend(root, t); drawCredits(root, t); }
    markActive();
    renderMobileBlocks(t);
    renderTools(t);
    if (state.active) renderPanel();
    updatePlayerUI();
    updateExplore();
  }

  // Dibuja una onda (rama o tramo del tronco) con su progreso, su cabezal y su zona de pulsación
  function drawWave(parent, d, geo, kind, half) {
    const { pts, w: widths, core } = geo;
    const n = pts.length, g = parent.append("g").attr("class", "wave " + kind).attr("data-id", d.id);
    g.append("path").attr("class", "core").attr("d", solid(pts, core));
    g.append("path").attr("class", "wood").attr("d", ribbon(pts, widths, 0, n - 1));
    g.append("path").attr("class", "core-prog");
    g.append("path").attr("class", "wood-prog");
    const ghost = g.append("line").attr("class", "ghost").style("display", "none");
    const head = g.append("g").attr("class", "playhead").style("display", "none");
    head.append("line");
    if (kind === "branch" && !state.mobile) head.append("text");
    const across = (sel, i, extra) => {
      const p = pts[i], w = half + extra;
      sel.attr("x1", p.x + p.nx * w).attr("y1", p.y + p.ny * w).attr("x2", p.x - p.nx * w).attr("y2", p.y - p.ny * w);
    };
    const indexAt = ev => {
      const [mx, my] = d3.pointer(ev, root.node());
      let best = 0, bd = Infinity;
      for (let i = 0; i < n; i += 2) { const q = (pts[i].x - mx) ** 2 + (pts[i].y - my) ** 2; if (q < bd) { bd = q; best = i; } }
      return best;
    };
    const fracOf = i => Math.min(0.985, i / (n - 1));
    const durOf = () => (player.id === d.id && player.dur ? player.dur : d.duration_ms);
    let dragging = false;
    const onMove = ev => {
      const i = indexAt(ev);
      across(ghost, i, 7); ghost.style("display", null);
      if (ev.pointerType !== "touch") showTip(`<b>${d.n}. ${d.title}</b> · ${mmss(fracOf(i) * durOf())}`, ev);
    };
    const onLeave = () => { ghost.style("display", "none"); hideTip(); };
    g.append("path").attr("class", "wave-hit").attr("d", centerline(pts)).attr("stroke-width", half * 2 + 12)
      .on("pointerdown", function (ev) { dragging = true; try { this.setPointerCapture(ev.pointerId); } catch (e) { /* sin captura */ } onMove(ev); })
      .on("pointermove", onMove)
      .on("pointerup", ev => { if (dragging) { dragging = false; activate(d.id, fracOf(indexAt(ev))); } if (ev.pointerType === "touch") onLeave(); })
      .on("pointercancel", () => { dragging = false; onLeave(); })
      .on("pointerleave", () => { if (!dragging) onLeave(); });
    // lo que hace falta para mover el progreso sin volver a dibujar
    g.node().__wave = { pts, widths, core, half, across, n };
  }

  // ---------- Herramientas: comparar con la media y explorar por atributo ----------
  function renderTools(t) {
    d3.select("#tools").html(
      `<button type="button" class="chip" id="t-compare" aria-pressed="${state.compare}"><span class="dash"></span>${t.compare}</button>` +
      `<span class="tools-label">${t.explore}:</span>` +
      LEGEND_ORDER.map(f => `<button type="button" class="chip" data-f="${f}" aria-pressed="${state.explore === f}">${iconSvg(f)}${t.features[f][1]}</button>`).join("") +
      `<span class="tools-hint" id="tools-hint"></span>`);
    d3.select("#t-compare").on("click", () => { state.compare = !state.compare; renderTools(T()); updateExplore(); });
    d3.selectAll("#tools [data-f]").on("click", function () {
      state.explore = state.explore === this.dataset.f ? null : this.dataset.f; renderTools(T()); updateExplore();
    });
    d3.select("#tools-hint").text(state.explore ? t.exploreHint : state.compare ? t.compareHint : "");
  }

  function updateExplore() {
    const f = state.explore;
    svg.classed("show-mean", state.compare).classed("exploring", !!f);
    const dim = (id, v) => {
      svg.selectAll(`.track[data-id="${id}"] .disc`).style("fill-opacity", v);
      svg.selectAll(`.wave[data-id="${id}"] .wood, .wave[data-id="${id}"] .core`).style("opacity", v);
    };
    if (!f) { all.forEach(d => dim(d.id, null)); return; }
    const ranked = [...all].sort((a, b) => b.features[f] - a.features[f]);
    const max = ranked[0].features[f], min = ranked[ranked.length - 1].features[f];
    const norm = v => Math.min(1, Math.max(0, (v - min) / ((max - min) || 1)));
    all.forEach(d => {
      dim(d.id, 0.16 + 0.84 * norm(d.features[f]));
      const rank = ranked.indexOf(d) + 1;
      svg.select(`.track[data-id="${d.id}"] .badge text`).text(`${state.lang === "es" ? rank + "º" : "#" + rank} · ${fmtVal(d.features[f])}`);
    });
  }

  function drawLegend(root, t) {
    const g = root.append("g").attr("class", "legend");
    const [cx, cy] = LEGEND_C, len = LEGEND_L;
    const lr = g.append("g").attr("transform", `translate(${cx},${cy})`).attr("class", "legend-radar")
      .attr("tabindex", 0).attr("role", "button").attr("aria-label", `${t.meanCaption}. ${t.album}`)
      .on("click", () => activate("album"))
      .on("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); activate("album"); } });
    lr.append("circle").attr("class", "hit").attr("r", len);
    drawRadar(lr, len, data.album.features_mean);
    [[800, 4], [600, 3], [400, 2], [200, 1], [0, 0]].forEach(([v, k]) =>
      lr.append("text").attr("class", "tick").attr("y", -k * 0.2 * R_UNIT * len + 3.5).text(v));
    // rótulo e icono de cada eje
    FEATS.forEach((f, i) => {
      const a = i * Math.PI / 3, sx = Math.sin(a), sy = -Math.cos(a);
      const side = Math.abs(sx) < 0.1 ? 0 : Math.sign(sx);
      const lx = cx + sx * (len + 8) + side * 4, ly = cy + sy * (len + 8) + (side ? (sy < 0 ? -2 : 12) : (sy < 0 ? -6 : 16));
      g.append("text").attr("class", "lg-label").attr("x", lx).attr("y", ly).attr("text-anchor", side > 0 ? "start" : side < 0 ? "end" : "middle").text(t.features[f][0]);
      const ix = side ? lx + side * 22 : cx, iy = side ? ly + (sy < 0 ? -26 : 24) : ly + (sy < 0 ? -30 : 24);
      g.append("use").attr("href", "#ic-" + f).attr("class", "lg-icon").attr("transform", `translate(${ix},${iy}) scale(1.35)`);
    });
    g.append("text").attr("class", "lg-caption").attr("x", cx).attr("y", cy + len + 78).text(t.meanCaption);
    // clave de lectura de los rótulos y de la metáfora
    const kx = 372, ky = 2075;
    const key = g.append("text").attr("class", "key").attr("x", kx).attr("y", ky);
    key.append("tspan").text(t.key.n + " ");
    key.append("tspan").text(t.key.song.toUpperCase());
    t.key.lines.forEach(l => key.append("tspan").attr("x", kx + 12).attr("dy", 22).text(l));
    const how = g.append("text").attr("class", "howto").attr("x", kx).attr("y", ky + (t.key.lines.length + 1) * 22 + 22);
    t.howto.forEach((l, i) => how.append("tspan").attr("x", kx).attr("dy", i ? 20 : 0).text(l));
    // definiciones
    let y = how.node().getBBox().y + how.node().getBBox().height + 26;
    LEGEND_ORDER.forEach(f => {
      g.append("use").attr("href", "#ic-" + f).attr("class", "lg-icon").attr("transform", `translate(52,${y - 5}) scale(0.95)`);
      const tx = g.append("text").attr("class", "lg-desc").attr("x", 74).attr("y", y);
      y += wrapText(tx, [{ t: t.features[f][1] + ":", cls: "b" }, { t: t.features[f][2] }], 590, 18) * 18 + 2;
    });
  }

  // La misma proyección con la que se generó el mapa de assets/art.svg (scripts/make_art.mjs)
  const mapEl = art.querySelector("#map");
  const projection = d3.geoNaturalEarth1().scale(+mapEl.getAttribute("data-scale")).translate(mapEl.getAttribute("data-translate").split(",").map(Number));
  function placeHtml(k, t) {
    const [city, what, text] = t.places[k];
    return `<span class="tip-title">${city} · ${what}</span>${text}`;
  }
  function drawCredits(root, t) {
    const g = root.append("g").attr("class", "credits").attr("transform", "translate(0,120)");
    const top = g.append("text").attr("class", "cr-top").attr("x", 750).attr("y", 2466);
    [t.band, t.members, ...t.creditsTop].forEach((l, i) => top.append("tspan").attr("x", 750).attr("dy", i ? 36 : 0).text(l));
    // mapa de los lugares del disco
    g.node().appendChild(artNode("map"));
    Object.entries(PLACES).forEach(([k, [lon, lat, song, kind]]) => {
      const [x, y] = projection([lon, lat]), html = placeHtml(k, t);
      if (kind === "rec") g.append("path").attr("class", "pin").attr("transform", `translate(${x},${y})`).attr("d", "M0,0C-2,-5 -6,-8 -6,-12.5A6,6 0 1 1 6,-12.5C6,-8 2,-5 0,0Z");
      else g.append("circle").attr("class", "place " + (kind || "song")).attr("cx", x).attr("cy", y).attr("r", 4);
      g.append("circle").attr("class", "pin-hit").attr("cx", x).attr("cy", kind === "rec" ? y - 8 : y).attr("r", 11)
        .attr("tabindex", 0).attr("role", "button").attr("aria-label", `${t.places[k][0]}. ${t.places[k][1]}. ${t.places[k][2]}`)
        .on("pointerenter pointermove", ev => showTip(html, ev))
        .on("pointerleave", hideTip)
        .on("click", ev => { ev.stopPropagation(); if (song) select(song, { scroll: true }); else showTip(html, ev); })
        .on("keydown", ev => { if (song && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); select(song, { scroll: true }); } })
        .on("focus", function () { const b = this.getBoundingClientRect(); showTip(html, { clientX: b.right, clientY: b.top }); })
        .on("blur", hideTip);
    });
    g.append("text").attr("class", "map-caption").attr("x", 325).attr("y", 3014).text(t.placesTitle);
    let y = 2786;
    t.credits.forEach(l => {
      const tx = g.append("text").attr("class", "cr").attr("x", 640).attr("y", y);
      y += wrapText(tx, [{ t: l }], 800, 25.5) * 25.5;
    });
    const foot = g.append("text").attr("class", "cr-foot").attr("x", 750).attr("y", 3090);
    foot.append("tspan").text(t.source);
    foot.append("a").attr("href", "https://javiercanton.com").attr("target", "_blank").attr("rel", "noopener").append("tspan").attr("class", "link").text("javiercanton.com");
  }

  // ---------- Distribución de cada atributo (diagrama de caja con las 11 canciones) ----------
  const DIST = {};
  FEATS.forEach(f => {
    const v = tracks.map(d => d.features[f]).sort(d3.ascending);
    DIST[f] = { v, min: v[0], max: v[v.length - 1], q1: d3.quantile(v, 0.25), q3: d3.quantile(v, 0.75), mean: data.album.features_mean[f] };
  });
  const pct = x => (x * 100).toFixed(1) + "%";
  function distHtml(f, value, t) {
    const s = DIST[f];
    return `<span class="dist" role="img" aria-label="${fmtVal(value)}; ${t.distAria} ${fmtVal(s.mean)}">` +
      `<span class="d-axis"></span>` +
      `<span class="d-range" style="left:${pct(s.min)};width:${pct(s.max - s.min)}"></span>` +
      `<span class="d-box" style="left:${pct(s.q1)};width:${pct(s.q3 - s.q1)}"></span>` +
      s.v.map(x => `<span class="d-pt" style="left:${pct(x)}"></span>`).join("") +
      `<span class="d-mean" style="left:${pct(s.mean)}"></span>` +
      `<span class="d-val" style="left:${pct(value)}"></span></span>`;
  }
  const licenseHtml = t => `${t.license} <a href="${t.licenseUrl}" target="_blank" rel="license noopener" title="${t.licenseHint}">CC BY-ND 4.0</a>`;

  // ---------- Bloques HTML para móvil ----------
  function renderMobileBlocks(t) {
    d3.select("#m-head").html(`<h1>The Joshua Tree <span>U2</span></h1><img src="assets/cover.jpg" alt="" width="1501" height="589">` +
      `<p class="m-stats">${t.stats.join(" · ")}</p>`);
    d3.select("#m-legend").html(
      `<h2>${t.legendTitle}</h2><p>${t.howto.join(" ")}</p><p class="note">${t.legendScale}</p><ul class="lg">` +
      LEGEND_ORDER.map(f => `<li>${iconSvg(f)}<span><b>${t.features[f][1]}</b>: ${t.features[f][2]}</span></li>`).join("") + "</ul>");
    d3.select("#m-tracks").html(`<h2>${t.tracksTitle}</h2><ol class="tl">` +
      tracks.map(d => `<li><button type="button" data-id="${d.id}"><span class="n">${d.n}</span><span class="ti">${titleOf(d)}</span><span class="du">${d.duration}</span></button></li>`).join("") +
      `</ol><p class="note">${t.mixedNote}</p>` +
      `<h2>${t.bsidesTitle}</h2><ol class="tl">` +
      bsides.map(d => `<li><button type="button" data-id="${d.id}"><span class="n">${d.n}</span><span class="ti">${d.title}<small>${t.bsideOf(byId.get(d.parent).title)}</small></span><span class="du">${d.duration}</span></button></li>`).join("") +
      `</ol>`);
    d3.selectAll("#m-tracks button").on("click", function () { activate(this.dataset.id); });
    d3.select("#m-credits").html(
      `<h2>${t.creditsTitle}</h2>` +
      `<p><b>${t.band}</b>: ${t.members}</p>` +
      [...t.creditsTop, ...t.credits].map(l => `<p>${l}</p>`).join("") +
      `<h2>${t.placesTitle}</h2>` +
      Object.keys(PLACES).map(k => `<p><b>${t.places[k][0]} · ${t.places[k][1]}.</b> ${t.places[k][2]}</p>`).join("") +
      `<h2>${t.sourceTitle}</h2><p>${t.sourceShort}</p>` +
      `<p>${t.by} · <a href="https://javiercanton.com" target="_blank" rel="noopener">javiercanton.com</a></p>` +
      `<p class="lic">${licenseHtml(t)}</p>`);
    d3.select("#foot").html(`<span class="lic">${licenseHtml(t)}</span>`);
  }

  // ---------- Selección y panel de detalle ----------
  function markActive() {
    svg.selectAll(".track").classed("active", function () { return this.dataset.id === state.active; });
    svg.selectAll(".wave").classed("active", function () { return this.dataset.id === state.active; });
    svg.selectAll(".legend-radar, .stats").classed("active", state.active === "album");
  }

  function select(id, opts) {
    state.active = id;
    markActive();
    if (id) {
      renderPanel();
      if (!(opts && opts.silent)) history.replaceState(null, "", "#" + id);
      const node = svg.select(id === "album" ? ".legend-radar" : `.track[data-id="${id}"]`).node();
      if (node && state.mobile) {
        // en móvil el panel ocupa la parte baja: se sube la copa elegida a la zona visible
        window.scrollBy({ top: node.getBoundingClientRect().top - 90, behavior: "smooth" });
      } else if (node && opts && opts.scroll) {
        node.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    } else {
      panel.attr("aria-hidden", "true"); document.body.classList.remove("panel-open");
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  function renderPanel() {
    const t = T(), id = state.active, d = itemOf(id), isAlbum = id === "album";
    const txt = (texts[id] && texts[id][state.lang]) || "";
    const i = order.indexOf(id), prev = order[(i - 1 + order.length) % order.length], next = order[(i + 1) % order.length];
    let kicker, meta;
    if (isAlbum) {
      kicker = t.album;
      meta = t.stats.map(s => `<span>${s}</span>`).join("");
    } else {
      kicker = d.type === "bside" ? t.bsideOf(byId.get(d.parent).title) : `${t.song} ${d.n} · ${t.side[d.side]}`;
      meta = `<span><i>${t.duration}</i> ${d.duration}</span><span><i>${t.tempo}</i> ${d.bpm} bpm</span><span><i>${t.keyLabel}</i> ${d.key}</span>` +
        (d.single ? `<span><i>${t.single}</i> ${fmtDate(d.single)}${d.single_scope ? ` (${t.scopes[d.single_scope]})` : ""}</span>` : "") +
        (d.type === "bside" ? `<span><i>${t.single}</i> ${fmtDate(byId.get(d.parent).single)}</span>` : "");
    }
    const bars = LEGEND_ORDER.map(f =>
      `<li>${iconSvg(f)}<span class="fn">${t.features[f][1]}</span>` +
      `${distHtml(f, d.features[f], t)}<span class="fv">${fmtVal(d.features[f])}</span></li>`).join("");
    // El panel tiene tres zonas: cabecera y cuerpo se repintan; la del reproductor es fija para que
    // el iframe de Spotify no se destruya al cambiar de canción.
    if (panel.select("#p-top").empty()) {
      panel.append("div").attr("id", "p-top");
      const slot = panel.append("div").attr("id", "player-slot").attr("hidden", "");
      slot.append("div").attr("id", "embed-wrap").append("div").attr("id", "embed");
      slot.append("p").attr("class", "player-note").attr("id", "player-note");
      panel.append("div").attr("id", "p-rest");
    }
    panel.select("#p-top").html(
      `<div class="p-head"><p class="kicker">${kicker}</p><button type="button" class="close" aria-label="${t.close}">×</button></div>` +
      `<h2>${d.title}</h2>` +
      `<p class="meta">${meta}</p>` +
      (isAlbum ? "" : `<p class="player"><button type="button" class="btn play-btn" data-play="${id}"></button>` +
        `<a class="ext" href="https://open.spotify.com/track/${d.spotify_id}" target="_blank" rel="noopener">${t.listen} ↗</a></p>`));
    panel.select("#p-rest").html(
      (txt ? `<p class="txt">${txt}</p>` : "") +
      (!isAlbum && MIXED.has(id) ? `<p class="note">${t.mixedNote}</p>` : "") +
      (isAlbum ? `<p class="note">${t.albumMean}</p>` : "") +
      `<ul class="bars">${bars}</ul><p class="dist-legend">${t.distLegend}</p>` +
      `<div class="nav"><button type="button" data-go="${prev}">← ${itemOf(prev).title}</button><button type="button" data-go="${next}">${itemOf(next).title} →</button></div>`);
    panel.attr("aria-hidden", "false"); document.body.classList.add("panel-open");
    panel.select(".close").on("click", () => select(null));
    panel.selectAll("[data-go]").on("click", function () { select(this.dataset.go, { scroll: true }); });
    panel.select("#p-rest").append("p").attr("class", "keys d-only").text(t.keysHint);
    panel.select(".play-btn").on("click", function () { play(this.dataset.play); });
    panel.node().scrollTop = 0;
    updatePlayerUI();
  }

  // ---------- Reproductor (Spotify iFrame API) ----------
  // Un único reproductor incrustado para toda la página. Con sesión iniciada en Spotify suena la canción
  // completa; sin ella, un fragmento de 30 segundos. La posición que comunica Spotify mueve el progreso
  // sobre la rama, la copa y el tramo del tronco.
  const player = { api: null, ctrl: null, creating: false, id: null, paused: true, pos: 0, dur: 0, stamp: 0, full: false, error: false, started: false, alive: false, ended: false };

  function loadSpotifyApi() {
    if (!player.api) {
      player.api = new Promise((resolve, reject) => {
        window.onSpotifyIframeApiReady = api => resolve(api);
        const s = document.createElement("script");
        s.src = "https://open.spotify.com/embed/iframe-api/v1"; s.async = true;
        s.onerror = () => reject(new Error("Spotify iFrame API"));
        setTimeout(() => reject(new Error("Spotify iFrame API: tiempo agotado")), 6000);
        document.head.appendChild(s);
      });
    }
    return player.api;
  }

  // Controlador de reserva. Si el navegador bloquea el script de la API (algunos bloqueadores lo hacen),
  // se crea el iframe a mano y se habla con él con los mismos mensajes que usa la API oficial.
  function fallbackController(el, uri) {
    const ORIGIN = "https://open.spotify.com", listeners = {};
    let loading = true, queue = [], current = "";
    const iframe = document.createElement("iframe");
    iframe.title = "Spotify"; iframe.width = "100%"; iframe.height = "80"; iframe.setAttribute("frameborder", "0");
    iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    const post = msg => { if (iframe.contentWindow) iframe.contentWindow.postMessage(msg, ORIGIN); };
    const send = msg => { if (loading) queue.push(msg); else post(msg); };
    window.addEventListener("message", e => {
      if (e.source !== iframe.contentWindow || !e.data || !e.data.type) return;
      if (e.data.type === "ready") { loading = false; const q = queue; queue = []; q.forEach(post); post({ command: "load_complete_ack" }); }
      (listeners[e.data.type] || []).forEach(h => h({ data: e.data.payload || {} }));
    });
    const ctrl = {
      loadUri(u, _video, t) {
        if (u === current) return;
        current = u; loading = true; queue = [];
        iframe.src = `${ORIGIN}/embed/track/${u.split(":").pop()}?theme=0&utm_source=iframe-api${t ? "&t=" + t : ""}`;
      },
      play() { send({ command: "play" }); },
      resume() { send({ command: "resume" }); },
      togglePlay() { send({ command: "toggle" }); },
      restart() { send({ command: "play_from_start" }); },
      seek(sec) { send({ command: "seek", timestamp: sec }); },
      addListener(name, h) { (listeners[name] = listeners[name] || []).push(h); }
    };
    el.replaceWith(iframe);
    ctrl.loadUri(uri);
    return ctrl;
  }

  // Abre el panel de una pista y la hace sonar. frac (0-1) es el punto de inicio si se pulsó sobre la rama.
  function activate(id, frac) {
    if (id === "album") { select(id); return; }
    if (state.active !== id) select(id);
    play(id, frac);
  }

  function play(id, frac) {
    const d = byId.get(id); if (!d) return;
    const same = player.id === id && player.ctrl;
    if (same && frac == null) {
      if (player.ended) { player.ended = false; player.ctrl.restart(); } else player.ctrl.togglePlay();
      return;
    }
    if (same) {                                   // salto dentro de la canción que ya suena
      player.ctrl.seek(Math.floor(frac * (player.dur || d.duration_ms) / 1000));
      if (player.paused) player.ctrl.resume();
      return;
    }
    // el salto inicial solo tiene sentido si sabemos que suena la canción completa
    const startAt = frac != null && player.full ? Math.floor(frac * d.duration_ms / 1000) : 0;
    player.id = id; player.pos = startAt * 1000; player.dur = 0; player.paused = true; player.started = false; player.ended = false;
    d3.select("#player-slot").attr("hidden", null);
    updatePlayerUI();
    if (player.ctrl) { player.ctrl.loadUri(d.spotify_uri, false, startAt); player.ctrl.play(); return; }
    if (player.creating) return;                  // al terminar de crearse cargará la última pista pedida
    player.creating = true; player.error = false;
    const el = () => document.getElementById("embed"), uri = () => byId.get(player.id).spotify_uri;
    loadSpotifyApi()
      .then(api => new Promise(done => api.createController(el(), { uri: uri(), width: "100%", height: 80, theme: "dark" }, done)),
            () => fallbackController(el(), uri()))
      .then(ctrl => {
        player.ctrl = ctrl; player.creating = false;
        ctrl.addListener("ready", () => { player.alive = true; player.error = false; updatePlayerUI(); });
        ctrl.addListener("playback_update", e => { player.alive = true; player.error = false; onPlayback(e); });
        ctrl.play();
        // si el reproductor no da señales de vida, es que el navegador bloquea Spotify por completo
        setTimeout(() => { if (!player.alive) { player.error = true; updatePlayerUI(); } }, 9000);
      });
  }

  function onPlayback(e) {
    const s = e.data || {}, cur = byId.get(player.id);
    if (!cur || (s.playingURI && s.playingURI !== cur.spotify_uri)) return;   // aviso de una pista anterior
    player.pos = s.position || 0; player.dur = s.duration || 0; player.paused = !!s.isPaused; player.stamp = performance.now();
    if (!player.paused) player.started = true;
    if (player.dur > 35000) player.full = true;
    // Fin de pista: Spotify deja la posición al final sin avisar de la pausa. Se pasa a la siguiente
    // canción, como al escuchar el álbum; tras la última, el reproductor queda parado.
    const ended = player.dur > 0 && player.pos >= player.dur - 400;
    if (ended && !player.ended) {
      player.ended = true; player.paused = true;
      updatePlayerUI();
      if (cur.type === "album" && cur.n < LAST_N) {
        const next = tracks.find(t => t.n === cur.n + 1);
        if (state.active === cur.id) select(next.id);
        play(next.id);
      }
      return;
    }
    if (!ended) player.ended = false; else player.paused = true;
    updatePlayerUI();
  }

  // Posición estimada entre dos avisos de Spotify, para que el progreso avance con suavidad
  function currentPos() {
    if (!player.dur) return player.pos;
    return Math.min(player.dur, player.paused ? player.pos : player.pos + (performance.now() - player.stamp));
  }
  function updateProgress() {
    const cur = player.id ? byId.get(player.id) : null;
    const pos = currentPos(), frac = cur && player.dur ? Math.min(1, pos / player.dur) : 0;
    svg.selectAll(".wave").each(function () {
      const wv = this.__wave, on = !!cur && this.dataset.id === cur.id, g = d3.select(this);
      const k = Math.round(frac * (wv.n - 1));
      g.select(".wood-prog").attr("d", on && k > 0 ? ribbon(wv.pts, wv.widths, 0, k) : null);
      g.select(".core-prog").attr("d", on && k > 1 ? solid(wv.pts.slice(0, k + 1), wv.core.slice(0, k + 1)) : null);
      const head = g.select(".playhead").style("display", on ? null : "none");
      if (on) {
        wv.across(head.select("line"), k, 6);
        const p = wv.pts[k], tx = head.select("text");
        if (!tx.empty()) {
          const sgn = p.nx > 0 ? 1 : -1;      // el tiempo, siempre hacia la derecha de la rama
          tx.attr("x", p.x + sgn * p.nx * (wv.half + 12)).attr("y", p.y + sgn * p.ny * (wv.half + 12) + 5)
            .text(player.dur ? mmss(pos) : "");
        }
      }
    });
    svg.selectAll(".crown-prog").each(function () {
      const id = this.parentNode.parentNode.dataset.id, on = !!cur && id === cur.id, R = sz(byId.get(id)).RD;
      d3.select(this).attr("d", on && frac > 0 ? d3.arc()({ innerRadius: R + 1.5, outerRadius: R + 6, startAngle: 0, endAngle: 2 * Math.PI * frac }) : null);
    });
    d3.select("#now-time").text(cur && player.dur ? `${mmss(pos)} / ${mmss(player.dur)}` : "");
  }
  (function tick() {
    if (player.id && !player.paused && !document.hidden) updateProgress();
    requestAnimationFrame(tick);
  })();

  function updatePlayerUI() {
    const t = T(), cur = player.id ? byId.get(player.id) : null;
    const playing = !!cur && !player.paused;
    svg.selectAll(".track, .wave").classed("current", function () { return !!cur && this.dataset.id === cur.id; })
      .classed("playing", function () { return playing && this.dataset.id === cur.id; });
    updateProgress();
    // indicador de la barra superior
    d3.select("#now").attr("hidden", cur ? null : "");
    if (cur) {
      d3.select("#now-toggle").text(playing ? "❚❚" : "▶").attr("aria-label", playing ? t.pause : t.play);
      d3.select("#now-title").text(cur.title).attr("aria-label", `${t.nowPlaying}: ${cur.title}`);
    }
    // botón y avisos del panel
    const btn = panel.select(".play-btn");
    if (!btn.empty()) {
      const mine = playing && btn.attr("data-play") === cur.id;
      btn.text(mine ? "❚❚ " + t.pause : "▶ " + t.play).classed("on", mine);
    }
    const preview = !!cur && player.dur > 0 && player.dur <= 35000;
    d3.select("#player-note").text(player.error ? t.playerError : preview ? t.previewNote : (cur && !player.started ? t.blockedNote : ""));
  }

  d3.select("#now-toggle").on("click", () => { if (player.id) play(player.id); });
  // Para probar el progreso sin Spotify: index.html?debug y, en la consola, __jt.fake("exit", 0.4)
  if (new URLSearchParams(location.search).has("debug")) {
    window.__jt = { player, overlaps: checkOverlaps, fake(id, frac) { Object.assign(player, { id, dur: byId.get(id).duration_ms, pos: frac * byId.get(id).duration_ms, paused: true, started: true }); select(id); updatePlayerUI(); } };
  }

  // ---------- Teclado ----------
  document.addEventListener("keydown", ev => {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
    const el = ev.target, interactive = el.closest && el.closest("button, a, input, select, textarea, [role=button]");
    if (ev.key === " " && !interactive) {
      const id = player.id || (state.active !== "album" ? state.active : null);
      if (id) { ev.preventDefault(); play(id); }
    } else if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
      const ids = order.slice(1), cur = ids.indexOf(state.active && state.active !== "album" ? state.active : player.id);
      const next = ids[(cur + (ev.key === "ArrowRight" ? 1 : cur < 0 ? 0 : -1) + ids.length) % ids.length];
      ev.preventDefault();
      const wasPlaying = player.id && !player.paused;
      select(next, { scroll: true });
      if (wasPlaying) play(next);
    }
  });
  document.addEventListener("click", ev => { if (!ev.target.closest || !ev.target.closest(".pin-hit")) hideTip(); });
  window.addEventListener("scroll", () => { hideTip(); document.body.classList.toggle("scrolled", window.scrollY > 120); }, { passive: true });
  d3.select("#now-title").on("click", () => { if (player.id) select(player.id, { scroll: true }); });

  // ---------- Eventos globales ----------
  d3.selectAll(".lang button").on("click", function () {
    state.lang = this.dataset.lang;
    try { localStorage.setItem("joshua-tree-lang", state.lang); } catch (e) { /* sin almacenamiento */ }
    render();
  });
  document.addEventListener("keydown", ev => { if (ev.key === "Escape" && state.active) select(null); });
  mq.addEventListener("change", ev => { state.mobile = ev.matches; render(); });

  // Las medidas de texto dependen de la fuente: se espera a que esté lista
  if (document.fonts && document.fonts.load) {
    try { await Promise.all(["300 italic 20px 'JT Garamond Narrow'", "400 20px 'JT Garamond Narrow'", "300 20px 'JT Garamond'", "400 20px 'JT Garamond'"].map(f => document.fonts.load(f))); } catch (e) { /* seguimos */ }
  }
  render();
  const hash = decodeURIComponent(location.hash.slice(1));
  if (LAYOUT[hash] || hash === "album") select(hash, { silent: true, scroll: true });
})().catch(err => {
  console.error(err);
  document.getElementById("stage").insertAdjacentHTML("afterbegin",
    '<p style="color:#fff;padding:2rem;text-align:center">No se han podido cargar los datos. Si has abierto el archivo directamente, usa un servidor local (ver README).</p>');
});
