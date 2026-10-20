export function createPanels(
  dialogs: readonly HTMLDialogElement[],
  getSession: () => {
    paused: boolean;
    togglePause(): void;
    resetClock(): void;
  },
  onChange: () => void,
  returnFocus: () => void,
): {
  readonly current: HTMLDialogElement | null;
  readonly playbackPaused: boolean;
  toggle(dialog: HTMLDialogElement): void;
  close(): void;
} {
  let current: HTMLDialogElement | null = null;
  let wasPaused = false;

  function close() {
    if (!current) return;
    const dialog = current;
    current = null;
    if (dialog.open) dialog.close();
    const session = getSession();
    if (session.paused !== wasPaused) session.togglePause();
    session.resetClock();
    onChange();
    returnFocus();
  }

  function toggle(dialog: HTMLDialogElement) {
    if (current === dialog) {
      close();
      return;
    }
    if (current) {
      const previous = current;
      current = null;
      previous.close();
    } else {
      const session = getSession();
      wasPaused = session.paused;
      if (!wasPaused) session.togglePause();
    }
    current = dialog;
    dialog.showModal();
    onChange();
  }

  for (const dialog of dialogs) {
    dialog.addEventListener("close", () => {
      // Native close is queued, and this dialog may already have reopened.
      if (current === dialog && !dialog.open) close();
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      if (current === dialog) close();
    });
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog || current !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        close();
    });
  }

  return {
    get current() {
      return current;
    },
    get playbackPaused() {
      return current ? wasPaused : getSession().paused;
    },
    toggle,
    close,
  };
}
