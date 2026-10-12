export function toPython(node:any):string{ if(node.type==="Program") return node.body.map(toPython).join("\n"); if(node.type==="Print") return `print("${node.value}")`; return ""; }
