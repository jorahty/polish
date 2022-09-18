const paths = {
  "terrain": "1980 1641 2250 1467 2430 1705 2527 854 2015 775 1663 117 1887 47 2778 918 2657 1885 1533 2122 1 1564 562 539 1481 1 1527 95 307 1285 672 1674 863 1498 1265 1674 1663 1564",
  "player": "0 80 20 0 40 80",
  "chest": "0 0 60 0 60 40 0 40",
  "token": "10.259 3.128 20 0.518 29.741 3.128 36.872 10.259 39.482 20 36.872 29.741 29.741 36.872 20 39.482 10.259 36.872 3.128 29.741 0.518 20 3.128 10.259",
  "sword": "0 0 40 0 40 40 0 40",
  "shield": "0 0 40 0 40 40 0 40",
  "worm": "145 32 1 32 21 1 120 5"
};

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

// remove all child nodes
function removeChildren(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
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
