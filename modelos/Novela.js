const mongoose = require('mongoose');

const novelaSchema = mongoose.Schema({
    titulo: {
        type: String,
        required: true,
        min: 6,
        max: 255
    },
    descripcion: {
        type: String,
        required: true,
        min: 6,
        max: 1024
    },
    date: {
        type: Date,
        default: Date.now
    },
    capitulos: {
        type: [
            {
                titulo: String,
                contenido: String
            }
        ]
    },
    puntuacion: {
        type: Number,
        default: 0
    },
    valoraciones: {
        type: Array,
        default: []
    }
})

module.exports = mongoose.model('Novela', novelaSchema);