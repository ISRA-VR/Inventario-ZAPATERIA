try {
  const { productos, total, montoRecibido } = req.body;

  // 🛒 Validar carrito
  if (!productos || productos.length === 0) {
    return res.status(400).json({ message: "El carrito está vacío" });
  }

  // 💰 Validar pago
  if (montoRecibido == null || montoRecibido < total) {
    return res.status(400).json({ message: "Monto insuficiente" });
  }

  // 🔁 Validar productos y stock
  for (const item of productos) {
    if (!item.id_producto || item.cantidad <= 0) {
      return res.status(400).json({ message: "Producto o cantidad inválida" });
    }

    // consulta a DB (ajústala a tu modelo)
    const [producto] = await pool.query(
      "SELECT stock FROM productos WHERE id_producto = ?",
      [item.id_producto]
    );

    if (!producto.length) {
      return res.status(404).json({ message: "Producto no existe" });
    }

    if (producto[0].stock < item.cantidad) {
      return res.status(400).json({ message: "Stock insuficiente" });
    }
  }

  // ⚠️ AQUÍ VA TU LÓGICA ACTUAL (NO LA BORRES)

} catch (error) {
  console.error(error);
  return res.status(500).json({ message: "Error al procesar la venta" });
}