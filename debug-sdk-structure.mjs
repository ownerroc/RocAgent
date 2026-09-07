import * as scw from 'scaleway';
console.log('=== SDK Exports ===');
console.log(Object.keys(scw));
console.log('---');

// Check what's in the default export
if (scw.default) {
  console.log('default export:', Object.keys(scw.default));
}