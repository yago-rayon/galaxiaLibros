const router = require('express').Router();
const Novela = require('../modelos/Novela');
const Usuario = require('../modelos/Usuario');
const validarToken = require('./validarToken');

// Validaciones con @hapy/joi
const Joi = require('@hapi/joi');
const fs = require('fs');
const mime = require('mime-types');

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
    
    try {
        
        if (req.usuario.email){
            let usuario = await Usuario.findOne({email : req.usuario.email});
            if (!usuario){
                return res.status(400).json(
                    { error: 'Error al buscar el usuario en la base de datos' }
                )
            }
            let autorNovela = { autor_id : usuario._id, autorNickname : usuario.nickname }
            let nombreImagen = 'placeholder.png';
            if (req.file){
                let imagen = req.file;
                const extensionImagen = mime.extension(imagen.mimetype);
                nombreImagen = imagen.originalname.split(extensionImagen)[0] + '-' + Date.now() + '.' + extensionImagen;
                let rutaImagen = 'assets/img/'+nombreImagen;
                fs.writeFile( rutaImagen , req.file.buffer, (error)=>{
                    if (error){
                        return res.status(400).json({ error: 'Error al subir imagen' })
                    }
                });
            }
            const novela = new Novela({
                autor : autorNovela,
                titulo: req.body.titulo,
                descripcion: req.body.descripcion,
                generos: req.body.generos,
                etiquetas: req.body.etiquetas,
                imagen: nombreImagen
            });
            const novelaGuardada = await novela.save();
            if(novelaGuardada){
                const novelaPublicada = { novela_id: novelaGuardada._id, titulo : novelaGuardada.titulo, descripcion : novelaGuardada.descripcion, fechaCreacion: novelaGuardada.fechaCreacion, imagen: novelaGuardada.imagen };
                usuario.novelasPublicadas.push(novelaPublicada);
                await usuario.save();
            }
        }else{
            res.status(400).json({ error: 'Error al crear novela' })
        } 
    } catch (error) {
        res.status(400).json({ error })
        return;
    }
    return res.status(200).json({
        error: null,
        data: 'Novela creada con éxito'
    })
})

router.delete('/:_id', validarToken, async (req, res) => {
    if (req.usuario.rol && req.usuario.rol != 'Usuario' && req.usuario.rol != 'Admin'){
        return res.status(401).json({ error: 'No tienes permisos para eliminar una novela.' })
    }
    try {
        console.log(req.params._id.trim());
        if (req.params._id){
            let novela = await Novela.findById( req.params._id );
            let usuario = await Usuario.findById( novela.autor.autor_id );
            if (!usuario){
                return res.status(400).json(
                    { error: 'Error al buscar el usuario en la base de datos' }
                )
            }
            if( req.usuario.email != usuario.email ){
                return res.status(400).json(
                    { error: 'Usuario incorrecto' }
                )
            }
            if(novela){
                let posicionNovela = usuario.novelasPublicadas.findIndex((elemento) => {console.log(elemento.novela_id); return elemento.novela_id.toString() == novela._id });
                usuario.novelasPublicadas.splice(posicionNovela,1);
                fs.rm('assets/img/'+novela.imagen);
                await Novela.findByIdAndDelete(novela._id);
                await usuario.save();
            }
        }else{
            res.status(400).json({ error: 'Error al crear novela' })
        } 
    } catch (error) {
        res.status(400).json({ error })
        return;
    }
    return res.status(200).json({
        error: null,
        data: 'Novela eliminada con éxito'
    })
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