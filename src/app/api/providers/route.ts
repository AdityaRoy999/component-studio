import { NextRequest, NextResponse } from 'next/server';
import { isProvider, listProviderModels, publicProviders, ProviderError, verifyProvider } from '@/lib/ai';
export const runtime = 'nodejs';
export async function GET() {
  return NextResponse.json({providers:publicProviders()},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:NextRequest) {
  try {
    const body=await request.json();
    if(!isProvider(body.provider) || body.apiKey != null && typeof body.apiKey !== 'string' || body.model != null && typeof body.model !== 'string' || body.baseUrl != null && typeof body.baseUrl !== 'string') return NextResponse.json({error:'Invalid provider settings.'},{status:400});
    if(body.action === 'models') return NextResponse.json({models:await listProviderModels(body.provider,body.apiKey,fetch,body.baseUrl)},{headers:{'Cache-Control':'no-store'}});
    return NextResponse.json(await verifyProvider(body.provider,body.apiKey,body.model,fetch,body.baseUrl),{headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    if(error instanceof ProviderError) return NextResponse.json({error:error.message,code:error.code},{status:error.status});
    return NextResponse.json({error:'Could not check your provider.'},{status:400});
  }
}
