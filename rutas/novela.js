const router = require('express').Router();
const { isNumber } = require('@hapi/joi/lib/common');
const Novela = require('../modelos/Novela');
const Usuario = require('../modelos/Usuario');
const validarToken = require('./validarToken');
const sharp = require('sharp');
// Validaciones con @hapy/joi
const Joi = require('@hapi/joi');
const fs = require('fs');
const mime = require('mime-types');

const directorioImagenes = 'public/img/';

const schemaNovela = Joi.object({
    titulo: Joi.string().min(6).max(40).required(),
    descripcion: Joi.string().min(150).required(),
    generos: Joi.array().items(Joi.string()),
    etiquetas: Joi.array().items(Joi.string())
})

const schemaCapitulo = Joi.object({
    titulo: Joi.string().min(6).max(30).required(),
    contenido: Joi.string().min(300).required()
})


router.post('/nueva', validarToken, async (req, res) => {
    req.body.descripcion = req.body.descripcion.toString();
    req.body.generos = JSON.parse(req.body.generos);
    req.body.etiquetas = JSON.parse(req.body.etiquetas);
    if (req.errorExtension) {
        return res.status(400).json({ error: req.errorExtension })
    }
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
            let nombreImagen = 'placeholder.jpg';
            if (req.file) {
                let imagen = req.file;
                const extensionImagen = mime.extension(imagen.mimetype);
                nombreImagen = imagen.originalname.split('.')[0] + '-' + Date.now() + '.' + extensionImagen;
                let rutaImagen = directorioImagenes + nombreImagen;
                const buffer = await sharp(req.file.buffer).resize(400, 600).toBuffer();
                fs.writeFile(rutaImagen, buffer, (error) => {
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
            return res.status(200).json({
                error: null,
                mensaje: 'Novela creada con éxito',
                _id : novelaGuardada._id
            })
        } else {
            return res.status(400).json({ error: 'Error al crear novela' })
        }
        
    } catch (error) {
        res.status(400).json({ error: 'Error inesperado' })
        return;
    }
    
})

router.post('/:_id/nuevoCapitulo/', validarToken, async (req, res) => {
    if (!req.params._id) {
        return res.status(401).json({ error: 'Error al recibir parámetros' })
    }
    if (!req.usuario.rol || (req.usuario.rol != 'Usuario' && req.usuario.rol != 'Admin')) {
        return res.status(401).json({ error: 'No tienes permisos para crear un capitulo' })
    }
    // Validar Capitulo
    const { error } = schemaCapitulo.validate(req.body)
    if (error) {
        return res.status(400).json(
            { error: error.details[0].message }
        )
    }
    try {
        if (req.usuario.email) {
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
            let capitulo = {
                numero: (novela.listaCapitulos.length + 1),
                titulo: req.body.titulo,
                contenido: req.body.contenido,
                fechaCreacion: Date.now()
            };
            novela.listaCapitulos.push(capitulo);
            novela.fechaUltimoCapitulo = capitulo.fechaCreacion;
            novela.numeroCapitulos = novela.listaCapitulos.length;
            await novela.save();
            return res.status(200).json({
                error: null,
                mensaje: 'Capitulo creado con exito'
            })
        } else {
            return res.status(400).json({ error: 'Error al crear el capitulo' })
        }
    } catch (error) {
        res.status(400).json({ error })
        return;
    }
    
})

router.put('/:_id/capitulo/:numero', validarToken, async (req, res) => {
    if (!req.params._id || !req.params.numero) {
        return res.status(401).json({ error: 'Error al recibir parámetros' })
    }
    if (req.usuario.rol && req.usuario.rol != 'Usuario' && req.usuario.rol != 'Admin') {
        return res.status(401).json({ error: 'No tienes permisos para editar un capitulo' })
    }
    // Validar Capitulo
    const { error } = schemaCapitulo.validate(req.body)
    if (error) {
        return res.status(400).json(
            { error: error.details[0].message }
        )
    }
    try {
        if (req.usuario.email) {
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
            let posicionCapitulo = novela.listaCapitulos.findIndex(capitulo => capitulo.numero == req.params.numero);
            let capitulo = novela.listaCapitulos[posicionCapitulo];
            capitulo.titulo = req.body.titulo || capitulo.titulo;
            capitulo.contenido = req.body.contenido || capitulo.contenido;
            novela.markModified('listaCapitulos');
            await novela.save();
            return res.status(200).json({
                error: null,
                mensaje: 'Capitulo creado con exito'
            })
        } else {
            return res.status(400).json({ error: 'Error al editar el capitulo' })
        }
    } catch (error) {
        res.status(400).json({ error })
        return;
    }
    
})

router.delete('/:_id/capitulo/:numero', validarToken, async (req, res) => {
    if (!req.params._id || !req.params.numero) {
        return res.status(401).json({ error: 'Error al recibir parámetros' })
    }
    if (req.usuario.rol && req.usuario.rol != 'Usuario' && req.usuario.rol != 'Admin') {
        return res.status(401).json({ error: 'No tienes permisos para borrar un capitulo' })
    }
    try {
        if (req.usuario.email) {
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
            let posicionCapitulo = novela.listaCapitulos.findIndex(capitulo => capitulo.numero == req.params.numero);
            novela.listaCapitulos.splice(posicionCapitulo, 1);
            novela.listaCapitulos.forEach((capitulo, indice) => {
                capitulo.numero = (indice + 1);
            });
            novela.numeroCapitulos = novela.listaCapitulos.length;
            novela.markModified('listaCapitulos');
            await novela.save();
            return res.status(200).json({
                error: null,
                mensaje: 'Capitulo borrado con exito'
            })
        } else {
            return res.status(400).json({ error: 'Error al borrar el capitulo' })
        }
    } catch (error) {
        res.status(400).json({ error })
        return;
    }
    
})

router.post('/puntuar/:_id', validarToken, async (req, res) => {
    if (req.usuario.rol && req.usuario.rol != 'Usuario' && req.usuario.rol != 'Admin') {
        return res.status(401).json({ error: 'Tienes que estar logueado para puntuar' })
    }
    if (!req.usuario.email) {
        return res.status(401).json({ error: 'Tienes que estar logueado para puntuar' })
    }
    if (!req.params._id) {
        return res.status(400).json({ error: 'Error al pasar el ID de novela' })
    }
    try {
        let usuario = await Usuario.findOne({ email: req.usuario.email });
        if (!usuario) {
            return res.status(400).json(
                { error: 'Error al buscar el usuario en la base de datos' }
            )
        }
        let novela = await Novela.findById(req.params._id);
        if (!novela) {
            return res.status(400).json({ error: 'No existe la novela a puntuar' })
        }
        if (req.body.puntuacion && !isNaN(req.body.puntuacion) && (req.body.puntuacion >= 0 && req.body.puntuacion <= 10)) {
            let posicionNovela = novela.valoraciones.findIndex(valoracion => valoracion.emailUsuario == usuario.email);
            if (posicionNovela != -1) {
                novela.valoraciones[posicionNovela].puntuacion = req.body.puntuacion;
            } else {
                novela.valoraciones.push({ emailUsuario: usuario.email, puntuacion: req.body.puntuacion });
            }
            let totalPuntuaciones = novela.valoraciones.reduce((total, siguiente) => total + siguiente.puntuacion, 0);
            novela.puntuacion = (totalPuntuaciones / novela.valoraciones.length) || 0;
            await novela.save();
            return res.status(200).json({
                error: null,
                mensaje: 'Novela puntuada con exito'
            })
        }
    } catch (error) {
        return res.status(400).json({ error });
    }
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
        let rutaImagenABorrar = directorioImagenes + novela.imagen;
        if (novela.imagen != 'placeholder.jpg') {
            fs.rm(rutaImagenABorrar, (error) => {
            });
        }
        await Novela.findByIdAndDelete(novela._id);
        usuario.markModified('novelasPublicadas');
        await usuario.save();
        return res.status(200).json({
            error: null,
            mensaje: 'Novela eliminada con éxito'
        })
    } catch (error) {
        res.status(400).json({ error: 'la novela no existe' })
        return;
    }
    
})

router.get('/buscadorDinamico/', async (req, res) => {
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
        busqueda.generos = JSON.parse(req.query.generos);
    }
    if (req.query.etiqueta) {
        busqueda.etiquetas = JSON.parse(req.query.etiquetas);
    }
    let novelas = await Novela.paginate(busqueda, opciones)
    if (!novelas) {
        return res.status(404).json(
            { error: 'No hay datos para esta búsqueda' }
        )
    }
    if(novelas.docs.length == 1){
        novelas.docs[0].listaCapitulos = undefined;
    }else{
        novelas.docs.forEach((novela)=>{
            novela.listaCapitulos = undefined;
        });
    }
    return res.status(200).json(
        { error: null, novelas: novelas }
    )
})

router.get('/seguidas', validarToken, async (req, res) => {
    if (!req.usuario.rol || (req.usuario.rol != 'Usuario' && req.usuario.rol != 'Admin')) {
        return res.status(401).json({ error: 'No estás logueado' });
    }

    const usuario = await Usuario.findOne({ email: req.usuario.email });
    if (!usuario) {
        return res.status(400).json(
            { error: 'Error al recuperar el usuario' }
        )
    }
    if(usuario.novelasSeguidas.length < 1){
        return res.status(400).json(
            { error: 'Aún no has seguido ninguna novela' }
        )
    }
    let novelas= await Novela.find().where('_id').in(usuario.novelasSeguidas).exec();
    if (!novelas) {
        return res.status(404).json(
            { error: 'No hay datos para esta búsqueda' }
        )
    }
    if(novelas.length == 1){
        novelas[0].listaCapitulos = undefined;
    }else{
        novelas.forEach((novela)=>{
            novela.listaCapitulos = undefined;
        });
    }
    return res.status(200).json(
        { error: null, novelas: novelas }
    )
})

router.get('/publicadas', validarToken, async (req, res) => {
    if (!req.usuario.rol || (req.usuario.rol != 'Usuario' && req.usuario.rol != 'Admin')) {
        return res.status(401).json({ error: 'No tienes novelas seguidas' });
    }
    try{
        const usuario = await Usuario.findOne({ email: req.usuario.email });
        if (!usuario) {
            return res.status(400).json(
                { error: 'Error al recuperar el usuario' }
            )
        }
        let listaNovelasABuscar = [];
        if(usuario.novelasPublicadas.length == 1){
            if(usuario.novelasPublicadas[0]){
                listaNovelasABuscar.push(usuario.novelasPublicadas[0].novela_id.toString());
            }
        }else{
            usuario.novelasPublicadas.forEach((novela)=>{
                if(novela.novela_id){
                    listaNovelasABuscar.push(novela.novela_id.toString());
                }
            });
        }
        const novelas= await Novela.find().where('_id').in(listaNovelasABuscar).exec();
        if (!novelas || novelas.length == 0) {
            return res.status(404).json(
                { error: 'No hay datos para esta búsqueda' }
            )
        }
        if(novelas.length == 1){
            novelas[0].listaCapitulos = undefined;
        }else{
            novelas.forEach((novela)=>{
                novela.listaCapitulos = undefined;
            });
        }
        return res.status(200).json(
            { error: null, novelas: novelas }
        )
    }catch(error){
        return res.status(404).json(
            { error: 'No hay datos para esta búsqueda' }
        )
    }
   
})

router.put('/seguir/:_id', validarToken, async (req, res) => {
    if (!req.usuario.rol || (req.usuario.rol != 'Usuario' && req.usuario.rol != 'Admin')) {
        return res.status(401).json({ error: 'No puedes ver la novela' });
    }
    if (!req.params._id) {
        return res.status(401).json({ error: 'Error al mandar los parámetros' });
    }
    try {

        const novela = await Novela.findById(req.params._id);
        if (!novela) {
            return res.status(400).json(
                { error: 'Error al seguir la novela' }
            )
        }

        let usuario = await Usuario.findOne({ email: req.usuario.email });

        if (!usuario) {
            return res.status(400).json(
                { error: 'Error al recuperar el usuario' }
            )
        }

        let posicionNovela = usuario.novelasSeguidas.findIndex(id => id == req.params._id);
        var novelaSeguida;
        if (posicionNovela != -1) {
            usuario.novelasSeguidas.splice(posicionNovela, 1);
            novelaSeguida = 0;
        } else {
            usuario.novelasSeguidas.push(req.params._id);
            novelaSeguida = 1;
        }
        usuario.markModified('novelasSeguidas');
        const usuarioGuardado = await usuario.save();
        if (usuarioGuardado) {
            usuarioGuardado.password = undefined;
        }
        return res.status(200).json(
            { error: null, novelaSeguida: novelaSeguida }
        )
    } catch (error) {
        return res.status(400).json(
            { error: 'Error al hacer la operacion' }
        )
    }
})

router.get('/:_id', async (req, res) => {
    if (!req.params._id) {
        return res.status(401).json({ error: 'Error al recibir parámetros' })
    }
    try {
        const novela = await Novela.findById(req.params._id);
        if (!novela) {
            return res.status(404).json(
                { error: 'No hay datos para esta búsqueda' }
            )
        }
        novela.visitas++;
        await novela.save();
        return res.status(200).json(
            { error: null, novela: novela }
        )
    } catch {
        return res.status(404).json(
            { error: 'No hay datos para esta búsqueda' }
        )
    }
    
})

router.get('/buscar/:titulo', async (req, res) => {
    let opciones = {};
    opciones.page = req.query.pagina || 1;
    opciones.limit = req.query.limite || 25;
    if (!req.params.titulo) {
        return res.status(401).json({ error: 'Error al recibir parámetros' })
    }
    try {
        let novelas = await Novela.paginate({ titulo: new RegExp(req.params.titulo, "i") },opciones);
        if (!novelas || novelas.length == 0) {
            return res.status(404).json(
                { error: 'No hay datos para esta búsqueda' }
            )
        }
        if(novelas.docs.length == 1){
            novelas.docs[0].listaCapitulos = undefined;
        }else{
            novelas.docs.forEach((novela)=>{
                novela.listaCapitulos = undefined;
            });
        }
        
        return res.status(200).json(
            { error: null, novelas: novelas }
        )
    } catch {
        return res.status(404).json(
            { error: 'No hay datos para esta búsqueda' }
        )
    }
})

router.get('/buscarGenero/:genero', async (req, res) => {
    let opciones = {};
    opciones.page = req.query.pagina || 1;
    opciones.limit = req.query.limite || 25;
    if (!req.params.genero) {
        return res.status(401).json({ error: 'Error al recibir parámetros' })
    }
    try {
        let novelas = await Novela.paginate({ generos: req.params.genero }, opciones);
        if (!novelas || novelas.length == 0) {
            return res.status(404).json(
                { error: 'No hay datos para esta búsqueda' }
            )
        }
        if(novelas.docs.length == 1){
            novelas.docs[0].listaCapitulos = undefined;
        }else{
            novelas.docs.forEach((novela)=>{
                novela.listaCapitulos = undefined;
            });
        }
        return res.status(200).json(
            { error: null, novelas: novelas }
        )
    } catch {
        return res.status(404).json(
            { error: 'No hay datos para esta búsqueda' }
        )
    }
})

router.get('/buscarEtiqueta/:etiqueta', async (req, res) => {
    let opciones = {};
    opciones.page = req.query.pagina || 1;
    opciones.limit = req.query.limite || 25;
    if (!req.params.etiqueta) {
        return res.status(401).json({ error: 'Error al recibir parámetros' })
    }
    try {
        let novelas = await Novela.paginate({ etiquetas : req.params.etiqueta }, opciones);
        if (!novelas || novelas.length == 0) {
            return res.status(404).json(
                { error: 'No hay datos para esta búsqueda' }
            )
        }
        if(novelas.docs.length == 1){
            novelas.docs[0].listaCapitulos = undefined;
        }else{
            novelas.docs.forEach((novela)=>{
                novela.listaCapitulos = undefined;
            });
        }
        return res.status(200).json(
            { error: null, novelas: novelas }
        )
    } catch {
        return res.status(404).json(
            { error: 'No hay datos para esta búsqueda' }
        )
    }
})

router.put('/:_id', validarToken, async (req, res) => {
    req.body.descripcion = '' + req.body.descripcion;
    req.body.generos = JSON.parse(req.body.generos);
    req.body.etiquetas = JSON.parse(req.body.etiquetas);
    if (req.errorExtension) {
        return res.status(400).json({ error: req.errorExtension })
    }
    if (!req.usuario.rol || (req.usuario.rol != 'Usuario' && req.usuario.rol != 'Admin')) {
        return res.status(401).json({ error: 'No tienes permisos para editar una novela.' })
    }
    if (!req.params._id) {
        return res.status(401).json({ error: 'Error al recibir parámetros' })
    }
    // Validar Novela
    const { error } = schemaNovela.validate(req.body);
    if (error) {
        return res.status(400).json(
            { error: error.details[0].message }
        )
    }

    try {
        let novela = await Novela.findById(req.params._id);
        if (!novela) {
            return res.status(400).json(
                { error: 'Error al buscar la novela en la BDD' }
            )
        }

        if (req.body.titulo != novela.titulo) {
            let tituloExiste = await Novela.findOne({ titulo: req.body.titulo });
            if (tituloExiste) {
                return res.status(400).json(
                    { error: 'El titulo ya existe' }
                )
            }
        }
        //Validar que el usuario sea el creador o Admin
        if (req.usuario.email) {
            let usuario = await Usuario.findById(novela.autor.autor_id);
            if (!usuario || usuario.email != req.usuario.email) {
                if (req.usuario.rol != 'Admin') {
                    return res.status(400).json(
                        { error: 'Error de usuario' }
                    )
                }
            }
            let nombreImagen = novela.imagen;

            if (req.file) {
                let rutaImagenABorrar = directorioImagenes + novela.imagen;
                if (novela.imagen != 'placeholder.jpg') {
                    fs.rm(rutaImagenABorrar, (error) => {
                    });
                }
                let imagen = req.file;
                const extensionImagen = mime.extension(imagen.mimetype);
                nombreImagen = imagen.originalname.split('.')[0] + '-' + Date.now() + '.' + extensionImagen;
                let rutaImagen = directorioImagenes + nombreImagen;
                const buffer = await sharp(req.file.buffer).resize(400, 600).toBuffer();
                fs.writeFile(rutaImagen, buffer, (error) => {
                    if (error) {
                        return res.status(400).json({ error: 'Error al subir imagen' })
                    }
                });
            }

            const novelaGuardada = await Novela.findByIdAndUpdate(novela._id, {
                titulo: req.body.titulo ?? novela.titulo,
                descripcion: req.body.descripcion ?? novela.descripcion,
                generos: req.body.generos ?? novela.generos,
                etiquetas: req.body.etiquetas ?? novela.etiquetas,
                imagen: nombreImagen
            })

            if (novelaGuardada) {
                let posicionNovela = usuario.novelasPublicadas.findIndex((elemento) => elemento.novela_id.toString() == novela._id);
                usuario.novelasPublicadas[posicionNovela].titulo = novelaGuardada.titulo;
                usuario.novelasPublicadas[posicionNovela].descripcion = novelaGuardada.descripcion;
                usuario.novelasPublicadas[posicionNovela].imagen = novelaGuardada.imagen;
                usuario.markModified('novelasPublicadas');
                await usuario.save();
                return res.status(200).json({
                    error: null,
                    mensaje: 'Novela editada con éxito'
                })
            }
        } else {
            res.status(400).json({ error: 'Error al editar novela' })
        }
        
    } catch (error) {
        res.status(400).json({ error: 'En al recuperar la novela' })
        return;
    }
    
})

module.exports = router;