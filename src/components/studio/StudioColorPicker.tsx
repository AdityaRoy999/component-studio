'use client';
import { ColorPicker, parseHex, rgbaToHex } from '@/components/wensity/color-picker';

export default function StudioColorPicker({value,onChange,label,id}:{value:string;onChange:(value:string)=>void;label:string;id?:string}){
  const parsed=parseHex(value),hex=parsed?rgbaToHex(parsed):'#8ca8ff';
  return <ColorPicker value={hex} onChange={onChange} align="end" format="hex" eyedropper={false}
    swatches={['#f5f5f5','#a3a3a3','#525252','#1b1b1b','#8ca8ff','#7db9e8']}>
    <button id={id} type="button" className="studio-color-trigger" aria-label={`${label} color`}>
      <span className="studio-color-swatch" style={{backgroundColor:hex}} aria-hidden="true"/>
      <span>{hex.toUpperCase()}</span>
    </button>
  </ColorPicker>;
}
