import { useEffect, useState } from 'react';
import { stocksAPI, portfolioAPI } from '../services/api';
import { StockRealtime, Portfolio as PortfolioType } from '../types';
import { Link } from 'react-router-dom';

const STOCK_NAMES: Record<string, string> = {
  "2330": "台積電", "2317": "鴻海", "2454": "聯發科", "2882": "玉山金",
  "2891": "中信金", "1101": "台泥", "1301": "聯電", "2412": "中華電",
  "2002": "中鋼", "2912": "統一", "1711": "中石化", "1215": "卜蜂",
  "1605": "華新", "2105": "正新", "3034": "聯詠", "3711": "日月光",
  "3231": "台塑", "6505": "台塑化", "0050": "元大台灣50", "0051": "元大電子",
};

export default function Dashboard() {
  const [popularStocks, setPopularStocks] = useState<StockRealtime[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioType[]>([]);
  const [loading, setLoading] = useState(true);

  const popularCodes = ['2330', '2317', '2454', '2882', '2891'];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const stocks: StockRealtime[] = [];
        for (const code of popularCodes) {
          try {
            const res = await stocksAPI.getRealtime(code);
            if (res.data && res.data.price > 0) {
              stocks.push(res.data);
            }
          } catch {
            // Skip failed stocks
          }
        }
        setPopularStocks(stocks);

        try {
          const portfolioRes = await portfolioAPI.getAll();
          setPortfolio(portfolioRes.data);
        } catch {
          // Skip portfolio errors
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalValue = portfolio.reduce(
    (sum, p) => sum + (p.current_price || p.avg_price) * p.shares,
    0
  );
  const totalCost = portfolio.reduce((sum, p) => sum + p.avg_price * p.shares, 0);
  const totalProfitLoss = totalValue - totalCost;
  const profitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

  if (loading) return <div>載入中...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">股市儀表板</h1>

      {portfolio.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">總市值</div>
            <div className="text-2xl font-bold">${totalValue.toLocaleString('zh-TW', { maximumFractionDigits: 0 })}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">總成本</div>
            <div className="text-2xl font-bold">${totalCost.toLocaleString('zh-TW', { maximumFractionDigits: 0 })}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">總損益</div>
            <div className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalProfitLoss >= 0 ? '+' : ''}{totalProfitLoss.toLocaleString('zh-TW', { maximumFractionDigits: 0 })} ({profitLossPercent.toFixed(2)}%)
            </div>
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold mb-4">熱門股票</h2>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {popularStocks.map((stock) => (
          <Link
            key={stock.code}
            to={`/stocks/${stock.code}`}
            className="bg-white p-4 rounded-lg shadow hover:shadow-md"
          >
            <div className="font-bold">{stock.code}</div>
            <div className="text-sm text-gray-600">{STOCK_NAMES[stock.code] || ''}</div>
            <div className="text-lg font-semibold mt-1">{stock.price}</div>
            <div className={`text-sm ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stock.change >= 0 ? '+' : ''}{stock.change}
            </div>
            {stock.volume && (
              <div className="text-xs text-gray-500 mt-1">
                量: {(stock.volume / 1000).toFixed(0)}K
              </div>
            )}
          </Link>
        ))}
      </div>

      {portfolio.length > 0 && (
        <>
          <h2 className="text-xl font-bold mb-4">我的持股</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">股票</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">股數</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">均價</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">現價</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">損益</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-6 py-4">
                      <Link to={`/stocks/${p.stock_code}`} className="font-medium text-blue-600 hover:underline">
                        {p.stock_code}
                      </Link>
                      {p.stock_name && <div className="text-sm text-gray-500">{p.stock_name}</div>}
                    </td>
                    <td className="px-6 py-4 text-right">{p.shares}</td>
                    <td className="px-6 py-4 text-right">{p.avg_price}</td>
                    <td className="px-6 py-4 text-right">{p.current_price || '-'}</td>
                    <td className={`px-6 py-4 text-right ${(p.profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {p.profit_loss !== null ? `${p.profit_loss >= 0 ? '+' : ''}${p.profit_loss} (${p.profit_loss_percent?.toFixed(2)}%)` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}