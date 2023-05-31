const mongoose = require('mongoose');
const paginacion = require('mongoose-paginate-v2');
const novelaSchema = mongoose.Schema({
    nicknameAutor:{
        type: String,
        required: true,
        min: 6,
        max: 255
    },
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
    generos:{
        type: Array,
        default: []
    },
    etiquetas:{
        type: Array,
        default: []
    },
    fechaCreacion: {
        type: Date,
        default: Date.now
    },
    capitulos: {
        type: [
            {
                numero: Number,
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
    },
    visitas:{
        type: Number,
        default: 0
    }
})

novelaSchema.plugin(paginacion);
module.exports = mongoose.model('Novela', novelaSchema);