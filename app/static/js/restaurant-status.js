function updateRestaurantStatus() {
  const indicators = document.querySelectorAll('.status-indicator');
  if (!indicators || indicators.length === 0) return;

  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

  indicators.forEach((container) => {
    const dot = container.querySelector('.status-dot');
    const text = container.querySelector('.status-text');
    if (!dot || !text) return;

    // Default schedules (or schedule type check via data-schedule attribute)
    const scheduleType = container.getAttribute('data-schedule') || 'default';

    let openTime = 10 * 60;          // 10:00 AM
    let lastOrderCutoff = 19 * 60 + 30; // 7:30 PM
    let closeTime = 20 * 60;         // 8:00 PM
    let breakStart = 15 * 60;        // 3:00 PM
    let breakEnd = 17 * 60;          // 5:00 PM
    let hasWeekendBreak = true;
    let closedOnSunday = false;

    if (scheduleType === 'qaysar') {
      openTime = 11 * 60;            // 11:00 AM
      lastOrderCutoff = 20 * 60 + 30; // 8:30 PM
      closeTime = 21 * 60;           // 9:00 PM
      hasWeekendBreak = false;
    } else if (scheduleType === 'pizza') {
      openTime = 11 * 60 + 30;       // 11:30 AM
      lastOrderCutoff = 21 * 60 + 30; // 9:30 PM
      closeTime = 22 * 60;           // 10:00 PM
      hasWeekendBreak = false;
      closedOnSunday = true;
    }

    const isWeekend = (day === 0 || day === 6);
    const isSunday = (day === 0);
    const isBreakTime = hasWeekendBreak && isWeekend && (currentTimeInMinutes >= breakStart && currentTimeInMinutes < breakEnd);

    if (closedOnSunday && isSunday) {
      dot.className = 'dot status-dot closed';
      text.textContent = 'CLOSED';
      text.className = 'status-text text-closed';
    } else if (isBreakTime) {
      dot.className = 'dot status-dot closed';
      text.textContent = 'BREAK TIME';
      text.className = 'status-text text-closed';
    } else if (currentTimeInMinutes >= openTime && currentTimeInMinutes < lastOrderCutoff) {
      dot.className = 'dot status-dot open';
      text.textContent = 'OPEN';
      text.className = 'status-text text-open';
    } else if (currentTimeInMinutes >= lastOrderCutoff && currentTimeInMinutes < closeTime) {
      dot.className = 'dot status-dot closed';
      text.textContent = 'NO MORE ORDERS';
      text.className = 'status-text text-closed';
    } else {
      dot.className = 'dot status-dot closed';
      text.textContent = 'CLOSED';
      text.className = 'status-text text-closed';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updateRestaurantStatus();
  setInterval(updateRestaurantStatus, 60000); // Auto-refresh every 1 min
});