# The Joshua Tree · dataviz interactiva

Visualización de datos sobre *The Joshua Tree* (1987), el quinto álbum de U2. La metáfora visual es el árbol de Josué de la contraportada, dibujado aquí con los propios datos del disco:

- **El tronco** está dibujado a partir de las fotos del árbol de la portada y la contraportada, con los mismos tonos que las ramas.
- **Cada rama es una canción.** La rama es su forma de onda, de la base (el principio de la canción) a la copa (el final).
- **Cada copa es un gráfico de radar** con seis atributos sonoros de Spotify: bailabilidad, valencia (positividad), energía, expresión (presencia de voz hablada), instrumentalidad y acústica. Junto a cada copa figuran la duración, el tempo, el tono y, si la hubo, la fecha de publicación como sencillo.
- **Las copas pequeñas son las caras B** de los sencillos («Luminous Times», «Walk to the Water», «Spanish Eyes», «Deep in the Heart», «Silver and Gold», «Sweetest Thing» y «Race Against Time»), que brotan de la rama de su sencillo.

Se puede escuchar cada canción pulsando su copa o su rama, que funciona como barra de reproducción. También se pueden consultar los valores exactos, comparar cada canción con la media del disco, explorar el álbum atributo por atributo y ver en el mapa los lugares del disco.

## Cómo se hizo

- **Atributos, tempo y tono**: descargados en 2022 de la API de Spotify con R y `spotifyr` (edición Deluxe remasterizada de 2007). Spotify ya no ofrece esos datos a aplicaciones nuevas. En «Running to Stand Still» Spotify da el doble tiempo (188 bpm) y se muestra la mitad.
- **Formas de onda**: pico de amplitud de cada canción en 1000 tramos, calculado con `ffmpeg` y `numpy` sobre la edición remasterizada de 2007 (disco y caras B del segundo CD de la edición Deluxe). Todas comparten escala, de modo que se conserva el volumen relativo entre canciones.
- **Tipografía**: ITC Garamond, la del disco. El título va en contornos (`scripts/make_title.py`, como «Crear contornos» en Illustrator). El resto del texto usa ITC Garamond si está instalada en el equipo y, si no, EB Garamond (SIL OFL): la licencia de escritorio de ITC Garamond no permite publicar la fuente en una web. Con una licencia web basta con añadir sus archivos en `css/style.css`.
- **Fechas, créditos y lugares**: Wikipedia y los créditos del disco.
- **Web**: D3 y el reproductor incrustado de Spotify. Con sesión iniciada en Spotify suena la canción completa; sin ella, un fragmento.

Los ficheros fuente (los MP3 y `u2.xlsx`) no forman parte del repositorio. `scripts/build_data.py` los busca en las carpetas superiores y genera `data/joshua-tree.json`; `scripts/make_art.mjs` genera `assets/art.svg` (iconos y mapa). Los textos de cada canción están en `data/texts.json`.

Para verla en local hace falta un servidor (por ejemplo `python3 -m http.server` dentro de esta carpeta), porque los datos se cargan desde ficheros JSON.

---

## In English

An interactive data visualization of U2's *The Joshua Tree* (1987). The visual metaphor is the Joshua tree from the back cover, drawn with the album's own data: each branch is the audio waveform of a song, from its base (the start of the song) to its crown (the end); each crown holds a radar chart with six Spotify audio features (danceability, valence, energy, speechiness, instrumentalness and acousticness); the trunk is the whole album, the eleven waveforms one after another; and the small crowns are the B-sides of the singles, sprouting from their single's branch. Click a crown or a branch to listen: the branch works as the playback bar.

The trunk is drawn after the photographs of the tree on the album sleeve. Audio features, tempo and key come from the Spotify API (R and `spotifyr`, 2022), waveforms are computed from the 2007 remaster with `ffmpeg`, and the web version uses D3 and the Spotify embedded player. Type is ITC Garamond, as on the album, when installed, with EB Garamond as the open fallback.

---

Datos: Spotify API y Wikipedia. *The Joshua Tree* es una obra de U2 (Island Records, 1987); fotografía de Anton Corbijn y diseño de Steve Averill.

## Licencia

La infografía y esta visualización son obra de Javi Cantón-Correa y se publican bajo licencia [Creative Commons Atribución-SinDerivadas 4.0 (CC BY-ND 4.0)](https://creativecommons.org/licenses/by-nd/4.0/deed.es): se pueden compartir citando al autor, sin modificarlas. La licencia no cubre la música, la fotografía de portada ni las marcas de terceros, ni la biblioteca D3 (licencia ISC), la tipografía EB Garamond (SIL OFL) o el mapa base de Natural Earth (dominio público).

Javi Cantón-Correa · [javiercanton.com](https://javiercanton.com)
