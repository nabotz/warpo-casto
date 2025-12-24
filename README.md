# Farcaster Discord Bot

Bot notifikasi yang menerima webhook dari Neynar API (partner resmi Farcaster) dan mengirim notifikasi ke Discord untuk event follow dan recast.

## Instalasi

1. **Clone repository**
   ```bash
   git clone https://github.com/nabotz/warpo-casto.git
   cd farcaster-discord-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit file `.env` dan isi dengan nilai yang sesuai:
   ```env
   PORT=3000
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
   NEYNAR_WEBHOOK_SECRET=your_neynar_webhook_secret_here
   FILTER_FID=12345,67890
   FILTER_USERNAME=username1,username2
   LOG_LEVEL=info
   ```

## Konfigurasi

### Setting Discord Webhook
1. buat webhook discord

### Setting Neynar Webhook
1. Login ke dashboard Neynar
2. Pergi ke Webhook settings
3. Buat webhook baru dengan URL: `https://your-domain.com/webhook`
4. Copy secret key ke `NEYNAR_WEBHOOK_SECRET`

### Filtering (Opsional)
- `FILTER_FID`: Filter berdasarkan FID user (comma-separated)
- `FILTER_USERNAME`: Filter berdasarkan username (comma-separated)

## Penggunaan

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### POST /webhook
Endpoint utama untuk menerima webhook dari Neynar.

**Headers:**
- `Content-Type: application/json`
- `x-neynar-signature: sha256=hash`

**Response:**
```json
{
  "success": true,
  "processed": true,
  "message": "Webhook processed successfully"
}
```

### GET /health
Health check endpoint untuk monitoring.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

### GET /
Informasi bot dan endpoint yang tersedia.

## Event Types

Bot mendukung event berikut:

1. **follow.created**: User melakukan follow
2. **reaction.created**: User melakukan reaction (hanya recast yang diproses)
3. **like.created**: User melakukan like

## Format Pesan Discord

- **Follow**: `➕ **New Follow!**\n{username} followed {target}`
- **Recast**: `🔁 **New Recast!**\n{username} recasted:\n"{cast_text}"`
- **Like**: `❤️ **New Like!**\n{username} liked:\n"{cast_text}"`

## Testing

### Test dengan curl
```bash
# Test health endpoint
curl http://localhost:3000/health

# Test webhook (dengan signature yang valid)
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "x-neynar-signature: sha256=your_signature" \
  -d '{"type":"follow.created","data":{"follower":{"fid":123,"username":"test"},"target":{"fid":456,"username":"target"}}}'
```

### Test Script
```bash
# Run test script
./test.sh
```

## Deployment

### Docker
```bash
# Build image
docker build -t farcaster-discord-bot .

# Run container
docker run -p 3000:3000 --env-file .env farcaster-discord-bot
```

### Platform Deployment
Bot bisa di-deploy ke berbagai platform seperti Railway, Render, Fly.io, atau Heroku. Set environment variables sesuai dengan platform yang dipilih.

## Troubleshooting

### Common Issues
- **Webhook signature invalid**: Pastikan `NEYNAR_WEBHOOK_SECRET` sudah benar
- **Discord message tidak terkirim**: Pastikan `DISCORD_WEBHOOK_URL` sudah benar
- **Event tidak diproses**: Cek log untuk melihat tipe event

### Logs
Bot akan menampilkan log detail untuk debugging webhook, signature verification, dan event processing.

