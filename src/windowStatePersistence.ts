import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  LAYOUT_FILE_DIR,
  WINDOW_FILE_POLL_INTERVAL_MS,
  WINDOW_FILE_STALE_MS,
  WINDOW_WAKE_TIME_JUMP_MS,
  WINDOWS_DIR_NAME,
} from './constants.js';

/** One agent's mirrored state, shared with the webview for rendering. */
export interface WindowAgentSnapshot {
  id: number;
  palette: number;
  hueShift: number;
  seatId: string | null;
  isActive: boolean;
  /** Persistent turn-completion flag (distinct from the transient waiting
   *  bubbleType sprite). Drives remote ☕️ overlay labels. */
  isWaiting: boolean;
  currentTool: string | null;
  bubbleType: 'permission' | 'waiting' | null;
}

/** On-disk representation of a window's current agent state. */
export interface WindowStateFile {
  version: 1;
  windowId: string;
  repoPath: string;
  repoName: string;
  updatedAt: number;
  agents: WindowAgentSnapshot[];
}

/** Remote window snapshot delivered to the webview (stripped of path). */
export interface RemoteWindow {
  windowId: string;
  repoName: string;
  agents: WindowAgentSnapshot[];
}

export interface WindowsDirWatcher {
  dispose(): void;
}

function getWindowsDir(): string {
  return path.join(os.homedir(), LAYOUT_FILE_DIR, WINDOWS_DIR_NAME);
}

function getWindowFilePath(windowId: string): string {
  return path.join(getWindowsDir(), `${windowId}.json`);
}

/** Atomically write this window's state to disk (tmp file + rename). */
export function writeOwnState(state: WindowStateFile): void {
  const filePath = getWindowFilePath(state.windowId);
  const dir = path.dirname(filePath);
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(state), 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    console.error('[Pixel Agents] Failed to write window state:', err);
  }
}

/** Remove this window's state file. Called on deactivate. */
export function cleanupOwnFile(windowId: string): void {
  const filePath = getWindowFilePath(windowId);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('[Pixel Agents] Failed to remove own window state file:', err);
  }
}

/** Read+parse a single window state file. Returns null on failure. */
function readWindowFile(filePath: string): WindowStateFile | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as WindowStateFile;
    if (parsed.version !== 1 || typeof parsed.windowId !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Read all windows' state files, skip own + stale files + same-repo files, and
 * apply last-write-wins dedup per repoPath.
 *
 * @param ownWindowId   This window's UUID (excluded from result)
 * @param ownRepoPath   This window's workspace path (other files matching this are
 *                      skipped to avoid duplicate mirroring when the same repo is
 *                      open in multiple windows — own agents already shown locally)
 * @param skipPrune     When true, keep stale files in the result and do not delete
 *                      them. Used immediately after a detected wake-from-sleep so
 *                      peer windows get a round to refresh their own heartbeats.
 */
export function readRemoteWindows(
  ownWindowId: string,
  ownRepoPath: string,
  skipPrune = false,
): RemoteWindow[] {
  const dir = getWindowsDir();
  if (!fs.existsSync(dir)) return [];

  const now = Date.now();
  const byRepo = new Map<string, WindowStateFile>();

  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch (err) {
    console.error('[Pixel Agents] Failed to read windows dir:', err);
    return [];
  }

  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const filePath = path.join(dir, entry);
    const state = readWindowFile(filePath);
    if (!state) continue;
    if (state.windowId === ownWindowId) continue;

    const isStale = now - state.updatedAt > WINDOW_FILE_STALE_MS;
    if (isStale) {
      if (!skipPrune) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          /* another window may have already pruned it */
        }
        continue;
      }
      // Wake-grace: keep the stale file around so its window has a chance to
      // refresh before we treat it as crashed.
    }

    // Same-repo dedup: skip remotes from our own repo path. Our own agents are
    // rendered locally; mirroring would duplicate them.
    if (state.repoPath === ownRepoPath) continue;

    // Per-repo last-write-wins: among all remote files sharing a repoPath, keep
    // the one with the highest updatedAt.
    const existing = byRepo.get(state.repoPath);
    if (!existing || state.updatedAt > existing.updatedAt) {
      byRepo.set(state.repoPath, state);
    }
  }

  return Array.from(byRepo.values()).map((s) => ({
    windowId: s.windowId,
    repoName: s.repoName,
    agents: s.agents,
  }));
}

/**
 * Watch ~/.pixel-agents/windows/ for external changes (other VS Code windows).
 * Uses hybrid fs.watch + polling (same pattern as layoutPersistence).
 * The callback is invoked with the merged remote snapshots.
 */
export function watchWindowsDir(
  ownWindowId: string,
  getOwnRepoPath: () => string,
  onUpdate: (windows: RemoteWindow[]) => void,
): WindowsDirWatcher {
  const dir = getWindowsDir();
  let fsWatcher: fs.FSWatcher | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let disposed = false;
  // Tracks the wall-clock time of the previous emit so we can detect large
  // jumps (PC sleep/wake) and grant peers a one-round prune grace period.
  let lastEmitAt = Date.now();

  function emit(): void {
    if (disposed) return;
    const now = Date.now();
    const justWoke = now - lastEmitAt > WINDOW_WAKE_TIME_JUMP_MS;
    lastEmitAt = now;
    const windows = readRemoteWindows(ownWindowId, getOwnRepoPath(), justWoke);
    onUpdate(windows);
  }

  function startFsWatch(): void {
    if (disposed || fsWatcher) return;
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fsWatcher = fs.watch(dir, () => {
        emit();
      });
      fsWatcher.on('error', (err) => {
        console.log(`[Pixel Agents] Windows dir: fs.watch error: ${err.message}`);
        fsWatcher?.close();
        fsWatcher = null;
      });
    } catch {
      /* dir may not exist yet — polling will retry */
    }
  }

  startFsWatch();
  // Emit once on start so the webview sees the current remote set immediately.
  emit();

  pollTimer = setInterval(() => {
    if (disposed) return;
    if (!fsWatcher) startFsWatch();
    emit();
  }, WINDOW_FILE_POLL_INTERVAL_MS);

  return {
    dispose(): void {
      disposed = true;
      fsWatcher?.close();
      fsWatcher = null;
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    },
  };
}
