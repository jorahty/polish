// require all exports from matter-js
const Matter = require('matter-js');
for (const key in Matter) global[key] = Matter[key];

// provide concave decomposition support library
Common.setDecomp(require('poly-decomp'));

// get body shape definitions
const paths = require('../data/paths.json');

// global variables
var io, engine, world;

function init(i) {
  io = i;
  
  console.log('create world');
  console.log('emit regular updates');
  console.log('manage connection');
  console.log('listen for other events');

}

module.exports = init;
