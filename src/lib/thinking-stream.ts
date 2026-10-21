// Providers may split their inline reasoning delimiters across arbitrary SSE chunks.
// Once component JSON starts, never interpret tag-like text inside a code string.
export class ThinkingStream {
  private buffer='';
  private thinking=false;
  private contentStarted=false;
  push(text:string,final=false){
    this.buffer+=text;let content='',thinking='';
    while(this.buffer){
      if(this.contentStarted){content+=this.buffer;this.buffer='';break;}
      const marker=this.thinking?'</think>':'<think>';
      const index=this.buffer.toLowerCase().indexOf(marker);
      const jsonIndex=this.thinking?-1:this.buffer.indexOf('{');
      if(jsonIndex>=0&&(index<0||jsonIndex<index)){this.contentStarted=true;continue;}
      if(index>=0){
        if(this.thinking)thinking+=this.buffer.slice(0,index);else content+=this.buffer.slice(0,index);
        this.buffer=this.buffer.slice(index+marker.length);this.thinking=!this.thinking;continue;
      }
      let keep=0;
      if(!final)for(let length=1;length<marker.length;length++)if(this.buffer.toLowerCase().endsWith(marker.slice(0,length)))keep=length;
      const chunk=this.buffer.slice(0,this.buffer.length-keep);
      if(this.thinking)thinking+=chunk;else content+=chunk;
      this.buffer=keep?this.buffer.slice(-keep):'';break;
    }
    return {content,thinking};
  }
}
