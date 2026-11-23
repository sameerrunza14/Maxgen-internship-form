// Keeps the documents a student has chosen in the browser (IndexedDB), so they survive a page reload.
//
// Why: on many Android phones, opening the gallery / camera / file picker makes the phone close the
// browser page to free memory. When the student comes back, the page reloads and the chosen files
// would be gone. The answers are already kept (localStorage); this keeps the files too.
//
// Each document is at most 500 KB (photos are made smaller first), so this is a few MB at most.
// Everything is cleared after a successful submit or "Start fresh".
// If the browser does not allow it (private mode, very old browser), these functions quietly do nothing.

const DATABASE_NAME = 'maxgen-internship-form';
const STORE_NAME = 'files';

function openDatabase() {
  return new Promise(function (resolve, reject) {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('No IndexedDB'));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = function () {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = function () {
      resolve(request.result);
    };
    request.onerror = function () {
      reject(request.error);
    };
  });
}

// Runs one change (put / delete / clear) and waits until it is saved
async function change(doChange) {
  try {
    const database = await openDatabase();
    await new Promise(function (resolve, reject) {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      doChange(transaction.objectStore(STORE_NAME));
      transaction.oncomplete = resolve;
      transaction.onerror = function () {
        reject(transaction.error);
      };
    });
    database.close();
  } catch {
    // not saved: the form still works, the file just will not survive a reload
  }
}

// name = the document field, e.g. 'idProof'
export function saveDraftFile(name, file) {
  return change(function (store) {
    store.put({ blob: file, fileName: file.name, type: file.type, lastModified: file.lastModified || Date.now() }, name);
  });
}

export function removeDraftFile(name) {
  return change(function (store) {
    store.delete(name);
  });
}

export function clearDraftFiles() {
  return change(function (store) {
    store.clear();
  });
}

// Returns { idProof: File, resume: File, ... } with the files saved earlier ({} when none)
export async function loadDraftFiles() {
  const files = {};
  try {
    const database = await openDatabase();
    await new Promise(function (resolve, reject) {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).openCursor();
      request.onsuccess = function () {
        const cursor = request.result;
        if (!cursor) {
          return;
        }
        const saved = cursor.value;
        if (saved && saved.blob) {
          files[cursor.key] = new File([saved.blob], saved.fileName, { type: saved.type, lastModified: saved.lastModified });
        }
        cursor.continue();
      };
      transaction.oncomplete = resolve;
      transaction.onerror = function () {
        reject(transaction.error);
      };
    });
    database.close();
  } catch {
    // nothing saved, or not allowed
  }
  return files;
}

// ---------- "Was the student choosing a file when the page reloaded?" ----------
// Set just before the file picker opens, removed when a file comes back. If the page starts and the mark
// is still there (and fresh), the phone reloaded the page while the student was in the gallery / camera.

const PICKING_KEY = 'maxgen-form-picking-file';
const PICKING_FRESH_MS = 30 * 60 * 1000; // older marks are ignored

export function markPickingFile() {
  try {
    window.sessionStorage.setItem(PICKING_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function clearPickingFile() {
  try {
    window.sessionStorage.removeItem(PICKING_KEY);
  } catch {
    // ignore
  }
}

// true once if the page reloaded while a file was being chosen (the mark is removed by reading it)
export function takeReloadedWhilePicking() {
  try {
    const time = Number(window.sessionStorage.getItem(PICKING_KEY));
    window.sessionStorage.removeItem(PICKING_KEY);
    return time > 0 && Date.now() - time < PICKING_FRESH_MS;
  } catch {
    return false;
  }
}
