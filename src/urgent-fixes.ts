import './urgent-fixes.css';

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

function applyUrgentFixes() {
  fixMyMatchesAnalysis();
  renameFoundationLabels();

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
