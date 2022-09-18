function Title() {
  removeChildren(document.body);
  
  const form = createElement(document.body, 'form');
  
  const textfield = createElement(form, 'input',
    { type: 'text', placeholder: 'name' }
  );
  
  const go = createElement(form, 'input',
    { type: 'submit', disabled: 'true', value: 'go' }
  );

  textfield.oninput = () => {
    go.disabled = !isValid(textfield.value);
  }

  form.onsubmit = e => {
    e.preventDefault();
    Game(textfield.value);
  }

  // skip title in development (temporary)
  // const nickname = Date.now().toString(16).slice(8);
  // console.log(nickname);
  // Game(nickname);
}
