export interface User {
  id: number;
  email: string;
  full_name: string | null;
  telegram_chat_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface StockSearchResult {
  code: string;
  name: string;
}

export interface StockInfo {
  code: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover: number;
  updated: string;
}

export interface StockRealtime {
  code: string;
  name: string;
  price: number;
  change: number;
  volume: number;
  updated: string;
}

export interface StockHistory {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockIndicators {
  code: string;
  name: string;
  current_price: number;
  ma5: number;
  ma10: number;
  ma20: number;
  ma60: number | null;
  rsi: number;
  kd_k: number;
  kd_d: number;
  updated: string;
}

export interface Portfolio {
  id: number;
  user_id: number;
  stock_code: string;
  stock_name: string | null;
  shares: number;
  avg_price: number;
  buy_date: string | null;
  fee: number;
  created_at: string;
  updated_at: string;
  current_price: number | null;
  profit_loss: number | null;
  profit_loss_percent: number | null;
  days_held: number | null;
  roi_percent: number | null;
}

export interface Alert {
  id: number;
  user_id: number;
  stock_code: string;
  condition: 'above' | 'below';
  target_price: number;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  message: ChatMessage;
}