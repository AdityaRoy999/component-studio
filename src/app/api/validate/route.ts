import { NextResponse } from 'next/server';
import { parseComponent } from '@/lib/ai';
import { customizationBindings } from '@/lib/semantic-check';
export const runtime='nodejs';
export async function POST(request:Request){
  try{
    const value=await request.json();const component=await parseComponent(JSON.stringify(value));
    const unused=customizationBindings(component.code,component.propsSchema.map(item=>item.name));
    if(unused.length)return NextResponse.json({error:`Unused customization props: ${unused.join(', ')}. Bind or remove these controls before applying.`},{status:422});
    return NextResponse.json({component});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message.slice(0,3000):'Source validation failed.'},{status:422});}
}
