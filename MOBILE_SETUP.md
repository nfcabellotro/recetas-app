# 📱 Guía de Configuración Móvil - Kali.AI Recetas

## Estructura del Proyecto

```
recetas-app/
├── web/              # Código web (HTML, CSS, JS)
│   ├── index.html
│   └── assets/
├── android/          # Proyecto Android nativo
├── ios/              # Proyecto iOS nativo
├── server.js         # Servidor backend (para desarrollo web)
└── capacitor.config.json
```

## 🚀 Cómo Probar en Dispositivos (SIN pagar cuentas de desarrollador)

### Para Android:

1. **Instalar Android Studio:**
   - Descarga desde: https://developer.android.com/studio
   - Instala Android SDK y herramientas

2. **Conectar tu dispositivo Android:**
   - Habilita "Opciones de desarrollador" en tu teléfono
   - Habilita "Depuración USB"
   - Conecta el teléfono por USB

3. **Compilar y ejecutar:**
   ```bash
   cd /Users/nicolascabello/Desktop/recetas-app
   npx cap sync
   npx cap open android
   ```
   - Se abrirá Android Studio
   - Espera a que termine de cargar
   - Selecciona tu dispositivo en la lista
   - Haz clic en el botón "Run" (▶️)
   - La app se instalará y ejecutará en tu teléfono

4. **Para probar cambios:**
   ```bash
   # Después de hacer cambios en web/
   npx cap sync
   # Luego ejecuta desde Android Studio nuevamente
   ```

### Para iOS (requiere Mac con Xcode):

1. **Instalar Xcode:**
   - Desde App Store (gratis, pero grande ~12GB)
   - Abre Xcode y acepta los términos

2. **Conectar tu iPhone:**
   - Conecta tu iPhone por USB
   - Confía en la computadora cuando aparezca el mensaje

3. **Compilar y ejecutar:**
   ```bash
   cd /Users/nicolascabello/Desktop/recetas-app
   npx cap sync
   npx cap open ios
   ```
   - Se abrirá Xcode
   - Selecciona tu iPhone en la lista de dispositivos
   - Haz clic en el botón "Run" (▶️)
   - La app se instalará en tu iPhone

   **Nota:** Para probar en dispositivo físico sin cuenta de desarrollador:
   - En Xcode, ve a: Signing & Capabilities
   - Selecciona tu Apple ID personal
   - Xcode creará un perfil temporal (válido por 7 días)

## 🔄 Flujo de Desarrollo

### Desarrollo Web:
```bash
npm run dev
# Accede a http://localhost:3001
```

### Desarrollo Móvil:
1. Haz cambios en `web/index.html` o archivos en `web/`
2. Sincroniza con Capacitor:
   ```bash
   npx cap sync
   ```
3. Ejecuta en Android Studio o Xcode

## 📦 Publicar en Tiendas (cuando estés listo)

### Android (Google Play Store):
- Costo: $25 USD (una sola vez)
- Requiere: Cuenta de desarrollador de Google
- Pasos:
  1. Genera un APK/AAB firmado desde Android Studio
  2. Sube a Google Play Console
  3. Completa la información de la app
  4. Publica

### iOS (App Store):
- Costo: $99 USD/año
- Requiere: Cuenta de desarrollador de Apple
- Pasos:
  1. Configura certificados en Xcode
  2. Archiva la app desde Xcode
  3. Sube a App Store Connect
  4. Completa la información de la app
  5. Envía para revisión

## 🔧 Comandos Útiles

```bash
# Sincronizar cambios web → móvil
npx cap sync

# Abrir proyecto Android
npx cap open android

# Abrir proyecto iOS
npx cap open ios

# Ver configuración
npx cap doctor
```

## ⚠️ Notas Importantes

1. **Backend API:** Para que la app móvil funcione, necesitas:
   - Desplegar `server.js` en un servidor (Heroku, Vercel, etc.)
   - Actualizar la URL en `capacitor.config.json` con la URL de producción

2. **Firebase:** Asegúrate de agregar el dominio de producción a los dominios autorizados en Firebase Console

3. **CORS:** El servidor ya tiene CORS configurado, pero verifica que funcione en producción

## 🆘 Solución de Problemas

### Error: "webDir is not valid"
- Asegúrate de que la carpeta `web/` existe y contiene `index.html`

### Error: "Xcode not found" (iOS)
- Instala Xcode desde App Store
- Abre Xcode una vez para aceptar términos

### Error: "Android SDK not found"
- Instala Android Studio
- Abre Android Studio y completa el setup wizard

### La app no se conecta al backend
- Verifica que el servidor esté corriendo
- Actualiza la URL en `capacitor.config.json`
- Para desarrollo local, usa `http://localhost:3001`
- Para producción, usa la URL de tu servidor desplegado

