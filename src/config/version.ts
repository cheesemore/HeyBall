import pkg from '../../package.json';

/** 与 package.json version 同步，供登录页等展示 */
export const APP_VERSION = pkg.version;

export function formatAppVersion(prefix = 'v'): string {
  return `${prefix}${APP_VERSION}`;
}
