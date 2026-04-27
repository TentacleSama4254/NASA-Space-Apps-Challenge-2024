# Moon Asset Audit

Current moon counts checked against JPL SSD Planetary Satellite Discovery Circumstances on 2026-04-27:

| Planet | Confirmed moons | Rendered now | Notes |
| --- | ---: | ---: | --- |
| Earth | 1 | 1 | Earth's Moon is rendered and labeled. |
| Mars | 2 | 2 | Phobos and Deimos are rendered as irregular bodies. |
| Jupiter | 115 | 8 | Inner regular + Galilean moons are rendered. Irregular outer moons need a swarm layer. |
| Saturn | 292 | 19 | Regular/major visible moons are rendered. Most confirmed moons are faint irregulars. |
| Uranus | 29 | 7 | Main classical moons + selected inner moons are rendered. |
| Neptune | 16 | 8 | Inner/major moons are rendered. |

Sources:
- JPL SSD moon counts and discovery table: https://ssd.jpl.nasa.gov/sats/discovery.html
- NASA/JPL Solar System Simulator texture maps: https://maps.jpl.nasa.gov/tmaps/jupiter.html
- USGS Astrogeology catalog: https://astrogeology.usgs.gov
- NASA Science 3D resources: https://science.nasa.gov

## Texture / Model Availability

| Body | Current app asset | Better available source | Shape/model note |
| --- | --- | --- | --- |
| Moon | Existing `8k_moon.jpg` | NASA SVS Moon 3D/LRO assets: https://svs.gsfc.nasa.gov/14959/ | Spherical is acceptable at app scale. |
| Phobos | Procedural crater texture | NASA glTF/USDZ model: https://science.nasa.gov/resource/phobos-mars-moon-3d-model/ | Replace sphere with real irregular GLB. |
| Deimos | Procedural crater texture | NASA glTF/USDZ model: https://science.nasa.gov/resource/deimos-mars-moon-3d-model/ | Replace sphere with real irregular GLB. |
| Io | Procedural texture | JPL JPG/TIF and USGS global mosaics: https://maps.jpl.nasa.gov/tmaps/jupiter.html and https://astrogeology.usgs.gov/search/map/jupiter-voyager-and-galileo-global-mosaics | Spherical. Use real map. |
| Europa | Procedural texture | JPL JPG/TIF and USGS mosaics: same Jupiter links above | Spherical. Use real map. |
| Ganymede | Procedural texture | JPL JPG/TIF and USGS mosaics: same Jupiter links above | Spherical. Use real map. |
| Callisto | Procedural texture | JPL JPG/TIF and USGS mosaics: same Jupiter links above | Spherical. Use real map. |
| Amalthea | Procedural irregular texture | Voyager/Galileo images exist, but no clean global texture found in the quick pass | Irregular mesh candidate. |
| Metis / Adrastea / Thebe | Procedural irregular texture | Sparse spacecraft imagery only | Irregular mesh candidates if visually important. |
| Titan | Procedural texture | USGS Titan Cassini ISS global mosaic: https://astrogeology.usgs.gov/search/map/titan_cassini_iss_global_mosaic_4005m | Spherical with atmosphere/haze later. |
| Mimas / Enceladus / Tethys / Dione / Rhea / Iapetus / Phoebe | Procedural texture | LPI/USGS icy moon map set: https://www.lpi.usra.edu/icy_moons/saturn/press_release/ | Use real maps; Phoebe is irregular. |
| Pan / Daphnis / Atlas | Procedural irregular texture | Cassini close-up images exist; no global cylindrical texture | Strong irregular mesh candidates. |
| Prometheus / Pandora / Epimetheus / Janus / Telesto / Calypso / Helene / Hyperion | Procedural irregular texture | Cassini imagery exists; global maps vary by body | Hyperion especially needs irregular mesh. |
| Ariel / Umbriel / Titania / Oberon / Miranda / Puck | Procedural texture | Uranian satellite mosaics/DEMs: https://repository.hou.usra.edu/items/ca5e8312-2df9-49c3-b9f5-21352f22b415 | Major moons can use mosaics; Puck may use irregular scale. |
| Portia | Procedural irregular texture | Sparse Voyager imagery only | Irregular mesh candidate. |
| Triton | Procedural texture | USGS Triton global color mosaic: https://astrogeology.usgs.gov/search/map/triton_voyager_2_global_color_mosaic_600m | Use real map. |
| Proteus | Procedural irregular texture | Voyager images exist; no clean global texture found in quick pass | Irregular mesh candidate. |
| Naiad / Thalassa / Despina / Galatea / Larissa / Nereid | Procedural irregular texture | Sparse imagery or no usable global maps | Irregular mesh candidates or point/sprite layer. |

## Recommendation

Use real raster maps first for Moon, Io, Europa, Ganymede, Callisto, Titan, Triton, and the mapped mid-sized Saturn/Uranus moons. Use GLB/shape models for Phobos, Deimos, Pan, Atlas, Daphnis, Hyperion, Phoebe, Proteus, and other visibly rock-like bodies. The hundreds of faint irregular Jupiter/Saturn moons should be a separate low-detail swarm: tiny points, no individual labels by default, with labels only on hover/focus.
