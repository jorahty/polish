// require all exports from matter-js
const Matter = require('matter-js');
for (const key in Matter) global[key] = Matter[key];

// provide concave decomposition support library
Common.setDecomp(require('poly-decomp'));

// get body shape definitions
const paths = require('../data/paths.json');

// global variables (global state)
var io, engine, world, static, dynamic, socketIds;

function init(i) {
  io = i;
  
  // create world, engine; generate initial bodies
  createWorld();
  
  // handle each client connection
  manageConnections();
  
  // broadcast regular updates to all
  emitRegularUpdates();
  
  // listen for and emit special events
  manageEvents();
}

module.exports = init;

function createWorld() {
  engine = Engine.create({ enableSleeping: true }),
  world = engine.world;

  // run the engine
  const runner = Runner.create();
  Runner.run(runner, engine);

  // add terrain
  Composite.add(world,
    Bodies.fromVertices(0, 0,
      Vertices.fromPath(paths['terrain']),
      { friction: 0.01, isStatic: true },
    ),
  );

  // create composite for dynamic bodies (players, npcs, bullets)
  dynamic = Composite.create();
  Composite.add(world, dynamic);

  // create composite for static bodies (loot, bags)
  static = Composite.create();
  Composite.add(world, static);

  // TODO: generate some dynamic and static bodies
}
  
function manageConnections() {
  let playerCount = 0;

  // map player.id (used internally) to socket.id (used to communicate)
  socketIds = new Map();

  io.on('connection', socket => {
    console.log('we got a connection! 😭🎉');
  });
}

function emitRegularUpdates() {
  console.log('emitRegularUpdates');
}

function manageEvents() {
  console.log('manageEvents');
}
