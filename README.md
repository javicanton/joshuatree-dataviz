# The Joshua Tree · dataviz interactiva

Visualización de datos sobre *The Joshua Tree* (1987), el quinto álbum de U2. La metáfora visual es el árbol de Josué de la contraportada, dibujado aquí con los propios datos del disco:

- **Cada rama es una canción.** La rama es su forma de onda, de la base (el principio de la canción) a la copa (el final).
- **Cada copa es un gráfico de radar** con seis atributos sonoros de Spotify: bailabilidad, valencia (positividad), energía, expresión (presencia de voz hablada), instrumentalidad y acústica. El borde de la copa repite la forma de onda en círculo. Junto a cada copa figuran la duración, el tempo, el tono y, si la hubo, la fecha de publicación como sencillo.
- **El tronco es el disco entero**: las once formas de onda, una detrás de otra, de la raíz a la horquilla.
- **Las copas pequeñas son las caras B** de los sencillos («Luminous Times», «Walk to the Water», «Spanish Eyes», «Deep in the Heart», «Silver and Gold», «Sweetest Thing» y «Race Against Time»), que brotan de la rama de su sencillo.

Se puede escuchar cada canción pulsando su copa o su rama, que funciona como barra de reproducción. También se pueden consultar los valores exactos, comparar cada canción con la media del disco, explorar el álbum atributo por atributo y ver en el mapa los lugares del disco.

## Cómo se hizo

- **Atributos de Spotify**: descargados en 2022 de la API de Spotify y representados con Flourish. Spotify ya no ofrece ese endpoint a aplicaciones nuevas, así que `scripts/build_data.py` recupera los valores a partir de la geometría de aquellos radares (`U2 Joshua Tree songs.svg`).
- **Formas de onda**: pico de amplitud de cada canción en 1000 tramos, calculado con `ffmpeg` y `numpy` sobre la edición remasterizada de 2007 (disco y caras B del segundo CD de la edición Deluxe). Todas comparten escala, de modo que se conserva el volumen relativo entre canciones.
- **Tempo y tono**: medidos sobre el audio con `librosa` (`scripts/measure_tempo.py` y `scripts/measure_key.py`: autocorrelación de los ataques y perfil de croma).
- **Fechas, créditos y lugares**: Wikipedia y los créditos del disco.
- **Web**: D3 y el reproductor incrustado de Spotify. Con sesión iniciada en Spotify suena la canción completa; sin ella, un fragmento.

Los ficheros fuente (los MP3 y el SVG de radares) no forman parte del repositorio. `scripts/build_data.py` los busca en la carpeta que contiene a esta y genera `data/joshua-tree.json`; `scripts/make_art.mjs` genera `assets/art.svg` (iconos y mapa). Los textos de cada canción están en `data/texts.json`.

Para verla en local hace falta un servidor (por ejemplo `python3 -m http.server` dentro de esta carpeta), porque los datos se cargan desde ficheros JSON.

---

## In English

An interactive data visualization of U2's *The Joshua Tree* (1987). The visual metaphor is the Joshua tree from the back cover, drawn with the album's own data: each branch is the audio waveform of a song, from its base (the start of the song) to its crown (the end); each crown holds a radar chart with six Spotify audio features (danceability, valence, energy, speechiness, instrumentalness and acousticness); the trunk is the whole album, the eleven waveforms one after another; and the small crowns are the B-sides of the singles, sprouting from their single's branch. Click a crown or a branch to listen: the branch works as the playback bar.

Audio features come from the Spotify API (R and `spotifyr`, 2022), waveforms are computed from the 2007 remaster with `ffmpeg`, tempo and key are measured on the audio with `librosa`, and the web version uses D3 and the Spotify embedded player.

---

Datos: Spotify API y Wikipedia. *The Joshua Tree* es una obra de U2 (Island Records, 1987); fotografía de Anton Corbijn y diseño de Steve Averill.

## Licencia

La infografía y esta visualización son obra de Javi Cantón-Correa y se publican bajo licencia [Creative Commons Atribución-SinDerivadas 4.0 (CC BY-ND 4.0)](https://creativecommons.org/licenses/by-nd/4.0/deed.es): se pueden compartir citando al autor, sin modificarlas. La licencia no cubre la música, la fotografía de portada ni las marcas de terceros, ni la biblioteca D3 (licencia ISC), la tipografía Source Sans 3 (SIL OFL) o el mapa base de Natural Earth (dominio público).

Javi Cantón-Correa · [javiercanton.com](https://javiercanton.com)
