// Gegenereerd uit shared/account-employment.js; exports verwijderd.
// Vastgestelde bedrijfs- en functiekeuzes; geen accountgegevens in deze catalogus.
const accountCompanies=[
 {name:'MOJO Concerts',jobs:['Event Safety Manager','Productiemanager','CMT Leider']},
 {name:'TSC Crowd Management',jobs:['Projectleider','Management']},
 {name:'Ziggo Dome',jobs:['Management']},
 {name:'AFAS Live',jobs:['Management']},
 {name:'Insomniac',jobs:['Management']},
];
function companyJobs(company){return accountCompanies.find(row=>row.name===company)?.jobs||[];}
function validateAccountEmployment(profile){
 if(typeof profile.company!=='string'||!companyJobs(profile.company).includes(profile.jobTitle)
  ||!['gebruiker','beheerder','superbeheerder'].includes(profile.role)
  ||profile.company!=='MOJO Concerts'&&profile.role!=='gebruiker')throw Error('VALIDATION');
 return{company:profile.company,jobTitle:profile.jobTitle};
}
