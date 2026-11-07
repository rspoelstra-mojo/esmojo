// Vastgestelde bedrijfs- en functiekeuzes; geen accountgegevens in deze catalogus.
export const accountCompanies=[
 {name:'MOJO Concerts',jobs:['Event Safety Manager','Productiemanager','CMT Leider']},
 {name:'TSC Crowd Management',jobs:['Projectleider','Management']},
 {name:'Ziggo Dome',jobs:['Management']},
 {name:'AFAS Live',jobs:['Management']},
 {name:'Insomniac',jobs:['Management']},
];
export function companyJobs(company){return accountCompanies.find(row=>row.name===company)?.jobs||[];}
export function validateAccountEmployment(profile){
 if(typeof profile.company!=='string'||!companyJobs(profile.company).includes(profile.jobTitle)
  ||!['gebruiker','beheerder','superbeheerder'].includes(profile.role)
  ||profile.company!=='MOJO Concerts'&&profile.role!=='gebruiker')throw Error('VALIDATION');
 return{company:profile.company,jobTitle:profile.jobTitle};
}
