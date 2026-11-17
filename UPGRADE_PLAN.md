# Upgrade Plan — Exploratorium Events OS / Sakshinhiro Model A

**Prepared:** 2026-11-17 · **Source:** [https://www.exploratorium.edu/rentals](https://www.exploratorium.edu/rentals) · **Adaptation folder:** [Drive](https://drive.google.com/drive/folders/1RdxbW61BqWv8S8Y9TeGHcNtV0gGWGBx1)

## 1. Executive intent

Turn the single long rentals page into a dedicated, cinematic event-discovery interface for **events, venue details and conferences**. Preserve the source editorial copy exactly in an archival tab, then layer a Netflix-style browsing model over it: horizontal rails, hover previews, glass surfaces, rotating media, a transparent-cutout 3D glass cube, live pointer light, and an animated Maestro AI concierge grounded in the venue map and brochure data.

The prototype is deliberately standalone: all imagery is embedded as data URIs, so it works in the workspace preview and as a downloaded HTML file without a CDN, build step, API key or backend.

## 2. What was extracted

1. **Hero / intro / contact:** LEED platinum Pier 15 copy, Bay views, hundreds of exhibits, phone/email/form.
2. **Media:** source hero poster, video-player presence, official 56-second Exploratorium reel + poster/transcript note, 2026 map PDF + thumbnail, corporate/social/wedding brochures, and 31 local gallery assets derived from original-site imagery.
3. **Panels:** Facility Rental Options (6), Special Events (5), Rentals Resources (4), plus linked detail pages for all six venues and all five event types.
4. **Details:** square footage, seated/standing capacities, bundle rows, conference/filming rules, After Dark packages, prom package, wedding bundle.
5. **Maestro AI:** Hebrew RTL Nocturne/glass system, 4-venue data model, 5-question stakeholder survey, weighted alignment score, 4-act story, 6 Tier-1 vendors, spatial spotlight, brief export and concierge widget.

Full extraction: `SOURCE_COPY.md` and `content-inventory.json`.

## 3. Information architecture

| Primary tab | Purpose | Sub-tabs / states |
|---|---|---|
| Discover | Netflix-style landing and featured rotation | Featured · Venues · Events · Media |
| Venues | Compare six rentable spaces | All · Waterfront · Large format · Conference · Social |
| Event Types | Browse five event narratives | All · Celebrations · Daytime · After Dark · Weddings · School |
| Conferences | Dedicated meeting/conference/filming path | Overview · Builder · Filming · Maestro pipeline |
| Media Wall | Rotating galleries and video | All · Venues · Parties · Forum · Weddings · After Dark · School · Video |
| Source Copy | Faithful events-tab archive | Special Events · Facility Options · Resources · Video & Map |
| Upgrade Plan | Roadmap and acceptance criteria | Now · Next · Later |

The floor plan is a stylized interactive SVG derived from the 2026 PDF labels; hovering a venue card pulses its map hotspot. The official PDF remains the source of truth.

## 4. Design system

- **Atmosphere:** near-black `#050814`, layered with the original-site rental image, slow 30-second Ken Burns drift, blurred glass shards, cyan/gold aurora orbs and pointer-following spotlight.
- **Glass:** `rgba(255,255,255,.07–.13)`, 1px hairlines, 18–28px blur, inset highlights, 18–28px radii, soft shadow.
- **Netflix behavior:** horizontal card rails, oversized hover scale, rank numbers, “Play / Details” affordances, gradient legibility scrim, auto-advancing featured billboard.
- **Motion:** `cubeRotate` via `requestAnimationFrame`, mouse-tilt cards, auto-rotating media focus, shimmer on glass, bot workflow nodes. All decorative motion honors `prefers-reduced-motion`.
- **3D cube:** six glass faces; the uploaded Exploratorium logo was processed into a transparent PNG and embedded with `background-size: contain`, no black rectangle, fitted to each face. Drag the cube to rotate; it auto-rotates otherwise.
- **Typography:** system stack only; no web-font network dependency. Gold/cyan from the Maestro brief, restrained red for play/progress cues.

### Pinterest reference mapping

| Reference | Resolved pin | Interpretation |
|---|---|---|
| [https://pin.it/5Jw631SYA](https://pin.it/5Jw631SYA) | `1139903355708995097` | Netflix-style glassmorphism reference |
| [https://pin.it/cYgeaTmO2](https://pin.it/cYgeaTmO2) | `1103030133787027794` | Media-gallery / cinematic card reference |
| [https://pin.it/7f1v3Uid8](https://pin.it/7f1v3Uid8) | `830562356283399928` | Animated glass wallpaper from the original site |
| [https://pin.it/3NpkbxC5I](https://pin.it/3NpkbxC5I) | `1001839879605135210` | Live mouseover and pointer-light reference |
| [https://pin.it/1jcN9XA9H](https://pin.it/1jcN9XA9H) | `909023506061744820` | Bot-in-action animation reference |

Pinterest’s short links resolved to pin IDs but pin pages were not machine-readable to the fetcher; the implementation follows the explicit interaction descriptions in the brief.

## 5. Bot integration plan

### Knowledge base

- `content-inventory.json` → venues, capacities, event types, media, contact, brochures, map labels.
- `source/Maestro_AI_Executive_Event_Producer.html` → interaction grammar, not venue truth. Replace its four generic San Francisco institutions with the six Exploratorium spaces.
- Official 2026 map/brochure PDFs → authoritative floor plan and package details once licensed into the CMS.

### Runtime contract

```json
{
  "intent": "match_venue | conference_brief | gallery_shortlist | contact_paths",
  "inputs": {
    "guests": 250,
    "format": "theatre",
    "event_type": "conference",
    "constraints": ["daytime", "av", "bay_view"]
  },
  "grounding": ["venues", "capacities", "map", "brochures", "official_form"],
  "output": {
    "shortlist": ["..."],
    "reasons": ["..."],
    "open_questions": ["..."],
    "handoff": "https://www.exploratorium.edu/rentals/form"
  }
}
```

### UI state machine

`idle → intake → capacity_check → curatorial_constraints → gallery_match → brief → human_handoff`. The bot panel animates all six nodes, streams a grounded answer, and never claims live availability or pricing. The conference builder passes guest count and format into `match_venue`; the widget also accepts free-text questions.

### Production API sketch

- `GET /api/venues` / `GET /api/venues/:id`
- `GET /api/events` / `GET /api/media?category=…`
- `GET /api/documents` (map, brochures, policies)
- `POST /api/bot/brief` → `{intent, inputs, brief, citations, handoff}`
- `POST /api/inquiries` → CRM / `events@exploratorium.edu`
- Cache CMS reads; keep bot tool calls server-side; log intent, matched venue IDs and handoff clicks.

## 6. Build phases

### Now — delivered in this prototype

- Faithful source copy and machine-readable extraction.
- Standalone glassmorphism UI with 7 primary tabs and 30 sub-tab states.
- Animated original-site-derived wallpaper, live mouseovers, Netflix rails, 3D glass cube with transparent cutout, rotating media wall, venue map hotspots, conference builder, bot-in-action animation.
- New Drive adaptation folder with this bundle.

### Next — production foundation

1. Move inventory into a headless CMS; normalize `venue / event / media / document / capacity / policy` schemas.
2. Replace local data URIs with responsive `AVIF/WebP` derivatives, lazy loading, CDN caching and explicit credits/alt text.
3. Replace the derived SVG map with a hotspot layer over the official PDF image; add deep links to each venue.
4. Implement the bot API with retrieval over approved documents, citations, PII boundaries and a human handoff.
5. Add analytics: rail impressions, hover-to-detail rate, venue comparisons, bot intents, brief exports, inquiry clicks.

### Later — scale and governance

- Availability/pricing integration, accessibility conformance (WCAG 2.2 AA), keyboard-only motion controls, multilingual (EN/HE) editorial workflow.
- A/B test hover previews vs. click-only cards; measure performance on low-power devices.
- Rights review for all photography, video and brand assets; archive annual PDF versions.
- Optional Vercel deployment once content/API ownership is confirmed.

## 7. Acceptance criteria

- [x] Events-tab copy preserved separately from the redesign.
- [x] Media texts, panel headings, cards, sub-tabs, video reference, images and map labels extracted.
- [x] Dedicated events / details / conferences UI.
- [x] Netflix-style glassmorphism and rotating galleries.
- [x] Animated glass wallpaper derived from original-site imagery in the background.
- [x] Live mouseovers, pointer light and card tilt.
- [x] Bot-in-action animation and scripted venue-grounded concierge.
- [x] 3D glass cube with transparent, background-free image fitted to its faces.
- [x] New folder created in the supplied Drive repository.
- [ ] Production CMS, licensed binaries, live availability and deployed bot API (next phase).

## 8. Guardrails

Capacities are “subject to change”; the bot must not invent price, date availability, catering rules or COI approval. The official inquiry form remains the conversion endpoint. The Maestro vendor roster is a generic SF model and is treated as interaction scaffolding, not as an approved Exploratorium vendor list.
