// Google publication is permanently retired. No credentials, files or network are read.
export async function deploy(){throw Error('INTEGRATION_RETIRED');}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){console.error('INTEGRATION_RETIRED: publicatie verloopt uitsluitend via GitHub en Vercel.');process.exitCode=1;}
