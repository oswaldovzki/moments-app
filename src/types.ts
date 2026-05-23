export interface CountdownEvent {
  id: string;
  title: string;
  date: string; // ISO DateTime string
  category: 'personal' | 'work' | 'anniversary' | 'holiday' | 'other';
  notificationTime: 'persistent' | 'monthly' | 'weekly' | 'custom_1d' | 'custom_1w' | 'custom_1m' | 'none';
  notified?: boolean;
  source: 'local' | 'google-sheet';
  rowNumber?: number; // spreadsheet row if applicable
}

export interface NotificationAlert {
  id: string;
  eventId: string;
  eventTitle: string;
  triggerTime: string;
  message: string;
  type: 'upcoming' | 'due' | 'passed';
  timestamp: string;
  read: boolean;
}

export interface SpreadsheetConfig {
  id: string;
  sheetName: string;
}
