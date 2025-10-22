const commonMousewheel = {
  enabled: true,
  forceToAxis: true,
  sensitivity: 1,
  thresholdDelta: 50,
  releaseOnEdges: true,
};

const mobileBreakpoints = {
  320: {
    slidesPerView: 1.1,
    spaceBetween: 16,
    mousewheel: { enabled: false },
    slidesOffsetBefore: 16,
    slidesOffsetAfter: 16,
    centeredSlides: false,
  },
  480: {
    slidesPerView: 1.5,
    spaceBetween: 16,
    mousewheel: { enabled: false },
    slidesOffsetBefore: 16,
    slidesOffsetAfter: 16,
    centeredSlides: false,
  },
  768: {
    slidesPerView: 1.8,
    spaceBetween: 16,
    mousewheel: { enabled: false },
    slidesOffsetBefore: 32,
    slidesOffsetAfter: 32,
    centeredSlides: false,
  },
};

function initMobileVh() {
  function isMobile() {
    return window.innerWidth <= 479;
  }

  function setVh() {
    if (!isMobile()) return;
    const vh =
      Math.min(window.innerHeight, document.documentElement.clientHeight) *
      0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  setVh();

  window.addEventListener('resize', setVh);
  window.addEventListener('orientationchange', setVh);
}

function initLenis() {
  const lenis = new Lenis({
    lerp: 0.12,
    wheelMultiplier: 0.9,
    infinite: false,
    gestureOrientation: 'vertical',
    normalizeWheel: false,
    smoothTouch: false,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
    lenis.resize();
  });

  document.fonts?.ready.then(ScrollTrigger.refresh);
  ScrollTrigger.addEventListener('refresh', () => lenis.resize());

  $('[data-lenis-start]').on('click', () => lenis.start());
  $('[data-lenis-stop]').on('click', () => lenis.stop());
  $('[data-lenis-toggle]').on('click', function () {
    $(this).toggleClass('stop-scroll');
    $(this).hasClass('stop-scroll') ? lenis.stop() : lenis.start();
  });

  return lenis;
}
function initMenu() {
  const menu = document.querySelector('.menu');
  const toggleBtn = document.querySelector('.menu-toggle');
  const menuLines = document.querySelectorAll('.menu-toggle_line');
  const menuLinks = document.querySelectorAll('.menu_link');
  const menuBottomButtons = document.querySelectorAll(
    '.menu_bottom .circle-button_wrapper'
  );
  const heroToggleBtn = document.querySelector('.hero_menu-toggle');

  if (!menu || !toggleBtn) return;

  gsap.set(menu, { y: '-100%', opacity: 0, pointerEvents: 'none' });
  gsap.set(menuLinks, { y: '100%' });
  gsap.set(menuBottomButtons, { scale: 0.6, opacity: 0 });

  const lineHeight = menuLines[0].offsetHeight;
  const moveY = lineHeight + 4;

  const menuTl = gsap.timeline({
    paused: true,
    reversed: true,
    defaults: { ease: 'power2.inOut' },
  });

  menuTl.eventCallback('onReverseComplete', () => {
    if (!window.scrollEnabled) {
      window.toggleNavbar(false);
    }
  });

  menuTl
    .set(menu, { opacity: 1, pointerEvents: 'auto' })
    .to(menu, { y: '0%', duration: 0.6 })
    .to(menuLines[0], { y: moveY, rotate: 45, duration: 0.4 }, '<')
    .to(menuLines[1], { opacity: 0, duration: 0.4 }, '<')
    .to(menuLines[2], { y: -moveY, rotate: -45, duration: 0.4 }, '<')
    .to(menuLinks, { y: 0, duration: 0.5, stagger: 0.04 }, '-=0.15')
    .to(
      menuBottomButtons,
      {
        scale: 1,
        opacity: 1,
        duration: 0.5,
        ease: 'power2.out',
        stagger: {
          each: 0.04,
          from: 'start',
        },
      },
      '-=0.2'
    );

  toggleBtn.addEventListener('click', () => {
    if (menuTl.reversed()) {
      menuTl.play();
      window.toggleNavbar(true);
    } else {
      menuTl.reverse();
    }
  });

  function closeMenu() {
    if (!menuTl.reversed()) toggleBtn.click();
  }

  menuLinks.forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  if (heroToggleBtn) {
    heroToggleBtn.addEventListener('click', () => {
      toggleBtn.click();
    });
  }
}

function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const heroSection = document.querySelector('.section.is-hero');

  let lastScrollY = window.scrollY;
  let scrollDirection = 0;
  let isInHero = !!heroSection;

  window.scrollEnabled = !isInHero;

  window.toggleNavbar = function (show) {
    gsap.to(navbar, {
      y: show ? '0em' : '-5em',
      duration: 0.6,
      ease: 'power2.out',
    });
  };

  function handleScroll() {
    const currentScroll = window.scrollY;
    const scrollDelta = Math.abs(currentScroll - lastScrollY);
    const nearBottom =
      window.innerHeight + currentScroll >= document.body.scrollHeight - 100;

    if (!window.scrollEnabled || scrollDelta < 5 || nearBottom) return;

    if (currentScroll > lastScrollY && scrollDirection !== 2) {
      scrollDirection = 2;
      window.toggleNavbar(false);
    } else if (currentScroll < lastScrollY && scrollDirection !== 1) {
      scrollDirection = 1;
      window.toggleNavbar(true);
    }

    lastScrollY = currentScroll;
  }

  function setupScrollTriggers() {
    if (!heroSection) return;

    ScrollTrigger.create({
      trigger: heroSection,
      start: 'top top',
      end: 'bottom top',
      onEnter: () => {
        window.scrollEnabled = false;
        window.toggleNavbar(false);
      },
      onLeave: () => {
        window.scrollEnabled = true;
      },
      onEnterBack: () => {
        window.scrollEnabled = false;
        window.toggleNavbar(false);
      },
      onLeaveBack: () => {
        window.scrollEnabled = true;
      },
    });
  }

  if (isInHero) {
    gsap.set(navbar, { y: '-5em' });
  }

  setupScrollTriggers();
  window.addEventListener('scroll', handleScroll);
  ScrollTrigger.refresh();
}

function initSliders() {
  $('#services-slider').each(function () {
    const swiperEl = $(this).find('.swiper').get(0);
    if (!swiperEl) return;

    new Swiper(swiperEl, {
      direction: 'horizontal',
      speed: 700,
      slidesPerView: 3,
      spaceBetween: 24,
      loop: true,
      autoplay: { delay: 3000 },
      pagination: {
        el: $(this).find('.swiper-progress').get(0),
        type: 'progressbar',
      },
      mousewheel: commonMousewheel,
      breakpoints: {
        ...mobileBreakpoints,
        992: { slidesPerView: 3, mousewheel: { ...commonMousewheel } },
      },
      navigation: {
        nextEl: $(this).find('.swiper-next')[0],
        prevEl: $(this).find('.swiper-prev')[0],
        disabledClass: 'is-disabled',
      },
    });
  });

  $('#projects-slider').each(function () {
    const swiperEl = $(this).find('.swiper').get(0);
    if (!swiperEl) return;

    new Swiper(swiperEl, {
      direction: 'horizontal',
      speed: 700,
      slidesPerView: 1.4,
      spaceBetween: 24,
      loop: true,
      centeredSlides: true,
      parallax: true,
      grabCursor: true,
      mousewheel: commonMousewheel,
      breakpoints: {
        ...mobileBreakpoints,
        992: {
          slidesPerView: 1.4,
          spaceBetween: 24,
          mousewheel: { ...commonMousewheel },
          centeredSlides: true,
        },
      },
      navigation: {
        nextEl: $(this).find('.swiper-next')[0],
        prevEl: $(this).find('.swiper-prev')[0],
        disabledClass: 'is-disabled',
      },
    });
  });

  $('#reels-slider').each(function () {
    const swiperEl = $(this).find('.swiper').get(0);
    if (!swiperEl) return;

    const swiper = new Swiper(swiperEl, {
      direction: 'horizontal',
      speed: 700,
      slidesPerView: 4,
      spaceBetween: 24,
      loop: true,
      grabCursor: true,
      autoplay: { delay: 3000 },
      pagination: {
        el: $(this).find('.swiper-progress').get(0),
        type: 'progressbar',
      },
      mousewheel: commonMousewheel,
      breakpoints: {
        ...mobileBreakpoints,
        992: { slidesPerView: 4, mousewheel: { ...commonMousewheel } },
      },
    });

    swiperEl.swiper = swiper;
  });

  $('#reviews-slider').each(function () {
    const swiperEl = $(this).find('.swiper').get(0);
    if (!swiperEl) return;

    new Swiper(swiperEl, {
      direction: 'horizontal',
      speed: 700,
      slidesPerView: 3,
      spaceBetween: 24,
      loop: true,
      grabCursor: true,
      autoplay: { delay: 3000 },
      mousewheel: commonMousewheel,
      pagination: {
        el: $(this).find('.swiper-progress').get(0),
        type: 'progressbar',
      },
      breakpoints: {
        ...mobileBreakpoints,
        992: {
          slidesPerView: 3,
          spaceBetween: 24,
          mousewheel: { ...commonMousewheel },
        },
      },
    });
  });

  ['#articles-slider', '#tariffs-slider', '#benefits-slider'].forEach(
    (selector) => {
      $(selector).each(function () {
        const swiperEl = $(this).find('.swiper').get(0);
        if (!swiperEl) return;

        new Swiper(swiperEl, {
          direction: 'horizontal',
          speed: 700,
          slidesPerView: 3,
          spaceBetween: 24,
          grabCursor: true,
          pagination: {
            el: $(this).find('.swiper-progress').get(0),
            type: 'progressbar',
          },
          mousewheel: commonMousewheel,
          breakpoints: {
            ...mobileBreakpoints,
            992: { slidesPerView: 3, mousewheel: { ...commonMousewheel } },
          },
          navigation: {
            nextEl: $(this).find('.swiper-next')[0],
            prevEl: $(this).find('.swiper-prev')[0],
            disabledClass: 'is-disabled',
          },
        });
      });
    }
  );
}

function initProjectsPreviewSliders(root = document) {
  $(root)
    .find('.project-preview.w-dyn-list')
    .each(function () {
      const swiperEl = this;
      if (!swiperEl || swiperEl.swiper) return;

      const parent = $(swiperEl).parent();

      new Swiper(swiperEl, {
        direction: 'horizontal',
        speed: 700,
        slidesPerView: 1,
        spaceBetween: 0,
        loop: true,
        grabCursor: true,
        mousewheel: commonMousewheel,
        breakpoints: {
          ...mobileBreakpoints,
          992: {
            slidesPerView: 1,
            spaceBetween: 0,
            mousewheel: { ...commonMousewheel },
            centeredSlides: true,
          },
        },
        navigation: {
          nextEl: parent.find('.swiper-next')[0],
          prevEl: parent.find('.swiper-prev')[0],
          disabledClass: 'is-disabled',
        },
      });
    });
}

function initAccordions() {
  const accordions = document.querySelectorAll('.accordions-item');
  let openItem = null;

  accordions.forEach((item) => {
    const top = item.querySelector('.accordion-top');
    const bottom = item.querySelector('.accordion-bottom');
    const button = item.querySelector('.accordion-button');

    top.addEventListener('click', () => {
      const isOpen = item === openItem;

      if (openItem && openItem !== item) {
        const openBottom = openItem.querySelector('.accordion-bottom');
        const openButton = openItem.querySelector('.accordion-button');

        openBottom.style.height = openBottom.scrollHeight + 'px';
        requestAnimationFrame(() => {
          openBottom.style.height = '0px';
        });

        openButton.classList.remove('rotated');
        openItem = null;
      }

      if (!isOpen) {
        bottom.style.height = bottom.scrollHeight + 'px';
        button.classList.add('rotated');
        openItem = item;

        bottom.addEventListener('transitionend', function handler() {
          if (item === openItem) {
            bottom.style.height = 'auto';
          }
          bottom.removeEventListener('transitionend', handler);
        });
      } else {
        bottom.style.height = bottom.scrollHeight + 'px';
        requestAnimationFrame(() => {
          bottom.style.height = '0px';
        });
        button.classList.remove('rotated');
        openItem = null;
      }
    });
  });
}

function initLineAnimation(selector = '[js-line-animation]') {
  const textEls = document.querySelectorAll(selector);

  textEls.forEach((textEl) => {
    new SplitType(textEl, { types: 'words' });

    textEl.querySelectorAll('.word').forEach((word) => {
      word.innerHTML = `<span class="word-inner" style="display: inline-block;">${word.innerHTML}</span>`;
    });

    gsap.set(textEl, { autoAlpha: 1 });
    gsap.set(textEl.querySelectorAll('.word-inner'), { yPercent: 120 });

    gsap.to(textEl.querySelectorAll('.word-inner'), {
      yPercent: 0,
      duration: 0.8,
      stagger: 0.02,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: textEl,
        start: 'top 80%',
        toggleActions: 'play none none none',
        once: true,
      },
    });
  });
}

function initSectionHeadings() {
  document.querySelectorAll('.section-heading_wrapper').forEach((wrapper) => {
    const inner = wrapper.querySelector('.section-heading_inner');

    gsap.set(inner, { width: 0 });

    gsap.to(inner, {
      scrollTrigger: {
        trigger: wrapper,
        start: 'top 90%',
      },
      width: 'auto',
      duration: 1,
      ease: 'power2.out',
    });
  });
}

function initParagraphAnimations() {
  gsap.utils.toArray('[data-animation="paragraph"]').forEach((element) => {
    gsap.set(element, { opacity: 0 });

    gsap.to(element, {
      scrollTrigger: {
        trigger: element,
        start: 'top 80%',
      },
      opacity: 1,
      duration: 1.5,
      ease: 'power2.out',
    });
  });
}

function initButtonAnimations() {
  gsap.utils.toArray('.button').forEach((button) => {
    if (button.getAttribute('disable-animation') === 'true') return;

    const text = button.querySelector('.button_text-wrapper');
    const icon = button.querySelector('.button_icon');

    gsap.set(text, { x: '-2em', opacity: 0 });
    gsap.set(icon, { scale: 0 });

    ScrollTrigger.create({
      trigger: button,
      start: 'top 90%',
      onEnter: () => {
        gsap.to(text, {
          x: '0em',
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
        });

        gsap.to(icon, {
          scale: 1,
          duration: 0.6,
          ease: 'back.out(1.7)',
        });
      },
      once: true,
    });
  });
}

function initSocialButtonAnimations() {
  gsap.utils.toArray('.social-buttons_wrapper').forEach((wrapper) => {
    const circleButtons = gsap.utils
      .toArray(wrapper.querySelectorAll('.circle-button'))
      .filter(
        (circleButton) =>
          circleButton.getAttribute('disable-animation') !== 'true'
      );

    if (circleButtons.length === 0) return;

    gsap.set(circleButtons, { scale: 0.6, opacity: 0 });

    ScrollTrigger.create({
      trigger: wrapper,
      start: 'top 80%',
      onEnter: () => {
        gsap.to(circleButtons, {
          scale: 1,
          opacity: 1,
          duration: 1,
          ease: 'back.out(1.7)',
          stagger: {
            each: 0.05,
            from: 'start',
          },
        });
      },
      once: true,
    });
  });
}

function initMagneticButtons() {
  if (window.innerWidth <= 991) return;

  document.querySelectorAll('.circle-button_wrapper').forEach((button) => {
    let isHovering = false;

    const onMove = (e) => {
      if (!isHovering) return;

      const rect = button.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;

      const moveX = (relX - rect.width / 2) * 0.3;
      const moveY = (relY - rect.height / 2) * 0.3;

      gsap.to(button, {
        x: moveX,
        y: moveY,
        duration: 0.3,
        ease: 'power2.out',
      });
    };

    button.addEventListener('mouseenter', () => {
      isHovering = true;
      window.addEventListener('mousemove', onMove);
    });

    button.addEventListener('mouseleave', () => {
      isHovering = false;
      gsap.to(button, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: 'elastic.out(1, 0.5)',
      });
      window.removeEventListener('mousemove', onMove);
    });
  });
}

function initParallax() {
  document.querySelectorAll('.is-hero').forEach((heroSection) => {
    const visuals = heroSection.querySelector('.visuals');
    const content = heroSection.querySelector('.hero_content-wrapper');

    if (visuals && content) {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: heroSection,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        })
        .to(
          visuals,
          {
            yPercent: 20,
            ease: 'none',
          },
          0
        )
        .to(
          content,
          {
            yPercent: 30,
            ease: 'none',
          },
          0
        );
    }
  });
}

function initImageReveal() {
  document.querySelectorAll('[data-reveal="wrapper"]').forEach((wrapper) => {
    const image = wrapper.querySelector('[data-reveal="image"]');
    const overlay = wrapper.querySelector('[data-reveal="overlay"]');

    if (image && overlay) {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapper,
          start: 'top 70%',
        },
      });

      tl.fromTo(
        image,
        { scale: 1.1 },
        { scale: 1, duration: 1, ease: 'power2.inOut' }
      );

      tl.fromTo(
        overlay,
        { yPercent: 0 },
        { yPercent: 100, duration: 1, ease: 'power2.inOut' },
        '<'
      );
    }
  });
}

function initForms() {
  const fakeButtons = document.querySelectorAll('.button[data-submit="fake"]');

  fakeButtons.forEach((fakeButton) => {
    const form = fakeButton.closest('form');
    if (!form) return;

    const trueSubmit = form.querySelector('input[data-submit="true"]');
    const buttonText = fakeButton.querySelector('.button_text');
    const arrowWrapper = fakeButton.querySelector('.button_arrow-wrapper');
    const loader = fakeButton.querySelector('.circle-loader');
    const phoneInput = form.querySelector('input[data-field="phone"]');

    if (loader) loader.style.display = 'none';

    // Копируем токен Turnstile перед отправкой формы
    function copyTurnstileToken() {
      const turnstileWidget = form.querySelector('.cf-turnstile');
      if (turnstileWidget) {
        // Токен, созданный Turnstile автоматически (внутри виджета)
        const autoToken = turnstileWidget.querySelector('input[name="cf-turnstile-response"]');

        // Находим все поля с именем cf-turnstile-response
        const allTokens = form.querySelectorAll('input[name="cf-turnstile-response"]');

        // Берем то поле, которое НЕ внутри виджета (наше скрытое поле)
        const manualToken = Array.from(allTokens).find(input => !turnstileWidget.contains(input));

        if (autoToken && autoToken.value && manualToken) {
          manualToken.value = autoToken.value;
          console.log('[Turnstile] Token copied from widget to form field, length:', autoToken.value.length);
        } else {
          console.warn('[Turnstile] Could not copy token - autoToken:', !!autoToken, 'value:', !!autoToken?.value, 'manualToken:', !!manualToken);
        }
      }
    }

    if (trueSubmit && phoneInput && buttonText && arrowWrapper) {
      fakeButton.addEventListener('click', function () {
        // Проверка Turnstile токена (временно только логирование)
        const turnstileResponse = form.querySelector(
          'input[name="cf-turnstile-response"]'
        );
        if (!turnstileResponse || !turnstileResponse.value) {
          console.warn('[Turnstile] Token not found on frontend - form will still submit');
          // Временно не блокируем отправку
          // alert(
          //   'Пожалуйста, пройдите проверку безопасности. Попробуйте обновить страницу.'
          // );
          // return;
        } else {
          console.log('[Turnstile] Token found on frontend, length:', turnstileResponse.value.length);
        }

        const phoneValue = phoneInput.value.trim();
        const isPhoneComplete = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(
          phoneValue
        );

        if (!form.checkValidity() || !isPhoneComplete) {
          phoneInput.setCustomValidity(
            isPhoneComplete ? '' : 'Пожалуйста, введите полный номер телефона'
          );
          form.reportValidity();
          return;
        }

        phoneInput.setCustomValidity('');

        // Копируем токен Turnstile из виджета в скрытое поле формы
        copyTurnstileToken();

        // Логируем все поля формы перед отправкой
        const formData = new FormData(form);
        console.log('[Debug] Form fields before submit:');
        for (let [key, value] of formData.entries()) {
          console.log(`  ${key}:`, value);
        }

        fakeButton.style.pointerEvents = 'none';
        buttonText.textContent = 'Подождите';
        arrowWrapper.style.display = 'none';
        loader.style.display = 'block';

        trueSubmit.click();
      });

      form.addEventListener('w-form-done', function () {
        fakeButton.style.pointerEvents = 'auto';
        buttonText.textContent = 'Отправить';
        arrowWrapper.style.display = 'block';
        loader.style.display = 'none';
      });

      form.addEventListener('w-form-fail', function () {
        fakeButton.style.pointerEvents = 'auto';
        buttonText.textContent = 'Отправить';
        arrowWrapper.style.display = 'block';
        loader.style.display = 'none';
      });
    }

    const nameInputs = form.querySelectorAll('input[data-field="name"]');
    nameInputs.forEach((input) => {
      input.addEventListener('input', function () {
        const originalValue = this.value;
        const filteredValue = originalValue.replace(/[^А-Яа-яЁё\s]/g, '');

        if (originalValue !== filteredValue) {
          this.setCustomValidity(
            'Пожалуйста, переключитесь на русскую раскладку'
          );
        } else {
          this.setCustomValidity('');
        }

        this.value = filteredValue;
        this.reportValidity();
      });
    });
  });

  $('input[data-field="phone"]').mask('+7 (000) 000-00-00', {});
  $('input[data-field="phone"]').on('focus', function () {
    if (!$(this).val()) $(this).val('+7 ');
  });
}

function initDatePicker() {
  new AirDatepicker('input[name="date"]', {
    autoClose: true,
    dateFormat: 'dd.MM.yyyy',
    locale: {
      days: [
        'Воскресенье',
        'Понедельник',
        'Вторник',
        'Среда',
        'Четверг',
        'Пятница',
        'Суббота',
      ],
      daysShort: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
      daysMin: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
      months: [
        'Январь',
        'Февраль',
        'Март',
        'Апрель',
        'Май',
        'Июнь',
        'Июль',
        'Август',
        'Сентябрь',
        'Октябрь',
        'Ноябрь',
        'Декабрь',
      ],
      monthsShort: [
        'Янв',
        'Фев',
        'Мар',
        'Апр',
        'Май',
        'Июн',
        'Июл',
        'Авг',
        'Сен',
        'Окт',
        'Ноя',
        'Дек',
      ],
      today: 'Сегодня',
      clear: 'Очистить',
      dateFormat: 'dd.MM.yyyy',
      timeFormat: 'HH:mm',
      firstDay: 1,
    },
  });
}

let heroSplitReady = false;

function animateHeroVisuals(startAt = 0) {
  const visuals = document.querySelector('[data-hero-visuals]');
  if (!visuals) return gsap.timeline();

  return gsap
    .timeline()
    .fromTo(
      visuals,
      { scale: 1.1 },
      { scale: 1, duration: 1, ease: 'power2.inOut' },
      startAt
    );
}
function splitHeroHeading(element, { forResize = false } = {}) {
  try {
    SplitType.revert(element);
  } catch (_) {}

  new SplitType(element, { types: 'words' });

  element.querySelectorAll('div.word').forEach((div) => {
    const span = document.createElement('span');
    span.className = 'word';
    span.innerHTML = div.innerHTML;
    div.replaceWith(span);
  });

  element.querySelectorAll('.word').forEach((word) => {
    word.innerHTML = `<span class="word-inner">${word.innerHTML}</span>`;
  });

  gsap.set(element, { autoAlpha: 1 });

  if (!forResize && !heroSplitReady) {
    gsap.set(element.querySelectorAll('.word-inner'), { yPercent: 120 });
  }
}
function runIntroAnimations() {
  const logoWrapper = document.querySelector('.hero_logo-overflow');
  const paragraph = document.querySelector('.hero_paragraph');
  const heroHeading = document.querySelector('.hero_heading');
  const projectTexts = document.querySelectorAll('.hero_project-text');

  const tl = gsap.timeline();

  if (logoWrapper || paragraph) {
    if (logoWrapper) {
      tl.fromTo(
        logoWrapper,
        { width: 0 },
        {
          width: () => logoWrapper.scrollWidth,
          duration: 1.2,
          ease: 'power2.inOut',
        },
        0
      );
    }

    if (paragraph) {
      tl.fromTo(
        paragraph,
        { opacity: 0 },
        { opacity: 1, duration: 1.5, ease: 'power2.out' },
        '-=0.6'
      );
    }
  }

  if (heroHeading) {
    splitHeroHeading(heroHeading);
    tl.fromTo(
      heroHeading.querySelectorAll('.word-inner'),
      { yPercent: 120 },
      { yPercent: 0, duration: 1, stagger: 0.03, ease: 'power2.out' },
      0
    );
  }

  if (projectTexts.length) {
    tl.fromTo(
      projectTexts,
      { y: '1.5em', opacity: 0 },
      { y: '0em', opacity: 1, duration: 0.8, ease: 'power2.out', stagger: 0.1 },
      heroHeading ? 0.3 : 0.1
    );
  }

  tl.add(animateHeroVisuals(0), 0);
  tl.add(() => {
    heroSplitReady = true;
  }, '>');
  return tl;
}

function animateNavbarAndSocial(delay = 0) {
  const socialLinks = document.querySelectorAll('.hero_link-wrapper');
  const socialIcons = document.querySelectorAll('.hero_link-icon');
  const breadCrumbs = document.querySelectorAll('.bread-crumb');
  const arrow = document.querySelector('.hero_arrow-wrapper');
  const navbar = document.querySelector('.hero_navbar');

  const tl = gsap.timeline({ delay });

  if (navbar) {
    tl.fromTo(
      navbar,
      { y: '-8em' },
      { y: '0em', duration: 0.8, ease: 'power2.out' },
      0
    );
  }

  if (socialLinks.length) {
    tl.fromTo(
      socialLinks,
      { y: '1em' },
      { y: '0em', duration: 0.8, ease: 'power2.out', stagger: 0.1 },
      0.1
    );
  }

  if (socialIcons.length) {
    tl.fromTo(
      socialIcons,
      { scale: 0 },
      { scale: 1, duration: 0.6, ease: 'back.out(1.7)', stagger: 0.1 },
      0.2
    );
  }

  if (breadCrumbs.length) {
    tl.fromTo(
      breadCrumbs,
      { y: '1.5em', opacity: 0 },
      { y: '0em', opacity: 1, duration: 0.8, ease: 'power2.out', stagger: 0.1 },
      0.1
    );
  }

  if (arrow) {
    tl.fromTo(
      arrow,
      { opacity: 0 },
      { opacity: 1, duration: 0.8, ease: 'power1.out' },
      0.4
    );
  }

  return tl;
}

function attachResizeHandler() {
  const logoWrapper = document.querySelector('.hero_logo-overflow');
  const heroHeading = document.querySelector('.hero_heading');

  let lastWidth =
    (window.visualViewport && window.visualViewport.width) || window.innerWidth;
  let timer;

  function resizeHandler() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const w =
        (window.visualViewport && window.visualViewport.width) ||
        window.innerWidth;
      if (Math.abs(w - lastWidth) > 8) {
        lastWidth = w;
        if (heroHeading) splitHeroHeading(heroHeading, { forResize: true });
        if (logoWrapper)
          gsap.set(logoWrapper, { width: logoWrapper.scrollWidth });
      }
    }, 150);
  }

  window.addEventListener('resize', resizeHandler, { passive: true });
  window.addEventListener('orientationchange', resizeHandler, {
    passive: true,
  });
}

function initHeroAnimations() {
  const masterTimeline = gsap.timeline();
  masterTimeline.add(runIntroAnimations(), 0);
  masterTimeline.add(animateNavbarAndSocial(0.6), 0.6);

  attachResizeHandler();
}

function formatElements() {
  document.querySelectorAll('[data-format="counter"]').forEach((el) => {
    const num = parseInt(el.textContent.trim(), 10);
    if (!isNaN(num)) {
      el.textContent = String(num).padStart(2, '0');
    }
  });

  document.querySelectorAll('[data-format="area"]').forEach((element) => {
    const currentText = element.textContent.trim();
    if (!currentText.endsWith('м²')) {
      element.textContent = currentText + ' м²';
    }
  });
}

function initTeamBenefitsAnimation() {
  const container = document.querySelector('.team_benefits-layout');
  if (!container) return;

  if (window.innerWidth > 991) {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
    });

    tl.fromTo(
      container.querySelectorAll('.team_vertical-line'),
      { height: '0%' },
      {
        height: '95%',
        duration: 1,
        ease: 'power2.inOut',
      }
    );

    tl.fromTo(
      container.querySelectorAll('.team_horizontal-line'),
      { width: '0%' },
      {
        width: '95%',
        duration: 1,
        ease: 'power2.inOut',
      },
      '<'
    );
  } else {
    const horizontalLines = container.querySelectorAll('.team_horizontal-line');

    horizontalLines.forEach((line) => {
      gsap.fromTo(
        line,
        { width: '0%' },
        {
          width: '95%',
          duration: 1,
          ease: 'power2.inOut',
          scrollTrigger: {
            trigger: line,
            start: 'top 80%',
            end: 'bottom 60%',
            toggleActions: 'play none none none',
          },
        }
      );
    });
  }
}
function initMarquee() {
  const track = document.querySelector('.partners-marquee_track');
  if (!track) return;

  if (track.children.length === 1) {
    const clone = track.children[0].cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  }

  const firstGroupWidth = track.children[0].offsetWidth;

  gsap.to(track, {
    x: -firstGroupWidth,
    duration: 25,
    ease: 'none',
    repeat: -1,
    modifiers: {
      x: gsap.utils.unitize((x) => parseFloat(x) % firstGroupWidth),
    },
  });
}

function initRouteLinks() {
  var destLat = 55.761999;
  var destLon = 37.510888;
  var address = 'Москва, Шелепихинская набережная, 34к2зд3, 123290';

  var navLink =
    'yandexnavi://build_route_on_map?lat_to=' + destLat + '&lon_to=' + destLon;
  var webLink =
    'https://yandex.ru/maps/?mode=routes&rtext=~' +
    encodeURIComponent(address) +
    '&rtt=auto';

  document.querySelectorAll('[data-action="go-route"]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();

      var t = Date.now();
      var iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = navLink;
      document.body.appendChild(iframe);

      setTimeout(function () {
        if (Date.now() - t < 1500) {
          window.open(webLink, '_blank');
        }
        document.body.removeChild(iframe);
      }, 800);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  formatElements();
  initSliders();
  initAccordions();
  initLineAnimation();
  initSectionHeadings();
  initParagraphAnimations();
  initButtonAnimations();
  initSocialButtonAnimations();
  initParallax();
  initImageReveal();
  initForms();
  initDatePicker();
  initHeroAnimations();
  initTeamBenefitsAnimation();
  initMarquee();
  initLenis();
  initMenu();
  initNavbar();
  initMagneticButtons();
  initRouteLinks();
  initMobileVh();
});

let resizeTimeout;
let lastWidth = window.innerWidth;

window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (window.innerWidth !== lastWidth) {
      lastWidth = window.innerWidth;
      formatElements();
      initSliders();
      initAccordions();
      initLineAnimation();
      initSectionHeadings();
      initParagraphAnimations();
      initButtonAnimations();
      initSocialButtonAnimations();
      initParallax();
      initImageReveal();
      initForms();
      initDatePicker();
      initHeroAnimations();
      initTeamBenefitsAnimation();
      initMarquee();
      initLenis();
      initMenu();
      initNavbar();
      initMagneticButtons();
      initRouteLinks();
      initMobileVh();
    }
  }, 200);
});
