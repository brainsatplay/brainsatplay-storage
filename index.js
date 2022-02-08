export * from './BFSUtils'
export * from './GDriveUtils'
export * from './csv'
export * from './blobUtils'
export * from './minimongoUtils'



export function toISOLocal(d) { //pass in a new Date(utc timestamp) object
    var z  = n =>  ('0' + n).slice(-2);
    var zz = n => ('00' + n).slice(-3);
    var off = d.getTimezoneOffset();
    var sign = off < 0? '+' : '-';
    off = Math.abs(off);
  
    return d.getFullYear() + '-' //https://stackoverflow.com/questions/49330139/date-toisostring-but-local-time-instead-of-utc
           + z(d.getMonth()+1) + '-' +
           z(d.getDate()) + 'T' +
           z(d.getHours()) + ':'  + 
           z(d.getMinutes()) + ':' +
           z(d.getSeconds()) + '.' +
           zz(d.getMilliseconds()) + 
           "(UTC" + sign + z(off/60|0) + ':00)'
}
