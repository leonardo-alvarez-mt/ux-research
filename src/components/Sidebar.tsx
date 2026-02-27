import { LayoutDashboard, ListChecks, Archive, LogOut, Shield, X, Menu, Users, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type View = 'dashboard' | 'sessions' | 'participants' | 'archive';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navItems: { id: View; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'sessions', label: 'My Sessions', icon: ListChecks },
  { id: 'participants', label: 'Participants', icon: Users },
  { id: 'archive', label: 'Archive', icon: Archive },
];

export default function Sidebar({ currentView, onNavigate, mobileOpen, onMobileClose, collapsed, onToggleCollapse }: SidebarProps) {
  const { user, signOut } = useAuth();
  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  function handleNav(view: View) {
    onNavigate(view);
    onMobileClose();
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-slate-900 flex flex-col z-30 transition-all duration-300 lg:static lg:z-auto lg:shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${collapsed ? 'w-16' : 'w-64'}`}
      >
        <div className={`flex items-center border-b border-slate-700/60 shrink-0 ${collapsed ? 'justify-center px-0 py-5' : 'justify-between px-5 py-5'}`}>
          {!collapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm leading-tight whitespace-nowrap">Mitratech</p>
                <p className="text-slate-400 text-xs whitespace-nowrap">UX - GRC</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
          )}

          <button
            onClick={onMobileClose}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>

          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex text-slate-400 hover:text-white p-1 rounded transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <div className="hidden lg:flex justify-center py-2 border-b border-slate-700/60">
            <button
              onClick={onToggleCollapse}
              className="text-slate-400 hover:text-white p-1.5 rounded transition-colors"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        <nav className={`flex-1 py-5 space-y-1 overflow-y-auto overflow-x-hidden ${collapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleNav(id)}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center rounded-lg text-sm font-medium transition-all ${
                collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
              } ${
                currentView === id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <span className="whitespace-nowrap overflow-hidden">{label}</span>
              )}
            </button>
          ))}
        </nav>

        <div className={`border-t border-slate-700/60 ${collapsed ? 'px-2 py-4' : 'px-3 py-4'}`}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 px-3 py-2 mb-2">
                <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">{initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate whitespace-nowrap">{displayName}</p>
                  <p className="text-slate-400 text-xs truncate whitespace-nowrap">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Sign Out</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center" title={displayName}>
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
              <button
                onClick={signOut}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}
