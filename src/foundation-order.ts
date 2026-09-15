const FOUNDATION_ORDER = [
  'Saída de jogo',
  'Aproximação',
  'Batida',
  'Retirar bola da ZP',
  'Empurrar bola para a ZP',
  'Mover branca',
  'Bola de defesa',
  'Tabela',
  'Aérea',
  'Dobrar bola',
  'Sobrepor',
  "Pingo d'água",
  'Falta',
];

const FOUNDATION_ALIASES: Record<string, string> = {
  'Tirar bola da ZP': 'Retirar bola da ZP',
  'Empurrar bola na ZP': 'Empurrar bola para a ZP',
};

const normalize = (value: string | null | undefined) =>
  String(value || '').replace(/\s+/g, ' ').trim();

const displayLabel = (value: string | null | undefined) => {
  const label = normalize(value);
  return FOUNDATION_ALIASES[label] || label;
};

let bootstrapClick = false;
let frame = 0;

function scheduleFoundationOrder() {
  if (frame) return;
  frame = window.requestAnimationFrame(() => {
    frame = 0;
    applyFoundationOrder();
  });
}

function applyFoundationOrder() {
  const grid = document.querySelector<HTMLElement>('.scout-live-page .scout-play-grid');
  const moreButton = document.querySelector<HTMLButtonElement>('.scout-live-page .scout-more-fundamentals');
  if (!grid || !moreButton) return;

  if (moreButton.dataset.foundationOrderBound !== '1') {
    moreButton.dataset.foundationOrderBound = '1';
    moreButton.addEventListener('click', () => {
      if (bootstrapClick) return;
      grid.dataset.foundationExpanded = grid.dataset.foundationExpanded === '1' ? '0' : '1';
      grid.dataset.foundationReactExpanded = '0';
      scheduleFoundationOrder();
    });
  }

  if (grid.dataset.foundationReactExpanded !== '1') {
    grid.dataset.foundationReactExpanded = '1';
    if (!grid.dataset.foundationExpanded) grid.dataset.foundationExpanded = '0';
    bootstrapClick = true;
    moreButton.click();
    bootstrapClick = false;
    return;
  }

  const buttons = Array.from(grid.children)
    .filter((child): child is HTMLButtonElement => child instanceof HTMLButtonElement);
  if (!buttons.length) return;

  const rank = (button: HTMLButtonElement) => {
    const index = FOUNDATION_ORDER.indexOf(displayLabel(button.textContent));
    return index === -1 ? FOUNDATION_ORDER.length : index;
  };

  const sorted = [...buttons].sort((a, b) => rank(a) - rank(b));
  if (sorted.some((button, index) => button !== buttons[index])) {
    sorted.forEach((button) => grid.appendChild(button));
  }

  const expanded = grid.dataset.foundationExpanded === '1';
  sorted.forEach((button, index) => {
    button.hidden = !expanded && index >= 6;
  });

  const expected = expanded ? 'Menos fundamentos ⌃' : 'Mais fundamentos ⌄';
  if (normalize(moreButton.textContent) !== expected) moreButton.textContent = expected;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleFoundationOrder, {once: true});
} else {
  scheduleFoundationOrder();
}

const observer = new MutationObserver(scheduleFoundationOrder);
observer.observe(document.documentElement, {childList: true, subtree: true});
