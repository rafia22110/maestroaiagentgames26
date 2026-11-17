/**
 * Pier 15 Concierge — AG-UI browser client.
 *
 * This is the reusable version of the bridge that the standalone prototype inlines. Use it from
 * any page (or from a CopilotKit/OpenBot frontend) to stream a run from the bot's /agui endpoint
 * and drive the six-node stage animation, the answer text, the brief card and the citations.
 *
 *   import { createConcierge } from './concierge-client.js';
 *
 *   const bot = createConcierge({ endpoint: 'https://bot.example.com/agui' });
 *   await bot.health();
 *   await bot.ask('Conference for 250 guests, theatre style', {
 *     onStage: (stage, index) => highlight(index),
 *     onText:  (full, delta) => (answerEl.textContent = full),
 *     onBrief: (brief) => renderBrief(brief),
 *     onCitations: (citations, handoff) => renderSources(citations, handoff),
 *     onBoard: (board) => renderBoard(board.summary),
 *   });
 *
 * No dependencies. The endpoint must allow this origin (ALLOWED_ORIGIN on the bot server).
 */

const STAGE_ORDER = ['intake', 'capacity_check', 'curatorial_constraints', 'gallery_match', 'brief', 'human_handoff'];

export function createConcierge({
  endpoint = '/agui',
  threadId = `thread-${Math.random().toString(36).slice(2, 10)}`,
  fetchImpl = globalThis.fetch,
  headers = {},
} = {}) {
  const base = String(endpoint).replace(/\/$/, '');
  const origin = base.replace(/\/agui$/, '');
  let state = {};

  async function health() {
    try {
      const res = await fetchImpl(`${origin}/healthz`, { headers: { accept: 'application/json', ...headers } });
      if (!res.ok) return { ok: false, status: res.status };
      return await res.json();
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  }

  /**
   * Runs one turn.
   * @returns {Promise<{text: string, result: object|null, stages: string[], citations: Array, brief?: object}>}
   */
  async function ask(prompt, handlers = {}, options = {}) {
    const runId = `run-${Date.now().toString(36)}`;
    const body = {
      threadId,
      runId,
      messages: [{ id: `m-${Date.now().toString(36)}`, role: 'user', content: prompt }],
      state,
      forwardedProps: { reducedMotion: Boolean(options.reducedMotion) },
    };

    const res = await fetchImpl(base, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'text/event-stream', ...headers },
      body: JSON.stringify(body),
      signal: options.signal,
    });
    if (!res.ok || !res.body) throw new Error(`AG-UI endpoint returned ${res.status}`);
    if (options.onOpen) options.onOpen();

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const stages = [];
    let text = '';
    let result = null;
    let buffer = '';

    const dispatch = (event) => {
      switch (event.type) {
        case 'CUSTOM':
          if (event.name === 'bot.stage') {
            stages.push(event.value.stage);
            handlers.onStage?.(event.value.stage, event.value.index, STAGE_ORDER.length);
          } else if (event.name === 'artifact.brief') {
            handlers.onBrief?.(event.value);
          } else if (event.name === 'artifact.board') {
            handlers.onBoard?.(event.value);
          } else if (event.name === 'artifact.citations') {
            handlers.onCitations?.(event.value.citations, event.value.handoff, event.value);
          }
          break;
        case 'TOOL_CALL_START':
          handlers.onTool?.(event.toolCallName, event.toolCallId);
          break;
        case 'TEXT_MESSAGE_CONTENT':
          text += event.delta;
          handlers.onText?.(text, event.delta);
          break;
        case 'STATE_SNAPSHOT':
          state = event.snapshot ?? state;
          break;
        case 'RUN_FINISHED':
          result = event.result ?? null;
          break;
        case 'RUN_ERROR':
          throw new Error(event.message ?? 'run error');
        default:
          break;
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const line = frame.split('\n').find((l) => l.startsWith('data:'));
        if (!line) continue;
        let event;
        try {
          event = JSON.parse(line.slice(5).trim());
        } catch {
          continue;
        }
        dispatch(event);
      }
    }

    handlers.onDone?.({ text, result, stages });
    return { text, result, stages, citations: result?.citations ?? [], brief: result?.brief };
  }

  return { ask, health, endpoint: base, get state() { return state; }, reset() { state = {}; } };
}

export { STAGE_ORDER };
