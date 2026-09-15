import './ui-polish.css';

const normalize = (value: string | null | undefined) =>
  String(value || '').replace(/\s+/g, ' ').trim();

function replaceMarkerText(root: Element, marker: RegExp) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeValue && marker.test(node.nodeValue)) {
      node.nodeValue = node.nodeValue.replace(marker, '');
      return;
    }
    node = walker.nextNode();
  }
}

function labelTextStartsWith(label: HTMLLabelElement, text: string) {
  return normalize(label.textContent).startsWith(text);
}

function decorateAthleteLabel(label: HTMLLabelElement) {
  if (label.dataset.athleteIcon === '1') return;
  const text = normalize(label.textContent);
  if (!text.includes('Atleta Vermelho') && !text.includes('Atleta Azul') && text !== 'Atleta') return;

  replaceMarkerText(label, /^(?:🔵|🔴|🔎)\s*/u);
  label.classList.add('ui-athlete-label');
  label.dataset.athleteIcon = '1';
}

function findCardFromHeading(heading: Element | undefined) {
  if (!heading) return null;
  const parent = heading.parentElement;
  if (!parent) return null;
  return parent;
}

function polishResumeActions() {
  const continueButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
    .find((button) => normalize(button.textContent) === 'Continuar partida');
  if (continueButton?.parentElement) {
    continueButton.parentElement.classList.add('resume-actions-plain');
  }
}

function resetHiddenTrainingFilter(field: HTMLElement | null) {
  const select = field?.querySelector<HTMLSelectElement>('select');
  if (!select || select.value === 'Todos') return;
  select.value = 'Todos';
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function polishSelectionScreen() {
  const heading = Array.from(document.querySelectorAll('h2'))
    .find((item) => normalize(item.textContent).startsWith('Novo Scout ·'));

  document.querySelectorAll('.hub-scout-home').forEach((root) =>
    root.classList.toggle('is-athlete-selection-screen', Boolean(heading))
  );

  const card = findCardFromHeading(heading);
  if (!card) return;

  card.classList.add('athlete-selection-white');
  const isTraining = normalize(heading?.textContent) === 'Novo Scout · Treino';

  card.querySelectorAll<HTMLLabelElement>('label').forEach((label) => {
    if (isTraining && [
      'Classe do atleta',
      'Gênero do atleta',
      'Classe do atleta azul',
      'Gênero do atleta azul',
    ].some((text) => labelTextStartsWith(label, text))) {
      const field = label.parentElement;
      field?.classList.add('training-filter-hidden');
      resetHiddenTrainingFilter(field);
      return;
    }

    const field = label.parentElement;
    if (field?.querySelector('input[placeholder*="atletas"]')) {
      decorateAthleteLabel(label);
    }
  });

  if (isTraining) {
    card.querySelectorAll<HTMLElement>('div').forEach((item) => {
      const text = normalize(item.textContent);
      if ((text === 'Atleta Vermelho' || text === 'Atleta Azul') &&
          !item.querySelector('input, select, button')) {
        item.classList.add('training-athlete-heading-duplicate');
      }
    });
  }
}

function polishHistoryAthleteFilter() {
  const historyHeading = Array.from(document.querySelectorAll('h2'))
    .find((item) => normalize(item.textContent) === 'Histórico do atleta');
  const card = findCardFromHeading(historyHeading);
  if (!card) return;

  card.querySelectorAll<HTMLLabelElement>('label').forEach((label) => {
    const field = label.parentElement;
    if (!field?.querySelector('input[placeholder*="atletas"]')) return;
    replaceMarkerText(label, /^🔎\s*/u);
    label.classList.add('ui-athlete-label');
    label.dataset.athleteIcon = '1';
  });
}

function polishBrand() {
  document.querySelectorAll<HTMLElement>('.home-brand').forEach((brand) => {
    brand.classList.add('ui-home-brand');
    brand.setAttribute('role', 'button');
    brand.setAttribute('tabindex', '0');
    brand.setAttribute('aria-label', 'Voltar à tela inicial do Bocha Scout');
  });
}

function goToHome() {
  const liveHome = document.querySelector<HTMLButtonElement>('.classic-home');
  if (liveHome) {
    liveHome.click();
    return;
  }

  const analysisHome = Array.from(document.querySelectorAll<HTMLButtonElement>('.home-section-nav button'))
    .find((button) => normalize(button.textContent) === 'Início');
  if (analysisHome) {
    analysisHome.click();
    return;
  }

  // Na seleção de uma nova partida ainda não existe partida em andamento,
  // então recarregar volta com segurança ao dashboard inicial.
  window.location.assign('/');
}

function applyPolish() {
  polishBrand();
  polishResumeActions();
  polishSelectionScreen();
  polishHistoryAthleteFilter();
}

let frame = 0;
function schedulePolish() {
  if (frame) return;
  frame = window.requestAnimationFrame(() => {
    frame = 0;
    applyPolish();
  });
}

document.addEventListener('click', (event) => {
  const target = event.target as Element | null;
  if (!target?.closest('.home-brand.ui-home-brand')) return;
  event.preventDefault();
  goToHome();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const target = event.target as Element | null;
  if (!target?.closest('.home-brand.ui-home-brand')) return;
  event.preventDefault();
  goToHome();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', schedulePolish, { once: true });
} else {
  schedulePolish();
}

const observer = new MutationObserver(schedulePolish);
observer.observe(document.documentElement, { childList: true, subtree: true });
