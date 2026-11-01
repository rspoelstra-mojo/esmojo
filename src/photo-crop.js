// Het origineel blijft uitsluitend in werkgeheugen. Alleen de bevestigde uitsnede
// wordt teruggegeven; niets uploaden, bewaren of loggen vanuit deze module.
export async function cropPhoto(file, { signal } = {}) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5000000) throw new Error('Kies een PNG-, JPG- of WebP-foto van maximaal 5 MB.');
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('Deze foto kan niet worden geopend. Kies een andere foto.'); }
  if (signal?.aborted) { bitmap.close(); return null; }
  const size = 256;
  const baseScale = Math.max(size / bitmap.width, size / bitmap.height);
  return new Promise(resolve => {
    const dialog = document.createElement('dialog'); dialog.className = 'photo-dialog';
    const heading = document.createElement('h2'); heading.id = 'photo-crop-title'; heading.textContent = 'Kies je ronde uitsnede';
    dialog.setAttribute('aria-labelledby', heading.id);
    const hint = document.createElement('p'); hint.id = 'photo-crop-hint'; hint.textContent = 'Sleep de foto en zoom in tot het gewenste deel in het rondje staat. Je kunt ook de schuifregelaars gebruiken.';
    const stage = document.createElement('div'); stage.className = 'crop-stage';
    const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
    canvas.setAttribute('aria-label', 'Voorbeeld van de profielfoto'); canvas.setAttribute('aria-describedby', hint.id);
    stage.append(canvas);
    const controls = [];
    function slider(title, min, max, step, value) {
      const label = document.createElement('label'); label.textContent = title;
      const input = document.createElement('input'); input.type = 'range'; input.min = min; input.max = max; input.step = step; input.value = value;
      input.addEventListener('input', draw); label.append(input); controls.push(label); return input;
    }
    const zoom = slider('Inzoomen', '1', '4', '0.01', '1');
    const horizontal = slider('Horizontale positie', '-100', '100', '1', '0');
    const vertical = slider('Verticale positie', '-100', '100', '1', '0');
    function geometry() {
      const side = size / (baseScale * Number(zoom.value));
      const maxX = (bitmap.width - side) / 2, maxY = (bitmap.height - side) / 2;
      return { side, maxX, maxY, x: maxX + maxX * Number(horizontal.value) / 100, y: maxY + maxY * Number(vertical.value) / 100 };
    }
    function draw() {
      const { x, y, side, maxX, maxY } = geometry();
      horizontal.disabled = maxX < .01; vertical.disabled = maxY < .01;
      const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, size, size);
      context.drawImage(bitmap, x, y, side, side, 0, 0, size, size);
    }
    let pointer;
    canvas.addEventListener('pointerdown', event => {
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (pointer?.id !== event.pointerId) return;
      const { side, maxX, maxY } = geometry(); const rect = canvas.getBoundingClientRect();
      if (maxX > .01) horizontal.value = Math.max(-100, Math.min(100, Number(horizontal.value) - (event.clientX - pointer.x) / rect.width * side / maxX * 100));
      if (maxY > .01) vertical.value = Math.max(-100, Math.min(100, Number(vertical.value) - (event.clientY - pointer.y) / rect.height * side / maxY * 100));
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; draw();
    });
    canvas.addEventListener('pointerup', () => { pointer = null; });
    canvas.addEventListener('pointercancel', () => { pointer = null; });
    const buttons = document.createElement('div'); buttons.className = 'form-actions';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'secondary-button'; cancel.textContent = 'Annuleren';
    const confirm = document.createElement('button'); confirm.type = 'button'; confirm.className = 'primary-button'; confirm.textContent = 'Uitsnede gebruiken';
    let done = false;
    const abort = () => finish(null);
    function finish(result) { if (done) return; done = true; signal?.removeEventListener('abort', abort); dialog.close(); dialog.remove(); bitmap.close(); resolve(result); }
    cancel.addEventListener('click', () => finish(null));
    confirm.addEventListener('click', () => {
      const image = canvas.toDataURL('image/jpeg', .82);
      if (image.length > 100000) { finish(canvas.toDataURL('image/jpeg', .65)); return; }
      finish(image);
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); finish(null); });
    signal?.addEventListener('abort', abort, { once: true });
    buttons.append(cancel, confirm); dialog.append(heading, hint, stage, ...controls, buttons);
    document.body.append(dialog); draw(); dialog.showModal();
  });
}
