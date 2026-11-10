import {access} from './auth.js';
import './dataverse-test.css';
const explanations={
 CONFIG_MISSING:'Een of meer testvariabelen ontbreken in deze deployment. Controleer de vier DATAVERSE_TEST_* variabelen in Vercel Production.',
 CONFIG_INVALID:'Controleer de tenant-ID, client-ID en de afgesproken Dataverse-URL in Vercel.',
 MICROSOFT_AUTH_REJECTED:'Microsoft weigert de aanmelding. Controleer de client-ID, tenant-ID en de waarde en geldigheid van het clientgeheim.',
 MICROSOFT_AUTH_INVALID:'Microsoft gaf geen bruikbaar toegangstoken terug.',
 MICROSOFT_UNAVAILABLE:'De Microsoft-aanmelding is tijdelijk niet bereikbaar. Probeer opnieuw.',
 DATAVERSE_FORBIDDEN:'Microsoft geeft een token af, maar Dataverse weigert toegang. Controleer de S2S-app en de toegewezen beveiligingsrol.',
 DATAVERSE_AUTH_REJECTED:'Dataverse accepteert het token niet. Controleer of de S2S-app in deze omgeving aan de juiste Entra-app is gekoppeld.',
 DATAVERSE_UNAVAILABLE:'Het token is ontvangen, maar Dataverse is niet bereikbaar of geeft een foutmelding.',
 DATAVERSE_RESPONSE_INVALID:'Dataverse gaf niet het verwachte antwoord op de identiteitscontrole.',
 TEST_TABLE_NOT_FOUND:'De testtabel crf9f_tabel1 is niet gevonden. Controleer de logische naam en de gekozen omgeving.',
 TEST_TABLE_METADATA_FORBIDDEN:'De app mag de technische tabelgegevens niet lezen. Controleer de Dataverse-beveiligingsrol.',
 TEST_TABLE_METADATA_INVALID:'De technische gegevens van de testtabel hebben niet de verwachte vorm.',
 TEST_TABLE_READ_FORBIDDEN:'De testtabel bestaat, maar de app heeft geen leesrecht. Er is een passende beveiligingsrol voor deze tabel nodig.',
 TEST_TABLE_UNAVAILABLE:'De testtabelcontrole kon niet worden uitgevoerd. Probeer opnieuw.',
 TEST_TABLE_RESPONSE_INVALID:'Het leesverzoek gaf niet het verwachte antwoord.',
 TEST_TABLE_READ_OK:'Het leesverzoek op crf9f_tabel1 is geslaagd. Aanmaken en wijzigen zijn nog niet getest.',
 CONNECTION_OK:'De serververbinding werkt en Dataverse herkent de ESMOJO-app. Toegang tot eigen tabellen is hiermee nog niet getest.',
};
const node=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el;};
export function createDataverseTestView(content,{request=access}={}){
 let disposed=false,busy=false;const card=node('section','');card.className='dataverse-test';
 const title=node('h1','Dataverse verbindingstest'),intro=node('p','Deze test controleert alleen de Microsoft-aanmelding en de identiteit van de app. Met Testtabel lezen controleer je de lege testtabel crf9f_tabel1. Er worden geen show- of incidentgegevens opgehaald en geen records aangemaakt of gewijzigd.'),button=node('button','Verbinding testen'),output=node('div','');button.type='button';button.className='primary-button';output.setAttribute('role','status');output.setAttribute('aria-live','polite');
 const readButton=node('button','Testtabel lezen');readButton.type='button';readButton.className='secondary-button';
 const run=async(operation)=>{if(busy||disposed)return;busy=true;button.disabled=true;readButton.disabled=true;button.textContent='Verbinding controleren…';output.replaceChildren(node('p','Microsoft en Dataverse controleren…'));
  try{const result=await request('dataverse-test',{method:'POST',body:{operation}});if(disposed)return;const list=node('ul','');for(const [key,label]of [['configuration','Testconfiguratie'],['token','Microsoft-toegangstoken'],['dataverse','Dataverse-appidentiteit'],...(operation==='table-read'?[['tableFound','Testtabel gevonden'],['tableRead','Testtabel lezen']]:[])])list.append(node('li',label+': '+(result[key]===true?'Geslaagd':'Niet bevestigd')));const message=node('p',explanations[result.code]||'De test kon niet worden bevestigd.');output.replaceChildren(list,message,node('code',result.code||'UNAVAILABLE'));if(Array.isArray(result.missing))output.append(node('p','Ontbrekend: '+result.missing.join(', ')));}
  catch{if(!disposed)output.replaceChildren(node('p','De test kon niet worden uitgevoerd. Controleer je verbinding en probeer opnieuw.'));}
  finally{busy=false;if(!disposed){button.disabled=false;readButton.disabled=false;button.textContent='Verbinding testen';}}
 };button.onclick=()=>run('status');readButton.onclick=()=>run('table-read');const actions=node('div','');actions.className='dataverse-test-actions';actions.append(button,readButton);card.append(title,intro,actions,output);content.replaceChildren(card);return()=>{disposed=true;};
}
