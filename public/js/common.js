const shapes = {
  "terrain": "1980 1641 2250 1467 2430 1705 2527 854 2015 775 1663 117 1887 47 2778 918 2657 1885 1533 2122 1 1564 562 539 1481 1 1527 95 307 1285 672 1674 863 1498 1265 1674 1663 1564",
  "player": "0 80 20 0 40 80",
  "chest": "0 0 60 0 60 40 0 40",
  "bag": "0 0 40 0 40 40 0 40",
  "worm": "145 32 1 32 21 1 120 5"
};

const rarityColors = new Map();
rarityColors.set(0, '#f00');
rarityColors.set(1, '#888');
rarityColors.set(2, '#484');
rarityColors.set(3, '#08f');
rarityColors.set(4, '#f0f');
rarityColors.set(5, '#f80');

const filter = new Filter();

const isValid = nickname => {
  if (nickname.length < 2 || nickname.length > 15) return false;
  if (filter.isProfane(nickname)) return false;
  return true;
}

function createElement(parent, type, props) {
  const el = document.createElement(type);
  parent.appendChild(el);
  for (const key in props) el[key] = props[key];
  return el;
}

// module aliases
const Engine = Matter.Engine,
  Render = Matter.Render,
  Runner = Matter.Runner,
  Bodies = Matter.Bodies,
  Composite = Matter.Composite,
  Body = Matter.Body,
  Vertices = Matter.Vertices,
  Common = Matter.Common,
  Vector = Matter.Vector,
  Bounds = Matter.Bounds,
  Events = Matter.Events;

// provide concave decomposition support library
Common.setDecomp(decomp);
