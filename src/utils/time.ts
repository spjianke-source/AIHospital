export function formatGameTime(worldTime: number): string {
  // Calculate hours and minutes from milliseconds
  // 1000ms * 60s * 60m = 3600000ms per hour
  const totalHours = Math.floor(worldTime / 3600000);
  const minutes = Math.floor((worldTime % 3600000) / 60000);
  
  // 24-hour format loop
  const displayHours = totalHours % 24;

  // Format with leading zeros
  const formattedHours = displayHours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');

  return `${formattedHours}:${formattedMinutes}`;
}
