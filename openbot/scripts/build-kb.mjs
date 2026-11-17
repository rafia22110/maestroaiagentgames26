#!/usr/bin/env node
/**
 * Builds openbot/kb/knowledge.json from the project's content-inventory.json.
 *
 * The inventory is the single extraction of the Exploratorium rentals pages, so the bot's
 * knowledge base is generated from it instead of being retyped. Run:
 *
 *   node openbot/scripts/build-kb.mjs
 *
 * Anyone editing content-inventory.json re-runs this; `npm test` fails when the checked-in
 * knowledge.json drifts from the inventory.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(here, '..', '..');
const INVENTORY = join(ROOT, 'content-inventory.json');
export const KB_PATH = join(ROOT, 'openbot', 'kb', 'knowledge.json');

/** First number in a published label ("20,000 + 15,000 outdoor" -> 20000). */
const num = (s) => {
  const m = String(s).replace(/,/g, '').match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

/** Capacity strings on the source pages mix ranges, indoor/outdoor pairs and theatre/rounds.
 *  These hints turn them into comparable numbers without losing the published text. */
const CAPACITY_HINTS = {
  full: { seated: 1100, standing: 3500, seatedLabel: '1,100', standingLabel: '3,500' },
  observatory: {
    seated: 150, standing: 200, seatedLabel: '150 indoor / 100 outdoor', standingLabel: '200 indoor / 125 outdoor',
    outdoor: { sqft: 2500, seated: 100, standing: 125 },
  },
  east: { seated: 200, standing: 450, seatedLabel: '90–200', standingLabel: '450' },
  central: {
    seated: 500, standing: 1200, seatedLabel: '500 theatre / 300 rounds indoors', standingLabel: '1,200',
    outdoor: { sqft: 15000, seated: 300, standing: 500 },
  },
  west: { seated: 200, standing: 500, seatedLabel: '70–200', standingLabel: '500' },
  forum: { seated: 200, standing: 250, seatedLabel: '160–200', standingLabel: '250' },
};

const BUNDLES = [
  { sqft: 49000, seated: 1000, standing: 3300 },
  { sqft: 33000, seated: 730, standing: 1900 },
  { sqft: 43000, seated: 750, standing: 2750 },
  { sqft: 27000, seated: 550, standing: 1650 },
  { sqft: 36000, seated: 650, standing: 1800 },
  { sqft: 13000, seated: 380, standing: 700 },
  { sqft: 19600, seated: 350, standing: 850 },
];

export function buildKnowledge() {
  const inventory = JSON.parse(readFileSync(INVENTORY, 'utf8'));

  const venues = inventory.venue_details.map((v) => {
    const hint = CAPACITY_HINTS[v.id] ?? {};
    return {
      id: v.id,
      name: v.name,
      url: v.url,
      sqftLabel: v.sqft,
      sqft: num(v.sqft),
      seatedLabel: v.seated,
      standingLabel: v.standing,
      capacity: {
        seated: hint.seated ?? num(v.seated),
        standing: hint.standing ?? num(v.standing),
        ...(hint.outdoor ? { outdoor: hint.outdoor } : {}),
      },
      description: v.desc,
      categories: String(v.cats).split(',').map((s) => s.trim()).filter(Boolean),
      mapZone: v.map,
      image: v.img,
      documents: [],
    };
  });

  const documents = [
    { id: 'rentals-map', title: '2026 Rentals Map — Pier 15', url: inventory.map.pdf, kind: 'pdf', scope: 'floor plan and gallery zones' },
    { id: 'corporate-brochure', title: 'Corporate Brochure 2026', url: 'https://www.exploratorium.edu/sites/default/files/2026-10/_Brochure_Map_Exploratorium_2026.pdf', kind: 'pdf', scope: 'facility story and capacities' },
    { id: 'wedding-brochure', title: 'Wedding Packages 2026', url: 'https://www.exploratorium.edu/sites/default/files/2026-09/Wedding_Packages_Exploratorium_2026_v2.pdf', kind: 'pdf', scope: 'wedding packages' },
    { id: 'planning', title: 'Event Planning Resources', url: 'https://www.exploratorium.edu/rentals/planning', kind: 'page', scope: 'planning checklist' },
    { id: 'faq', title: 'Rentals FAQ', url: 'https://www.exploratorium.edu/rentals/faq', kind: 'page', scope: 'rules and policies' },
    { id: 'inquiry-form', title: 'Rental Inquiry Form', url: inventory.contact.form, kind: 'form', scope: 'official availability, pricing and proposals' },
  ];

  for (const venue of venues) {
    venue.documents = venue.id === 'full' || venue.id === 'central'
      ? ['rentals-map', 'corporate-brochure']
      : venue.id === 'observatory' ? ['rentals-map', 'wedding-brochure'] : ['rentals-map'];
  }

  const eventTypes = inventory.event_types.map((e) => ({
    id: e.id,
    title: e.title,
    tag: e.tag,
    description: e.desc,
    facts: e.facts,
    categories: String(e.cats).split(',').map((s) => s.trim()).filter(Boolean),
    url: e.url,
    image: e.img,
  }));

  const media = inventory.media.map((m, i) => ({
    id: `media-${String(i + 1).padStart(2, '0')}`,
    title: m.title,
    category: m.cat,
    caption: m.caption,
    image: m.img,
    source: m.source,
  }));

  return {
    generatedFrom: 'content-inventory.json',
    venueBrand: 'Exploratorium, Pier 15, Embarcadero, San Francisco',
    contact: inventory.contact,
    hero: {
      title: inventory.hero.title,
      tagline: inventory.hero.tagline,
      intro: inventory.hero.intro,
      reel: inventory.hero.official_reel,
    },
    venues,
    bundles: BUNDLES,
    bundleSource: 'https://www.exploratorium.edu/rentals/full-facility-gallery-bundles',
    eventTypes,
    documents,
    media,
    mapLabels: inventory.map.labels,
    guardrails: {
      capacityNotice: 'Capacities are subject to change and must be confirmed with the Events Team.',
      noPricing: true,
      noLiveAvailability: true,
      handoff: inventory.contact.form,
    },
    rightsNote: inventory.rights_note,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const kb = buildKnowledge();
  mkdirSync(dirname(KB_PATH), { recursive: true });
  writeFileSync(KB_PATH, JSON.stringify(kb, null, 2) + '\n', 'utf8');
  console.log(`wrote ${KB_PATH}: ${kb.venues.length} venues, ${kb.eventTypes.length} event types, ${kb.media.length} media, ${kb.documents.length} documents`);
}
