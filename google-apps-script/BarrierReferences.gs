// Alleen HMAC-serververkeer; originele beelden uitsluitend in private Drive-map.
function esmojoBarrierReference_(request){
 const install=request.operation==='reference-install';
 riskKeys(request,install?['operation','type','base64','sha256']:['operation','type','actor']);
 if(!Object.prototype.hasOwnProperty.call(barrierReferenceManifest,request.type))throw Error('VALIDATION');
 if(!install){if(request.operation!=='reference-read')throw Error('VALIDATION');esmojoHomeActor_(request.actor);}
 const expected=barrierReferenceManifest[request.type];
 if(install&&(typeof request.base64!=='string'||request.base64.length!==Math.ceil(expected.size/3)*4||request.sha256!==expected.sha256))throw Error('VALIDATION');
 const root=DriveApp.getFolderById(ESMOJO_FOLDER_ID),folders=root.getFoldersByName('_esmojo_private_references_v1');
 let folder=folders.hasNext()?folders.next():null;if(folders.hasNext())throw Error('CONFLICT');
 if(!folder){if(!install)throw Error('NOT_FOUND');folder=root.createFolder('_esmojo_private_references_v1');}
 if(folder.isTrashed())throw Error('CONFLICT');
 const files=folder.getFilesByName(expected.fileName);let file=files.hasNext()?files.next():null;if(files.hasNext())throw Error('CONFLICT');
 if(install&&!file){const bytes=Utilities.base64Decode(request.base64);if(bytes.length!==expected.size||esmojoPdfHash_(bytes)!==expected.sha256||!attachmentSignatureValid(bytes,'image/png'))throw Error('VALIDATION');file=folder.createFile(Utilities.newBlob(bytes,'image/png',expected.fileName));file.setDescription('ESMOJO/BarrierReference-v1');}
 if(!file)throw Error('NOT_FOUND');
 const parents=file.getParents();if(file.isTrashed()||file.getMimeType()!=='image/png'||file.getDescription()!=='ESMOJO/BarrierReference-v1'||!parents.hasNext()||parents.next().getId()!==folder.getId()||parents.hasNext())throw Error('ATTACHMENT_INVALID');
 const bytes=file.getBlob().getBytes();if(bytes.length!==expected.size||esmojoPdfHash_(bytes)!==expected.sha256||!attachmentSignatureValid(bytes,'image/png'))throw Error('ATTACHMENT_INVALID');
 return install?{verified:true,type:request.type}:{type:request.type,mime:'image/png',sha256:expected.sha256,base64:Utilities.base64Encode(bytes)};
}
