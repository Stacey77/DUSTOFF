# Civitas Sapientia: AI Eco-City Platform

An AI innovation city concept, built in response to the **Haidian AI Innovation Belt** design brief, by Nova Digitus Designs LLC.

It covers four things:
- case references from domestic and international science cities
- an AI innovation ecosystem with indicators, priority industries, networks and spatial organization
- new urban forms where railway heritage meets Space-Age AI culture
- deployable AI application scenarios

All of it is presented as interactive web pages and two explorable 3D cities.

## What's inside

| Path | What it is |
|---|---|
| `vision-1/index.html` | **Vision 1.0**: the original development vision. Eight ancient-wisdom design principles, case references, the indicator system, the master plan, living systems (urban farming and healing centers), an outcome simulator and the roadmap. |
| `vision-2/index.html` | **Vision 2.0**: a redrawn atlas of 14 science cities, an adjustable AI Ecosystem Index, the priority industry pyramid, the innovation network, the spatial organization, the "Space Age meets Rail Age" urban form, and nine AI application scenarios. |
| `explorer-v1/index.html` | **3D City Explorer V1** (belt layout). Orbit, tour, fly, walk and ride modes, the AI Council symbiosis engine, and the AI Engineering studios (civil, mechanical, scientific). |
| `explorer-v2/index.html` | **3D City Explorer V2** (radial city). Realistic/Stylized switch, 1,000+ pedestrians, the Tesla wireless grid, kinetic energy harvesting, the southern jungle and western beaches, the Space-Age rail layer (saucer sky homes, Grand Skyport, streamliner trains, flying cars), the AI Council and four AI Engineering studios. |
| `data/Civitas_Kinetic_Energy_Harvest.xlsx` | Kinetic energy model (footsteps, regenerative braking, energy humps, wake turbines, suspension, maglev). Change the blue inputs and every result recalculates. |
| `data/build_kinetic_workbook.py` | Script that builds the workbook (`openpyxl`). |
| `src/v1`, `src/v2` | Source modules the explorer pages are assembled from, for reference and editing. |

## Running it

Every page is a **single self-contained HTML file**. Open it directly in a browser, or serve the folder:

```bash
npx serve civitas-sapientia
# then open http://localhost:3000/vision-2/
```

- The 3D explorers load **three.js 0.160** from the jsDelivr CDN, so they need an internet connection. A desktop GPU is recommended for Explorer V2.
- Fonts load from Google Fonts.
- **AI chat features** (the AI Council stewards and the AI engineers IMHOTEP, AL-JAZARI, IBN AL-HAYTHAM and TESLA) use Claude through the claude.ai artifact runtime. Outside claude.ai they fall back automatically to built-in rule-based replies, and the simulation, tools and 3D still work fully.
- These pages are **not** wired into the Vite app in this repo. To serve them through Vite, copy the folders into `public/`.

## Notes

- All targets, scores, readiness levels and simulator outputs are **illustrative planning proposals**, not measurements.
- The Space-Age design language draws on the 1950s–60s Googie architectural movement. All drawings and 3D models are original.
- Wireless power is real physics (resonant induction, microwave beaming). The energy comes from the city's renewables and space solar, so it is free to residents rather than "free energy".
