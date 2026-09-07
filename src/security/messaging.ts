interface HeightMessage { type: 'career-hub:resize'; height: number }

export function enableResponsiveFrame(parentOrigin?: string): () => void {
  if (window.parent === window || !parentOrigin) return () => undefined;
  const allowedOrigin = new URL(parentOrigin).origin;
  const publish = () => {
    const message: HeightMessage = { type: 'career-hub:resize', height: document.documentElement.scrollHeight };
    window.parent.postMessage(message, allowedOrigin);
  };
  const observer = new ResizeObserver(publish);
  observer.observe(document.documentElement);
  publish();
  return () => observer.disconnect();
}
