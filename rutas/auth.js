const router = require('express').Router();
const Usuario = require('../modelos/Usuario');
const validarToken = require('../rutas/validarToken');

// Validaciones con @hapy/joi
const Joi = require('@hapi/joi');

const schemaRegistro = Joi.object({
    nickname: Joi.string().min(6).max(255).required(),
    email: Joi.string().min(6).max(255).required().email(),
    password: Joi.string().min(6).max(255).pattern(new RegExp('^[a-zA-Z0-9,.]{3,30}$')).required()
})

const schemaLogin = Joi.object({
    email: Joi.string().min(6).max(255).required().email(),
    password: Joi.string().min(6).max(255).pattern(new RegExp('^[a-zA-Z0-9,.]{3,30}$')).required()
})
// Declaracion Bcrypt
const bcrypt = require('bcrypt');

//Declaracion JWT
const jwt = require('jsonwebtoken');


router.post('/registro', async (req, res) => {

    // Validar Usuario
    const { error } = schemaRegistro.validate(req.body)
    if (error) {
        return res.status(400).json(
            {error: error.details[0].message}
        )
    }

    // Validar nickname único 
    const nicknameExiste = await Usuario.findOne({ nickname: req.body.nickname });
        if (nicknameExiste) {
            return res.status(400).json(
                {error: 'El nickname no está disponible'}
            )
        }

    // Validar email único 
    const emailExiste = await Usuario.findOne({ email: req.body.email });
        if (emailExiste) {
            return res.status(400).json(
                {error: 'Ya existe una cuenta asociada a este email'}
            )
        }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHasheada = await bcrypt.hash(req.body.password, salt);

    const usuario = new Usuario({
        nickname: req.body.nickname,
        email: req.body.email,
        password: passwordHasheada
    });
    try {
        const usuarioGuardado = await usuario.save();
        res.json({
            error: null,
            data: usuarioGuardado
        })
    } catch (error) {
        res.status(400).json({error})
        return;
    }
})

router.post('/login',async(req,res)=>{
    //Validar usuario
    const { error } = schemaLogin.validate(req.body)
    
    if (error) {
        console.log(error.details);
        return res.status(400).json(
            {error: error.details[0].message}
        )
    }

    //Comprobar correo
    const usuario = await Usuario.findOne({email:req.body.email});
    if (!usuario){
        return res.status(400).json(
            { error: 'Login Incorrecto' }
        )
    }

    //Comprobar contraseña
    const passwordValida = await bcrypt.compare(req.body.password,usuario.password);
    if (!passwordValida){
        return res.status(400).json(
            { error: 'Login Incorrecto'}
        )
    }
    // if(usuario.estado != 'Activo'){
    //     if(usuario.estado == 'Baneado'){
    //         return res.status(401).json(
    //             { error: 'Usuario banneado'}
    //         )
    //     }
    //     if(usuario.estado == 'Inactivo'){
    //         return res.status(401).json(
    //             { error: 'Falta el usuario por confirmar'}
    //         )
    //     }
    // }
    //Creación de token JWT
    const token = jwt.sign({
        _id: usuario._id,
        nickname: usuario.nickname,
        rol: usuario.rol,
        email: usuario.email,
        estado: usuario.estado
    }, "stack",{
        expiresIn: '2d'
    }, process.env.TOKEN_SECRET)
    
    return res.header('auth-token', token).json({
        error: null,
        data: 'Login exitoso'
    }).status(200);
    //Respuesta si todo bien
})
module.exports = router;