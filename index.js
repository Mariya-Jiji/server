const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();
console.log(process.env.MONGO_URI);
console.log(process.env.PORT);
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/providers', require('./routes/providers'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/tracking', require('./routes/tracking'));

const complaintsRoutes = require('./routes/complaints');
app.use('/api/complaints', complaintsRoutes);
app.get("/", (req, res) => {
  res.send("HomeEase backend is running 🚀");
});

app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);
//MONGO_URI=mongodb+srv://mariyajiji004_db_user:Mariya9745@cluster0.bexbonu.mongodb.net/?appName=Cluster0 
//JWT_SECRET=homeease_secret_key_2024 
//PORT=5000