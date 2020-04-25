/**
 * Auto fills url and times by typing "demo" in url input
 */
function enableDemo() {
  function fillInput(input) {
    if (input.id === 'filename') return
    input.value = input.placeholder
  }

  const input = document.querySelector('#url')
  input.addEventListener('input', () => {
    if (input.value === 'demo') {
      const textInputs = document.querySelectorAll('input[type=text]')
      textInputs.forEach(fillInput)
    }
  })
}

/**
 * Focus on next input time field when reaching the
 * current input max length
 * @param { HTMLElement } input
 * @param { Number } index
 * @param { HTMLElement[] } inputs
 */
function jumpToNextField(input, index, inputs) {
  const maxLength = input.maxLength
  const currentLength = input.value.length
  const nextInput = inputs[index + 1]

  if (!nextInput) {
    return
  }

  if (currentLength >= maxLength) {
    nextInput.focus()
  }
}

/**
 * Insert time delimiter ":" automatically when
 * inputing time stamp in the format "HH:MM:SS"
 * @param { Object } event
 */
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

/**
 * Add a listener that formats time inputs on all
 * time inputs
 */
function listenTimeInputs() {
  const inputs = Array.from(document.querySelectorAll('.time-input'))
  inputs.forEach((input, index, inputs) =>
    input.addEventListener('input', (event) => {
      formatTimeInput(event)
      jumpToNextField(input, index, inputs)
    })
  )
}

/**
 * Add listeners on page load
 */
window.addEventListener('load', () => {
  listenTimeInputs()
  enableDemo()
})
