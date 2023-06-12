const express = require('express');
const mongoose = require('mongoose');
const bodyparser = require('body-parser');
const multer = require('multer');
const mime = require('mime-types');
const path = require('path');
const cors = require('cors')
require('dotenv').config()

const app = express();

// capturar body
app.use(bodyparser.urlencoded({ extended: false, limit : '10MB' }));
app.use(bodyparser.json());
app.use(cors({
    origin: 'http://localhost:4200'
}))
// Conexión a Base de datos
const uri = `mongodb+srv://${process.env.USUARIO}:${process.env.PASSWORD}@clusterlibreria.aspnvjh.mongodb.net/${process.env.DBNOMBRE}?retryWrites=true&w=majority`;
const opciones = { useNewUrlParser: true, useUnifiedTopology: true };
mongoose.connect(uri, opciones)
.then(() => console.log('Base de datos conectada'))
.catch(e => console.log('error db:', e))

const subidaImagenes = multer({
    storage: multer.memoryStorage({
        destination: function (req, archivo, cb) {
            if (!fs.existsSync('public/img')){
                fs.mkdirSync('public/img', { recursive: true });
            }
            cb(null, 'public/img')
        },
        filename: function (req, archivo, cb) {
            const extensionArchivo = mime.extension(archivo.mimetype);
            cb(null, archivo.originalname.split(extensionArchivo)[0] + '-' + Date.now() + '.' + extensionArchivo);
        }
    }),
    fileFilter: function (req, archivo, cb) {
        if (['image/jpeg', 'image/png', 'image/jpg'].includes(archivo.mimetype)) {
            cb(null, true);
        }else{
            req.errorExtension = 'Error al subir la imagen, solo se aceptan ficheros html';
            cb(null,false);
        }
    },
    limits: {
        fieldSize: 1000000
    }
});

app.use(subidaImagenes.single('imagen'));
//Abrimos el acceso a imagenes desde front
app.use('/public',express.static(path.join(__dirname, '/public')));
// app.use(express.static('public'));

// importar rutas
const authRutas = require('./rutas/auth');
const usuarioRutas = require('./rutas/usuario');
const novelaRutas = require('./rutas/novela');
const validarToken = require('./rutas/validarToken');

// Middleware de rutas
app.use('/api/auth', authRutas);
app.use('/api/usuario', usuarioRutas);
app.use('/api/novela', novelaRutas);

// Iniciar server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor abierto en el puerto: ${PORT}`)
})