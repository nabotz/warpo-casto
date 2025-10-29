import crypto from 'crypto';

/**
 * Verifikasi HMAC signature dari Neynar webhook
 * Menggunakan crypto.timingSafeEqual untuk mencegah timing attacks
 * 
 * @param {string} payload - Raw body dari webhook request
 * @param {string} signature - Signature dari header x-neynar-signature
 * @param {string} secret - Secret key dari environment variable
 * @returns {boolean} - True jika signature valid, false jika tidak
 */
export function verifyNeynarSignature(payload, signature, secret) {
  try {
    // Pastikan semua parameter ada
    if (!payload || !signature || !secret) {
      console.error('Missing required parameters for signature verification');
      return false;
    }

    // Parse signature header (format: sha256=hash)
    const signatureParts = signature.split('=');
    if (signatureParts.length !== 2 || signatureParts[0] !== 'sha256') {
      console.error('Invalid signature format. Expected: sha256=hash');
      return false;
    }

    const receivedHash = signatureParts[1];

    // Generate expected hash menggunakan secret
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    // Bandingkan hash menggunakan timingSafeEqual untuk mencegah timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );

    if (!isValid) {
      console.warn('Signature verification failed');
    }

    return isValid;
  } catch (error) {
    console.error('Error during signature verification:', error.message);
    return false;
  }
}

/**
 * Validasi payload webhook dari Neynar
 * Memastikan payload memiliki struktur yang diharapkan
 * 
 * @param {Object} payload - Parsed JSON payload dari webhook
 * @returns {boolean} - True jika payload valid, false jika tidak
 */
export function validateWebhookPayload(payload) {
  try {
    // Pastikan payload adalah object
    if (!payload || typeof payload !== 'object') {
      console.error('Invalid payload: not an object');
      return false;
    }

    // Pastikan ada field yang diperlukan
    const requiredFields = ['type', 'data'];
    for (const field of requiredFields) {
      if (!(field in payload)) {
        console.error(`Missing required field: ${field}`);
        return false;
      }
    }

    // Validasi tipe event
    const validEventTypes = [
      'follow.created',
      'reaction.created',
      'like.created'
    ];
    
    if (!validEventTypes.includes(payload.type)) {
      console.warn(`Unknown event type: ${payload.type}`);
      return false;
    }

    // Validasi data object
    if (!payload.data || typeof payload.data !== 'object') {
      console.error('Invalid data field: not an object');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating webhook payload:', error.message);
    return false;
  }
}

/**
 * Log informasi webhook untuk debugging
 * 
 * @param {Object} payload - Parsed JSON payload
 * @param {string} signature - Signature dari header
 */
export function logWebhookInfo(payload, signature) {
  console.log('=== Webhook Received ===');
  console.log('Event Type:', payload.type);
  console.log('Timestamp:', new Date().toISOString());
  console.log('Signature:', signature ? 'Present' : 'Missing');
  
  if (payload.data) {
    console.log('Data Keys:', Object.keys(payload.data));
  }
  
  console.log('========================');
}
