import { api, geocode } from './api.js';
import { CATEGORIES, STATUSES } from './constants.js';
import { $, fillSelect, formValues, toast } from './ui.js';

/** Sidebar list + editor dialog for sites. State lives here; map is notified via callbacks. */
export function createSitesPanel({ mapView, currentUser }) {
  const list = $('#site-list');
  const dialog = $('#site-dialog');
  const form = $('#site-form');
  const errorBox = $('#site-error');
  let sites = [];
  let selectedId = null;

  fillSelect($('#filter-category'), Object.entries(CATEGORIES).map(([key, value]) => [key, value.label]), { keepFirst: true });
  fillSelect($('#filter-status'), Object.entries(STATUSES), { keepFirst: true });
  fillSelect($('#form-category'), Object.entries(CATEGORIES).map(([key, value]) => [key, value.label]));
  fillSelect($('#form-status'), Object.entries(STATUSES));

  function currentFilters() {
    const params = {};
    const q = $('#search').value.trim();
    const category = $('#filter-category').value;
    const status = $('#filter-status').value;
    if (q) params.q = q;
    if (category) params.category = category;
    if (status) params.status = status;
    return params;
  }

  function renderList() {
    list.replaceChildren();
    $('#site-count').textContent = `${sites.length} site${sites.length === 1 ? '' : 's'}`;
    $('#export-btn').href = `/api/sites/export.csv?${new URLSearchParams(currentFilters())}`;
    if (sites.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = 'No sites match. Add one with “+ Add site” or right-click the map.';
      list.append(empty);
      return;
    }
    for (const site of sites) {
      const item = document.createElement('li');
      item.className = `site-item${site.id === selectedId ? ' selected' : ''}`;
      item.dataset.id = site.id;
      const title = document.createElement('div');
      title.className = 'title';
      const name = document.createElement('span');
      name.textContent = site.name;
      const badge = document.createElement('span');
      badge.className = `badge ${site.status}`;
      badge.textContent = STATUSES[site.status] ?? site.status;
      title.append(name, badge);
      const sub = document.createElement('div');
      sub.className = 'sub';
      sub.textContent = `${CATEGORIES[site.category]?.label ?? site.category} · ${site.address || `${site.lat.toFixed(4)}, ${site.lng.toFixed(4)}`}`;
      item.append(title, sub);
      item.addEventListener('click', () => select(site.id));
      item.addEventListener('dblclick', () => openEditor(site));
      list.append(item);
    }
  }

  function select(id) {
    selectedId = id;
    renderList();
    mapView.focus(id);
  }

  async function refresh({ fit = false } = {}) {
    try {
      const result = await api.listSites(currentFilters());
      sites = result.sites;
      renderList();
      mapView.render(sites);
      if (fit) mapView.fitAll(sites);
    } catch (error) {
      toast(error.message, true);
    }
  }

  function openEditor(site = null, preset = {}) {
    form.reset();
    errorBox.textContent = '';
    $('#site-dialog-title').textContent = site ? 'Edit site' : 'New site';
    $('#delete-btn').hidden = !(site && currentUser.role === 'admin');
    const values = site ?? { category: 'client', status: 'active', ...preset };
    for (const [key, value] of Object.entries(values)) {
      if (form.elements[key]) form.elements[key].value = value ?? '';
    }
    dialog.showModal();
  }

  async function submitEditor(event) {
    event.preventDefault();
    const { id, ...data } = formValues(form);
    try {
      if (id) {
        await api.updateSite(id, data);
        toast('Site updated');
      } else {
        await api.createSite(data);
        toast('Site created');
      }
      dialog.close();
      await refresh();
    } catch (error) {
      errorBox.textContent = error.message;
    }
  }

  async function deleteCurrent() {
    const id = form.elements.id.value;
    const site = sites.find((entry) => String(entry.id) === id);
    if (!id || !window.confirm(`Delete “${site?.name ?? 'this site'}”? This cannot be undone.`)) return;
    try {
      await api.deleteSite(id);
      dialog.close();
      selectedId = null;
      toast('Site deleted');
      await refresh();
    } catch (error) {
      errorBox.textContent = error.message;
    }
  }

  async function locateAddress() {
    const address = form.elements.address.value.trim();
    if (!address) return (errorBox.textContent = 'Enter an address first');
    errorBox.textContent = '';
    try {
      const hit = await geocode(address);
      form.elements.lat.value = hit.lat.toFixed(6);
      form.elements.lng.value = hit.lng.toFixed(6);
      toast(`Found: ${hit.label}`);
    } catch (error) {
      errorBox.textContent = error.message;
    }
  }

  form.addEventListener('submit', submitEditor);
  $('#cancel-btn').addEventListener('click', () => dialog.close());
  $('#delete-btn').addEventListener('click', deleteCurrent);
  $('#geocode-btn').addEventListener('click', locateAddress);
  $('#add-btn').addEventListener('click', () => openEditor());

  return { refresh, select, openEditor };
}
