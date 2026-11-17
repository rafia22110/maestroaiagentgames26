/**
 * The bot's reasoning step.
 *
 * This is a deterministic policy layer, not a language model: it turns a request into a small
 * tool plan, runs the tools, and composes an answer from what the tools returned. That keeps the
 * demo runnable offline and auditable. When an LLM is available, keep this file's shape — an
 * intent, a tool plan and a composer over tool results — and let the model choose the plan and
 * the wording while `tools.mjs` stays the only data path.
 */
import { callTool } from './tools.mjs';
import { kb, handoff, venue as findVenue } from './kb.mjs';

const has = (text, re) => re.test(text);
const HEBREW = /[\u0590-\u05FF]/;

const VENUE_ALIASES = [
  ['forum', /kanbar|forum|קנבר|פורום/],
  ['observatory', /observatory|terrace|fisher bay|אובזרבטורי|מצפה|מרפסת/],
  ['east', /east gallery|moore east|איסט|מזרח/],
  ['central', /central gallery|bechtel|סנטרל|מרכזי/],
  ['west', /west gallery|osher|וסט|מערב/],
  ['full', /full facility|whole museum|bundles?|כל המוזיאון|מתחם מלא/],
];

const INTENT_PATTERNS = [
  ['pricing', /price|pricing|cost|budget|how much|fee|rate|מחיר|עלות|תקציב|כמה עולה/i],
  ['availability', /availab|book(ing)?|hold a date|reserv|open date|פנוי|זמינות|להזמין|תפוס/i],
  ['conference', /conference|meeting|summit|offsite|off-site|daytime|plenary|film(ing)?|כנס|ישיבה|יום עיון|צילום/i],
  ['wedding', /wedding|ceremony|bride|חתונה|טקס/i],
  ['holiday', /holiday|glow|christmas|new year|december|חגים|חג\b|דצמבר/i],
  ['afterdark', /after dark|18\+|thursday|lounge|אפטר דארק|חמישי/i],
  ['school', /prom|school|student|teen|נשף|בית ספר|תלמיד/i],
  ['media', /image|photo|video|picture|reel|תמונה|גלריה|וידאו|סרטון/i],
  ['contact', /contact|email|phone|call|form|reach|צור קשר|טלפון|מייל|פנייה/i],
  ['brief', /brief|proposal|propose|plan|programme|program|run of show|הצעה|תוכנית|בריף/i],
  ['capacity', /guest|capacit|seat|fit|how many|size|people|אורח|קיבולת|מקומות|מתאים|אנשים/i],
];

function detectIntent(text, venueId = null) {
  // A named space plus a sizing question is a venue-detail question, even when the words
  // "gallery" or "images" also appear.
  if (venueId && /capacit|seat|sq|size|stand|fit|how many|big|קיבולת|מקומות|גודל|מתאים/i.test(text)) return 'venue_detail';
  // A request for pictures is a media request even when it names an event programme.
  if (/photo|image|picture|video|reel|תמונה|וידאו|סרטון/i.test(text)) return 'media';
  for (const [intent, re] of INTENT_PATTERNS) if (has(text, re)) return intent;
  return 'overview';
}

/** Event-type ids in the knowledge base differ from the intent names. */
const EVENT_ALIASES = { wedding: 'weddings', holiday: 'holiday', afterdark: 'afterdark', school: 'prom' };

function extractGuests(text, fallback = 250) {
  const he = /(\d[\d,]*)\s*(אורח|אנשים|מוזמנים|אורחים)/.exec(text);
  const en = /(\d[\d,]*)\s*(guest|people|attendee|person|pax)/i.exec(text);
  const bare = /\b(\d{2,4})\b/.exec(text.replace(/,/g, ''));
  const raw = (he ?? en ?? bare)?.[1];
  const n = raw ? Number(String(raw).replace(/,/g, '')) : NaN;
  return Number.isFinite(n) && n > 0 && n <= 5000 ? n : fallback;
}

function extractFormat(text) {
  if (/rounds?|round tables|עגולים/i.test(text)) return 'rounds';
  if (/cabaret|קברט/i.test(text)) return 'cabaret';
  if (/dinner|seated|ארוחה|ישיבה/i.test(text)) return 'seated';
  if (/reception|standing|cocktail|קבלת פנים|עמידה/i.test(text)) return 'reception';
  return 'theatre';
}

function extractVenueId(text) {
  for (const [id, re] of VENUE_ALIASES) if (re.test(text)) return id;
  return null;
}

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : n);

function bullets(lines) {
  return lines.filter(Boolean).map((l) => `• ${l}`).join('\n');
}

function capacityLine(v) {
  return `${v.name} — ${v.sqftLabel} sq ft; ${fmt(v.capacity.seated)} seated / ${fmt(v.capacity.standing)} standing`;
}

/** Short capacity phrase for one match row, flagging a room that is over the requested count. */
function rowFor(match) {
  const seated = match.capacity?.seated ?? 'n/a';
  const standing = match.capacity?.standing ?? 'n/a';
  return `${match.name} — ${fmt(seated)} seated / ${fmt(standing)} standing${match.fits ? '' : ' (over capacity for this count)'}`;
}

/**
 * Runs one conversational turn.
 * @param {{text: string, state?: object}} turn
 * @returns {{intent: string, language: 'en'|'he', stages: string[], calls: Array<{name: string, args: object, result: any}>, answer: string, citations: Array<{title: string, url: string}>, brief?: object, handoff: string, state: object}}
 */
export function runTurn({ text = '', state = {} } = {}) {
  const clean = String(text).trim();
  const language = HEBREW.test(clean) ? 'he' : 'en';
  const venueId = extractVenueId(clean);
  const intent = detectIntent(clean, venueId);
  const guests = extractGuests(clean, state.guests ?? 250);
  const format = extractFormat(clean) || state.format || 'theatre';
  const data = kb();

  const calls = [];
  const run = (name, args) => {
    const result = callTool(name, args);
    calls.push({ name, args, result });
    return result;
  };

  const stages = ['intake'];
  let answer = '';
  let brief;
  const citations = [];

  const guardrail = (extra) => {
    stages.push('capacity_check', 'curatorial_constraints', 'human_handoff');
    return [
      language === 'he'
        ? 'אין לי אפשרות להציג מחירים או לאשר תאריך — הקיבולות והזמינות מאושרות רק מול צוות האירועים.'
        : "I can't quote pricing or confirm a date: capacity and availability are only confirmed by the Events Team.",
      extra,
      language === 'he'
        ? bullets([
            'קיבולות מהמקור (בכפוף לשינוי): ' + data.venues.slice(0, 4).map((v) => `${v.name} ${v.seatedLabel}`).join(' · '),
            `פנייה רשמית: ${data.contact.phone} · ${data.contact.email} · ${data.contact.form}`,
          ])
        : bullets([
            'Published capacities (subject to change): ' + data.venues.slice(0, 4).map((v) => `${v.name} ${v.seatedLabel} seated`).join(' · '),
            `Official path: ${data.contact.phone} · ${data.contact.email} · ${data.contact.form}`,
          ]),
    ].filter(Boolean).join('\n\n');
  };

  if (intent === 'pricing') {
    run('contact_paths', {});
    run('match_venue', { guests, format });
    answer = guardrail(
      language === 'he'
        ? 'אפשר בכל זאת להתקדם לפי קיבולת: אתאים חלל למספר האורחים ואעביר סיכום לצוות.'
        : 'What I can do is size the space: I can match a gallery to your guest count and hand a brief to the team.',
    );
    citations.push({ title: 'Rentals FAQ', url: 'https://www.exploratorium.edu/rentals/faq' }, { title: 'Rental Inquiry Form', url: handoff() });
  } else if (intent === 'availability') {
    run('contact_paths', {});
    answer = guardrail(
      language === 'he'
        ? 'הזמינות נבדקת רק דרך טופס הבקשה הרשמי. אתאים לך חלל לפי הקיבולת כדי שהפנייה תהיה מדויקת.'
        : 'Availability is checked only through the official inquiry form. I can size the space first so the inquiry is precise.',
    );
    citations.push({ title: 'Rental Inquiry Form', url: handoff() }, { title: '2026 Rentals Map', url: data.documents[0].url });
  } else if (intent === 'conference' || intent === 'brief') {
    stages.push('capacity_check', 'curatorial_constraints');
    const match = run('match_venue', { guests, format, event_type: 'conference', preferences: ['conference'] });
    const drafted = run('draft_brief', { guests, format, event_type: 'conference', goal: clean.slice(0, 180) });
    brief = drafted;
    stages.push('gallery_match', 'brief');
    const best = match.shortlist[0];
    const v = findVenue(best.venueId);
    if (language === 'he') {
      answer = [
        `ל-${guests} אורחים בפורמט ${format}: ${v.name} (${v.sqftLabel} רג"ר, ${v.seatedLabel} בישיבה) הוא החלל המוביל.`,
        bullets([
          `חלופות: ${match.shortlist.slice(1).map((s) => `${s.name} (${s.capacityColumn === 'seated' ? s.seatedLabel + ' בישיבה' : s.standingLabel + ' בעמידה'})${s.fits ? '' : ' — מעל הקיבולת'}`).join(' · ')}`,
          'מסלול יום: רישום בכניסה, מליאה, סדנאות בין המוצגים, ארוחה, סגירה.',
          'שאלות פתוחות: תאריך, ימי שני/שלישי לגלריות הגדולות, AV, קייטרינג וביטוח.',
          `המשך: ${data.contact.form} · ${data.contact.phone}`,
        ]),
        'הקיבולות בכפוף לשינוי ואינן מהוות אישור זמינות או מחיר.',
      ].join('\n\n');
    } else {
      answer = [
        `For ${guests} guests in ${format} format, ${v.name} is the capacity-first anchor (${v.sqftLabel} sq ft; ${fmt(v.capacity.seated)} seated, ${fmt(v.capacity.standing)} standing).`,
        bullets([
          `Runners-up: ${match.shortlist.slice(1).map((s) => `${s.name} (${s.capacityColumn === 'seated' ? fmt(s.capacity.seated) + ' seated' : fmt(s.capacity.standing) + ' standing'})${s.fits ? '' : ' — over capacity'}`).join(' · ')}`,
          'Day flow: arrival at the threshold, plenary, breakouts among the exhibits, lunch, closing session.',
          'Open questions for the Events Team: date and daytime window, AV and rigging, catering, certificate of insurance.',
          `Handoff: ${data.contact.form} · ${data.contact.phone}`,
        ]),
        'Capacities are subject to change and are not a confirmation of availability or price.',
      ].join('\n\n');
    }
    citations.push(
      { title: v.name, url: v.url },
      { title: 'Daytime Meetings & Conferences', url: 'https://www.exploratorium.edu/rentals/daytime-meetings' },
      { title: '2026 Rentals Map', url: data.documents[0].url },
      { title: 'Rental Inquiry Form', url: handoff() },
    );
  } else if (['wedding', 'holiday', 'afterdark', 'school'].includes(intent)) {
    stages.push('capacity_check', 'curatorial_constraints');
    const event = data.eventTypes.find((e) => e.id === (EVENT_ALIASES[intent] ?? intent)) ?? data.eventTypes[0];
    const match = run('match_venue', { guests, format, event_type: event.categories.join(',') });
    stages.push('gallery_match', 'brief');
    const best = match.shortlist[0];
    answer = [
      language === 'he'
        ? `${event.title} — ${event.tag}. ${event.description}`
        : `${event.title} — ${event.tag}. ${event.description}`,
      bullets([
        ...event.facts,
        `Suggested space for ${guests} guests: ${best.name} (${rowFor(best)})`,
        `Handoff: ${data.contact.form}`,
      ]),
      language === 'he' ? 'הקיבולות בכפוף לשינוי; הזמינות נקבעת מול הצוות.' : 'Capacities are subject to change; availability is confirmed by the team.',
    ].join('\n\n');
    citations.push({ title: event.title, url: event.url }, { title: best.name, url: best.url }, { title: 'Rental Inquiry Form', url: handoff() });
  } else if (intent === 'venue_detail' || venueId) {
    stages.push('capacity_check');
    const v = run('get_venue', { venueId });
    stages.push('curatorial_constraints', 'gallery_match');
    answer = [
      capacityLine(v) + '.',
      v.description,
      bullets([
        `Map zone: ${v.mapZone} (2026 Rentals Map)`,
        `Documents: ${v.documents.map((d) => d.title).join(' · ')}`,
        `Source page: ${v.url}`,
        `Handoff: ${data.contact.form}`,
      ]),
      data.guardrails.capacityNotice,
    ].join('\n\n');
    citations.push({ title: v.name, url: v.url }, { title: '2026 Rentals Map', url: data.documents[0].url });
  } else if (intent === 'media') {
    stages.push('capacity_check');
    const category = /wedding|חתונה/i.test(clean) ? 'weddings'
      : /holiday|party|parties|חג/i.test(clean) ? 'parties'
      : /forum|קנבר/i.test(clean) ? 'forum'
      : /after dark|אפטר/i.test(clean) ? 'afterdark'
      : /prom|school|נשף/i.test(clean) ? 'school'
      : /video|reel|סרטון/i.test(clean) ? 'video'
      : 'venues';
    const media = run('search_media', { category, limit: 6 });
    stages.push('curatorial_constraints', 'gallery_match');
    answer = [
      language === 'he'
        ? `מצאתי ${media.count} פריטי מדיה בקטגוריית ${category}; ${media.media.length} מהם מוכנים לקיר המדיה.`
        : `Found ${media.count} media items in the ${category} collection; ${media.media.length} of them are ready for the media wall.`,
      bullets(media.media.map((m) => `${m.title} — ${m.caption.slice(0, 90)}${m.caption.length > 90 ? '…' : ''}`)),
      language === 'he' ? 'התמונות נלקחו מדפי המקור; זכויות שימוש בפרודקשן טעונות אישור.' : 'Images come from the source pages; production rights need confirmation.',
    ].join('\n\n');
    citations.push(...media.media.slice(0, 3).map((m) => ({ title: m.title, url: m.source })));
  } else if (intent === 'capacity') {
    stages.push('capacity_check');
    const match = run('match_venue', { guests, format });
    stages.push('curatorial_constraints', 'gallery_match');
    const best = match.shortlist[0];
    answer = [
      language === 'he'
        ? `ל-${guests} אורחים (${format}) החלל המתאים ביותר הוא ${best.name}: ${best.seatedLabel} בישיבה / ${best.standingLabel} בעמידה.`
        : `For ${guests} guests in ${format} format, the closest fit is ${best.name}: ${best.seatedLabel} seated / ${best.standingLabel} standing.`,
      bullets(match.shortlist.map((s) => rowFor(s))),
      match.notice,
    ].join('\n\n');
    citations.push({ title: best.name, url: best.url }, { title: '2026 Rentals Map', url: data.documents[0].url });
    stages.push('brief');
  } else {
    stages.push('capacity_check');
    const match = run('match_venue', { guests, format });
    stages.push('curatorial_constraints', 'gallery_match');
    answer = [
      language === 'he'
        ? 'החלל שלנו בפיר 15 מתאים לאירועים מ-45 מוזמנים ועד 3,500 בעמידה. אתאים חלל, אבנה בריף כנס או אאסוף גלריה חזותית.'
        : 'Pier 15 runs from lounge-scale gatherings to 3,500 standing. I can match a space, build a conference brief, or pull a gallery shortlist.',
      bullets(match.shortlist.map((s) => `${s.name} — ${s.sqftLabel} sq ft · ${fmt(s.capacity.seated)} seated / ${fmt(s.capacity.standing)} standing`)),
      data.guardrails.capacityNotice,
    ].join('\n\n');
    citations.push({ title: 'Private & Corporate Event Rentals', url: 'https://www.exploratorium.edu/rentals' }, { title: '2026 Rentals Map', url: data.documents[0].url });
  }

  stages.push('human_handoff');
  const deduped = [...new Map(citations.filter(Boolean).map((c) => [c.url, c])).values()];

  return {
    intent,
    language,
    stages: [...new Set(stages)],
    inputs: { guests, format, venueId, event_type: intent },
    calls,
    answer: answer.replace(/\n{3,}/g, '\n\n').trim(),
    citations: deduped,
    ...(brief ? { brief } : {}),
    handoff: handoff(),
    state: { guests, format, intent, lastVenue: calls.find((c) => c.name === 'match_venue')?.result?.shortlist?.[0]?.venueId ?? state.lastVenue ?? null },
  };
}
