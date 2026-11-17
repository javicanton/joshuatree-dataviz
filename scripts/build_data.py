#!/usr/bin/env python3
"""Genera data/joshua-tree.json a partir de los MP3 y del SVG de radares de Flourish.
Los ficheros fuente (los MP3 y 'U2 Joshua Tree songs.svg') no se suben al repositorio: el script los
busca en la carpeta que contiene a esta (la carpeta de trabajo original del proyecto).
Necesita ffmpeg y numpy. Uso: python3 scripts/build_data.py"""
import json, re, glob, os, math, subprocess
import numpy as np

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # carpeta del sitio (el repositorio)
ROOT = os.path.dirname(SITE)                                         # carpeta con los MP3 y el SVG de radares
RADARS = "U2 Joshua Tree songs.svg"
N_PEAKS = 1000
FEATURES = ["danceability", "energy", "speechiness", "acousticness", "instrumentalness", "valence"]  # horario desde arriba
R1000 = 77.7913     # radio del valor 1000 en los radares de Flourish (el anillo de 200 mide 15,558)

# Datos editoriales. Los identificadores de Spotify son los de "The Joshua Tree (Remastered)" (2007).
# bpm y tono: medidos sobre el audio (ver README); single: fecha de publicacion como sencillo (Wikipedia).
# n -> (id, titulo, cara del vinilo, bpm, tono, fecha single, ambito del single, id de Spotify)
EDIT = {
    1:  ("where-the-streets-have-no-name", "Where the Streets Have No Name", 1, 126, "D major", "1987-08-31", None, "5NxFDsVMGR6BFoO3fgK0vy"),
    2:  ("i-still-havent-found", "I Still Haven't Found What I'm Looking For", 1, 101, "D♭ major", "1987-05-25", None, "6vfb6oW8eDmhEGCT0Sy4SC"),
    3:  ("with-or-without-you", "With or Without You", 1, 110, "D major", "1987-03-16", None, "56dy3pB0JZJhPAEN9x6Gvc"),
    4:  ("bullet-the-blue-sky", "Bullet the Blue Sky", 1, 76, "E♭ minor", None, None, "4HpbZ0UkJq7kIVSdZkHFT2"),
    5:  ("running-to-stand-still", "Running to Stand Still", 1, 94, "D major", None, None, "6TqD3tjgPr4zcF7PTEey7I"),
    6:  ("red-hill-mining-town", "Red Hill Mining Town", 2, 67, "G major", None, None, "0M3G0YuhRuvKuUEcLX67If"),
    7:  ("in-gods-country", "In God's Country", 2, 126, "D major", "1987-11-16", "na", "4G4AH4DiGyYVskrYZirx5S"),
    8:  ("trip-through-your-wires", "Trip Through Your Wires", 2, 74, "G major", None, None, "0WXxwKJ0hhm5p32e7onB7Z"),
    9:  ("one-tree-hill", "One Tree Hill", 2, 123, "C major", "1988-03-07", "anz", "1mXFXxtkSwlWGvbbJngTuS"),
    10: ("exit", "Exit", 2, 121, "E minor", None, None, "2xH5y3dilZ7Npcp4kOy2qp"),
    11: ("mothers-of-the-disappeared", "Mothers of the Disappeared", 2, 104, "A major", None, None, "7vy1RCyGCVEN3X1oDo2mZ9"),
}
# Caras B de los sencillos del disco (segundo CD de la edicion Deluxe remasterizada de 2007).
# id -> (archivo "2-NN", titulo, sencillo al que acompanan, bpm, tono, id de Spotify, duracion en Spotify en ms)
BSIDES = {
    "luminous-times":    ("2-01", "Luminous Times (Hold On to Love)", "with-or-without-you", 97, "G major", "3WM50XP5pSRJiZj3c843J6", 274573),
    "walk-to-the-water": ("2-02", "Walk to the Water", "with-or-without-you", 77, "A minor", "5GbGk6vYrVX8cYCFLO7XQJ", 289213),
    "spanish-eyes":      ("2-03", "Spanish Eyes", "i-still-havent-found", 133, "D major", "6fWapAmjtEA2Z1xvYsjTzY", 193773),
    "deep-in-the-heart": ("2-04", "Deep in the Heart", "i-still-havent-found", 96, "G major", "3I8b0jh8lmw6IkfY8m0LHi", 270533),
    "silver-and-gold":   ("2-05", "Silver and Gold", "where-the-streets-have-no-name", 116, "E major", "6n6PpjtOWHRFZ0ozul2RnY", 277520),
    "sweetest-thing":    ("2-06", "Sweetest Thing", "where-the-streets-have-no-name", 142, "C major", "3M2OWcgDOWURsRrmYxCfus", 184560),
    "race-against-time": ("2-07", "Race Against Time", "where-the-streets-have-no-name", 140, "B minor", "6nMrgAe4Nu5Xz3lDGWgxyk", 242680),
}
# Duracion en Spotify (ms) de cada pista, para la barra de reproduccion antes de que el reproductor informe
SPOTIFY_MS = {1: 336613, 2: 277480, 3: 295520, 4: 271546, 5: 257186, 6: 292866, 7: 176600, 8: 211813, 9: 322373, 10: 253040, 11: 314226}

# ---------- Radares: se recuperan los seis valores de cada curva ----------
def anchors(d):
    """Puntos de ancla de un trazado SVG (M, L, H, V, C, S en absoluto o relativo)."""
    toks = re.findall(r"[MmLlHhVvCcSsZz]|-?\d*\.?\d+(?:e-?\d+)?", d)
    pts, cur, i, cmd = [], (0.0, 0.0), 0, None
    need = {"M": 2, "L": 2, "H": 1, "V": 1, "C": 6, "S": 4}
    while i < len(toks):
        if re.match(r"[A-Za-z]", toks[i]): cmd = toks[i]; i += 1
        if cmd in "Zz": continue
        n = need[cmd.upper()]
        v = [float(x) for x in toks[i:i + n]]; i += n
        rel = cmd.islower(); c = cmd.upper()
        if c == "H": cur = ((cur[0] if rel else 0) + v[0], cur[1])
        elif c == "V": cur = (cur[0], (cur[1] if rel else 0) + v[0])
        else: cur = ((cur[0] if rel else 0) + v[-2], (cur[1] if rel else 0) + v[-1])
        pts.append(cur)
        if cmd == "M": cmd = "L"
        elif cmd == "m": cmd = "l"
    if len(pts) > 1 and math.dist(pts[0], pts[-1]) < 0.3: pts.pop()
    return pts

def radar_values():
    s = open(os.path.join(ROOT, RADARS), encoding="utf-8").read()
    titles = [t.replace("&apos;", "'") for t in re.findall(r'<text[^>]*class="st\d+ st2 st3">([^<]*)</text>', s)]
    cells = re.findall(r'<g transform="translate\(([\d.]+), ([\d.]+)\)">\s*<g>\s*<rect[^>]*class="st0"', s)
    curves = [anchors(d) for d in re.findall(r'<path id="line-\d+" class="st\d+" d="([^"]+)"', s)]
    out = {}
    for title, (cx, cy) in zip(titles, cells):
        c = (float(cx) + 123.8333, float(cy) + 19.8133 + 123.8333)
        # la curva de esta celda es la que queda mas cerca de su centro (no siguen el orden de las celdas)
        best = min(curves, key=lambda pp: max(math.dist(p, c) for p in pp))
        pts = [(p[0] - c[0], p[1] - c[1]) for p in best]
        assert len(pts) == 6 and max(math.hypot(*p) for p in pts) < 90, title
        ang = lambda p: math.degrees(math.atan2(p[0], -p[1])) % 360
        j = max(range(6), key=lambda k: math.hypot(*pts[k]))          # ancla fiable: la mas alejada del centro
        k0 = round(ang(pts[j]) / 60) % 6
        vals = {}
        for n, p in enumerate(pts):
            k = (k0 + n - j) % 6
            r = math.hypot(*p)
            assert r < 2 or abs(((ang(p) - k * 60 + 180) % 360) - 180) < 4, (title, n)
            vals[FEATURES[k]] = round(r / R1000, 3)
        out[title.lower()] = {f: vals[f] for f in FEATURES}
    return out

# ---------- Formas de onda: pico de amplitud por tramo ----------
def peaks(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "11025", "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    x = np.abs(np.frombuffer(raw, dtype=np.int16).astype(np.float32)) / 32768.0
    edges = np.linspace(0, len(x), N_PEAKS + 1).astype(int)
    pk = np.array([x[a:b].max() for a, b in zip(edges[:-1], edges[1:])])
    rms = np.array([math.sqrt(float((x[a:b] ** 2).mean())) for a, b in zip(edges[:-1], edges[1:])])
    return pk, rms, len(x) / 11025.0

radars = radar_values()
tracks, gmax, rmax = [], 0, 0
for n in sorted(EDIT):
    tid, title, side, bpm, key, single, scope, sid = EDIT[n]
    path = glob.glob(os.path.join(ROOT, f"{n:02d} *.mp3"))[0]
    pk, rms, secs = peaks(path)
    gmax, rmax = max(gmax, pk.max()), max(rmax, rms.max())
    ms = SPOTIFY_MS[n]
    sec = ms // 1000   # como lo muestra Spotify
    tracks.append({
        "id": tid, "n": n, "title": title, "type": "album", "side": side,
        "duration_ms": ms, "duration": f"{sec // 60}:{sec % 60:02d}",
        "bpm": bpm, "key": key, "single": single, "single_scope": scope,
        "features": radars[title.lower()],
        "spotify_id": sid, "spotify_uri": "spotify:track:" + sid,
        "wave_source": os.path.basename(path), "_pk": pk, "_rms": rms, "_secs": secs,
    })
for k, (bid, (pre, title, parent, bpm, key, sid, ms)) in enumerate(BSIDES.items()):
    path = glob.glob(os.path.join(ROOT, f"{pre} *.mp3"))[0]
    pk, rms, secs = peaks(path)
    gmax, rmax = max(gmax, pk.max()), max(rmax, rms.max())
    sec = ms // 1000
    tracks.append({
        "id": bid, "n": f"B{k + 1}", "title": title, "type": "bside", "parent": parent,
        "duration_ms": ms, "duration": f"{sec // 60}:{sec % 60:02d}",
        "bpm": bpm, "key": key, "single": None, "single_scope": None,
        "features": radars[title.lower()],
        "spotify_id": sid, "spotify_uri": "spotify:track:" + sid,
        "wave_source": os.path.basename(path), "_pk": pk, "_rms": rms, "_secs": secs,
    })
for t in tracks:  # misma escala para todas: se conserva el volumen relativo entre canciones
    t["peaks"] = [round(float(p / gmax), 3) for p in t.pop("_pk")]
    t["rms"] = [round(float(p / rmax), 3) for p in t.pop("_rms")]
    t["mp3_seconds"] = round(t.pop("_secs"), 1)

album = [t for t in tracks if t["type"] == "album"]
total = sum(t["duration_ms"] for t in album) // 1000
data = {
    "album": {
        "title": "The Joshua Tree", "artist": "U2", "release": "1987-03-09",
        "edition": "The Joshua Tree (Remastered)", "duration": "50:11", "duration_spotify": f"{total // 60}:{total % 60:02d}",
        "sales": "25.000.000",
        "features_mean": {f: round(sum(t["features"][f] for t in album) / len(album), 3) for f in FEATURES},
    },
    "features": FEATURES,
    "tracks": tracks,
}
os.makedirs(os.path.join(SITE, "data"), exist_ok=True)
out = os.path.join(SITE, "data", "joshua-tree.json")
json.dump(data, open(out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("OK", out, os.path.getsize(out), "bytes", "| total Spotify", data["album"]["duration_spotify"])
for t in tracks:
    pk, r = np.array(t["peaks"]), np.array(t["rms"])
    print(f'{str(t["n"]):>3} {t["title"][:30]:<30} {t["duration"]} mp3={t["mp3_seconds"]:>6} {t["bpm"]:>3} {t["key"]:<9} pk mean={pk.mean():.2f} min={pk.min():.2f} | rms mean={r.mean():.2f} max={r.max():.2f}')
    print("   ", t["features"])
print(data["album"]["features_mean"])
