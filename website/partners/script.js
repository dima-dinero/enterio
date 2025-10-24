function initParallaxAnimation() {
  gsap.to('.parallax-images-wrapper .parallax-image.is-1', {
    y: '3%',
    ease: 'none',
    scrollTrigger: {
      trigger: '.parallax-images-wrapper',
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    },
  });

  gsap.to('.parallax-images-wrapper .parallax-image.is-2', {
    y: '-20%',
    ease: 'none',
    scrollTrigger: {
      trigger: '.parallax-images-wrapper',
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    },
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initParallaxAnimation();
});

let resizeTimeout;
let lastWidth = window.innerWidth;

window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (window.innerWidth !== lastWidth) {
      lastWidth = window.innerWidth;
      initParallaxAnimation();
    }
  }, 200);
});
