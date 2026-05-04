import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/api';
import { LayoutDashboard, FileText, BarChart3, LogOut, Inbox } from 'lucide-react';

const nav = [
  { to: '/',     label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/rfqs', label: 'Customer RFQs', icon: Inbox },
  { to: '/reports', label: 'Reports',   icon: BarChart3 },
];

function cn(...cls: (string|false|undefined)[]) { return cls.filter(Boolean).join(' '); }

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="w-60 h-screen bg-white border-r border-gray-100 flex flex-col fixed left-0 top-0 shadow-sm">
      <div className="h-16 flex items-center px-5 border-b border-gray-100 gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <FileText size={16} className="text-white" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm leading-tight">RFQ Tracker</p>
          <p className="text-xs text-gray-400">Customer RFQ System</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => cn(
              'sidebar-link',
              isActive && 'active'
            )}>
            <Icon size={17} />{label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-gray-50">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs flex-shrink-0">
            {user?.name?.slice(0,2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="text-gray-400 hover:text-red-500 transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
