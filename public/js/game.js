// global variables (global state)
var socket, world, ui, myId;

function Game(nickname) {
  removeChildren(document.body);

  // create matter.js engine, world, renderer, canvas, viewport
  // decorate, add terrain
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
  const render = Render.create({
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

  Render.run(render); // temporary

  // decorate, add terrain
  Composite.add(world,
    Bodies.fromVertices(0, 0,
      Vertices.fromPath(paths['terrain']), {
        isStatic: true, // needed for correct position
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
  const socket = io();
  console.log('hello ...');
}

function renderEvents() {

}

function configControls() {

}
