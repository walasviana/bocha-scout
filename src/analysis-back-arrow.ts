import './analysis-back-arrow.css';

const normalize = (value: string | null | undefined) => String(value || '').replace(/\s+/g, ' ').trim();

function findButtonByText(root: ParentNode, labels: string[]) {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
    .find((button) => labels.includes(normalize(button.textContent))) || null;
}

function findHeading(text: string) {
  return Array.from(document.querySelectorAll<HTMLHeadingElement>('h1,h2,h3'))
    .find((heading) => normalize(heading.textContent) === text) || null;
}

function resolveBackAction() {
  const detailHeading = findHeading('Detalhes da sessão');
  const detailCard = detailHeading?.parentElement;
  if (detailCard) {
    const close = findButtonByText(detailCard, ['Voltar para minhas partidas', 'Fechar']);
    if (close) return () => close.click();
  }

  const myMatches = document.querySelector<HTMLElement>('.my-matches-view');
  if (myMatches) {
    const back = myMatches.querySelector<HTMLButtonElement>('.my-matches-back');
    if (back) return () => back.click();
  }

  const historyHeading = findHeading('Histórico do atleta');
  if (historyHeading) {
    const home = Array.from(document.querySelectorAll<HTMLButtonElement>('.home-section-nav button'))
      .find((button) => normalize(button.textContent) === 'Início');
    if (home) return () => home.click();
  }

  if (document.querySelector('.home-compare-screen')) {
    const home = Array.from(document.querySelectorAll<HTMLButtonElement>('.home-section-nav button'))
      .find((button) => normalize(button.textContent) === 'Início');
    if (home) return () => home.click();
  }

  return null;
}

function ensureBackArrow() {
  const header = document.querySelector<HTMLElement>('.hub-modern-header.account-toolbar');
  if (!header) return;

  const action = resolveBackAction();
  let button = header.querySelector<HTMLButtonElement>('.analysis-minimal-back');

  if (!action) {
    button?.remove();
    header.classList.remove('has-analysis-back');
    return;
  }

  header.classList.add('has-analysis-back');

  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'analysis-minimal-back';
    button.setAttribute('aria-label', 'Voltar para a tela anterior');
    button.setAttribute('title', 'Voltar');
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>';
    const brand = header.querySelector('.home-brand');
    header.insertBefore(button, brand || header.firstChild);
  }

  button.onclick = (event) => {
    event.preventDefault();
    resolveBackAction()?.();
    window.scrollTo(0, 0);
  };
}

let frame = 0;
function schedule() {
  if (frame) return;
  frame = window.requestAnimationFrame(() => {
    frame = 0;
    ensureBackArrow();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', schedule, { once: true });
} else {
  schedule();
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
