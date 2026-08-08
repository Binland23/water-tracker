/**
 * Custom background photo — iPhone / Safari / home-screen PWA friendly.
 * Images are compressed on-device and stored in IndexedDB (not localStorage).
 */
(function (global) {
  const DB_NAME = 'water-tracker-bg';
  const DB_VERSION = 1;
  const STORE = 'photos';
  const PHOTO_KEY = 'background';
  const DIM_KEY = 'water-tracker:bg-dim';
  const DEFAULT_DIM = 0.58;
  const MAX_EDGE = 1400;
  const MAX_BYTES_SOFT = 900_000; // ~0.9MB data URL target

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!global.indexedDB) {
        reject(new Error('IndexedDB not available'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
    });
  }

  function idbGet(key) {
    return openDb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, 'readonly');
          const req = tx.objectStore(STORE).get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
          tx.oncomplete = () => db.close();
        })
    );
  }

  function idbSet(key, value) {
    return openDb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(value, key);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        })
    );
  }

  function idbDelete(key) {
    return openDb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).delete(key);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        })
    );
  }

  function getDim() {
    try {
      const n = Number(localStorage.getItem(DIM_KEY));
      if (Number.isFinite(n) && n >= 0.25 && n <= 0.9) return n;
    } catch {
      /* ignore */
    }
    return DEFAULT_DIM;
  }

  function setDim(value) {
    const n = Math.min(0.9, Math.max(0.25, Number(value) || DEFAULT_DIM));
    try {
      localStorage.setItem(DIM_KEY, String(n));
    } catch {
      /* ignore */
    }
    return n;
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      // Prefer createImageBitmap (good orientation handling on modern iOS)
      if (typeof createImageBitmap === 'function') {
        createImageBitmap(file)
          .then(resolve)
          .catch(() => {
            // Fallback for formats / older WebKit
            loadViaObjectUrl(file).then(resolve, reject);
          });
        return;
      }
      loadViaObjectUrl(file).then(resolve, reject);
    });
  }

  function loadViaObjectUrl(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read that photo. Try a JPEG or PNG from Photos.'));
      };
      img.src = url;
    });
  }

  /**
   * Resize + JPEG-compress a photo for on-device storage.
   * @returns {Promise<string>} data URL
   */
  async function compressPhoto(file) {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      // iOS sometimes omits type — still try if size looks like a file
      if (!file || !file.size) {
        throw new Error('Please choose a photo from your library.');
      }
    }

    const bitmap = await loadImageFromFile(file);
    const srcW = bitmap.width || bitmap.naturalWidth;
    const srcH = bitmap.height || bitmap.naturalHeight;
    if (!srcW || !srcH) {
      if (bitmap.close) bitmap.close();
      throw new Error('Could not read photo dimensions.');
    }

    const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH));
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      if (bitmap.close) bitmap.close();
      throw new Error('Canvas not available on this device.');
    }
    ctx.fillStyle = '#0b1f2a';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    if (bitmap.close) bitmap.close();

    let quality = 0.78;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    // Shrink quality until under soft cap (iOS storage is happier with smaller payloads)
    while (dataUrl.length > MAX_BYTES_SOFT && quality > 0.4) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    // Last resort: smaller edge
    if (dataUrl.length > MAX_BYTES_SOFT * 1.4) {
      const w2 = Math.round(w * 0.7);
      const h2 = Math.round(h * 0.7);
      canvas.width = w2;
      canvas.height = h2;
      ctx.fillStyle = '#0b1f2a';
      ctx.fillRect(0, 0, w2, h2);
      // redraw from dataUrl we already have
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, w2, h2);
          resolve();
        };
        img.onerror = reject;
        img.src = dataUrl;
      });
      dataUrl = canvas.toDataURL('image/jpeg', 0.65);
    }

    return dataUrl;
  }

  async function savePhoto(dataUrl) {
    await idbSet(PHOTO_KEY, { dataUrl, updatedAt: Date.now() });
    return dataUrl;
  }

  async function loadPhoto() {
    try {
      const row = await idbGet(PHOTO_KEY);
      if (row && typeof row.dataUrl === 'string' && row.dataUrl.startsWith('data:image/')) {
        return row.dataUrl;
      }
      // Legacy: raw string
      if (typeof row === 'string' && row.startsWith('data:image/')) return row;
      return null;
    } catch {
      return null;
    }
  }

  async function clearPhoto() {
    try {
      await idbDelete(PHOTO_KEY);
    } catch {
      /* ignore */
    }
  }

  /**
   * Apply photo + dim overlay to the page.
   * Uses a fixed layer (not background-attachment:fixed) for iOS Safari.
   */
  function applyToDom(dataUrl, dim = getDim()) {
    const layer = document.getElementById('photo-bg-layer');
    const root = document.body;
    if (!layer || !root) return;

    const d = Math.min(0.9, Math.max(0.25, dim));
    root.style.setProperty('--photo-dim', String(d));

    if (dataUrl) {
      layer.style.backgroundImage = `url("${dataUrl}")`;
      layer.hidden = false;
      root.classList.add('has-photo-bg');
    } else {
      layer.style.backgroundImage = '';
      layer.hidden = true;
      root.classList.remove('has-photo-bg');
    }
  }

  async function initFromStorage() {
    const dataUrl = await loadPhoto();
    applyToDom(dataUrl, getDim());
    return dataUrl;
  }

  global.WaterBgPhoto = {
    DEFAULT_DIM,
    getDim,
    setDim,
    compressPhoto,
    savePhoto,
    loadPhoto,
    clearPhoto,
    applyToDom,
    initFromStorage,
  };
})(typeof window !== 'undefined' ? window : globalThis);
