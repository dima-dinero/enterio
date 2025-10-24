function initProjectVideoWrappers() {
  const wrappers = document.querySelectorAll('.project-video_wrapper');

  wrappers.forEach((wrapper) => {
    wrapper.addEventListener('click', function () {
      const preview = wrapper.querySelector('.project-video_preview');
      if (preview) {
        preview.style.display = 'none';
      }
    });
  });
}

function initNextProjectButton() {
  const btn = document.getElementById('next-project');
  if (!btn) return;

  const getNextProjectUrl = () => {
    const links = Array.from(
      document.querySelectorAll('[data-project-urls] [data-project-url]')
    );
    if (!links.length) return null;

    const clean = (p) => (p || '').replace(/\/+$/, '');

    const currentPath = clean(location.pathname);
    let idx = links.findIndex((a) => clean(a.pathname) === currentPath);

    if (idx === -1) {
      const abs = clean(location.origin + location.pathname);
      idx = links.findIndex(
        (a) =>
          clean(new URL(a.getAttribute('href'), location.origin).href) === abs
      );
    }

    const nextIdx = idx >= 0 ? (idx + 1) % links.length : 0;
    const href = links[nextIdx].getAttribute('href');
    return href ? new URL(href, location.origin).toString() : null;
  };

  let nextUrl = btn.getAttribute('data-next-url') || getNextProjectUrl();

  if (!nextUrl) {
    btn.setAttribute('disabled', 'true');
    btn.classList.add('is-disabled');
    return;
  }

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const target = btn.getAttribute('data-next-url') || getNextProjectUrl();
    if (target) window.location.assign(target);
  });

  if (btn.tagName === 'A' && !btn.getAttribute('href')) {
    btn.setAttribute('href', nextUrl);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initNextProjectButton();
  initProjectVideoWrappers();
  initProjectsPreviewSliders();
});

window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (window.innerWidth !== lastWidth) {
      lastWidth = window.innerWidth;
      initNextProjectButton();
      initProjectVideoWrappers();
      initProjectsPreviewSliders();
    }
  }, 200);
});
