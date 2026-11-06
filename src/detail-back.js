import './detail-back.css';
export function detailBackButton(button){
 button.type='button';button.setAttribute('aria-label','Terug naar overzicht');button.title='Terug naar overzicht';
 button.textContent='';button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h14"/></svg>';
 return button;
}
