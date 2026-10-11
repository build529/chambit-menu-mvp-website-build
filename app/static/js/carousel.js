document.addEventListener('DOMContentLoaded', () => {
  const containers = document.querySelectorAll('.ad-carousel-container');

  containers.forEach((container) => {
    const track = container.querySelector('.ad-carousel-track');
    const dots = container.querySelectorAll('.carousel-dot');
    if (!track) return;

    const slides = track.querySelectorAll('.ad-slide');
    const totalSlides = slides.length;
    if (totalSlides === 0) return;

    // Infer slot location from element ID (e.g., 'top-banner-carousel' -> 'top_banner')
    const slotLocation = track.id ? track.id.replace('-carousel', '').replace(/-/g, '_') : 'unknown_slot';

    let isContainerInViewport = false;

    // 1. Viewport Visibility Observer (Detects when container is at least 50% on screen)
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isContainerInViewport = entry.isIntersecting;
        if (isContainerInViewport) {
          // Send impression for current slide if visible on screen
          checkAndSendImpression(slides[currentSlideIndex]);
        }
      });
    }, { threshold: 0.5 });

    observer.observe(container);

    // 2. Impression Dispatcher with "Once per Page Load" Safeguard
    function checkAndSendImpression(slideElement) {
      if (!slideElement) return;

      // Only send if: Container is visible AND this slide hasn't fired an impression yet
      if (isContainerInViewport && slideElement.dataset.impressionSent !== 'true') {
        const sponsorName = slideElement.getAttribute('data-sponsor');

        if (typeof gtag === 'function' && sponsorName) {
          gtag('event', 'ad_impression', {
            'slot_location': slotLocation,
            'sponsor_name': sponsorName
          });
          slideElement.dataset.impressionSent = 'true'; // Mark as logged for this session
        }
      }
    }

    const SLIDE_DURATION = 3500; // 3.5 seconds per slide
    const USER_PAUSE_DURATION = 5000; // 5 seconds cooldown after manual swipe

    let autoSlideInterval = null;
    let cooldownTimer = null;
    let isUserInteracting = false;
    let currentSlideIndex = 0;

    function scrollToIndex(index) {
      currentSlideIndex = (index + totalSlides) % totalSlides;
      const targetSlide = slides[currentSlideIndex];
      if (!targetSlide) return;

      track.scrollTo({
        left: targetSlide.offsetLeft,
        behavior: 'smooth'
      });
      updateDots(currentSlideIndex);

      // Attempt impression tracking for newly displayed slide
      checkAndSendImpression(targetSlide);
    }

    function updateDots(activeIndex) {
      dots.forEach((dot, idx) => {
        if (idx === activeIndex) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }

    function getGlobalSlideIndex() {
      const now = Date.now();
      return Math.floor(now / SLIDE_DURATION) % totalSlides;
    }

    function tickAutoSlide() {
      if (isUserInteracting) return;
      const targetIndex = getGlobalSlideIndex();
      scrollToIndex(targetIndex);
    }

    function startGlobalAutoSlide() {
      clearInterval(autoSlideInterval);
      clearTimeout(cooldownTimer);

      const initialIndex = getGlobalSlideIndex();
      scrollToIndex(initialIndex);

      const now = Date.now();
      const timeRemaining = SLIDE_DURATION - (now % SLIDE_DURATION);

      cooldownTimer = setTimeout(() => {
        tickAutoSlide();
        autoSlideInterval = setInterval(tickAutoSlide, SLIDE_DURATION);
      }, timeRemaining);
    }

    function handleUserTouchStart() {
      isUserInteracting = true;
      clearInterval(autoSlideInterval);
      clearTimeout(cooldownTimer);
    }

    function handleUserTouchEnd() {
      clearTimeout(cooldownTimer);
      cooldownTimer = setTimeout(() => {
        isUserInteracting = false;
        startGlobalAutoSlide();
      }, USER_PAUSE_DURATION);
    }

    // Touch and mouse interaction event listeners
    track.addEventListener('touchstart', handleUserTouchStart, { passive: true });
    track.addEventListener('touchend', handleUserTouchEnd, { passive: true });
    track.addEventListener('mousedown', handleUserTouchStart);
    track.addEventListener('mouseup', handleUserTouchEnd);

    // Sync dots and track impression on manual scroll/swipe
    track.addEventListener('scroll', () => {
      const slideWidth = track.clientWidth || track.offsetWidth;
      if (slideWidth > 0) {
        const nearestIndex = Math.round(track.scrollLeft / slideWidth);
        if (nearestIndex !== currentSlideIndex && nearestIndex >= 0 && nearestIndex < totalSlides) {
          currentSlideIndex = nearestIndex;
          updateDots(currentSlideIndex);
          checkAndSendImpression(slides[currentSlideIndex]);
        }
      }
    });

    // Dot click navigation
    dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        handleUserTouchStart();
        scrollToIndex(idx);
        handleUserTouchEnd();
      });
    });

    startGlobalAutoSlide();
  });
});