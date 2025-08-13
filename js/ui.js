// Plik: js/ui.js
// Cel: Warstwa interfejsu użytkownika z obsługą zakładek

import { getActiveCompetitors, getScores, getCompetitorProfile, getEventHistory, getAllDbEvents } from './state.js';
import { breakTie } from './competition.js';

export let DOMElements = {};

export function initUI() {
    DOMElements = {
        // Notification system
        notificationBar: document.getElementById('notification-bar'),
        
        // Modals
        confirmationModal: document.getElementById('confirmationModal'),
        modalText: document.getElementById('modalText'),
        confirmBtn: document.getElementById('confirmBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        promptModal: document.getElementById('promptModal'),
        promptText: document.getElementById('promptText'),
        promptInput: document.getElementById('promptInput'),
        promptConfirmBtn: document.getElementById('promptConfirmBtn'),
        promptCancelBtn: document.getElementById('promptCancelBtn'),
        
        // Tab panels
        titlePanel: document.getElementById('tab-title'),
        selectPanel: document.getElementById('tab-select'),
        competitionPanel: document.getElementById('tab-competition'),
        resultsPanel: document.getElementById('tab-results'),
        summaryPanel: document.getElementById('tab-summary'),
        
        // Title tab elements
        logoImg: document.getElementById('logoImg'),
        selectLogoBtn: document.getElementById('selectLogoBtn'),
        logoUpload: document.getElementById('logoUpload'),
        eventNameInput: document.getElementById('eventNameInput'),
        eventLocationInput: document.getElementById('eventLocationInput'),
        eventDateInput: document.getElementById('eventDateInput'),
        
        // Select tab elements
        categoryFilters: document.getElementById('categoryFilters'),
        competitorSelectionList: document.getElementById('competitorSelectionList'),
        selectionCounter: document.getElementById('selectionCounter'),
        eventListContainer: document.getElementById('eventListContainer'),
        
        // Competition tab elements
        startList: document.getElementById('startList'),
        startCompetitionBtn: document.getElementById('startCompetitionBtn'),
        
        // Results tab elements
        resultsTableBody: document.querySelector("#resultsTable tbody"),
        eventTitle: document.getElementById('eventTitle'),
        highTypeBtn: document.getElementById('highTypeBtn'),
        lowTypeBtn: document.getElementById('lowTypeBtn'),
        
        // Summary tab elements
        finalSummaryPanel: document.getElementById('finalSummaryPanel'),
        
        // Database management
        competitorDbPanel: document.getElementById('competitorDbPanel'),
        eventDbPanel: document.getElementById('eventDbPanel'),
        competitorForm: document.getElementById('competitorForm'),
        competitorFormBtn: document.getElementById('competitorFormBtn'),
        competitorId: document.getElementById('competitorId'),
        competitorNameInput: document.getElementById('competitorNameInput'),
        birthDateInput: document.getElementById('birthDateInput'),
        residenceInput: document.getElementById('residenceInput'),
        heightInput: document.getElementById('heightInput'),
        weightInput: document.getElementById('weightInput'),
        competitorCategories: document.getElementById('competitorCategories'),
        competitorNotesInput: document.getElementById('competitorNotesInput'),
        competitorListContainer: document.getElementById('competitorListContainer'),
        
        // Event management
        eventForm: document.getElementById('eventForm'),
        eventFormBtn: document.getElementById('eventFormBtn'),
        eventId: document.getElementById('eventId'),
        eventNameDbInput: document.getElementById('eventNameDbInput'),
        eventTypeDbInput: document.getElementById('eventTypeDbInput'),
        selectEventModal: document.getElementById('selectEventModal'),
        selectEventList: document.getElementById('selectEventList'),
        
        // Competitor details
        competitorDetailModal: document.getElementById('competitorDetailModal'),
        competitorDetailName: document.getElementById('competitorDetailName'),
        competitorDetailPhoto: document.getElementById('competitorDetailPhoto'),
        competitorDetailMeta: document.getElementById('competitorDetailMeta'),
        competitorDetailNotes: document.getElementById('competitorDetailNotes'),
        
        // Focus mode
        focusModeModal: document.getElementById('focusModeModal'),
        focusCompetitorPhoto: document.getElementById('focusCompetitorPhoto'),
        focusCompetitorName: document.getElementById('focusCompetitorName'),
        focusResultInput: document.getElementById('focusResultInput'),
        
        // History and checkpoints
        historyPanel: document.getElementById('historyPanel'),
        eventList: document.getElementById('eventList'),
        eventDetails: document.getElementById('eventDetails'),
        checkpointListContainer: document.getElementById('checkpointListContainer'),
        checkpointList: document.getElementById('checkpointList'),
        storageUsage: document.getElementById('storageUsage'),
        
        // Theme selector
        themeSelector: document.getElementById('themeSelector'),
    };
}

// === HELPER FUNCTIONS ===

export function calculateAge(birthDateString) {
    if (!birthDateString) return null;
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

export function showNotification(message, type = 'success', duration = 3000) {
    if (!DOMElements.notificationBar) return;
    
    const bar = DOMElements.notificationBar;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    
    bar.innerHTML = `${icons[type] || ''} ${message}`;
    bar.className = `notification-bar ${type}`;
    bar.classList.add('show');
    
    setTimeout(() => bar.classList.remove('show'), duration);
}

export function showConfirmation(message) {
    return new Promise((resolve) => {
        const modal = DOMElements.confirmationModal;
        DOMElements.modalText.textContent = message;
        modal.classList.add('visible');

        const newConfirmBtn = DOMElements.confirmBtn.cloneNode(true);
        DOMElements.confirmBtn.parentNode.replaceChild(newConfirmBtn, DOMElements.confirmBtn);
        DOMElements.confirmBtn = newConfirmBtn;

        const newCancelBtn = DOMElements.cancelBtn.cloneNode(true);
        DOMElements.cancelBtn.parentNode.replaceChild(newCancelBtn, DOMElements.cancelBtn);
        DOMElements.cancelBtn = newCancelBtn;

        const close = (value) => {
            modal.classList.remove('visible');
            resolve(value);
        };

        newConfirmBtn.onclick = () => close(true);
        newCancelBtn.onclick = () => close(false);
    });
}

export function showPrompt(message, defaultValue = '') {
    return new Promise((resolve) => {
        const modal = DOMElements.promptModal;
        DOMElements.promptText.textContent = message;
        DOMElements.promptInput.value = defaultValue;
        modal.classList.add('visible');
        DOMElements.promptInput.focus();
        DOMElements.promptInput.select();

        const newConfirmBtn = DOMElements.promptConfirmBtn.cloneNode(true);
        DOMElements.promptConfirmBtn.parentNode.replaceChild(newConfirmBtn, DOMElements.promptConfirmBtn);
        DOMElements.promptConfirmBtn = newConfirmBtn;

        const newCancelBtn = DOMElements.promptCancelBtn.cloneNode(true);
        DOMElements.promptCancelBtn.parentNode.replaceChild(newCancelBtn, DOMElements.promptCancelBtn);
        DOMElements.promptCancelBtn = newCancelBtn;

        const close = (value) => {
            modal.classList.remove('visible');
            resolve(value);
        };

        newConfirmBtn.onclick = () => close(DOMElements.promptInput.value);
        newCancelBtn.onclick = () => close(null);
    });
}

// === COMPETITOR DETAILS ===

export function showCompetitorDetails(profile) {
    if (!profile) return;
    
    const age = calculateAge(profile.birthDate);
    const categoriesText = (profile.categories && profile.categories.length > 0) ? 
        profile.categories.join(', ') : 'Brak';

    DOMElements.competitorDetailName.textContent = profile.name;
    DOMElements.competitorDetailPhoto.src = profile.photo || 'https://placehold.co/150x150/eee/333?text=?';
    DOMElements.competitorDetailMeta.innerHTML = `
        <p><strong>Wiek:</strong> ${age ? age + ' lat' : 'Brak danych'}</p>
        <p><strong>Wzrost:</strong> ${profile.height ? profile.height + ' cm' : 'Brak danych'}</p>
        <p><strong>Waga:</strong> ${profile.weight ? profile.weight + ' kg' : 'Brak danych'}</p>
        <p><strong>Zamieszkanie:</strong> ${profile.residence || 'Brak danych'}</p>
        <p><strong>Kategorie:</strong> ${categoriesText}</p>
    `;
    DOMElements.competitorDetailNotes.textContent = profile.notes || 'Brak dodatkowych informacji.';
    DOMElements.competitorDetailModal.classList.add('visible');
}

// === LOGO MANAGEMENT ===

export function setLogoUI(data) {
    const logoImg = DOMElements.logoImg;
    const selectLogoBtn = DOMElements.selectLogoBtn;
    
    if (data) {
        logoImg.src = data;
        logoImg.style.display = 'block';
        selectLogoBtn.textContent = '🔄 Zmień logo';
    } else {
        logoImg.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzJjM2U1MCIgd2lkdGg9IjE1MHB4IiBoZWlnaHQ9IjE1MHB4Ij48cGF0aCBkPSJNMjIgMTJoLTJ2LTJoLTJ2LTJoLTJ2Mkg4di0ySDZ2MkgydjJoMlYxNGgydjJoMnYyaDJ2LTJoMnYtMmgydjJoMnYtMmgydi0yaC0yem0tMTAgNmMtMS4xIDAtMi0uOS0yLTJzLjktMiAyLTIgMiAuOSAyIDJzLS45IDItMiAyetTTE2IDhjMCAxLjEtLjkgMi0yIDJoLTRjLTEuMSAwLTItLjktMi0yVjZoMHYyYzAgLjU1LjQ1IDEgMSAxczEtLjQ1IDEtMVY2aDJ2MmMwIC41NS40NSAxIDEgMXMxLS40NSAxLTFWNmgwdjJ6Ii8+PC9zdmc+"; // Default logo
        logoImg.style.display = 'block';
        selectLogoBtn.textContent = '📷 Wybierz logo';
    }
}

// === COMPETITOR SELECTION ===

export function renderCompetitorSelectionUI(allCompetitors) {
    if (!DOMElements.competitorSelectionList) return;
    
    if (!allCompetitors || allCompetitors.length === 0) {
        DOMElements.competitorSelectionList.innerHTML = `
            <div class="empty-state">
                Baza danych jest pusta. Kliknij "Zarządzaj zawodnikami", aby dodać pierwszych uczestników.
            </div>
        `;
        return;
    }

    DOMElements.competitorSelectionList.innerHTML = allCompetitors.map(c => {
        const categoriesStr = (c.categories && c.categories.length) ? c.categories.join(',') : '';
        return `
            <div class="competitor-select-item" data-categories="${categoriesStr}">
                <label>
                    <input type="checkbox" value="${c.name}" data-name="${c.name}">
                    <img src="${c.photo || 'https://placehold.co/40x40/eee/333?text=?'}" alt="${c.name}" class="competitor-avatar">
                    <span class="competitor-info">
                        <strong>${c.name}</strong>
                        ${c.categories && c.categories.length ? '<br><small>' + c.categories.join(', ') + '</small>' : ''}
                    </span>
                </label>
            </div>
        `;
    }).join('');

    // Render category filters
    const categories = [...new Set(allCompetitors.flatMap(c => c.categories || []))];
    const filtersContainer = DOMElements.categoryFilters;
    
    filtersContainer.innerHTML = '<button class="filter-btn active" data-filter="all">Wszyscy</button>';
    categories.forEach(cat => {
        filtersContainer.innerHTML += `<button class="filter-btn" data-filter="${cat}">${cat}</button>`;
    });
}

export function updateSelectionCounter(count) {
    if (DOMElements.selectionCounter) {
        DOMElements.selectionCounter.textContent = `Wybrano: ${count}`;
    }
}

export function filterCompetitorSelectionList(filter) {
    document.querySelectorAll('#categoryFilters .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    document.querySelectorAll('#competitorSelectionList .competitor-select-item').forEach(item => {
        const itemCategories = item.dataset.categories ? item.dataset.categories.split(',') : [];
        item.style.display = (filter === 'all' || itemCategories.includes(filter)) ? 'flex' : 'none';
    });
}

// === EVENT LIST ===

export function renderEventList(allEvents) {
    if (!DOMElements.eventListContainer || !allEvents) return;
    
    if (allEvents.length === 0) {
        DOMElements.eventListContainer.innerHTML = `
            <div class="empty-state">
                Brak konkurencji w bazie danych.
            </div>
        `;
        return;
    }

    DOMElements.eventListContainer.innerHTML = allEvents.map(event => `
        <div class="event-item">
            <div class="event-info">
                <strong>${event.name}</strong>
                <br><small>${event.type === 'high' ? '🔼 Więcej = Lepiej' : '🔽 Mniej = Lepiej'}</small>
            </div>
        </div>
    `).join('');
}

// === START LIST ===

export function renderStartList(competitors) {
    if (!DOMElements.startList) return;
    
    if (!competitors || competitors.length === 0) {
        DOMElements.startList.innerHTML = `
            <div class="empty-state">
                Brak wybranych zawodników. Przejdź do zakładki "Kto i Co" aby wybrać zawodników.
            </div>
        `;
        return;
    }

    DOMElements.startList.innerHTML = competitors.map((name, index) => `
        <div class="start-list-item">
            <strong>${index + 1}.</strong> ${name}
        </div>
    `).join('');
}

// === RESULTS TABLE ===

export function renderTable() {
    const competitors = getActiveCompetitors();
    const scores = getScores();
    
    if (!DOMElements.resultsTableBody || competitors.length === 0) return;

    DOMElements.resultsTableBody.innerHTML = competitors.map((name, index) => {
        const profile = getCompetitorProfile(name) || {};
        return `
            <tr data-name="${name}">
                <td>${index + 1}</td>
                <td>
                    <div class="competitor-cell">
                        <img class="competitor-avatar" 
                             src="${profile.photo || 'https://placehold.co/40x40/eee/333?text=?'}" 
                             alt="${name}">
                        <span class="competitor-name" data-action="showDetails">${name}</span>
                    </div>
                </td>
                <td>
                    <input type="text" 
                           class="resultInput" 
                           data-name="${name}" 
                           placeholder="Wprowadź wynik">
                </td>
                <td class="place-cell">-</td>
                <td class="points-cell">-</td>
                <td class="total-cell">${scores[name] || 0}</td>
                <td class="actions-cell">
                    <button class="action-icon" data-action="openStopwatch" title="Stoper">⏱️</button>
                </td>
            </tr>
        `;
    }).join('');
}

export function updateEventTitle(eventNumber, eventTitle) {
    if (DOMElements.eventTitle) {
        DOMElements.eventTitle.textContent = eventTitle || `Konkurencja ${eventNumber}`;
    }
}

export function updateEventTypeButtons(currentType) {
    if (DOMElements.highTypeBtn && DOMElements.lowTypeBtn) {
        DOMElements.highTypeBtn.classList.toggle('active', currentType === 'high');
        DOMElements.lowTypeBtn.classList.toggle('active', currentType === 'low');
    }
}

export function updateTableWithEventData(results) {
    results.forEach(result => {
        const row = document.querySelector(`#resultsTable tr[data-name="${CSS.escape(result.name)}"]`);
        if (row) {
            row.querySelector('.place-cell').textContent = result.place;
            row.querySelector('.points-cell').textContent = result.points;
        }
    });
}

export function lockResultInputs() {
    document.querySelectorAll('#resultsTable .resultInput').forEach(input => {
        input.readOnly = true;
        input.classList.add('locked');
    });
}

export function unlockResultInputs() {
    document.querySelectorAll('#resultsTable .resultInput').forEach(input => {
        input.readOnly = false;
        input.classList.remove('locked');
    });
}

// === FINAL SUMMARY ===

export function renderFinalSummary() {
    if (!DOMElements.finalSummaryPanel) return;
    
    const competitors = getActiveCompetitors();
    const scores = getScores();
    const history = getEventHistory();

    if (competitors.length === 0 || history.length === 0) {
        DOMElements.finalSummaryPanel.innerHTML = `
            <div class="empty-state">
                Brak wyników do wyświetlenia. Przeprowadź zawody, aby zobaczyć klasyfikację końcową.
            </div>
        `;
        return;
    }

    // Sortowanie z poprawnym tie-breakingiem
    const finalResults = competitors.map(name => ({
        name,
        score: scores[name] || 0
    })).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const tieResult = breakTie(a.name, b.name, history, competitors.length);
        return tieResult.outcome;
    });

    // Generowanie tabel z poprawnymi miejscami (bez duplikatów)
    let html = `<h2>🏆 Klasyfikacja końcowa</h2>`;
    html += `<table class="final-table">`;
    html += `<thead><tr><th>Miejsce</th><th>Zawodnik</th><th>Suma punktów</th></tr></thead><tbody>`;

    let currentPlace = 1;
    let sameScoreCount = 0;

    finalResults.forEach((data, index) => {
        let tieInfo = '';
        
        if (index > 0) {
            const prevScore = finalResults[index - 1].score;
            if (data.score === prevScore) {
                sameScoreCount++;
                // Tooltip tylko dla wygrywającego w danej parze
                const tieResult = breakTie(finalResults[index - 1].name, data.name, history, competitors.length);
                if (tieResult.outcome > 0) {
                    // Poprzedni zawodnik wygrał
                    tieInfo = '';
                } else if (tieResult.outcome < 0) {
                    // Aktualny zawodnik wygrał
                    tieInfo = ` <span class="tie-info" title="${tieResult.reason}">ℹ️</span>`;
                }
            } else {
                currentPlace = index + 1;
                sameScoreCount = 0;
            }
        }

        html += `<tr>
            <td>${currentPlace}</td>
            <td>${data.name}${tieInfo}</td>
            <td>${data.score}</td>
        </tr>`;
    });

    html += `</tbody></table>`;

    // Dodaj historię szczegółową
    if (history.length > 0) {
        html += `<h3>Szczegółowe wyniki</h3>`;
        history.forEach(event => {
            html += `<h4>Konkurencja ${event.nr}: ${event.name}</h4>`;
            html += `<table class="results-table">`;
            html += `<thead><tr><th>Miejsce</th><th>Zawodnik</th><th>Wynik</th><th>Punkty</th></tr></thead><tbody>`;
            
            event.results
                .sort((a, b) => (parseInt(a.place) || 999) - (parseInt(b.place) || 999))
                .forEach(res => {
                    html += `<tr>
                        <td>${res.place || '-'}</td>
                        <td>${res.name}</td>
                        <td>${res.result || '-'}</td>
                        <td>${res.points || '-'}</td>
                    </tr>`;
                });
            
            html += `</tbody></table>`;
        });
    }

    DOMElements.finalSummaryPanel.innerHTML = html;
}

// === HISTORY PANEL ===

export function toggleHistoryPanel() {
    if (!DOMElements.historyPanel) return;
    
    const panel = DOMElements.historyPanel;
    const isVisible = panel.style.display === 'block';
    panel.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        const history = getEventHistory();
        const list = DOMElements.eventList;
        list.innerHTML = "";
        
        history.forEach(event => {
            const btn = document.createElement("button");
            btn.textContent = `Edytuj konkurencję ${event.nr}: ${event.name}`;
            btn.dataset.eventId = event.nr;
            list.appendChild(btn);
        });
        
        DOMElements.eventDetails.innerHTML = history.length > 0 ? 
            '<p>Wybierz konkurencję do edycji.</p>' : 
            '<p>Brak zakończonych konkurencji.</p>';
    }
}

export function renderEventForEditing(eventId) {
    if (!DOMElements.eventDetails) return;
    
    const eventToEdit = getEventHistory().find(e => e.nr === eventId);
    if (!eventToEdit) return;

    const details = DOMElements.eventDetails;
    let html = `<h4>Edytuj konkurencję ${eventId}: ${eventToEdit.name}</h4>`;
    html += `<table class="edit-table">`;
    html += `<tr><th>Zawodnik</th><th>Wynik</th></tr>`;
    
    eventToEdit.results.forEach(w => {
        html += `<tr>
            <td>${w.name}</td>
            <td><input type="text" value="${w.result}" data-name="${w.name}"></td>
        </tr>`;
    });
    
    html += `</table>`;
    html += `<button data-action="save-recalculate" data-event-id="${eventId}" class="action-btn primary">💾 Zapisz i przelicz</button>`;
    details.innerHTML = html;
}

// === LEGACY COMPATIBILITY ===
// Zachowuje kompatybilność z istniejącym kodem
export function switchView(viewName) {
    // Ta funkcja jest zachowana dla kompatybilności wstecznej
    // ale w nowym systemie zakładek nie jest używana
    console.warn('switchView is deprecated, use switchTab instead');
}
