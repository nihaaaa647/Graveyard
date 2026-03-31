import { Redis } from '@upstash/redis'
import { SEEDED_FAILURES } from '../lib/failures'

// Load environment variables locally if not already in environment
// require('dotenv').config({ path: '.env.local' })
// We'll rely on NEXT_PUBLIC_... wait, Upstash tokens shouldn't have NEXT_PUBLIC_.
// Using ts-node, we should probably load dotenv or just assume they are passed.
// Actually, next.js doesn't auto-load .env.local for arbitrary ts-node scripts unless we use dotenv.
// Let's add dotenv just in case and configure it to load .env.local.
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

if (!url || !token) {
  console.error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in environment")
  process.exit(1)
}

const redis = new Redis({
  url: url,
  token: token,
})

async function seed() {
  console.log("Starting seeding process...")
  let count = 0

  for (const failure of SEEDED_FAILURES) {
    try {
      // Write the hash
      await redis.hset(`failure:${failure.id}`, failure)
      // Add standard fields. wait, hset takes an object.
      // Add id to to the set
      await redis.sadd("failure:ids", failure.id)
      console.log(`Seeded: ${failure.id}`)
      count++
    } catch (err) {
      console.error(`Failed to seed ${failure.id}:`, err)
    }
  }

  console.log(`Successfully seeded ${count} failures into Redis.`)
}

seed().catch(console.error)
