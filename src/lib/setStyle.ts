// Writes an inline style only when the value actually changes.
//
// The overlays (captions, stage dots, top bar, engine labels) update their
// styles from animation-frame loops. Most frames nothing has changed, and
// rewriting the same value still makes the browser re-check the element's
// styles; skipping identical writes keeps those loops nearly free while the
// page is sitting still, and cheaper while it scrolls.

const written = new WeakMap<HTMLElement, Map<string, string>>();

export function setStyle(
  element: HTMLElement,
  property: "opacity" | "borderColor" | "backgroundColor" | "boxShadow" | "color" | "transform" | "pointerEvents" | "visibility",
  value: string
) {
  let values = written.get(element);
  if (!values) {
    values = new Map();
    written.set(element, values);
  }
  if (values.get(property) === value) return;
  values.set(property, value);
  element.style[property] = value;
}
