const mongoose = require('mongoose');
const paginacion = require('mongoose-paginate-v2');
const usuarioSchema = mongoose.Schema({
    nickname: {
        type: String,
        required: true,
        min: 6,
        max: 255
    },
    email: {
        type: String,
        required: true,
        min: 6,
        max: 1024
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    fechaCreacion: {
        type: Date,
        default: Date.now
    },
    rol: {
        type: String,
        default: 'Usuario'
    },
    novelasPublicadas: {
        type: Array,
        default: []
    },
    novelasSeguidas: {
        type: Array,
        default: []
    }
})
usuarioSchema.plugin(paginacion);
module.exports = mongoose.model('Usuario', usuarioSchema);