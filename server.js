require('dotenv').config()

const express = require('express');
const fileUpload = require("express-fileupload")
const compression = require('compression')
const mongoose = require("mongoose");
const cors = require("cors")
const userRoutes = require('./routes/user')
const walletRoutes = require('./routes/wallet')
const path = require("path");

mongoose.set('strictQuery', true);
// express app
const app = express();
//compression
app.use(compression());
// cors settings
app.use(
  cors({
    origin: ["http://localhost:3000", "https://shara-app.vercel.app", "https://shara.onrender.com"],
    credentials: true,
  })
);
app.use(express.json());
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: path.join(__dirname, 'tmp'),
  createParentPath: true,
}))


// //connect database
mongoose.connect(process.env.MDB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology : true
})
.then(()=> {
    app.listen(process.env.PORT, () => {
        console.log('connected to database successfully and listening on port', process.env.PORT);
        console.log("Welcome to shara-api")
    })
})
.catch((err) => console.log(err));





////use static for csss and other files
app.use(express.static('public'))
app.use("/uploads", express.static('./uploads'))

app.get("/", (req, res) => {
  res.sendFile('./views/index.html', {root : __dirname});
});

// // users routes
app.use("/user", userRoutes)

// // users routes
app.use("/wallet", walletRoutes)


// // user profile
app.post('/user/profile', async (req, res) => {
  const {name, phone, email, address} = JSON.parse(req.body.user)
  try {
    const image = req.files.image
      const fileName =  new Date().getTime().toString() + path.extname(image.name);
      const savePath = path.join(__dirname, "public", "uploads", fileName);
      await image.mv(savePath)

      res.status(200).json({ message : "image upload Successfully"})
    } catch (error) {
        res.status(404).json({error: error.message})
    }
})


// 404 page
app.use( (req, res) =>{
    res.status(404).sendFile('./views/404.html', {root : __dirname});
})



