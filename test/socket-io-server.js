const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

io.on('connection', (socket) => {
  socket.on('data', (data, callback) => {
    callback(data);
    socket.emit('data', data);
  });

  socket.on('exit', () => {
    process.exit(0);
  });
});

http.listen(3000, () => {
  console.log('Server is listening on ws://localhost:3000');
});
// TODO
