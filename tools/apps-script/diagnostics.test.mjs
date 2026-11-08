import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicationFailure} from './diagnostics.mjs';

test('Google-fouten worden vaste diagnosecodes, zonder tokens, e-mail, broncode of URL',()=>{
 const cases=[['Syntax error: SyntaxError: Unexpected token = line: 42 file: Artists','SOURCE_SYNTAX'],['invalid_grant','OAUTH_REAUTHORIZE'],['Apps Script API is disabled','API_DISABLED'],['PERMISSION_DENIED 403','PROJECT_PERMISSION'],['UNAUTHENTICATED 401','OAUTH_UNAUTHENTICATED'],['quota exceeded 429','GOOGLE_QUOTA'],['ECONNRESET','UPSTREAM_UNAVAILABLE'],['anything','TOOL_FAILURE']];
 for(const [message,code]of cases){
  const failure=publicationFailure('push',{stderr:message+' private-token person@example.invalid https://secret.invalid'},['Artists.gs']);
  assert.equal(failure.code,code);for(const secret of ['private-token','person@','https://secret'])assert.equal(failure.message.includes(secret),false);
  if(code==='SOURCE_SYNTAX')assert.match(failure.message,/Artists.gs:42/);
 }
 const unknown=publicationFailure('push',{message:'SyntaxError file: private-secret line: 17'},['Artists.gs']);assert.equal(unknown.message.includes('private-secret'),false);
});
