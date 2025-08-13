// Plik: js/unifiedDatabase.js
// Cel: Zunifikowana warstwa dostępu do wszystkich baz danych IndexedDB

import { showNotification } from './ui.js';
import { INITIAL_COMPETITORS, INITIAL_EVENTS } from './initialData.js';

let db;
const DB_NAME = 'StrongmanAppDB_Unified_v1';
const DB_VERSION = 3;

const STORES = {
    COMPETITORS: 'competitors',
    EVENTS: 'events',
    CHECKPOINTS: 'checkpoints',
    APP_STATE: 'appState'
};

// === INICJALIZACJA BAZY DANYCH ===
export function initUnifiedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = e => {
            console.error(`Błąd bazy danych ${DB_NAME}:`, e.target.error);
            reject(e.target.error);
        };
        
        request.onsuccess = e => {
            db = e.target.result;
            console.log(`Baza danych ${DB_NAME} została zainicjowana pomyślnie`);
            resolve();
        };
        
        request.onupgradeneeded = e => {
            db = e.target.result;
            console.log(`Aktualizacja bazy danych do wersji ${DB_VERSION}`);
            
            // Store dla zawodników
            if (!db.objectStoreNames.contains(STORES.COMPETITORS)) {
                const competitorsStore = db.createObjectStore(STORES.COMPETITORS, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                competitorsStore.createIndex('name_idx', 'name', { unique: true });
                competitorsStore.createIndex('categories_idx', 'categories', { multiEntry: true });
            }
            
            // Store dla konkurencji
            if (!db.objectStoreNames.contains(STORES.EVENTS)) {
                const eventsStore = db.createObjectStore(STORES.EVENTS, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                eventsStore.createIndex('name_idx', 'name', { unique: false });
                eventsStore.createIndex('type_idx', 'type', { unique: false });
            }
            
            // Store dla punktów kontrolnych
            if (!db.objectStoreNames.contains(STORES.CHECKPOINTS)) {
                db.createObjectStore(STORES.CHECKPOINTS, { keyPath: 'key' });
            }
            
            // Store dla stanu aplikacji
            if (!db.objectStoreNames.contains(STORES.APP_STATE)) {
                db.createObjectStore(STORES.APP_STATE, { keyPath: 'id' });
            }
        };
    });
}

// === GENERYCZNA FUNKCJA POMOCNICZA ===
function dbAction(storeName, mode, actionCallback, data = null) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error("Baza danych nie jest zainicjowana"));
        }
        
        try {
            const transaction = db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(new Error("Transakcja została przerwana"));
            
            const request = actionCallback(store, data);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
        } catch (error) {
            reject(error);
        }
    });
}

// === OPERACJE NA ZAWODNIKACH ===
export async function getCompetitors() {
    const competitors = await dbAction(STORES.COMPETITORS, 'readonly', store => store.getAll());
    return competitors.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
}

export async function saveCompetitor(competitorData) {
    const isUpdate = !!competitorData.id;
    if (!isUpdate) {
        delete competitorData.id;
    }
    
    const result = await dbAction(STORES.COMPETITORS, 'readwrite', (store, data) => {
        return isUpdate ? store.put(data) : store.add(data);
    }, competitorData);
    
    return result;
}

export async function deleteCompetitor(id) {
    return await dbAction(STORES.COMPETITORS, 'readwrite', (store, key) => store.delete(key), id);
}

export async function getCompetitorById(id) {
    return await dbAction(STORES.COMPETITORS, 'readonly', (store, key) => store.get(key), id);
}

export async function seedCompetitorsIfNeeded() {
    const competitors = await getCompetitors();
    if (competitors.length === 0 && INITIAL_COMPETITORS.length > 0) {
        showNotification('Wypełniam bazę początkowymi zawodnikami...', 'info', 4000);
        
        const promises = INITIAL_COMPETITORS.map(competitor => saveCompetitor(competitor));
        await Promise.all(promises);
        
        showNotification('Baza zawodników została wypełniona danymi początkowymi.', 'success');
    }
}

// === OPERACJE NA KONKURENCJACH ===
export async function getEvents() {
    const events = await dbAction(STORES.EVENTS, 'readonly', store => store.getAll());
    return events.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
}

export async function saveEvent(eventData) {
    const isUpdate = !!eventData.id;
    if (!isUpdate) {
        delete eventData.id;
    }
    
    return await dbAction(STORES.EVENTS, 'readwrite', (store, data) => {
        return isUpdate ? store.put(data) : store.add(data);
    }, eventData);
}

export async function deleteEvent(id) {
    return await dbAction(STORES.EVENTS, 'readwrite', (store, key) => store.delete(key), id);
}

export async function seedEventsIfNeeded() {
    const events = await getEvents();
    if (events.length === 0 && INITIAL_EVENTS.length > 0) {
        showNotification('Wypełniam bazę początkowymi konkurencjami...', 'info', 4000);
        
        const promises = INITIAL_EVENTS.map(event => saveEvent(event));
        await Promise.all(promises);
        
        showNotification('Baza konkurencji została wypełniona danymi początkowymi.', 'success');
    }
}

// === OPERACJE NA PUNKTACH KONTROLNYCH ===
export async function saveCheckpoint(key, data) {
    const record = { key, ...data };
    return await dbAction(STORES.CHECKPOINTS, 'readwrite', (store, record) => store.put(record), record);
}

export async function getCheckpoints() {
    const checkpoints = await dbAction(STORES.CHECKPOINTS, 'readonly', store => store.getAll());
    return checkpoints.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export async function deleteCheckpoint(key) {
    return await dbAction(STORES.CHECKPOINTS, 'readwrite', (store, key) => store.delete(key), key);
}

export async function clearAllCheckpoints() {
    return await dbAction(STORES.CHECKPOINTS, 'readwrite', store => store.clear());
}

// === OPERACJE NA STANIE APLIKACJI ===
export async function saveAppState(stateData) {
    const record = { 
        id: 'currentState', 
        ...stateData,
        timestamp: new Date().toISOString()
    };
    return await dbAction(STORES.APP_STATE, 'readwrite', (store, data) => store.put(data), record);
}

export async function loadAppState() {
    return await dbAction(STORES.APP_STATE, 'readonly', (store, key) => store.get(key), 'currentState');
}

export async function clearAppState() {
    return await dbAction(STORES.APP_STATE, 'readwrite', (store, key) => store.delete(key), 'currentState');
}

// === FUNKCJE POMOCNICZE ===
export function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// === EXPORT/IMPORT FUNKCJE ===
export async function exportCompetitorsToJson() {
    try {
        const competitors = await getCompetitors();
        const dataStr = JSON.stringify(competitors, null, 2);
        downloadJsonFile(dataStr, 'strongman_zawodnicy.json');
        showNotification('Baza zawodników wyeksportowana.', 'success');
    } catch (error) {
        console.error('Błąd eksportu zawodników:', error);
        showNotification('Błąd podczas eksportu zawodników.', 'error');
    }
}

export async function exportEventsToJson() {
    try {
        const events = await getEvents();
        const dataStr = JSON.stringify(events, null, 2);
        downloadJsonFile(dataStr, 'strongman_konkurencje.json');
        showNotification('Baza konkurencji wyeksportowana.', 'success');
    } catch (error) {
        console.error('Błąd eksportu konkurencji:', error);
        showNotification('Błąd podczas eksportu konkurencji.', 'error');
    }
}

export async function importCompetitorsFromJson(importedData) {
    if (!Array.isArray(importedData)) {
        throw new Error("Plik importu musi zawierać tablicę zawodników");
    }
    
    let added = 0, updated = 0;
    const currentCompetitors = await getCompetitors();
    const currentNames = new Map(currentCompetitors.map(c => [c.name.toLowerCase(), c]));
    
    for (const importedComp of importedData) {
        if (!importedComp || !importedComp.name) continue;
        
        const existingComp = currentNames.get(importedComp.name.toLowerCase());
        delete importedComp.id;
        
        if (existingComp) {
            await saveCompetitor({ ...existingComp, ...importedComp });
            updated++;
        } else {
            await saveCompetitor(importedComp);
            added++;
        }
    }
    
    return { added, updated };
}

export async function importEventsFromJson(importedData) {
    if (!Array.isArray(importedData)) {
        throw new Error("Plik importu musi zawierać tablicę konkurencji");
    }
    
    let added = 0, updated = 0;
    const currentEvents = await getEvents();
    const currentNames = new Map(currentEvents.map(e => [e.name.toLowerCase(), e]));
    
    for (const importedEvent of importedData) {
        if (!importedEvent?.name || !importedEvent?.type) continue;
        
        const existingEvent = currentNames.get(importedEvent.name.toLowerCase());
        delete importedEvent.id;
        
        if (existingEvent) {
            await saveEvent({ ...existingEvent, ...importedEvent });
            updated++;
        } else {
            await saveEvent(importedEvent);
            added++;
        }
    }
    
    return { added, updated };
}

// === FUNKCJA POMOCNICZA DO POBIERANIA PLIKÓW ===
function downloadJsonFile(dataStr, filename) {
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// === ZARZĄDZANIE BAZĄ DANYCH ===
export async function getDatabaseInfo() {
    if (!db) return null;
    
    const info = {
        name: db.name,
        version: db.version,
        stores: []
    };
    
    for (const storeName of db.objectStoreNames) {
        const count = await dbAction(storeName, 'readonly', store => store.count());
        info.stores.push({
            name: storeName,
            count: count
        });
    }
    
    return info;
}

export async function clearAllData() {
    const promises = [
        clearAllCheckpoints(),
        clearAppState(),
        dbAction(STORES.COMPETITORS, 'readwrite', store => store.clear()),
        dbAction(STORES.EVENTS, 'readwrite', store => store.clear())
    ];
    
    await Promise.all(promises);
    showNotification('Wszystkie dane zostały usunięte z bazy danych.', 'success');
}
