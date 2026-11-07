// De eenmalige bezorgproef is afgesloten. Geen ontvangers of providerlogica bewaren.
// Ook een oude workflow of gewijzigde klok kan deze proef niet opnieuw activeren.
export function createDeliverabilityService(){return{async run(){throw Error('CLOSED');}};}
