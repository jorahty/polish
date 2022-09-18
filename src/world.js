// require all exports from matter-js
const Matter = require('matter-js');
for (const key in Matter) global[key] = Matter[key];

// provide concave decomposition support library
Common.setDecomp(require('poly-decomp'));

// get body shape definitions
const paths = require('../data/paths.json');

// global variables (global state)
var io, engine, world, permanent, static, dynamic, socketIds;

function init(i) {
  io = i;
  
  // create world, engine; generate initial bodies
  createWorld();
  
  manageConnections();
  
  // broadcast regular updates
  emitRegularUpdates();
  
  // listen for and emit special events
  manageEvents();
}

module.exports = init;

function createWorld() {
  console.log('createWorld');
}
  
function manageConnections() {
  console.log('manageConnections');
}

function emitRegularUpdates() {
  console.log('emitRegularUpdates');
}

function manageEvents() {
  console.log('manageEvents');
}
