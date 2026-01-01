# Banderas SVG

Este directorio debe contener los archivos SVG de las banderas de los países.

## Formato de archivos

Los archivos deben nombrarse usando el código ISO 3166-1 alpha-2 en minúsculas:

- `es.svg` para España
- `us.svg` para Estados Unidos
- `mx.svg` para México
- etc.

## Fuentes recomendadas

Puedes obtener las banderas SVG de:

1. **flag-icons** (https://github.com/lipis/flag-icons)
   - Descarga el repositorio
   - Copia los archivos SVG de `flags/4x3/` o `flags/1x1/`
   - Renombra a minúsculas (ej: `ES.svg` → `es.svg`)

2. **country-flag-icons** (https://github.com/catamphetamine/country-flag-icons)
   - Similar al anterior

3. **SVG Flags** (https://flagpedia.net/download/api)
   - API para descargar banderas SVG

## Países necesarios

Los siguientes países están en el selector de región y necesitan sus archivos SVG:

- es.svg (España)
- us.svg (Estados Unidos)
- mx.svg (México)
- ar.svg (Argentina)
- co.svg (Colombia)
- cl.svg (Chile)
- pe.svg (Perú)
- ve.svg (Venezuela)
- ec.svg (Ecuador)
- gt.svg (Guatemala)
- cu.svg (Cuba)
- bo.svg (Bolivia)
- do.svg (República Dominicana)
- hn.svg (Honduras)
- py.svg (Paraguay)
- sv.svg (El Salvador)
- ni.svg (Nicaragua)
- cr.svg (Costa Rica)
- pa.svg (Panamá)
- uy.svg (Uruguay)
- pr.svg (Puerto Rico)
- fr.svg (Francia)
- gb.svg (Reino Unido)
- de.svg (Alemania)
- it.svg (Italia)
- pt.svg (Portugal)
- br.svg (Brasil)
- ca.svg (Canadá)
- au.svg (Australia)
- nz.svg (Nueva Zelanda)

## Instalación rápida con flag-icons

```bash
# Clonar el repositorio temporalmente
git clone https://github.com/lipis/flag-icons.git /tmp/flag-icons

# Copiar las banderas necesarias (el directorio public/icons/flags ya existe)
cd /Users/florenciarimolo/workspace/agregador-streaming
cp /tmp/flag-icons/flags/4x3/es.svg public/icons/flags/es.svg
cp /tmp/flag-icons/flags/4x3/us.svg public/icons/flags/us.svg
cp /tmp/flag-icons/flags/4x3/mx.svg public/icons/flags/mx.svg
cp /tmp/flag-icons/flags/4x3/ar.svg public/icons/flags/ar.svg
cp /tmp/flag-icons/flags/4x3/co.svg public/icons/flags/co.svg
cp /tmp/flag-icons/flags/4x3/cl.svg public/icons/flags/cl.svg
cp /tmp/flag-icons/flags/4x3/pe.svg public/icons/flags/pe.svg
cp /tmp/flag-icons/flags/4x3/ve.svg public/icons/flags/ve.svg
cp /tmp/flag-icons/flags/4x3/ec.svg public/icons/flags/ec.svg
cp /tmp/flag-icons/flags/4x3/gt.svg public/icons/flags/gt.svg
cp /tmp/flag-icons/flags/4x3/cu.svg public/icons/flags/cu.svg
cp /tmp/flag-icons/flags/4x3/bo.svg public/icons/flags/bo.svg
cp /tmp/flag-icons/flags/4x3/do.svg public/icons/flags/do.svg
cp /tmp/flag-icons/flags/4x3/hn.svg public/icons/flags/hn.svg
cp /tmp/flag-icons/flags/4x3/py.svg public/icons/flags/py.svg
cp /tmp/flag-icons/flags/4x3/sv.svg public/icons/flags/sv.svg
cp /tmp/flag-icons/flags/4x3/ni.svg public/icons/flags/ni.svg
cp /tmp/flag-icons/flags/4x3/cr.svg public/icons/flags/cr.svg
cp /tmp/flag-icons/flags/4x3/pa.svg public/icons/flags/pa.svg
cp /tmp/flag-icons/flags/4x3/uy.svg public/icons/flags/uy.svg
cp /tmp/flag-icons/flags/4x3/pr.svg public/icons/flags/pr.svg
cp /tmp/flag-icons/flags/4x3/fr.svg public/icons/flags/fr.svg
cp /tmp/flag-icons/flags/4x3/gb.svg public/icons/flags/gb.svg
cp /tmp/flag-icons/flags/4x3/de.svg public/icons/flags/de.svg
cp /tmp/flag-icons/flags/4x3/it.svg public/icons/flags/it.svg
cp /tmp/flag-icons/flags/4x3/pt.svg public/icons/flags/pt.svg
cp /tmp/flag-icons/flags/4x3/br.svg public/icons/flags/br.svg
cp /tmp/flag-icons/flags/4x3/ca.svg public/icons/flags/ca.svg
cp /tmp/flag-icons/flags/4x3/au.svg public/icons/flags/au.svg
cp /tmp/flag-icons/flags/4x3/nz.svg public/icons/flags/nz.svg

# Limpiar
rm -rf /tmp/flag-icons
```

**Nota:** Los archivos deben estar en `public/icons/flags/` (no en `components/icons/flags/`) porque Nuxt sirve los archivos estáticos desde el directorio `public/`.
