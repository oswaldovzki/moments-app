import React, { useState, useEffect, useMemo } from 'react';
import type { CountdownEvent, NotificationAlert } from './types';
import { playChime, playAlert } from './lib/audio';
import { computeMilestone } from './lib/dateUtils';
import { CountdownCard } from './components/CountdownCard';
import { NotificationCenter } from './components/NotificationCenter';
import { AddEventForm } from './components/AddEventForm';
import { BackupPortability } from './components/BackupPortability';
import {
  Calendar,
  Clock,
  Search,
  Filter,
  Info,
  Layers,
  Hourglass,
  Milestone,
  Bell,
  Database,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Realistic past baseline dates representing important landmarks for out-of-the-box presentation
const MOCK_EVENTS_INITIAL: CountdownEvent[] = [
  {
    id: 'mock_1',
    title: 'My Birthday',
    date: '1995-10-24T00:00:00Z',
    category: 'personal',
    notificationTime: 'custom_1d',
    source: 'local',
  },
  {
    id: 'mock_2',
    title: 'SaaS Platform Launch Day',
    date: '2023-04-12T09:00:00Z',
    category: 'work',
    notificationTime: 'persistent',
    source: 'local',
  },
  {
    id: 'mock_3',
    title: 'Moments App Idea Born',
    date: '2024-05-23T14:00:00Z',
    category: 'anniversary',
    notificationTime: 'custom_1w',
    source: 'local',
  },
];

// Ordinal formatter (e.g. 1st, 2nd, 3rd, etc.)
function getOrdinal(n: number): string {
  if (n <= 0) return '0th';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function App() {
  // Events and triggers state
  const [localEvents, setLocalEvents] = useState<CountdownEvent[]>(() => {
    const saved = localStorage.getItem('countdown_local_events');
    return saved ? JSON.parse(saved) : MOCK_EVENTS_INITIAL;
  });
  
  const [alerts, setAlerts] = useState<NotificationAlert[]>(() => {
    const saved = localStorage.getItem('countdown_alerts');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [notifiedThresholds, setNotifiedThresholds] = useState<string[]>(() => {
    const saved = localStorage.getItem('countdown_notified_thresholds');
    return saved ? JSON.parse(saved) : [];
  });

  // UI States
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'queue' | 'notifications' | 'backup'>('queue');
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filters change or active tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, activeTab]);

  // Real-time tick update
  useEffect(() => {
    const clock = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  // Compute milestones stats for every item
  const calculatedEvents = useMemo(() => {
    return localEvents.map(evt => ({
      ...evt,
      stats: computeMilestone(evt.date, currentTime)
    }));
  }, [localEvents, currentTime]);

  // Featured Priority Focus Vector: The event with the closest upcoming annual anniversary (min daysToNext)
  const closestMilestone = useMemo(() => {
    if (calculatedEvents.length === 0) return null;
    return calculatedEvents.reduce((closest, current) => {
      return current.stats.daysToNext < closest.stats.daysToNext ? current : closest;
    }, calculatedEvents[0]);
  }, [calculatedEvents]);

  // Daily alert cron triggers
  useEffect(() => {
    const checkTimer = setInterval(() => {
      if (localEvents.length === 0) return;

      const now = Date.now();
      const triggersToSave = [...notifiedThresholds];
      const newAlerts: NotificationAlert[] = [];
      let stateChanged = false;

      localEvents.forEach((evt) => {
        if (evt.notificationTime === 'none') return;

        const stats = computeMilestone(evt.date, new Date(now));
        const incomingMilestoneYear = stats.yearsSince + 1;
        const targetAnniversaryTime = stats.nextAnniversaryDate.getTime();
        const diff = targetAnniversaryTime - now;

        // 1. Persistent Option: 1 month before, 2 weeks before, 5 days before (all of lockstep triggers)
        if (evt.notificationTime === 'persistent') {
          const subThresholds = [
            { key: '1m', ms: 30 * 24 * 60 * 60 * 1000, label: 'is 1 month away' },
            { key: '2w', ms: 14 * 24 * 60 * 60 * 1000, label: 'is 2 weeks away' },
            { key: '5d', ms: 5 * 24 * 60 * 60 * 1000, label: 'is 5 days away' },
          ];

          subThresholds.forEach(({ key, ms, label }) => {
            const triggerUid = `${evt.id}-persistent_${key}-${incomingMilestoneYear}`;
            const meetsCondition = diff <= ms;
            const tooAncient = diff < -120 * 60 * 1000;

            if (meetsCondition && !tooAncient && !triggersToSave.includes(triggerUid)) {
              triggersToSave.push(triggerUid);

              const alertObj: NotificationAlert = {
                id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                eventId: evt.id,
                eventTitle: evt.title,
                triggerTime: stats.nextAnniversaryDate.toISOString(),
                message: `Persistent Milestone Alert: "${evt.title}" ${getOrdinal(incomingMilestoneYear)} anniversary ${label}!`,
                type: 'upcoming',
                timestamp: new Date().toISOString(),
                read: false,
              };

              newAlerts.push(alertObj);
              stateChanged = true;
            }
          });
        }
        // 2. Monthly Option: every 1 month milestone anniversary since baseline Date
        else if (evt.notificationTime === 'monthly') {
          const eventDate = new Date(evt.date);
          let mCount = 1;
          let targetMonthlyDate = new Date(eventDate);
          targetMonthlyDate.setMonth(eventDate.getMonth() + mCount);

          while (targetMonthlyDate.getTime() <= now) {
            mCount++;
            targetMonthlyDate = new Date(eventDate);
            targetMonthlyDate.setMonth(eventDate.getMonth() + mCount);
          }

          const diffMonthly = targetMonthlyDate.getTime() - now;
          const thresholdMonthly = 24 * 60 * 60 * 1000; // 1 day window
          const meetsMonthly = diffMonthly <= thresholdMonthly;
          const tooAncientMonthly = diffMonthly < -120 * 60 * 1000;
          const triggerUid = `${evt.id}-monthly-${mCount}`;

          if (meetsMonthly && !tooAncientMonthly && !triggersToSave.includes(triggerUid)) {
            triggersToSave.push(triggerUid);

            const alertObj: NotificationAlert = {
              id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              eventId: evt.id,
              eventTitle: evt.title,
              triggerTime: targetMonthlyDate.toISOString(),
              message: `Monthly Milestone: "${evt.title}" ${getOrdinal(mCount)} month anniversary is occurring!`,
              type: 'due',
              timestamp: new Date().toISOString(),
              read: false,
            };

            newAlerts.push(alertObj);
            stateChanged = true;
          }
        }
        // 3. Weekly Option: every 1 week milestone anniversary since baseline Date
        else if (evt.notificationTime === 'weekly') {
          const eventDate = new Date(evt.date);
          const msPerWeek = 7 * 24 * 60 * 60 * 1000;
          const elapsed = now - eventDate.getTime();
          const wCount = Math.max(1, Math.floor(elapsed / msPerWeek) + 1);
          const targetWeeklyTime = eventDate.getTime() + wCount * msPerWeek;
          const diffWeekly = targetWeeklyTime - now;

          const thresholdWeekly = 24 * 60 * 60 * 1000; // 1 day window
          const meetsWeekly = diffWeekly <= thresholdWeekly;
          const tooAncientWeekly = diffWeekly < -120 * 60 * 1000;
          const triggerUid = `${evt.id}-weekly-${wCount}`;

          if (meetsWeekly && !tooAncientWeekly && !triggersToSave.includes(triggerUid)) {
            triggersToSave.push(triggerUid);

            const alertObj: NotificationAlert = {
              id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              eventId: evt.id,
              eventTitle: evt.title,
              triggerTime: new Date(targetWeeklyTime).toISOString(),
              message: `Weekly Milestone: "${evt.title}" ${getOrdinal(wCount)} week anniversary is occurring!`,
              type: 'due',
              timestamp: new Date().toISOString(),
              read: false,
            };

            newAlerts.push(alertObj);
            stateChanged = true;
          }
        }
        // 4. Custom Options: three offsets for the yearly milestone
        else {
          let thresholdMs = 0;
          let diffLabel = '';

          switch (evt.notificationTime) {
            case 'custom_1d':
              thresholdMs = 24 * 60 * 60 * 1000;
              diffLabel = 'is coming up in 1 day!';
              break;
            case 'custom_1w':
              thresholdMs = 7 * 24 * 60 * 60 * 1000;
              diffLabel = 'is coming up in 1 week.';
              break;
            case 'custom_1m':
              thresholdMs = 30 * 24 * 60 * 60 * 1000;
              diffLabel = 'is coming up in 1 month.';
              break;
          }

          if (thresholdMs > 0) {
            const triggerUid = `${evt.id}-${evt.notificationTime}-${incomingMilestoneYear}`;
            const meetsCondition = diff <= thresholdMs;
            const tooAncient = diff < -120 * 60 * 1000;

            if (meetsCondition && !tooAncient && !triggersToSave.includes(triggerUid)) {
              triggersToSave.push(triggerUid);

              const alertObj: NotificationAlert = {
                id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                eventId: evt.id,
                eventTitle: evt.title,
                triggerTime: stats.nextAnniversaryDate.toISOString(),
                message: `Milestone Reminder: "${evt.title}" ${getOrdinal(incomingMilestoneYear)} anniversary ${diffLabel}`,
                type: 'upcoming',
                timestamp: new Date().toISOString(),
                read: false,
              };

              newAlerts.push(alertObj);
              stateChanged = true;
            }
          }
        }
      });

      if (stateChanged) {
        setNotifiedThresholds(triggersToSave);
        localStorage.setItem('countdown_notified_thresholds', JSON.stringify(triggersToSave));

        setAlerts((prev) => {
          const updated = [...newAlerts, ...prev];
          localStorage.setItem('countdown_alerts', JSON.stringify(updated));
          return updated;
        });

        // Dispatch real Native / Web Browser system notifications
        if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
          newAlerts.forEach((alert) => {
            try {
              new window.Notification("MOMENTS.", {
                body: alert.message,
                icon: '/icon-512.png',
                badge: '/icon-512.png',
              });
            } catch (e) {
              if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                navigator.serviceWorker.ready.then((reg) => {
                  reg.showNotification("MOMENTS.", {
                    body: alert.message,
                    icon: '/icon-512.png',
                    badge: '/icon-512.png',
                  });
                });
              }
            }
          });
        }

        if (soundEnabled) {
          playAlert();
        }
      }
    }, 5000);

    return () => clearInterval(checkTimer);
  }, [localEvents, notifiedThresholds, soundEnabled]);

  // Log incoming events locally
  const handleAddEvent = async (newEventData: Omit<CountdownEvent, 'id' | 'source'>) => {
    setIsSavingEvent(true);
    try {
      const randomId = `local_${Date.now()}`;
      const preparedEvent: CountdownEvent = {
        ...newEventData,
        id: randomId,
        source: 'local',
      };
      const updated = [preparedEvent, ...localEvents];
      setLocalEvents(updated);
      localStorage.setItem('countdown_local_events', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setIsSavingEvent(false);
    }
  };

  // Erase logs
  const handleDeleteEvent = (id: string) => {
    const targetEvent = localEvents.find(e => e.id === id);
    if (!targetEvent) return;

    const confirmDelete = window.confirm(`Are you absolutely sure you want to permanently delete the milestone "${targetEvent.title}"? This action cannot be undone.`);
    if (confirmDelete) {
      const updated = localEvents.filter(e => e.id !== id);
      setLocalEvents(updated);
      localStorage.setItem('countdown_local_events', JSON.stringify(updated));
    }
  };

  // Modify or update existing milestone details
  const handleUpdateEvent = (updatedEvent: CountdownEvent) => {
    const updated = localEvents.map(e => e.id === updatedEvent.id ? updatedEvent : e);
    setLocalEvents(updated);
    localStorage.setItem('countdown_local_events', JSON.stringify(updated));
  };

  // Import milestones from JSON backup
  const handleImportEvents = (imported: Array<Omit<CountdownEvent, 'id' | 'source'>>) => {
    const newItems = imported.map((item) => ({
      ...item,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      source: 'local' as const,
    }));
    const updated = [...localEvents, ...newItems];
    setLocalEvents(updated);
    localStorage.setItem('countdown_local_events', JSON.stringify(updated));
  };

  // Safe dismiss indicators
  const handleDismissAlert = (alertId: string) => {
    setAlerts((prev) => {
      const updated = prev.filter((a) => a.id !== alertId);
      localStorage.setItem('countdown_alerts', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearAllAlerts = () => {
    setAlerts([]);
    localStorage.setItem('countdown_alerts', JSON.stringify([]));
  };

  // Dynamic filter application
  const filteredEventsForDisplay = useMemo(() => {
    return calculatedEvents.filter((item) => {
      const matchSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchSearch && matchCategory;
    }).sort((a, b) => {
      // Sort upcoming events chronologically by remaining days to next anniversary milestone
      return a.stats.daysToNext - b.stats.daysToNext;
    });
  }, [calculatedEvents, searchQuery, categoryFilter]);

  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(filteredEventsForDisplay.length / ITEMS_PER_PAGE);

  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEventsForDisplay.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredEventsForDisplay, currentPage]);

  // Simple clean ticking display
  const localTimeString = currentTime.toLocaleTimeString([], { hour12: false });

  return (
    <div id="countdown-app-root" className="min-h-screen bg-[#080808] text-white font-sans selection:bg-zinc-800 selection:text-white pb-20 p-4 sm:p-10 md:p-12">
      <div className="max-w-7xl mx-auto flex flex-col">
        
        {/* Header Section: MOMENTS. only, removed Time Management */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6 border-b border-zinc-900 pb-10">
          <div className="flex flex-col">
            <h1 className="text-5xl font-black tracking-tighter text-white font-display">MOMENTS.</h1>
          </div>
          <div className="flex flex-wrap gap-8 items-end w-full md:w-auto justify-between md:justify-end">
            <div className="text-right">
              <span className="block text-[10px] text-zinc-500 uppercase tracking-widest font-display">Current Local Time</span>
              <span className="text-2xl font-mono tabular-nums text-white font-bold">{localTimeString}</span>
            </div>
          </div>
        </header>

        {/* Feature Spotlight Section: Closest Anniversary Milestone */}
        <section id="hero-countdown-spotlight" className="mb-14">
          <div className="flex border-b border-zinc-900 pb-14 text-center justify-center">
            
            {/* Massive display showing closest objective */}
            <div className="w-full flex flex-col items-center justify-center text-center">
              {closestMilestone ? (
                <div className="max-w-3xl flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-4 justify-center">
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                    <span className="text-[10px] font-bold tracking-[0.2em] text-blue-500 uppercase font-display">
                      Priority Focus Vector
                    </span>
                  </div>
                  
                  <h2 className="text-3xl sm:text-4xl font-light text-zinc-400 mb-1 font-display uppercase tracking-tight text-center">
                    {closestMilestone.title}
                  </h2>
                  
                  {/* Days left to next milestone */}
                  <div className="flex flex-wrap items-baseline gap-2 justify-center">
                    <span className="text-[7rem] sm:text-[10rem] md:text-[11rem] font-black leading-[0.8] tracking-tighter text-white font-display">
                      {closestMilestone.stats.daysToNext}
                    </span>
                    <span className="text-2xl sm:text-3xl font-extrabold tracking-tighter text-zinc-500 uppercase font-display select-none">
                      Days left
                    </span>
                  </div>

                  {/* Below the target date details */}
                  <div className="mt-8 flex flex-col gap-0.5 border-y border-zinc-900 py-4 px-8 mb-6 text-center max-w-lg w-full">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold font-display">
                      ELAPSED DURATION SINCE FIRST DATE:
                    </span>
                    <span className="text-xl font-extrabold text-white font-display">
                      {closestMilestone.stats.yearsSince} {closestMilestone.stats.yearsSince === 1 ? 'year' : 'years'} and {closestMilestone.stats.daysSince} {closestMilestone.stats.daysSince === 1 ? 'day' : 'days'}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono italic">
                      First Date logged on: {closestMilestone.stats.formattedBaseline}
                    </span>
                  </div>

                  <div className="flex flex-wrap justify-center gap-x-12 gap-y-4">
                    <div className="text-center">
                      <span className="block text-[9px] text-zinc-500 uppercase mb-0.5 tracking-widest font-display font-bold">Upcoming Landmark</span>
                      <span className="text-base font-semibold font-mono text-zinc-200">
                        {getOrdinal(closestMilestone.stats.yearsSince + 1)} Anniversary
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[9px] text-zinc-500 uppercase mb-0.5 tracking-widest font-display font-bold">Landmark Date</span>
                      <span className="text-base font-semibold font-mono text-zinc-200">
                        {closestMilestone.stats.formattedNext}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[9px] text-zinc-500 uppercase mb-0.5 tracking-widest font-display font-bold">Category</span>
                      <span className="text-base font-semibold font-mono text-zinc-200 capitalize">
                        {closestMilestone.category}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 border border-dashed border-zinc-800 p-8 text-center bg-zinc-950/20 max-w-md w-full mx-auto">
                  <span className="w-2.5 h-2.5 bg-zinc-650 inline-block mr-2 animate-pulse" />
                  <span className="text-zinc-500 text-xs uppercase tracking-widest font-display font-bold">
                    No active focus vectors remaining in queue
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* View Switcher Controls (Three Buttons with Icons) */}
        <nav id="view-switcher-navigation" className="mb-12 flex justify-center border-b border-zinc-900 pb-8">
          <div className="grid grid-cols-3 max-w-2xl w-full gap-2 sm:gap-4 font-display">
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2.5 py-4 px-2 border transition-all duration-200 cursor-pointer ${
                activeTab === 'queue'
                  ? 'bg-white text-black border-white'
                  : 'bg-[#0b0b0b] text-zinc-400 border-zinc-900 hover:text-white hover:border-zinc-750'
              }`}
            >
              <Layers size={14} className="shrink-0" />
              <div className="text-center sm:text-left">
                <span className="block text-[8px] sm:text-[10px] font-black uppercase tracking-wider">Queue & Logs</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2.5 py-4 px-2 border transition-all duration-200 cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-white text-black border-white'
                  : 'bg-[#0b0b0b] text-zinc-400 border-zinc-900 hover:text-white hover:border-zinc-750'
              }`}
            >
              <Bell size={14} className="shrink-0" />
              <div className="text-center sm:text-left">
                <span className="block text-[8px] sm:text-[10px] font-black uppercase tracking-wider">Reminders</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2.5 py-4 px-2 border transition-all duration-200 cursor-pointer ${
                activeTab === 'backup'
                  ? 'bg-white text-black border-white'
                  : 'bg-[#0b0b0b] text-zinc-400 border-zinc-900 hover:text-white hover:border-zinc-750'
              }`}
            >
              <Database size={14} className="shrink-0" />
              <div className="text-center sm:text-left">
                <span className="block text-[8px] sm:text-[10px] font-black uppercase tracking-wider">Portability</span>
              </div>
            </button>
          </div>
        </nav>

        {/* Dynamic Display Panels based on selected tab state */}
        <div id="dynamic-dashboard-panels" className="w-full">
          
          {/* Panel 1: Monitor Queue + Log Creator */}
          {activeTab === 'queue' && (
            <section id="milestones-main-column" className="space-y-8 max-w-4xl mx-auto w-full">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-900">
                <h3 className="text-xs font-bold tracking-[0.3em] text-zinc-400 uppercase font-display">
                  MONITORED MILESTONES QUEUE
                </h3>
                
                {/* Filtering Controls */}
                <div className="flex flex-wrap gap-2.5 w-full sm:w-auto justify-end">
                  <div className="relative w-full sm:w-48">
                    <input
                      id="search-box"
                      type="text"
                      placeholder="Search milestones..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 text-white text-xs outline-hidden focus:border-zinc-500 transition-all font-mono"
                    />
                    <Search size={11} className="absolute left-2.5 top-2.5 text-zinc-500" />
                  </div>

                  <select
                    id="filter-category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-350 text-xs px-2.5 py-1.5 outline-hidden focus:border-zinc-500 cursor-pointer font-mono"
                  >
                    <option value="all">📁 ALL CATEGORIES</option>
                    <option value="personal">🌸 PERSONAL</option>
                    <option value="work">💼 WORK</option>
                    <option value="anniversary">🎉 ANNIVERSARY</option>
                    <option value="holiday">✈️ HOLIDAY</option>
                    <option value="other">⭐ OTHER</option>
                  </select>
                </div>
              </div>

              {/* Event Adding Form without sheet props */}
              <AddEventForm
                onAddEvent={handleAddEvent}
                isSaving={isSavingEvent}
              />

              {/* Custom Events Grid */}
              {filteredEventsForDisplay.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-dashed border-zinc-800 bg-zinc-950/20">
                  <Calendar className="text-zinc-700 mb-3" size={28} />
                  <h3 className="font-bold text-xs uppercase tracking-widest text-zinc-400 font-display">No matching events found</h3>
                  <p className="text-[10px] text-zinc-650 mt-1 max-w-sm font-sans">
                    The search query did not yield matched entries in your local storage record registry.
                  </p>
                  {(searchQuery || categoryFilter !== 'all') && (
                    <button
                      id="btn-reset-filters"
                      onClick={() => {
                        setSearchQuery('');
                        setCategoryFilter('all');
                      }}
                      className="mt-4 text-[10px] tracking-wider uppercase font-bold text-white hover:underline cursor-pointer font-display"
                    >
                      Reset Active Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {paginatedEvents.map((evt) => {
                      const cleanEvent: CountdownEvent = {
                        id: evt.id,
                        title: evt.title,
                        date: evt.date,
                        category: evt.category,
                        notificationTime: evt.notificationTime,
                        source: evt.source,
                        notified: evt.notified,
                      };
                      return (
                        <CountdownCard
                          key={evt.id}
                          event={cleanEvent}
                          onDeleteEvent={handleDeleteEvent}
                          onUpdateEvent={handleUpdateEvent}
                        />
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div id="queue-pagination-controls" className="flex items-center justify-between border-t border-zinc-900 pt-6">
                      <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} – {Math.min(currentPage * ITEMS_PER_PAGE, filteredEventsForDisplay.length)} of {filteredEventsForDisplay.length} Milestones
                      </div>
                      <div className="flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="flex items-center justify-center p-2 border border-zinc-900 bg-zinc-950 hover:bg-zinc-900 hover:border-zinc-750 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:bg-zinc-950 disabled:hover:border-zinc-900 disabled:hover:text-zinc-400 transition cursor-pointer"
                          title="Previous Page"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="px-3 py-1 border border-zinc-900 bg-zinc-950 text-zinc-300 font-mono">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="flex items-center justify-center p-2 border border-zinc-900 bg-zinc-950 hover:bg-zinc-900 hover:border-zinc-750 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:bg-zinc-950 disabled:hover:border-zinc-900 disabled:hover:text-zinc-400 transition cursor-pointer"
                          title="Next Page"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Panel 2: Notifications and Reminders */}
          {activeTab === 'notifications' && (
            <aside id="notifications-sidebar" className="max-w-2xl mx-auto w-full">
              <NotificationCenter
                alerts={alerts}
                onDismiss={handleDismissAlert}
                onClearAll={handleClearAllAlerts}
                soundEnabled={soundEnabled}
                onToggleSound={() => setSoundEnabled(prev => !prev)}
              />
            </aside>
          )}

          {/* Panel 3: Portability & Config / Settings */}
          {activeTab === 'backup' && (
            <div className="max-w-2xl mx-auto w-full space-y-8">
              <BackupPortability
                events={localEvents}
                onImportEvents={handleImportEvents}
              />
              
              {/* System Settings Block */}
              <div className="bg-[#0b0b0b] border border-zinc-805 p-6 font-sans">
                <div className="flex items-center gap-2 border-b border-zinc-900 pb-3 mb-4">
                  <Settings size={13} className="text-zinc-400" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 font-display">
                    System Settings Configuration
                  </h4>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2.5 border-b border-zinc-900/40 text-xs text-zinc-300">
                    <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[9px] font-display">System Sound Mode</span>
                    <span className="text-zinc-500 font-mono text-[10px] uppercase font-bold">
                      {soundEnabled ? '🔔 ACTIVE SOUND' : '🔕 MUTED'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-zinc-900/40 text-xs text-zinc-300">
                    <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[9px] font-display">Locale & Time Alignment</span>
                    <span className="text-zinc-500 font-mono text-[10px]">AUTO-SYNCED (LOCAL TIMEZONE)</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 text-xs text-zinc-300">
                    <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[9px] font-display">Database Engine Engine</span>
                    <span className="text-emerald-500 font-mono text-[10px] font-black tracking-widest">
                      LOCALSTORAGE SECURED (v1.0.0 Stable)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Decorative Section */}
        <footer className="mt-20 pt-8 border-t border-zinc-900 flex flex-col sm:flex-row justify-between text-[10px] tracking-widest text-zinc-600 uppercase font-display font-medium gap-4">
          <span>v1.0.0_Stable</span>
          <span>Designated High-Priority Monitoring</span>
          <span>© 2026 Anduin Webworks</span>
        </footer>

      </div>
    </div>
  );
}
