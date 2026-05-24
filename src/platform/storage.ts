import { isWxGame } from './env';

export const gameStorage = {
  getItem(key: string): string | null {
    if (isWxGame()) {
      try {
        const v = wx.getStorageSync(key);
        return v === '' || v == null ? null : String(v);
      } catch {
        return null;
      }
    }
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): void {
    if (isWxGame()) {
      wx.setStorageSync(key, value);
      return;
    }
    sessionStorage.setItem(key, value);
  },

  removeItem(key: string): void {
    if (isWxGame()) {
      try {
        wx.removeStorageSync(key);
      } catch {
        /* ignore */
      }
      return;
    }
    sessionStorage.removeItem(key);
  },
};
