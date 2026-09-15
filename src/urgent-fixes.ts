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
    // Se o onClick React funcionou, a tela ao vivo já saiu do DOM e nada mais é necessário.
    if (!document.querySelector('.scout-live-page .classic-home')) return;

    // Fallback para navegadores/toques móveis que não concluíram a troca de tela.
    persistLiveHomeState();
    window.location.assign('/');
  }, 180);
}

document.addEventListener('click', (event) => {
  const target = event.target as Element | null;
  if (!target?.closest('.scout-live-page .classic-home')) return;
  scheduleLiveHomeFallback();
}, true);

// Em alguns celulares, um elemento sobreposto pode receber o toque no lugar do botão.
// Se o toque terminar dentro da área visual da casinha, acionamos o botão real.
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
