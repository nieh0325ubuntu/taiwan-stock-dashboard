import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { createChart, IChartApi, CandlestickData, Time } from 'lightweight-charts';
import { stocksAPI, modelAPI } from '../services/api';
import { StockInfo, StockHistory, StockIndicators } from '../types';

export default function StockDetail() {
  const { code } = useParams<{ code: string }>();
  const [stock, setStock] = useState<StockInfo | null>(null);
  const [history, setHistory] = useState<StockHistory[]>([]);
  const [indicators, setIndicators] = useState<StockIndicators | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartReady, setChartReady] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const handleAnalyze = async () => {
    if (!stock || !indicators) return;
    setAnalyzing(true);
    try {
      const prompt = `請分析股票代碼 ${code} 的技術面情況：
股價：${stock.price}，漲跌：${stock.change} (${stock.change_percent}%)
技術指標：
- MA5: ${indicators.ma5}, MA10: ${indicators.ma10}, MA20: ${indicators.ma20}, MA60: ${indicators.ma60}
- RSI: ${indicators.rsi}, KD: K=${indicators.kd_k} D=${indicators.kd_d}

請給出簡短的技術分析建議。`;
      const res = await modelAPI.chat([{ role: 'user', content: prompt }]);
      setAiAnalysis(res.data.message.content);
    } catch (err) {
      setAiAnalysis('分析失敗，請稍後再試');
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!code) return;
      setLoading(true);
      
      try {
        const stockRes = await stocksAPI.getStock(code);
        setStock(stockRes.data);
      } catch (err: any) {
        console.error('Stock error:', err);
      }
      
      try {
        const historyRes = await stocksAPI.getHistory(code, 60);
        const historyData = historyRes.data.data || [];
        setHistory(historyData);
      } catch (err: any) {
        console.error('History error:', err);
      }
      
      try {
        const indicatorsRes = await stocksAPI.getIndicators(code);
        setIndicators(indicatorsRes.data || null);
      } catch (err: any) {
        console.error('Indicators error:', err);
      }
      
      setLoading(false);
      setTimeout(() => setChartReady(true), 100);
    };
    
    if (code) {
      fetchData();
    }
  }, [code]);

  useEffect(() => {
    if (!chartReady || !chartContainerRef.current || history.length === 0) {
      return;
    }

    const container = chartContainerRef.current;
    
    const chart = createChart(container, {
      width: container.offsetWidth || 800,
      height: 400,
      layout: { background: { color: '#ffffff' }, textColor: '#333333' },
      grid: { vertLines: { color: '#f0f0f0' }, horzLines: { color: '#f0f0f0' } },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const chartData: CandlestickData<Time>[] = history.map((h) => ({
      time: h.date as Time,
      open: Number(h.open),
      high: Number(h.high),
      low: Number(h.low),
      close: Number(h.close),
    }));

    candlestickSeries.setData(chartData);
    chart.timeScale().fitContent();
    
    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.offsetWidth || 800 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [chartReady, history]);

  if (loading) return <div className="p-4">載入中...</div>;
  if (!code) return <div className="p-4">無股票代碼</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{code}</h1>
        {stock && (
          <div className="flex items-center gap-4 mt-2">
            <span className="text-3xl font-bold">{stock.price || '-'}</span>
            {stock.change !== undefined && stock.change !== 0 && (
              <span className={`text-lg ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stock.change >= 0 ? '+' : ''}{stock.change} ({stock.change_percent?.toFixed(2)}%)
              </span>
            )}
          </div>
        )}
      </div>

      {stock && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">開盤</div>
            <div className="font-bold">{stock.open || '-'}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">最高</div>
            <div className="font-bold">{stock.high || '-'}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">最低</div>
            <div className="font-bold">{stock.low || '-'}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">成交量</div>
            <div className="font-bold">{stock.volume ? (stock.volume / 1000).toFixed(0) + 'K' : '-'}</div>
          </div>
        </div>
      )}

      <div 
        ref={chartContainerRef}
        className="bg-white rounded-lg shadow mb-6" 
        style={{ width: '100%', height: '400px', minHeight: '400px' }} 
      />

      {indicators && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">技術指標</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">MA5</div>
              <div className="font-bold">{indicators.ma5 || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">MA10</div>
              <div className="font-bold">{indicators.ma10 || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">MA20</div>
              <div className="font-bold">{indicators.ma20 || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">MA60</div>
              <div className="font-bold">{indicators.ma60 || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">RSI(14)</div>
              <div className="font-bold">{indicators.rsi || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">KD K</div>
              <div className="font-bold">{indicators.kd_k || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">KD D</div>
              <div className="font-bold">{indicators.kd_d || '-'}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">AI 技術分析</h2>
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !indicators}
            className="bg-purple-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
          >
            {analyzing ? '分析中...' : '開始分析'}
          </button>
        </div>
        {aiAnalysis && (
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="whitespace-pre-wrap">{aiAnalysis}</p>
          </div>
        )}
      </div>
    </div>
  );
}
