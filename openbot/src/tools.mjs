/**
 * The bot's tools.
 *
 * These are the only functions that touch venue data, and each one is declared to the AG-UI
 * client (and therefore to OpenBot) with a JSON schema. In OpenBot every call is resolved,
 * decided against policy and written to the audit trail before it runs, so keeping the surface
 * this small is deliberate: no shell, no browser, no network, read-only.
 */
import { kb, normaliseFormat, FORMATS, venue as findVenue, handoff } from './kb.mjs';
import { summary as boardSummary, listTasks, nextTasks, updateTask, activity, setGate, countdown, board } from './board.mjs';

const GUEST_BANDS = [
  { max: 45, note: 'lounge / small group' },
  { max: 200, note: 'single gallery' },
  { max: 500, note: 'large gallery' },
  { max: 1200, note: 'multi-gallery' },
  { max: 3500, note: 'full facility' },
];

function band(guests) {
  return GUEST_BANDS.find((b) => guests <= b.max)?.note ?? 'above published standing capacity';
}

/**
 * Ranks venues against a guest count and a room format.
 * The score prefers the smallest space that fits, then the categories that suit the brief.
 */
export function matchVenue({ guests = 100, format = 'theatre', event_type = '', preferences = [] } = {}) {
  const kbData = kb();
  const capacityColumn = FORMATS[normaliseFormat(format)].column;
  const wanted = new Set(String(event_type).toLowerCase().split(/[,\s]+/).filter(Boolean));
  const prefs = new Set(preferences.map((p) => String(p).toLowerCase()));

  const scored = kbData.venues.map((v) => {
    const limit = v.capacity[capacityColumn] ?? 0;
    const fits = guests <= limit;
    const headroom = limit - guests;
    let score = 0;
    if (fits) score += 1000 - headroom / 40; // fit, then the tightest fit wins
    else score -= (guests - limit) / 4; // oversize requests still return the closest rooms
    for (const w of wanted) if (v.categories.includes(w) || w.includes(v.categories[0])) score += 18;
    if (prefs.has('waterfront') && v.categories.includes('waterfront')) score += 25;
    if (prefs.has('conference') && v.categories.includes('conference')) score += 25;
    if (prefs.has('large') && v.categories.includes('large')) score += 20;
    if (prefs.has('social') && v.categories.includes('social')) score += 20;
    if (guests <= 250 && v.id === 'full') score -= 60; // whole-building answers need a reason
    return {
      venueId: v.id,
      name: v.name,
      fits,
      limit,
      capacityColumn,
      headroom,
      sqftLabel: v.sqftLabel,
      seatedLabel: v.seatedLabel,
      standingLabel: v.standingLabel,
      capacity: v.capacity,
      categories: v.categories,
      mapZone: v.mapZone,
      url: v.url,
      score: Math.round(score * 10) / 10,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return {
    query: { guests, format: normaliseFormat(format), event_type, preferences },
    band: band(guests),
    shortlist: scored.slice(0, 3),
    alsoConsidered: scored.slice(3).map((v) => v.name),
    notice: kbData.guardrails.capacityNotice,
  };
}

/** Full record for one venue, with the documents that describe it. */
export function getVenue({ venueId } = {}) {
  const v = findVenue(venueId);
  if (!v) return { error: 'unknown_venue', known: kb().venues.map((x) => x.id) };
  return {
    ...v,
    documents: v.documents.map((id) => kb().documentById.get(id)).filter(Boolean),
    notice: kb().guardrails.capacityNotice,
  };
}

/** Event-type catalogue (the events tab itself). */
export function listEventTypes({ category } = {}) {
  const all = kb().eventTypes;
  const filtered = category ? all.filter((e) => e.categories.includes(String(category).toLowerCase())) : all;
  return { count: filtered.length, eventTypes: filtered };
}

/** Media wall search, returned as gallery-ready tiles. */
export function searchMedia({ category, limit = 6 } = {}) {
  const all = kb().media;
  const filtered = category ? all.filter((m) => m.category === String(category).toLowerCase()) : all;
  return {
    category: category ?? 'all',
    categories: [...new Set(all.map((m) => m.category))],
    count: filtered.length,
    media: filtered.slice(0, Math.max(1, Number(limit) || 6)),
  };
}

/** Capacity-first conference brief. Never quotes money or a date. */
export function draftBrief({ guests = 100, format = 'theatre', event_type = 'conference', goal = '' } = {}) {
  const match = matchVenue({ guests, format, event_type });
  const best = match.shortlist[0];
  const v = findVenue(best.venueId);
  const programme = [
    { time: '09:00', act: 'Arrival & registration', space: 'Gallery threshold / lobby' },
    { time: '09:45', act: 'Plenary', space: v.id === 'forum' ? 'Kanbar Forum theatre seating' : `${v.name} theatre-style` },
    { time: '11:15', act: 'Breakouts among exhibits', space: 'Adjacent gallery or terrace' },
    { time: '13:00', act: 'Lunch', space: v.capacity.outdoor ? 'Terrace (weather-contingent)' : 'Gallery rounds' },
    { time: '15:00', act: 'Closing session', space: 'Plenary space reused' },
  ];
  return {
    objective: goal || 'A daytime conference that uses the exhibits as the programme, not the backdrop.',
    guests,
    format: normaliseFormat(format),
    anchorSpace: { id: v.id, name: v.name, sqftLabel: v.sqftLabel, seatedLabel: v.seatedLabel, standingLabel: v.standingLabel, url: v.url },
    runnersUp: match.shortlist.slice(1),
    programme,
    openQuestions: [
      'Date and daytime window — larger galleries are only available on closed Mondays and Tuesdays.',
      'Whether museum admission for attendees during open hours is part of the package.',
      'AV, load-in and rigging requirements for the plenary space.',
      'Catering arrangements and certificate-of-insurance requirements.',
    ],
    doesNotInclude: ['pricing', 'live availability', 'catering approval', 'COI approval'],
    handoff: handoff(),
    notice: kb().guardrails.capacityNotice,
  };
}

/** The approved contact paths, and the map/brochure documents behind them. */
export function contactPaths() {
  const c = kb().contact;
  return {
    phone: c.phone,
    email: c.email,
    form: c.form,
    documents: kb().documents,
    note: 'The inquiry form is the only path that can confirm availability, pricing and a proposal.',
  };
}

/** The project board, as one status object: counts, gate, countdown, next critical work. */
export function boardStatus({ limit = 4 } = {}) {
  const s = boardSummary();
  return {
    event: s.event.name,
    track: s.event.track,
    selectedVenue: s.selectedVenue,
    overall: s.overall,
    critical: s.critical,
    phases: s.phases,
    gate: s.gate,
    countdown: countdown(),
    nextActions: nextTasks({ limit }).tasks,
    writesEnabled: s.writesEnabled,
    boardFile: 'board/board.json',
    sourceFile: 'board/source/agent-games-timeline.html',
    sourceLink: board().source.driveLink,
  };
}

/** Board queries a person actually asks for. */
export function boardTasks({ phase = null, status = null, criticalOnly = false, tag = null, limit = 8 } = {}) {
  return listTasks({ phase, status, criticalOnly, tag, limit: Math.min(Number(limit) || 8, 50) });
}

/** Moves one task. Writes only when BOARD_WRITE=1; otherwise returns a proposal. */
export function boardUpdate({ taskId, status = null, done = null, note = null, by = 'concierge' } = {}) {
  return updateTask({ taskId, status, done, note, by });
}

export function boardGate({ index = null, passed = null, by = 'concierge' } = {}) {
  if (index === null) return boardSummary().gate;
  return setGate({ index, passed: passed ?? true, by });
}

export function boardActivity({ limit = 10 } = {}) {
  return activity({ limit: Math.min(Number(limit) || 10, 50) });
}

/** Declarations passed to clients (AG-UI `tools`) and shown in OpenBot's Bot page. */
export const TOOL_DEFINITIONS = [
  {
    name: 'match_venue',
    description: 'Rank the six Pier 15 rental spaces against a guest count, room format and event type. Read-only.',
    parameters: {
      type: 'object',
      properties: {
        guests: { type: 'integer', minimum: 1, maximum: 3500 },
        format: { type: 'string', enum: Object.keys(FORMATS) },
        event_type: { type: 'string', description: 'e.g. conference, weddings, holiday, afterdark, prom' },
        preferences: { type: 'array', items: { type: 'string', enum: ['waterfront', 'conference', 'large', 'social'] } },
      },
      required: ['guests'],
    },
  },
  {
    name: 'get_venue',
    description: 'Read one venue record: square footage, seated and standing capacity, description, map zone, source page, documents.',
    parameters: { type: 'object', properties: { venueId: { type: 'string', enum: ['full', 'observatory', 'east', 'central', 'west', 'forum'] } }, required: ['venueId'] },
  },
  {
    name: 'list_event_types',
    description: 'List the special-event programmes (holiday, daytime conferences, proms, weddings, After Dark).',
    parameters: { type: 'object', properties: { category: { type: 'string' } } },
  },
  {
    name: 'search_media',
    description: 'Search the extracted gallery images by collection.',
    parameters: { type: 'object', properties: { category: { type: 'string', enum: ['venues', 'parties', 'forum', 'weddings', 'afterdark', 'school', 'video'] }, limit: { type: 'integer', minimum: 1, maximum: 12 } } },
  },
  {
    name: 'draft_brief',
    description: 'Draft a capacity-first conference brief for the Events Team. Never returns pricing or availability.',
    parameters: {
      type: 'object',
      properties: { guests: { type: 'integer', minimum: 1, maximum: 3500 }, format: { type: 'string', enum: Object.keys(FORMATS) }, goal: { type: 'string' } },
      required: ['guests'],
    },
  },
  {
    name: 'contact_paths',
    description: 'Return the official phone number, email, inquiry form and source documents.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'board_status',
    description: 'Read the project task board: completion by phase, critical open work, the six submission-gate conditions, the hackathon countdown and the next actions.',
    parameters: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 20 } } },
  },
  {
    name: 'board_tasks',
    description: 'List board tasks, filtered by phase, status, tag or critical flag.',
    parameters: {
      type: 'object',
      properties: {
        phase: { type: 'string', enum: ['before', 'during', 'submit', 'post'] },
        status: { type: 'string', enum: ['open', 'in_progress', 'done', 'blocked'] },
        criticalOnly: { type: 'boolean' },
        tag: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 50 },
      },
    },
  },
  {
    name: 'board_update_task',
    description: 'Change one task\'s status. Writes only when the service runs with BOARD_WRITE=1; otherwise returns a proposal that needs approval, which OpenBot can enforce.',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task id from board_tasks, e.g. b5, d3, s3' },
        status: { type: 'string', enum: ['open', 'in_progress', 'done', 'blocked'] },
        done: { type: 'boolean' },
        note: { type: 'string' },
        by: { type: 'string' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'board_gate',
    description: 'Read or tick the six submission-gate conditions. Ticking needs BOARD_WRITE=1; otherwise a proposal is returned.',
    parameters: { type: 'object', properties: { index: { type: 'integer', minimum: 0, maximum: 5 }, passed: { type: 'boolean' }, by: { type: 'string' } } },
  },
  {
    name: 'board_activity',
    description: 'Recent board changes, newest first, from board/activity.jsonl.',
    parameters: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 50 } } },
  },
];

const EXECUTORS = {
  match_venue: matchVenue,
  get_venue: getVenue,
  list_event_types: listEventTypes,
  search_media: searchMedia,
  draft_brief: draftBrief,
  contact_paths: contactPaths,
  board_status: boardStatus,
  board_tasks: boardTasks,
  board_update_task: boardUpdate,
  board_gate: boardGate,
  board_activity: boardActivity,
};

/** Runs a declared tool. Unknown names are refused rather than guessed at. */
export function callTool(name, args = {}) {
  const fn = EXECUTORS[name];
  if (!fn) throw new Error(`tool_not_granted: ${name}`);
  return fn(args ?? {});
}
