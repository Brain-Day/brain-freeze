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
                    if (state.winner || state.board[action.id] !== '-') break
                    state.board[action.id] = state.turn
                    if (winningCombos[action.id].some(e => e.every(i => state.board[i] === state.turn))) state.winner = state.turn
                    else state.turn = state.turn === 'X' ? 'O' : 'X'
                    break
                default:
                    break
            }
            // Returning state
            return state
        });
        this.squares = this.store.getState()['board'];
        this.store.subscribe(() => {
            if (!this.store.getState()['winner']) return
            this.store.dispatch({ lock: true })
            const msg = this.store.getState()['winner'] === 'X' ? `Sexy Eyes won!!!` : `Dean Code won!!!`
            console.log(msg)
            document.getElementById('header').innerHTML = `<h1>${msg}</h1>`
        });
    }
}
