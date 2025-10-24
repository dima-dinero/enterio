function initAll() {
  initProjectsPreviewSliders();
  initLineAnimation();
  initParagraphAnimations();
  initButtonAnimations();
  formatElements();
}

document.addEventListener('DOMContentLoaded', () => {
  initAll();

  const container = document.querySelector('.projects-wrapper');
  if (container) {
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (
              node.nodeType === 1 &&
              node.classList.contains('project-item')
            ) {
              initAll();
            }
          });
        }
      }
    });
    observer.observe(container, { childList: true, subtree: true });
  }
});

window.addEventListener('resize', () => {
  clearTimeout(window.resizeTimeout);
  window.resizeTimeout = setTimeout(() => {
    if (window.innerWidth !== window.lastWidth) {
      window.lastWidth = window.innerWidth;
      initAll();
    }
  }, 200);
});
