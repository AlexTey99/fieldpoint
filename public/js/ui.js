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
