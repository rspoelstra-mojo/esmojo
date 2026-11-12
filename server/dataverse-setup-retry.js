// Alleen bekende tijdelijke metadata-uitkomsten; nooit configuratie/rechten/conflicten.
const retryable=new Set(['TABLE_READ','TABLE_CREATE_UNCONFIRMED','TABLE_PRIMARY_UNCONFIRMED','TABLE_PUBLISH_UNCONFIRMED','TABLE_PARENT_UNCONFIRMED','CHOICE_COMPONENT','SETUP_TEMPORARY','SETUP_THROTTLED']);
export function metadataProcessing(error){
 if(!retryable.has(error?.message))return null;
 const seconds=Number(error.retryAfterSeconds);
 return{status:'pending',verified:false,reason:'METADATA_PROCESSING',code:error.message,retryAfterSeconds:Number.isFinite(seconds)&&seconds>0?Math.ceil(seconds):3};
}
