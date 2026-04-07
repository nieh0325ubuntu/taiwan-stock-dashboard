import { useState, useEffect } from 'react';
import { authAPI, portfolioAPI, alertsAPI, dataAPI } from '../services/api';
import { useAuthStore } from '../store/auth';

export default function Settings() {
  const { user, refreshUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [bindCode, setBindCode] = useState('');
  const [bindMessage, setBindMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 檢查 Telegram 綁定狀態
  useEffect(() => {
    refreshUser();
  }, []);

  const isTelegramBound = !!user?.telegram_chat_id;

  // 處理驗證碼綁定
  const handleBindTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bindCode.trim()) {
      setBindMessage({ type: 'error', text: '請輸入驗證碼' });
      return;
    }

    setLoading(true);
    setBindMessage(null);

    try {
      // 從 user 取得 chat_id (這裡需要用戶在 Telegram 已經開過機器人)
      // 實際上驗證碼是存在 Bot 端的，這裡我們用 email 來驗證
      const chatId = 'pending'; // 預設值，真正綁定由 Bot 完成
      await authAPI.bindTelegramByCode(bindCode.trim(), chatId);
      setBindMessage({ type: 'success', text: '綁定成功！' });
      setBindCode('');
      refreshUser();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || '綁定失敗，請確認驗證碼是否正確';
      setBindMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  // 解除 Telegram 綁定
  const handleUnbindTelegram = async () => {
    if (!confirm('確定要解除 Telegram 綁定嗎？')) return;

    setLoading(true);
    try {
      await authAPI.unbindTelegram();
      setBindMessage({ type: 'success', text: '已解除 Telegram 綁定' });
      refreshUser();
    } catch (err) {
      setBindMessage({ type: 'error', text: '解除失敗' });
    } finally {
      setLoading(false);
    }
  };

  // 完整備份
  const handleExportAll = async () => {
    setLoading(true);
    try {
      const res = await dataAPI.export();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('匯出失敗');
    } finally {
      setLoading(false);
    }
  };

  // 匯入完整備份
  const handleImportAll = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      setLoading(true);
      try {
        const data = JSON.parse(event.target?.result as string);
        
        if (data.type !== 'full_backup') {
          alert('無效的備份檔案格式');
          return;
        }

        const mode = confirm('要覆蓋現有資料嗎？\n\n確定 = 刪除所有現有資料並匯入\n取消 = 合併(追加)現有資料') ? 'replace' : 'merge';
        
        const res = await dataAPI.import(data, mode);
        alert(`匯入成功！\n投資組合: ${res.data.imported.portfolio} 筆\n價格提醒: ${res.data.imported.alerts} 筆`);
      } catch (err: any) {
        console.error(err);
        alert('匯入失敗: ' + (err?.response?.data?.detail || err?.message));
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 匯出投資組合
  const handleExportPortfolio = async () => {
    setLoading(true);
    try {
      const res = await portfolioAPI.export();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('匯出失敗');
    } finally {
      setLoading(false);
    }
  };

  // 匯出價格提醒
  const handleExportAlerts = async () => {
    setLoading(true);
    try {
      const res = await alertsAPI.export();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alerts_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('匯出失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">設定</h1>

      {/* Telegram 綁定 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-bold">Telegram 通知</h2>
          {isTelegramBound ? (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
              已綁定 ✓
            </span>
          ) : (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
              未綁定
            </span>
          )}
        </div>

        {isTelegramBound ? (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              您的帳戶已綁定 Telegram，可接收價格提醒通知。
            </p>
            <button
              onClick={handleUnbindTelegram}
              disabled={loading}
              className="px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              解除綁定
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              綁定 Telegram 後可接收即時價格提醒通知。綁定方式：
            </p>
            <ol className="text-sm text-gray-600 mb-4 list-decimal list-inside space-y-1">
              <li>在 Telegram 搜尋並開啟我們的機器人</li>
              <li>傳送 <code className="bg-gray-100 px-1 rounded">/bind 您的@email.com</code></li>
              <li>機器人會產生一組驗證碼</li>
              <li>在下面輸入驗證碼完成綁定</li>
            </ol>

            <form onSubmit={handleBindTelegram} className="flex gap-2">
              <input
                type="text"
                value={bindCode}
                onChange={(e) => setBindCode(e.target.value.toUpperCase())}
                placeholder="輸入驗證碼"
                maxLength={6}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-widest text-center font-mono text-lg"
              />
              <button
                type="submit"
                disabled={loading || bindCode.length < 6}
                className="px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                驗證
              </button>
            </form>

            {bindMessage && (
              <p className={`mt-2 text-sm ${bindMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {bindMessage.text}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 資料管理 */}
      <h2 className="text-lg font-bold mb-4">資料管理</h2>

      <div className="grid gap-6">
        {/* 完整備份 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-base font-bold mb-2">完整備份</h3>
          <p className="text-sm text-gray-600 mb-4">
            匯出或匯入所有資料（投資組合 + 價格提醒）
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleExportAll}
              disabled={loading}
              className="px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              匯出完整備份
            </button>
            <label className="px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer disabled:opacity-50">
              匯入完整備份
              <input type="file" accept=".json" onChange={handleImportAll} className="hidden" disabled={loading} />
            </label>
          </div>
        </div>

        {/* 投資組合 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-base font-bold mb-2">投資組合</h3>
          <p className="text-sm text-gray-600 mb-4">
            僅匯出或匯入投資組合資料
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleExportPortfolio}
              disabled={loading}
              className="px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              匯出投資組合
            </button>
          </div>
        </div>

        {/* 價格提醒 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-base font-bold mb-2">價格提醒</h3>
          <p className="text-sm text-gray-600 mb-4">
            僅匯出或匯入價格提醒資料
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleExportAlerts}
              disabled={loading}
              className="px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              匯出價格提醒
            </button>
          </div>
        </div>

        {/* 說明 */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="font-bold mb-2">使用說明</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• <strong>匯出</strong>：下載 JSON 格式的資料檔案</li>
            <li>• <strong>匯入</strong>：選擇 JSON 檔案匯入系統</li>
            <li>• <strong>覆蓋模式</strong>：刪除現有資料並匯入新資料</li>
            <li>• <strong>合併模式</strong>：將新資料追加到現有資料</li>
            <li>• 建議定期備份資料，以防止資料遺失</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
