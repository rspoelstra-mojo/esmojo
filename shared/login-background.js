// The same crop geometry drives the real login and both scaled editor previews.
export const initialLoginBackground='/login-background-initial.jpg';
export const initialBackgroundSize={width:2048,height:1365};
export const defaultFraming={desktop:{x:.03,y:.4,zoom:1.5},mobile:{x:.5,y:1,zoom:1.2}};
export const defaultLoginBackground=()=>({revision:0,configured:false,setupRequired:false,imageUrl:initialLoginBackground,...initialBackgroundSize,framing:structuredClone(defaultFraming)});
export function validateFraming(value){
 if(!value||Object.keys(value).sort().join(',')!=='desktop,mobile')throw Error('VALIDATION');
 for(const name of ['desktop','mobile']){const crop=value[name];if(!crop||Object.keys(crop).sort().join(',')!=='x,y,zoom'||!['x','y','zoom'].every(key=>typeof crop[key]==='number'&&Number.isFinite(crop[key]))||crop.x<0||crop.x>1||crop.y<0||crop.y>1||crop.zoom<1||crop.zoom>3)throw Error('VALIDATION');}
 return structuredClone(value);
}
export function backgroundGeometry(image,viewport,crop){
 const scale=Math.max(viewport.width/image.width,viewport.height/image.height)*crop.zoom;
 const width=image.width*scale,height=image.height*scale;
 return {width,height,left:(viewport.width-width)*crop.x,top:(viewport.height-height)*crop.y};
}
export function dragBackground(crop,geometry,viewport,dx,dy){
 const clamp=value=>Math.max(0,Math.min(1,value));
 return {...crop,x:geometry.width-viewport.width>.01?clamp(crop.x-dx/(geometry.width-viewport.width)):crop.x,y:geometry.height-viewport.height>.01?clamp(crop.y-dy/(geometry.height-viewport.height)):crop.y};
}
