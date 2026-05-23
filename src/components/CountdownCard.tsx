import React, { useState, useEffect } from 'react';
import type { CountdownEvent } from '../types';
import { computeMilestone } from '../lib/dateUtils';
import { Calendar, Clock, Bell, Trash2, Milestone, Hourglass, Edit3, Check, X, AlertTriangle } from 'lucide-react';

interface CountdownCardProps {
  event: CountdownEvent;
  onDeleteEvent: (id: string) => void;
  onUpdateEvent: (updatedEvent: CountdownEvent) => void;
  key?: string | number;
}

// Ordinal formatter (e.g. 1st, 2nd, 3rd, 4th, etc.)
function getOrdinal(n: number): string {
  if (n <= 0) return '0th';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 15;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function CountdownCard({ event, onDeleteEvent, onUpdateEvent }: CountdownCardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);

  // Edit fields state
  const [editTitle, setEditTitle] = useState(event.title);
  const [editDate, setEditDate] = useState(() => {
    const d = new Date(event.date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [editTime, setEditTime] = useState(() => {
    const d = new Date(event.date);
    if (isNaN(d.getTime())) return '00:00';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  });
  const [editCategory, setEditCategory] = useState<CountdownEvent['category']>(event.category);
  const [editNotification, setEditNotification] = useState<CountdownEvent['notificationTime']>(event.notificationTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const stats = computeMilestone(event.date, currentTime);

  // Category specific styles matching the sleek Swiss theme
  const getCategoryStyles = (category: CountdownEvent['category']) => {
    switch (category) {
      case 'personal':
        return {
          dotBg: 'bg-pink-500',
          textAccent: 'text-pink-450',
          borderHover: 'group-hover:border-pink-500',
        };
      case 'work':
        return {
          dotBg: 'bg-blue-500',
          textAccent: 'text-blue-450',
          borderHover: 'group-hover:border-blue-500',
        };
      case 'anniversary':
        return {
          dotBg: 'bg-amber-500',
          textAccent: 'text-amber-450',
          borderHover: 'group-hover:border-amber-500',
        };
      case 'holiday':
        return {
          dotBg: 'bg-emerald-500',
          textAccent: 'text-emerald-450',
          borderHover: 'group-hover:border-emerald-500',
        };
      default:
        return {
          dotBg: 'bg-zinc-500',
          textAccent: 'text-zinc-400',
          borderHover: 'group-hover:border-white',
        };
    }
  };

  const getNotificationLabel = (time: CountdownEvent['notificationTime']) => {
    switch (time) {
      case 'persistent': return 'Persistent (1m, 2w, 5d)';
      case 'monthly': return 'Monthly milestone';
      case 'weekly': return 'Weekly milestone';
      case 'custom_1d': return 'Custom: 1d before';
      case 'custom_1w': return 'Custom: 1w before';
      case 'custom_1m': return 'Custom: 1m before';
      case 'none': return 'Muted';
      default: return 'No Alerts';
    }
  };

  // Save edit changes handler
  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle || !editDate) return;

    const baseTime = editTime || '00:00';
    const combinedDateTime = new Date(`${editDate}T${baseTime}`).toISOString();

    onUpdateEvent({
      ...event,
      title: editTitle,
      date: combinedDateTime,
      category: editCategory,
      notificationTime: editNotification,
    });
    setIsEditing(false);
  };

  // Confirm delete command handler (with explicit validation)
  const handleDeleteTriggered = () => {
    onDeleteEvent(event.id);
  };

  const styles = getCategoryStyles(event.category);

  if (isEditing) {
    return (
      <div
        id={`event-card-edit-${event.id}`}
        className="relative bg-zinc-950 border-2 border-zinc-700 p-6 rounded-none text-xs text-zinc-300"
      >
        <div className="flex justify-between items-center pb-3 border-b border-zinc-900 mb-4">
          <span className="font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 font-display">
            <Edit3 size={12} className="text-blue-450" />
            Edit Milestone
          </span>
          <button
            onClick={() => setIsEditing(false)}
            className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-900 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSaveChanges} className="space-y-4">
          <div>
            <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 font-display">
              Milestone Title
            </label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[#080808] border border-zinc-800 focus:border-zinc-550 text-white transition-all outline-hidden rounded-none font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 font-display">
                Date
              </label>
              <input
                type="date"
                required
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#080808] border border-zinc-800 focus:border-zinc-550 text-white transition-all outline-hidden rounded-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 font-display">
                Time
              </label>
              <input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="w-full px-3 py-2 bg-[#080808] border border-zinc-800 focus:border-zinc-550 text-white transition-all outline-hidden rounded-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 font-display">
                Category
              </label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as CountdownEvent['category'])}
                className="w-full px-2.5 py-2 bg-[#080808] border border-zinc-800 focus:border-zinc-550 text-white transition-all outline-hidden rounded-none font-sans"
              >
                <option value="personal">🌸 Personal Checkpoint</option>
                <option value="work">💼 Work / Project Launch</option>
                <option value="anniversary">🎉 Celebrating Anniversary</option>
                <option value="holiday">✈️ Memorable Holiday</option>
                <option value="other">⭐ Other Milestone</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 font-display">
                Milestone Reminder Alert
              </label>
              <select
                value={editNotification}
                onChange={(e) => setEditNotification(e.target.value as CountdownEvent['notificationTime'])}
                className="w-full px-2.5 py-2 bg-[#080808] border border-zinc-801 focus:border-zinc-550 text-white transition-all outline-hidden rounded-none font-sans"
              >
                <option value="persistent">Persistent (1 month, 2 weeks, 5 days before)</option>
                <option value="monthly">Monthly (Every month anniversary since baseline)</option>
                <option value="weekly">Weekly (Every week anniversary since baseline)</option>
                <option value="custom_1d">Custom: 1 day before yearly anniversary</option>
                <option value="custom_1w">Custom: 1 week before yearly anniversary</option>
                <option value="custom_1m">Custom: 1 month before yearly anniversary</option>
                <option value="none">🔕 Mute alerts</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-3 border-t border-zinc-900 font-display">
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-white hover:bg-zinc-200 text-black font-black text-[10px] uppercase tracking-widest py-2 px-3 rounded-none transition"
              >
                SAVE CHANGES
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-[10px] uppercase tracking-widest px-3 rounded-none transition"
              >
                CANCEL
              </button>
            </div>
            
            <button
              type="button"
              onClick={handleDeleteTriggered}
              className="w-full border border-red-950 text-red-500 hover:text-white hover:bg-red-950/20 font-bold text-[10px] uppercase tracking-widest py-2 px-3 transition mt-1"
            >
              DELETE MILESTONE...
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      id={`event-card-${event.id}`}
      className="relative overflow-hidden bg-zinc-950 border border-zinc-850 p-6 transition-all duration-300 hover:border-zinc-700 group rounded-none"
    >
      {/* Visual decorative line representing progress/hover */}
      <div className={`absolute top-0 left-0 h-[2px] w-0 bg-white ${styles.borderHover} group-hover:w-full transition-all duration-500`} />

      <div className="flex justify-between items-start gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${styles.dotBg}`} />
            <span className="text-[10px] uppercase tracking-widest text-zinc-550 font-bold font-display">
              {event.category}
            </span>
          </div>
          <h3 className="text-xl font-black tracking-tight text-white font-display uppercase break-words leading-snug">
            {event.title}
          </h3>
        </div>

        <button
          id={`btn-edit-trigger-${event.id}`}
          onClick={() => setIsEditing(true)}
          className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-900 transition-colors cursor-pointer flex items-center justify-center border border-zinc-900 hover:border-zinc-750"
          title="Edit milestone"
        >
          <Edit3 size={14} className="m-0.5" />
        </button>
      </div>

      {/* Main calculation: Days left to the next yearly milestone goal */}
      <div className="my-6 border border-zinc-900 bg-[#0c0c0c]/80 p-4">
        <span className="block text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-1 font-display">
          NEXT RECURRING MILESTONE GOAL
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black tracking-tighter text-white font-mono tabular-nums">
            {stats.daysToNext}
          </span>
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-display">
            Days remaining
          </span>
        </div>
        <div className="mt-2 text-[10px] text-zinc-400 font-mono uppercase bg-zinc-950 px-2 py-1 inline-block border border-zinc-900">
          Target: {getOrdinal(stats.yearsSince + 1)} Year Anniversary ({stats.formattedNext})
        </div>
      </div>

      {/* Elapsed metrics stats */}
      <div className="space-y-2.5 pt-4 border-t border-zinc-900 text-xs">
        <div>
          <span className="block text-[9px] text-zinc-505 uppercase tracking-widest font-display font-medium mb-1">
            Elapsed Since Reference Date
          </span>
          <div className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 font-display">
            <Hourglass size={13} className="text-zinc-400" />
            <span>
              {stats.yearsSince} {stats.yearsSince === 1 ? 'Year' : 'Years'} and {stats.daysSince} {stats.daysSince === 1 ? 'Day' : 'Days'}
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono block mt-1">
            Reference date: {stats.formattedBaseline}
          </span>
        </div>

        <div className="flex justify-between items-center gap-2 pt-2 border-t border-zinc-950">
          <div className="flex items-center gap-2 text-[11px] text-zinc-450">
            <Bell size={12} className={event.notificationTime === 'none' ? 'text-zinc-700' : 'text-zinc-400'} />
            <span>Alerts: {getNotificationLabel(event.notificationTime)}</span>
          </div>
          
          {stats.isToday && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 uppercase tracking-widest bg-yellow-950 text-yellow-400 border border-yellow-905 font-display">
              TODAY IS THE DAY!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

