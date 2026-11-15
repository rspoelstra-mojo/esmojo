export function retiredIntegration(req,res){res.setHeader('Cache-Control','no-store');return res.status(410).json({ok:false,code:'INTEGRATION_RETIRED'});}
