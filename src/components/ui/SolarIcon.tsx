import { forwardRef, type SVGProps } from 'react';
import icons from '@/data/solar-linear-icons.json';

export type SolarIconName = keyof typeof icons;
export type SolarIconProps = SVGProps<SVGSVGElement> & {
  size?:number|string;
  title?:string;
  /** Legacy call-site compatibility; Solar's original stroke geometry is retained. */
  absoluteStrokeWidth?:boolean;
};

export function createSolarIcon(name:SolarIconName){
  const icon=icons[name];
  const Component=forwardRef<SVGSVGElement,SolarIconProps>(function SolarIcon({size=24,color='currentColor',className='',title,children,strokeWidth:_strokeWidth,absoluteStrokeWidth:_absoluteStrokeWidth,...props},ref){
    const labelled=Boolean(title||props['aria-label']||props['aria-labelledby']);
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox={`0 0 ${icon.width} ${icon.height}`} fill="none" color={color} focusable="false" aria-hidden={labelled?undefined:true} role={labelled?'img':undefined} {...props} ref={ref} className={`solar-icon ${className}`.trim()} data-icon={`solar:${icon.name}`}>
      {title&&<title>{title}</title>}
      {/* Trusted, build-time SVG data from @iconify-json/solar; never user content. */}
      <g dangerouslySetInnerHTML={{__html:icon.body}}/>
      {children}
    </svg>;
  });
  Component.displayName=`Solar${name}`;
  return Component;
}
