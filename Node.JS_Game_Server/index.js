var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

server.listen(3000);

// 서버에서 사용할 전역 변수
var enmies = [];
var playerSpawnPoints = [];
var clients = [];

app.get('/', function (req, res) {
    //res.send('hey you get back get "/"');
    res.send('Welcome To RaMaNet Node.JS WebServer :)');
});

io.on('connection', function (socket) {

    var currentPlayer = {};
    currentPlayer.name = "Unknown";

    socket.on('player connect', function () {
        console.log(currentPlayer.name + ' recv : Player Connect');

        for (var i = 0; i < clients.length; i++) {
            var playerConnected = {
                name:clients[i].name,
                position:clients[i].position,
                rotation:clients[i].rotation,
                health:clients[i].health
            };


            // 접속하면 다른 플레이어들에게 알려줍니다
            socket.emit('other player connected', playerConnected);
            console.log(currentPlayer.name + ' emit : other player connected ' + JSON.stringify(playerConnected));
        }

    });

    //socket.emit('message', { hello: 'world' });
    //socket.on('message', function (data) {
    //    console.log(data);
    //});

    socket.on('play', function (data) {
        console.log(currentPlayer.name + ' recv : play : ' + JSON.stringify(data));

        // 가장 첫번째 플레이어가 들어오면 게임을 초기화 시켜준다.
        if (clients.length == 0) {
            numberofEnemies = data.enemySpawnPoints.length;
            enemies = [];

            data.enemySpawnPoints.forEach(function (enemySpawnpoint) {
                var enemy = {
                    name: guid(),
                    position: enemySpawnpoint.position,
                    rotation: enemySpawnpoint.rotation,
                    health: 100
                };

                enemies.push(enemy);

            });

            playerSpawnPoints = [];
            data.playerSpawnPoints.forEach(function (_playerSpawnPoints) {
                var playerSpawnPoint = {
                    position: _playerSpawnPoints.position,
                    rotation: _playerSpawnPoints.rotation
                };

                playerSpawnPoints.push(playerSpawnPoint);
            });
        }

        var enemiesResponse = {
            enemies: enemies
        };

        // 새로 들어오면 모든 사람들에게 접속했다는 사실을 통보해준다.
        console.log(currentPlayer.name + ' emit: enemies : ' + JSON.stringify(enemiesResponse));

        socket.emit('enemies', enemiesResponse);
        var randomSpwanPoint = playerSpawnPoints[Math.floor(Math.random() * playerSpawnPoints.length)];

        currentPlayer = {
            name: data.name,
            position: randomSpwanPoint.position,
            rotation: randomSpwanPoint.rotation,
            health: 100
        };

        clients.push(currentPlayer);

        // 현재 게임을 하고 있다면 조인(Join) 햇다는 사실을 알려준다.
        console.log(currentPlayer.name + ' emit : play: ' + JSON.stringify(currentPlayer));

        socket.emit('play', currentPlayer);

        // 현재 게임을 하고 있다면 다른 상대방 플레이어들에게 나를 알려준다.
        socket.broadcast.emit('other player connected', currentPlayer);
    });

    socket.on('player move', function (data) {
        console.log('recv : move : ' + JSON.stringify(data));
        currentPlayer.position = data.position;
        socket.broadcast.emit('player move', currentPlayer);
    });

    socket.on('player turn', function(data) {
        console.log('recv : turn : ' + JSON.stringify(data));
        currentPlayer.rotation = data.rotation;
        socket.broadcast.emit('player turn', currentPlayer);
    });

    socket.on('player shoot', function () {
        console.log(currentPlayer.name + ' recv : shoot');

        var data = {
            name: currentPlayer.name
        };

        console.log(currentPlayer.name + ' bcst : shoot : ' + JSON.stringify(data));

        socket.emit('player shoot', data);
        socket.broadcast.emit('player shoot', data);
    });

    socket.on('health', function (data) {
        console.log(currentPlayer.name + ' recv : health : ' + JSON.stringify(data));

        // 체력이 변경될때만 체크 한다.
        if (data.from == currentPlayer.name) {
            var IndexDameged = 0;

            if (data.isEnemy != true) {
                clients = clients.map(function (client, index) {
                    if (client.name == data.name) {
                        IndexDameged = index;
                        client.health -= data.healthChange;
                    }

                    return client;
                });
            }
            else {
                enemies = enemies.map(function (enemy, index) {
                    if (enemy.name == data.name) {
                        IndexDameged = index;
                        enemy.health -= data.healthChange;
                    }

                    return enemy;
                });
            }

            var response = {
                name: (!data.isEnemy) ? clients[IndexDameged].name : enemies[IndexDameged].name,
                health: (!data.isEnemy) ? clients[IndexDameged].health : enemies[IndexDameged].health
            };



            console.log(currentPlayer.name + ' bcst : health : ' + JSON.stringify(response));
            socket.emit('health', response);
            socket.broadcast.emit('health', response);
        }

    });

    socket.on('disconnect', function () {
        console.log(currentPlayer.name + 'recv : disconnect ' + currentPlayer.name);
        socket.broadcast.emit('other player disconnected', currentPlayer);
        console.log(currentPlayer.name + ' bcst : other player disconnected ' + JSON.stringify(currentPlayer));

        for (var i = 0; i < clients.length; i++) {
            if (clients[i].name == currentPlayer.name) {
                clients.splice(i, 1);
            }
        }
    });
});

console.log("=== server is running...");

function guid() {
    function s4() {
        return Math.floor(1 + Math.random() * 0x1000).toString(16).substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
