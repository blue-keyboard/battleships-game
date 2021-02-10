document.addEventListener('DOMContentLoaded', () => {
    const userGrid = document.querySelector('.grid-user');
    const computerGrid = document.querySelector('.grid-computer');
    const displayGrid = document.querySelector('.grid-display');
    const ships = document.querySelectorAll('.ship');

    const destroyer = document.querySelector('.destroyer-container');
    const submarine = document.querySelector('.submarine-container');
    const cruiser = document.querySelector('.cruiser-container');
    const battleship = document.querySelector('.battleship-container');
    const carrier = document.querySelector('.carrier-container');

    const startButton = document.querySelector('#start');
    const rotateButton = document.querySelector('#rotate');
    const turnDisplay = document.querySelector('#whose-go');
    const infoDisplay = document.querySelector('#info');

    const singlePlayerButton = document.getElementById('single-player-button');
    const multiplayerButton = document.getElementById('multiplayer-button');

    const userSquares = [];
    const computerSquares = [];

    const width = 10;

    let isHorizontal = true;
    let isGameOver = false;
    let currentPlayer = 'user';

    const shipArray = [
        {
            name: 'destroyer',
            directions: [
                [0, 1],
                [0, width]
            ]
        },
        {
            name: 'submarine',
            directions: [
                [0, 1, 2],
                [0, width, width * 2]
            ]
        },
        {
            name: 'cruiser',
            directions: [
                [0, 1, 2],
                [0, width, width * 2]
            ]
        },
        {
            name: 'battleship',
            directions: [
                [0, 1, 2, 3],
                [0, width, width * 2, width * 3]
            ]
        },
        {
            name: 'carrier',
            directions: [
                [0, 1, 2, 3, 4],
                [0, width, width * 2, width * 3, width * 4]
            ]
        }
    ];

    // ! socketio implementation
    let gameMode = '';
    let playerNumber = 0;
    let ready = false;
    let enemyReady = false;
    let allShipsPlaced = false;
    let shotFired = -1;

    // Select Player Mode
    singlePlayerButton.addEventListener('click', startSinglePlayer)
    multiplayerButton.addEventListener('click', startMultiplayer)


    // Multiplayer function
    function startMultiplayer() {
        gameMode = 'multiplayer'

        // *1 Modifications (server.js)
        const socket = io();  // this comes from our script that loaded before in index.html

        //  Get your player number
        // we are listening to a transmission with the title 'player-number'
        // num here is the data we passed (playerIndex)
        socket.on('player-number', num => {
            if (num === -1) {
                infoDisplay.innerHTML = 'Sorry, the server is full'
            } else {
                playerNumber = parseInt(num) // idkw but socketio gives us a string
                if (playerNumber === 1) {
                    currentPlayer = 'enemy'
                }
                console.log(currentPlayer)

                // Get other player status
                socket.emit('check-players')
            }
        })

        // Another player has connected or disconected
        socket.on('player-connection', num => {
            console.log(`Player number ${num} has connected or disconnected`)
            playerConnectedOrDisconected(num)
        })

        // On enemy ready
        socket.on('enemy-ready', num => {
            enemyReady = true
            console.log('enemy ready')
            playerReady(num)
            if (ready) playGameMulti(socket)
        })

        // Check player status
        socket.on('check-players', players => {
            console.log('check-players: ', players)
            players.forEach((p, i) => {
                if (p.connected) playerConnectedOrDisconected(i)
                if (p.ready) {
                    playerReady(i)
                    if (i !== playerNumber) enemyReady = true
                }
            })
        })

        // On timeout
        socket.on('timeout', () => {
            infoDisplay.innerHTML = 'You have reached the 10 min limit'
        })

        // Ready Button Click
        startButton.addEventListener('click', () => {
            if (allShipsPlaced === true) playGameMulti(socket)
            else infoDisplay.innerHTML = 'Please, place all the ships'
        })


        // Set up event listeners for firing
        computerSquares.forEach(square => {
            square.addEventListener('click', () => {
                if (currentPlayer === 'user' && ready && enemyReady && !isGameOver) {
                    shotFired = square.dataset.id
                    socket.emit('fire', shotFired)
                }
            })
        })

        // On fire recieved by the enemy
        socket.on('fire', id => {
            enemyGo(id)
            const square = userSquares[id]
            socket.emit('fire-reply', square.classList)
            console.log('on fire recieved', socket)
            playGameMulti(socket)
        })

        // On fire-reply recieved
        socket.on('fire-reply', classList => {

            revealSquare(classList)
            playGameMulti(socket)
        })


        function playerConnectedOrDisconected(num) {
            let player = `.p${parseInt(num) + 1}` // p1, p2 the classes
            console.log(player)
            document.querySelector(`${player} .connected span`).classList.toggle('green')
            console.log(num, playerNumber)
            if (parseInt(num) === playerNumber) document.querySelector(player).style.fontWeight = 'bold'
        }
    }



    // Single player function
    function startSinglePlayer() {
        gameMode = 'singlePlayer'
        shipArray.forEach(ship => generate(ship));
        startButton.addEventListener('click', playGameSingle);
    }


    // Create Board
    function createBoard(grid, squares) {
        for (let i = 0; i < width * width; i++) {
            const square = document.createElement('div');
            square.dataset.id = i;
            grid.appendChild(square);
            squares.push(square);
        }
    }

    createBoard(userGrid, userSquares);
    createBoard(computerGrid, computerSquares);


    // Draw the computer ships in random locations

    function generate(ship) {
        let randomDirection = Math.floor(Math.random() * ship.directions.length);
        let current = ship.directions[randomDirection];
        if (randomDirection === 0) direction = 1;
        if (randomDirection === 1) direction = 10;

        let randomStart = Math.abs(Math.floor(Math.random() * computerSquares.length - (ship.directions[0].length * direction)));

        const isTaken = current.some(index => computerSquares[randomStart + index].classList.contains('taken'));
        const isAtRightEdge = current.some(index => (randomStart + index) % width === width - 1);
        const isAtLeftEdge = current.some(index => (randomStart + index) % width === 0);

        if (!isTaken && !isAtLeftEdge && !isAtRightEdge) {
            current.forEach(index => computerSquares[randomStart + index].classList.add('taken', ship.name));
        } else {
            generate(ship);
        }
    }

    // Rotate the ships
    function rotate() {
        ships.forEach(ship => {
            shipWidth = ship.offsetWidth;
            shipHeight = ship.offsetHeight;
            ship.style.width = shipHeight + 'px';
            ship.style.height = shipWidth + 'px';
            ship.classList.toggle('vertical');
            displayGrid.classList.toggle('col-wrap');
        })
        isHorizontal = !isHorizontal
    };

    rotateButton.addEventListener('click', rotate);

    // Drag user ships

    ships.forEach(ship => ship.addEventListener('dragstart', dragStart));
    userSquares.forEach(square => square.addEventListener('dragstart', dragStart));
    userSquares.forEach(square => square.addEventListener('dragover', dragOver));
    userSquares.forEach(square => square.addEventListener('dragenter', dragEnter));
    userSquares.forEach(square => square.addEventListener('dragleave', dragLeave));
    userSquares.forEach(square => square.addEventListener('drop', dragDrop));
    userSquares.forEach(square => square.addEventListener('dragend', dragEnd));

    let selectedShipNameWithIndex;
    let draggedShip;
    let draggedShipLength;

    ships.forEach(ship => ship.addEventListener('mousedown', e => {
        selectedShipNameWithIndex = e.target.id;
    }))

    function dragStart(e) {
        draggedShip = this;
        // draggedShipLength = parseInt((draggedShip.lastElementChild.id).slice(-1)) + 1;
        draggedShipLength = draggedShip.children.length
    };

    function dragOver(e) {
        e.preventDefault();
    };

    function dragEnter(e) {
        e.preventDefault();
    };

    function dragLeave() {

    };

    function dragDrop() {
        let shipNameWithLastId = draggedShip.lastElementChild.id;
        let shipClass = shipNameWithLastId.slice(0, -2);

        let lastShipIndex = parseInt(shipNameWithLastId.substr(-1))
        let selectedShipIndex = parseInt(selectedShipNameWithIndex.substr(-1));
        let shipLastId = lastShipIndex - selectedShipIndex + parseInt(this.dataset.id);

        if (isHorizontal) {
            // Check if theres gonna be a ship in the way and if its gonna be outside the edge

            if (parseInt(shipLastId.toString().substr(-1)) - draggedShipLength + 1 < 0) {
                return
            }

            for (let j = 0; j < draggedShipLength; j++) {
                if (userSquares[parseInt(this.dataset.id) - selectedShipIndex + j].classList.contains('taken')) {
                    return
                }
            }

            // put the ship
            for (let i = 0; i < draggedShipLength; i++) {
                userSquares[parseInt(this.dataset.id) - selectedShipIndex + i].classList.add('taken', shipClass)
            }

        } else {
            // Check if theres gonna be a ship in the way, also if its at edge it will return becouse it cant read if the userSquare contains 'taken'
            for (let j = 0; j < draggedShipLength; j++) {
                if (userSquares[parseInt(this.dataset.id) - selectedShipIndex * width + j * width].classList.contains('taken')) {
                    return
                }
            }
            // put the ship
            for (let i = 0; i < draggedShipLength; i++) {
                userSquares[parseInt(this.dataset.id) - selectedShipIndex * width + i * width].classList.add('taken', shipClass)
            }
        }

        displayGrid.removeChild(draggedShip)

        if (!displayGrid.querySelector('.ship')) allShipsPlaced = true;


    };

    function dragEnd() {

    };


    // Game Logic for Multiplayer
    function playGameMulti(socket) {
        if (isGameOver) return

        if (!ready) {
            socket.emit('player-ready')
            ready = true
            playerReady(playerNumber)
        }

        if (enemyReady) {
            if (currentPlayer === 'user') {
                turnDisplay.innerHTML = 'Your Go'
            } else if (currentPlayer === 'enemy') {
                turnDisplay.innerHTML = "Enemy's Go"
            }
        }
    }

    function playerReady(num) {
        let player = `.p${parseInt(num) + 1}`
        document.querySelector(`${player} .ready span`).classList.toggle('green')
    }



    // Game Logic for Single Player
    function playGameSingle() {

        checkForWins();

        if (isGameOver) return

        if (currentPlayer === 'user' && !isGameOver) {
            computerSquares.forEach(square => square.addEventListener('click', () => {
                shotFired = square.dataset.id
                revealSquare(square.classList);
            }));
        }


        if (currentPlayer === 'enemy') {
            turnDisplay.innerHTML = 'Computers Go';
            setTimeout(enemyGo, 1000)
            currentPlayer = 'user';
        }

    }



    let destroyerCount = 0;
    let submarineCount = 0;
    let cruiserCount = 0;
    let battleshipCount = 0;
    let carrierCount = 0;

    function revealSquare(classList) {
        const enemySquare = computerGrid.querySelector(`div[data-id="${shotFired}"]`)
        const obj = Object.values(classList)
        console.log(obj)

        if (!enemySquare.classList.contains('boom') && currentPlayer === 'user' && !isGameOver) {
            if (obj.includes('destroyer')) destroyerCount++;
            if (obj.includes('submarine')) submarineCount++;
            if (obj.includes('cruiser')) cruiserCount++;
            if (obj.includes('battleship')) battleshipCount++;
            if (obj.includes('carrier')) carrierCount++;
        }

        if (obj.includes('taken')) {
            enemySquare.classList.add('boom');
        } else {
            enemySquare.classList.add('miss');
        }
        checkForWins()
        currentPlayer = 'enemy';
        if (gameMode === 'singlePlayer') playGameSingle();
    }

    let cpuDestroyerCount = 0;
    let cpuSubmarineCount = 0;
    let cpuCruiserCount = 0;
    let cpuBattleshipCount = 0;
    let cpuCarrierCount = 0;

    function enemyGo(square) {
        if (gameMode === 'singlePlayer') square = Math.floor(Math.random() * userSquares.length)

        if (userSquares[square].classList.contains('taken')) {

            if (!userSquares[square].classList.contains('boom')) {
                userSquares[square].classList.add('boom');
                if (userSquares[square].classList.contains('destroyer')) cpuDestroyerCount++;
                if (userSquares[square].classList.contains('submarine')) cpuSubmarineCount++;
                if (userSquares[square].classList.contains('cruiser')) cpuCruiserCount++;
                if (userSquares[square].classList.contains('battleship')) cpuBattleshipCount++;
                if (userSquares[square].classList.contains('carrier')) cpuCarrierCount++;
                checkForWins()

            } else if (gameMode === 'singlePlayer') {
                enemyGo();
            }

        } else {
            if (!userSquares[square].classList.contains('miss')) {
                userSquares[square].classList.add('miss');
            } else if (gameMode === 'singlePlayer') {
                enemyGo();
            }
        }
        if (gameMode === 'multiplayer') currentPlayer = 'user';
        turnDisplay.innerHTML = 'Your Go';
    }

    function checkForWins() {
        let enemy = 'computer'
        if (gameMode === 'multiplayer') enemy = 'enemy'

        if (destroyerCount === 2) {
            infoDisplay.innerHTML = `You sunk the ${enemy}'s destroyer`;
            destroyerCount = 10;
        }
        if (cruiserCount === 3) {
            infoDisplay.innerHTML = `You sunk the ${enemy}'s cruiser`;
            cruiserCount = 10;
        }
        if (submarineCount === 3) {
            infoDisplay.innerHTML = `You sunk the ${enemy}'s submarine`;
            submarineCount = 10;
        }
        if (battleshipCount === 4) {
            infoDisplay.innerHTML = `You sunk the ${enemy}'s battleship`;
            battleshipCount = 10;
        }
        if (carrierCount === 5) {
            infoDisplay.innerHTML = `You sunk the ${enemy}'s carrier`;
            carrierCount = 10;
        }

        if (cpuDestroyerCount === 2) {
            infoDisplay.innerHTML = `${enemy} sunk your destroyer`;
            cpuDestroyerCount = 10;
        }
        if (cpuSubmarineCount === 3) {
            infoDisplay.innerHTML = `${enemy} sunk your submarine`;
            cpuSubmarineCount = 10;
        }
        if (cpuCruiserCount === 3) {
            infoDisplay.innerHTML = `${enemy} sunk your cruiser`;
            cpuCruiserCount = 10;
        }
        if (cpuBattleshipCount === 4) {
            infoDisplay.innerHTML = `${enemy} sunk your battleship`;
            cpuBattleshipCount = 10;
        }
        if (cpuCarrierCount === 5) {
            infoDisplay.innerHTML = `${enemy} sunk your carrier`;
            cpuCarrierCount = 10;
        }


        if (destroyerCount + submarineCount + cruiserCount + battleshipCount + carrierCount === 50) {
            infoDisplay.innerHTML = 'YOU WON!';
            // turnDisplay.innerHTML = '';
            gameOver()
        }
        if (cpuDestroyerCount + cpuSubmarineCount + cpuCruiserCount + cpuBattleshipCount + cpuCarrierCount === 50) {
            infoDisplay.innerHTML = `${enemy.toUpperCase()} WON`;
            // turnDisplay.innerHTML = '';
            gameOver();
        }
    }

    function gameOver() {
        isGameOver = true
        startButton.removeEventListener('click', playGameSingle);
        startButton.removeEventListener('click', playGameMulti);
    }
});