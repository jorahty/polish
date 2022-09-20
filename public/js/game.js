// global variables (global state)
var socket, world, render, ui, myId;

// create game scene
function Game(nickname) {
  removeChildren(document.body); // clear dom

  // allow user to go back to title scene
  window.history.pushState({}, '', '');
  window.onpopstate = () => Title(socket);

  // if they look away (and therefore potentially
  // become idle) kick them back to title scene
  window.document.onvisibilitychange = () => Title(socket);

  // create matter.js engine, world, render, viewport
  // also decorate world, add terrain
  createWorld();

  // create ui (leaderboard, messages, status bar, sword, shield,
  // health bar, hitpoints, controls container, messages container)
  createUI();

  // connect to server, send nickname, get id
  connect(nickname);

  // begin listening for events to render
  renderEvents();
  
  // create and configure controls to send input to server
  configControls();
}

function createWorld() {
  // create engine and world
  const engine = Engine.create();
  world = engine.world; // part of global state

  // create renderer / canvas / viewport
  render = Render.create({
    element: document.body,
    engine: engine,
    options: {
      wireframes: false,
      width: 800,
      height: 850,
      hasBounds: true,
    },
  });

  // center the render viewport (or camera) about origin
  Render.lookAt(render, {
    min: { x: -360, y: -360 },
    max: { x: 360, y: 360 },
  });

  // decorate, add terrain
  Composite.add(world,
    Bodies.fromVertices(0, 0,
      Vertices.fromPath(shapes['terrain']), {
        isStatic: true, // needed for correct positioning
        render: { fillStyle: '#789' },
      }
    ),
  );
}

function createUI() {
  // create leaderboard
  const leaderboard = createElement(document.body, 'table',
    { id: 'leaderboard' }
  );

  [1,2,3,4].forEach(() => { // 4 rows
    const row = createElement(leaderboard, 'tr');
    [1,2].forEach(() => { // 2 columns
      createElement(row, 'td');
    })
  });

  // create messages container
  const messagesContainer = createElement(document.body, 'article',
    { id: 'messagesContainer' }
  );

  // create status bar
  const statusBar = createElement(document.body, 'section',
    { id: 'statusBar' }
  );

  // create sword, shield, healthBar, hitpoints
  const sword = createElement(statusBar, 'div', { id: 'sword', textContent: 0 });
  const shield = createElement(statusBar, 'div', { id: 'shield', textContent: 0 });
  const healthBar = createElement(statusBar, 'div', { id: 'healthBar' });
  [1,2].forEach(() => createElement(healthBar, 'div'));
  const hitpoints = createElement(statusBar, 'div', { id: 'hitpoints' });

  // set health
  document.querySelector(':root').style.setProperty('--health', '100%');
  hitpoints.textContent = 100;

  // create controls container
  const controlsContainer = createElement(document.body, 'section',
    { id: 'controlsContainer' }
  );
}

function connect(nickname) {
  socket = io(); // establish connection

  // join world, send your nickname, get your id
  socket.emit('join', nickname, (id) => myId = id);
}

function renderEvents() {
  // add one or many body(s) to world
  // render each body according to given info
  socket.on('add', object => {
    console.log('add', object);
  });

  // remove one or many body(s) from world
  socket.on('remove', object => {
    console.log('remove', object);
  });

  // update position and rotation of dynamic bodies,
  // move camera, and render next frame
  socket.on('update', gamestate => {
    
    Render.world(render);
  });
}

function configControls() {

}
