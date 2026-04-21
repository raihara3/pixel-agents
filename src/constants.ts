// ── User-Level Layout Persistence ─────────────────────────────
export const LAYOUT_FILE_DIR = '.pixel-agents';
export const LAYOUT_FILE_NAME = 'layout.json';
export const CONFIG_FILE_NAME = 'config.json';
export const LAYOUT_FILE_POLL_INTERVAL_MS = 2000;
export const LAYOUT_REVISION_KEY = 'layoutRevision';

// ── Cross-window Agent Mirroring ──────────────────────────────
export const WINDOWS_DIR_NAME = 'windows';
export const WINDOW_FILE_POLL_INTERVAL_MS = 2000;
/** Files older than this are treated as abandoned (crashed windows) and skipped/pruned. */
export const WINDOW_FILE_STALE_MS = 5 * 60 * 1000;
/**
 * Interval for re-writing our own window state file even when the agent snapshot
 * hasn't changed. Keeps `updatedAt` fresh so idle windows aren't pruned by peers.
 * Must be well below WINDOW_FILE_STALE_MS.
 */
export const WINDOW_STATE_HEARTBEAT_MS = 60 * 1000;
/**
 * If `Date.now()` advances by more than this between watcher polls, assume the
 * machine just woke from sleep and grant every remote file a one-round grace
 * period before pruning (their heartbeats need a moment to catch up).
 */
export const WINDOW_WAKE_TIME_JUMP_MS = 60 * 1000;

// ── Settings Persistence (VS Code globalState keys) ─────────
export const GLOBAL_KEY_SOUND_ENABLED = 'pixel-agents.soundEnabled';
export const GLOBAL_KEY_LAST_SEEN_VERSION = 'pixel-agents.lastSeenVersion';
export const GLOBAL_KEY_ALWAYS_SHOW_LABELS = 'pixel-agents.alwaysShowLabels';
export const GLOBAL_KEY_WATCH_ALL_SESSIONS = 'pixel-agents.watchAllSessions';
export const GLOBAL_KEY_HOOKS_ENABLED = 'pixel-agents.hooksEnabled';
export const GLOBAL_KEY_HOOKS_INFO_SHOWN = 'pixel-agents.hooksInfoShown';

// ── VS Code Identifiers ─────────────────────────────────────
export const VIEW_ID = 'pixel-agents.panelView';
export const COMMAND_SHOW_PANEL = 'pixel-agents.showPanel';
export const COMMAND_EXPORT_DEFAULT_LAYOUT = 'pixel-agents.exportDefaultLayout';
export const WORKSPACE_KEY_AGENTS = 'pixel-agents.agents';
export const WORKSPACE_KEY_AGENT_SEATS = 'pixel-agents.agentSeats';
export const WORKSPACE_KEY_LAYOUT = 'pixel-agents.layout';
export const TERMINAL_NAME_PREFIX = 'Claude Code';
