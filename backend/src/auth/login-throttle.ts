import { Injectable } from "@nestjs/common";
import { fail } from "../common/errors";
@Injectable()
export class LoginThrottle {
  private readonly attempts = new Map<
    string,
    { count: number; reset: number }
  >();
  reserve(key: string): void {
    const now = Date.now();
    if (this.attempts.size > 10_000) {
      for (const [candidate, value] of this.attempts) {
        if (value.reset <= now || this.attempts.size > 10_000)
          this.attempts.delete(candidate);
      }
    }
    const previous = this.attempts.get(key);
    const count = previous && previous.reset > now ? previous.count : 0;
    if (count >= 5) fail(429, "Too many login attempts");
    this.attempts.set(key, { count: count + 1, reset: now + 15 * 60_000 });
  }
  clear(key: string): void {
    this.attempts.delete(key);
  }
}
