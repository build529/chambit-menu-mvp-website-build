function updateRestaurantStatus() {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');

  if (!dot || !text) return;

  // Get current date and time
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

  // Define Operating Hours in Minutes (Example: 11:00 AM to 8:00 PM)
  const openTime = 11 * 60;  // 11:00 AM (660 min)
  const closeTime = 20 * 60; // 8:00 PM (1200 min)

  // Check if weekday (Mon–Fri = 1 to 5) and within operating hours
  const isWeekday = day >= 1 && day <= 5;
  const isOpen = isWeekday && (currentTimeInMinutes >= openTime && currentTimeInMinutes < closeTime);

  if (isOpen) {
    dot.className = 'dot open';
    text.textContent = 'OPEN NOW';
    text.className = 'status-text text-open';
  } else {
    dot.className = 'dot closed';
    text.textContent = 'CLOSED';
    text.className = 'status-text text-closed';
  }
}

// Run immediately when the script loads
document.addEventListener('DOMContentLoaded', () => {
  updateRestaurantStatus();
  // Refresh status automatically every 1 minute (60,000 ms)
  setInterval(updateRestaurantStatus, 60000);
});