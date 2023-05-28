const router = require('express').Router();
const Novela = require('../modelos/Novela');
const validarToken = require('./validarToken');

// Validaciones con @hapy/joi
const Joi = require('@hapi/joi');

const schemaNovela = Joi.object({
    titulo: Joi.string().min(6).max(255).required(),
    descripcion: Joi.string().min(6).required(),
    generos: Joi.array().items(Joi.string()),
    etiquetas: Joi.array().items(Joi.string())
})

const schemaCapitulo = Joi.object({
    titulo: Joi.string().min(6).max(255).required(),
    contenido: Joi.string().required()
})

router.post('/nueva', validarToken, async (req, res) => {

    // Validar Novela
    const { error } = schemaNovela.validate(req.body)
    if (error) {
        return res.status(400).json(
            { error: error.details[0].message }
        )
    }

    // Validar titulo único 
    const tituloExiste = await Novela.findOne({ titulo: req.body.titulo });
    if (tituloExiste) {
        return res.status(400).json(
            { error: 'El titulo no está disponible' }
        )
    }

    const novela = new Novela({
        nicknameAutor: req.usuario.nickname,
        titulo: req.body.titulo,
        descripcion: req.body.descripcion,
        generos: req.body.generos,
        etiquetas: req.body.etiquetas
    });
    try {
        const novelaGuardada = await novela.save();
        res.json({
            error: null,
            data: novelaGuardada
        })
    } catch (error) {
        res.status(400).json({ error })
        return;
    }
})

router.get('/', async (req, res) => {
    let opciones = {};
    opciones.pagina = req.params.pagina || 1;
    opciones.limite = req.params.limite || 25;
    let busqueda = {};
    busqueda.genero = req.params.genero || '';
    busqueda.etiqueta = req.params.etiqueta || '';
    const novelas = await Novela.paginate(busqueda,opciones)

    if (!novelas) {
        return res.status(400).json(
            { error: 'No existe el usuario' }
        )
    }
    return res.status(200).json(
        { novelas: novelas }
    )
})

router.get('/', async (req, res) => {

    let usuarios = await Usuario.find();
    if (!usuarios) {
        return res.status(400).json(
            { error: 'No hay usuarios' }
        )
    }
    return res.status(200).json(
        { listaUsuarios: usuarios }
    )

})

module.exports = router;