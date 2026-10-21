import { NextRequest, NextResponse } from 'next/server';
import { compilePreview } from '@/lib/compile-preview';

export const runtime = 'nodejs';
const cache = new Map<string, { script: string; css: string }>();
export async function POST(request: NextRequest) {
  try {
    const { code, cssCode = '', snapshot = false, files = {} } = await request.json();
    if (typeof code !== 'string' || !code.trim() || code.length > 1000000) return NextResponse.json({error:'A valid component source is required.'}, {status:400});
    if (typeof cssCode !== 'string' || cssCode.length > 1000000) return NextResponse.json({error:'Invalid component CSS.'},{status:400});
    const cacheKey = JSON.stringify([snapshot===true,code,cssCode,files]);
    const cached = cache.get(cacheKey);
    if (cached) return NextResponse.json(cached);
    const payload = await compilePreview(code,cssCode,snapshot===true,files);
    if(cache.size >= 12) cache.delete(cache.keys().next().value!);
    cache.set(cacheKey,payload);
    return NextResponse.json(payload);
  } catch (error: any) {
    const detail = error?.errors?.[0]?.text;
    return NextResponse.json({error:typeof detail === 'string' ? detail : 'This component could not compile. Check the source code for syntax or import errors.'},{status:422});
  }
}
