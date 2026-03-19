export const redis = {
  async get(_k: string): Promise<string | null> { return null; },
  async set(_k: string, _v: string): Promise<void> {},
  async setex(_k: string, _t: number, _v: string): Promise<void> {},
  async del(_k: string): Promise<void> {},
};
