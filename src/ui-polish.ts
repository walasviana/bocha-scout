import './ui-polish.css';
import {localUser} from './lib/scoutAutosave';

const MY_MATCHES_KEY = 'bochaScout.myMatchesView';

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

function polishSessionHeatmaps(card: HTMLElement) {
  card.querySelectorAll<HTMLElement>('.session-athlete-side').forEach((side) => {
    const heading = Array.from(side.querySelectorAll<HTMLHeadingElement>('h4'))
      .find((item) => normalize(item.textContent).startsWith('Mapa de calor'));
    if (!heading || heading.dataset.disclosureReady === '1') return;

    const heatmap = heading.nextElementSibling as HTMLElement | null;
    if (!heatmap) return;

    const athleteName = normalize(side.querySelector('.session-athlete-heading strong')?.textContent);
    heading.textContent = athleteName ? `Mapa de calor · ${athleteName}` : 'Mapa de calor';
    heading.classList.add('history-heatmap-toggle');
    heading.dataset.disclosureReady = '1';
    heading.setAttribute('role', 'button');
    heading.setAttribute('tabindex', '0');
    heading.setAttribute('aria-expanded', 'false');
    heatmap.classList.add('history-heatmap-body');

    const toggle = () => {
      const open = side.classList.toggle('history-heatmap-open');
      heading.setAttribute('aria-expanded', String(open));
    };

    heading.addEventListener('click', toggle);
    heading.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggle();
    });
  });
}

function polishSessionDetail() {
  const detailHeading = Array.from(document.querySelectorAll('h2'))
    .find((item) => normalize(item.textContent) === 'Detalhes da sessão');
  const card = findCardFromHeading(detailHeading) as HTMLElement | null;
  if (!card) return;

  card.classList.add('history-session-detail');
  polishSessionHeatmaps(card);

  const playsHeading = Array.from(card.querySelectorAll<HTMLHeadingElement>('h3'))
    .find((item) => normalize(item.textContent) === 'Jogadas da partida');
  if (!playsHeading) return;

  playsHeading.classList.add('history-plays-toggle');
  let sibling = playsHeading.nextElementSibling as HTMLElement | null;
  while (sibling) {
    sibling.classList.add('history-play-row');
    sibling = sibling.nextElementSibling as HTMLElement | null;
  }

  if (playsHeading.dataset.disclosureReady === '1') return;
  playsHeading.dataset.disclosureReady = '1';
  playsHeading.setAttribute('role', 'button');
  playsHeading.setAttribute('tabindex', '0');
  playsHeading.setAttribute('aria-expanded', 'false');

  const toggle = () => {
    const open = card.classList.toggle('history-plays-open');
    playsHeading.setAttribute('aria-expanded', String(open));
  };
  playsHeading.addEventListener('click', toggle);
  playsHeading.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggle();
  });
}

function isMyMatchesView() {
  return window.sessionStorage.getItem(MY_MATCHES_KEY) === '1';
}

function polishMyMatchesCard() {
  const list = document.querySelector<HTMLElement>('.home-action-list');
  if (!list || list.querySelector('.home-my-matches')) return;

  const historyButton = list.querySelector<HTMLButtonElement>('button.home-history');
  if (!historyButton) return;

  const button = historyButton.cloneNode(true) as HTMLButtonElement;
  button.classList.add('home-my-matches');
  button.removeAttribute('aria-current');

  const title = button.querySelector('strong');
  const subtitle = button.querySelector('small');
  if (title) title.textContent = 'Minhas partidas';
  if (subtitle) subtitle.textContent = 'Reveja todas as partidas registradas nesta conta';

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    window.sessionStorage.setItem(MY_MATCHES_KEY, '1');
    historyButton.click();
    window.scrollTo(0, 0);
  });

  list.insertBefore(button, historyButton);
}

function polishMyMatchesView() {
  const historyHeading = Array.from(document.querySelectorAll<HTMLHeadingElement>('h2'))
    .find((item) => normalize(item.textContent) === 'Histórico do atleta');
  const root = historyHeading?.closest<HTMLElement>('.hub-scout-home');
  if (!root || !isMyMatchesView()) return;

  root.classList.add('my-matches-view');
  const container = root.firstElementChild as HTMLElement | null;
  if (!container) return;

  Array.from(container.children).forEach((child) => child.classList.add('my-matches-section'));

  const accountLabel = Array.from(container.querySelectorAll<HTMLLabelElement>('label'))
    .find((label) => labelTextStartsWith(label, 'Conta'));
  const accountSelect = accountLabel?.parentElement?.querySelector<HTMLSelectElement>('select');
  const userId = localUser()?.id || '';
  if (accountSelect && userId && accountSelect.value !== userId &&
      Array.from(accountSelect.options).some((option) => option.value === userId)) {
    accountSelect.value = userId;
    accountSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const listHeading = Array.from(container.querySelectorAll<HTMLHeadingElement>('h2'))
    .find((item) => ['Histórico de partidas', 'Minhas partidas'].includes(normalize(item.textContent)));
  const listCard = findCardFromHeading(listHeading) as HTMLElement | null;
  if (listCard) {
    listCard.classList.add('my-matches-list-card');
    if (listHeading) listHeading.textContent = 'Minhas partidas';
    if (!listCard.querySelector('.my-matches-intro')) {
      const intro = document.createElement('p');
      intro.className = 'my-matches-intro';
      intro.textContent = 'Todas as partidas registradas por esta conta. Abra uma partida para ver somente a análise selecionada.';
      listHeading?.insertAdjacentElement('afterend', intro);
    }
  }

  const backButton = Array.from(container.querySelectorAll<HTMLButtonElement>(':scope > button'))
    .find((button) => ['Voltar', 'Voltar ao início'].includes(normalize(button.textContent)));
  if (backButton) {
    backButton.classList.add('my-matches-back');
    backButton.textContent = 'Voltar ao início';
    if (backButton.dataset.myMatchesReady !== '1') {
      backButton.dataset.myMatchesReady = '1';
      backButton.addEventListener('click', () => window.sessionStorage.removeItem(MY_MATCHES_KEY));
    }
  }

  const detailHeading = Array.from(container.querySelectorAll<HTMLHeadingElement>('h2'))
    .find((item) => normalize(item.textContent) === 'Detalhes da sessão');
  const detailCard = findCardFromHeading(detailHeading) as HTMLElement | null;
  root.classList.toggle('my-match-analysis-open', Boolean(detailCard));

  if (detailCard) {
    detailCard.classList.add('my-match-analysis-card');
    const closeButton = Array.from(detailCard.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => normalize(button.textContent) === 'Fechar' || normalize(button.textContent) === 'Voltar para minhas partidas');
    if (closeButton) closeButton.textContent = 'Voltar para minhas partidas';
    if (detailCard.dataset.focusedAnalysis !== '1') {
      detailCard.dataset.focusedAnalysis = '1';
      window.scrollTo(0, 0);
    }
  }
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
  window.sessionStorage.removeItem(MY_MATCHES_KEY);
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

  window.location.assign('/');
}

function applyPolish() {
  polishBrand();
  polishResumeActions();
  polishSelectionScreen();
  polishHistoryAthleteFilter();
  polishSessionDetail();
  polishMyMatchesCard();
  polishMyMatchesView();
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
  if (event.isTrusted && target?.closest('button.home-history:not(.home-my-matches)')) {
    window.sessionStorage.removeItem(MY_MATCHES_KEY);
  }
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
