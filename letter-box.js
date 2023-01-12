/* global HTMLElement, customElements, CustomEvent */

const selectOption = (item, labelProperty) => `
  <option value="${item.id}">${item[labelProperty]}</option>
`

const selectField = (data, labelProperty) => `
  <select name="letter-box-data-item">
    ${data.map(d => selectOption(d, labelProperty)).join('\n')}
  </select>
`

const letterBoxContent = () => '<letter-box-content></letter-box-content>'

class LetterBox extends HTMLElement {
  #properties

  constructor () {
    super()
    this.#properties = []
  }

  async connectedCallback () {
    this.data = await this.retrieveData()
    this.content = await this.letterBoxContent()
    this.select = await this.dataSelector(this.data)
    this.slots = Array.from(this.querySelectorAll('[slot]'))

    // we share a template across all letter-box elements on a page (for sure this could be more elaborate)
    this.template = document.querySelector('#letter-box-template')
    this.renderLetter(this.data[0])

    this.selectListener = (e) => {
      this.renderLetter(e.detail)
    }

    this.addEventListener('data-item:selected', this.selectListener)
  }

  renderLetter (dataItem) {
    const template = this.template.content
    console.log(template)

    const shadowRoot = this.content.shadowRoot || this.content.attachShadow({ mode: 'open' })
    shadowRoot.innerHTML = ''
    shadowRoot.appendChild(template.cloneNode(true))

    if (this.slots) {
      for (const slotReplacement of this.slots) {
        const slot = shadowRoot.querySelector(`slot[name="${slotReplacement.slot}"]`)
        slot.replaceWith(slotReplacement)
      }
    }

    for (const prop of this.properties) {
      shadowRoot.innerHTML = shadowRoot.innerHTML.replaceAll(`{{${prop}}}`, dataItem[prop])
    }
  }

  async retrieveData () {
    const src = this.getAttribute('src')

    const data = await fetch(src).then(res => {
      if (!res.ok) {
        throw new Error('could not retrieve source data', { cause: { code: res.status, message: res.statusText } })
      }

      return res.json()
    })

    return data
  }

  async letterBoxContent () {
    await this.insertAdjacentHTML('afterbegin', letterBoxContent())
    const contentBox = this.querySelector('letter-box-content')
    return contentBox
  }

  async dataSelector (data) {
    await this.insertAdjacentHTML('afterbegin', selectField(data, 'last_name'))
    const select = this.querySelector('select[name="letter-box-data-item"]')

    this.changeListener = (e) => {
      const detail = this.data.find(d => parseInt(d.id) === parseInt(select.value))
      this.dispatchEvent(new CustomEvent('data-item:selected', { detail }))
    }

    select.addEventListener('change', this.changeListener, false)

    return select
  }

  get properties () {
    if (this.#properties?.length > 0) return this.#properties

    if (this.hasAttribute('properties')) {
      this.#properties = this.getAttribute('properties').split(',')
    }

    return this.#properties
  }

  disconnectedCallback () {
    if (this.changeListener) {
      this.select?.removeEventListener('change', this.changeListener)
    }
    if (this.selectListener) {
      this.removeEventListener('data-item:selected', this.selectListener)
    }
  }
}

customElements.define('letter-box', LetterBox)
