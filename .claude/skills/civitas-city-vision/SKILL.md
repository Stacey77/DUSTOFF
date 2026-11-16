---
name: "civitas-city-vision"
description: "Turn a city, district or tech-park brief into a Civitas-style AI development vision: case atlas, ecosystem index, industries, network, spatial form, AI scenarios."
---

# Civitas City Vision

Use this when Stacey (Nova Digitus Designs) hands over an urban brief, such as a government RFP, an innovation belt, a science city, a tech park or an eco-district. It produces a complete development vision in the Civitas Sapientia method. The reference build is github.com/Stacey77/DUSTOFF/tree/main/civitas-sapientia (vision-2/index.html).

## Working style
- Don't ask clarifying questions. Read the brief, take the most reasonable reading, and state it in one line at the top.
- Deliver a finished artifact, not an outline. By default that is a single self-contained HTML page published as an artifact. If the brief is for a meeting, make a Slides deck instead.
- Research current facts (city stats, park names, policies) with web search before stating them. Cite sources at the end.
- Label every target, score and simulator output as an illustrative planning proposal, not a measurement.

## The six sections (always in this order)
1. **Case atlas.** Redraw 10–14 reference science cities, tech parks and innovation districts, both domestic and international. For each give its location, scale, anchor institutions, signature move, and the lesson for this site.
2. **AI Ecosystem Index.** Build an indicator system with 5–7 pillars: talent, compute and data, capital, research, industry, livability/sustainability, and governance. Each pillar gets 3–5 measurable indicators and weights. Add sliders so the reader can reweight it and watch the composite change.
3. **Priority industry system.** Lay it out as a pyramid with three layers: foundation (chips, compute, data), core (models, robotics, autonomous systems) and application (transport, health, education, city services). Name 2–3 anchor tenant types per layer.
4. **Innovation network.** Show a force graph linking universities, labs, firms, capital and the public sector, with edge types (talent, data, capital, IP). Pre-run the simulation before the first draw so the graph doesn't open as a tangle.
5. **Spatial organization and urban form.** Give the zoning logic (core, rings or belt, corridors, green and blue networks), transit spine and mixed-use rules. Pull in the site's own cultural identity. For Civitas that was Space Age × Rail Age: Googie forms, streamliner trains, saucer sky homes and a Skyport.
6. **AI application scenarios.** Give 6–9 deployable scenes, for example AI + Transport, Healthcare, Education, Robotics, Autonomous Driving, Unmanned Delivery, Energy and Public Safety. Each gets its users, the AI used, the infrastructure it needs, a readiness level and a phase-1 pilot.

Close with a phased roadmap (0–2, 3–5 and 6–10 years) and the risks.

## Design defaults
- Pages must fit 320 px phone screens. Write grid minimums as `minmax(min(300px,100%),1fr)`.
- Pointer-drag code must also clear on `pointercancel` and `lostpointercapture`.
- Escape any user or AI text before putting it into `innerHTML`.

## Follow-ups to offer, one line each
- A 3D explorer of the plan (see the `civitas-3d-explorer` skill)
- A spreadsheet model of the energy or ecosystem numbers
- Pushing the result to her GitHub, and a note in her Obsidian vault (Downloads/_Wiki, under Nova Digitus Projects)