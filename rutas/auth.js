const router = require('express').Router();
const Usuario = require('../modelos/Usuario');
const validarToken = require('../rutas/validarToken');

// Validaciones con @hapy/joi
const Joi = require('@hapi/joi');

const schemaRegistro = Joi.object({
    nickname: Joi.string().min(6).max(255).required(),
    email: Joi.string().min(6).max(255).required().email(),
    password: Joi.string().min(6).max(1024).required()
})

const schemaLogin = Joi.object({
    email: Joi.string().min(6).max(255).required().email(),
    password: Joi.string().min(6).max(255).required()
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
        return res.status(400).json(
            {error: error.details[0].message}
        )
    }

    //Comprobar correo
    const usuario = await Usuario.findOne({email:req.body.email});
    if (!usuario){
        return res.status(400).json(
            { error: 'Email incorrecto' }
        )
    }

    //Comprobar contraseña
    const passwordValida = await bcrypt.compare(req.body.password,usuario.password);
    if (!passwordValida){
        return res.status(400).json(
            { error: 'Contraseña incorrecta'}
        )
    }
    //Creación de token JWT
    const token = jwt.sign({
        nickname: usuario.nickname,
        rol: usuario.rol,
        email: usuario.email
    }, process.env.TOKEN_SECRET)
    
    return res.header('auth-token', token).json({
        error: null,
        data: 'Login exitoso'
    }).status(200);
    //Respuesta si todo bien
})

router.get('/',async(req,res)=>{
    
    let usuarios = await Usuario.find();
    if (!usuarios){
        return res.status(400).json(
            { error: 'No hay usuarios' }
        )
    }
    return res.status(200).json(
        {listaUsuarios: usuarios}
    )
    
})

module.exports = router;