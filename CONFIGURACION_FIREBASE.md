# 🔥 Guía de Configuración de Firebase Authentication

Esta guía te ayudará a configurar Firebase Authentication para que los usuarios puedan iniciar sesión con Google, Apple o Email.

---

## 📋 Paso 1: Acceder a Firebase Console

1. Ve a: **https://console.firebase.google.com/**
2. Inicia sesión con tu cuenta de Google
3. Selecciona tu proyecto: **recetas-app-2994d**

---

## 🔐 Paso 2: Habilitar Authentication

1. En el menú lateral izquierdo, haz clic en **"Authentication"** (o "Autenticación")
2. Si es la primera vez, verás un botón **"Get started"** → haz clic
3. Verás una pantalla con pestañas: **"Users"**, **"Sign-in method"**, etc.

---

## 📧 Paso 3: Configurar Email/Password

1. Haz clic en la pestaña **"Sign-in method"**
2. Busca **"Email/Password"** en la lista
3. Haz clic en **"Email/Password"**
4. Activa el toggle **"Enable"** (arriba)
5. **NO** necesitas activar "Email link" a menos que quieras login sin contraseña
6. Haz clic en **"Save"** (Guardar)

✅ **Listo**: Los usuarios ya pueden registrarse e iniciar sesión con email/contraseña.

---

## 🔵 Paso 4: Configurar Google Sign-In

1. En la misma pestaña **"Sign-in method"**
2. Busca **"Google"** en la lista
3. Haz clic en **"Google"**
4. Activa el toggle **"Enable"**
5. Deja el **"Project support email"** como está (o elige uno)
6. Haz clic en **"Save"**

✅ **Listo**: Google Sign-In está habilitado. No necesitas configurar nada más en Google Cloud.

---

## 🍎 Paso 5: Configurar Apple Sign-In (OPCIONAL - Más complejo)

**⚠️ IMPORTANTE**: Apple Sign-In requiere:
- Una cuenta de **Apple Developer** (cuesta $99 USD/año)
- Configuración adicional en Apple Developer Portal

Si **NO** tienes Apple Developer Account, puedes **saltar este paso** y habilitarlo después.

### Si quieres configurarlo:

1. En **"Sign-in method"**, haz clic en **"Apple"**
2. Activa **"Enable"**
3. Necesitarás:
   - **Service ID** de Apple Developer
   - **Apple Team ID**
   - **Key ID** y **Private Key** de Apple

**Por ahora, puedes dejarlo deshabilitado** y solo usar Google y Email.

---

## 🛡️ Paso 6: Configurar Reglas de Seguridad de Firestore

Esto es **MUY IMPORTANTE** para proteger los datos de los usuarios.

1. En el menú lateral, haz clic en **"Firestore Database"**
2. Ve a la pestaña **"Rules"** (Reglas)
3. Reemplaza el contenido por estas reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Reglas para la colección de usuarios
    match /users/{userId} {
      // Solo el usuario autenticado puede leer/escribir sus propios datos
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Reglas para la colección de recetas
    match /recipes/{recipeId} {
      // Solo usuarios autenticados pueden leer/escribir recetas
      allow read, write: if request.auth != null;
    }
  }
}
```

4. Haz clic en **"Publish"** (Publicar)

✅ **Listo**: Tus datos están protegidos.

---

## ✅ Paso 7: Verificar que todo funciona

1. Abre tu aplicación en el navegador
2. Deberías ver el nuevo modal de login con:
   - Botón "Continuar con Google"
   - Botón "Continuar con Apple" (si lo habilitaste)
   - Formulario de Email/Contraseña

3. Prueba crear una cuenta con email:
   - Ingresa un email
   - Ingresa una contraseña (mínimo 6 caracteres)
   - Haz clic en "Crear cuenta nueva"
   - Deberías ver un modal pidiendo completar tu perfil

4. Prueba iniciar sesión con Google:
   - Haz clic en "Continuar con Google"
   - Selecciona tu cuenta de Google
   - Deberías entrar a la app

---

## 🐛 Solución de Problemas

### Error: "Firebase no está configurado"
- Verifica que `USE_FIREBASE = true` en tu código
- Verifica que las credenciales de Firebase en `firebaseConfig` sean correctas

### Error: "auth/operation-not-allowed"
- Ve a Firebase Console → Authentication → Sign-in method
- Verifica que el método que estás usando esté **habilitado** (Enable)

### Error: "auth/popup-blocked"
- El navegador bloqueó la ventana emergente
- Permite popups para tu sitio
- O prueba en modo incógnito

### Error al guardar datos del usuario
- Verifica las reglas de Firestore (Paso 6)
- Asegúrate de que el usuario esté autenticado
- Revisa la consola del navegador para ver errores específicos

### Google Sign-In no funciona
- Verifica que "Google" esté habilitado en Sign-in method
- Asegúrate de que el dominio esté autorizado en Firebase Console
- Si estás en localhost, debería funcionar automáticamente

---

## 📝 Resumen de lo que debes hacer:

1. ✅ Habilitar **Email/Password** en Authentication
2. ✅ Habilitar **Google** en Authentication  
3. ⚠️ **Apple** (opcional, requiere Apple Developer)
4. ✅ Configurar **Reglas de Firestore** para seguridad
5. ✅ Probar que todo funciona

---

## 🆘 ¿Necesitas más ayuda?

Si tienes problemas:
1. Revisa la consola del navegador (F12) para ver errores
2. Revisa los logs de Firebase Console
3. Verifica que todos los pasos estén completados

¡Listo! Con esto deberías tener autenticación funcionando. 🎉

