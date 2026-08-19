import { productService } from '../services/productService.js';

export const productController = {
  async getAll(req, res, next) {
    try {
      const onlyActive = req.query.all === 'true' ? false : true;
      const products = await productService.getAllProducts(onlyActive);
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const product = await productService.createProduct(req.body);
      res.status(201).json({
        success: true,
        message: 'Producto creado correctamente.',
        data: product
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const product = await productService.updateProduct(req.params.id, req.body);
      res.json({
        success: true,
        message: 'Producto actualizado.',
        data: product
      });
    } catch (error) {
      next(error);
    }
  },

  async chargeToRoom(req, res, next) {
    try {
      const { stay_id, product_id, quantity } = req.body;
      const consumption = await productService.chargeToRoom({ stay_id, product_id, quantity });
      res.status(201).json({
        success: true,
        message: 'Consumo cargado a la habitación correctamente.',
        data: consumption
      });
    } catch (error) {
      next(error);
    }
  },

  async directSale(req, res, next) {
    try {
      const { product_id, quantity, payment_method } = req.body;
      const sale = await productService.directSale({
        product_id,
        quantity,
        payment_method,
        user_id: req.user.id
      });
      res.status(201).json({
        success: true,
        message: 'Venta de mostrador registrada correctamente.',
        data: sale
      });
    } catch (error) {
      next(error);
    }
  }
};
