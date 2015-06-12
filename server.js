/*
 * Nodejs server for handling emotion wheel and dial testing
 *
 * Andy Brown.
 * andy.brown01@bbc.co.uk
 * BBC R&D. June 2015
 *
 */

var app = require('http').createServer(handler)
    , io = require('socket.io').listen(app);
var fs = require('fs')
  , exec = require('child_process').exec;
var path = require('path');
var url = require("url");

var users = {};

var playingClip = false; // are we playing a proper clip?

app.listen(8002, "0.0.0.0");
console.log("listening");

var logFile = "./bbc.log";  // path is relative to where the command
                            // node path/server.js is given from


function handler (req, response) {
        _url = url.parse(req.url, true);
        // console.log(_url);
        // console.log(url.parse(req.url, true));
        var loadFile =  '';
		var pathname = __dirname + _url.pathname;
		var extname = path.extname(pathname);
        if(_url.pathname == '/dial'){
                loadFile = '/dial.html';
        }
        else if(_url.pathname === '/wheel'){
                loadFile = '/emotion.html';
        }
        else if(_url.pathname == '/remote' || _url.pathname == '/control'){
                loadFile = '/control.html';
        }
        else if(_url.pathname === '/start'){
                loadFile = '/start.html';
        }
        else{
                loadFile = _url.pathname;
        }
        console.log('reading file ' + loadFile);
        // fs.readFile(__dirname + '/index.html',
         fs.readFile(__dirname + loadFile,
           function (err, data) {
    if (err) {
            console.log(err);
      response.writeHead(500);
      return response.end('Error loading ' + req.url);
    }

    response.writeHead(200);//, {'Content-Type': contentType});
    response.end(data);
    });
}

// listen for commands from control page
io.sockets.on('connection', function (socket) {

    // move to static
    // pass on requests to all clients
    socket.on('static', function (data) {
            // if there is a pid, find out guid:
            if(data.pid){
                var gid = null;
                for (var key in users) {
                   if (users.hasOwnProperty(key)) {
                       var obj = users[key];
                       if(obj === data.pid){
                           gid = key;
                       }
                    }
                }
                console.log(data.pid + " is " + gid );
                data.guid = gid;
            }

            // broadcast change - only those with correct guid will respond
            console.log("changing page to" + data.url);
            log("loading static page index: " + data.url);
            socket.broadcast.emit('static', data);
        });

    // guid wanted
    socket.on('guid', function (data) {
        var guid = generateGuid();
        socket.emit('guid', { "value": guid });
    });

    // start
    socket.on('start', function (data) {
        console.log(data.pid + " is " + data.guid);
        var user = data.guid;
        users[user] = data.pid;
        socket.emit('static', data);
        console.log(users);
    });


    // received data - store
    socket.on('dial', function (data) {
            var user = users[data.guid];
            log(user + " dial data: " + data.time + " - " + data.value);
        });

    socket.on('wheel', function (data) {
        var user = users[data.guid];
            log(user + " wheel data: " + data.time + " - " + data.result);
            // move back to dial
            socket.emit('static', { "url": "/dial", "guid": data.guid });
        });


        // log something
        function log(message){
            var timestamp = new Date().getTime();
            var logEntry = timestamp + " " + message + "\n";
            console.log("log: " + logEntry);

            var log = fs.createWriteStream(logFile, {'flags': 'a'});
            log.write(logEntry);
        /*
          // newer version of node.js uses appendFile:
            fs.appendFile("/home/andy/bbc.log", logEntry, function(err) {
                    if(err) {
                        console.log(err);
                    } else {
                        console.log("The file was saved!");
                    }
                });
        */
        }
    });

// guid generator
function generateGuid() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}
function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}
