import { DIALECTS, ALIASES, resolveDialect, getAllDialects } from './dialect-registry.js';
export { DIALECTS, ALIASES, resolveDialect, getAllDialects };
export function getDialect(code='kab'){
  if(!code || typeof code!=='string') throw new Error(code+' not found');
  const resolved=resolveDialect(code);
  const entry=DIALECTS[resolved];
  if(!entry) throw new Error(code+' not found');
  return {...entry, vocabulary: {}};
}
export function load(entry){
  if(!entry||!entry.id) throw new Error('invalid entry');
  return getDialect(entry.id);
}
export default { getDialect, load, DIALECTS };
