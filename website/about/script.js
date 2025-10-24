function initMarqueeSlider() {
  document.querySelectorAll('.marquee-slider-track').forEach((track) => {
    const content = track.querySelector('.marquee-slider-content');
    if (!content) return;

    const clone = content.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);

    const isTop = track.classList.contains('is-top');
    const fromX = isTop ? '0%' : '-50%';
    const toX = isTop ? '-50%' : '0%';

    gsap.fromTo(
      track,
      { x: fromX },
      {
        x: toX,
        duration: 50,
        ease: 'none',
        repeat: -1,
      }
    );
  });
}

function initScaleVideoAnimation() {
  ScrollTrigger.matchMedia({
    '(min-width: 991px)': function () {
      let tl = gsap.timeline({
        scrollTrigger: {
          trigger: '#scale-video',
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
        },
      });

      tl.to(
        '.scale-video',
        {
          scale: 1,
          borderTopLeftRadius: '0em',
          borderBottomRightRadius: '0em',
          ease: 'none',
        },
        0
      );

      tl.to(
        '.scale-video_heading',
        {
          opacity: 1,
          y: 0,
          ease: 'none',
        },
        0.2
      );
    },
  });
}

function initEmployeesParallax() {
  ScrollTrigger.matchMedia({
    '(min-width: 991px)': function () {
      let tl = gsap.timeline({
        scrollTrigger: {
          trigger: '.employees-list',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });

      tl.to(
        '.employees-item:nth-child(even) .employee-inner',
        {
          y: -150,
          ease: 'none',
        },
        0
      );
    },
  });
}

function initEmployeesSlider() {
  if (window.innerWidth > 992) return;

  $('#employees-slider').each(function () {
    const listWrapper = $(this).find('.employees-list');

    listWrapper.addClass('swiper');
    listWrapper.wrapInner('<div class="swiper-wrapper"></div>');
    listWrapper.find('.employees-item').addClass('swiper-slide');

    const swiperEl = listWrapper.get(0);

    const swiper = new Swiper(swiperEl, {
      direction: 'horizontal',
      speed: 700,
      slidesPerView: 2,
      spaceBetween: 16,
      loop: true,
      grabCursor: true,
      autoplay: {
        delay: 3000,
      },
      mousewheel: commonMousewheel,
      breakpoints: {
        ...mobileBreakpoints,
      },
    });
    swiperEl.swiper = swiper;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initMarqueeSlider();
  initScaleVideoAnimation();
  initEmployeesParallax();
  initEmployeesSlider();
});
