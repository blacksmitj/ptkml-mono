export const parseTimeToDate = (timeStr?: string): Date | undefined => {
  if (!timeStr) return undefined;
  const match = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (!match) return undefined;
  const d = new Date();
  d.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
  return d;
};

export const formatDateForInput = (dateString?: string): string => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatTimeForInput = (timeString?: string): string => {
  if (!timeString) return "";
  if (/^\d{2}:\d{2}$/.test(timeString)) return timeString;
  const d = new Date(timeString);
  if (isNaN(d.getTime())) return "";
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const getCurrentTimeFormatted = (offsetMinutes = 0): string => {
  const now = new Date();
  if (offsetMinutes !== 0) {
    now.setMinutes(now.getMinutes() + offsetMinutes);
  }
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const getTodayDateFormatted = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
