
# cambiar nombre de la pagina a ForosRaiz
# usuarios 
## Diagrama de UsusarioNuevo
- el usuario al iniciar en la pagina puede ver los foros y los posts
- el ususario inicia como anonimo, puede postear solo texto no imagenes y los posts duran al rededor de 10 minutos para los usuarios anonimos
- usuario Anonimo solo puede postear en el foro General en los demas foros no puede hacerlo.
## Diagrama de Registro-de-usuario
- el usuario debe de poder registrarce en el layout top se encuentra el perfil los usuarios no registrados debe de decir "registrar" en lugar de decir perfil.
- usuario se registra el nombre que elige
- el usuario despues de registrarce puede postear en cualquier foro ahora puede postear las imagenes y texto sin problema
## diagrama-usuario-colaborador
- el usuario despues de escribir por chat *esto no es parte del sistema* al agregarle como colaborador debe de el usuario elegir las siguientes opciones.
- **Foros** el usuario en su perfil en la opcion de foros, puede buscar los foros y agregar solo permitido 1 foro para que aparezca en el panel izquierdo su perfil de manera global dodne demas uauarios anonimos, registrado puedan verlo como colaborador.
## diagrama-usuario-costo-unico
- **Para colaboradores**
- los usuarios que son colaboradores en su perfil debe de aparecer la opcion de crear su propio foro como las demas siempre y cuando llege a 1000 seguidores en su perfil.
- el usuario puede crear su foro y en su perfil aparezca como"foros creador" en foros creados puede crear solo 1 foro cuando haya llegado a 1000 seguidores.
- los foros creados en su perfil el colaborador tiene la opcion de eliminar foro que creo o editar el nombre del foro.
## diagrama-conexiones-usuarios
- los usuarios registrados o no registrados tienen que poder visualizarce de manera global la unica diferncia es que los usuario **Anonimos** sus posts duran 10 minutos.
- los usuarios registardos pueden ver sin problemas a los anonimos cada que postea pero no puede seguirlos y se respondieron a los posts de los usuarios anonimos al pasar los 10 minutos tambien desaparece lo que respodio a sus posts.
# conexion-relays-Nostr
- las conexiones a nostr es para guardar las publicaciones de los posts tanto posts de texto como las de  imagen tambien.
- los usuarios cada que se registrar se creara claves dpub/npu etc que es la clave publica en la que se puedan encontrar entre usuarios y tenerlos separados en sus posts en si la clave publica es la comunicacion entre usuarios.
- clave nsec es la key privada que es para que puedan iniciar session en el futuro y puedan encontrarce a su cuanta o logearce.
* **estos son las conexiones de nostrs** es un proyecto que conecta a Nostr es un repo local.
```bash
/home/eynor/Documents/proyectsTT/blog
```
# modulos faltantes
## login
- los usuarios al ingregar a la pagina ven los foros y postea sin problemas de manera Anonima pero en cada posts diga que el post se eliminara a los 10 minutos registrece.
- al abrir el login antes de crar debe de tener el bloquedo de 10 segundos. mostrando el mensaje d ela llave nsec es importante.
- el perfil que es para registro de lo s anonimos al hacer clic aparece un login que indica que ingrese un nombre de usuario, y describa que la contraseña es la llave nsec, y que debe de guardar la llave en un lugar seguro.
- al terminar de copiar el nsec se cierra el login y abre un layput mensaje que diga no se recopila informacion ni posts de los usuarios y que esta incriptado, agrega un servicio y condiciones sobre = "no menores de edad y condiciones a base de unam, ademas si en casos se crean foros que no se permita menores de edad los creadores de los foros deben de poner foro audiencia sensible o adulto, agregar tambien que los foros que no cumplan las reglas de servivio de estos foros se vaneara los foros de los creadres, agregar que los usuarios jovenes menores que se hayan registrado no cae la responsabilidad ala pagina de blog y tambien a los desarolladores a ninguan sircustancias "* *agrega una pestaña de leido* y recien se habilita el button **aceptar** y se creara la cuaneta sin problemas.
## modulo al registro agregar edad
- este modulo evita que los usarios jovenes de menores de 18 años puedan ver los foros sensibles o contenido adulto.
## modulo de foros para usuarios anonimos.
- los usuarios anonimos tambien no pueden visibilizar los foros de creadores hayan etiquetado sensible o contenido adulto.
## modulo de privacidad-perfil-usuarios
los perfiles de los usuarios no pueden ver las lalves nsec de otros usuarios esto solo pueden ver los usuarios propietarios del perfil, en la cual implica que si un usuario iingresa a la cuenta de otro usuarios ni el anonimo puede ver las llaves nsec, pero si pueden copiar las llaves npub publicos en donde esta enlacada a la url de la pagina, esto facilita importar usuarios a junto a la url en la cual es ciopiar y pegar en dodne le plasca y diga sigue este usuario recomendado.
- al hacer clic en el url con la clave npub los que abran el enlace podran ver direcamente el perfil del usuario de la clave npub y podran ver el button de seguir.
### modulo de seguir
- los usuarios entre si se pueden seguir y poner como rioridad en un new modulo de foro llamado seguidos.
- en el foro seguidos aprecen los posts de los usuarios que el usuario registrado le apareceran o cada que aya posteado un contenido en el cualquier foro
## modulo de notificaciones.
- en este modulo mostrara nombre del usuario que acaba de seguirlo
- notificacion de el usuario que sigue muestre "*nombre del usuario* acab de hacer un post en *nombre del foro*"
## modulo de seguidos este es un modulo especial
- nombre del modulo "inicio"
- los usuarios que siguen a otros usuarios dode dentro apareceran los posts de los usuarios que siguen y el nombre del foro donde haya publicado el posts.
## modulo de Guardado
- en este modulo mostrara la lista de los foros en la que se haya suscrito el usuario en si este modulo acorta la lista de muchos foros solo a lo que el usuario quiere ver.
- este modulo se encontrara alado de notificaciones.
### orden en layout top.
- perfil/registro, notificaciones, Inicio, Foros Guardados.
## foro inicio 
- muestra los foros globales lista
1. el foro incio agregale un buscador como si fuera un anvegador en dodne busque foros o usuarios debajo del top.
- cuando el usuario se haya registrado almenos a un foro el incio cmabia y solo mostrara un foro y este crece cuando el usuario empiece a seguir a mas foros
- en incio en lugar de mostrar lista de foros, mostrara la lsita de foros que sigue el usuario.
## el top layout foros
- cambia el inicio solo muestre el marcador de inicio, y esto al registrarce muestra la primera 2 letra del foro en si si hay foro anime muestre "An/" justo ahora la pagina muestra foros abrebiados pero esto cambialo y solo muestre los foros registrados por el mismo usuario registrado.
- en caso de que se acomulen muchos textos abrebiados agrea en el layout top en el lado derecho la opcion de ver mas "ver mas" al hacer clci abre un layout completo en la que remplaza el centro del foro por defecto de la pagina y muestra la lista completa de todos los foros que el usuario sigue sin arebiaturas nombres completos destribuido por filas y columnas, columans  4 y filas crece no hay problema,
- agregar button volver al foro anterior o velver a layout anterior que el usuario a ingregsado antes de entrar al button "ver mas"
## texto voler atras 
- agregar a todos los foros o usuarios visitados o modulos ingresados por el usuario registrado o anonimo tenga la opcion de  volver al anterior que estaba viendo.
- hay un error encontrado en perfil cuando entro a ver mi perfil y hay un button de volver funviona el error es cuando estoy en mi perfil no puedo cambiar de lista de los demas colaboradores esto solo ocure en perfil dentro de colaboradores al ver el mio y quiero ver de los otros no funciona
## modulo de likes.
- poder dar like a los posts o respuestras de usuarios. 
## modulo en perfil "Configuracion"
- dentro de este modulo es un layout dodne tiene las opeciones de editar perfil, crear foros, copiar claves nsec por si perdio la anteriro etc secciones de servicio y condiciones dodne tenga la lista de condiciones que leusuario acepto.
## modulo de foros creado por colaboradores.
- en este foro creado por los creadores despues de crearlo solo el creador tiene la opcion de setings o la opcion de configuracion donde al ahcer clic puede ver la opcion de editar, contenido sensible, contenido adulto
### modlo de visivilidad
- este modulod es pra los foros para poner la opcion, pulico, sensible, o adulto para los demas usuarios
- lso foros que agregen opcion publica estos foros se podran visualizar sin problemas.
- los foros sensibles no permite ver el contenido defumina el contenido del foro, como texto y imagen
- adulto igual defumina
- este estilo para ver contenido se puede acceder mostrado un layout central como losguin dodne advierte al usario que se quiera registar y tenga el mensaje este foro fue creado como"descripcion" descripcion una sensile y otar adulto para mayores.
#### crear modulo de advertencia layout donde el susario que quiera registrace
- el usario al entrar en este foro vera todo defuminado amenos que se registre pero advirteindolo cone l fi que fuue creado y que esto no involucra a condiciones y servicios bajo la responsabilidad del usuario.
- en lugar de mostrar contenido y servicio, muestre un enlace dodne le rederiga a condiciones y servicios del panel derecho estilo enlace.
- los usuarios al dar button aceptar podran ver los posts del foro defuminado.
## condicion y servicio
- agrega una seccion en el panel derecho al abrir muestre contenido de servicio, menores, contenido sensible, adulto, que la responsabilidad cae a creadores de los foros no a la pagina completa, ni a los desarrolladores.
## implentacion de color enlace.
- los usuarios que posteen un enlace este enlace se pinte de color verde del sistema
## editar perfil usuario
- los dueños de sus perfiles agregar debajo de la descripcion  NOMBRES que el usuario escriba y esos NOMBRES estilo buttons tenga enlaces que el usuario haya puesto.
- esta opcion debe de estar en settings del perfil en opcion, Agregar enlces, en cada perfil en esa seccion puede agregar n cantidad de enlaces y estos enlaces mostrara como button con los nombres de button que le usario haya puesto para mostarar en eprfil, "ejemplo: INSTAGRAM, enlace de instagram"
- el campo de este mostrara en esta forma, en esa seccion tendra la opcion de agregar enlace al hacer clic pidira nombre del enlace, y otro label para agregar enlace. esto despues de crear puede editar el nombre o enlace como eliminar el enlace creado.
- agreggar el layout de creacion de agregar enlaces.
## crea un perfil super user con su nsec
- este eprfil ya tendra solo numeor de acceso de 5000 usuarios registrados aunque no tenga ninguno esto es para mi, nombre del usuario: Cangrejo, de esta forma revisare si la pagina crea bien o no
## reinicia toda la pagian
- al terminar que elime usarios que inicie como anonimo vere su la clave nsec funciona, en si iniciare como anonimo para probar el sistema
## estilo minimal page
- la pagina ya tiene estilo y colores ysarlo, sin emojis ni imagenes 
## crear varias arañás web
- para que el internet encuentre la pagina agrega diferentes araáñás de busqueda
- agregar arañas de busqueda en cada foro estilo "nombre-de-la-pagina/nombre-del-foro/"

