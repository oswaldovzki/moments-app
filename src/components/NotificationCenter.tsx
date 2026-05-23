import React from 'react';
import type { NotificationAlert } from '../types';
import { Bell, BellRing, BellOff, Check, Volume2, ShieldAlert } from 'lucide-react';
import { playChime } from '../lib/audio';

interface NotificationCenterProps {
  alerts: NotificationAlert[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function NotificationCenter({
  alerts,
  onDismiss,
  onClearAll,
  soundEnabled,
  onToggleSound,
}: NotificationCenterProps) {
  const unreadCount = alerts.filter((a) => !a.read).length;

  const [permissionState, setPermissionState] = React.useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window
      ? window.Notification.permission
      : 'default';
  });

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('System notifications are not fully supported on this web view. Please open in your mobile Google Chrome browser to install the native app experience.');
      return;
    }

    try {
      const permission = await window.Notification.requestPermission();
      setPermissionState(permission);
      if (permission === 'granted') {
        const testNotify = new window.Notification("MOMENTS.", {
          body: "System notifications are active and synchronized with MOMENTS.",
          icon: "/icon-512.png",
          badge: "/icon-512.png"
        });
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  return (
    <div id="notification-center-section" className="bg-[#0b0b0b] border border-zinc-800 p-6 rounded-none">
      {/* Native Notification Request Banner if not granted */}
      {permissionState !== 'granted' && (
        <div className="mb-6 bg-zinc-950 border border-zinc-900 p-4 font-sans flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="text-[9px] uppercase tracking-widest font-black text-amber-500 font-mono block">● NATIVE SYSTEM ALERTS STATUS</span>
            <p className="text-xs text-zinc-400 font-medium">
              Initialize native Android background alarms to receive notifications even when MOMENTS. is closed.
            </p>
          </div>
          <button
            onClick={requestNotificationPermission}
            className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 text-[10px] uppercase font-black tracking-widest transition-colors cursor-pointer select-none shrink-0"
          >
            Authorize Alerts
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="relative p-2 bg-zinc-900 border border-zinc-800 text-white">
            {unreadCount > 0 ? (
              <BellRing size={18} className="animate-pulse text-yellow-500" />
            ) : (
              <Bell size={18} className="text-zinc-500" />
            )}
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-black rounded-full text-[9px] font-black flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-black text-xs uppercase tracking-widest text-white font-display">Notification Engine</h3>
            <p className="text-[10px] text-zinc-500">In-app countdown threshold reminders</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            id="btn-toggle-sound"
            onClick={onToggleSound}
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-[10px] uppercase font-bold tracking-widest cursor-pointer transition-all rounded-none ${
              soundEnabled
                ? 'bg-white text-black border-white'
                : 'bg-zinc-900 text-zinc-500 border-zinc-800'
            }`}
            title={soundEnabled ? 'Mute alarm sounds' : 'Enable alarm sounds'}
          >
            {soundEnabled ? (
              <>
                <Volume2 size={11} />
                <span>Audio: ON</span>
              </>
            ) : (
              <>
                <BellOff size={11} />
                <span>MUTED</span>
              </>
            )}
          </button>

          <button
            id="btn-test-sound"
            onClick={playChime}
            className="p-1.5 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-white transition-colors cursor-pointer"
            title="Test sound"
          >
            <Volume2 size={13} />
          </button>

          {alerts.length > 0 && (
            <button
              id="btn-clear-alerts"
              onClick={onClearAll}
              className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 hover:text-white ml-2 transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-zinc-800 bg-zinc-950/40">
          <Bell className="text-zinc-700 mb-3" size={24} />
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-display">No triggered reminders</p>
          <p className="text-[10px] text-zinc-600 mt-1 max-w-xs leading-relaxed">
            Automatic chime alerts trigger when a countdown reaches your configured threshold settings.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              id={`alert-item-${alert.id}`}
              className="flex justify-between items-start gap-4 p-3 bg-zinc-950 border border-zinc-800 transition-all text-xs hover:border-zinc-700"
            >
              <div className="flex gap-2.5">
                <div className={`mt-0.5 p-1 ${
                  alert.type === 'upcoming' 
                    ? 'text-indigo-400'
                    : alert.type === 'due'
                    ? 'text-yellow-400'
                    : 'text-rose-400'
                }`}>
                  <ShieldAlert size={14} />
                </div>
                <div>
                  <div className="font-black text-white leading-tight uppercase font-display tracking-tight">
                    {alert.eventTitle}
                  </div>
                  <div className="text-zinc-400 mt-1 text-[11px] leading-relaxed">{alert.message}</div>
                  <div className="text-[9px] text-zinc-600 font-mono mt-1.5 uppercase tracking-wide">
                    Happening {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <button
                id={`btn-dismiss-${alert.id}`}
                onClick={() => onDismiss(alert.id)}
                className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-900 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <Check size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
