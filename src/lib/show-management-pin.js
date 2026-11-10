// Geen opslag, URL-parameters of logging van de pincode. Ook plakken/autofill werkt.
export function bindShowManagementPin(view,{open}){
 let busy=false;const {inputs,form,submit,message}=view;
 function distribute(value,index){const digits=value.replace(/\D/g,'').slice(0,6-index);for(let i=0;i<digits.length;i++)inputs[index+i].value=digits[i];inputs[Math.min(5,index+digits.length)]?.focus();}
 inputs.forEach((input,index)=>{
  input.addEventListener('input',()=>{const value=input.value.replace(/\D/g,'');if(value.length>1)distribute(value,index);else{input.value=value;if(value&&index<5)inputs[index+1].focus();}});
  input.addEventListener('paste',event=>{const text=event.clipboardData?.getData('text')||'';if(text){event.preventDefault();distribute(text,index);}});
  input.addEventListener('keydown',event=>{if(event.key==='Backspace'&&!input.value&&index>0){event.preventDefault();inputs[index-1].value='';inputs[index-1].focus();}if(event.key==='ArrowLeft'&&index>0){event.preventDefault();inputs[index-1].focus();}if(event.key==='ArrowRight'&&index<5){event.preventDefault();inputs[index+1].focus();}});
  input.addEventListener('focus',()=>input.select());
 });
 const onSubmit=async event=>{
  event.preventDefault();if(busy)return;const pin=inputs.map(input=>input.value).join('');
  if(!/^\d{6}$/.test(pin)){message.textContent='Vul alle zes cijfers in.';inputs.find(input=>!input.value)?.focus();return;}
  busy=true;submit.disabled=true;submit.textContent='Pincode controleren…';form.setAttribute('aria-busy','true');message.textContent='';for(const input of inputs)input.disabled=true;
  try{await open(pin);for(const input of inputs)input.value='';view.open();}
  catch(error){message.textContent=error.message||'Showbeheer is tijdelijk niet beschikbaar. Probeer opnieuw.';for(const input of inputs)input.value='';}
  finally{busy=false;submit.disabled=false;submit.textContent='Open showbeheer';form.removeAttribute('aria-busy');for(const input of inputs)input.disabled=false;if(!view.root.classList.contains('is-open'))inputs[0].focus();}
 };
 form.addEventListener('submit',onSubmit);inputs[0].focus();return()=>form.removeEventListener('submit',onSubmit);
}
