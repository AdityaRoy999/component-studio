import type { ComponentPreset, PropSchemaItem } from './presets';
const text=(name:string,value:string):PropSchemaItem=>({name,type:'string',defaultValue:value});
const num=(name:string,value:number,min:number,max:number,step=1):PropSchemaItem=>({name,type:'number',defaultValue:value,min,max,step});
const bool=(name:string,value:boolean):PropSchemaItem=>({name,type:'boolean',defaultValue:value});
const choice=(name:string,value:string,options:string[]):PropSchemaItem=>({name,type:'select',defaultValue:value,options});
function preset(name:string,title:string,section:string,description:string,propsSchema:PropSchemaItem[],demoDependencies:string[]=[]):ComponentPreset{
 const id=title.toLowerCase().replaceAll(' ','-');
 return {id,name,title,category:section==='text-animations'?'TYPOGRAPHY':section==='backgrounds'?'BACKGROUNDS':section==='animations'?'INTERACTION':'COMPONENTS',description,tags:['React Bits',title,section],sourceUrl:`https://reactbits.dev/${section}/${id}`,demoDependencies,propsSchema,code:''};
}
export const EXPANDED_PRESETS:ComponentPreset[]=[
 preset('ShinyText','Shiny Text','text-animations','A soft highlight travels across a line of text.',[text('text','Made to stand out.'),num('speed',3,.5,8,.5),num('shineWidth',30,10,80),bool('pauseOnHover',true)]),
 preset('GradientText','Gradient Text','text-animations','An animated color blend inside crisp typography.',[num('animationSpeed',6,1,15),bool('showBorder',false),bool('pauseOnHover',true)]),
 preset('CountUp','Count Up','text-animations','Numbers count toward a target with a controlled easing.',[num('to',2400,10,10000,10),num('duration',2,.5,5,.5),text('prefix',''),text('suffix','+'),bool('replayOnHover',true)]),
 preset('TextPressure','Text Pressure','text-animations','Variable letters respond to the distance of your pointer.',[text('text','PRESSURE'),bool('weight',true),bool('width',true),bool('italic',true),num('radius',.5,.1,1,.05)]),
 preset('TrueFocus','True Focus','text-animations','A moving frame brings one word at a time into focus.',[text('sentence','Make every word count'),num('blurAmount',4,0,12),choice('focusStyle','brackets',['brackets','box','underline','highlight']),bool('manualMode',false)]),
 preset('RotatingText','Rotating Text','text-animations','Swap between short messages with a smooth text transition.',[num('rotationInterval',2200,1000,5000,100),choice('effect','slide',['slide','blur','flip','scale','drop']),bool('pauseOnHover',true)]),
 preset('FuzzyText','Fuzzy Text','text-animations','A canvas text treatment with an interactive distortion.',[num('baseIntensity',.12,0,.5,.02),num('hoverIntensity',.35,.1,1,.05),bool('enableHover',true),bool('clickEffect',true)]),
 preset('CircularText','Circular Text','text-animations','A rotating ring of letters that reacts on hover.',[text('text','CREATE • EXPLORE • REPEAT • '),num('spinDuration',20,5,40),choice('onHover','speedUp',['speedUp','slowDown','pause','goBonkers'])]),
 preset('CurvedLoop','Curved Loop','text-animations','A draggable text marquee follows a smooth curved path.',[text('marqueeText','Ideas in motion'),num('speed',2,.5,6,.5),num('curveAmount',100,-200,200,10),bool('interactive',true)]),
 preset('GlitchText','Glitch Text','text-animations','A brief digital offset gives type a playful edge.',[num('speed',1,.2,3,.1),bool('enableOnHover',true),bool('enableShadows',true),num('intensity',.5,.1,1,.1)]),
 preset('Magnet','Magnet','animations','A button gently follows nearby pointer movement.',[num('padding',60,10,160,10),num('magnetStrength',3,1,10),bool('disabled',false)]),
 preset('FadeContent','Fade Content','animations','A restrained entrance for content with an optional blur.',[num('duration',.8,.2,2,.1),bool('blur',true),num('delay',0,0,1,.1)],['gsap']),
 preset('GlareHover','Glare Hover','animations','A soft reflective sweep moves over a compact card.',[num('glareOpacity',.25,.05,.7,.05),num('glareAngle',-30,-90,90,5),num('transitionDuration',650,150,1500,50)]),
 preset('Noise','Noise','animations','A lightweight canvas grain layer adds subtle texture.',[num('opacity',.2,.05,.5,.05),num('fps',15,5,30,5),bool('colored',false),num('contrast',1,.5,3,.25)]),
 preset('LogoLoop','Logo Loop','animations','An endless row of marks with smooth pointer interaction.',[num('speed',90,20,200,10),num('gap',40,16,80,4),choice('direction','left',['left','right']),bool('pauseOnHover',true)]),
 preset('ElasticSlider','Elastic Slider','components','A responsive slider with a soft elastic drag.',[num('defaultValue',50,0,100),bool('isStepped',false),num('stepSize',10,1,25),bool('thumb',false),bool('disabled',false)]),
 preset('TiltedCard','Tilted Card','components','A card tilts in perspective with pointer movement.',[num('rotateAmplitude',12,2,25),num('scaleOnHover',1.05,1,1.15,.01),bool('flipOnClick',true),num('glare',.5,0,.85,.05)]),
 preset('Stepper','Stepper','components','A compact multi-step flow with working navigation.',[choice('indicator','numbers',['numbers','dots','bars']),choice('transition','slide',['slide','fade','none']),bool('linear',false)]),
 preset('GlassIcons','Glass Icons','components','Layered translucent icons lift gently as you interact.',[num('size',82,40,96,2),num('gap',66,16,90,2),choice('hover','press',['lift','float','press','none']),choice('labels','hover',['always','hover','none'])],['lucide-react']),
 preset('Folder','Folder','components','A tactile folder opens to reveal a small collection.',[text('label','Selected work'),choice('openOn','click',['click','hover']),choice('variant','matte',['solid','glass','matte']),bool('draggable',true)]),
 preset('Counter','Counter','components','Digits roll between values with a natural spring.',[num('duration',.6,.2,2,.1),bool('motionBlur',true),num('decimals',0,0,2)]),
 preset('LetterGlitch','Letter Glitch','backgrounds','An interactive field of characters shifts on a canvas.',[num('density',.8,.2,1,.05),num('speed',1,.2,3,.1),bool('interactive',true),num('fontSize',16,10,28)]),
 preset('Waves','Waves','backgrounds','Fine animated lines bend around pointer movement.',[num('amplitude',32,5,70,1),num('speed',1,.2,3,.1),num('spacing',10,10,40,2),bool('mouseInteraction',true)]),
 preset('MagnetLines','Magnet Lines','backgrounds','A field of small strokes turns to follow your cursor.',[num('spacing',28,16,50,2),num('reach',150,50,300,10),bool('idle',true),bool('clickPulse',true)])
];
