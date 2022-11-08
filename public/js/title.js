// create title scene
function Title() {
  document.body.replaceChildren(); // clear dom

  // create form for joining game
  const form = createElement(document.body, 'form',
    { id: 'joinForm' }
  );

  // logo
  const logo = createElement(document.body, 'svg');
  fetch('./img/title.svg')
    .then(r => r.text())
    .then(r => {
      logo.outerHTML = r;
    });

  const textfield = createElement(form, 'input', {
    type: 'text',
    placeholder: 'Name',
    size: 15,
    autocomplete: 'off',
    value: sessionStorage.nickname || '',
    id: 'nickname',
  });

  if (textfield.value) textfield.focus();

  const go = createElement(form, 'button', {
    textContent: '→',
    disabled: !isValid(textfield.value),
    id: 'go',
  });

  textfield.oninput = () => {
    go.disabled = !isValid(textfield.value);
  }

  form.onsubmit = e => {
    e.preventDefault();
    sessionStorage.nickname = textfield.value;
    Game(textfield.value);
  }
}
