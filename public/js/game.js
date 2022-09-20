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
  // window.document.onvisibilitychange = () => Title(socket);

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

  // set zoom
  const zoom = 360;
  Render.lookAt(render, {
    min: { x: -zoom, y: -zoom },
    max: { x: zoom, y: zoom },
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
  createElement(document.body, 'section',
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

  // save ui to global state
  ui = {
    leaderboard,
    messagesContainer,
    sword, shield, hitpoints,
    controlsContainer
  };
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
    const info = [].concat(object);
    for (const { id, shape, position, angle } of info) {
      Composite.add(world,
        Bodies.fromVertices(position.x, position.y,
          Vertices.fromPath(shapes[shape]),
          { id, angle: angle ? angle : 0 }
        )
      );
    }
  });

  // remove one or many body(s) from world
  socket.on('remove', object => {
    const ids = [].concat(object);
    for (const id of ids)
      Composite.remove(world, world.bodies.find(body => body.id === id));
  });

  // update position and rotation of dynamic bodies,
  // move camera, and render next frame
  socket.on('update', gamestate => {
    for (const { i, x, y, a } of gamestate) {
      const body = world.bodies.find(body => body.id === i);
      if (!body) continue;
      Body.setPosition(body, { x, y }); // update position
      Body.setAngle(body, a); // update angle
    }

    moveCamera(); // center viewport around player with myId
    
    Render.world(render); // render next frame
  });

  // have the "camera" follow the player with myId
  function moveCamera() {
    // identify body with myId
    const me = world.bodies.find(body => body.id === myId);
    if (!me) return;

    // compute render.postion i.e. center of viewport
    render.position = {
      x: (render.bounds.min.x + render.bounds.max.x) / 2,
      y: (render.bounds.min.y + render.bounds.max.y) / 2
    };

    // compute vector from render.position to player.position
    const delta = Vector.sub(me.position, render.position);

    if (Vector.magnitude(delta) < 1) return; // don't bother

    // on this update, only move camera 10% of the way
    Bounds.translate(render.bounds, Vector.mult(delta, 0.1));
  }

  // render the leaderboard
  socket.on('leaderboard', lb => {
    for (let i = 0; i < 4; i++) { // iterate over all 4 rows
      const row = ui.leaderboard.childNodes[i];
      if (i < lb.length) {
        row.firstChild.textContent = lb[i].tokens;
        row.lastChild.textContent = lb[i].nickname;
      } else {
        row.firstChild.textContent = row.lastChild.textContent = '';
      }
    }
  });
}

function configControls() {
  ['a', 'd', 'l'].forEach(code => {
    createElement(controlsContainer, 'button', {
      textContent: code,
      onpointerdown: () => input(code, true),
      onpointerup: () => input(code, false),
      id: `${code}Button`,
    });
  });

  onkeydown = e => {
    if ('adl'.includes(e.key)) input(e.key, true);
  };

  onkeyup = e => {
    if ('adl'.includes(e.key)) input(e.key, false);
  };

  function input(code, down) {
    document.getElementById(`${code}Button`).className = down ? 'down' : '';
    if (!down) code = code.toUpperCase();
    socket.volatile.emit('input', code);
  }
}
