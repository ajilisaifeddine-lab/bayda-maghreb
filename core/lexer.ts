export type TokenType = "IDENT"|"NUMBER"|"STRING"|"KEYWORD"|"SYMBOL"|"NEWLINE"|"EOF";
export interface Token{type:TokenType;value:string;line:number;col:number;}
const KEYWORDS=new Set(["ila","awla","wila","hata","dir","safi","ktab","jib","khrej"]);
const WORD=/[\p{L}\p{M}\p{N}_]/u;
export function lex(input:string,keywords:Set<string>=KEYWORDS):Token[]{
  const tokens:Token[]=[];let line=1,col=1,i=0;
  while(i<input.length){
    const c=input[i];
    if(c==="\n"){tokens.push({type:"NEWLINE",value:"\n",line,col});line++;col=1;i++;continue;}
    if(/\s/.test(c)){col++;i++;continue;}
    if(c==='"'||c==="'"){
      const q=c;let v="";i++;col++;
      while(i<input.length&&input[i]!==q){v+=input[i];i++;col++;}
      i++;col++;
      tokens.push({type:"STRING",value:v,line,col});continue;
    }
    if(WORD.test(c)){
      let v="";
      while(i<input.length&&WORD.test(input[i])){v+=input[i];i++;col++;}
      if(/^\d+$/.test(v)&&input[i]==="."&&/\d/.test(input[i+1]||"")){
        v+=".";i++;col++;
        while(i<input.length&&/\d/.test(input[i])){v+=input[i];i++;col++;}
      }
      const type:TokenType=/^[\d.]+$/.test(v)?"NUMBER":keywords.has(v)?"KEYWORD":"IDENT";
      tokens.push({type,value:v,line,col});continue;
    }
    tokens.push({type:"SYMBOL",value:c,line,col});i++;col++;
  }
  tokens.push({type:"EOF",value:"",line,col});
  return tokens;
}
