function Title() {
  removeChildren(document.body);
  
  const form = createElement(document.body, 'form',
    { id: 'joinForm' }
  );
  
  const textfield = createElement(form, 'input', {
    type: 'text',
    placeholder: 'name',
    size: 15,
    value: sessionStorage.nickname || '',
    id: 'nickname',
  });
  
  const go = createElement(form, 'input', {
    type: 'submit',
    value: 'go',
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

    // allow user to go back to title
    window.history.pushState({}, '', '');
    onpopstate = () => Title();
  }

  // Game('jimmy'); // temporary
}
