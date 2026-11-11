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
  const sections = new Map(), headings = [];let offset=0,fence=null;
  const sectionNames=['samenvatting','volledige analyse','bronnen'];
  for(const line of answer.split('\n')){
    const codeFence=line.match(/^ {0,3}(`{3,}|~{3,})/);
    if(codeFence){if(!fence)fence={char:codeFence[1][0],length:codeFence[1].length};else if(codeFence[1][0]===fence.char&&codeFence[1].length>=fence.length)fence=null;offset+=line.length+1;continue;}
    if(!fence){
      const markdown=line.match(/^ {0,3}(#{1,6})[\t ]+(.+?)[\t ]*#*[\t ]*$/);
      const label=(markdown?markdown[2]:line).trim().replace(/\*\*|__/g,'').replace(/:$/,'').trim().toLowerCase();
      const known=sectionNames.includes(label);
      if(markdown||known)headings.push({index:offset,end:offset+line.length,name:label,level:markdown?markdown[1].length:0,known});
    }
    offset+=line.length+1;
  }
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    if (!heading.known) continue;
    const next = headings.slice(i + 1).find(next => next.known || heading.level>0&&next.level>0&&next.level<=heading.level);
    sections.set(heading.name, answer.slice(heading.end, next?.index ?? answer.length).trim());
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
