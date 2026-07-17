(function attachModalUtils(global) {
  const app = (global.LunchApp = global.LunchApp || {});

  const FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");

  function getFocusableElements(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
      return element.offsetParent !== null || element === document.activeElement;
    });
  }

  function useModalFocus({ onClose, closeOnEscape = true } = {}) {
    const modalRef = React.useRef(null);

    React.useEffect(() => {
      const previousActiveElement = document.activeElement;
      const focusableElements = getFocusableElements(modalRef.current);
      const firstFocusable = focusableElements[0] || modalRef.current;

      window.setTimeout(() => firstFocusable?.focus?.(), 0);

      function handleKeyDown(event) {
        if (event.key === "Escape" && closeOnEscape) {
          event.preventDefault();
          onClose?.();
          return;
        }

        if (event.key !== "Tab") return;

        const nextFocusableElements = getFocusableElements(modalRef.current);
        if (!nextFocusableElements.length) {
          event.preventDefault();
          modalRef.current?.focus?.();
          return;
        }

        const first = nextFocusableElements[0];
        const last = nextFocusableElements[nextFocusableElements.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }

      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        if (previousActiveElement && document.contains(previousActiveElement)) {
          previousActiveElement.focus?.();
        }
      };
    }, [onClose, closeOnEscape]);

    return modalRef;
  }

  app.modal = {
    useModalFocus,
  };
})(window);
