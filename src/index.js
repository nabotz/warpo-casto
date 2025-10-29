import express from 'express';
import dotenv from 'dotenv';
import { verifyNeynarSignature, validateWebhookPayload, logWebhookInfo } from './verify.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware untuk menerima raw body (diperlukan untuk verifikasi HMAC)
app.use('/webhook', express.raw({ type: 'application/json' }));

// Middleware untuk parsing JSON pada route lainnya
app.use(express.json());

// Middleware untuk logging request
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * Handler untuk mengirim pesan ke Discord webhook
 * 
 * @param {string} message - Pesan yang akan dikirim
 * @returns {Promise<boolean>} - True jika berhasil, false jika gagal
 */
async function sendDiscordMessage(message) {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.error('DISCORD_WEBHOOK_URL not configured');
      return false;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
      }),
    });

    if (!response.ok) {
      console.error(`Discord webhook failed: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log('Message sent to Discord successfully');
    return true;
  } catch (error) {
    console.error('Error sending message to Discord:', error.message);
    return false;
  }
}

/**
 * Handler untuk event follow.created
 * Mengirim notifikasi ketika ada user yang follow
 * 
 * @param {Object} data - Data dari webhook payload
 * @returns {Promise<string>} - Pesan yang akan dikirim ke Discord
 */
async function handleFollowEvent(data) {
  try {
    const follower = data.follower;
    const target = data.target;
    
    if (!follower || !target) {
      throw new Error('Missing follower or target data');
    }

    const followerName = follower.username || `FID:${follower.fid}`;
    const targetName = target.username || `FID:${target.fid}`;
    
    return `➕ **New Follow!**\n${followerName} followed ${targetName}`;
  } catch (error) {
    console.error('Error handling follow event:', error.message);
    throw error;
  }
}

/**
 * Handler untuk event reaction.created (recast)
 * Mengirim notifikasi ketika ada user yang melakukan recast
 * 
 * @param {Object} data - Data dari webhook payload
 * @returns {Promise<string>} - Pesan yang akan dikirim ke Discord
 */
async function handleRecastEvent(data) {
  try {
    const reactor = data.reactor;
    const cast = data.cast;
    
    if (!reactor || !cast) {
      throw new Error('Missing reactor or cast data');
    }

    const reactorName = reactor.username || `FID:${reactor.fid}`;
    const castText = cast.text ? cast.text.substring(0, 100) + (cast.text.length > 100 ? '...' : '') : 'Untitled cast';
    
    return `🔁 **New Recast!**\n${reactorName} recasted:\n"${castText}"`;
  } catch (error) {
    console.error('Error handling recast event:', error.message);
    throw error;
  }
}

/**
 * Handler untuk event like.created
 * Mengirim notifikasi ketika ada user yang melakukan like
 * 
 * @param {Object} data - Data dari webhook payload
 * @returns {Promise<string>} - Pesan yang akan dikirim ke Discord
 */
async function handleLikeEvent(data) {
  try {
    const reactor = data.reactor;
    const cast = data.cast;
    
    if (!reactor || !cast) {
      throw new Error('Missing reactor or cast data');
    }

    const reactorName = reactor.username || `FID:${reactor.fid}`;
    const castText = cast.text ? cast.text.substring(0, 100) + (cast.text.length > 100 ? '...' : '') : 'Untitled cast';
    
    return `❤️ **New Like!**\n${reactorName} liked:\n"${castText}"`;
  } catch (error) {
    console.error('Error handling like event:', error.message);
    throw error;
  }
}

/**
 * Filter user berdasarkan FID atau username
 * 
 * @param {Object} user - User object dari webhook data
 * @returns {boolean} - True jika user harus difilter, false jika tidak
 */
function shouldFilterUser(user) {
  const filterFids = process.env.FILTER_FID?.split(',').map(fid => parseInt(fid.trim()));
  const filterUsernames = process.env.FILTER_USERNAME?.split(',').map(username => username.trim().toLowerCase());
  
  if (filterFids && filterFids.includes(user.fid)) {
    return true;
  }
  
  if (filterUsernames && user.username && filterUsernames.includes(user.username.toLowerCase())) {
    return true;
  }
  
  return false;
}

/**
 * Route handler untuk webhook dari Neynar
 * Menerima webhook, verifikasi signature, dan kirim notifikasi ke Discord
 */
app.post('/webhook', async (req, res) => {
  try {
    // Dapatkan raw body dan signature
    const rawBody = req.body;
    const signature = req.headers['x-neynar-signature'];
    
    // Verifikasi signature HMAC
    const secret = process.env.NEYNAR_WEBHOOK_SECRET;
    if (!secret) {
      console.error('NEYNAR_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    if (!verifyNeynarSignature(rawBody, signature, secret)) {
      console.warn('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Parse JSON payload
    const payload = JSON.parse(rawBody.toString());
    
    // Validasi payload
    if (!validateWebhookPayload(payload)) {
      console.error('Invalid webhook payload');
      return res.status(400).json({ error: 'Invalid payload' });
    }
    
    // Log informasi webhook
    logWebhookInfo(payload, signature);
    
    let message = '';
    let shouldProcess = true;
    
    // Handle berdasarkan tipe event
    switch (payload.type) {
      case 'follow.created':
        // Filter user jika diperlukan
        if (shouldFilterUser(payload.data.follower)) {
          console.log('Filtered out follow event for user:', payload.data.follower.username || payload.data.follower.fid);
          shouldProcess = false;
          break;
        }
        message = await handleFollowEvent(payload.data);
        break;
        
      case 'reaction.created':
        // Cek apakah ini recast
        if (payload.data.reaction_type === 'recast') {
          // Filter user jika diperlukan
          if (shouldFilterUser(payload.data.reactor)) {
            console.log('Filtered out recast event for user:', payload.data.reactor.username || payload.data.reactor.fid);
            shouldProcess = false;
            break;
          }
          message = await handleRecastEvent(payload.data);
        } else {
          console.log('Ignoring non-recast reaction:', payload.data.reaction_type);
          shouldProcess = false;
        }
        break;
        
      case 'like.created':
        // Filter user jika diperlukan
        if (shouldFilterUser(payload.data.reactor)) {
          console.log('Filtered out like event for user:', payload.data.reactor.username || payload.data.reactor.fid);
          shouldProcess = false;
          break;
        }
        message = await handleLikeEvent(payload.data);
        break;
        
      default:
        console.log('Unhandled event type:', payload.type);
        shouldProcess = false;
    }
    
    // Kirim pesan ke Discord jika ada
    if (shouldProcess && message) {
      const success = await sendDiscordMessage(message);
      if (!success) {
        return res.status(500).json({ error: 'Failed to send Discord message' });
      }
    }
    
    // Response sukses
    res.status(200).json({ 
      success: true, 
      processed: shouldProcess,
      message: shouldProcess ? 'Webhook processed successfully' : 'Webhook received but not processed'
    });
    
  } catch (error) {
    console.error('Error processing webhook:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Health check endpoint
 * Untuk monitoring dan debugging
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Root endpoint dengan informasi bot
 */
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Farcaster Discord Bot',
    version: '1.0.0',
    description: 'Bot notifikasi Farcaster ke Discord menggunakan webhook Neynar API',
    endpoints: {
      webhook: '/webhook',
      health: '/health'
    },
    supportedEvents: [
      'follow.created',
      'reaction.created (recast)',
      'like.created'
    ]
  });
});

/**
 * Error handling middleware
 * Menangkap error yang tidak tertangkap
 */
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error.message);
  res.status(500).json({ error: 'Internal server error' });
});

/**
 * 404 handler untuk route yang tidak ditemukan
 */
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log('=== Farcaster Discord Bot Started ===');
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log('=====================================');
});

/**
 * Graceful shutdown handler
 * Menangani sinyal SIGTERM dan SIGINT untuk shutdown yang bersih
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
