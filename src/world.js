// require all exports from matter-js
const Matter = require('matter-js');
for (const key in Matter) global[key] = Matter[key];

// provide concave decomposition support library
Common.setDecomp(require('poly-decomp'));

// get body shape definitions
const shapes = require('../data/shapes.json');

// global variables (global state)
var io, engine, world, static, dynamic, socketIds;

// init
module.exports = (http) => {
  io = require('socket.io')(http);

  // create world, engine; generate initial bodies
  createWorld();
  
  // handle each client connection
  manageConnections();
  
  // broadcast regular updates to all clients
  emitRegularUpdates();
  
  // listen for and emit special events
  manageEvents();
}

function createWorld() {
  engine = Engine.create({ enableSleeping: true }),
  world = engine.world;

  // run the engine
  const runner = Runner.create();
  Runner.run(runner, engine);

  // add terrain
  Composite.add(world,
    Bodies.fromVertices(0, 0,
      Vertices.fromPath(shapes['terrain']),
      { friction: 0.01, isStatic: true },
    ),
  );

  // create composite for dynamic bodies (players, npcs, bullets)
  dynamic = Composite.create();
  Composite.add(world, dynamic);

  // create composite for static bodies (loot, bags)
  static = Composite.create();
  Composite.add(world, static);

  // TODO: generate some inital dynamic and static bodies
}
  
function manageConnections() {
  // map player.id (used internally) to socket.id (used to communicate)
  socketIds = new Map();

  io.on('connection', socket => {
    let player; // one player per connection

    socket.on('join', (nickname, sendId) => {
      // create player
      player = Bodies.fromVertices(0, -300,
        Vertices.fromPath(shapes['player']), {
        mass: 0.5,
        friction: 0.01,
        shape: 'player',
        nickname: nickname,
        health: 100,
        tokens: 100,
        sword: 0,
        shield: 0,
      });

      socketIds.set(player.id, socket.id) // record socket.id

      sendId(player.id); // inform client of their player's id

      // TODO: privatley emit 'add' for every preexisting body

      add(player); // publicly add player to world
    });

    socket.on('disconnect', () => {
      pop(player); // puplically remove player and drop bag
      socketIds.delete(player.id) // forget socket.id
    });
  });
}

function emitRegularUpdates() {
  console.log('emitRegularUpdates');
}

function manageEvents() {
  console.log('manageEvents');
}

// helper functions:

// publically add body to world
// (add to appropriate composite)
// (send minimum needed options)
function add(body) {
  Composite.add(dynamic, body); // add to world

  // inform clients
  const { shape, position } = body;
  io.emit('add', body.id, { shape, position });
}

// publically remove body from world
// (remove from appropriate composite)
function remove(body) {
  Composite.remove(dynamic, body); // remove from world
  io.emit('remove', body.id); // inform clients
}

// remove entity from world
// and drop bag in its place
function pop(entity) {
  remove(entity);

  // TODO: drop bag
  // 1. generate bag from player
  // 2. add(bag);
}
