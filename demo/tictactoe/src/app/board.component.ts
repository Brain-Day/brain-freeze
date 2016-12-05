import { Component, OnInit } from '@angular/core';
import { StoreService } from './store.service';

@Component({
    selector: 'board',
    template: `
    <div id="header"><h1>Tic Tac Toe</h1></div>
    <square
      class="square"
      *ngFor="let square of squares; let i = index"
      [id]="i"
      (click)="go(i)"
    ></square>
  `,
    styles: [`
    #header {
        text-align: center;
        margin-bottom: 50px;
    }
    .square {
        padding: 0;
        margin: 0;
        border: 1px solid black;
        display: inline-block;
        width: 250px;
        height: 250px;
        font-size: 70px;
        background-color: beige;
        text-align: center;
        vertical-align: center;
    }
    p {
        margin: auto;
    }
  `]
})

export class BoardComponent implements OnInit {
    private squares: string[];
    constructor(private store: StoreService) { }
    go(id: number): void { this.store.dispatch({ type: 'GO', id: id, turn: this.store.getState()['turn'] }) }
    ngOnInit(): void {

        const turn = (state: String, action: Object): String => {
            if (!state) return 'X'
            switch (action['type']) {
                case 'SWITCH':
                    return state === 'X' ? 'O' : 'X'
                default:
                    return state
            }
        }

        const board = (state: String[], action: Object): String[] => {
            if (!state) return [
                    '-', '-', '-',
                    '-', '-', '-',
                    '-', '-', '-'
                ]
            switch (action['type']) {
                case 'GO':
                    state[action['id']] = action['turn']
                    return state
                default:
                    return state
            }
        }

        const winner = (state: String, action: Object): String => {
            switch (action['type']) {
                case 'WIN':
                    console.log("WIN!!!")
                    return action['player']
                default:
                    return ''
            }
        }
        this.store.dispatch({ devMode: false })
        this.store.combineReducers({
            turn,
            board,
            winner
        })

        this.squares = this.store.getState()['board']

        const unsub = this.store.subscribe((winningPlayer): void => {
            // End game if we have a winner
            this.store.dispatch({ lockState: true })
            const winStyles = [
                'background: linear-gradient(#FF0000, #FFBB66)'
                , 'border: 1px solid #3E0E02'
                , 'color: white'
                , 'display: block'
                , 'text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3)'
                , 'box-shadow: 0 1px 0 rgba(255, 255, 255, 0.4) inset, 0 5px 3px -5px rgba(0, 0, 0, 0.5), 0 -13px 5px -10px rgba(255, 255, 255, 0.4) inset'
                , 'line-height: 40px'
                , 'text-align: center'
                , 'font-weight: bold'
            ].join(';')
            const msg = winningPlayer === 'X' ? `Player X won!!!` : `Player O won!!!`
            console.log('%c' + `${msg}`, winStyles)
            document.getElementById('header').innerHTML = `<h1>${msg}</h1>`
            unsub()
        }, `winner`)

    }
}
