export const isLocalhost = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'localhost' || 
           parsedUrl.hostname === '127.0.0.1' ||
           parsedUrl.hostname.startsWith('192.168.') ||
           parsedUrl.hostname.startsWith('10.') ||
           parsedUrl.hostname.endsWith('.local');
  } catch {
    return false;
  }
}; 