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
    go(id: number): void { this.store.dispatch({ type: 'GO', id: id }) }
    ngOnInit(): void {
        this.store.addReducer((state, action) => {
            // Initial state
            if (!state) {
                return {
                    turn: 'X',
                    board: [
                        '-', '-', '-',
                        '-', '-', '-',
                        '-', '-', '-'
                    ],
                    winner: ''
                }
            }

            const winningCombos = {
                0: [[1, 2], [3, 6], [4, 8]],
                1: [[0, 2], [4, 7]],
                2: [[0, 1], [4, 6], [5, 8]],
                3: [[0, 6], [4, 5]],
                4: [[0, 8], [1, 7], [2, 6]],
                5: [[2, 8], [3, 4]],
                6: [[0, 3], [2, 4], [7, 8]],
                7: [[1, 4], [6, 8]],
                8: [[0, 4], [2, 5], [6, 7]]
            }

            // Possible commands for StoreService.dispatch to use
            switch (action.type) {
                case 'GO':
                    if (!state.winner) state.board[action.id] = state.turn
                    break
                case 'SWITCH':
                    state.turn = state.turn === 'X' ? 'O' : 'X'
                    break
                case 'CHECK_WIN':
                    if (winningCombos[action.id].some(e => e.every(i => state.board[i] === state.turn))) state.winner = state.turn
                    break
                default:
                    break
            }
            // Returning state
            return state
        });
        this.squares = this.store.getState()['board']
        this.store.subscribe(() => {
            // End game if we have a winner
            if (!this.store.getState()['winner']) return
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
            const msg = this.store.getState()['winner'] === 'X' ? `Player X won!!!` : `Player O won!!!`
            console.log('%c' + `${msg}`, winStyles)
            document.getElementById('header').innerHTML = `<h1>${msg}</h1>`
        })
    }
}
