// The iframe owns its theme and scrollbars; app styles cannot cross its sandbox boundary.
export function createPreviewDocument(bundle:{script:string;css:string},theme:'light'|'dark'){
  const script=bundle.script.replace(/<\/script/gi,'<\\/script');
  const css=bundle.css.replace(/<\/style/gi,'<\\/style');
  return `<!doctype html><html lang="en" class="${theme}" data-theme="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none';script-src 'unsafe-inline' 'unsafe-eval' https: blob:;style-src 'unsafe-inline' https:;img-src data: blob: https:;font-src data: https:;connect-src https:;media-src data: blob: https:;worker-src blob: https:;"><style>${css}
  :root{color-scheme:dark;--preview-bg:#151515;--preview-surface:#1b1b1b;--preview-ink:#f5f5f5;--preview-muted:#a3a3a3;--preview-border:#ffffff26;--preview-scrollbar:#555c69}
  html[data-theme="light"]{color-scheme:light;--preview-bg:#ffffff;--preview-surface:#f3f3f3;--preview-ink:#1b1b1b;--preview-muted:#595959;--preview-border:#18234026;--preview-scrollbar:#a4acbb}
  *{scrollbar-width:none!important;scrollbar-color:var(--preview-scrollbar) transparent}
  @supports selector(::-webkit-scrollbar){*{scrollbar-width:auto;scrollbar-color:auto}}
  ::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--preview-scrollbar);border-radius:999px}::-webkit-scrollbar-button{display:none;width:0;height:0}
  body{margin:0;min-height:100svh;background:var(--preview-bg);color:var(--preview-ink);font-family:system-ui,sans-serif;overscroll-behavior:contain}
  #root{min-height:100svh;display:flex;align-items:center;justify-content:center;padding:clamp(12px,2vw,16px);box-sizing:border-box}
  </style></head><body><div id="root"></div><script>
  var captureTimer,captureTicket=0,verificationId='',previewFailure='',readyTimer,renderTicket=0,renderedProps={};
  function reportVerification(status,error){if(verificationId)parent.postMessage({type:'studio:verification',id:verificationId,status:status,error:error,props:renderedProps},'*');}
  window.__PREVIEW_ERROR__=function(error){previewFailure=String(error||'Unknown preview error').slice(0,2400);clearTimeout(readyTimer);reportVerification('error',previewFailure);};
  window.__PREVIEW_READY__=function(){var ticket=renderTicket;clearTimeout(readyTimer);readyTimer=setTimeout(function(){if(ticket===renderTicket&&!previewFailure)reportVerification('ready');},200);};
  window.addEventListener('message',function(event){
    if(event.source!==parent||event.data?.type!=='studio:props')return;
    var data=event.data;verificationId=typeof data.verificationId==='string'?data.verificationId:'';renderTicket++;
    var theme=data.theme==='light'?'light':'dark';var root=document.documentElement;
    root.dataset.theme=theme;root.classList.toggle('dark',theme==='dark');root.classList.toggle('light',theme==='light');
    var values=data.propValues||{};
    renderedProps={...values,theme:theme};
    if(verificationId&&previewFailure){reportVerification('error',previewFailure);return;}
    // Reset initializer props on customization, preserving state on theme changes.
    var customizationKey=String(data.resetKey||0)+':'+JSON.stringify(Object.keys(values).sort().map(function(key){return [key,values[key]];}));
    window.__RENDER__?.(renderedProps,customizationKey);
    clearTimeout(captureTimer);var ticket=++captureTicket;
    if(data.snapshotId&&window.__CAPTURE__)captureTimer=setTimeout(async function(){try{var image=await window.__CAPTURE__();if(ticket===captureTicket&&image.length<350000)parent.postMessage({type:'studio:snapshot',snapshotId:data.snapshotId,dataUrl:image},'*');}catch{}},500);
  });
  window.addEventListener('keydown',function(event){if(event.key==='Escape')parent.postMessage({type:'studio:exit-fullscreen'},'*');});
  function showPreviewError(message){window.__PREVIEW_ERROR__(message);var p=document.createElement('p');p.setAttribute('role','alert');p.style.cssText='color:#e6828e;padding:24px;font:14px system-ui';p.textContent='Preview error: '+String(message||'Unknown preview error');document.body.replaceChildren(p);}
  window.addEventListener('error',function(event){if(event.message||event.error)showPreviewError(event.message||event.error?.message);});
  window.addEventListener('unhandledrejection',function(event){showPreviewError(event.reason?.message||event.reason);});
  ${script}</script></body></html>`;
}
