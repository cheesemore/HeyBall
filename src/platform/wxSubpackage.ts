/** 加载微信小游戏分包（game.json 中配置的 name） */
export function loadWxSubpackage(name: string): Promise<void> {
  if (typeof wx === 'undefined' || typeof wx.loadSubpackage !== 'function') {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    wx.loadSubpackage({
      name,
      success: () => resolve(),
      fail: (err) => reject(err ?? new Error(`loadSubpackage: ${name}`)),
    });
  });
}
