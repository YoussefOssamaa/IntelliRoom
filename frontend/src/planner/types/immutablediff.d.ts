declare module 'immutablediff' {
  import { List } from 'immutable';
  
  interface DiffOp {
    op: 'add' | 'remove' | 'replace';
    path: string;
    value?: any;
  }
  
  function diff(a: any, b: any, path?: string): List<DiffOp>;
  
  export = diff;
}
