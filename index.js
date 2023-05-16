const express = require('express');
const mongoose = require('mongoose');
const bodyparser = require('body-parser');
require('dotenv').config()

const app = express();

// capturar body
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());

// Conexión a Base de datos
const uri = `mongodb+srv://${process.env.USUARIO}:${process.env.PASSWORD}@clusterlibreria.aspnvjh.mongodb.net/${process.env.DBNOMBRE}?retryWrites=true&w=majority`;
const opciones = { useNewUrlParser: true, useUnifiedTopology: true };
mongoose.connect(uri, opciones)
.then(() => console.log('Base de datos conectada'))
.catch(e => console.log('error db:', e))

// importar rutas
const authRutas = require('./rutas/auth');
const pruebaProteccionRutas = require('./rutas/pruebaProteccion');
const validarToken = require('./rutas/validarToken');

// route middlewares
app.use('/api/usuario', authRutas);
app.use('/api/pruebaProc', validarToken, pruebaProteccionRutas);

app.get('/', (req, res) => {
    res.json({
        estado: true,
        mensaje: 'funciona!'
    })
});

// iniciar server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor abierto en el puerto: ${PORT}`)
})