const router = require('express').Router();
const Usuario = require('../modelos/Usuario');
const validarToken = require('../rutas/validarToken');

// Declaracion Bcrypt
const bcrypt = require('bcrypt');

const Joi = require('@hapi/joi');

const schemaUsuario = Joi.object({
    nickname: Joi.string().min(6).max(32).required(),
    email: Joi.string().min(6).max(255).required().email(),
    password: Joi.string().min(6).max(25).required(),
    rol: Joi.string().min(3).max(16)
})

router.get('/', validarToken, async (req, res) => {
    
    let usuarioEncontrado = await Usuario.findOne({ email: req.params.email });
    if (!usuarioEncontrado) {
        return res.status(400).json(
            { error: 'No existe el usuario' }
        )
    }
    return res.status(200).json(
        { usuario: usuarioEncontrado }
    )
})

router.get('/:email', validarToken, async (req, res) => {
    let usuarioEncontrado = await Usuario.findOne({ email: req.params.email });
    if (!usuarioEncontrado) {
        return res.status(400).json(
            { error: 'No existe el usuario' }
        )
    }
    return res.status(200).json(
        { usuario: usuarioEncontrado }
    )
})

router.post('/', validarToken, async (req, res) => {

        //Controlar acceso
        if (req.usuario.rol != 'Admin'){
            return res.status(401).json(
                {error: 'Acceso solo para administradores'}
            )
        }
        // Validar Usuario
        const { error } = schemaUsuario.validate(req.body)
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
            password: passwordHasheada,
            rol: req.body.rol
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

module.exports = router;