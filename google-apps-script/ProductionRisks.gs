// Handmatige Ja/Nee-keuzes: Vertrouwelijk, uitsluitend in de canonieke Drive-showmap.
function esmojoReadProductionRisks_(target) {
  const file=esmojoShowFile_(target.folder,'productionele-risicos.json');
  if(!file)return {file:null,document:{managedBy:'ESMOJO/ProductionRisks-v1',classification:'vertrouwelijk',concertId:target.primary.concertId,revision:0,choices:{},history:[]}};
  const document=JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  if(document.managedBy!=='ESMOJO/ProductionRisks-v1'||document.classification!=='vertrouwelijk'||document.concertId!==target.primary.concertId
    ||!Number.isSafeInteger(document.revision)||document.revision<0||!document.choices||typeof document.choices!=='object'||Array.isArray(document.choices)||!Array.isArray(document.history)
    ||Object.keys(document.choices).some(key=>!productionRiskFields.includes(key)||typeof document.choices[key]!=='boolean'))throw Error('CONFLICT');
  return {file,document};
}
function esmojoProductionRiskState_(document){return {revision:document.revision,choices:document.choices};}
function esmojoSaveProductionRisk_(request,target) {
  const input=validateProductionRiskSelection({concertId:request.concertId,field:request.field,value:request.value,revision:request.revision});
  if(typeof request.actor!=='string'||!request.actor||request.actor.length>100)throw Error('VALIDATION');
  const {file,document}=esmojoReadProductionRisks_(target);
  // Identieke herpoging na verloren antwoord is veilig; afwijkende revisie nooit overschrijven.
  if(input.revision!==document.revision){if(document.revision===input.revision+1&&document.choices[input.field]===input.value)return esmojoProductionRiskState_(document);throw Error('CONFLICT');}
  if(document.choices[input.field]===input.value)return esmojoProductionRiskState_(document);
  document.history.push({at:new Date().toISOString(),actor:request.actor,field:input.field,before:document.choices[input.field]??null,after:input.value});
  document.choices[input.field]=input.value;document.revision++;
  const body=JSON.stringify(document,null,2),saved=file?(file.setContent(body),file):target.folder.createFile(Utilities.newBlob(body,'application/json','productionele-risicos.json'));
  if(saved.getBlob().getDataAsString('UTF-8')!==body)throw Error('VERIFY');
  return esmojoProductionRiskState_(document);
}
function esmojoMoveProductionRisks_(from,to,oldId,newId){
  const source=esmojoShowFile_(from,'productionele-risicos.json'),destination=esmojoShowFile_(to,'productionele-risicos.json');
  if(source&&destination)throw Error('CONFLICT');const file=source||destination;if(!file)return;
  const current=JSON.parse(file.getBlob().getDataAsString('UTF-8')).concertId;if(![oldId,newId].includes(current))throw Error('CONFLICT');
  const {document}=esmojoReadProductionRisks_({folder:source?from:to,primary:{concertId:current}});document.concertId=newId;
  if(typeof esmojoMoveMeasureFiles_==='function')esmojoMoveMeasureFiles_(document,from,to);
  if(typeof esmojoMoveBarrierFiles_==='function')esmojoMoveBarrierFiles_(document,from,to);
  file.setContent(JSON.stringify(document,null,2));if(source)file.moveTo(to);
}
