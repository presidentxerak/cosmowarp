import { useState } from 'react';
import SDKView from './SDKView';
import AdminView from './AdminView';
import ConsoleView from './ConsoleView';

type DevTab = 'sdk' | 'admin' | 'console';

export default function DevView() {
  const [tab, setTab] = useState<DevTab>('sdk');

  const tabs: { id: DevTab; label: string; icon: string }[] = [
    { id: 'sdk', label: 'SDK', icon: '\u269B' },
    { id: 'admin', label: 'Admin', icon: '\u26BF' },
    { id: 'console', label: 'Console', icon: '>' },
  ];

  return (
    <div className="space-y-4">
      <div className="glass-panel p-2">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 px-3 py-2 rounded-none text-xs font-medium transition-all cursor-pointer ${
                tab === t.id
                  ? 'bg-current/10 opacity-80'
                  : 'opacity-60 hover:opacity-80 hover:bg-white/5'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'sdk' && <SDKView />}
      {tab === 'admin' && <AdminView />}
      {tab === 'console' && <ConsoleView />}
    </div>
  );
}
