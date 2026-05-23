/**
 * Calculates milestone statistics for a logged baseline date.
 */
export interface MilestoneCalculation {
  yearsSince: number;
  daysSince: number;
  nextAnniversaryDate: Date;
  daysToNext: number;
  totalDaysSince: number;
  isToday: boolean;
  formattedBaseline: string;
  formattedNext: string;
}

export function computeMilestone(eventDateStr: string, current: Date = new Date()): MilestoneCalculation {
  const eventDate = new Date(eventDateStr);
  const now = current;

  // Fallback defaults for invalid dates
  if (isNaN(eventDate.getTime())) {
    return {
      yearsSince: 0,
      daysSince: 0,
      nextAnniversaryDate: new Date(),
      daysToNext: 0,
      totalDaysSince: 0,
      isToday: false,
      formattedBaseline: 'N/A',
      formattedNext: 'N/A',
    };
  }

  // Calculate total days since the original date
  const totalMsDiff = now.getTime() - eventDate.getTime();
  const totalDaysSince = Math.floor(totalMsDiff / (1000 * 60 * 60 * 24));

  // Determine completed years
  let yearsSince = now.getFullYear() - eventDate.getFullYear();

  // Create anniversary for this calendar year
  const thisYearAnniversary = new Date(eventDate);
  thisYearAnniversary.setFullYear(now.getFullYear());

  // If we haven't reached the anniversary this year yet
  if (now.getTime() < thisYearAnniversary.getTime()) {
    yearsSince -= 1;
  }

  // Make sure yearsSince doesn't go below 0 (for future dates)
  if (yearsSince < 0) {
    yearsSince = 0;
  }

  // Find the last anniversary date
  const lastAnniversary = new Date(eventDate);
  lastAnniversary.setFullYear(eventDate.getFullYear() + yearsSince);

  // Remaining days since the last anniversary
  const msSinceLast = now.getTime() - lastAnniversary.getTime();
  let daysSince = Math.floor(msSinceLast / (1000 * 60 * 60 * 24));
  if (daysSince < 0) daysSince = 0;

  // Find the next anniversary date
  const nextAnniversaryDate = new Date(eventDate);
  nextAnniversaryDate.setFullYear(eventDate.getFullYear() + yearsSince + 1);

  // Days to next anniversary
  const msToNext = nextAnniversaryDate.getTime() - now.getTime();
  const daysToNext = Math.ceil(msToNext / (1000 * 60 * 60 * 24));

  // Check if today is the anniversary in UTC/Local month/day match
  const isToday = now.getMonth() === eventDate.getMonth() && now.getDate() === eventDate.getDate();

  const formatDateToDDMMYYYY = (d: Date): string => {
    if (isNaN(d.getTime())) return 'N/A';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formattedBaseline = formatDateToDDMMYYYY(eventDate);
  const formattedNext = formatDateToDDMMYYYY(nextAnniversaryDate);

  return {
    yearsSince,
    daysSince,
    nextAnniversaryDate,
    daysToNext,
    totalDaysSince,
    isToday,
    formattedBaseline,
    formattedNext,
  };
}
