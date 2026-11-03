// Eén beveiligde laadronde voor de gekozen show. Alleen responsegeheugen;
// geen nieuwe opslag, reserveringen, bestandsdownloads of PDF-generatie.
function esmojoOpenShow_(request){
  assessmentKeys(request,['operation','concertId','actor']);assessmentConcert(request.concertId);
  if(typeof request.actor!=='string'||!request.actor||request.actor.length>100)throw Error('VALIDATION');
  const target=esmojoResearchTarget_(request.concertId),concertId=request.concertId,actor=request.actor;
  const profile=esmojoShowProfile_({operation:'profile-read',concertId},target);
  const tickets=esmojoTicketData_({operation:'ticket-read',concertId,actor},target);
  const barrier=esmojoBarrierLayout_({operation:'barrier-read',concertId,actor},target);
  // Seated synchroniseren vóór het overzicht, zodat productierevisies overeenkomen.
  const floor=esmojoFloorPressure_({operation:'floor-read',concertId,actor},target);
  const risks=esmojoShowProfileRisks_({operation:'risk-view',concertId},target);
  const overview={production:risks.production,assessments:risks.assessments};barrier.overview=overview;floor.overview=overview;
  let pdf=null;
  if(profile.finalization?.categories.visitors.completedAt&&profile.finalization?.categories.artist.completedAt){
    try{pdf=esmojoShowProfilePdf_({operation:'report-status',concertId},target);}
    catch(error){if(error.message!=='REPORT_NOT_READY')throw error;pdf={state:'not-ready'};}
  }
  return {profile,tickets,barrier,floor,risks,pdf};
}
