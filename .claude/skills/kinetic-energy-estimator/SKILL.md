---
name: kinetic-energy-estimator
description: Estimate realistic city-scale kinetic energy harvest (footstep tiles, regen braking, speed humps, wake turbines, suspension, maglev) and build the editable xlsx model.
---

# Kinetic Energy Estimator

Use this when Stacey asks how much power a city, campus or street could get from people walking or vehicles moving, or wants to convert it to DC or AC. The reference model is `civitas-sapientia/data/build_kinetic_workbook.py` in github.com/Stacey77/DUSTOFF.

## Rule one: real physics, no inflation
Use real-world per-unit energy only. Never scale a time-compressed simulation up to city scale; that once inflated the result to 22.8% of demand when the real figure is about 0.65%. Be plain that kinetic harvesting is a small, visible supplement to the grid, not a primary source.

## Per-unit values (sources in the input notes)
| Source | Energy | Rate driver |
|---|---|---|
| Footstep tiles (electromagnetic) | 2–5 J per step (use 3) | people walking × ~1.8 steps/s × share of sidewalk tiled |
| Regenerative braking (EV) | ½·m·v²·η: 1,600 kg, 13.9 m/s, η 0.65 | vehicles moving × stops/min ÷ 60 |
| Energy speed humps | ~600 J per pass | humps × passes/s |
| Traffic wake micro-turbines | ~60 W each | count |
| Regenerative suspension | ~80 W per vehicle | vehicles moving |
| Maglev station regen | ½·m·v²·η: 22,000 kg, 25 m/s, η 0.6 | pods ÷ seconds between stops |

Power (W) = energy per unit × events per second. Grid-fed sources are footsteps, humps, turbines and maglev. Braking and suspension mostly stay inside the vehicle, so report them separately.

Civitas baseline: 30,000 walkers, 2,700 moving vehicles, 32 humps, 64 turbines, 9 pods and 72 MW demand. That gives about 0.47 MW to the grid, about 0.65% of demand.

## Conversion chain (explain when asked)
Harvester AC output → rectifier → DC bus (supercapacitor or battery buffer) → DC-DC to 48 V or 380 V DC microgrid, or → grid-tie inverter to 120/240 V or 480 V AC. Allow about 85–92% for conversion losses.

## Building the workbook
Follow the xlsx skill: openpyxl, formulas only, then recalc.py with zero errors.
- **Assumptions tab:** blue text on yellow cells for inputs, each with a unit and a source note. Add a legend row.
- **Kinetic Harvest tab:** one row per source with energy per unit, events per second, W, kW and what it feeds. Add totals for grid, in-vehicle and share of demand.
- **Notes tab:** the caveat that these are planning estimates, not measured data.

Answer in chat first with the headline numbers, then deliver the file.
