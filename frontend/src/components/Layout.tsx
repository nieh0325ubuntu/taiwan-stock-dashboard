import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { path: '/', label: '儀表板' },
    { path: '/stocks', label: '股票查詢' },
    { path: '/portfolio', label: '投資組合' },
    { path: '/alerts', label: '價格提醒' },
    { path: '/chat', label: 'AI 助手' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <Link to="/" className="flex items-center font-bold text-xl text-blue-600">
                台灣股市
              </Link>
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-1 pt-1 text-sm font-medium ${
                    location.pathname === item.path
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-4">{user?.email}</span>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-800"
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 px-4">{children}</main>
    </div>
  );
}