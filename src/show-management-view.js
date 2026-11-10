// Alleen de presentatie. Toegang en opslag worden door de controller afgehandeld.
const element=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;};
export function createShowManagementView({logo}){
 const root=element('main','show-management-page');
 const background=element('div','show-management-background');background.setAttribute('aria-hidden','true');
 const brand=element('div','show-management-brand');brand.setAttribute('role','img');brand.setAttribute('aria-label','ESMOJO');brand.innerHTML=logo;brand.querySelector('svg')?.setAttribute('aria-hidden','true');
 const gate=element('section','show-management-gate'),card=element('div','show-management-pin-card');
 const title=element('h1',null,'Showbeheer'),intro=element('p','show-management-intro','Vul de zescijferige pincode in om het showbeheer te openen.');
 const form=element('form','show-management-pin-form');form.setAttribute('aria-label','Showbeheer openen');form.method='post';
 const group=element('div','show-management-pin');group.setAttribute('role','group');group.setAttribute('aria-label','Zescijferige pincode');
 const inputs=Array.from({length:6},(_,i)=>{const input=element('input');input.type='text';input.inputMode='numeric';input.maxLength=i===0?6:1;input.pattern='[0-9]';input.required=true;input.autocomplete=i===0?'one-time-code':'off';input.setAttribute('aria-label',`Cijfer ${i+1} van 6`);group.append(input);return input;});
 const message=element('p','show-management-message');message.setAttribute('role','alert');
 const submit=element('button','show-management-primary','Open showbeheer');submit.type='submit';
 form.append(group,message,submit);card.append(title,intro,form);gate.append(card);
 const workspace=element('section','show-management-workspace');workspace.hidden=true;workspace.setAttribute('aria-label','Showbeheer');
 const heading=element('h1','show-management-heading','Showbeheer');heading.tabIndex=-1;
 const grid=element('div','show-management-grid');
 for(const letter of ['A','B','C','D','E']){const block=element('section','show-management-block');block.dataset.block=letter;block.append(element('h2',null,`Blok ${letter}`));grid.append(block);}
 workspace.append(heading,grid);root.append(background,brand,gate,workspace);
 return{root,form,inputs,message,submit,open(){gate.hidden=true;workspace.hidden=false;root.classList.add('is-open');heading.focus();}};
}

export function createShowManagementCards(){
 const row=element('div','show-management-overview');
 const management=element('section','show-management-card');management.append(element('h2',null,'Showbeheer'));
 const body=element('div','show-management-card-body');
 const create=element('button','primary-button','Showbeheer aanmaken');create.type='button';body.append(create);management.append(body);
 const venue=element('section','show-management-card show-management-venue');venue.hidden=true;venue.append(element('h2',null,'Gashouder'));
 const quadrants=element('div','show-management-quadrants');
 for(const label of ['Personele bezetting','Omgevingsbeeld','Veiligheidsbeleid','Rapportages']){const quadrant=element('div','show-management-quadrant');quadrant.append(element('h3',null,label),element('p',null,'Nog niet ingevuld'));quadrants.append(quadrant);}
 venue.append(quadrants);row.append(management,venue);
 return{row,management,body,create,venue};
}
