FROM python:3.11-slim

WORKDIR /app

# 필수 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 코드 복사
COPY . .

# 실행
CMD ["python", "bot.py"]
