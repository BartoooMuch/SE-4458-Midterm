# Deployment Guide

## Azure App Service Deployment

### 1. Prerequisites

- Azure account (ücretsiz tier mevcut)
- Azure CLI veya VS Code Azure Extension
- PostgreSQL database (Azure Database for PostgreSQL veya başka bir provider)

### 2. Azure Setup

#### PostgreSQL Database Oluşturma

```bash
# Azure CLI ile
az postgres flexible-server create \
  --resource-group myResourceGroup \
  --name mobile-provider-db \
  --location eastus \
  --admin-user myadmin \
  --admin-password MyPassword123! \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 13 \
  --storage-size 32
```

#### App Service Oluşturma

```bash
az webapp create \
  --resource-group myResourceGroup \
  --plan myAppServicePlan \
  --name mobile-provider-api \
  --runtime "NODE:18-lts"
```

### 3. Database Setup

1. Database'e bağlanın
2. `database/schema.sql` dosyasını çalıştırın

```bash
psql -h mobile-provider-db.postgres.database.azure.com \
     -U myadmin \
     -d postgres \
     -f database/schema.sql
```

### 4. Environment Variables

Azure Portal → App Service → Configuration → Application settings:

```
PORT=3000
NODE_ENV=production
DB_HOST=mobile-provider-db.postgres.database.azure.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=myadmin
DB_PASSWORD=MyPassword123!
JWT_SECRET=your-super-secret-jwt-key-change-this
GATEWAY_URL=https://mobile-provider-api.azurewebsites.net
```

### 5. Deployment

#### VS Code Extension ile:

1. VS Code'da Azure Extension yükleyin
2. Azure'a login olun
3. App Service'e right-click → Deploy to Web App
4. Folder seçin ve deploy edin

#### GitHub Actions ile:

`.github/workflows/deploy.yml` oluşturun:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Deploy to Azure
        uses: azure/webapps-deploy@v2
        with:
          app-name: 'mobile-provider-api'
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: .
```

### 6. Verify Deployment

- Health check: `https://mobile-provider-api.azurewebsites.net/health`
- Swagger: `https://mobile-provider-api.azurewebsites.net/api-docs`

## Render.com Deployment

### 1. Prerequisites

- Render.com account
- GitHub repository

### 2. Database Setup

1. Render Dashboard → New → PostgreSQL
2. Database bilgilerini kaydedin

### 3. Web Service Setup

1. Render Dashboard → New → Web Service
2. GitHub repository'yi bağlayın
3. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

### 4. Environment Variables

Render Dashboard → Environment:

```
NODE_ENV=production
PORT=3000
DB_HOST=<your-db-host>
DB_PORT=5432
DB_NAME=<your-db-name>
DB_USER=<your-db-user>
DB_PASSWORD=<your-db-password>
JWT_SECRET=<your-jwt-secret>
GATEWAY_URL=https://your-app.onrender.com
```

### 5. Database Migration

Render shell veya local'den:

```bash
psql <connection-string> -f database/schema.sql
```

## AWS EC2 Deployment

### 1. EC2 Instance Oluşturma

- Ubuntu 22.04 LTS
- t2.micro (free tier)
- Security group: Port 22 (SSH), 3000 (HTTP)

### 2. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone <your-repo-url>
cd Midterm

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your settings
```

### 3. Database Setup

```bash
sudo -u postgres psql
CREATE DATABASE mobile_provider_db;
CREATE USER app_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE mobile_provider_db TO app_user;
\q

# Run schema
psql -U app_user -d mobile_provider_db -f database/schema.sql
```

### 4. Start Application

```bash
# Using PM2
pm2 start server.js --name mobile-provider-api
pm2 save
pm2 startup
```

### 5. Nginx Reverse Proxy (Optional)

```bash
sudo apt install -y nginx

# Configure nginx
sudo nano /etc/nginx/sites-available/default
```

Nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo nginx -t
sudo systemctl restart nginx
```

## Docker Deployment

### 1. Dockerfile Oluştur

`Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

### 2. Docker Compose

`docker-compose.yml`:

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=db
      - DB_PORT=5432
      - DB_NAME=mobile_provider_db
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - JWT_SECRET=your-secret
    depends_on:
      - db

  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=mobile_provider_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql

volumes:
  postgres_data:
```

### 3. Run

```bash
docker-compose up -d
```

## Environment Variables Checklist

Deployment öncesi kontrol edin:

- [ ] `PORT` - Server port (default: 3000)
- [ ] `NODE_ENV` - production/development
- [ ] `DB_HOST` - Database host
- [ ] `DB_PORT` - Database port (default: 5432)
- [ ] `DB_NAME` - Database name
- [ ] `DB_USER` - Database user
- [ ] `DB_PASSWORD` - Database password
- [ ] `JWT_SECRET` - JWT secret key (güçlü bir değer)
- [ ] `GATEWAY_URL` - API Gateway URL (varsa)

## Health Check

Deployment sonrası test:

```bash
# Health check
curl https://your-api-url/health

# API docs
curl https://your-api-url/api-docs
```

## Troubleshooting

### Database Connection Issues

- Firewall rules kontrol edin
- Connection string doğru mu?
- Database çalışıyor mu?

### Port Issues

- Port 3000 açık mı?
- Environment variable doğru mu?

### Logs

```bash
# PM2 logs
pm2 logs mobile-provider-api

# Docker logs
docker-compose logs -f api

# Azure logs
az webapp log tail --name mobile-provider-api --resource-group myResourceGroup
```

