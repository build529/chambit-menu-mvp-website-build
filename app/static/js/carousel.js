document.addEventListener('DOMContentLoaded', () => {
  const track = document.getElementById('top-banner-carousel');
  const dots = document.querySelectorAll('#top-banner-dots .carousel-dot');
  if (!track) return;

  const slides = track.querySelectorAll('.ad-slide');
  const totalSlides = slides.length;
  if (totalSlides === 0) return;

  const SLIDE_DURATION = 3500; // 3.5 seconds per slide
  const USER_PAUSE_DURATION = 5000; // 5 seconds cooldown after user swipe

  let autoSlideInterval = null;
  let cooldownTimer = null;
  let isUserInteracting = false;
  let currentSlideIndex = 0;

  // Programmatically scroll track to a target index
  function scrollToIndex(index) {
    currentSlideIndex = (index + totalSlides) % totalSlides;
    const slideWidth = track.clientWidth;
    track.scrollTo({
      left: slideWidth * currentSlideIndex,
      behavior: 'smooth'
    });
    updateDots(currentSlideIndex);
  }

  // Update active indicator dot
  function updateDots(activeIndex) {
    dots.forEach((dot, idx) => {
      if (idx === activeIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  // Calculate current active slide index using global Unix Epoch time
  function getGlobalSlideIndex() {
    const now = Date.now();
    return Math.floor(now / SLIDE_DURATION) % totalSlides;
  }

  // Step auto-slide using global time synchronization
  function tickAutoSlide() {
    if (isUserInteracting) return;
    const targetIndex = getGlobalSlideIndex();
    scrollToIndex(targetIndex);
  }

  // Start continuous time-synced loop
  function startGlobalAutoSlide() {
    clearInterval(autoSlideInterval);
    clearTimeout(cooldownTimer);

    // Render global index immediately
    const initialIndex = getGlobalSlideIndex();
    scrollToIndex(initialIndex);

    // Calculate time remaining in current 3.5s global window
    const now = Date.now();
    const timeRemaining = SLIDE_DURATION - (now % SLIDE_DURATION);

    // Sync remaining time, then loop every 3.5 seconds
    cooldownTimer = setTimeout(() => {
      tickAutoSlide();
      autoSlideInterval = setInterval(tickAutoSlide, SLIDE_DURATION);
    }, timeRemaining);
  }

  // Pause timer on touch or drag
  function handleUserTouchStart() {
    isUserInteracting = true;
    clearInterval(autoSlideInterval);
    clearTimeout(cooldownTimer);
  }

  // Resume global timer after 5 seconds of inactivity
  function handleUserTouchEnd() {
    clearTimeout(cooldownTimer);
    cooldownTimer = setTimeout(() => {
      isUserInteracting = false;
      startGlobalAutoSlide();
    }, USER_PAUSE_DURATION);
  }

  // Event Listeners for Manual Touch & Swipe Interactions
  track.addEventListener('touchstart', handleUserTouchStart, { passive: true });
  track.addEventListener('touchend', handleUserTouchEnd, { passive: true });
  track.addEventListener('mousedown', handleUserTouchStart);
  track.addEventListener('mouseup', handleUserTouchEnd);

  // Sync pagination dots on manual scroll
  track.addEventListener('scroll', () => {
    const slideWidth = track.clientWidth;
    if (slideWidth > 0) {
      const nearestIndex = Math.round(track.scrollLeft / slideWidth);
      if (nearestIndex !== currentSlideIndex) {
        currentSlideIndex = nearestIndex;
        updateDots(currentSlideIndex);
      }
    }
  });

  // Dot Click Navigation
  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      handleUserTouchStart();
      scrollToIndex(idx);
      handleUserTouchEnd();
    });
  });

  // Initialize
  startGlobalAutoSlide();
});