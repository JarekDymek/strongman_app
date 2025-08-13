// Plik: js/historyManager.js
// NOWY MODUŁ - obsługa panelu historii z funkcją edycji

import { getEventHistory } from './state.js';
import { DOMElements, showNotification, showConfirmation } from './ui.js';
import { recalculateAfterEdit, hideHistoryPanel } from './persistence.js';

export function setupHistoryEventListeners() {
    if (DOMElements.historyPanel) {
        DOMElements.historyPanel.addEventListener('click', handleHistoryPanelClick);
    }
}

export function showHistoryPanel() {
    if (!DOMElements.historyPanel) return;
    
    const history = getEventHistory();
    renderHistoryPanel(history);
    DOMElements.historyPanel.style.display = 'block';
}

function renderHistoryPanel(history) {
    const eventList = DOMElements.eventList;
    const eventDetails = DOMElements.eventDetails;
    
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

function renderEventForEditing(eventId) {
    const history = getEventHistory();
    const eventToEdit = history.find(e => e.nr === eventId);
    
    if (!eventToEdit) return;
    
    const eventDetails = DOMElements.eventDetails;
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
        
        if (await showConfirmation('Czy na pewno chcesz zapisać zmiany i przelieczyć punkty? Ta operacja wpłynie na całkowitą klasyfikację.')) {
            const success = await recalculateAfterEdit(eventId, newResults);
            if (success) {
                hideHistoryPanel();
                
                // Odśwież interfejs
                if (window.refreshFullUI) {
                    window.refreshFullUI();
                }
                showNotification('Wyniki zostały zaktualizowane i przeliczone!', 'success');
            }
        }
        return;
    }
    
    if (e.target.id === 'cancelEditBtn') {
        const eventDetails = DOMElements.eventDetails;
        eventDetails.innerHTML = '<p>Wybierz konkurencję z listy aby edytować wyniki.</p>';
        return;
    }
}

export { showHistoryPanel, hideHistoryPanel };
