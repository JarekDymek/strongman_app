// Plik: js/main.js
// Cel: Główny plik aplikacji z systemem zakładek - BEZ problematycznego import { pruneStoreIfNeeded, STORES } from './database.js';
import * as UI from './ui.js';
import * as State from './state.js';
import * as History from './history.js';
import * as Persistence from './persistence.js';
import * as Handlers from './handlers.js';
import * as Stopwatch from './stopwatch.js';
import * as FocusMode from './focusMode.js';
import * as CompetitorDB from './db.js';
import * as EventsDB from './eventsDb.js';
import * as CheckpointsDB from './checkpointsDb.js';

let currentTab = 'title';

/**
 * Przełącza między zakładkami
 */
function switchTab(tabName) {
    // Aktualizuj przyciski nawigacyjne
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Pokaż odpowiedni panel
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('visible', panel.id === `tab-${tabName}`);
    });
    
    // KRYTYCZNA POPRAWKA: Zawsze odśwież zawartość po zmianie zakładki
    if (tabName === 'competition') {
        UI.renderStartList(State.getActiveCompetitors()); // zawsze pobiera z state
        console.log('Zakładka Zawody odświeżona z:', State.getActiveCompetitors());
    }

    currentTab = tabName;
    State.state.currentTab = tabName;
    Persistence.triggerAutoSave();
    refreshTabContent(tabName);
}

/**
 * Odświeża zawartość konkretnej zakładki
 */
function refreshTabContent(tabName) {
    switch(tabName) {
        case 'title':
            // Odśwież dane meta
            UI.setLogoUI(State.getLogo());
            UI.DOMElements.eventNameInput.value = State.state.eventName || '';
            UI.DOMElements.eventLocationInput.value = State.state.eventLocation || '';
            if (State.state.eventDate) {
                UI.DOMElements.eventDateInput.value = State.state.eventDate;
            }
            break;
            
        case 'select':
            // Odśwież listy zawodników i konkurencji
            UI.renderCompetitorSelectionUI(State.getAllDbCompetitors());
            UI.renderEventList(State.getAllDbEvents());
            updateSelectionUI();
            break;
            
        case 'competition':
            // Odśwież listę startową
            UI.renderStartList(State.getActiveCompetitors());
            updateStartButton();
            break;
            
        case 'results':
            // Odśwież tabelę wyników
            if (State.getActiveCompetitors().length > 0) {
                UI.updateEventTitle(State.getEventNumber(), State.state.eventTitle);
                UI.updateEventTypeButtons(State.getEventType());
                UI.renderTable();
                restoreResultInputs();
            }
            break;
            
        case 'summary':
            // Odśwież podsumowanie
            if (State.getEventHistory().length > 0) {
                UI.renderFinalSummary();
            }
            break;
    }
}

/**
 * Aktualizuje licznik wybranych zawodników
 */
function updateSelectionUI() {
    const selectedCount = document.querySelectorAll('#competitorSelectionList input[type="checkbox"]:checked').length;
    UI.updateSelectionCounter(selectedCount);
}

/**
 * Aktualizuje stan przycisku startu zawodów
 */
function updateStartButton() {
    const selectedCount = document.querySelectorAll('#competitorSelectionList input[type="checkbox"]:checked').length;
    const startBtn = document.getElementById('startCompetitionBtn');
    if (startBtn) {
        startBtn.disabled = selectedCount < 2;
    }
}

/**
 * Przywraca wartości w polach wyników
 */
function restoreResultInputs() {
    const currentState = State.getState();
    const resultInputs = document.querySelectorAll('#resultsTable .resultInput');
    
    resultInputs.forEach(input => {
        const competitorName = input.dataset.name;
        const event = currentState.eventHistory.find(e => e.nr === currentState.eventNumber);
        if (event) {
            const result = event.results.find(r => r.name === competitorName);
            if (result) {
                input.value = result.result;
            }
        }
    });
    
    // Sprawdź czy wyniki są zablokowane
    const lastEvent = currentState.eventHistory[currentState.eventHistory.length - 1];
    if (lastEvent && lastEvent.nr === currentState.eventNumber) {
        UI.updateTableWithEventData(lastEvent.results);
        UI.lockResultInputs();
    }
}

/**
 * Odświeża całkowicie interfejs użytkownika
 */
function refreshFullUI() {
    // Sprawdź czy są wybrani zawodnicy (czyli czy zawody są w toku)
    if (State.getActiveCompetitors().length > 0) {
        // Jeśli zawody trwają, przejdź do zakładki wyników
        if (currentTab === 'title' || currentTab === 'select' || currentTab === 'competition') {
            switchTab('results');
        } else {
            refreshTabContent(currentTab);
        }
    } else {
        // Jeśli zawody nie rozpoczęte, zostań w aktualnej zakładce lub przejdź do selekcji
        if (currentTab === 'results' || currentTab === 'summary') {
            switchTab('select');
        } else {
            refreshTabContent(currentTab);
        }
    }
}

/**
 * NAPRAWIONA FUNKCJA: Pokazuje panel historii wyników
 */
function showHistoryPanel() {
    const historyPanel = UI.DOMElements.historyPanel;
    if (!historyPanel) return;
    
    const history = State.getEventHistory();
    renderHistoryPanel(history);
    historyPanel.style.display = 'block';
}

/**
 * NAPRAWIONA FUNKCJA: Zamyka panel historii
 */
function hideHistoryPanel() {
    const historyPanel = UI.DOMElements.historyPanel;
    if (historyPanel) {
        historyPanel.style.display = 'none';
    }
}

/**
 * NAPRAWIONA FUNKCJA: Renderuje panel historii
 */
function renderHistoryPanel(history) {
    const eventList = UI.DOMElements.eventList;
    const eventDetails = UI.DOMElements.eventDetails;
    
    if (history.length === 0) {
        eventList.innerHTML = `
            <div class="history-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #ddd;">
                <h3 style="margin: 0;">Historia wyników</h3>
                <button id="closeHistoryBtn" class="close-btn" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">✕ Zamknij</button>
            </div>
            <p>Brak zakończonych konkurencji do edycji.</p>
        `;
        eventDetails.innerHTML = '';
    } else {
        eventList.innerHTML = `
            <div class="history-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #ddd;">
                <h3 style="margin: 0;">Historia wyników</h3>
                <button id="closeHistoryBtn" class="close-btn" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">✕ Zamknij</button>
            </div>
            <div class="event-list">
                ${history.map(event => `
                    <button class="event-btn" data-event-id="${event.nr}" style="
                        display: block; 
                        width: 100%; 
                        padding: 12px; 
                        margin-bottom: 8px; 
                        border: 1px solid #ddd; 
                        border-radius: 4px; 
                        background: #f9f9f9; 
                        cursor: pointer; 
                        text-align: left;
                        transition: background 0.2s;
                        font-weight: bold;
                    ">
                        <strong>Konkurencja ${event.nr}: ${event.name}</strong>
                        <br><small style="color: #666;">${event.type === 'high' ? 'Więcej = Lepiej' : 'Mniej = Lepiej'}</small>
                    </button>
                `).join('')}
            </div>
        `;
        eventDetails.innerHTML = '<p>Wybierz konkurencję z listy aby edytować wyniki.</p>';
    }
}

/**
 * NAPRAWIONA FUNKCJA: Renderuje konkurencję do edycji
 */
function renderEventForEditing(eventId) {
    const history = State.getEventHistory();
    const eventToEdit = history.find(e => e.nr === eventId);
    
    if (!eventToEdit) return;
    
    const eventDetails = UI.DOMElements.eventDetails;
    eventDetails.innerHTML = `
        <div class="edit-event-header" style="margin-bottom: 20px; padding: 15px; background: #f0f0f0; border-radius: 4px;">
            <h4 style="margin: 0 0 5px 0; font-weight: bold;">Edytuj konkurencję ${eventId}: ${eventToEdit.name}</h4>
            <p style="margin: 0; color: #666;">Typ: ${eventToEdit.type === 'high' ? 'Więcej = Lepiej' : 'Mniej = Lepiej'}</p>
        </div>
        <div class="edit-results">
            <table class="edit-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background: #e0e0e0;">
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left; font-weight: bold;">Zawodnik</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">Wynik</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">Miejsce</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold;">Punkty</th>
                    </tr>
                </thead>
                <tbody>
                    ${eventToEdit.results.map(result => `
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${result.name}</td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                                <input type="text" 
                                       class="edit-result-input" 
                                       data-name="${result.name}" 
                                       value="${result.result || ''}"
                                       placeholder="Nowy wynik"
                                       style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 3px; text-align: center; font-size: 14px;">
                            </td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #666;">${result.place || '-'}</td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #666;">${result.points || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="edit-actions" style="display: flex; gap: 15px; justify-content: center;">
                <button id="saveAndRecalculateBtn" data-event-id="${eventId}" class="primary-btn" style="
                    background: #27ae60; 
                    color: white; 
                    border: none; 
                    padding: 15px 25px; 
                    border-radius: 4px; 
                    cursor: pointer; 
                    font-weight: bold;
                    font-size: 16px;
                    min-width: 200px;
                ">
                    💾 Zapisz i przelicz punkty
                </button>
                <button id="cancelEditBtn" class="secondary-btn" style="
                    background: #95a5a6; 
                    color: white; 
                    border: none; 
                    padding: 15px 25px; 
                    border-radius: 4px; 
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 16px;
                    min-width: 120px;
                ">
                    ❌ Anuluj
                </button>
            </div>
        </div>
    `;
}

/**
 * NAPRAWIONA FUNKCJA: Obsługuje kliknięcia w panelu historii
 */
async function handleHistoryPanelClick(e) {
    if (e.target.id === 'closeHistoryBtn') {
        hideHistoryPanel();
        return;
    }
    
    if (e.target.classList.contains('event-btn') || e.target.closest('.event-btn')) {
        const btn = e.target.classList.contains('event-btn') ? e.target : e.target.closest('.event-btn');
        const eventId = parseInt(btn.dataset.eventId);
        renderEventForEditing(eventId);
        return;
    }
    
    if (e.target.id === 'saveAndRecalculateBtn') {
        const eventId = parseInt(e.target.dataset.eventId);
        const inputs = document.querySelectorAll('.edit-result-input');
        
        const newResults = Array.from(inputs).map(input => ({
            name: input.dataset.name,
            result: input.value.trim()
        }));
        
        if (await UI.showConfirmation('Czy na pewno chcesz zapisać zmiany i przelieczyć punkty? Ta operacja wpłynie na całkowitą klasyfikację.')) {
            const success = await Persistence.recalculateAfterEdit(eventId, newResults);
            if (success) {
                hideHistoryPanel();
                refreshFullUI();
                UI.showNotification('Wyniki zostały zaktualizowane i przeliczone!', 'success');
            }
        }
        return;
    }
    
    if (e.target.id === 'cancelEditBtn') {
        const eventDetails = UI.DOMElements.eventDetails;
        eventDetails.innerHTML = '<p>Wybierz konkurencję z listy aby edytować wyniki.</p>';
        return;
    }
}

/**
 * Rejestruje wszystkie event listenery
 */
function setupEventListeners() {
    // === NAVIGATION ===
    document.getElementById('tabNav').addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (btn && btn.dataset.tab) {
            switchTab(btn.dataset.tab);
        }
    });
    
    // === STOPWATCH & FOCUS MODE ===
    Stopwatch.setupStopwatchEventListeners();
    FocusMode.setupFocusModeEventListeners();
    
    // === THEME ===
    document.getElementById('themeSelector').addEventListener('change', Handlers.handleThemeChange);
    
    // === TITLE TAB ===
    document.getElementById('selectLogoBtn').addEventListener('click', () => {
        document.getElementById('logoUpload').click();
    });
    document.getElementById('logoUpload').addEventListener('change', Handlers.handleLogoUpload);
    document.getElementById('logoImg').addEventListener('dblclick', Handlers.handleRemoveLogo);
    
    // Auto-save meta data
    document.getElementById('eventNameInput').addEventListener('input', (e) => {
        State.state.eventName = e.target.value;
        History.saveToUndoHistory(State.getState());
        Persistence.triggerAutoSave();
    });
    
    document.getElementById('eventLocationInput').addEventListener('input', (e) => {
        State.state.eventLocation = e.target.value;
        History.saveToUndoHistory(State.getState());
        Persistence.triggerAutoSave();
    });
    
    document.getElementById('eventDateInput').addEventListener('change', (e) => {
        State.state.eventDate = e.target.value;
        History.saveToUndoHistory(State.getState());
        Persistence.triggerAutoSave();
    });
    
    // === SELECT TAB ===
    document.getElementById('categoryFilters').addEventListener('click', Handlers.handleFilterChange);
    document.getElementById('competitorSelectionList').addEventListener('change', (e) => {
        Handlers.handleSelectionChange();
        updateStartButton();
    });
    
    // Database management
    document.getElementById('manageDbBtn').addEventListener('click', Handlers.handleManageCompetitors);
    document.getElementById('exportDbBtn').addEventListener('click', CompetitorDB.exportCompetitorsToJson);
    document.getElementById('importDbTrigger').addEventListener('click', () => {
        document.getElementById('importDbFile').click();
    });
    document.getElementById('importDbFile').addEventListener('change', (e) => {
        Handlers.handleDbFileImport(e.target.files[0]);
        e.target.value = null;
    });
    
    document.getElementById('manageEventsDbBtn').addEventListener('click', Handlers.handleManageEvents);
    document.getElementById('exportEventsDbBtn').addEventListener('click', EventsDB.exportEventsToJson);
    document.getElementById('importEventsDbTrigger').addEventListener('click', () => {
        document.getElementById('importEventsDbFile').click();
    });
    document.getElementById('importEventsDbFile').addEventListener('change', (e) => {
        Handlers.handleEventsDbFileImport(e.target.files[0]);
        e.target.value = null;
    });
    
    // === COMPETITION TAB ===
    document.getElementById('shuffleBtn').addEventListener('click', () => {
        if (Handlers.handleShuffle()) {
            refreshTabContent('competition');
        }
    });
    
    document.getElementById('startCompetitionBtn').addEventListener('click', () => {
        if (Handlers.handleStartCompetition()) {
            refreshTabContent('results'); // nie nadpisuj state.competitors
        }
    });
    
    // === RESULTS TAB ===
    document.getElementById('eventTitle').addEventListener('input', (e) => {
        State.state.eventTitle = e.target.textContent;
        History.saveToUndoHistory(State.getState());
        Persistence.triggerAutoSave();
    });
    
    document.getElementById('highTypeBtn').addEventListener('click', () => {
        Handlers.handleEventTypeChange('high');
    });
    document.getElementById('lowTypeBtn').addEventListener('click', () => {
        Handlers.handleEventTypeChange('low');
    });
    
    document.getElementById('calculatePointsBtn').addEventListener('click', () => {
        Handlers.handleCalculatePoints();
    });
    
    document.getElementById('nextEventBtn').addEventListener('click', async () => {
        if (await Handlers.handleNextEvent()) {
            refreshTabContent('results');
        }
    });
    
    document.getElementById('finalEventBtn').addEventListener('click', async () => {
        if (await Handlers.handleFinalEvent()) {
            refreshTabContent('results');
        }
    });
    
    // Table interactions
    document.getElementById('resultsTable').addEventListener('click', (e) => {
        const target = e.target;
        const action = target.dataset.action;
        const competitorName = target.closest('tr')?.dataset.name;
        
        if (target.closest('.tie-info')) {
            target.closest('.tie-info').classList.toggle('tooltip-active');
        } else if (action === 'showDetails' && competitorName) {
            UI.showCompetitorDetails(State.getCompetitorProfile(competitorName));
        } else if (action === 'openStopwatch' && competitorName) {
            Stopwatch.enterStopwatch(competitorName, Handlers.handleStopwatchSave);
        } else if (target.classList.contains('resultInput') && !target.readOnly) {
            FocusMode.handleEnterFocusMode(target.dataset.name);
        }
    });
    
    // Auto-save on result input change
    document.getElementById('resultsTable').addEventListener('change', (e) => {
        if (e.target.classList.contains('resultInput')) {
            History.saveToUndoHistory(State.getState());
            Persistence.triggerAutoSave();
            
            // Visual feedback
            e.target.classList.add('highlight-flash-input');
            setTimeout(() => {
                e.target.classList.remove('highlight-flash-input');
            }, 1000);
        }
    });
    
    // Secondary controls
    document.getElementById('showResultsBtn').addEventListener('click', showHistoryPanel); // NAPRAWIONE
    document.getElementById('selectEventFromDbBtn').addEventListener('click', Handlers.handleSelectEventFromDb);
    document.getElementById('toggleTableWidthBtn').addEventListener('click', (e) => {
        const wrapper = document.querySelector('.table-wrapper');
        wrapper.classList.toggle('expanded');
        e.target.textContent = wrapper.classList.contains('expanded') ? 
            '↔️ Zwiń tabelę' : '↔️ Rozwiń tabelę';
    });
    
    // Undo/Redo
    document.getElementById('undoBtn').addEventListener('click', () => {
        if (Handlers.handleUndo()) {
            refreshTabContent(currentTab);
        }
    });
    document.getElementById('redoBtn').addEventListener('click', () => {
        if (Handlers.handleRedo()) {
            refreshTabContent(currentTab);
        }
    });
    
    // === SUMMARY TAB ===
    document.getElementById('exportHtmlBtn').addEventListener('click', Handlers.handleExportHtml);
    document.getElementById('saveCheckpointBtn').addEventListener('click', Persistence.saveCheckpoint);
    document.getElementById('showCheckpointsBtn').addEventListener('click', () => {
        Persistence.handleShowCheckpoints();
    });
    
    document.getElementById('exportStateBtn_main').addEventListener('click', () => {
        Persistence.exportStateToFile();
    });
    document.getElementById('importStateBtn_main').addEventListener('click', () => {
        document.getElementById('importFile_main').click();
    });
    document.getElementById('importFile_main').addEventListener('change', async (e) => {
        if (await Handlers.handleImportState(e.target.files[0])) {
            refreshFullUI();
        }
        e.target.value = null;
    });
    
    // === MODALS ===
    document.getElementById('closeDbPanelBtn').addEventListener('click', () => {
        document.getElementById('competitorDbPanel').classList.remove('visible');
    });
    document.getElementById('closeEventDbPanelBtn').addEventListener('click', () => {
        document.getElementById('eventDbPanel').classList.remove('visible');
    });
    document.getElementById('competitorDetailCloseBtn').addEventListener('click', () => {
        document.getElementById('competitorDetailModal').classList.remove('visible');
    });
    document.getElementById('selectEventCancelBtn').addEventListener('click', () => {
        document.getElementById('selectEventModal').classList.remove('visible');
    });
    document.getElementById('geminiCloseBtn').addEventListener('click', () => {
        document.getElementById('geminiModal').classList.remove('visible');
    });
    
    // Forms
    document.getElementById('competitorForm').addEventListener('submit', Handlers.handleCompetitorFormSubmit);
    document.getElementById('competitorListContainer').addEventListener('click', Handlers.handleCompetitorListAction);
    document.getElementById('eventForm').addEventListener('submit', Handlers.handleEventFormSubmit);
    document.getElementById('eventListContainer').addEventListener('click', Handlers.handleEventListAction);
    document.getElementById('selectEventList').addEventListener('click', Handlers.handleEventSelection);
    
    // History panel - NAPRAWIONE
    document.getElementById('historyPanel').addEventListener('click', handleHistoryPanelClick);
    
    // Checkpoint list
    document.getElementById('checkpointList').addEventListener('click', (e) => {
        Persistence.handleCheckpointListActions(e, refreshFullUI);
    });
    
    // AI Assistant
    document.getElementById('generateAnnounceBtn').addEventListener('click', Handlers.handleGenerateAnnouncement);
}

/**
 * Główna funkcja inicjalizacyjna
 */
async function initializeApp() {
    try {
        // Inicjalizacja modułów
        UI.initUI();
        Stopwatch.initStopwatch();
        
        // Inicjalizacja baz danych
        await CompetitorDB.initDB();
        await EventsDB.initEventsDB();
        await CheckpointsDB.initCheckpointsDB();
        
        // Wypełnienie baz danych początkowymi danymi
        await CompetitorDB.seedCompetitorsDatabaseIfNeeded();
        await EventsDB.seedEventsDatabaseIfNeeded();
        
        // Rejestracja event listenerów
        setupEventListeners();
        
        // Załadowanie motywu
        const savedTheme = Persistence.loadTheme();
        document.body.className = savedTheme;
        UI.DOMElements.themeSelector.value = savedTheme;
        
        // Próba przywrócenia sesji
        const loadedFromAutoSave = await Persistence.loadStateFromAutoSave();
        if (loadedFromAutoSave) {
            // Przywróć zakładkę z zapisanego stanu
            currentTab = State.state.currentTab || 'title';
            switchTab(currentTab);
        } else {
            // Załaduj początkowe dane
            await Handlers.loadAndRenderInitialData();
            State.state.eventName = UI.DOMElements.eventNameInput.value;
            
            // Rozpocznij od strony tytułowej
            switchTab('title');
        }
        
        // Wyczyść historię i zapisz początkowy stan
        History.clearHistory();
        History.saveToUndoHistory(State.getState());
        
        // Udostępnij funkcję refreshFullUI globalnie
        window.refreshFullUI = refreshFullUI;
        
        UI.showNotification("Aplikacja gotowa!", "success", 2000);
        
    } catch (error) {
        console.error("Błąd inicjalizacji aplikacji:", error);
        UI.showNotification("Wystąpił błąd podczas uruchamiania aplikacji. Spróbuj odświeżyć stronę.", "error", 10000);
    }
}

// Uruchomienie aplikacji
document.addEventListener('DOMContentLoaded', initializeApp);

// Export funkcji dla innych modułów
export { refreshFullUI, switchTab, currentTab };




// Cleanup on pagehide (works on mobile: iPad, Android) - flush autosave and stop background timers
function _app_pagehide_handler(evt) {
  try {
    // flush autosave if persistence module exposes saveNow
    if (window.persistence && typeof window.persistence.saveNow === 'function') {
      window.persistence.saveNow();
    }
  } catch(e){}
  try {
    // if stopwatch module exposes exitStopwatch, call it to ensure timers are cleared
    if (window.stopwatch && typeof window.stopwatch.exitStopwatch === 'function') {
      window.stopwatch.exitStopwatch();
    }
  } catch(e){}
  // remove this handler after run
  window.removeEventListener('pagehide', _app_pagehide_handler);
}
window.addEventListener('pagehide', _app_pagehide_handler, {capture: false});



// --- Automatic DB pruning on startup (conservative) ---
(async function __auto_prune_on_startup() {
  try {
    // small delay to let DB open/initialize elsewhere
    await new Promise(r => setTimeout(r, 800));
    // prune events and checkpoints to safe limits
    if (typeof pruneStoreIfNeeded === 'function') {
      await pruneStoreIfNeeded(STORES.EVENTS, 5000);
      await pruneStoreIfNeeded(STORES.CHECKPOINTS, 2000);
      console.info('Auto-prune completed');
    }
  } catch(e) {
    console.warn('Auto-prune error', e);
  }
})();
