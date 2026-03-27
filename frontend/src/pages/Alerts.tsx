import { useEffect, useState } from 'react';
import { alertsAPI, stocksAPI } from '../services/api';
import { Alert as AlertType, StockSearchResult } from '../types';

export default function Alerts() {
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAlert, setNewAlert] = useState({
    stock_code: '',
    condition: 'above' as 'above' | 'below',
    target_price: 0,
  });
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);

  const fetchAlerts = async () => {
    try {
      const res = await alertsAPI.getAll();
      setAlerts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleSearchStock = async (keyword: string) => {
    if (!keyword) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await stocksAPI.search(keyword);
      setSearchResults(res.data.results || []);
    } catch {
      setSearchResults([]);
    }
  };

  const handleSelectStock = (stock: StockSearchResult) => {
    setNewAlert({ ...newAlert, stock_code: stock.code });
    setSearchResults([]);
  };

  const handleAddAlert = async () => {
    if (!newAlert.stock_code || newAlert.target_price <= 0) return;
    try {
      await alertsAPI.create(newAlert);
      setShowAddModal(false);
      setNewAlert({ stock_code: '', condition: 'above', target_price: 0 });
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('確定要刪除這個提醒嗎？')) return;
    try {
      await alertsAPI.delete(id);
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>載入中...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">價格提醒</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          新增提醒
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center text-gray-500 py-12">尚未設定任何價格提醒</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">股票</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">條件</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">目標價格</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id} className="border-t">
                  <td className="px-6 py-4 font-medium">{alert.stock_code}</td>
                  <td className="px-6 py-4">
                    {alert.condition === 'above' ? '高於' : '低於'}
                  </td>
                  <td className="px-6 py-4 text-right">${alert.target_price}</td>
                  <td className="px-6 py-4">
                    {alert.is_active ? (
                      <span className="text-green-600">監控中</span>
                    ) : alert.triggered_at ? (
                      <span className="text-orange-600">已觸發</span>
                    ) : (
                      <span className="text-gray-500">停用</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => handleDelete(alert.id)} className="text-red-600 hover:text-red-800">
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-bold mb-2">Telegram 通知</h3>
        <p className="text-sm text-gray-600">
          綁定 Telegram Bot 以接收價格提醒通知。
          請在 Telegram 中搜尋並開啟您的 Bot，輸入 /start 綁定帳戶。
        </p>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">新增價格提醒</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">股票代碼</label>
              <input
                id="stock_code"
                name="stock_code"
                type="text"
                value={newAlert.stock_code}
                onChange={(e) => {
                  setNewAlert({ ...newAlert, stock_code: e.target.value });
                  handleSearchStock(e.target.value);
                }}
                className="w-full p-2 border rounded"
                placeholder="輸入股票代碼"
              />
              {searchResults.length > 0 && (
                <div className="border rounded mt-1 max-h-32 overflow-auto">
                  {searchResults.map((s) => (
                    <div
                      key={s.code}
                      onClick={() => handleSelectStock(s)}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                    >
                      {s.code} - {s.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">條件</label>
              <select
                id="condition"
                name="condition"
                value={newAlert.condition}
                onChange={(e) => setNewAlert({ ...newAlert, condition: e.target.value as 'above' | 'below' })}
                className="w-full p-2 border rounded"
              >
                <option value="above">價格高於</option>
                <option value="below">價格低於</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">目標價格</label>
              <input
                id="target_price"
                name="target_price"
                type="number"
                step="0.01"
                value={newAlert.target_price || ''}
                onChange={(e) => setNewAlert({ ...newAlert, target_price: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddAlert}
                className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
              >
                新增
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-gray-300 p-2 rounded hover:bg-gray-400"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}