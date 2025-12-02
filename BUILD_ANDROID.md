# 📱 Generar APK para Android

## Requisitos Previos
- Node.js instalado
- Cuenta de Expo (gratuita): https://expo.dev

## Pasos para Generar el APK

### 1. Instalar EAS CLI (Expo Application Services)
```bash
npm install -g eas-cli
```

### 2. Iniciar sesión en Expo
```bash
eas login
```
(Crea una cuenta si no tienes en https://expo.dev)

### 3. Navegar al proyecto
```bash
cd autonew
```

### 4. Configurar el proyecto con EAS
```bash
eas build:configure
```
Esto creará/actualizará `eas.json` con la configuración de builds.

### 5. Actualizar la URL del Backend
**IMPORTANTE:** Antes de generar el APK, actualiza la URL de la API:

En `app.config.js`, cambia la URL:
```javascript
apiUrl: "https://TU-URL-DE-RENDER.onrender.com/api"
```

### 6. Generar APK (Preview - para pruebas)
```bash
eas build -p android --profile preview
```

Este proceso:
- Sube tu código a los servidores de Expo
- Compila la app en la nube (tarda 10-20 minutos)
- Te da un enlace para descargar el APK

### 7. Descargar e Instalar
Una vez completado, recibirás:
- Un enlace para descargar el archivo `.apk`
- O un código QR para escanear

Descarga el APK y envíalo a tu teléfono Android para instalar.

---

## Perfiles de Build

| Perfil | Uso | Formato |
|--------|-----|---------|
| `development` | Desarrollo con hot reload | APK |
| `preview` | Pruebas internas | APK |
| `production` | Google Play Store | AAB (App Bundle) |

### Para Google Play Store:
```bash
eas build -p android --profile production
```
Esto genera un `.aab` que puedes subir a Play Console.

---

## Comandos Útiles

```bash
# Ver estado de builds
eas build:list

# Cancelar build en progreso
eas build:cancel

# Ver configuración actual
eas config:show

# Actualizar app ya instalada (OTA update)
eas update
```

---

## Solución de Problemas

### "Invalid package name"
Asegúrate de que `android.package` en `app.json` sea válido:
- Solo letras minúsculas, números y puntos
- Ejemplo: `com.autonew.app`

### "Build failed"
Revisa los logs del build en https://expo.dev

### "API no conecta en APK"
1. Verifica que el backend esté desplegado y funcionando
2. Confirma que la URL en `app.config.js` es correcta
3. La URL debe usar HTTPS (no HTTP)

---

## Costos

**EAS Build es GRATIS** con limitaciones:
- 30 builds/mes en plan gratuito
- Cola de espera para builds
- Builds en servidores compartidos

Para más builds o builds prioritarios, considera EAS Build Pro ($99/mes).

---

## Siguiente: Publicar en Google Play

Para publicar en Google Play Store necesitas:
1. Cuenta de desarrollador de Google Play ($25 una vez)
2. Build de producción (AAB)
3. Iconos, capturas de pantalla, descripción

Consulta: https://docs.expo.dev/submit/android/
