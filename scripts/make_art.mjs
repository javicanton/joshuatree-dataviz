// Genera assets/art.svg: los seis iconos (tomados del arte de Violator, del mismo autor) y el mapa del mundo.
// Uso: npm i world-atlas topojson-client d3-geo && node make_art.mjs <art.svg de violator-dataviz> ../assets/art.svg
import fs from "fs";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
const world = JSON.parse(fs.readFileSync("node_modules/world-atlas/land-110m.json", "utf8"));
const all = feature(world, world.objects.land);
// sin la Antartida, como en el boceto original
const land = { type: "FeatureCollection", features: all.features.map(f => ({ ...f, geometry: { type: "MultiPolygon",
  coordinates: (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).filter(poly => Math.max(...poly[0].map(c => c[1])) > -60) } })) };
// Misma proyeccion que usa main.js para situar los marcadores
const BOX = [[70, 2765], [580, 2985]];
const proj = geoNaturalEarth1().fitExtent(BOX, land);
const d = geoPath(proj).digits(1)(land);
const src = fs.readFileSync(process.argv[2], "utf8");
const defs = src.slice(src.indexOf("<defs>"), src.indexOf("</defs>"));
const icons = [...defs.matchAll(/<g id="(ic-[a-z]+)">([\s\S]*?)<\/g>/g)]
  .map(m => `<g id="${m[1]}">${m[2].replace(/ fill="#fff"/g, "")}</g>`).join("\n");
const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 3120">
<!-- Iconos: infografias originales de Javi Canton-Correa. Mapa: Natural Earth (dominio publico), proyeccion Natural Earth. -->
<defs>
${icons}
</defs>
<g id="map" data-scale="${proj.scale().toFixed(4)}" data-translate="${proj.translate().map(v => v.toFixed(3)).join(",")}"><path d="${d}"/></g>
</svg>
`;
fs.writeFileSync(process.argv[3], out);
console.log("art.svg", out.length, "bytes; scale", proj.scale(), "translate", proj.translate());
console.log("dublin", proj([-6.26, 53.35]), "dv", proj([-116.81, 36.42]));
