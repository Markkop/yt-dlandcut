function formatTimeInput(event) {
  const input = event.target
  let characters = input.value.split('')
  if (characters[2] && characters[2] !== ':') {
    const nextChar = characters[2]
    characters[2] = ':'
    characters[3] = nextChar
  }
  if (characters[5] && characters[5] !== ':') {
    const nextChar = characters[5]
    characters[5] = ':'
    characters[6] = nextChar
  }

  input.value = characters.join('')
}

function listenAndFormatTimeInput() {
  const inputs = Array.from(document.querySelectorAll('.time-input'))
  inputs.forEach((input) => input.addEventListener('input', formatTimeInput))
}

window.addEventListener('load', () => {
  listenAndFormatTimeInput()
})
