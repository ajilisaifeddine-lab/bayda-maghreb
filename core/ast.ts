export type Node={type:string;[k:string]:any}; export type Program={type:'Program';body:Node[]};
export type WhileNode = { type: "While"; test: Node; body: Node[] };
