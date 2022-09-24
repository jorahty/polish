// global variables (global state)
var socket, world, fromServer, render, ui, myId;

// create game scene
function Game(nickname) {
  document.body.replaceChildren(); // clear dom

  // allow user to go back to title scene
  window.history.pushState({}, '', '');
  onpopstate = () => returnToTitle();

  // if client looks away (and therefore potentially
  // becomes idle) kick back to title scene
  document.onvisibilitychange = () => returnToTitle();

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

  // create composite for bodies managed by server
  fromServer = Composite.create();
  Composite.add(world, fromServer);
}

function createUI() {
  ui = {};

  // create leaderboard
  ui.leaderboard = createElement(document.body, 'table',
    { id: 'leaderboard' }
  );

  [1, 2, 3, 4].forEach(() => { // 4 rows
    const row = createElement(leaderboard, 'tr');
    [1, 2].forEach(() => { // 2 columns
      createElement(row, 'td');
    })
  });

  // create messages container
  ui.messagesContainer = createElement(document.body, 'article',
    { id: 'messagesContainer' }
  );

  // create status bar
  const statusBar = createElement(document.body, 'section',
    { id: 'statusBar' }
  );

  // create sword, shield
  ['sword', 'shield'].forEach(s => {
    const el = createElement(statusBar, 'svg');
    fetch(`./img/${s}.svg`)
      .then(r => r.text())
      .then(r => {
        el.outerHTML = r;
        ui[s] = document.getElementById(s);
        ui[s].level = 0;
      });
  });

  // create healthBar, hitpoints
  const healthBar = createElement(statusBar, 'div', { id: 'healthBar' });
  [1, 2].forEach(() => createElement(healthBar, 'div'));
  const hitpoints = createElement(statusBar, 'div', { id: 'hitpoints' });
  hitpoints.max = 100; // need to keep track of max health
  ui.setHealth = (health, maxHealth) => {
    if (maxHealth) hitpoints.max = maxHealth;
    hitpoints.textContent = health;
    const percentFull = Math.round(health / hitpoints.max * 100);
    document.querySelector(':root')
      .style.setProperty('--health', `${percentFull}%`);
  }
  ui.regenerate = setInterval(() => {
    if (hitpoints.textContent < hitpoints.max)
      ui.setHealth(parseInt(hitpoints.textContent) + 1);
  }, 2000);

  // set health
  document.querySelector(':root').style.setProperty('--health', '100%');
  hitpoints.textContent = 100;

  // create controls container
  ui.controlsContainer = createElement(document.body, 'section',
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
    const info = [].concat(object);
    for (const { id, shape, position, angle } of info) {
      Composite.add(fromServer,
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
      Composite.remove(fromServer, fromServer.bodies.find(body => body.id === id));
  });

  // update position and rotation of dynamic bodies,
  // move camera, and render next frame
  socket.on('update', gamestate => {
    for (const { i, x, y, a } of gamestate) {
      const body = fromServer.bodies.find(body => body.id === i);
      if (!body) continue;
      Body.setPosition(body, { x, y }); // update position
      Body.setAngle(body, a); // update angle
      if (body.id === myId) moveCameraTo(body);
    }

    Render.world(render); // render next frame
  });

  // have the "camera" follow the player with myId
  function moveCameraTo(me) {
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

  // render upgrade to ui
  socket.on('upgrade', (sword, shield, tokens, health, maxHealth) => {
    const message = document.createElement('h1');
    if (sword > ui.sword.level) {
      ui.sword.level = sword;
      ui.sword.style.fill = rarityColors.get(sword);
      message.appendChild(ui.sword.cloneNode(true));
    }
    if (shield > ui.shield.level) {
      ui.shield.level = shield;
      ui.shield.style.fill = rarityColors.get(shield);
      message.appendChild(ui.shield.cloneNode(true));
      // set health according to currentHealth and maxHealth
      ui.setHealth(health, maxHealth);
    }
    const n = createElement(message, 'span', { textContent: tokens });
    const s = Math.min(tokens * 10, 100);
    const l = Math.max(-4 * tokens + 90, 50);
    n.style.color = `hsl(200, ${s}%, ${l}%)`;
    display(message);
  });

  function display(message) {
    ui.messagesContainer.appendChild(message);
    setTimeout(() => {
      if (ui.messagesContainer.contains(message))
        ui.messagesContainer.removeChild(message);
    }, 3000);
  }

  // render one or many strike(s)
  socket.on('strike', object => {
    const strikes = [].concat(object);
    const damageIndicators = strikes.map(({ amount, x, y }) => (
      Body.create({
        position: { x, y },
        render: {
          fillStyle: `hsl(${-0.5 * amount + 230}, 61%, 70%)`,
          zIndex: 10,
          lineWidth: 5,
          strokeStyle: '#000',
          text: {
            content: amount,
            font: '55px jetFont',
          },
        },
      })
    ));
    // render damage indicator(s) for 2 seconds
    Composite.add(world, damageIndicators);
    setTimeout(() => Composite.remove(world, damageIndicators), 2000);
  });

  // render new health
  socket.on('injury', health => ui.setHealth(health));

  // render kill message
  socket.on('kill', nickname => {
    const message = document.createElement('p');
    message.textContent = `you eliminated ${nickname}`;
    display(message);
  });

  // listen for death
  socket.on('death', nickname => {
    ui.setHealth(0); // set health to zero
    clearInterval(ui.regenerate) // stop regenerating

    // replace controls container with death ui
    ui.controlsContainer.replaceChildren();
    createElement(ui.controlsContainer, 'p', {
      textContent: `${nickname} eliminated you`,
    });
    createElement(ui.controlsContainer, 'button', {
      id: 'goBack',
      textContent: '→',
      onclick: () => returnToTitle(),
    });
  });

  socket.on('victory', nickname => {
    // hide leaderboard and messages
    ui.leaderboard.style.display = 'none';
    ui.messagesContainer.style.display = 'none';

    // create victory message
    ui.victory = createElement(document.body, 'article', { id: 'victory' });
    createElement(ui.victory, 'div', { textContent: nickname });
    createElement(ui.victory, 'div', { textContent: 'scored the' });
    createElement(ui.victory, 'div', { textContent: 'W' });
  });

  socket.on('reset', () => {
    // show leaderboard and messages
    ui.leaderboard.style.display = 'block';
    ui.messagesContainer.replaceChildren();
    ui.messagesContainer.style.display = 'block';

    // remove victory message
    document.body.removeChild(ui.victory);

    // reset health, sword, shield
    ui.setHealth(100, 100);
    ui.sword.style.fill = ui.shield.style.fill = rarityColors.get(0);
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

function returnToTitle() {
  // reset / cleanup
  if (socket && socket.close) socket.close();
  Common._nextId = 0;
  clearInterval(ui.regenerate);
  onkeydown = onkeyup = undefined;
  Title();
}
