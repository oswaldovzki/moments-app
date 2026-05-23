import React, { useState } from 'react';
import type { CountdownEvent } from '../types';
import { Calendar, Clock, Bell, Plus, X, ListPlus, Loader2 } from 'lucide-react';

interface AddEventFormProps {
  onAddEvent: (event: Omit<CountdownEvent, 'id' | 'source'>) => Promise<void>;
  isSaving: boolean;
}

export function AddEventForm({ onAddEvent, isSaving }: AddEventFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [category, setCategory] = useState<CountdownEvent['category']>('personal');
  const [notificationTime, setNotificationTime] = useState<CountdownEvent['notificationTime']>('persistent');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;

    // Standardize datetime
    const finalTime = time || '00:00';
    const combinedDateTime = new Date(`${date}T${finalTime}`).toISOString();

    try {
      await onAddEvent({
        title,
        date: combinedDateTime,
        category,
        notificationTime,
      });

      // Reset
      setTitle('');
      setDate('');
      setTime('');
      setCategory('personal');
      setNotificationTime('persistent');
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save event. Please check input formats.');
    }
  };

  return (
    <div id="add-event-container" className="mb-8">
      {!isOpen ? (
        <button
          id="btn-open-add-form"
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-center gap-3 px-6 py-5 border border-dashed border-zinc-800 hover:border-zinc-500 bg-zinc-950/40 hover:bg-zinc-950 text-zinc-400 hover:text-white font-display font-medium text-xs tracking-widest uppercase transition-all cursor-pointer"
        >
          <Plus size={14} />
          Log New Important Date Milestone
        </button>
      ) : (
        <div className="bg-zinc-950 border border-zinc-800 p-6 relative">
          <div className="flex justify-between items-center pb-4 border-b border-zinc-900 mb-6 font-display">
            <h3 className="font-black text-xs uppercase tracking-widest text-white flex items-center gap-2">
              <ListPlus size={15} className="text-zinc-400" />
              Log Reference Milestone
            </h3>
            <button
              id="btn-close-add-form"
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 text-xs text-zinc-300">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 font-display">
                Milestone Title *
              </label>
              <input
                id="input-title"
                type="text"
                required
                placeholder="MY BIRTHDAY, OUR ANNIVERSARY, COMPANY FOUNDATION..."
                value={title}
                className="w-full px-4 py-3 bg-[#080808] border border-zinc-800 focus:border-zinc-550 text-white transition-all outline-hidden text-xs rounded-none"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-display">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                  Reference Date *
                </label>
                <div className="relative">
                  <input
                    id="input-date"
                    type="date"
                    required
                    value={date}
                    className="w-full pl-10 pr-4 py-3 bg-[#080808] border border-zinc-800 focus:border-zinc-550 text-white transition-all outline-hidden text-xs rounded-none"
                    onChange={(e) => setDate(e.target.value)}
                  />
                  <Calendar size={13} className="absolute left-3.5 top-3.5 text-zinc-600" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                  Reference Time
                </label>
                <div className="relative">
                  <input
                    id="input-time"
                    type="time"
                    value={time}
                    className="w-full pl-10 pr-4 py-3 bg-[#080808] border border-zinc-800 focus:border-zinc-550 text-white transition-all outline-hidden text-xs rounded-none"
                    onChange={(e) => setTime(e.target.value)}
                  />
                  <Clock size={13} className="absolute left-3.5 top-3.5 text-zinc-600" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-display">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                  Category
                </label>
                <select
                  id="select-category"
                  value={category}
                  className="w-full px-4 py-3 bg-[#080808] border border-zinc-800 focus:border-zinc-550 text-white transition-all outline-hidden text-xs rounded-none appearance-none"
                  onChange={(e) => setCategory(e.target.value as CountdownEvent['category'])}
                >
                  <option value="personal">🌸 Personal Checkpoint</option>
                  <option value="work">💼 Work / Project Launch</option>
                  <option value="anniversary">🎉 Celebrating Anniversary</option>
                  <option value="holiday">✈️ Memorable Holiday</option>
                  <option value="other">⭐ Other Milestone</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                  Milestone Reminder Alert
                </label>
                <div className="relative">
                  <select
                    id="select-alert"
                    value={notificationTime}
                    className="w-full pl-10 pr-4 py-3 bg-[#080808] border border-zinc-805 focus:border-zinc-550 text-white transition-all outline-hidden text-xs rounded-none"
                    onChange={(e) => setNotificationTime(e.target.value as CountdownEvent['notificationTime'])}
                  >
                    <option value="persistent">Persistent (1 month, 2 weeks, 5 days before)</option>
                    <option value="monthly">Monthly (Every month anniversary since baseline)</option>
                    <option value="weekly">Weekly (Every week anniversary since baseline)</option>
                    <option value="custom_1d">Custom: 1 day before yearly anniversary</option>
                    <option value="custom_1w">Custom: 1 week before yearly anniversary</option>
                    <option value="custom_1m">Custom: 1 month before yearly anniversary</option>
                    <option value="none">🔕 Mute alerts</option>
                  </select>
                  <Bell size={13} className="absolute left-3.5 top-3.5 text-zinc-600" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-zinc-900 font-display">
              <button
                id="btn-submit-event"
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-white hover:bg-zinc-200 text-black font-black text-xs uppercase tracking-widest py-3 px-4 rounded-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    RECORDING...
                  </>
                ) : (
                  'RECORD MILESTONE'
                )}
              </button>
              <button
                id="btn-cancel-event"
                type="button"
                onClick={() => setIsOpen(false)}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-[10px] uppercase tracking-widest px-4 rounded-none transition-transform cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
