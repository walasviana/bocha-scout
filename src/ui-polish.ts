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

  window.location.assign('/');
}

function applyPolish() {
  polishBrand();
  polishResumeActions();
  polishSelectionScreen();
  polishHistoryAthleteFilter();
  polishSessionDetail();
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
