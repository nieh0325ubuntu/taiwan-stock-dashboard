import { useState } from 'react';
import { modelAPI } from '../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const allMessages = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));
      const res = await modelAPI.chat(allMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.message.content }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '發生錯誤，請稍後再試' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">AI 助手</h1>
      
      <div className="bg-white rounded-lg shadow p-4 mb-4 h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center mt-20">輸入問題開始對話</p>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`mb-3 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <span className={`inline-block p-3 rounded-lg ${
                msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}>
                {msg.content}
              </span>
            </div>
          ))
        )}
        {loading && <p className="text-gray-500">思考中...</p>}
      </div>

      <div className="flex gap-2">
        <input
          id="message"
          name="message"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="輸入訊息..."
          className="flex-1 p-2 border rounded"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-gray-400"
        >
          送出
        </button>
      </div>
    </div>
  );
}
