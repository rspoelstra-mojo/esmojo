import './fluid-layout.css';
// Opt-in: alleen het inhoudsgebied krijgt een variant. De bestaande menu's blijven intact.
export function enableFluidLayout(content,{variant='show',workspace=document.querySelector('.workspace')}={}){
  content.classList.add('fluid-layout');content.dataset.fluidVariant=variant;workspace.dataset.layout='fluid';document.body.dataset.fluidLayout='';
  return()=>{content.classList.remove('fluid-layout');delete content.dataset.fluidVariant;delete workspace.dataset.layout;delete document.body.dataset.fluidLayout;};
}
