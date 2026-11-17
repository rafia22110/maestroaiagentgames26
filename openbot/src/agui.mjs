/**
 * AG-UI transport for the Exploratorium concierge.
 *
 * AG-UI is the open agent-to-UI protocol OpenBot speaks: a client POSTs a RunAgentInput and the
 * endpoint streams events back over SSE. This module emits the subset the protocol defines for a
 * text answer with tool calls, so the same bot runs behind OpenBot's app, behind the standalone
 * prototype, or behind any other AG-UI client.
 *
 * Reference: https://docs.ag-ui.com — event names and payload keys follow @ag-ui/core 1.0.x.
 */
import { runTurn } from './brain.mjs';
import { TOOL_DEFINITIONS } from './tools.mjs';

export const PROTOCOL_VERSION = '1.0';
export const AGENT_ID = 'exploratorium-concierge';

/** The six UI nodes of the prototype's bot stage, in order. */
export const STAGE_ORDER = ['intake', 'capacity_check', 'curatorial_constraints', 'gallery_match', 'brief', 'human_handoff'];

let counter = 0;
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;
const now = () => Date.now();

function textOf(message) {
  if (!message) return '';
  const content = message.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((p) => (typeof p === 'string' ? p : p?.text ?? '')).join('');
  return '';
}

/** Last user turn in an AG-UI message list. */
export function lastUserText(messages = []) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user') return textOf(messages[i]);
  }
  return '';
}

/**
 * Produces the AG-UI event stream for one run.
 * @param {object} input RunAgentInput: {threadId, runId, messages, state, tools, context, forwardedProps}
 * @param {{delay?: number}} [options] delay between text chunks, in ms (0 in tests)
 * @returns {AsyncGenerator<object>}
 */
export async function* streamRun(input = {}, options = {}) {
  const delay = Number.isFinite(options.delay) ? options.delay : 12;
  const threadId = input.threadId ?? uid('thread');
  const runId = input.runId ?? uid('run');
  const text = lastUserText(input.messages) || String(input.forwardedProps?.prompt ?? '');
  const priorState = input.state ?? {};
  const reducedMotion = Boolean(input.forwardedProps?.reducedMotion);

  yield { type: 'RUN_STARTED', threadId, runId, protocolVersion: PROTOCOL_VERSION, input: { threadId, runId } };

  const turn = runTurn({ text, state: priorState });
  const stageIndex = (name) => STAGE_ORDER.indexOf(name);

  for (const stage of turn.stages) {
    yield { type: 'STEP_STARTED', stepName: stage };
    yield {
      type: 'CUSTOM',
      name: 'bot.stage',
      value: { stage, index: stageIndex(stage), total: STAGE_ORDER.length },
    };
  }

  for (const call of turn.calls) {
    const toolCallId = uid('call');
    const argsJson = JSON.stringify(call.args ?? {});
    yield { type: 'TOOL_CALL_START', toolCallId, toolCallName: call.name };
    yield { type: 'TOOL_CALL_ARGS', toolCallId, delta: argsJson };
    yield { type: 'TOOL_CALL_END', toolCallId };
    yield {
      type: 'TOOL_CALL_RESULT',
      messageId: uid('toolmsg'),
      toolCallId,
      role: 'tool',
      content: JSON.stringify(call.result),
    };
  }

  const messageId = uid('msg');
  yield { type: 'TEXT_MESSAGE_START', messageId, role: 'assistant', name: AGENT_ID };

  const chunks = chunkText(turn.answer, 42);
  for (const delta of chunks) {
    yield { type: 'TEXT_MESSAGE_CONTENT', messageId, delta };
    if (delay > 0 && !reducedMotion) await sleep(delay);
  }
  yield { type: 'TEXT_MESSAGE_END', messageId };

  if (turn.brief) yield { type: 'CUSTOM', name: 'artifact.brief', value: turn.brief };
  if (turn.board) yield { type: 'CUSTOM', name: 'artifact.board', value: turn.board };
  yield { type: 'CUSTOM', name: 'artifact.citations', value: { citations: turn.citations, handoff: turn.handoff, intent: turn.intent, language: turn.language } };

  const nextState = { ...priorState, ...turn.state, lastIntent: turn.intent, language: turn.language };
  yield { type: 'STATE_SNAPSHOT', snapshot: nextState };

  for (const stage of [...turn.stages].reverse()) yield { type: 'STEP_FINISHED', stepName: stage };

  yield {
    type: 'RUN_FINISHED',
    threadId,
    runId,
    result: {
      intent: turn.intent,
      language: turn.language,
      citations: turn.citations,
      ...(turn.brief ? { brief: turn.brief } : {}),
      ...(turn.board ? { board: turn.board } : {}),
      handoff: turn.handoff,
    },
  };
}

function chunkText(text, size) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks.length ? chunks : [''];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Encodes one event as an SSE frame. */
export function toSSE(event) {
  return `data: ${JSON.stringify({ ...event, timestamp: event.timestamp ?? now() })}\n\n`;
}

/** Collects a run into an array — used by the tests and by non-streaming clients. */
export async function collectRun(input, options) {
  const events = [];
  for await (const event of streamRun(input, { delay: 0, ...options })) events.push(event);
  return events;
}

/** Declarations an AG-UI client can advertise, and OpenBot's Bot page can list. */
export function agentInfo() {
  return {
    id: AGENT_ID,
    name: 'Pier 15 Concierge',
    description: 'Maestro AI concierge for Exploratorium event rentals, grounded in the 2026 rentals pages, capacities and map, and wired to the project task board.',
    protocolVersion: PROTOCOL_VERSION,
    tools: TOOL_DEFINITIONS,
    stages: STAGE_ORDER,
  };
}
