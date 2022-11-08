const shapes = {
  "terrain": "1035 1438 2866 675 2 1469 6210 3467 7844 1 2873 675 6747 893 6290 2095 4858 2142 3934 1784 3928 1684 3406 1684 2904 1541 2297 1573 1831 1661 1468 1641",
  "player": "0 80 20 0 40 80",
  "chest": "0 0 60 0 60 40 0 40",
  "bag": "0 0 59 0 49 59 0 59",
  "ball": "30.210 59.146 41.423 56.915 50.929 50.564 57.281 41.058 59.511 29.845 57.281 18.632 50.929 9.126 41.423 2.774 30.210 0.544 18.997 2.774 9.492 9.126 3.140 18.632 0.910 29.845 3.140 41.058 9.492 50.564 18.997 56.915",
  "worm": "145 32 1 32 21 1 120 5"
};

const rarityColors = new Map();
rarityColors.set(0, '#00000033');
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
