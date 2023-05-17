const mongoose = require('mongoose');

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
    date: {
        type: Date,
        default: Date.now
    },
    novelasPublicadas:[],
    novelasSeguidas:[]
})

module.exports = mongoose.model('Usuario', usuarioSchema);