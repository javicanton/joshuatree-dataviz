#!/usr/bin/env python3
"""Genera assets/trunk.svg: el tronco del árbol de la portada de The Joshua Tree, recortado bajo la horquilla.
Toma la máscara de la silueta que hay en el .ai original (extraída con `pdfimages -png`, img-001.png),
suaviza el borde pixelado y lo vectoriza en las coordenadas del lienzo de la infografía (1500 x 3120).
Uso: python3 scripts/make_trunk.py <img-001.png> assets/trunk.svg"""
import sys
import cv2
import numpy as np

TOP, X0, X1 = 298, 168, 236          # recorte en la máscara: del tronco hacia abajo, sin las ramas
BASE = (201, 497)                    # centro de la base del tronco en la máscara
CANVAS_BASE = (770, 2526)            # dónde va esa base en el lienzo (la línea dorada inferior)
SCALE, SCALE_Y = 2.9, 3.45           # píxeles del lienzo por píxel de la máscara (algo más alto que el original)
UP = 6                               # sobremuestreo para suavizar el contorno

m = cv2.imread(sys.argv[1], cv2.IMREAD_GRAYSCALE)
crop = np.zeros_like(m)
crop[TOP:, X0:X1] = m[TOP:, X0:X1]
n, lab, st, _ = cv2.connectedComponentsWithStats((crop > 128).astype(np.uint8))
crop = ((lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])) * 255).astype(np.uint8)
big = cv2.resize(crop, None, fx=UP, fy=UP, interpolation=cv2.INTER_CUBIC)
big = cv2.GaussianBlur(big, (0, 0), UP * 0.9)
_, big = cv2.threshold(big, 127, 255, cv2.THRESH_BINARY)
cnts, _ = cv2.findContours(big, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
c = max(cnts, key=cv2.contourArea)
c = cv2.approxPolyDP(c, UP * 0.35, True)[:, 0, :].astype(float) / UP
pts = [(CANVAS_BASE[0] + (x - BASE[0]) * SCALE, CANVAS_BASE[1] + (y - BASE[1]) * SCALE_Y) for x, y in c]
d = "M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + "Z"
ys = [p[1] for p in pts]; xs = [p[0] for p in pts]
top_xs = [p[0] for p in pts if p[1] < min(ys) + 6]
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 3120" data-top="{min(ys):.1f}" '
       f'data-top-x0="{min(top_xs):.1f}" data-top-x1="{max(top_xs):.1f}">\n'
       '<!-- Tronco de la silueta del árbol de la portada de The Joshua Tree (diseño de Steve Averill) -->\n'
       f'<path id="trunk-path" d="{d}"/>\n</svg>\n')
open(sys.argv[2], "w").write(svg)
print(len(pts), "puntos; arriba", round(min(ys)), "x", round(min(top_xs)), "-", round(max(top_xs)), "; abajo", round(max(ys)), "x", round(min(xs)), "-", round(max(xs)))
