/**
 * Time formatting utilities for video editor
 */

/**
 * Formats time in seconds to HH:MM:SS.SS format, hiding hours/minutes when they are 0
 * @param timeInSeconds - Time in seconds (can have decimal places)
 * @returns Formatted time string (SS.SS, MM:SS.SS, or HH:MM:SS.SS)
 */
export const formatTimeHHMMSS = (timeInSeconds: number): string => {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = timeInSeconds % 60;
  
  // Format seconds with 2 decimal places
  const secondsFormatted = seconds.toFixed(2).padStart(5, '0');
  
  if (hours > 0) {
    // Show HH:MM:SS.SS format
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secondsFormatted}`;
  } else if (minutes > 0) {
    // Show MM:SS.SS format
    return `${minutes.toString().padStart(2, '0')}:${secondsFormatted}`;
  } else {
    // Show SS.SS format
    return secondsFormatted;
  }
};

/**
 * Formats time in milliseconds to HH:MM:SS.SS format
 * @param timeInMs - Time in milliseconds
 * @returns Formatted time string in HH:MM:SS.SS format
 */
export const formatTimeHHMMSSFromMs = (timeInMs: number): string => {
  return formatTimeHHMMSS(timeInMs / 1000);
};