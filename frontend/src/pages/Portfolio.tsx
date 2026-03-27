import { useEffect, useState } from 'react';
import { portfolioAPI, stocksAPI } from '../services/api';
import { Portfolio as PortfolioType, StockSearchResult } from '../types';

export default function Portfolio() {
  const [portfolios, setPortfolios] = useState<PortfolioType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPortfolio, setNewPortfolio] = useState({
    stock_code: '',
    stock_name: '',
    shares: 0,
    avg_price: 0,
    buy_date: '',
    fee: 0,
  });
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);

  const fetchPortfolios = async () => {
    try {
      const res = await portfolioAPI.getAll();
      setPortfolios(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolios();
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
    setNewPortfolio({ ...newPortfolio, stock_code: stock.code, stock_name: stock.name });
    setSearchResults([]);
  };

  const handleAddPortfolio = async () => {
    console.log('Adding portfolio:', newPortfolio);
    if (!newPortfolio.stock_code || newPortfolio.shares <= 0 || newPortfolio.avg_price <= 0) {
      alert('請填寫股票代碼、股數和均價');
      return;
    }
    try {
      const data: { stock_code: string; shares: number; avg_price: number; stock_name?: string; buy_date?: string; fee?: number } = {
        stock_code: newPortfolio.stock_code,
        shares: newPortfolio.shares,
        avg_price: newPortfolio.avg_price,
      };
      if (newPortfolio.stock_name) data.stock_name = newPortfolio.stock_name;
      if (newPortfolio.buy_date) data.buy_date = newPortfolio.buy_date;
      if (newPortfolio.fee > 0) data.fee = newPortfolio.fee;
      
      console.log('Sending data:', JSON.stringify(data));
      const res = await portfolioAPI.add(data);
      console.log('Response:', res);
      setShowAddModal(false);
      setNewPortfolio({ stock_code: '', stock_name: '', shares: 0, avg_price: 0, buy_date: '', fee: 0 });
      fetchPortfolios();
    } catch (err: any) {
      console.error('Error:', err);
      const msg = err?.response?.data?.detail || err?.message || JSON.stringify(err);
      alert('錯誤: ' + msg);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('確定要刪除這筆持仓嗎？')) return;
    try {
      await portfolioAPI.delete(id);
      fetchPortfolios();
    } catch (err) {
      console.error(err);
    }
  };

  const totalValue = portfolios.reduce((sum, p) => sum + (p.current_price || p.avg_price) * p.shares, 0);
  const totalCost = portfolios.reduce((sum, p) => sum + p.avg_price * p.shares + p.fee, 0);
  const totalProfitLoss = totalValue - totalCost;
  const profitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

  if (loading) return <div>載入中...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">投資組合</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          新增持仓
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">總市值</div>
          <div className="text-2xl font-bold">${totalValue.toLocaleString('zh-TW', { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">總成本(含手續費)</div>
          <div className="text-2xl font-bold">${totalCost.toLocaleString('zh-TW', { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">總損益</div>
          <div className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalProfitLoss >= 0 ? '+' : ''}{totalProfitLoss.toLocaleString('zh-TW', { maximumFractionDigits: 0 })} ({profitLossPercent.toFixed(2)}%)
          </div>
        </div>
      </div>

      {portfolios.length === 0 ? (
        <div className="text-center text-gray-500 py-12">尚未新增任何持仓</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">股票</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">股數</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">均價</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">手續費</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">買入日期</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">現價</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">市值</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">持有天數</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">報酬率</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody>
              {portfolios.map((p) => {
                const value = (p.current_price || p.avg_price) * p.shares;
                const totalCost = p.avg_price * p.shares + p.fee;
                const roi = totalCost > 0 && p.current_price 
                  ? ((p.current_price * p.shares - p.fee) / totalCost - 1) * 100 
                  : null;
                return (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-4">
                      <div className="font-medium">{p.stock_code}</div>
                      {p.stock_name && <div className="text-sm text-gray-500">{p.stock_name}</div>}
                    </td>
                    <td className="px-4 py-4 text-right">{p.shares}</td>
                    <td className="px-4 py-4 text-right">{p.avg_price}</td>
                    <td className="px-4 py-4 text-right">{p.fee}</td>
                    <td className="px-4 py-4 text-center">{p.buy_date ? p.buy_date.split('T')[0] : '-'}</td>
                    <td className="px-4 py-4 text-right">{p.current_price || '-'}</td>
                    <td className="px-4 py-4 text-right">${value.toLocaleString('zh-TW', { maximumFractionDigits: 0 })}</td>
                    <td className="px-4 py-4 text-center">{p.days_held !== null ? p.days_held + '天' : '-'}</td>
                    <td className={`px-4 py-4 text-right ${(roi || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {roi !== null ? `${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%` : '-'}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-800">
                        刪除
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">新增持仓</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">股票代碼</label>
              <input
                id="stock_code"
                name="stock_code"
                type="text"
                value={newPortfolio.stock_code}
                onChange={(e) => {
                  setNewPortfolio({ ...newPortfolio, stock_code: e.target.value });
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
            {newPortfolio.stock_name && (
              <div className="mb-4 text-sm text-gray-600">股票名稱: {newPortfolio.stock_name}</div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">股數</label>
              <input
                id="shares"
                name="shares"
                type="number"
                value={newPortfolio.shares || ''}
                onChange={(e) => setNewPortfolio({ ...newPortfolio, shares: parseInt(e.target.value) || 0 })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">平均價格</label>
              <input
                id="avg_price"
                name="avg_price"
                type="number"
                step="0.01"
                value={newPortfolio.avg_price || ''}
                onChange={(e) => setNewPortfolio({ ...newPortfolio, avg_price: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">買入日期</label>
              <input
                id="buy_date"
                name="buy_date"
                type="date"
                value={newPortfolio.buy_date}
                onChange={(e) => setNewPortfolio({ ...newPortfolio, buy_date: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">手續費</label>
              <input
                id="fee"
                name="fee"
                type="number"
                step="0.01"
                value={newPortfolio.fee || ''}
                onChange={(e) => setNewPortfolio({ ...newPortfolio, fee: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddPortfolio}
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
