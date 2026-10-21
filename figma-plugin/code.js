/* Figma sandbox entrypoint. Read-only document access; network lives in ui.html. */
(() => {
  figma.showUI(__html__, { width: 360, height: 440, themeColors: true });
  let busy = false, channel;
  function send(message) { figma.ui.postMessage({ ...message, channel }); }
  function metadata() {
    if (!channel) return;
    try {
      send({ type: 'metadata', metadata: {
        documentName: (figma.root.name || 'Untitled design').slice(0, 500), pageId: figma.currentPage.id,
        selection: figma.currentPage.selection.slice(0, 100).map(node => ({ id: node.id, name: node.name.slice(0, 500), type: node.type })),
      } });
    } catch (error) {
      send({ type: 'metadata-error', error: String(error instanceof Error ? error.message : error).slice(0, 2000) });
    }
  }
  figma.on('selectionchange', metadata);
  figma.on('currentpagechange', metadata);
  figma.ui.onmessage = async message => {
    if (!message || typeof message !== 'object') return;
    if (!channel && message.type === 'ready' && typeof message.channel === 'string' && /^[a-f0-9]{32}$/.test(message.channel)) channel = message.channel;
    if (!channel || message.channel !== channel) return;
    if (message.type === 'ready') { metadata(); return; }
    if (message.type !== 'export') return;
    const job = message.job;
    if (!job || typeof job.id !== 'string') return;
    if (busy) { send({ type: 'export-result', id: job.id, error: 'Another export is running.' }); return; }
    busy = true;
    try {
      if (!/^I?\d+:\d+(?:;I?\d+:\d+)*$/.test(job.nodeId) || !Number.isFinite(job.scale) || job.scale < 0.01 || job.scale > 4) throw new Error('Invalid export node or scale.');
      const node = await figma.getNodeByIdAsync(job.nodeId);
      if (!node || node.removed || !['FRAME', 'GROUP', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'SECTION'].includes(node.type)) {
        throw new Error('Choose a renderable frame/group/component in the paired file; pages/documents are not exported.');
      }
      const before = await node.exportAsync({ format: 'JSON_REST_V1' });
      const snapshot = JSON.stringify(before);
      const bounds = node.absoluteBoundingBox;
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) throw new Error('Target node has no positive logical bounds.');
      const pngBytes = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: job.scale }, useAbsoluteBounds: true });
      if (pngBytes.byteLength > 32 * 1024 * 1024) throw new Error('PNG exceeds 32 MiB; request a smaller frame or lower export scale.');
      let page = node.parent;
      while (page && page.type !== 'PAGE') page = page.parent;
      if (!page) throw new Error('Target node has no page.');
      const result = { nodeId: node.id, nodeName: node.name.slice(0, 500), pageId: page.id,
        logicalSize: { width: bounds.width, height: bounds.height }, pngBytes, context: before,
        exportedAt: new Date().toISOString() };
      if (job.css) {
        try { result.css = await node.getCSSAsync(); }
        catch (error) { result.cssError = String(error instanceof Error ? error.message : error).slice(0, 2000); }
      }
      // No cached PNG: compare scoped properties around the render instead of loading all pages for change events.
      const after = await node.exportAsync({ format: 'JSON_REST_V1' });
      if (snapshot !== JSON.stringify(after)) throw new Error('The requested subtree changed during export. Retry after edits settle.');
      send({ type: 'export-result', id: job.id, result });
    } catch (error) {
      send({ type: 'export-result', id: job.id, error: String(error instanceof Error ? error.message : error).slice(0, 2000) });
    } finally { busy = false; }
  };
})();
