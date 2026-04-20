/** Map status prefixes back to tool names for animation selection */
const STATUS_TO_TOOL: Record<string, string> = {
  Reading: 'Read',
  Searching: 'Grep',
  Globbing: 'Glob',
  Fetching: 'WebFetch',
  'Searching web': 'WebSearch',
  Writing: 'Write',
  Editing: 'Edit',
  Running: 'Bash',
  Task: 'Task',
};

export function extractToolName(status: string): string | null {
  for (const [prefix, tool] of Object.entries(STATUS_TO_TOOL)) {
    if (status.startsWith(prefix)) return tool;
  }
  const first = status.split(/[\s:]/)[0];
  return first || null;
}

/**
 * Short, single-word gerund label for each Claude Code tool. The overlay uses
 * these instead of the full `formatToolStatus()` strings (which include file
 * paths / command snippets) so labels stay narrow when many avatars overlap.
 */
const TOOL_GERUND_LABELS: Record<string, string> = {
  Read: 'Reading',
  Write: 'Writing',
  Edit: 'Editing',
  MultiEdit: 'Editing',
  NotebookEdit: 'Editing',
  Grep: 'Searching',
  Glob: 'Searching',
  WebSearch: 'Searching',
  WebFetch: 'Fetching',
  Bash: 'Running',
  Task: 'Thinking',
  Agent: 'Thinking',
  EnterPlanMode: 'Planning',
  TodoWrite: 'Planning',
  SendMessage: 'Sending',
  TeamCreate: 'Creating',
};

/** Tools that are effectively user-action-needed even without a permission prompt. */
export const USER_ACTION_TOOLS = new Set<string>(['AskUserQuestion']);

/** Return a short gerund label for a tool name. Falls back to the raw name. */
export function shortToolLabel(toolName: string | null | undefined): string | null {
  if (!toolName) return null;
  return TOOL_GERUND_LABELS[toolName] ?? toolName;
}

import { ZOOM_DEFAULT_DPR_FACTOR, ZOOM_MIN } from '../constants.js';

/** Compute a default integer zoom level (device pixels per sprite pixel) */
export function defaultZoom(): number {
  const dpr = window.devicePixelRatio || 1;
  return Math.max(ZOOM_MIN, Math.round(ZOOM_DEFAULT_DPR_FACTOR * dpr));
}
