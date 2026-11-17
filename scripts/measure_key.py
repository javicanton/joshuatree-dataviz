# Estima el tono de cada MP3 del disco (perfil de croma frente a los perfiles de Krumhansl). Uso, desde la carpeta de los MP3: python3 web/scripts/measure_key.py
import librosa, numpy as np, glob, sys, json, warnings
warnings.filterwarnings("ignore")
maj = np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88])
mnr = np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17])
N = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
out = {}
for f in sorted(glob.glob(sys.argv[1] if len(sys.argv) > 1 else "[01]*.mp3")):
    y, sr = librosa.load(f, sr=22050, mono=True)
    oenv = librosa.onset.onset_strength(y=y, sr=sr)
    tempo = librosa.feature.tempo(onset_envelope=oenv, sr=sr, aggregate=None)
    t_med = float(np.median(tempo))
    t2, beats = librosa.beat.beat_track(onset_envelope=oenv, sr=sr)
    yh = librosa.effects.harmonic(y)
    ch = librosa.feature.chroma_cqt(y=yh, sr=sr).mean(axis=1)
    sc = []
    for i in range(12):
        sc.append((np.corrcoef(np.roll(maj,i),ch)[0,1], N[i]+" major"))
        sc.append((np.corrcoef(np.roll(mnr,i),ch)[0,1], N[i]+" minor"))
    sc.sort(reverse=True)
    tun = librosa.estimate_tuning(y=yh, sr=sr)
    print(f[:30], "| tempo med %.1f beat %.1f | tuning %+.2f |" % (t_med, float(np.atleast_1d(t2)[0]), tun), [(k, round(v,2)) for v,k in sc[:3]], flush=True)
