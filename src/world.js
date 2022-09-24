// require all exports from matter-js
const Matter = require('matter-js');
for (const key in Matter) global[key] = Matter[key];

// provide concave decomposition support library
Common.setDecomp(require('poly-decomp'));

// get body shape definitions
const shapes = require('../data/shapes.json');

// global variables (global state)
var io, engine, world, static, dynamic, sockets;

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
  }

  // inform clients that one or many body(s) were removed from world
  function afterRemove({ object }) {
    io.emit('remove',
      Array.isArray(object) ? object.map(b => b.id) : object.id
    );
  }

  // spawn a bag in a random location every 2 seconds
  setInterval(() => {
    if (static.bodies.length > 3) return; // not too many
    const bag = createBag(
      Math.round(-400 + 800 * Math.random()), // x
      Math.round(-100 - 500 * Math.random()), // y
      Math.round(Math.random() * 10), // tokens
      Math.round(Math.random() * 5),  // sword
      Math.round(Math.random() * 5),  // shield
    );
    Composite.add(static, bag);
  }, 2000);
}

function manageConnections() {
  // map player.id (used internally) to socket (used to communicate)
  sockets = new Map();

  io.on('connection', socket => {
    socket.on('join', (nickname, sendId) => {
      // create player
      const player = Bodies.fromVertices(0, -300,
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

      sockets.set(player.id, socket) // record socket

      sendId(player.id); // inform client of their player's id

      // privatley emit 'add' for every preexisting body
      const info = renderInfo(static.bodies.concat(dynamic.bodies));
      if (info.length > 0) socket.emit('add', info);

      Composite.add(dynamic, player); // publicly add player to world

      // listen for input
      // update control state
      socket.on('input', code => {
        const control = code.toLowerCase();
        const active = control === code;
        player.controls[control] = active;
        Sleeping.set(player, false);
      });

      // move player according to control state
      Events.on(engine, 'beforeUpdate', movePlayer);
      function movePlayer() {
        const { a, d, l } = player.controls;
        const t = 0.04, f = 0.0015; // magnitudes

        if (a) player.torque = -t;
        if (d) player.torque = t;

        if (l) player.force = {
          x: f * Math.sin(player.angle),
          y: -f * Math.cos(player.angle)
        };
      }

      socket.on('disconnect', () => {
        pop(player); // publicly remove player and drop bag
        sockets.delete(player.id) // forget socket
        Events.off(engine, 'beforeUpdate', movePlayer); // stop moving
      });
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
    for (const [playerId, socket] of sockets) {
      const you = players.find(player => player.id === playerId);

      const leaderboard = (top.includes(you) || !you) ? top : top.concat(you);

      socket.emit('leaderboard', leaderboard.map(
        ({ nickname, tokens }) => ({ nickname, tokens })
      ));
    }
  }, 3000);
}

function manageEvents() {
  // listen for collisions
  Events.on(engine, "collisionStart", ({ pairs }) => {
    for (const { bodyA, bodyB, activeContacts, collision } of pairs) {
      // so far there are only two collisions we care about
      // 1. upgrade: player-on-bag
      // 2. stab: player-on-player

      // if neither is player, skip
      if (!(bodyA.shape === 'player' || bodyB.shape === 'player')) continue;

      // if other is bag, handle upgrade
      if (bodyA.shape === 'bag') {
        handleUpgrade(bodyB, bodyA);
        continue;
      }
      if (bodyB.shape === 'bag') {
        handleUpgrade(bodyA, bodyB);
        continue;
      }

      // if other is player, handle stab
      if (bodyA.shape === 'player' && bodyB.shape === 'player') {
        handleStab(bodyA, bodyB, activeContacts, collision);
      }
    }
  });

  function handleUpgrade(player, bag) {
    if (!bag.isAvailable) return;

    player.tokens += bag.tokens;
    // TODO: check for victory

    if (bag.sword > player.sword) player.sword = bag.sword;
    if (bag.shield > player.shield) player.shield = bag.shield;

    // inform player of their upgrade
    sockets.get(player.id).emit(
      'upgrade', player.sword, player.shield, bag.tokens
    );

    Composite.remove(static, bag); // publically remove bag from world
  }

  function handleStab(bodyA, bodyB, activeContacts, collision) {
    // both bodies must be players
    if (!bodyA.controls || !bodyB.controls) return;

    // must be a stab with nose
    if (activeContacts.length != 1) return;
    const { vertex } = activeContacts[0];
    if (vertex.index != 0) return;

    // identify attacker and victim
    const attacker = vertex.body;
    const victim = attacker === bodyA ? bodyB : bodyA;

    if (victim.stabImmune) return; // return if immune

    // make victim immune to stab for 0.5 seconds
    victim.stabImmune = true;
    setTimeout(() => victim.stabImmune = false, 500);

    // compute damage
    const damage = Math.round(collision.depth * 5);

    // inform attacker of strike
    sockets.get(attacker.id).emit('strike', {
      amount: damage,
      x: Math.round(vertex.x),
      y: Math.round(vertex.y),
    });

    // decrement victim health
    victim.health -= damage;

    // check for elimination
    // and emit 'death' and 'kill' accordingly
    if (victim.health <= 0) {
      sockets.get(victim.id).emit('death', attacker.nickname);
      sockets.get(attacker.id).emit('kill', victim.nickname);

      // disconnect victim
      // this should also publicly remove victim from world and drop bag
      sockets.get(victim.id).disconnect();
      return;
    }

    // if no elimination, simply inform victim of injury
    sockets.get(victim.id).emit('injury', victim.health);
  }
}

// helper functions:

// remove entity from world
// and drop bag in its place
function pop(entity) {
  const { position: { x, y }, tokens, sword, shield } = entity;
  Composite.remove(dynamic, entity);
  const bag = createBag(x, y, tokens, sword, shield);
  Composite.add(static, bag);
}

function createBag(x, y, tokens, sword, shield) {
  const bag = Bodies.fromVertices(x, y,
    Vertices.fromPath(shapes['bag']), {
    mass: 0.1,
    friction: 0.001,
    isStatic: true,
    isSensor: true,
    shape: 'bag',
    tokens: tokens,
    sword: sword,
    shield: shield,
  }
  );

  // make bag unavailable for half second
  // so bag is visible before pickup
  bag.isAvailable = false;
  setTimeout(() => bag.isAvailable = true, 500);
  return bag;
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
