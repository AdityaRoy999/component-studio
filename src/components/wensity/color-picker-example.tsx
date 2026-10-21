'use client';
import { useState } from 'react';
import { ColorPicker } from '@/components/wensity/color-picker';

export default function ColorPickerExample(){
  const [color,setColor]=useState('#8ca8ff');
  return <section className="studio-color-example" aria-label="Color picker example">
    <div style={{width:80,height:80,borderRadius:24,backgroundColor:color}} aria-hidden="true"/>
    <ColorPicker value={color} onChange={setColor} format="hex" eyedropper={false}
      swatches={['#f5f5f5','#a3a3a3','#1b1b1b','#8ca8ff','#7db9e8']}/>
    <output aria-live="polite">Selected color: {color}</output>
  </section>;
}
