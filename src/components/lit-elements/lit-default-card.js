import { LitElement, html, css } from 'lit';
import '@shoelace-style/shoelace/dist/components/card/card.js';

class DefaultCard extends LitElement {
    static styles = css`
        sl-card {
            --border-radius: 10px;
            padding: 10px;
            border: none;
            border-radius: 5px;
    
            &:hover {
                cursor: pointer;
                --border-color: #5F1EBE;
            }
        }

        section {
            margin: 5px 0;
        }
        section.titles {
            display: flex;
            flex-direction: column;
            gap: 1px;
            line-height: 1.2;
            margin: 0 5px;
        }
        section.delete {
            display: flex;
            flex-direction: row;
            justify-content: flex-end;
            align-items: center;
            gap: 5px;
        }
        section.description {
            margin: 5px 0 50px 0;
        }

        text {
            font-size: 16px;
        }
        text.medium {
            font-size: 14px;
        }

        img {
            background: #383838;
            border-radius: 8px;
            padding: 10px;
            height: 55px;
            width: auto;
            display: block;
        }

        div.main {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 10px;
            background:rgb(231, 194, 34);
        }
        div.icon {
            margin: 0;
            padding: 0;
        }
        div.delete {
            width: 20px;
            height: 20px;
            background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMgNkg1SDIxIiBmaWxsPSIjRDY0NjZGIi8+CjxwYXRoIGQ9Ik0zIDZINUgyMSIgc3Ryb2tlPSIjRDY0NjZGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMTkgNlYyMEMxOSAyMC41MzA0IDE4Ljc4OTMgMjEuMDM5MSAxOC40MTQyIDIxLjQxNDJDMTguMDM5MSAyMS43ODkzIDE3LjUzMDQgMjIgMTcgMjJIN0M2LjQ2OTU3IDIyIDUuOTYwODYgMjEuNzg5MyA1LjU4NTc5IDIxLjQxNDJDNS4yMTA3MSAyMS4wMzkxIDUgMjAuNTMwNCA1IDIwVjZNOCA2VjRDOCAzLjQ2OTU3IDguMjEwNzEgMi45NjA4NiA4LjU4NTc5IDIuNTg1NzlDOC45NjA4NiAyLjIxMDcxIDkuNDY5NTcgMiAxMCAySDE0QzE0LjUzMDQgMiAxNS4wMzkxIDIuMjEwNzEgMTUuNDE0MiAyLjU4NTc5QzE1Ljc4OTMgMi45NjA4NiAxNiAzLjQ2OTU3IDE2IDRWNiIgc3Ryb2tlPSIjRDY0NjZGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K');
            background-position: top right;
            background-repeat: no-repeat;
            background-size: contain;
            position: absolute;

            &:hover {
                background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE5IDZWMjBDMTkgMjAuNTMwNCAxOC43ODkzIDIxLjAzOTEgMTguNDE0MiAyMS40MTQyQzE4LjAzOTEgMjEuNzg5MyAxNy41MzA0IDIyIDE3IDIySDdDNi40Njk1NyAyMiA1Ljk2MDg2IDIxLjc4OTMgNS41ODU3OSAyMS40MTQyQzUuMjEwNzEgMjEuMDM5MSA1IDIwLjUzMDQgNSAyMFY2TTggNlY0QzggMy40Njk1NyA4LjIxMDcxIDIuOTYwODYgOC41ODU3OSAyLjU4NTc5QzguOTYwODYgMi4yMTA3MSA5LjQ2OTU3IDIgMTAgMkgxNEMxNC41MzA0IDIgMTUuMDM5MSAyLjIxMDcxIDE1LjQxNDIgMi41ODU3OUMxNS43ODkzIDIuOTYwODYgMTYgMy40Njk1NyAxNiA0VjYiIGZpbGw9IiNENjQ2NkYiLz4KPHBhdGggZD0iTTE5IDZWMjBDMTkgMjAuNTMwNCAxOC43ODkzIDIxLjAzOTEgMTguNDE0MiAyMS40MTQyQzE4LjAzOTEgMjEuNzg5MyAxNy41MzA0IDIyIDE3IDIySDdDNi40Njk1NyAyMiA1Ljk2MDg2IDIxLjc4OTMgNS41ODU3OSAyMS40MTQyQzUuMjEwNzEgMjEuMDM5MSA1IDIwLjUzMDQgNSAyMFY2TTggNlY0QzggMy40Njk1NyA4LjIxMDcxIDIuOTYwODYgOC41ODU3OSAyLjU4NTc5QzguOTYwODYgMi4yMTA3MSA5LjQ2OTU3IDIgMTAgMkgxNEMxNC41MzA0IDIgMTUuMDM5MSAyLjIxMDcxIDE1LjQxNDIgMi41ODU3OUMxNS43ODkzIDIuOTYwODYgMTYgMy40Njk1NyAxNiA0VjYiIHN0cm9rZT0iI0Q2NDY2RiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPG1hc2sgaWQ9InBhdGgtMy1vdXRzaWRlLTFfMjc4XzEzNzMiIG1hc2tVbml0cz0idXNlclNwYWNlT25Vc2UiIHg9IjIiIHk9IjUiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyIiBmaWxsPSJibGFjayI+CjxyZWN0IGZpbGw9IndoaXRlIiB4PSIyIiB5PSI1IiB3aWR0aD0iMjAiIGhlaWdodD0iMiIvPgo8cGF0aCBkPSJNMyA2SDVIMjEiLz4KPC9tYXNrPgo8cGF0aCBkPSJNMyA2SDVIMjEiIGZpbGw9IiNENjQ2NkYiLz4KPHBhdGggZD0iTTMgNUMyLjQ0NzcyIDUgMiA1LjQ0NzcyIDIgNkMyIDYuNTUyMjggMi40NDc3MiA3IDMgN1Y1Wk0yMSA3QzIxLjU1MjMgNyAyMiA2LjU1MjI4IDIyIDZDMjIgNS40NDc3MiAyMS41NTIzIDUgMjEgNVY3Wk0zIDdINVY1SDNWN1pNNSA3SDIxVjVINVY3WiIgZmlsbD0id2hpdGUiIG1hc2s9InVybCgjcGF0aC0zLW91dHNpZGUtMV8yNzhfMTM3MykiLz4KPG1hc2sgaWQ9InBhdGgtNS1vdXRzaWRlLTJfMjc4XzEzNzMiIG1hc2tVbml0cz0idXNlclNwYWNlT25Vc2UiIHg9IjMiIHk9IjQiIHdpZHRoPSIxOCIgaGVpZ2h0PSIyIiBmaWxsPSJibGFjayI+CjxyZWN0IGZpbGw9IndoaXRlIiB4PSIzIiB5PSI0IiB3aWR0aD0iMTgiIGhlaWdodD0iMiIvPgo8cGF0aCBkPSJNNCA1TDUuNzc3NzggNUwyMCA1Ii8+CjwvbWFzaz4KPHBhdGggZD0iTTQgNUw1Ljc3Nzc4IDVMMjAgNSIgZmlsbD0iI0Q2NDY2RiIvPgo8cGF0aCBkPSJNNCA0QzMuNDQ3NzIgNCAzIDQuNDQ3NzIgMyA1QzMgNS41NTIyOCAzLjQ0NzcyIDYgNCA2TDQgNFpNMjAgNkMyMC41NTIzIDYgMjEgNS41NTIyOSAyMSA1QzIxIDQuNDQ3NzIgMjAuNTUyMyA0IDIwIDRMMjAgNlpNNCA2TDUuNzc3NzggNkw1Ljc3Nzc4IDRMNCA0TDQgNlpNNS43Nzc3OCA2TDIwIDZMMjAgNEw1Ljc3Nzc4IDRMNS43Nzc3OCA2WiIgZmlsbD0iI0Q2NDY2RiIgbWFzaz0idXJsKCNwYXRoLTUtb3V0c2lkZS0yXzI3OF8xMzczKSIvPgo8L3N2Zz4K');
            }
        }
        div.status {
            width: 10px;
            height: 10px;
            background-position: top right;
            background-repeat: no-repeat;
            background-size: contain;
            right: 20px;
            top: 20px;
        }
    `;

    static properties = {
      status: { type: Boolean },
      icon: { type: String },
      title: { type: String },
      subtitle: { type: String },
      acl: { type: String },
      description: { type: String },
      delete: { type: Boolean },
      onClick: { type: Function },
      onDelete: { type: Function },
    };
  
    constructor() {
        super()
        this.status = false
        this.icon = ''
        this.title = ''
        this.subtitle = ''
        this.acl = '*Editor'
        this.description = ''
        this.delete = false
        this.onClick = () => {}
        this.onDelete = () => {}
    }
  
    render() {
      return html`
        <sl-card>
            <section class="delete">
                <div class="status" style="background-color: ${this.status ? '#4CAF50' : '#F44336'}"></div>
            </section>
            <div class="main">
                <div class="icon">
                    <img src="${this.icon}" alt="${this.title}" />
                </div>
                <section class="titles">
                    <strong><text>${this.title}</text></strong>
                    <text class="medium">${this.subtitle}</text>
                </section>
            </div>
            <section class="description">
                <text class="medium">${this.description}</text>
            </section>
            <section class="delete">
                ${this.delete ? 
                    html`
                        <div class="delete"></div>
                    ` 
                    : 
                    ''
                }
            </section>
        </sl-card>
      `;
    }
  }
  
  customElements.define('lit-default-card', DefaultCard);
  
  export default DefaultCard