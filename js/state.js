// Plik: js/state.js
// Cel: Centralny moduł zarządzania stanem aplikacji z naprawioną logiką selekcji

export const state = {
  competitors: [],
  scores: {},
  eventNumber: 1,
  eventHistory: [],
  logoData: null,
  currentEventType: 'high',
  competitorProfiles: {},
  allDbCompetitors: [],
  allDbEvents: [],
  focusModeIndex: -1,
  eventName: '',
  eventLocation: '',
  eventDate: '',
  eventTitle: 'Konkurencja 1',
  currentTab: 'intro'
};

// === GETTERY ===
export const getState             = () => JSON.parse(JSON.stringify(state));
export const getActiveCompetitors = () => state.competitors;
export const getEventHistory      = () => state.eventHistory;
export const getScores            = () => state.scores;
export const getLogo              = () => state.logoData;
export const getEventNumber       = () => state.eventNumber;
export const getEventType         = () => state.currentEventType;
export const getAllDbCompetitors  = () => state.allDbCompetitors;
export const getAllDbEvents       = () => state.allDbEvents;
export const getCompetitorProfile = (n) => state.competitorProfiles[n] || {};

// === SETTERY / AKTUALIZACJE ===

// FIX 1 – aktualizacja wybranych zawodników JEDYNYM źródłem prawdy
export function updateSelectedCompetitors(selected) {
  state.competitors = [...selected];
  state.scores      = {};
  selected.forEach(n => (state.scores[n] = 0));
}

// FIX 2 – trwałe losowanie wewnątrz state
export function shuffleCompetitors() {
  for (let i = state.competitors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [state.competitors[i], state.competitors[j]] =
      [state.competitors[j], state.competitors[i]];
  }
}

// FIX 3 – inicjalizacja punktów w wybranej kolejności
export function initializeScores() {
  state.scores = {};
  state.competitors.forEach(n => (state.scores[n] = 0));
}

// ZASTĄPIONA przez updateSelectedCompetitors + initializeScores
export function startCompetition(selectedCompetitors) {
    updateSelectedCompetitors(selectedCompetitors);
    state.eventNumber = 1;
    state.eventHistory = [];
    state.eventTitle = 'Konkurencja 1';
}

export function setEventType(type) { 
    state.currentEventType = type; 
}

export function nextEvent() {
    state.eventNumber++;
    state.eventTitle = `Konkurencja ${state.eventNumber}`;
    
    const lastEvent = state.eventHistory[state.eventHistory.length - 1];
    if (lastEvent) {
        // Sortuj zawodników według punktów z ostatniej konkurencji (najgorszy na początku)
        const lastScores = {};
        lastEvent.results.forEach(res => { 
            lastScores[res.name] = parseFloat(res.points) || 0; 
        });
        
        state.competitors.sort((a, b) => (lastScores[a] || 0) - (lastScores[b] || 0));
    }
}

export function addEventToHistory(eventData) {
    state.eventHistory.push(eventData);
    
    // Aktualizuj całkowite wyniki
    eventData.results.forEach(res => {
        if (state.scores[res.name] !== undefined) {
            state.scores[res.name] += parseFloat(res.points) || 0;
        }
    });
}

export function setLogo(data) { 
    state.logoData = data; 
}

export function updateEventResults(eventId, newResults) {
    const eventToUpdate = state.eventHistory.find(e => e.nr === eventId);
    if (eventToUpdate) {
        const resultsMap = new Map(newResults.map(r => [r.name, r.result]));
        eventToUpdate.results.forEach(originalResult => {
            if (resultsMap.has(originalResult.name)) {
                originalResult.result = resultsMap.get(originalResult.name);
            }
        });
    }
}

export function recalculateAllPoints(calculateFn) {
    // Przelicz punkty dla wszystkich wydarzeń
    state.eventHistory.forEach(event => {
        const rawResults = event.results.map(r => ({ name: r.name, result: r.result }));
        const { results: recalculatedPoints } = calculateFn(rawResults, state.competitors.length, event.type);
        
        const pointsMap = new Map(recalculatedPoints.map(r => [r.name, { points: r.points, place: r.place }]));
        event.results.forEach(originalResult => {
            if (pointsMap.has(originalResult.name)) {
                const { points, place } = pointsMap.get(originalResult.name);
                originalResult.points = points;
                originalResult.place = place;
            }
        });
    });
    
    // Przelicz całkowite wyniki
    Object.keys(state.scores).forEach(name => state.scores[name] = 0);
    state.eventHistory.forEach(event => {
        event.results.forEach(result => {
            if (state.scores[result.name] !== undefined) {
                state.scores[result.name] += parseFloat(result.points) || 0;
            }
        });
    });
}

// Dodaj eksport funkcji resetState:
export function resetState() {
  state.competitors = [];
  state.scores = {};
  state.eventNumber = 1;
  state.eventHistory = [];
  state.logoData = null;
  state.currentEventType = 'high';
  state.competitorProfiles = {};
  state.allDbCompetitors = [];
  state.allDbEvents = [];
  state.focusModeIndex = -1;
  state.eventName = '';
  state.eventLocation = '';
  state.eventDate = '';
  state.eventTitle = 'Konkurencja 1';
  state.currentTab = 'intro';
}

// Dodaj eksport funkcji restoreState jeśli jej nie ma:
export function restoreState(loadedState) {
  Object.assign(state, loadedState);
}

// Dodaj funkcję setAllDbCompetitors do eksportów:
export function setAllDbCompetitors(dbCompetitors) {
  state.allDbCompetitors = dbCompetitors;
  state.competitorProfiles = {};
  dbCompetitors.forEach(c => {
    state.competitorProfiles[c.name] = c;
  });
}

// Dodaj funkcję setAllDbEvents do eksportów:
export function setAllDbEvents(dbEvents) {
  state.allDbEvents = dbEvents;
}