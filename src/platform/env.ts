/** 是否运行在微信小游戏环境 */
export function isWxGame(): boolean {
  return (
    typeof wx !== 'undefined' &&
    typeof wx.createCanvas === 'function' &&
    typeof wx.getSystemInfoSync === 'function'
  );
}
