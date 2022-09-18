# Server

```js

// 1. create matter.js physics world

const engine = Engine.create(),
  world = engine.world;

// 2. emit reguler updates about dynamic bodies

io.emit('update', gamestate);

// 3. manage a connection

io.on('connection', socket => {

  // create player
  Composite.add(world, player);

  // listen for input
  socket.on('input', code => {
    // influence player / player's control state
  });

  Events.on(engine, 'beforeUpdate', () => {
    // influence player based on control state
  })

  socket.on('disconnect', () => {

  });
});

// 4. listen for and emit other events
// (strike, injury, victory, upgrade)

```

# Client

```js

// 1. create matter.js physics world

const engine = Engine.create(),
  world = engine.world;

// 2. connect to server

const socket = io();

// 2. render events

socket.on('event', (arg) => {

  // manipulate engine.world

});

// 3. send input

socket.emit('input', code);

```