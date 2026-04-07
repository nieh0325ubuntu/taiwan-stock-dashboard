import { useEffect, useState, useMemo } from 'react';
import { portfolioAPI, stocksAPI } from '../services/api';
import { Portfolio as PortfolioType, StockSearchResult } from '../types';

type SortField = 'stock_code' | 'shares' | 'avg_price' | 'buy_date' | 'current_price' | 'roi_percent' | 'profit_loss_percent';
type SortDirection = 'asc' | 'desc';

export default function Portfolio() {
  const [portfolios, setPortfolios] = useState<PortfolioType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<PortfolioType | null>(null);
  const [sortField, setSortField] = useState<SortField>('stock_code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
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

  const handleEdit = (portfolio: PortfolioType) => {
    setEditingPortfolio(portfolio);
    setShowEditModal(true);
  };

  const handleUpdatePortfolio = async () => {
    if (!editingPortfolio) return;
    try {
      const data: { shares?: number; avg_price?: number; buy_date?: string; fee?: number } = {};
      if (editingPortfolio.shares !== undefined) data.shares = editingPortfolio.shares;
      if (editingPortfolio.avg_price !== undefined) data.avg_price = editingPortfolio.avg_price;
      if (editingPortfolio.buy_date) data.buy_date = editingPortfolio.buy_date;
      if (editingPortfolio.fee !== undefined) data.fee = editingPortfolio.fee;
      
      await portfolioAPI.update(editingPortfolio.id, data);
      setShowEditModal(false);
      setEditingPortfolio(null);
      fetchPortfolios();
    } catch (err: any) {
      console.error('Error:', err);
      const msg = err?.response?.data?.detail || err?.message || JSON.stringify(err);
      alert('錯誤: ' + msg);
    }
  };

  const handleExport = async () => {
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
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const mode = confirm('要覆蓋現有資料嗎？\n\n確定 = 覆蓋所有現有持仓\n取消 = 合併(追加)現有資料') ? 'replace' : 'merge';
        
        const res = await portfolioAPI.import(data, mode);
        alert(`成功匯入 ${res.data.imported} 筆資料`);
        fetchPortfolios();
      } catch (err: any) {
        console.error(err);
        alert('匯入失敗: ' + (err?.response?.data?.detail || err?.message));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const totalValue = portfolios.reduce((sum, p) => sum + (p.current_price || p.avg_price) * p.shares, 0);
  const totalCost = portfolios.reduce((sum, p) => sum + p.avg_price * p.shares + p.fee, 0);
  const totalProfitLoss = totalValue - totalCost;
  const profitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

  const sortedPortfolios = useMemo(() => {
    return [...portfolios].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'stock_code':
          aVal = a.stock_code;
          bVal = b.stock_code;
          break;
        case 'shares':
          aVal = a.shares;
          bVal = b.shares;
          break;
        case 'avg_price':
          aVal = a.avg_price;
          bVal = b.avg_price;
          break;
        case 'buy_date':
          aVal = a.buy_date ? new Date(a.buy_date).getTime() : 0;
          bVal = b.buy_date ? new Date(b.buy_date).getTime() : 0;
          break;
        case 'current_price':
          aVal = a.current_price || 0;
          bVal = b.current_price || 0;
          break;
        case 'roi_percent':
          aVal = a.roi_percent || 0;
          bVal = b.roi_percent || 0;
          break;
        case 'profit_loss_percent':
          aVal = a.profit_loss_percent || 0;
          bVal = b.profit_loss_percent || 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [portfolios, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (loading) return <div>載入中...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">投資組合</h1>
        <div className="flex gap-2 items-center">
          <select
            value={sortField}
            onChange={(e) => handleSort(e.target.value as SortField)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="stock_code">股票代碼</option>
            <option value="shares">股數</option>
            <option value="avg_price">均價</option>
            <option value="buy_date">買入日期</option>
            <option value="current_price">現價</option>
            <option value="roi_percent">報酬率</option>
            <option value="profit_loss_percent">損益%</option>
          </select>
          <button
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            {sortDirection === 'asc' ? '↑ 升' : '↓ 降'}
          </button>
          <button
            onClick={handleExport}
            className="px-4 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            匯出
          </button>
          <label className="px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer">
            匯入
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            新增持仓
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">總市值</div>
          <div className="text-2xl font-bold">${totalValue.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">總成本(含手續費)</div>
          <div className="text-2xl font-bold">${totalCost.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500">總損益</div>
          <div className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalProfitLoss >= 0 ? '+' : ''}{totalProfitLoss.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({profitLossPercent.toFixed(2)}%)
          </div>
        </div>
      </div>

      {sortedPortfolios.length === 0 ? (
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
              {sortedPortfolios.map((p) => {
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
                    <td className="px-4 py-4 text-right">{p.avg_price.toFixed(2)}</td>
                    <td className="px-4 py-4 text-right">{p.fee.toFixed(2)}</td>
                    <td className="px-4 py-4 text-center">{p.buy_date ? p.buy_date.split('T')[0] : '-'}</td>
                    <td className="px-4 py-4 text-right">{p.current_price ? p.current_price.toFixed(2) : '-'}</td>
                    <td className="px-4 py-4 text-right">${value.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-4 text-center">{p.days_held !== null ? p.days_held + '天' : '-'}</td>
                    <td className={`px-4 py-4 text-right ${(roi || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {roi !== null ? `${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%` : '-'}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button onClick={() => handleEdit(p)} className="text-blue-600 hover:text-blue-800 mr-3">
                        編輯
                      </button>
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

      {showEditModal && editingPortfolio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">編輯持仓</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">股票代碼</label>
              <input
                type="text"
                value={editingPortfolio.stock_code}
                disabled
                className="w-full p-2 border rounded bg-gray-100"
              />
            </div>
            {editingPortfolio.stock_name && (
              <div className="mb-4 text-sm text-gray-600">股票名稱: {editingPortfolio.stock_name}</div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">股數</label>
              <input
                type="number"
                value={editingPortfolio.shares || ''}
                onChange={(e) => setEditingPortfolio({ ...editingPortfolio, shares: parseInt(e.target.value) || 0 })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">平均價格</label>
              <input
                type="number"
                step="0.01"
                value={editingPortfolio.avg_price || ''}
                onChange={(e) => setEditingPortfolio({ ...editingPortfolio, avg_price: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">買入日期</label>
              <input
                type="date"
                value={editingPortfolio.buy_date ? editingPortfolio.buy_date.split('T')[0] : ''}
                onChange={(e) => setEditingPortfolio({ ...editingPortfolio, buy_date: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">手續費</label>
              <input
                type="number"
                step="0.01"
                value={editingPortfolio.fee || ''}
                onChange={(e) => setEditingPortfolio({ ...editingPortfolio, fee: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUpdatePortfolio}
                className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
              >
                儲存
              </button>
              <button
                onClick={() => { setShowEditModal(false); setEditingPortfolio(null); }}
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
