/** Runs before React so even a missing root-layout chunk can recover once. */
export const chunkRecoveryScript = `(()=>{
  const pattern=/ChunkLoadError|Loading (?:CSS )?chunk|Failed to fetch dynamically imported module/i;
  function recover(event){
    const failure=event.reason||event.error||event.message;
    if(!pattern.test(String(failure)))return;
    try{
      const key='studio:chunk-recovery';
      const previous=Number(sessionStorage.getItem(key)||0);
      const now=Date.now();
      if(previous && now-previous<60000)return;
      sessionStorage.setItem(key,String(now));
      location.reload();
    }catch{}
  }
  window.addEventListener('error',recover);
  window.addEventListener('unhandledrejection',recover);
})();`;
