/**
 * A fast, shared custom tooltip for a row of buttons. Replaces the native
 * `title` attribute, which appears after a ~1s browser delay and fires
 * inconsistently inside webviews — so shortcut hints were often unreadable.
 *
 * Each button supplies its text via `dataset.tip`. The tooltip is a single
 * element appended to `container` (which must be a positioning context — i.e.
 * `position: relative`/`absolute`), positioned just under the hovered button.
 */
export function attachTooltip(container: HTMLElement, buttons: HTMLElement[]): void {
  const tip = document.createElement("div");
  tip.className = "rm-tip";
  tip.setAttribute("role", "tooltip");
  container.appendChild(tip);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const hide = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    tip.classList.remove("show");
  };
  const show = (el: HTMLElement) => {
    const label = el.dataset.tip;
    if (!label) return;
    tip.textContent = label;
    tip.style.left = `${el.offsetLeft}px`;
    tip.style.top = `${el.offsetTop + el.offsetHeight + 4}px`;
    tip.classList.add("show");
  };

  for (const el of buttons) {
    el.addEventListener("mouseenter", () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => show(el), 150);
    });
    el.addEventListener("mouseleave", hide);
    el.addEventListener("click", hide);
  }
}
