import { NextRequest, NextResponse } from 'next/server';
import { exportComponent } from '@/lib/component-source';
import { exportProject, zipFiles } from '@/lib/project-export';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const component = body.component;
    if (!component || typeof component.name !== 'string' || typeof component.code !== 'string' || component.code.length > 1000000 || (component.cssCode && (typeof component.cssCode !== 'string' || component.cssCode.length > 1000000))) {
      return NextResponse.json({ error: 'A valid component is required.' }, { status: 400 });
    }
    if(body.format==='zip'){
      const values=body.propValues&&typeof body.propValues==='object'&&!Array.isArray(body.propValues)?body.propValues:{};
      const project=await exportProject(component,values,body.theme==='light'?'light':'dark');
      return new Response(new Uint8Array(zipFiles(project.files)),{headers:{'Content-Type':'application/zip','Content-Disposition':`attachment; filename="${project.name}-project.zip"`,'Cache-Control':'no-store'}});
    }
    const result = await exportComponent(component, body.language === 'JS' ? 'JS' : 'TS', body.styling === 'CSS' ? 'CSS' : 'Tailwind');
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'The source could not be exported. Check the component syntax and try again.' }, { status: 422 });
  }
}
