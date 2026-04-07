FROM python:3.12-slim

WORKDIR /app

# 安裝依賴
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製程式碼
COPY . .

# 確保資料目錄存在
RUN mkdir -p /app/data

# 啟動
CMD ["python", "main.py"]
