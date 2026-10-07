function updateRestaurantStatus() {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');

  if (!dot || !text) return;

  // Get current date and time
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

  // Schedule in Minutes from Midnight:
  const openTime = 10 * 60;           // 10:00 AM (600 min)
  const lastOrderCutoff = 19 * 60 + 30; // 7:30 PM (1170 min)
  const closeTime = 20 * 60;          // 8:00 PM (1200 min)

  // Weekend Break Time (3:00 PM to 5:00 PM on Sat & Sun)
  const breakStart = 15 * 60;         // 3:00 PM (900 min)
  const breakEnd = 17 * 60;           // 5:00 PM (1020 min)

  const isWeekend = (day === 0 || day === 6);
  const isBreakTime = isWeekend && (currentTimeInMinutes >= breakStart && currentTimeInMinutes < breakEnd);

  // Status Logic
  if (isBreakTime) {
    dot.className = 'dot closed';
    text.textContent = 'BREAK TIME';
    text.className = 'status-text text-closed';
  } else if (currentTimeInMinutes >= openTime && currentTimeInMinutes < lastOrderCutoff) {
    // 10:00 AM to 7:29 PM
    dot.className = 'dot open';
    text.textContent = 'OPEN';
    text.className = 'status-text text-open';
  } else if (currentTimeInMinutes >= lastOrderCutoff && currentTimeInMinutes < closeTime) {
    // 7:30 PM to 7:59 PM (No new orders accepted)
    dot.className = 'dot closed';
    text.textContent = 'NO ORDERS';
    text.className = 'status-text text-closed';
  } else {
    // Before 10:00 AM or after 8:00 PM
    dot.className = 'dot closed';
    text.textContent = 'CLOSED';
    text.className = 'status-text text-closed';
  }
}

// Run immediately on script load
document.addEventListener('DOMContentLoaded', () => {
  updateRestaurantStatus();
  // Auto-refresh every 1 minute
  setInterval(updateRestaurantStatus, 60000);
});