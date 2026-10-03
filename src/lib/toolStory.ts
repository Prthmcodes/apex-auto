// Which tool is currently hovered, and which one's story card is open.
//
// This has to be readable from both sides of the <Canvas> boundary — the
// 3D tools that get clicked live inside it, the card and the accessible
// buttons live outside it — so it's a tiny module-level store with
// useSyncExternalStore rather than React context, which doesn't reliably
// cross into react-three-fiber's separate reconciler.

type ToolStoryState = {
  /** The `id` of the open story card, or null when nothing is open. */
  openId: string | null;
  /** The `id` of the tool under the pointer, or null. */
  hoverId: string | null;
  /** True once the first-time "tap a tool" hint has had its moment. */
  hintSeen: boolean;
};

let state: ToolStoryState = { openId: null, hoverId: null, hintSeen: false };

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): ToolStoryState {
  return state;
}

/** Server render has no interaction state; this keeps the shapes identical. */
export function getServerSnapshot(): ToolStoryState {
  return state;
}

function set(next: Partial<ToolStoryState>) {
  const merged = { ...state, ...next };
  if (
    merged.openId === state.openId &&
    merged.hoverId === state.hoverId &&
    merged.hintSeen === state.hintSeen
  ) {
    return;
  }
  state = merged;
  emit();
}

export function openStory(id: string) {
  // Opening anything counts as discovering the feature, so the hint goes.
  set({ openId: id, hintSeen: true });
}

export function closeStory() {
  set({ openId: null });
}

/** Clicking an already-open tool closes it again. */
export function toggleStory(id: string) {
  if (state.openId === id) closeStory();
  else openStory(id);
}

export function setHover(id: string | null) {
  set({ hoverId: id });
}

export function markHintSeen() {
  set({ hintSeen: true });
}

/**
 * Read by the 3D tools inside useFrame, where subscribing to React state
 * every frame would be wasteful — they just read the latest value.
 */
export function peek(): ToolStoryState {
  return state;
}
