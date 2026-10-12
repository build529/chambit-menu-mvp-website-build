document.addEventListener('DOMContentLoaded', () => {
  console.log('[Ad Tracker] Viewability carousel starting...');

  const containers = document.querySelectorAll('.ad-carousel-container');

  containers.forEach((container, containerIndex) => {
    const track = container.querySelector('.ad-carousel-track');
    const dots = container.querySelectorAll('.carousel-dot');
    if (!track) return;

    const slides = track.querySelectorAll('.ad-slide');
    const totalSlides = slides.length;
    if (totalSlides === 0) return;

    const slotLocation = track.id ? track.id.replace('-carousel', '').replace(/-/g, '_') : `slot_${containerIndex}`;
    const SLIDE_DURATION = 3500;
    const USER_PAUSE_DURATION = 5000;
    const VIEWABLE_DWELL_TIME = 1000; // 1.0 second required viewability

    let autoSlideInterval = null;
    let cooldownTimer = null;
    let impressionTimers = {};
    let isUserInteracting = false;
    let isContainerInViewport = false;
    let currentSlideIndex = 0;

    // 1. IntersectionObserver: Track when banner enters viewport (10% threshold)
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isContainerInViewport = entry.isIntersecting;
        console.log(`[Ad Tracker] Visibility for ${slotLocation}: ${isContainerInViewport}`);
        if (isContainerInViewport) {
          checkAndSendViewableImpression(currentSlideIndex);
        } else {
          cancelAllImpressionTimers();
        }
      });
    }, { threshold: 0.1 });

    observer.observe(container);

    function cancelAllImpressionTimers() {
      Object.keys(impressionTimers).forEach(idx => {
        clearTimeout(impressionTimers[idx]);
        delete impressionTimers[idx];
      });
    }

    // 2. Viewable Impression Logic with 1-Second Dwell Timer
    function checkAndSendViewableImpression(slideIndex) {
      const slideElement = slides[slideIndex];
      if (!slideElement) return;

      if (slideElement.dataset.impressionSent === 'true') return;

      if (impressionTimers[slideIndex]) {
        clearTimeout(impressionTimers[slideIndex]);
      }

      if (!isContainerInViewport) return;

      console.log(`[Ad Tracker] Starting 1s dwell countdown for slide ${slideIndex} (${slotLocation})...`);

      impressionTimers[slideIndex] = setTimeout(() => {
        if (isContainerInViewport && slideElement.dataset.impressionSent !== 'true') {
          let sponsorName = slideElement.getAttribute('data-sponsor');
          if (!sponsorName) {
            const ctaLink = slideElement.querySelector('a[onclick*="sponsor_name"]');
            if (ctaLink) {
              const match = ctaLink.getAttribute('onclick').match(/['"]sponsor_name['"]\s*:\s*['"]([^'"]+)['"]/);
              if (match && match[1]) sponsorName = match[1];
            }
          }

          if (sponsorName && typeof gtag === 'function') {
            gtag('event', 'view_ad_impression', {
              'slot_location': slotLocation,
              'sponsor_name': sponsorName
            });
            slideElement.dataset.impressionSent = 'true';
            console.log(`[Viewable Impression SUCCESS] Fired event -> slot: ${slotLocation}, sponsor: ${sponsorName}`);
          }
        }
        delete impressionTimers[slideIndex];
      }, VIEWABLE_DWELL_TIME);
    }

    // 3. Carousel Navigation & Auto-Slide Logic
    function scrollToIndex(index) {
      currentSlideIndex = (index + totalSlides) % totalSlides;
      const targetSlide = slides[currentSlideIndex];
      if (!targetSlide) return;

      track.scrollTo({
        left: targetSlide.offsetLeft,
        behavior: 'smooth'
      });
      updateDots(currentSlideIndex);
      checkAndSendViewableImpression(currentSlideIndex);
    }

    function updateDots(activeIndex) {
      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === activeIndex);
      });
    }

    function getGlobalSlideIndex() {
      return Math.floor(Date.now() / SLIDE_DURATION) % totalSlides;
    }

    function tickAutoSlide() {
      if (isUserInteracting) return;
      scrollToIndex(getGlobalSlideIndex());
    }

    function startGlobalAutoSlide() {
      clearInterval(autoSlideInterval);
      clearTimeout(cooldownTimer);

      const initialIndex = getGlobalSlideIndex();
      scrollToIndex(initialIndex);

      const timeRemaining = SLIDE_DURATION - (Date.now() % SLIDE_DURATION);

      cooldownTimer = setTimeout(() => {
        tickAutoSlide();
        autoSlideInterval = setInterval(tickAutoSlide, SLIDE_DURATION);
      }, timeRemaining);
    }

    // Touch & Mouse Event Listeners
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

    track.addEventListener('touchstart', handleUserTouchStart, { passive: true });
    track.addEventListener('touchend', handleUserTouchEnd, { passive: true });
    track.addEventListener('mousedown', handleUserTouchStart);
    track.addEventListener('mouseup', handleUserTouchEnd);

    // Debounced Scroll Listener
    let scrollTimeout = null;
    track.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const slideWidth = track.clientWidth || track.offsetWidth;
        if (slideWidth > 0) {
          const nearestIndex = Math.round(track.scrollLeft / slideWidth);
          if (nearestIndex !== currentSlideIndex && nearestIndex >= 0 && nearestIndex < totalSlides) {
            currentSlideIndex = nearestIndex;
            updateDots(currentSlideIndex);
            checkAndSendViewableImpression(currentSlideIndex);
          }
        }
      }, 150);
    });

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