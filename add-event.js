#!/usr/bin/env node

/**
 * Script untuk menambahkan event handler baru
 * Usage: node add-event.js <event-type>
 * Example: node add-event.js like.created
 */

import fs from 'fs';
import path from 'path';

const eventType = process.argv[2];

if (!eventType) {
  console.error('❌ Usage: node add-event.js <event-type>');
  console.error('Example: node add-event.js like.created');
  process.exit(1);
}

// Validasi format event type
if (!eventType.includes('.')) {
  console.error('❌ Event type harus dalam format: action.type');
  console.error('Example: like.created, follow.created, reaction.created');
  process.exit(1);
}

const [action, type] = eventType.split('.');

// Mapping emoji untuk berbagai action
const emojiMap = {
  follow: '➕',
  like: '❤️',
  reaction: '🔁',
  cast: '📝',
  mention: '💬',
  reply: '↩️',
  default: '🔔'
};

const emoji = emojiMap[action] || emojiMap.default;

console.log(`🚀 Menambahkan handler untuk event: ${eventType}`);

// Baca file index.js
const indexPath = path.join(process.cwd(), 'src', 'index.js');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Generate handler function
const handlerFunction = `
/**
 * Handler untuk event ${eventType}
 * Mengirim notifikasi ketika ada user yang melakukan ${action}
 * 
 * @param {Object} data - Data dari webhook payload
 * @returns {Promise<string>} - Pesan yang akan dikirim ke Discord
 */
async function handle${action.charAt(0).toUpperCase() + action.slice(1)}Event(data) {
  try {
    const actor = data.${action}er || data.user || data.actor;
    const target = data.target || data.cast || data.content;
    
    if (!actor) {
      throw new Error('Missing actor data');
    }

    const actorName = actor.username || \`FID:\${actor.fid}\`;
    
    let message = \`${emoji} **New ${action.charAt(0).toUpperCase() + action.slice(1)}!**\\n\${actorName} ${action}ed\`;
    
    if (target) {
      if (target.text) {
        const targetText = target.text.substring(0, 100) + (target.text.length > 100 ? '...' : '');
        message += \`:\\n"\${targetText}"\`;
      } else if (target.username) {
        message += \` \${target.username}\`;
      }
    }
    
    return message;
  } catch (error) {
    console.error('Error handling ${eventType} event:', error.message);
    throw error;
  }
}`;

// Tambahkan handler function sebelum switch statement
const switchIndex = indexContent.indexOf('switch (payload.type) {');
if (switchIndex === -1) {
  console.error('❌ Tidak dapat menemukan switch statement di index.js');
  process.exit(1);
}

// Insert handler function
indexContent = indexContent.slice(0, switchIndex) + handlerFunction + '\n\n    ' + indexContent.slice(switchIndex);

// Tambahkan case baru di switch statement
const casePattern = new RegExp(`(case '${eventType}':\\s*break;\\s*)`, 'g');
if (casePattern.test(indexContent)) {
  console.log('⚠️  Handler untuk event ini sudah ada');
  process.exit(0);
}

// Cari posisi untuk menambahkan case baru
const lastCaseIndex = indexContent.lastIndexOf('case \'');
const nextCaseIndex = indexContent.indexOf('case \'', lastCaseIndex + 1);
const insertIndex = nextCaseIndex === -1 ? indexContent.lastIndexOf('default:') : nextCaseIndex;

if (insertIndex === -1) {
  console.error('❌ Tidak dapat menemukan posisi untuk menambahkan case baru');
  process.exit(1);
}

// Generate case statement
const caseStatement = `      case '${eventType}':
        // Filter user jika diperlukan
        if (shouldFilterUser(payload.data.${action}er || payload.data.user || payload.data.actor)) {
          console.log('Filtered out ${eventType} event for user:', (payload.data.${action}er || payload.data.user || payload.data.actor).username || (payload.data.${action}er || payload.data.user || payload.data.actor).fid);
          shouldProcess = false;
          break;
        }
        message = await handle${action.charAt(0).toUpperCase() + action.slice(1)}Event(payload.data);
        break;
        
`;

// Insert case statement
indexContent = indexContent.slice(0, insertIndex) + caseStatement + indexContent.slice(insertIndex);

// Update validEventTypes array
const validEventTypesIndex = indexContent.indexOf('const validEventTypes = [');
if (validEventTypesIndex !== -1) {
  const arrayEndIndex = indexContent.indexOf('];', validEventTypesIndex);
  if (arrayEndIndex !== -1) {
    const beforeArray = indexContent.slice(0, arrayEndIndex);
    const afterArray = indexContent.slice(arrayEndIndex);
    indexContent = beforeArray + `,\n      '${eventType}'` + afterArray;
  }
}

// Tulis kembali file
fs.writeFileSync(indexPath, indexContent);

console.log('✅ Handler berhasil ditambahkan!');
console.log('');
console.log('📝 Yang telah ditambahkan:');
console.log(`- Handler function: handle${action.charAt(0).toUpperCase() + action.slice(1)}Event()`);
console.log(`- Case statement untuk: ${eventType}`);
console.log(`- Event type ditambahkan ke validEventTypes`);
console.log('');
console.log('🔄 Restart server untuk menerapkan perubahan:');
console.log('npm run dev');
console.log('');
console.log('🧪 Test dengan webhook:');
console.log(`curl -X POST http://localhost:3000/webhook \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "x-neynar-signature: sha256=your_signature" \\`);
console.log(`  -d '{"type":"${eventType}","data":{"${action}er":{"fid":123,"username":"test"}}}'`);
