// Plik: js/handlers.js
// Cel: Obsługa zdarzeń z poprawionym eksportem HTML i zakładkami

import * as State       from './state.js';
import * as UI          from './ui.js';
import * as History     from './history.js';
import * as Persistence from './persistence.js';
import * as Competition from './competition.js';
import * as CompetitorDB from './db.js';
import * as EventsDB from './eventsDb.js';

// === GENERAL UI & META ===

export function handleThemeChange(event) {
    const theme = event.target.value;
    document.body.className = theme;
    Persistence.saveTheme(theme);
    UI.showNotification(`Zmieniono motyw na: ${theme}`, "success", 2000);
}

export function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        UI.showNotification("Plik logo jest za duży (max 2MB).", "error");
        return;
    }

    CompetitorDB.toBase64(file).then(base64 => {
        State.setLogo(base64);
        UI.setLogoUI(base64);
        History.saveToUndoHistory(State.getState());
        Persistence.triggerAutoSave();
        UI.showNotification("Logo zostało wczytane.", "success");
    }).catch(() => {
        UI.showNotification("Błąd podczas wczytywania logo.", "error");
    });
}

export function handleRemoveLogo() {
    State.setLogo(null);
    UI.setLogoUI(null);
    History.saveToUndoHistory(State.getState());
    Persistence.triggerAutoSave();
    UI.showNotification("Logo zostało usunięte.", "success");
}

// === INTRO SCREEN ===

export function handleStartCompetition() {
  if (State.getActiveCompetitors().length < 2) {
    UI.showNotification('Wybierz co najmniej 2 zawodników.', 'warning');
    return false;
  }
  State.initializeScores();                // reset punktów
  State.state.eventNumber  = 1;
  State.state.eventHistory = [];
  State.state.eventTitle   = 'Konkurencja 1';

  History.saveToUndoHistory(State.getState());
  Persistence.triggerAutoSave();
  UI.switchView('main');                   // przejście do zakładki Wyniki
  UI.showNotification('Zawody rozpoczęte!', 'success');
  return true;
}

export function handleFilterChange(event) {
    if (!event.target.classList.contains('filter-btn')) return;
    
    const filter = event.target.dataset.filter;
    UI.filterCompetitorSelectionList(filter);
}

export function handleSelectionChange() {
  const checked = [
    ...document.querySelectorAll('#competitorSelectionList input:checked')
  ].map(ch => ch.value);

  State.updateSelectedCompetitors(checked);
  UI.updateSelectionCounter(checked.length);

  History.saveToUndoHistory(State.getState());
  Persistence.triggerAutoSave();
}

// === MAIN SCREEN ACTIONS ===

export function handleShuffle() {
  if (State.getActiveCompetitors().length < 2) {
    UI.showNotification('Musisz mieć co najmniej 2 zawodników.', 'warning');
    return false;
  }
  State.shuffleCompetitors();
  UI.renderStartList(State.getActiveCompetitors());

  History.saveToUndoHistory(State.getState());
  Persistence.triggerAutoSave();
  UI.showNotification('Wylosowano kolejność!', 'success');
  return true;
}

export function handleCalculatePoints() {
    const resultInputs = document.querySelectorAll('#resultsTable .resultInput');
    const currentResults = [];
    
    resultInputs.forEach(input => {
        const name = input.dataset.name;
        const result = input.value.trim();
        currentResults.push({ name, result });
    });

    if (currentResults.every(r => !r.result)) {
        UI.showNotification("Wprowadź przynajmniej jeden wynik.", "error");
        return false;
    }

    const eventType = State.getEventType();
    const totalCompetitors = State.getActiveCompetitors().length;
    
    const { results, error } = Competition.calculateEventPoints(currentResults, totalCompetitors, eventType);
    
    if (error) {
        UI.showNotification("Błąd: Nieprawidłowe wyniki. Sprawdź wprowadzone dane.", "error");
        return false;
    }

    UI.updateTableWithEventData(results);
    UI.lockResultInputs();
    
    const eventData = {
        nr: State.getEventNumber(),
        name: UI.DOMElements.eventTitle.textContent,
        type: eventType,
        results: results
    };
    
    State.addEventToHistory(eventData);
    History.saveToUndoHistory(State.getState());
    Persistence.triggerAutoSave();
    
    UI.showNotification("Punkty zostały obliczone!", "success");
    return true;
}

export async function handleNextEvent() {
    const inputs = document.querySelectorAll('#resultsTable .resultInput:not([readonly])');
    if (inputs.length > 0 && !await UI.showConfirmation("Nie obliczono punktów dla bieżącej konkurencji. Czy na pewno chcesz przejść do następnej?")) {
        return false;
    }

    State.nextEvent();
    UI.unlockResultInputs();
    
    // Wyczyść pola wyników
    document.querySelectorAll('#resultsTable .resultInput').forEach(input => {
        input.value = '';
    });
    
    // Wyczyść miejsca i punkty
    document.querySelectorAll('#resultsTable .place-cell').forEach(cell => {
        cell.textContent = '-';
    });
    
    document.querySelectorAll('#resultsTable .points-cell').forEach(cell => {
        cell.textContent = '-';
    });

    History.saveToUndoHistory(State.getState());
    Persistence.triggerAutoSave();
    
    UI.showNotification(`Rozpoczęto konkurencję ${State.getEventNumber()}`, "success");
    return true;
}

export async function handleFinalEvent() {
    if (await Competition.setupFinalEvent(Competition.breakTie)) {
        History.saveToUndoHistory(State.getState());
        Persistence.triggerAutoSave();
        UI.showNotification("Ustawiono finał!", "success");
        return true;
    }
    return false;
}

export function handleEventTypeChange(newType) {
    State.setEventType(newType);
    UI.updateEventTypeButtons(newType);
    History.saveToUndoHistory(State.getState());
    Persistence.triggerAutoSave();
    
    const typeText = newType === 'high' ? 'Więcej = Lepiej' : 'Mniej = Lepiej';
    UI.showNotification(`Zmieniono typ na: ${typeText}`, "success");
}

// === HISTORY & EDITING ===

export function handleUndo() {
    const previousState = History.undo(State.getState());
    if (previousState) {
        State.restoreState(previousState);
        Persistence.triggerAutoSave();
        UI.showNotification("Cofnięto ostatnią akcję.", "success");
        return true;
    }
    return false;
}

export function handleRedo() {
    const nextState = History.redo(State.getState());
    if (nextState) {
        State.restoreState(nextState);
        Persistence.triggerAutoSave();
        UI.showNotification("Ponowiono akcję.", "success");
        return true;
    }
    return false;
}

export function handleSaveAndRecalculate(eventId) {
    const inputs = document.querySelectorAll('#eventDetails input');
    const newResults = [];
    
    inputs.forEach(input => {
        const name = input.dataset.name;
        const result = input.value.trim();
        newResults.push({ name, result });
    });

    State.updateEventResults(eventId, newResults);
    State.recalculateAllPoints(Competition.calculateEventPoints);
    
    History.saveToUndoHistory(State.getState());
    Persistence.triggerAutoSave();
    
    UI.showNotification("Wyniki zostały przeliczone!", "success");
    return true;
}

// === DATABASES & MODALS ===

export async function handleManageCompetitors() {
    const competitors = await CompetitorDB.getCompetitors();
    renderCompetitorList(competitors);
    document.getElementById('competitorDbPanel').classList.add('visible');
}

function renderCompetitorList(competitors) {
    const container = UI.DOMElements.competitorListContainer;
    if (competitors.length === 0) {
        container.innerHTML = '<p>Baza zawodników jest pusta.</p>';
        return;
    }

    container.innerHTML = competitors.map(c => `
        <div class="competitor-item">
            <img src="${c.photo || 'https://placehold.co/40x40/eee/333?text=?'}" alt="${c.name}" class="competitor-avatar">
            <div class="competitor-info">
                <strong>${c.name}</strong>
                ${c.categories && c.categories.length ? `<br><small>${c.categories.join(', ')}</small>` : ''}
            </div>
            <div class="competitor-actions">
                <button data-action="edit" data-id="${c.id}" class="edit-btn">✏️</button>
                <button data-action="delete" data-id="${c.id}" class="delete-btn">🗑️</button>
            </div>
        </div>
    `).join('');
}

export async function handleCompetitorFormSubmit(event) {
    event.preventDefault();
    
    const formData = {
        id: UI.DOMElements.competitorId.value || undefined,
        name: UI.DOMElements.competitorNameInput.value.trim(),
        birthDate: UI.DOMElements.birthDateInput.value,
        residence: UI.DOMElements.residenceInput.value.trim(),
        height: UI.DOMElements.heightInput.value ? parseInt(UI.DOMElements.heightInput.value) : null,
        weight: UI.DOMElements.weightInput.value ? parseInt(UI.DOMElements.weightInput.value) : null,
        categories: UI.DOMElements.competitorCategories.value.split(',').map(c => c.trim()).filter(c => c),
        notes: UI.DOMElements.competitorNotesInput.value.trim()
    };

    if (!formData.name) {
        UI.showNotification("Imię i nazwisko są wymagane.", "error");
        return;
    }

    try {
        await CompetitorDB.saveCompetitor(formData);
        
        // Odśwież listę
        const competitors = await CompetitorDB.getCompetitors();
        renderCompetitorList(competitors);
        
        // Wyczyść formularz
        document.getElementById('competitorForm').reset();
        UI.DOMElements.competitorId.value = '';
        
        const action = formData.id ? 'zaktualizowano' : 'dodano';
        UI.showNotification(`Zawodnika ${action} pomyślnie.`, "success");
        
        // Odśwież dane w state dla selekcji
        await loadAndRenderInitialData();
        
    } catch (error) {
        console.error('Błąd zapisu zawodnika:', error);
        UI.showNotification("Błąd podczas zapisywania zawodnika.", "error");
    }
}

export async function handleCompetitorListAction(event) {
    const action = event.target.dataset.action;
    const id = parseInt(event.target.dataset.id);
    
    if (action === 'edit') {
        try {
            const competitor = await CompetitorDB.getCompetitorById(id);
            if (competitor) {
                UI.DOMElements.competitorId.value = competitor.id;
                UI.DOMElements.competitorNameInput.value = competitor.name;
                UI.DOMElements.birthDateInput.value = competitor.birthDate || '';
                UI.DOMElements.residenceInput.value = competitor.residence || '';
                UI.DOMElements.heightInput.value = competitor.height || '';
                UI.DOMElements.weightInput.value = competitor.weight || '';
                UI.DOMElements.competitorCategories.value = (competitor.categories || []).join(', ');
                UI.DOMElements.competitorNotesInput.value = competitor.notes || '';
            }
        } catch (error) {
            UI.showNotification("Błąd podczas ładowania danych zawodnika.", "error");
        }
    } else if (action === 'delete') {
        if (await UI.showConfirmation("Czy na pewno chcesz usunąć tego zawodnika?")) {
            try {
                await CompetitorDB.deleteCompetitor(id);
                const competitors = await CompetitorDB.getCompetitors();
                renderCompetitorList(competitors);
                UI.showNotification("Zawodnik został usunięty.", "success");
                
                // Odśwież dane w state
                await loadAndRenderInitialData();
            } catch (error) {
                UI.showNotification("Błąd podczas usuwania zawodnika.", "error");
            }
        }
    }
}

export async function handleDbFileImport(file) {
    if (!file) return;
    
    try {
        const text = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
        
        const importedData = JSON.parse(text);
        const { added, updated } = await CompetitorDB.importCompetitorsFromJson(importedData);
        
        UI.showNotification(`Import zakończony. Dodano: ${added}, zaktualizowano: ${updated}`, "success");
        
        // Odśwież listę i dane
        const competitors = await CompetitorDB.getCompetitors();
        renderCompetitorList(competitors);
        await loadAndRenderInitialData();
        
    } catch (error) {
        console.error('Błąd importu:', error);
        UI.showNotification(`Błąd importu: ${error.message}`, "error");
    }
}

// === EVENTS DATABASE ===

export async function handleManageEvents() {
    const events = await EventsDB.getEvents();
    renderEventList(events);
    document.getElementById('eventDbPanel').classList.add('visible');
}

function renderEventList(events) {
    const container = UI.DOMElements.eventListContainer;
    if (events.length === 0) {
        container.innerHTML = '<p>Baza konkurencji jest pusta.</p>';
        return;
    }

    container.innerHTML = events.map(e => `
        <div class="event-item">
            <div class="event-info">
                <strong>${e.name}</strong>
                <br><small>${e.type === 'high' ? '🔼 Więcej = Lepiej' : '🔽 Mniej = Lepiej'}</small>
            </div>
            <div class="event-actions">
                <button data-action="edit" data-id="${e.id}" class="edit-btn">✏️</button>
                <button data-action="delete" data-id="${e.id}" class="delete-btn">🗑️</button>
            </div>
        </div>
    `).join('');
}

export async function handleEventFormSubmit(event) {
    event.preventDefault();
    
    const formData = {
        id: UI.DOMElements.eventId.value || undefined,
        name: UI.DOMElements.eventNameDbInput.value.trim(),
        type: UI.DOMElements.eventTypeDbInput.value
    };

    if (!formData.name || !formData.type) {
        UI.showNotification("Wszystkie pola są wymagane.", "error");
        return;
    }

    try {
        await EventsDB.saveEvent(formData);
        
        // Odśwież listę
        const events = await EventsDB.getEvents();
        renderEventList(events);
        
        // Wyczyść formularz
        document.getElementById('eventForm').reset();
        UI.DOMElements.eventId.value = '';
        
        const action = formData.id ? 'zaktualizowano' : 'dodano';
        UI.showNotification(`Konkurencję ${action} pomyślnie.`, "success");
        
        // Odśwież dane w state
        State.setAllDbEvents(events);
        
    } catch (error) {
        console.error('Błąd zapisu konkurencji:', error);
        UI.showNotification("Błąd podczas zapisywania konkurencji.", "error");
    }
}

export async function handleEventListAction(event) {
    const action = event.target.dataset.action;
    const id = parseInt(event.target.dataset.id);
    
    if (action === 'edit') {
        try {
            const events = await EventsDB.getEvents();
            const eventToEdit = events.find(e => e.id === id);
            if (eventToEdit) {
                UI.DOMElements.eventId.value = eventToEdit.id;
                UI.DOMElements.eventNameDbInput.value = eventToEdit.name;
                UI.DOMElements.eventTypeDbInput.value = eventToEdit.type;
            }
        } catch (error) {
            UI.showNotification("Błąd podczas ładowania danych konkurencji.", "error");
        }
    } else if (action === 'delete') {
        if (await UI.showConfirmation("Czy na pewno chcesz usunąć tę konkurencję?")) {
            try {
                await EventsDB.deleteEvent(id);
                const events = await EventsDB.getEvents();
                renderEventList(events);
                UI.showNotification("Konkurencja została usunięta.", "success");
                
                // Odśwież dane w state
                State.setAllDbEvents(events);
            } catch (error) {
                UI.showNotification("Błąd podczas usuwania konkurencji.", "error");
            }
        }
    }
}

export async function handleEventsDbFileImport(file) {
    if (!file) return;
    
    try {
        const text = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
        
        const importedData = JSON.parse(text);
        const { added, updated } = await EventsDB.importEventsFromJson(importedData);
        
        UI.showNotification(`Import zakończony. Dodano: ${added}, zaktualizowano: ${updated}`, "success");
        
        // Odśwież listę i dane
        const events = await EventsDB.getEvents();
        renderEventList(events);
        State.setAllDbEvents(events);
        
    } catch (error) {
        console.error('Błąd importu:', error);
        UI.showNotification(`Błąd importu: ${error.message}`, "error");
    }
}

// === EVENT SELECTION ===

export async function handleSelectEventFromDb() {
    const events = await EventsDB.getEvents();
    const selectList = UI.DOMElements.selectEventList;
    
    selectList.innerHTML = events.map(e => `
        <div class="event-select-item" data-name="${e.name}" data-type="${e.type}">
            <strong>${e.name}</strong>
            <br><small>${e.type === 'high' ? '🔼 Więcej = Lepiej' : '🔽 Mniej = Lepiej'}</small>
        </div>
    `).join('');
    
    document.getElementById('selectEventModal').classList.add('visible');
}

export function handleEventSelection(event) {
    const item = event.target.closest('.event-select-item');
    if (!item) return;
    
    const eventName = item.dataset.name;
    const eventType = item.dataset.type;
    
    State.state.eventTitle = eventName;
    State.setEventType(eventType);
    
    UI.DOMElements.eventTitle.textContent = eventName;
    UI.updateEventTypeButtons(eventType);
    
    document.getElementById('selectEventModal').classList.remove('visible');
    
    History.saveToUndoHistory(State.getState());
    Persistence.triggerAutoSave();
    
    UI.showNotification(`Zmieniono konkurencję na: ${eventName}`, "success");
}

// === PERSISTENCE & EXPORT ===

export async function handleImportState(file) {
    if (!file) return false;
    
    return await Persistence.importStateFromFile(file);
}

export function handleStopwatchSave(competitorName, result, eventType) {
    const input = document.querySelector(`#resultsTable .resultInput[data-name="${CSS.escape(competitorName)}"]`);
    if (input && !input.readOnly) {
        input.value = result;
        
        // Ustaw typ konkurencji jeśli się różni
        if (State.getEventType() !== eventType) {
            State.setEventType(eventType);
            UI.updateEventTypeButtons(eventType);
        }
        
        History.saveToUndoHistory(State.getState());
        Persistence.triggerAutoSave();
        
        UI.showNotification(`Zapisano wynik ${result} dla ${competitorName}`, "success");
    }
}

// === GEMINI AI ===

export async function handleGenerateAnnouncement() {
    const modal = document.getElementById('geminiModal');
    const result = document.getElementById('geminiResult');
    
    modal.classList.add('visible');
    result.innerHTML = '<p>🤖 Generowanie komunikatu speakera...</p>';
    
    const competitors = State.getActiveCompetitors();
    const scores = State.getScores();
    const eventName = State.state.eventName || 'Zawody Strongman';
    
    // Tworzenie rankingu
    const ranking = competitors
        .map(name => ({ name, score: scores[name] || 0 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    
    const prompt = `Wygeneruj profesjonalny komunikat speakera na zawodach strongman "${eventName}". 
    Obecny ranking:
    ${ranking.map((r, i) => `${i + 1}. ${r.name} - ${r.score} pkt`).join('\n')}
    
    Komunikat powinien być energetyczny, motywujący i zawierać informacje o aktualnej sytuacji w zawodach.`;
    
    try {
        const announcement = await GeminiAPI.callGemini(prompt);
        if (announcement) {
            result.innerHTML = `
                <div class="announcement-result">
                    <h4>📢 Komunikat Speakera:</h4>
                    <div class="announcement-text">${announcement}</div>
                    <button id="copyAnnouncement" class="copy-btn">📋 Kopiuj</button>
                </div>
            `;
            
            document.getElementById('copyAnnouncement').addEventListener('click', () => {
                navigator.clipboard.writeText(announcement);
                UI.showNotification("Komunikat skopiowany do schowka!", "success");
            });
        } else {
            result.innerHTML = '<p>❌ Nie udało się wygenerować komunikatu.</p>';
        }
    } catch (error) {
        result.innerHTML = '<p>❌ Błąd podczas generowania komunikatu.</p>';
        console.error('Błąd AI:', error);
    }
}

// === EXPORT HTML z poprawionymi miejscami ===

export function handleExportHtml() {
    UI.showNotification("Przygotowywanie raportu do edycji...", "info");
    
    if (!document.getElementById('finalSummaryPanel')) {
        UI.renderFinalSummary();
    }
    
    const summaryPanel = document.getElementById('finalSummaryPanel');
    if (!summaryPanel) {
        return UI.showNotification("Najpierw wygeneruj podsumowanie.", "error");
    }

    const eventName = State.state.eventName || 'Zawody Strongman';
    const location = State.state.eventLocation || '';
    const date = new Date().toLocaleString('pl-PL');
    const eventHistory = State.getEventHistory();
    const logoSrc = State.getLogo();

    // Funkcja do zamiany polskich znaków
    const normalizeText = (str) => {
        if (typeof str !== 'string') return str;
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/ł/g, "l").replace(/Ł/g, "L");
    };

    let htmlContent = `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${normalizeText(eventName)} - Raport</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: white; color: black; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { max-width: 150px; margin: 10px auto; display: block; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .event-section { margin: 30px 0; }
        .metadata { font-size: 12px; color: #666; margin-top: 20px; }
        .tie-info { cursor: help; color: #f39c12; font-weight: bold; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">`;

    if (logoSrc) {
        htmlContent += `<img src="${logoSrc}" alt="Logo" class="logo">`;
    }

    htmlContent += `
        <h1>${normalizeText(eventName)}</h1>
        ${location ? `<h2>${normalizeText(location)}</h2>` : ''}
        <div class="metadata">Data wygenerowania: ${date}</div>
    </div>`;

    // Klasyfikacja końcowa z poprawnymi miejscami
    const competitors = State.getActiveCompetitors();
    const scores = State.getScores();
    const history = State.getEventHistory();

    const finalResults = competitors.map(name => ({
        name,
        score: scores[name] || 0
    })).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return Competition.breakTie(a.name, b.name, history, competitors.length).outcome;
    });

    htmlContent += `
    <div class="event-section">
        <h2>🏆 Klasyfikacja końcowa</h2>
        <table>
            <thead>
                <tr><th>Miejsce</th><th>Zawodnik</th><th>Suma punktów</th></tr>
            </thead>
            <tbody>`;

    let currentPlace = 1;
    finalResults.forEach((data, index) => {
        let tieInfo = '';
        
        if (index > 0) {
            const prevScore = finalResults[index - 1].score;
            if (data.score === prevScore) {
                // Ten sam wynik - tooltip tylko dla wygrywającego w tiebreaku
                const tieResult = Competition.breakTie(finalResults[index - 1].name, data.name, history, competitors.length);
                if (tieResult.outcome < 0) {
                    // Aktualny zawodnik wygrał
                    tieInfo = ` <span class="tie-info" title="${tieResult.reason}">ℹ️</span>`;
                }
            } else {
                // Różny wynik - nowe miejsce
                currentPlace = index + 1;
            }
        }

        htmlContent += `
                <tr>
                    <td>${currentPlace}</td>
                    <td>${normalizeText(data.name)}${tieInfo}</td>
                    <td>${data.score}</td>
                </tr>`;
    });

    htmlContent += `
            </tbody>
        </table>
    </div>`;

    // Historia wydarzeń
    if (eventHistory.length > 0) {
        htmlContent += `<div class="event-section"><h2>📊 Szczegółowe wyniki</h2>`;
        
        eventHistory.forEach(event => {
            htmlContent += `
            <h3>Konkurencja ${event.nr}: ${normalizeText(event.name)}</h3>
            <table>
                <thead>
                    <tr><th>Miejsce</th><th>Zawodnik</th><th>Wynik</th><th>Punkty</th></tr>
                </thead>
                <tbody>`;
            
            event.results
                .sort((a, b) => (parseInt(a.place) || 999) - (parseInt(b.place) || 999))
                .forEach(res => {
                    htmlContent += `
                    <tr>
                        <td>${res.place ?? '-'}</td>
                        <td>${normalizeText(res.name)}</td>
                        <td>${res.result ?? '-'}</td>
                        <td>${res.points ?? '-'}</td>
                    </tr>`;
                });
            
            htmlContent += `</tbody></table>`;
        });
        
        htmlContent += '</div>';
    }

    htmlContent += `
    <div class="metadata">
        <p><strong>Raport wygenerowany przez:</strong> Strongman NextGen</p>
        <p><strong>Data:</strong> ${date}</p>
    </div>
</body>
</html>`;

    // Tworzenie i pobranie pliku
    const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${normalizeText(eventName.replace(/\s+/g, '_'))}_raport.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    UI.showNotification("Raport HTML został wygenerowany!", "success");
}

// === INITIALIZATION ===

export async function loadAndRenderInitialData() {
    try {
        const competitors = await CompetitorDB.getCompetitors();
        const events = await EventsDB.getEvents();
        
        State.setAllDbCompetitors(competitors);
        State.setAllDbEvents(events);
        
        // Renderuj interfejs selekcji zawodników
        UI.renderCompetitorSelectionUI(competitors);
        
        // Generuj przyciski kategorii
        const categories = [...new Set(competitors.flatMap(c => c.categories || []))];
        const filtersContainer = UI.DOMElements.categoryFilters;
        
        filtersContainer.innerHTML = '<button class="filter-btn active" data-filter="all">Wszyscy</button>';
        categories.forEach(cat => {
            filtersContainer.innerHTML += `<button class="filter-btn" data-filter="${cat}">${cat}</button>`;
        });
        
    } catch (error) {
        console.error('Błąd ładowania danych:', error);
        UI.showNotification("Błąd podczas ładowania danych z bazy.", "error");
    }
}
