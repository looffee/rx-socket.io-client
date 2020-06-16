const path = require('path')
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

app
  .get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'));
  })
  .get('/dist/index.js', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../dist/index.js'));
  });

http.listen(3000, () => {
  console.log('Server is listening on localhost:3000');
});
