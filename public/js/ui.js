const TOAST_MS = 2600;
let toastTimer = null;

export const $ = (selector, root = document) => root.querySelector(selector);

export function toast(message, isError = false) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.toggle('err', isError);
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (element.hidden = true), TOAST_MS);
}

export function fillSelect(select, entries, { keepFirst = false } = {}) {
  const first = keepFirst ? select.firstElementChild : null;
  select.replaceChildren(...(first ? [first] : []));
  for (const [value, label] of entries) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  }
}

export function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

const RELATIVE_UNITS = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];
const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

/** "3 days ago" for an ISO timestamp; empty string when there is nothing to show. */
export function relativeTime(isoString) {
  if (!isoString) return '';
  const parsed = Date.parse(isoString);
  if (Number.isNaN(parsed)) return '';
  const elapsed = parsed - Date.now();
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(elapsed) >= size) return relativeFormat.format(Math.round(elapsed / size), unit);
  }
  return relativeFormat.format(Math.round(elapsed / 1000), 'second');
}

export function absoluteTime(isoString) {
  if (!isoString) return '';
  const parsed = Date.parse(isoString);
  return Number.isNaN(parsed) ? '' : new Date(parsed).toLocaleString();
}

/** Today in YYYY-MM-DD, matching the API's due-date format. */
export function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Fills a <select> and returns it; `entries` is [[value, label], ...]. */
export function setOptions(select, entries, { placeholder = null, selected = '' } = {}) {
  const options = [];
  if (placeholder !== null) {
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = placeholder;
    options.push(blank);
  }
  for (const [value, label] of entries) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = String(value) === String(selected);
    options.push(option);
  }
  select.replaceChildren(...options);
  return select;
}
