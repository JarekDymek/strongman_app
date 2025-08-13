
// Lightweight diagnostics overlay for mobile/desktop to show storage estimates, IndexedDB counts and cache sizes.
// Use: call Diagnostics.init() after app init; includes a small toggled overlay.

const Diagnostics = (function(){
  let overlay;
  function el(tag, attrs={}, txt='') {
    const e = document.createElement(tag);
    Object.keys(attrs).forEach(k => e.setAttribute(k, attrs[k]));
    if (txt) e.textContent = txt;
    return e;
  }

  async function getIndexedDBCounts() {
    const result = {};
    try {
      // Try to open DB and count common stores
      const req = indexedDB.open('StrongmanAppDB_v2');
      result._status = 'ok';
      await new Promise((res, rej) => {
        req.onsuccess = e => { res(e.target.result); };
        req.onerror = e => { res(null); };
        req.onupgradeneeded = e => { res(e.target.result); };
      });
      const db = req.result || null;
      if (!db) return result;
      const stores = Array.from(db.objectStoreNames || []);
      for (const s of stores) {
        try {
          const tx = db.transaction(s, 'readonly');
          const st = tx.objectStore(s);
          const count = await new Promise(r => {
            const cr = st.count();
            cr.onsuccess = () => r(cr.result);
            cr.onerror = () => r('err');
          });
          result[s] = count;
        } catch(e) { result[s] = 'err'; }
      }
      try { db.close(); } catch(e){}
    } catch(e) {
      result._err = String(e);
    }
    return result;
  }

  async function getCacheSizes() {
    const out = {};
    if (!('caches' in window)) return out;
    try {
      const keys = await caches.keys();
      for (const k of keys) {
        const c = await caches.open(k);
        const r = await c.keys();
        out[k] = r.length;
      }
    } catch(e) { out._err = String(e); }
    return out;
  }

  async function getStorageEstimate() {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    try {
      const est = await navigator.storage.estimate();
      return est; // {quota, usage, usageDetails}
    } catch(e) { return null; }
  }

  async function refresh() {
    if (!overlay) return;
    overlay.querySelector('.diag-idb').textContent = 'Ładowanie...';
    overlay.querySelector('.diag-cache').textContent = 'Ładowanie...';
    overlay.querySelector('.diag-est').textContent = 'Ładowanie...';
    const idb = await getIndexedDBCounts();
    const cache = await getCacheSizes();
    const est = await getStorageEstimate();
    overlay.querySelector('.diag-idb').textContent = JSON.stringify(idb, null, 0);
    overlay.querySelector('.diag-cache').textContent = JSON.stringify(cache, null, 0);
    overlay.querySelector('.diag-est').textContent = est ? ('usage: ' + (est.usage||0) + ' quota: ' + (est.quota||0)) : 'n/a';
  }

  function createOverlay() {
    overlay = el('div', {'id':'diagOverlay','style':'position:fixed;right:10px;bottom:10px;z-index:99999;background:rgba(0,0,0,0.85);color:#fff;padding:10px;border-radius:8px;max-width:320px;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.5);'});
    const header = el('div', {}, 'Diagnostyka • Strongman');
    const refreshBtn = el('button', {'type':'button','style':'margin-left:8px;padding:4px 6px;'}, 'Odśwież');
    refreshBtn.addEventListener('click', refresh);
    const close = el('button', {'type':'button','style':'margin-left:8px;padding:4px 6px;'}, '✕');
    close.addEventListener('click', () => overlay.style.display='none');
    header.appendChild(refreshBtn);
    header.appendChild(close);
    const idb = el('pre', {'class':'diag-idb','style':'white-space:pre-wrap;max-height:120px;overflow:auto;margin-top:8px;'}, '');
    const cache = el('pre', {'class':'diag-cache','style':'white-space:pre-wrap;max-height:80px;overflow:auto;margin-top:8px;'}, '');
    const est = el('div', {'class':'diag-est','style':'margin-top:8px;'}, '');
    overlay.appendChild(header);
    overlay.appendChild(idb);
    overlay.appendChild(cache);
    overlay.appendChild(est);
    document.body.appendChild(overlay);
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    if (!document.getElementById('diagOverlay')) createOverlay();
    refresh();
  }

  return { init, refresh };
})();

// Expose globally for console usage
window.Diagnostics = Diagnostics;
export default Diagnostics;
