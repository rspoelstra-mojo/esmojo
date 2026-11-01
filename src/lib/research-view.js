// Onderzoeksinhoud blijft tekst; nooit HTML uit JSON uitvoeren.
export function safeResearchUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function researchInline(text, depth = 0) {
  if (depth > 4) return [{ type: 'text', text }];
  const result = [], pattern = /\*\*([^*]+)\*\*|`([^`]+)`|<sup>([\d,\s–-]+)<\/sup>|\[([^\]\n]+)\]\((https:\/\/[^\s]+)\)|\*([^*\n]+)\*/g;
  let start = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > start) result.push({ type: 'text', text: text.slice(start, match.index) });
    const [raw, strong, code, sup, label, url, emphasis] = match;
    if (strong || emphasis) result.push({ type: strong ? 'strong' : 'em', children: researchInline(strong || emphasis, depth + 1) });
    else if (code || sup) result.push({ type: code ? 'code' : 'sup', text: code || sup });
    else { const href = safeResearchUrl(url); result.push(href ? { type: 'link', href, children: researchInline(label, depth + 1) } : { type: 'text', text: raw }); }
    start = match.index + raw.length;
  }
  if (start < text.length) result.push({ type: 'text', text: text.slice(start) });
  return result;
}
export function researchBlocks(markdown) {
  const blocks = []; let paragraph = [], list = null;
  const flush = () => { if (paragraph.length) blocks.push({ type: 'p', text: paragraph.join('\n') }); paragraph = []; list = null; };
  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const heading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*$/), bullet = line.match(/^\s*(?:[-*+]\s+|\d+[.)]\s+)(.+)$/);
    if (!line.trim()) { flush(); continue; }
    if (heading) { flush(); blocks.push({ type: 'heading', text: heading[1] }); }
    else if (bullet) {
      if (paragraph.length) flush();
      const ordered = /^\s*\d/.test(line);
      if (!list || list.ordered !== ordered) { list = { type: 'list', ordered, items: [] }; blocks.push(list); }
      list.items.push(bullet[1]);
    } else if (list && /^\s{2,}\S/.test(line)) list.items[list.items.length - 1] += '\n' + line.trim();
    else { list = null; paragraph.push(line); }
  }
  flush(); return blocks;
}
function plain(markdown) {
  const flatten = tokens => tokens.map(token => token.children ? flatten(token.children) : token.type === 'sup' ? '' : token.text).join('');
  return researchBlocks(markdown).map(block => block.type === 'list' ? block.items.map(item => flatten(researchInline(item))).join('\n') : flatten(researchInline(block.text))).join('\n\n').trim();
}
export function researchView(research) {
  const answer = typeof research?.answer === 'string' ? research.answer.replace(/\r\n?/g, '\n').trim() : '';
  const sections = new Map(), headings = [...answer.matchAll(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/gm)];
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i], name = heading[2].replace(/\*\*/g, '').trim().toLowerCase();
    if (!['samenvatting', 'volledige analyse', 'bronnen'].includes(name)) continue;
    const next = headings.slice(i + 1).find(next => next[1].length <= heading[1].length);
    sections.set(name, answer.slice(heading.index + heading[0].length, next?.index ?? answer.length).trim());
  }
  const firstParagraph = researchBlocks(answer).find(block => block.type === 'p');
  const summary = sections.get('samenvatting') ?? firstParagraph?.text ?? '';
  return { summary, summaryText: plain(summary), analysis: sections.get('volledige analyse') ?? answer, sourcesMarkdown: sections.get('bronnen') || '', sources: Array.isArray(research?.sources) ? research.sources.filter(source => typeof source?.title === 'string' && safeResearchUrl(source.url)) : [] };
}
export function renderResearch(target, markdown) {
  const doc = target.ownerDocument;
  const inline = (parent, text) => {
    const append = (parent, tokens) => {
      for (const token of tokens) {
        if (token.type === 'text') { parent.append(doc.createTextNode(token.text)); continue; }
        const el = doc.createElement(token.type === 'link' ? 'a' : token.type);
        if (token.type === 'link') { el.href = token.href; el.target = '_blank'; el.rel = 'noopener noreferrer'; }
        if (token.children) append(el, token.children); else el.textContent = token.text;
        parent.append(el);
      }
    };
    append(parent, researchInline(text));
  };
  target.replaceChildren();
  for (const block of researchBlocks(markdown)) {
    const el = doc.createElement(block.type === 'heading' ? 'h4' : block.type === 'list' ? block.ordered ? 'ol' : 'ul' : 'p');
    if (block.type === 'list') for (const item of block.items) { const li = doc.createElement('li'); inline(li, item); el.append(li); }
    else inline(el, block.text);
    target.append(el);
  }
}
