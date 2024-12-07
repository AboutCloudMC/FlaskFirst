FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create storage directory if it doesn't exist
RUN mkdir -p storage

# Expose port 5000
EXPOSE 5000

# Run the application
CMD ["python", "server.py"]
