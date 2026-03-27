import { useState } from 'react';
import { Link } from 'react-router-dom';
import { stocksAPI } from '../services/api';
import { StockSearchResult } from '../types';

export default function StockSearch() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const res = await stocksAPI.search(keyword);
      setResults(res.data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">股票查詢</h1>

      <div className="flex gap-2 mb-6">
        <input
          id="keyword"
          name="keyword"
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="輸入股票代碼或名稱"
          className="flex-1 p-3 border rounded-lg"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '搜尋中...' : '搜尋'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">代碼</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名稱</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody>
              {results.map((stock) => (
                <tr key={stock.code} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{stock.code}</td>
                  <td className="px-6 py-4">{stock.name}</td>
                  <td className="px-6 py-4">
                    <Link to={`/stocks/${stock.code}`} className="text-blue-600 hover:underline">
                      查看詳情
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}