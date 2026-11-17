# Mide el tempo de cada MP3 del disco (autocorrelacion de la envolvente de ataques). Uso, desde la carpeta de los MP3: python3 web/scripts/measure_tempo.py
import librosa, numpy as np, glob, warnings, sys
warnings.filterwarnings("ignore")
for f in sorted(glob.glob(sys.argv[1] if len(sys.argv) > 1 else "[01]*.mp3")):
    y, sr = librosa.load(f, sr=22050, mono=True)
    hop = 256
    oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    # autocorrelacion global de la envolvente de ataques: resolucion fina con interpolacion
    ac = librosa.autocorrelate(oenv - oenv.mean(), max_size=int(4 * sr / hop))
    ac = ac / ac[0]
    res = []
    for lo, hi in [(60, 100), (100, 160)]:
        l0, l1 = int(60 * sr / hop / hi), int(60 * sr / hop / lo)
        k = l0 + int(np.argmax(ac[l0:l1]))
        a, b, c = ac[k - 1], ac[k], ac[k + 1]
        kk = k + 0.5 * (a - c) / (a - 2 * b + c)
        res.append((round(60 * sr / hop / kk, 1), round(float(b), 2)))
    print(f[:32].ljust(32), res, flush=True)
