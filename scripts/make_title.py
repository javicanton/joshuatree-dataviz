#!/usr/bin/env python3
"""Genera assets/title.svg. Uso: python3 scripts/make_title.py <ITCGaramondStd-Lt.otf> assets/title.svg"""
# Título en contornos con ITC Garamond (como "Crear contornos" en Illustrator): no se publica la fuente.
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
font = TTFont(sys.argv[1]); gs = font.getGlyphSet(); cmap = font.getBestCmap()
upm = font["head"].unitsPerEm
text, size, width, cx, base = "THE JOSHUA TREE U2", 58, 1290, 750, 118
s = size / upm
glyphs = [cmap[ord(c)] for c in text]
adv = [gs[g].width * s for g in glyphs]
# reparto del espacio sobrante como textLength/spacing: igual entre todos los caracteres
extra = (width - sum(adv) + adv[-1] - gs[glyphs[-1]].width * s) / (len(text) - 1)
x = cx - width / 2; d = []
for g, a in zip(glyphs, adv):
    pen = SVGPathPen(gs)
    gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x, base)))
    d.append(pen.getCommands()); x += a + extra
open(sys.argv[2], "w").write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 3240">\n'
  '<!-- Título en contornos, ITC Garamond Std Light (Adobe). Solo los contornos de este texto, no la fuente. -->\n'
  f'<path id="title-outline" d="{"".join(d)}"/>\n</svg>\n')
print("ok", round(x - extra - cx + width / 2))
