# Flicks on GM sites: concept demo

Four GM vehicle pages rebuilt with Flam's Flicks:

- `chevrolet/silverado-1500/`: Silverado 1500 page with the Silverado Flick as the hero
- `chevrolet/corvette/`: Corvette lineup page with the ZR1 Flick as the hero and the Grand Sport configurator right below it
- `gmc/sierra-1500/`: Sierra 1500 page with the Sierra Flick as the hero and the Sierra configurator in "Choose your color"
- `gmc/hummer-ev-suv/`: HUMMER EV SUV page with the configurator as the hero

"Explore Flicks" (bottom right) jumps to every Flick and configurator.

## How it is built
Plain static files, no build step.
- `assets/js/flick.js` mounts each Flick from its raw tag (house setup, clicks through ExitApi) and opens the GM page set on the slot.
- `assets/configurator/` is the GM configurator renderer from `FlamDesign/flicks-social-apps/gm` (engine, data, grid videos, silhouettes). `engine.js` adds `halt()`/`resume()` so it only draws while on screen.
- `assets/js/configurator.js` puts that renderer into a brand-styled module on the page.
- Fonts load from GM's brand CDN; photography loads from chevrolet.com and gmc.com.

## Flicks used
- Silverado: `https://flicks.flamapp.live/s/6ae874418d020cc950761068/ad.js`
- Sierra: `https://flicks.flamapp.live/kmu87q/ad.js`
- Corvette ZR1: `https://flicks.flamapp.live/orf9rj/ad.js`

Concept by Flam for General Motors. Not a General Motors website. Vehicle names, logos, prices and photography belong to General Motors.
