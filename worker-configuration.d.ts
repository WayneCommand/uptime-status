/* eslint-disable */
declare namespace Cloudflare {
  interface Env {
    UPSTASH_REDIS_URL: string
    UPSTASH_REDIS_TOKEN: string
  }
}
interface Env extends Cloudflare.Env {}
