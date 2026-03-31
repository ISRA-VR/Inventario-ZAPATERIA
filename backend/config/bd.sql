-- =========================
-- TABLA: CATEGORIAS

CREATE TABLE categorias (
    id_categoria INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(250)
);

-- =========================
-- TABLA: ARTICULOS

CREATE TABLE articulos (
    id_articulo INT PRIMARY KEY AUTO_INCREMENT,
    marca VARCHAR(120),
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio_compra DECIMAL(6,2),
    precio_venta DECIMAL(6,2),
    activo CHAR(1),
    fecha_creacion DATE,
    categorias_id_categoria INT,
    FOREIGN KEY (categorias_id_categoria)
        REFERENCES categorias(id_categoria)
);

-- =========================
-- TABLA: USUARIOS

CREATE TABLE usuarios (
    id_usuario INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(140),
    contrasena VARCHAR(100),
    rol VARCHAR(100),
    activo VARCHAR(150),
    fecha_alta DATE
);

-- =========================
-- TABLA: VARIANTES

CREATE TABLE variantes (
    variantes_id INT PRIMARY KEY AUTO_INCREMENT,
    id_variante INT UNIQUE,
    talla VARCHAR(10),
    color VARCHAR(70),
    articulos_id_articulo INT,
    FOREIGN KEY (articulos_id_articulo)
        REFERENCES articulos(id_articulo)
);

-- =========================
-- TABLA: EXISTENCIAS

CREATE TABLE existencias (
    id_existencia INT PRIMARY KEY AUTO_INCREMENT,
    stock_actual INT,
    stock_minimo INT,
    variantes_id_variante INT,
    FOREIGN KEY (variantes_id_variante)
        REFERENCES variantes(variantes_id)
);

-- =========================
-- TABLA: MOVIMIENTOS INVENTARIO

CREATE TABLE movimientos_inventario (
    id_movimiento INT PRIMARY KEY AUTO_INCREMENT,
    tipo VARCHAR(150),
    cantidad INT,
    fecha DATE,
    motivo TEXT,
    usuarios_usuarios_id INT,
    variantes_variantes_id INT,
    FOREIGN KEY (usuarios_usuarios_id)
        REFERENCES usuarios(id_usuario),
    FOREIGN KEY (variantes_variantes_id)
        REFERENCES variantes(variantes_id)
);

-- =========================
-- TABLA: VENTAS

CREATE TABLE ventas (
    id_venta INT PRIMARY KEY AUTO_INCREMENT,
    fecha DATE,
    total DECIMAL(6,2),
    metodo_pago VARCHAR(120),
    usuarios_usuarios_id INT,
    FOREIGN KEY (usuarios_usuarios_id)
        REFERENCES usuarios(id_usuario)
);

-- =========================
-- TABLA: DETALLE VENTA

CREATE TABLE detalle_venta (
    id_detalle INT PRIMARY KEY AUTO_INCREMENT,
    cantidad INT,
    precio_venta_unidad DECIMAL(7,2),
    subtotal DECIMAL(6,2),
    ventas_id_venta INT,
    variantes_variantes_id INT,
    FOREIGN KEY (ventas_id_venta)
        REFERENCES ventas(id_venta),
    FOREIGN KEY (variantes_variantes_id)
        REFERENCES variantes(variantes_id)
);

-- =========================
-- TABLA: LIQUIDACIONES

CREATE TABLE liquidaciones (
    id_liquidacion INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(150),
    descripcion TEXT,
    fecha_inicio DATE,
    fecha_fin DATE,
    tipo_descuento VARCHAR(100),
    valor_descuento DECIMAL(5,2),
    activa CHAR(1)
);

-- =========================
-- TABLA: LIQUIDACIONES_ARTICULOS

CREATE TABLE liquidaciones_articulos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    variantes_id_variante INT,
    liquidaciones_id_liquidacion INT,
    FOREIGN KEY (variantes_id_variante)
        REFERENCES variantes(variantes_id),
    FOREIGN KEY (liquidaciones_id_liquidacion)
        REFERENCES liquidaciones(id_liquidacion)
);