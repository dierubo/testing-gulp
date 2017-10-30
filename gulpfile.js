var gulp 			= require('gulp');
var concat 			= require('gulp-concat');
var uglify 			= require('gulp-uglify');
var del 			= require('del');
var runSequence 	= require('gulp-run-sequence');
var path 			= require('path');
var processhtml		= require('gulp-processhtml');
var gulpif 			= require('gulp-if');
var beautify		= require('gulp-beautify');
var connect			= require('gulp-connect');
var jshint 			= require('gulp-jshint');
var please			= require('gulp-pleeease'); // Añade prefijos específicos de navegadores, conversión de unidades, etc
var rename			= require('gulp-rename');
var sass			= require('gulp-sass');
var imageop 		= require('gulp-image-optimization');


var config = {
	folders : {
		dist : 'dist',
		assets : 'assets' 
	},
	plugins : {
		js : [
			'bower_components/html5shiv/dist/html5shiv.min.js',
			'bower_components/respond/dest/respond.min.js'
		],
		jsConcat : [
			'bower_components/jquery/dist/jquery.min.js',
			'bower_components/bootstrap/dist/js/bootstrap.min.js',
		],
		css : [
			'bower_components/bootstrap/dist/js/bootstrap.min.css',
			'bower_components/font-awesome/css/font-awesome.min.css',
		],
		fonts : [
			'bower_components/bootstrap/dist/fonts/*',
			'bower_components/font-awesome/fonts/*'
		],
		img : [
		]
	},
	distMode : false, // true cuando queremos compilar para producción y false en desarrollo
	enviroment : 'dev'
}

var paths = {
	dist : path.join(config.folders.dist),
	assets : path.join(config.folders.dist, config.folders.assets),
	html : path.join(config.folders.dist),
	js : path.join(config.folders.dist, config.folders.assets, 'js'),
	fonts : path.join(config.folders.dist, config.folders.assets, 'fonts'),
	css : path.join(config.folders.dist, config.folders.assets, 'css'),
	img : path.join(config.folders.dist, config.folders.assets, 'img'),
}

// Los targets serán ambientes de ejecución
var targets = {
	dist : {
		enviroment : 'dist',
		data : {
			assets: config.folders.assets,
		},
	},
	dev : {
		enviroment : 'dev',
		data : {
			assets : config.folders.assets,
		},
	},
}

gulp.task('connect', function() {
	connect.server({
		root : config.folders.dist, // Directorio principal
		port : 8080, // Se selecciona el puerto
		livereload : true // Permite la carga automática
	})
});

gulp.task('html', function() {
	console.log(targets[config.enviroment].enviroment);
	console.log(targets[config.enviroment].data);
	// Coge todos los HTML exceptuando los ficheros que están dentro de la carpeta layout
	gulp.src(['public/html/**/*.html', '!public/html/layout/**/*']) // Subdirectorios dentro del directorio html y queremos que coja tambien esos archivos 
		.pipe(processhtml({
			recursive : true, // se procesen archivos recursivamente, es decir, cuando incluyamos un archivo html dentro de otro si queremos que también lo procese
			process : true, // Se indica si se quiere que procese todo el archivo
			strip : false, // Quitar o no comentarios en el target actual
			enviroment : targets[config.enviroment].enviroment, // target que queremos usar
			data : targets[config.enviroment].data, // El objeto con las variables que queremos usar
		}))
		.pipe(gulp.dest(path.join(paths.html))) // Para pasar el STREAM (flujo?) generado a DIST es mediante el método PIPE 
		.pipe(connect.reload()); // Se encargará de recarga el servidor
});

gulp.task('js', function() {
	gulp.src('public/js/**/*.js') // Se coge los ficheros con extensión JS 
		.pipe(jshint()) // Libreria que analiza el código Javascript para ver si contiene errores. Si hay los muestra en la consola
		.pipe(jshint.reporter('default'))
		.pipe(gulpif(config.distMode, concat('app.min.js'))) // Une todos los archivos que hemos cogido con la directiva gulp.src en un solo archivo llamado app.min.js
		.pipe(gulpif(config.distMode, uglify())) // Minifica / comprime el archivo (app.min.js) pasado 
		.pipe(gulp.dest(paths.js)) // Enviará el archivo al destino con la carpeta dist/js
		.pipe(connect.reload()); // Se encargará de recarga el servidor
});

gulp.task('scss', function () {
	gulp.src('public/scss/**/*.scss')
		.pipe(sass().on('error', sass.logError)) // Se procesa el código SCSS y nos permitirá ver los errores en la terminal
		.pipe(gulpif(config.distMode, please({ // Si estamos en producción para que aplique las opciones definidas al archivo CSS 
			//resultante de la compilación y lo comprima	
			"autoprefixer": true,
			"filters": true,
			"rem": true,
			"opacity": true
		})))
		.pipe(gulpif(config.distMode, rename({ // Se le cambia la extensión a .min.css
			suffix: '.min',
			extname: '.css'
		})))
		.pipe(gulp.dest(paths.css))
		.pipe(connect.reload());
});

// En la tarea img lo que se hace es copiarlas desde la carpeta de origen a la de destino, pero entre medias, existe
// un plugin que permite optimizarlas imágenes para que ocupen los menos posible. Solamente hace la optimización en 
// modo producción
gulp.task('img', function() {
	gulp.src('src/img/**/*')
		.pipe(gulpif(config.distMode, imageop({
			optimizationLevel: 5,
			progressive: true,
			interlaced: true
		})))
		.pipe(gulp.dest(paths.img))
		.pipe(connect.reload());
});

gulp.task('fonts', function() {
	gulp.src('src/fonts/**/*')
		.pipe(gulp.dest(paths.fonts))
		.pipe(connect.reload());
});

gulp.task('clean', function() {
	return del([
		paths.html
	]);
});

gulp.task('plugins', function() {
	gulp.src(config.plugins.jsConcat)
		.pipe(gulpif(config.distMode, concat('plugins.min.js', {}))) // solo concatena en modo producción
		.pipe(gulpif(config.distMode, uglify(), beautify())) // Solo minifica en modo producción
		.pipe(gulp.dest(paths.js));

	gulp.src(config.plugins.js)
		.pipe(gulp.dest(paths.js));

	gulp.src(config.plugins.css)
		.pipe(gulpif(config.distMode, concat('plugins.min.css', {})))
		.pipe(gulp.dest(paths.css));

	gulp.src(config.plugins.fonts)
		.pipe(gulp.dest(paths.fonts));

	gulp.src(config.plugins.img)
		.pipe(gulp.dest(paths.img));
});

// vigile el fichero o directorio indicado y cuando detecte cambios (al guardar) ejecute la tarea asignada
// Cada vez que hagamos un cambio en la carpeta public/html o en las subcarpetas ejecutará la tarea HTML
// Para que la vigilancia esté activa se debe lanzar la tarea GULP WATCH
gulp.task('watch', function () {
	gulp.watch(['public/html/**/*'], ['html']);
	gulp.watch(['public/js/**/*'], ['js']);
	gulp.watch(['public/scss/**/*'], ['scss']);
	gulp.watch(['public/img/**/*'], ['img']);
	gulp.watch(['public/fonts/**/*'], ['fonts']);
});

// gulp.task('default', function() {
// 	runSequence(
// 		'clean', // Se ejecuta primero en serie
// 		['html', 'js'], // Se ejecuta cuando termina 'clean' pero de forma paralela
// 		['connect', 'watch']
// 	)
// });

// Si solamente queremos visualizar el proyecto solamente ejecutamos GULP
gulp.task('default', function() {
	runSequence(
		['connect', 'watch']
	);
});

// Si se quiere hacer una compilación de desarrollo --> gulp dev
gulp.task('dev', function() {
	runSequence(
		'clean',
		['plugins', 'html', 'js', 'scss', 'img', 'fonts']
	);
});

// Si se quiere trabajar y que el sistema esté pendiente de cambios --> gulp work
gulp.task('work', function() {
	runSequence(
		'dev',
		'default'
	);
});

// Cuando se quiere hacer una versión para subir a producción --> gulp dist
gulp.task('dist', function() {
	config.distMode = true;
	config.environment = 'dist';

	runSequence(
		'clean',
		['plugins', 'html', 'js', 'scss', 'img', 'fonts']
	);
});
	

/////// Correr tareas tanto en serie como en paralelo para la versión 4. Ya no es necesario run-sequence /////

// gulp.task('default', 
// 	gulp.series('clean', gulp.parallel('html', 'js')));

// gulp.task('tarea1', function() {
// 	//Código de la tarea 1
// });

// gulp.task('tarea2', function() {
// 	//Código de la tarea 2
// });

// // Si se ejecuta la tarea 3 esta se encargará de ejecutar la tarea 1 y tarea 2
// gulp.task('tarea3', ['tarea1', 'tarea2']);

// // Solamente la tarea 3 se ejecutará cuando hayan terminado tarea 1 y tarea 2 que se ejecutarán a la vez
// gulp.task('tarea3', ['tarea1', 'tarea2'], function() {
// 	//Código tarea 3
// });

///// Funcionamiento del comando DEL //////////

// gulp.task('clean:mobile', function () {
// 	return del([
// 	'dist/report.csv',
// 	// Le indicamos que boorre todo lo que hay dentro de mobile
// 	'dist/mobile/**/*',
// 	// Menos el archivo deploy.json. Con el símbolo ! sirve para excluir ficheros o directorios
// 	'!dist/mobile/deploy.json'
// 	]);
// });


/////// Funcionamiento del comando PATH ////////// 

// var dirA = 'directorio1';
// var dirB = 'directorio2';

// // directorio1/directorio2
// var dirC = path.join(dirA, dirB);

// // directorio2/directorio1
// var dirC = path.join(dirB, dirA);

// // directorioB/
// var dirC = path.join(dirA, '..', dirB);


//////// Funcionamiento del comando GULP IF ////////

// var condition = true;

// gulp.task('task', function() {
// 	gulp.src('./src/*.js')
// 		// Si la condición se cumple se ejecutará uglify sino sera beautify
// 		.pipe(gulpif(condition, uglify(), beautify()))
// 		.pipe(gulp.dest('./dist/'));
// });












