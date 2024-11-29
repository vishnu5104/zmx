
class Card extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<h1>Hello, ZMX!</h1>
  <p>This is a custom card component.</p>`;
  }
}
customElements.define("card", Card);
    