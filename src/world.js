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

  // create engine, world; generate initial bodies
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

  // there are 3 catagories of bodies: known, static and dynamic
  // clients are never informed of known bodies in any way, because clients are already aware
  // whenever a static or dynamic body is added to or removed from the world, clients are informed
  // moreover, clients are regularly updated on the position and angle of all dynamic bodies that are not sleeping
  // meanwhile, clients are never updated on the position or angle of a static body,
  // because the position and angle of a static body should never change

  // add terrain (a 'known' body)
  Composite.add(world,
    Bodies.fromVertices(0, 0,
      Vertices.fromPath(shapes['terrain']),
      { friction: 0.01, isStatic: true },
    ),
  );
  
  // create composite for static bodies
  static = Composite.create();
  Composite.add(world, static);

  // create composite for dynamic bodies
  dynamic = Composite.create();
  Composite.add(world, dynamic);

  // attatch add and remove listeners
  Events.on(static, "afterAdd", afterAdd);
  Events.on(dynamic, "afterAdd", afterAdd);
  Events.on(static, "afterRemove", afterRemove);
  Events.on(dynamic, "afterRemove", afterRemove);

  // inform clients that one or many body(s) were added to world
  function afterAdd({ object }) {
    // extract minimum info needed for client to render
    const info = renderInfo(object);

    io.emit('add', info.length === 1 ? info[0] : info);
    console.log(`'add', info: ${info.length === 1 ? info[0] : info}`);;
  }

  // inform clients that one or many body(s) were removed from world
  function afterRemove({ object }) {
    io.emit('remove', Array.isArray(object) ? object.map(b => b.id) : object.id);
    console.log(`'remove', ids: ${Array.isArray(object) ? object.map(b => b.id) : object.id}`);
  }

  // spawn a bag in a random location every 10 seconds
  // setInterval(() => {
  //   const bag = createBag(
  //     Math.round(-400 + 800 * Math.random()), // x
  //     Math.round(500 + -600 * Math.random()), // y
  //     Math.round(Math.random() * 10), // points
  //     Math.round(Math.random() * 4),  // sword
  //     Math.round(Math.random() * 4),  // shield
  //   );
  //   Composite.add(static, bag);
  // }, 1000 * 10);
}
  
function manageConnections() {
  // map player.id (used internally) to socket.id (used to communicate)
  socketIds = new Map();

  let playerCount = 0;

  io.on('connection', socket => {
    var player; // one player per connection

    console.log('new connection, clientCount', socket.adapter.sids.size);
    
    socket.on('join', (nickname, sendId) => {
      console.log(`'join', playerCount: ${++playerCount}`);

      // create player
      player = Bodies.fromVertices(0, -300,
        Vertices.fromPath(shapes['player']), {
        mass: 0.5,
        friction: 0.01,
        shape: 'player',
        nickname: nickname,
        health: 100,
        tokens: 1,
        sword: 0,
        shield: 0,
        controls: {},
      });

      socketIds.set(player.id, socket.id) // record socket.id

      sendId(player.id); // inform client of their player's id

      // privatley emit 'add' for every preexisting body
      const info = renderInfo(static.bodies.concat(dynamic.bodies));
      if (info.length > 0) socket.emit('add', info);

      Composite.add(dynamic, player); // publicly add player to world
    });

    // listen for input
    // update control state
    socket.on('input', code => {
      if (!player) return;
      const control = code.toLowerCase();
      const active = control === code;
      player.controls[control] = active;
      Sleeping.set(player, false);
    });

    // move player according to control state
    Events.on(engine, 'beforeUpdate', () => {
      if (!player) return;
      const { a, d, l } = player.controls;
      const t = 0.04, f = 0.0015; // magnitudes

      if (a) player.torque = -t;
      if (d) player.torque = t;

      if (l) player.force = {
        x: f * Math.sin(player.angle),
        y: -f * Math.cos(player.angle)
      };
    });

    socket.on('disconnect', () => {
      console.log(`'disconnect', clientCount: ${socket.adapter.sids.size}`);
      if (!player) return;
      pop(player); // publicly remove player and drop bag
      socketIds.delete(player.id) // forget socket.id
      console.log(`'leave', playerCount: ${--playerCount}`);
    });
  });
}

function emitRegularUpdates() {
  // regularly update clients on the position and
  // angle of all dynamic bodies that are not sleeping
  setInterval(() => {
    const gamestate = dynamic.bodies.flatMap(b => b.isSleeping ? [] : {
      i: b.id,
      x: Math.round(b.position.x),
      y: Math.round(b.position.y),
      a: Math.round(b.angle * 100) / 100,
    });
  
    io.volatile.emit('update', gamestate);
  }, 1000 / 60);

  // infrequently emit leaderboard to all clients
  setInterval(() => {
    const players = dynamic.bodies.filter(
      body => body.shape === 'player'
    );

    players.sort((a, b) => b.tokens - a.tokens);

    const top = players.slice(0, 3);

    // send each player their custom leaderboard
    for (const [playerId, socketId] of socketIds) {
      const you = players.find(player => player.id === playerId);

      const leaderboard = top.includes(you) || !you ? top : top.concat(you);

      io.to(socketId).emit('leaderboard', leaderboard.map(
        ({ nickname, tokens }) => ({ nickname, tokens })
      ));
    }
  }, 3000);
}

function manageEvents() {
  // TODO
}

// helper functions:

// remove entity from world
// and drop bag in its place
function pop(entity) {
  Composite.remove(dynamic, entity);

  // TODO: drop bag
  // 1. generate bag from player
  // 2. add(bag);
}

function createBag(x, y, points, sword, shield) {
  return Bodies.fromVertices(x, y,
    Vertices.fromPath(shapes['bag']), {
      mass: 0.1,
      friction: 0.001,
      isStatic: true,
      isSensor: true,
      shape: 'bag',
      points: points,
      sword: sword,
      shield: shield,
    }
  );
}

// extract minimum info needed for client to render
// (right now this only handles players and bags, using 
// their shape to distinguish between the two. later,
// this function needs to evolve to determine exactly
// what info is needed for rendering each body)
function renderInfo(object) {
  const objects = [].concat(object);
  return objects.map(body => {
    const bodyInfo = {
      id: body.id,
      shape: body.shape,
      position: body.position,
    };
    if (body.shape === 'player') bodyInfo.angle = body.angle;
    return bodyInfo;
  });
}
