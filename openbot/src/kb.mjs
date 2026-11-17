/**
 * Knowledge access for the Exploratorium concierge bot.
 *
 * Everything the bot may say about the venue comes from openbot/kb/knowledge.json, which is
 * generated from the project's content-inventory.json. Nothing here reads the network, reads a
 * database or invents a number: it is the single data path behind every tool call, which is what
 * makes the audit trail in OpenBot meaningful.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const KB_PATH = process.env.EXPLORATORIUM_KB ?? join(here, '..', 'kb', 'knowledge.json');

let cached = null;

/** @returns {object} the parsed knowledge base (loaded once per process). */
export function kb() {
  if (!cached) {
    cached = JSON.parse(readFileSync(KB_PATH, 'utf8'));
    cached.venueById = new Map(cached.venues.map((v) => [v.id, v]));
    cached.documentById = new Map(cached.documents.map((d) => [d.id, d]));
  }
  return cached;
}

export function venue(id) {
  return kb().venueById.get(String(id ?? '').toLowerCase()) ?? null;
}

export function citationForVenue(v) {
  return { title: v.name, url: v.url, kind: 'venue' };
}

export function citationForDocument(id) {
  const d = kb().documentById.get(id);
  return d ? { title: d.title, url: d.url, kind: d.kind } : null;
}

/** The fixed handoff every answer ends with: the official inquiry form. */
export function handoff() {
  return kb().contact.form;
}

/** Formats the bot accepts, with their capacity column and a human label. */
export const FORMATS = {
  theatre: { column: 'seated', label: 'theatre-style', he: 'תיאטרון' },
  seated: { column: 'seated', label: 'seated dinner', he: 'ארוחה בישיבה' },
  cabaret: { column: 'seated', label: 'cabaret', he: 'קברט' },
  rounds: { column: 'seated', label: 'rounds', he: 'שולחנות עגולים' },
  reception: { column: 'standing', label: 'standing reception', he: 'קבלת פנים בעמידה' },
  standing: { column: 'standing', label: 'standing reception', he: 'קבלת פנים בעמידה' },
};

export function normaliseFormat(format) {
  const key = String(format ?? '').toLowerCase().trim();
  return FORMATS[key] ? key : 'theatre';
}
