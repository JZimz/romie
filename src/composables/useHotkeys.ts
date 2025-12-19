import { onMounted, onUnmounted } from 'vue';

type Hotkey = {
  key: string;
  handler: (event: KeyboardEvent) => void;
  meta?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  allowInInputs?: boolean;
  when?: () => boolean;
};

const hotkeys = new Set<Hotkey>();
let listening = false;

function isEditable(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return (
    el.isContentEditable ||
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    tag === 'option' ||
    tag === 'button'
  );
}

function matches(event: KeyboardEvent, hotkey: Hotkey) {
  if (hotkey.when && !hotkey.when()) return false;
  if (!hotkey.allowInInputs && isEditable(event.target)) return false;
  if (hotkey.meta !== undefined && hotkey.meta !== event.metaKey) return false;
  if (hotkey.ctrl !== undefined && hotkey.ctrl !== event.ctrlKey) return false;
  if (hotkey.alt !== undefined && hotkey.alt !== event.altKey) return false;
  if (hotkey.shift !== undefined && hotkey.shift !== event.shiftKey) return false;
  return event.key.toLowerCase() === hotkey.key.toLowerCase();
}

function onKeydown(event: KeyboardEvent) {
  for (const hk of hotkeys) {
    if (matches(event, hk)) {
      hk.handler(event);
    }
  }
}

function ensureListener() {
  if (!listening && typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeydown, { capture: true });
    listening = true;
  }
}

export function useHotkeys() {
  const owned = new Set<Hotkey>();

  function register(hotkey: Hotkey) {
    hotkeys.add(hotkey);
    owned.add(hotkey);
    ensureListener();
    return () => {
      hotkeys.delete(hotkey);
      owned.delete(hotkey);
    };
  }

  onUnmounted(() => {
    owned.forEach((hk) => hotkeys.delete(hk));
  });

  return { register };
}
