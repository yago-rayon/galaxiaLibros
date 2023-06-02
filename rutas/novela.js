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
    if (req.usuario.rol && req.usuario.rol != 'Usuario' && req.usuario.rol != 'Admin') {
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

        if (req.usuario.email) {
            let usuario = await Usuario.findOne({ email: req.usuario.email });
            if (!usuario) {
                return res.status(400).json(
                    { error: 'Error al buscar el usuario en la base de datos' }
                )
            }
            let autorNovela = { autor_id: usuario._id, autorNickname: usuario.nickname }
            let nombreImagen = 'placeholder.png';
            if (req.file) {
                let imagen = req.file;
                const extensionImagen = mime.extension(imagen.mimetype);
                nombreImagen = imagen.originalname.split(extensionImagen)[0] + '-' + Date.now() + '.' + extensionImagen;
                let rutaImagen = 'assets/img/' + nombreImagen;
                fs.writeFile(rutaImagen, req.file.buffer, (error) => {
                    if (error) {
                        return res.status(400).json({ error: 'Error al subir imagen' })
                    }
                });
            }
            const novela = new Novela({
                autor: autorNovela,
                titulo: req.body.titulo,
                descripcion: req.body.descripcion,
                generos: req.body.generos,
                etiquetas: req.body.etiquetas,
                imagen: nombreImagen
            });
            const novelaGuardada = await novela.save();
            if (novelaGuardada) {
                const novelaPublicada = { novela_id: novelaGuardada._id, titulo: novelaGuardada.titulo, descripcion: novelaGuardada.descripcion, fechaCreacion: novelaGuardada.fechaCreacion, imagen: novelaGuardada.imagen };
                usuario.novelasPublicadas.push(novelaPublicada);
                await usuario.save();
            }
        } else {
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
    if (req.usuario.rol && req.usuario.rol != 'Usuario' && req.usuario.rol != 'Admin') {
        return res.status(401).json({ error: 'No tienes permisos para eliminar una novela.' })
    }
    if (!req.params._id) {
        return res.status(401).json({ error: 'Error al recibir parámetros' })
    }
    try {
        let novela = await Novela.findById(req.params._id);
        let usuario = await Usuario.findById(novela.autor.autor_id);
        if (!usuario) {
            return res.status(400).json(
                { error: 'Usuario incorrecto' }
            )
        }
        if (!novela) {
            return res.status(400).json(
                { error: 'Error al recuperar la novela' }
            )
        }
        if (req.usuario.email != usuario.email) {
            return res.status(400).json(
                { error: 'Usuario incorrecto' }
            )
        }
        let posicionNovela = usuario.novelasPublicadas.findIndex((elemento) => elemento.novela_id.toString() == novela._id);
        usuario.novelasPublicadas.splice(posicionNovela, 1);
        let rutaImagen = 'assets/img/' + novela.imagen;
        if (novela.imagen != 'placeholder.png' && fs.existsSync(rutaImagen)) {
            fs.rm(rutaImagen);
        }
        await Novela.findByIdAndDelete(novela._id);
        await usuario.save();
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
    if (req.query.ordenar) {
        const direccion = req.query.direccion || "desc";
        opciones.sort = {};
        opciones.sort[req.query.ordenar] = direccion;
    }
    let busqueda = {};
    if (req.query.genero) {
        busqueda.generos = req.query.genero;
    }
    if (req.query.etiqueta) {
        busqueda.etiquetas = req.query.etiqueta;
    }
    const novelas = await Novela.paginate(busqueda, opciones)

    if (!novelas) {
        return res.status(400).json(
            { error: 'No hay datos para esta búsqueda' }
        )
    }
    return res.status(200).json(
        { novelas: novelas }
    )
})

router.put('/:_id', validarToken, async (req, res) => {
    if (req.usuario.rol && req.usuario.rol != 'Usuario' && req.usuario.rol != 'Admin') {
        return res.status(401).json({ error: 'No tienes permisos para editar una novela.' })
    }
    if (!req.params._id) {
        return res.status(401).json({ error: 'Error al recibir parámetros' })
    }
    // Validar Novela
    const { error } = schemaNovela.validate(req.body)
    if (error) {
        return res.status(400).json(
            { error: error.details[0].message }
        )
    }

    // Validar titulo único 
    let novela = await Novela.findById(req.params._id);
    if (!novela) {
        return res.status(400).json(
            { error: 'La novela a editar no existe' }
        )
    }

    try {
        if (req.usuario.email) {
            let usuario = await Usuario.findById(novela.autor.autor_id);
            if (!usuario || usuario.email != req.usuario.email) {
                return res.status(400).json(
                    { error: 'Error de usuario' }
                )
            }
            let nombreImagen = novela.imagen;
            if (req.file) {
                let  rutaImagenABorrar = 'assets/img/'+novela.imagen;
                console.log(rutaImagenABorrar);
                if (novela.imagen != 'placeholder.png' && fs.existsSync(rutaImagenABorrar)){
                    fs.rm(rutaImagenABorrar,(error)=>{ if (error) {
                        return res.status(400).json({ error: 'Error al subir imagen' })
                    } });
                }
                let imagen = req.file;
                const extensionImagen = mime.extension(imagen.mimetype);
                nombreImagen = imagen.originalname.split('.')[0] + '-' + Date.now() + '.' + extensionImagen;
                let rutaImagen = 'assets/img/' + nombreImagen;
                fs.writeFile(rutaImagen, req.file.buffer, (error) => {
                    if (error) {
                        return res.status(400).json({ error: 'Error al subir imagen' })
                    }
                });
            }
            const novelaGuardada = await Novela.findByIdAndUpdate(novela._id,{ 
                titulo : req.body.titulo || novela.titulo, 
                descripcion: req.body.descripcion || novela.descripcion,
                generos: req.body.generos || novela.generos,
                etiquetas : req.body.etiquetas || novela.etiquetas,
                imagen : nombreImagen
            })
            if (novelaGuardada) {
                const novelaEditada = { novela_id: novelaGuardada._id, titulo: novelaGuardada.titulo, descripcion: novelaGuardada.descripcion, fechaCreacion: novelaGuardada.fechaCreacion, imagen: novelaGuardada.imagen };
                let posicionNovela = usuario.novelasPublicadas.findIndex((elemento) => elemento.novela_id.toString() == novela._id);
                Object.assign(usuario.novelasPublicadas[posicionNovela], novelaEditada);
                // console.log(usuario.novelasPublicadas);
                await usuario.save();
            }
        } else {
            res.status(400).json({ error: 'Error al crear novela' })
        }
    } catch (error) {
        res.status(400).json({ error: 'En algun lado hay un error' })
        return;
    }
    return res.status(200).json({
        error: null,
        data: 'Novela creada con éxito'
    })
})

module.exports = router;