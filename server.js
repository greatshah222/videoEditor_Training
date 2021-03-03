const dotenv = require('dotenv');

const app = require('./app');

const port = process.env.PORT || 9000;

app.listen(port, () => {
  console.log(`App Running on port ${port}`);
});
