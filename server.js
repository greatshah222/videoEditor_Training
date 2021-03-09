const dotenv = require('dotenv');
const path = require('path');

process.on('uncaughtException', (err) => {
  console.log(err);
  // console.log(err.stack);
  console.log(err.name, err.message);
  console.log('UNCAUGHT EXCEPTION! 💣 Shutting Down....');
  process.exit(1);
});

dotenv.config({ path: './config.env' });
console.log(process.env.PORT);

const app = require('./app');

const port = 9000;

const server = app.listen(port, () => {
  console.log(`App Running on port ${port}`);
});

process.on('unhandledRejection', (err) => {
  console.log(err);
  // we get bad auth and Authentication failed as our console.log(err.name,err.message)
  console.log(err.name, err.message);
  // shutting down the application
  // code 0 is for success and code 1 is for uncalled exception
  console.log('UNHANDLER REJECTION! 💣 Shutting Down....');
  // we can close the app by using process.exit(1) but it is bad way s o shutting it grace
  // process.exit(1);
  // here we give time to the server to finish its request and then close
  // it is helpful in real-world
  server.close(() => {
    process.exit(1);
  });
});
