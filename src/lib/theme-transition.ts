interface ThemeViewTransition {
  ready:Promise<unknown>;
  finished:Promise<unknown>;
  updateCallbackDone:Promise<unknown>;
  skipTransition:()=>void;
}
type ThemeDocument=Pick<Document,'documentElement'> & {
  startViewTransition?:(update:()=>void)=>ThemeViewTransition;
};

/** One snapshot transition at a time; the live page never keeps a blur filter. */
export function createThemeTransition(doc:ThemeDocument){
  let active:ThemeViewTransition|undefined;
  let fallback:Animation|undefined;
  let sequence=0;
  const root=doc.documentElement;
  function clear(){
    active?.skipTransition();active=undefined;
    fallback?.cancel();fallback=undefined;
    root.classList.remove('theme-switching');
  }
  return {
    run(update:()=>void,reducedMotion=false){
      const token=++sequence;clear();
      let committed=false;
      const commit=()=>{if(!committed){committed=true;update();}};
      if(reducedMotion){commit();return;}
      if(typeof doc.startViewTransition==='function'){
        root.classList.add('theme-switching');
        try{
          const transition=doc.startViewTransition(commit);active=transition;
          // Skipping a snapshot is normal when another theme click arrives.
          void transition.ready.catch(()=>{});
          void transition.updateCallbackDone.catch(()=>{});
          void transition.finished.catch(()=>{}).finally(()=>{
            if(token===sequence){active=undefined;root.classList.remove('theme-switching');}
          });
          return;
        }catch{root.classList.remove('theme-switching');}
      }
      commit();
      if(typeof root.animate==='function'){
        fallback=root.animate([{filter:'blur(5px)',opacity:.88},{filter:'blur(0px)',opacity:1}],{duration:300,easing:'cubic-bezier(.22,1,.36,1)'});
        void fallback.finished.catch(()=>{}).finally(()=>{if(token===sequence)fallback=undefined;});
      }
    },
    dispose(){sequence++;clear();}
  };
}
