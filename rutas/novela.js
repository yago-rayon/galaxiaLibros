const router = require('express').Router();
const Novela = require('../modelos/Novela');
const Usuario = require('../modelos/Usuario');
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

    if (req.usuario.rol && req.usuario.rol != 'Usuario' && req.usuario.rol != 'Admin'){
        return res.status(401).json({ error: 'No tienes permisos para crear una novela.' })
    }

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
        const novelaPublicada = { novela_id: novelaGuardada._id, titulo : novelaGuardada.titulo, descripcion : novelaGuardada.descripcion, fechaCreacion: novelaGuardada.fechaCreacion }
        if (req.usuario.email){
            Usuario.findOneAndUpdate(
                { email : req.usuario.email },
                { $push: { novelasPublicadas: novelaPublicada } }
                );
        }else{
            res.status(400).json({ error: 'Error al publicar novela' })
        }
        res.json({
            error: null,
            data: novelaGuardada
        })
    } catch (error) {
        res.status(400).json({ error: 'Error aqui' })
        return;
    }
})

router.get('/', async (req, res) => {
    
    let opciones = {};
    opciones.page = req.query.pagina || 1;
    opciones.limit = req.query.limite || 25;
    if(req.query.ordenar){
        const direccion = req.query.direccion || "desc";
        opciones.sort={};
        opciones.sort[req.query.ordenar]= direccion;
    }
    let busqueda = {};
    if(req.query.genero){
        busqueda.generos = req.query.genero.split(',');
    }
    if(req.query.etiqueta){
        busqueda.etiquetas = req.query.etiqueta;
    }
    console.log(opciones);
    const novelas = await Novela.paginate(busqueda,opciones)

    if (!novelas) {
        return res.status(400).json(
            { error: 'No hay datos para esta búsqueda' }
        )
    }
    return res.status(200).json(
        { novelas: novelas }
    )
})

module.exports = router;