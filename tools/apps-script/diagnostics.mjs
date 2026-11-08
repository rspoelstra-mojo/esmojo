// Never forward clasp stdout/stderr, OAuth URLs, identities, tokens or source.
// Only fixed diagnostic categories and allowlisted repository filenames escape.
export function publicationFailure(command,error,filenames=[]){
 const raw=[error?.message,error?.stdout,error?.stderr].map(value=>String(value||'')).join('\n');
 let code='TOOL_FAILURE',hint='Controleer API-toegang, Google-autorisatie en projectrechten.';
 if(/SyntaxError|syntax error|unexpected token/i.test(raw)){code='SOURCE_SYNTAX';hint='Google weigert de scriptbron; voer de compatibiliteitscontrole uit.';}
 else if(/invalid_grant|invalid_client|unauthorized_client|invalid refresh token|expired or revoked/i.test(raw)){code='OAUTH_REAUTHORIZE';hint='De Google-eigenaar moet de clasp-autorisatie vernieuwen in CLASPRC_JSON.';}
 else if(/SERVICE_DISABLED|accessNotConfigured|Apps Script API.*(?:disabled|not enabled)|script api.*not enabled/i.test(raw)){code='API_DISABLED';hint='Controleer de Apps Script API-schakelaar bij de Google-eigenaar.';}
 else if(/PERMISSION_DENIED|permission denied|insufficient.*permission|does not have permission|\b403\b/i.test(raw)){code='PROJECT_PERMISSION';hint='Controleer de publicerende Google-identiteit en toegang tot het bestaande project.';}
 else if(/UNAUTHENTICATED|\b401\b/i.test(raw)){code='OAUTH_UNAUTHENTICATED';hint='Controleer of de Google-autorisatie nog geldig is.';}
 else if(/RESOURCE_EXHAUSTED|quota exceeded|\b429\b/i.test(raw)){code='GOOGLE_QUOTA';hint='Google begrenst verzoeken; wacht en herstart de workflow op actuele main.';}
 else if(error?.code==='ETIMEDOUT'||error?.signal==='SIGTERM'||/ECONNRESET|ETIMEDOUT|\b50[234]\b/.test(raw)){code='UPSTREAM_UNAVAILABLE';hint='Google of de netwerkverbinding is tijdelijk niet bereikbaar.';}
 let location='';
 if(code==='SOURCE_SYNTAX'){
  const file=/\bfile:\s*([A-Za-z0-9_-]+)(?:\.gs)?\b/i.exec(raw)?.[1];
  const safe=filenames.find(name=>name===file||name===file+'.gs');
  const line=/\bline:\s*(\d{1,6})\b/i.exec(raw)?.[1];
  if(safe)location=` ${safe}${line?':'+Number(line):''}.`;
 }
 const safeCommand=['list-deployments','pull','push','create-version','update-deployment'].includes(command)?command:'command';
 const result=Error(`APPS_SCRIPT_${code}: clasp ${safeCommand} mislukt.${location} ${hint}`);result.code=code;return result;
}
