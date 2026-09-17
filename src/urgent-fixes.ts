import './urgent-fixes.css';
import {localUser, readDraft, saveDraft} from './lib/scoutAutosave';

const normalize = (value: string | null | undefined) =>
  String(value || '').replace(/\s+/g, ' ').trim();

const FOUNDATION_LABELS: Record<string, string> = {
  'Empurrar bola na ZP': 'Empurrar bola para a ZP',
  'Tirar bola da ZP': 'Retirar bola da ZP',
};

function renameFoundationLabels() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  nodes.forEach((node) => {
    const current = normalize(node.nodeValue);
    const replacement = FOUNDATION_LABELS[current];
    if (replacement) node.nodeValue = replacement;
  });
}

function fixAthleteLabels() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  nodes.forEach((node) => {
    const current = normalize(node.nodeValue);
    if (current === '🔵 Atleta Azul') {
      node.nodeValue = 'Atleta Azul';
      (node.parentElement as HTMLElement | null)?.classList.add('athlete-label-blue');
    } else if (current === '🔎 Atleta') {
      node.nodeValue = 'Atleta';
      (node.parentElement as HTMLElement | null)?.classList.add('athlete-label-neutral');
    }
  });

  Array.from(document.querySelectorAll<HTMLElement>('h2')).forEach((heading) => {
    if (normalize(heading.textContent) !== 'Histórico do atleta') return;
    const card = heading.closest<HTMLElement>('.hub-scout-home') || heading.parentElement?.parentElement;
    if (card) card.classList.add('history-performance-card');
  });

  Array.from(document.querySelectorAll<HTMLElement>('div')).forEach((el) => {
    if (normalize(el.textContent) !== 'Atleta Vermelho') return;
    if (el.querySelector('.athlete-label-red-dot')) return;
    const dot = document.createElement('span');
    dot.className = 'athlete-label-red-dot';
    el.insertBefore(dot, el.firstChild);
  });
}

function fixMyMatchesAnalysis() {
  const detailHeading = Array.from(document.querySelectorAll<HTMLHeadingElement>('h2'))
    .find((heading) => normalize(heading.textContent) === 'Detalhes da sessão');
  if (!detailHeading) return;

  const headingRow = detailHeading.parentElement as HTMLElement | null;
  const detailCard = headingRow?.parentElement as HTMLElement | null;
  if (!detailCard) return;

  detailCard.classList.add('history-session-detail-card');

  const root = detailCard.closest<HTMLElement>('.hub-scout-home');
  if (!root?.classList.contains('my-matches-view')) return;

  detailCard.classList.add('my-match-analysis-card');
  root.classList.add('my-match-analysis-open');

  const closeButton = Array.from(detailCard.querySelectorAll<HTMLButtonElement>('button'))
    .find((button) => ['Fechar', 'Voltar para minhas partidas'].includes(normalize(button.textContent)));
  if (closeButton) closeButton.textContent = 'Voltar para minhas partidas';
}

function persistLiveHomeState() {
  const user = localUser();
  if (!user?.id) return;

  const draft = readDraft(user.id);
  if (!draft?.id || !draft.payload) return;

  try {
    saveDraft(user.id, draft.id, {
      ...draft.payload,
      matchHome: true,
      view: 'dashboard',
    });
  } catch {
    // O onClick React continua sendo a rota principal; este salvamento é apenas fallback.
  }
}

let liveHomeFallbackTimer = 0;
function scheduleLiveHomeFallback() {
  window.clearTimeout(liveHomeFallbackTimer);
  liveHomeFallbackTimer = window.setTimeout(() => {
    if (!document.querySelector('.scout-live-page .classic-home')) return;
    persistLiveHomeState();
    window.location.assign('/');
  }, 180);
}

document.addEventListener('click', (event) => {
  const target = event.target as Element | null;
  if (!target?.closest('.scout-live-page .classic-home')) return;
  scheduleLiveHomeFallback();
}, true);

document.addEventListener('pointerup', (event) => {
  const homeButton = document.querySelector<HTMLButtonElement>('.scout-live-page .classic-home');
  if (!homeButton) return;

  const target = event.target as Element | null;
  if (target?.closest('.classic-home')) return;

  const rect = homeButton.getBoundingClientRect();
  const inside = event.clientX >= rect.left && event.clientX <= rect.right &&
    event.clientY >= rect.top && event.clientY <= rect.bottom;
  if (!inside) return;

  event.preventDefault();
  homeButton.click();
  scheduleLiveHomeFallback();
}, true);

function markLiveActionButtons() {
  document.querySelectorAll<HTMLButtonElement>('.scout-live-page button').forEach((button) => {
    const label = normalize(button.textContent);
    button.classList.toggle('scout-deliver-ball-compact', label.startsWith('Entregar Bola'));
  });
}

function applyUrgentFixes() {
  fixMyMatchesAnalysis();
  renameFoundationLabels();
  fixAthleteLabels();
  markLiveActionButtons();

  const selectionHeading = Array.from(document.querySelectorAll<HTMLHeadingElement>('h2'))
    .find((heading) => normalize(heading.textContent).startsWith('Novo Scout ·'));
  const selectionCard = selectionHeading?.parentElement as HTMLElement | null;

  if (selectionCard && selectionCard.dataset.selectionFocusGuard !== '1') {
    selectionCard.dataset.selectionFocusGuard = '1';
    const searchInputs = Array.from(
      selectionCard.querySelectorAll<HTMLInputElement>('input[placeholder*="atletas"]')
    );

    searchInputs.forEach((input) => input.removeAttribute('autofocus'));

    window.requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement && searchInputs.includes(active)) {
        active.blur();
      }
    });
  }
}

let frame = 0;
function scheduleUrgentFixes() {
  if (frame) return;
  frame = window.requestAnimationFrame(() => {
    frame = 0;
    applyUrgentFixes();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleUrgentFixes, { once: true });
} else {
  scheduleUrgentFixes();
}

const observer = new MutationObserver(scheduleUrgentFixes);
observer.observe(document.documentElement, { childList: true, subtree: true });
