// create title scene
function Title(socket) {
  // reset / cleanup
  if (socket && socket.close) socket.close();
  removeChildren(document.body);
  
  // create form for joining game
  const form = createElement(document.body, 'form',
    { id: 'joinForm' }
  );
  
  const textfield = createElement(form, 'input', {
    type: 'text',
    placeholder: 'Name',
    size: 15,
    autocomplete: 'off',
    value: sessionStorage.nickname || '',
    id: 'nickname',
  });

  const go = createElement(form, 'input', {
    type: 'submit',
    value: '→',
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
